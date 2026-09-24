# Post-Mortem: False "Storage Not Configured" 500 Outage on EmDash 0.39.1

- **Date:** September 24–25, 2026
- **Status:** Resolved & Verified
- **Severity:** High (Production Media & CMS API Outage)
- **Impacted Systems:** Cloudflare Workers (SSR), Cloudflare D1, Cloudflare R2, EmDash Media Router (`/_emdash/api/media/file/*`), EmDash Core Middleware & API Routes

---

## 1. Executive Summary

Following a minor upgrade from `emdash@0.38.0` / `@emdash-cms/cloudflare@0.38.0` to `0.39.1` on `preview.afaqtafsir.id`, all requests to uploaded media files returned:
```json
HTTP/2 500 Internal Server Error
{
  "success": false,
  "error": {
    "code": "NOT_CONFIGURED",
    "message": "Storage not configured"
  }
}
```

The error appeared to indicate an R2 storage binding failure or media configuration issue. However, investigation revealed that **Cloudflare R2 and storage bindings were completely healthy and untouched**.

The true root cause was a **failed database migration (`079_datetime_normalization`)** introduced in EmDash 0.39.0. On Cloudflare Workers with `migrations: { "runtime": "auto" }`, the runtime attempts to apply pending migrations during isolate cold start. Migration `079` crashed due to a preflight validation failure on a single historical row in D1's `revisions` table that contained a JSON array instead of an object envelope.

Furthermore, EmDash's core Astro middleware suffered from an **error-masking flaw**: it swallowed the uncaught migration error, left `locals.emdash` as `undefined`, and allowed requests to fall through to route handlers. When the media route checked `!emdash?.storage`, it evaluated to `true`, emitting the deceptive `"Storage not configured"` response.

The issue was resolved on Cloudflare D1 by purging the orphaned malformed revision row. Upon the next HTTP request, the runtime auto-migrated migrations `079` through `082` within 1.3 seconds, immediately restoring all media and API routes to `HTTP 200 OK`.

---

## 2. Initial Symptoms & The Red Herrings

### Observed Behavior
1. Direct requests to media assets (e.g., `GET /_emdash/api/media/file/01M2WJ1AZ5M964D5EBSHK4YYDS.01M2WJ1B5G80C2BR8D9SVCSTHA.webp`) failed with `HTTP 500`.
2. Response payload:
   ```json
   {
     "success": false,
     "error": {
       "code": "NOT_CONFIGURED",
       "message": "Storage not configured"
     }
   }
   ```
3. Release notes for `0.39.0` and `0.39.1` showed no changes to the R2 storage adapter (`r2({ binding: "MEDIA" })`).

### Why the Error Was Misleading
- **R2 was fully functional:** Inspecting the remote R2 bucket `afaqtafsir-website` via `wrangler r2 object get ... --remote` confirmed the WebP file was physically present and downloadable.
- **Wrangler configuration was correct:** `wrangler.jsonc` retained the valid `"r2_buckets": [{"binding": "MEDIA", "bucket_name": "afaqtafsir-website"}]`.
- **Adapter code was identical:** A diff between `@emdash-cms/cloudflare@0.38.0` and `0.39.1` confirmed zero modifications to `src/storage/r2.ts`.

---

## 3. Telemetry & Investigative Journey

### Phase 1: Code Tracing the Error Message
Auditing the compiled route chunks in `dist/` and `node_modules/emdash/` isolated the exact route handler generating the response:

```typescript
// node_modules/emdash/dist/astro/routes/api/media/file/[...key].mjs (lines 25-30)
const GET = async ({ params, locals }) => {
    const { key } = params;
    const { emdash } = locals;
    if (!key) return apiError("NOT_FOUND", "File not found", 404);
    if (key.startsWith("backups/")) return apiError("NOT_FOUND", "File not found", 404);
    if (!emdash?.storage) return apiError("NOT_CONFIGURED", "Storage not configured", 500);
    ...
```

Notice the guard: `if (!emdash?.storage)`. This returns `NOT_CONFIGURED` if `emdash` itself is `undefined`, or if `emdash.storage` is `null`/`undefined`.

Checking another API route (`/_emdash/api/settings`):
```bash
curl -s https://preview.afaqtafsir.id/_emdash/api/settings
# Response: {"success":false,"error":{"code":"NOT_CONFIGURED","message":"EmDash is not initialized"}}
```
This proved that **`locals.emdash` was never initialized on `locals`**, which pointed directly to a startup crash inside the middleware initialization block.

### Phase 2: Live Worker Tailing (`wrangler tail`)
Tailing production logs on `preview.afaqtafsir.id` while replaying the media request captured the true exception before middleware swallowed it:

```text
GET https://preview.afaqtafsir.id/_emdash/api/media/file/01M2WJ1AZ5M964D5EBSHK4YYDS...webp - Ok
  (error) [datetime migration] 0 noncanonical values (0 naive) using UTC
  0 require manual review; 1 could not be inspected
  revisions/01M27W2RDFB9A9C2511X9JA68F.data: Expected a JSON object
  (error) EmDash middleware error: Error: Migration failed: Datetime migration requires manual review:
  0 noncanonical values (0 naive) using UTC
  0 require manual review; 1 could not be inspected
  revisions/01M27W2RDFB9A9C2511X9JA68F.data: Expected a JSON object (migration: 079_datetime_normalization)
```

### Phase 3: D1 Database Auditing
1. **Migration State Table (`_emdash_migrations`):**
   ```sql
   SELECT name, timestamp FROM _emdash_migrations ORDER BY name DESC LIMIT 5;
   ```
   *Result:*
   - `078_menu_item_translation_groups` was the last successfully applied migration.
   - `079_datetime_normalization` was pending and executing on every worker cold start.
   - The migration lock `_emdash_migrations_lock` was clear (`is_locked = 0`), ruling out lock starvation.

2. **Inspecting the Offending Row in `revisions`:**
   ```sql
   SELECT id, collection, entry_id, substr(data, 1, 60), typeof(data) 
   FROM revisions 
   WHERE id = '01M27W2RDFB9A9C2511X9JA68F';
   ```
   *Result:*
   - `collection`: `articles`
   - `entry_id`: `01M25S76ZMYPKSA2D2TGW1RDNW`
   - `data`: `[{"_type":"block","_key":"k81","style":"normal",...`
   
   Across all 88 revisions in the database, 87 contained JSON objects (`{"title": "...", "content": [...]}`). Exactly **1 row** contained a raw JSON array (`[...]`).

---

## 4. Deep-Dive Root Cause Analysis

Two interrelated upstream architectural flaws caused this outage:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Cloudflare Worker Request                       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     EmDash Middleware: doInit()                        │
│                                                                        │
│  getRuntime() ──► EmDashRuntime.create() ──► getDatabase()             │
│                                                     │                  │
│                                                     ▼                  │
│                                        runAutoMigrations()             │
│                                                     │                  │
│                                                     ▼                  │
│                                         Migration 079 Fails            │
│                              (revisions row has array, not object)     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                         Throws unhandled Error
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 Catch Block (Silent Swallowing Flaw)                  │
│                                                                        │
│  catch (error) {                                                       │
│    runtimeConfigurationErrorResponse(error)  ──► returns null          │
│    // locals.emdash is NEVER assigned!                                 │
│  }                                                                     │
│  // Request proceeds to next()                                         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│             Media Route Handler: [...key].ts (Masked Flaw)             │
│                                                                        │
│  if (!emdash?.storage)                                                 │
│    ──► returns 500 "Storage not configured" (BOGUS ERROR)              │
└────────────────────────────────────────────────────────────────────────┘
```

### Upstream Flaw 1: Migration 079's Fragile Preflight Validation
In `emdash/src/database/datetime-storage.ts`, migration `079_datetime_normalization` attempts to convert datetime fields across content tables and historical revisions into UTC ISO strings.

Inside `scanRevisions()`:
```typescript
for (const row of rows) {
    const schema = schemas.get(row.collection);
    if (!schema) continue;
    let data: unknown;
    try {
        data = JSON.parse(row.data);
    } catch (error) {
        recordError(state, `revisions/${row.id}.data`, row.data, error);
        continue;
    }
    if (!isRecord(data)) {
        recordError(state, `revisions/${row.id}.data`, data, new Error("Expected a JSON object"));
        continue;
    }
    ...
```
`isRecord(data)` evaluates `!Array.isArray(value)`. When a non-object is encountered, it logs an `inspection_error`.

Then, `normalizeDatetimeStorage()` halts completely:
```typescript
const preflight = await scan(db, false);
if (preflight.manualReviewCount > 0 || preflight.inspectionErrorCount > 0) {
    throw new Error(
        `Datetime migration requires manual review:\n${formatDatetimeStorageReport(preflight)}`,
    );
}
```

**Why this is an upstream bug:**
1. **Historical revisions are non-authoritative snapshots:** An old revision snapshot does not represent live published content. An anomaly in an archived revision should never prevent the site from booting.
2. **Semantic irrelevance:** Migration 079 searches for datetime fields defined on the collection (`schema.fields`). If a revision contains a raw block array, it has no datetime keys to normalize. The scanner should have logged a warning, skipped the row, and continued.

### Upstream Flaw 2: Middleware Error Swallowing & Error Masking
In `emdash/src/astro/middleware.ts`:
```typescript
try {
    const runtime = await getRuntime(config, migrationMode, initSubTimings);
    locals.emdash = { ... storage: runtime.storage, ... };
} catch (error) {
    if (error instanceof PendingMigrationsError) return pendingMigrationsResponse(error);
    if (migrationMode === "manual" && isMissingTableError(error)) {
        return migrationRequiredResponse();
    }
    console.error("EmDash middleware error:", error);
    const configurationError = runtimeConfigurationErrorResponse(error, url.pathname);
    if (configurationError) return configurationError;
}
```
Looking at `runtimeConfigurationErrorResponse`:
```typescript
function runtimeConfigurationErrorResponse(error, pathname) {
    if (!pathname.startsWith("/_emdash/api/")) return null;
    if (error instanceof EmDashConfigurationError) return apiError(error.code, error.message, 500);
    if (error instanceof EmDashStorageError && error.code === "BINDING_NOT_FOUND") {
        return apiError(error.code, error.message, 500);
    }
    return null;
}
```

**Why this is an upstream bug:**
1. When an unexpected migration error occurs, `runtimeConfigurationErrorResponse()` returns `null`.
2. The middleware logs to console, but **does not return an HTTP response and does not set `locals.emdash`**.
3. The request falls through to the route handler. Because `locals.emdash` is `undefined`, every API route that accesses `locals.emdash` emits confusing, incorrect error codes (`NOT_CONFIGURED: Storage not configured` or `NOT_CONFIGURED: EmDash is not initialized`).
4. The middleware should have caught unhandled runtime init failures and returned an explicit `503 Service Unavailable: Database migration failed: 079_datetime_normalization`.

---

## 5. Remediation & Verification

### Step 1: Database Remediation
Because article `01M25S76ZMYPKSA2D2TGW1RDNW` had 10 other valid revisions before and after the malformed record, row `01M27W2RDFB9A9C2511X9JA68F` was safely purged from D1:
```bash
bunx wrangler d1 execute afaqtafsir-website --remote \
  --command="DELETE FROM revisions WHERE id = '01M27W2RDFB9A9C2511X9JA68F';"
```

### Step 2: Auto-Migration Execution
A test curl to the media endpoint immediately triggered the cold-start runtime init:
```bash
curl -i https://preview.afaqtafsir.id/_emdash/api/media/file/01M2WJ1AZ5M964D5EBSHK4YYDS.01M2WJ1B5G80C2BR8D9SVCSTHA.webp
```

**Server Timing Trace:**
```text
server-timing: rt;dur=3955;desc="Runtime init", rt.db;dur=3924;desc="DB init + migration policy"
```
The Worker acquired the D1 lock, executed all pending migrations (`079`, `080`, `081`, `082`) in 1.3 seconds, and committed them to `_emdash_migrations`.

### Step 3: Service Health Verification
1. **Migration State Table:**
   ```text
   082_taxonomy_translation_locale_unique  (2026-09-24T20:32:13.492Z)
   081_redirect_write_guards               (2026-09-24T20:32:13.362Z)
   080_content_translation_locale_unique   (2026-09-24T20:32:12.500Z)
   079_datetime_normalization              (2026-09-24T20:32:12.187Z)
   ```
2. **Media Serving:**
   ```text
   HTTP/2 200 OK
   content-type: image/webp
   content-length: 152426
   cache-control: public, max-age=0, must-revalidate
   content-disposition: inline
   ```
3. **Subsequent Warm Hit:** Responded in `291 ms` with 0 ms DB migration overhead.
4. **Settings API:** Returns expected `401 Unauthorized` instead of `500 NOT_CONFIGURED`.

---

## 6. Blueprint for Upstream GitHub Issue

When reporting this to the EmDash team (`emdash-cms/emdash`), use the following structure:

### Issue Title
`fix(migrations): migration 079 halts on non-object revision records and middleware masks the error as "Storage not configured"`

### Issue Description
> **Summary:**  
> When upgrading to `0.39.0` / `0.39.1`, migration `079_datetime_normalization` aborts if any historical record in the `revisions` table contains a JSON array rather than an object envelope. Furthermore, `middleware.ts` swallows the migration exception on `/_emdash/api/*` routes, causing media endpoints to fail with a false `500 NOT_CONFIGURED: Storage not configured` error.
>
> **Reproduction:**
> 1. In an existing database, insert a revision whose `data` column is a valid JSON array:
>    ```sql
>    INSERT INTO revisions (id, collection, entry_id, data) 
>    VALUES ('test_rev', 'articles', 'entry_1', '[{"_type":"block","text":"hello"}]');
>    ```
> 2. Upgrade to `0.39.0` or `0.39.1` with `migrations: { "runtime": "auto" }`.
> 3. Request any image via `/_emdash/api/media/file/<key>`.
>
> **Actual Behavior:**
> - Migration 079 preflight scan fails with: `Expected a JSON object (migration: 079_datetime_normalization)`.
> - Middleware catches the error, but `runtimeConfigurationErrorResponse()` returns `null`.
> - `locals.emdash` remains `undefined`.
> - The media endpoint hits `if (!emdash?.storage)` and emits `500 NOT_CONFIGURED: Storage not configured`.
>
> **Suggested Fixes:**
> 1. In `src/database/datetime-storage.ts` (`scanRevisions`): If `!isRecord(data)`, log a warning and skip the row instead of recording an `inspection_error` that blocks the migration. A non-object revision cannot contain top-level datetime fields matching collection schema anyway.
> 2. In `src/astro/middleware.ts` (`runtimeConfigurationErrorResponse`): If an uncaught migration error occurs, return an explicit `503` error indicating that database migration failed, rather than returning `null` and letting the uninitialized runtime trigger misleading downstream guards.
