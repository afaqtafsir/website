# EmDash & Cloudflare Data Lifecycle Architecture

This document details the operational architecture, schema management, and data lifecycle of the Afaq Tafsir website running **EmDash CMS on Astro with Cloudflare D1 and Cloudflare Workers**.

---

## 1. The Source of Truth: Seed vs. Live Database

A common architectural trap in dynamic CMS applications is treating seed files as a runtime content repository (like static Git-based Astro Content Collections).

| Layer | Role | When It Runs | Mutates Live Site? |
| :--- | :--- | :--- | :--- |
| `seed/seed.json` | **Day-Zero Bootstrap Payload** | Only on initial empty database boot or explicit full reset (`scripts/reset-d1.sql`). | **NO.** Changes here are completely ignored by existing local or deployed databases. |
| Cloudflare D1 (`afaqtafsir-website`) | **Live Single Source of Truth** | Every SSR request, API route, and Admin UI action. | **YES.** Controls all schema, validation, and content state. |

> [!IMPORTANT]
> **Rule for Agents & Engineers:** Never edit `seed/seed.json` expecting it to alter a deployed environment (whether preview or production). To mutate schemas or content in a deployed system, execute migrations directly against Cloudflare D1 or via the EmDash CLI.

---

## 2. EmDash Database Anatomy: The Two Layers in SQLite/D1

EmDash manages content collections through two distinct, synchronized layers in SQLite/D1:

```
┌───────────────────────────────────────────────────────────────┐
│ Layer 1: Schema Registry Tables                               │
│ - _emdash_collections (collection metadata)                   │
│ - _emdash_fields (field definitions, types, UI widget options)│
└──────────────────────────────┬────────────────────────────────┘
                               │ Powers Admin UI (/ _emdash / admin)
                               ▼
┌───────────────────────────────────────────────────────────────┐
│ Layer 2: Physical Content Tables                              │
│ - ec_articles (actual SQLite columns: title, content, etc.)   │
│ - ec_pages (actual SQLite columns)                            │
└───────────────────────────────────────────────────────────────┘
```

### Layer 1: The Schema Registry (`_emdash_fields` & `_emdash_collections`)
- The EmDash Admin UI (`/_emdash/admin`) does **not** inspect physical SQLite columns to render editor forms; it reads `_emdash_fields`.
- **Foreign Key Convention:** In `_emdash_fields`, the collection foreign key column is `collection_id` (a ULID referencing `_emdash_collections.id`), **not** `collection_slug`.

### Layer 2: Physical Content Tables (`ec_<collection>`)
- The actual content rows live in tables prefixed with `ec_` (e.g. `ec_articles`).
- EmDash's query layer fetches records via `SELECT *` and maps every column into the runtime entry object using `for (const [key, value] of Object.entries(row))`.

### The "Complete Purge" Rule
If you only delete a field row from `_emdash_fields`:
- The Admin UI editor stops showing the input field.
- **However**, the physical column remains on `ec_articles`. EmDash's `SELECT *` will continue hydrating that legacy column into memory on every query.

**Standard Field Removal Procedure:**
```sql
-- 1. Remove from schema registry (clears Admin UI)
DELETE FROM _emdash_fields 
WHERE slug = '<field_slug>' 
  AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = '<collection_slug>');

-- 2. Drop physical column (clears memory hydration)
ALTER TABLE ec_<collection_slug> DROP COLUMN <field_slug>;
```

---

## 3. Cloudflare Worker Bindings in Modern Astro

In Astro 5+ with `@astrojs/cloudflare` (v14+):
- Legacy `Astro.locals.runtime.env` has been removed. Accessing it throws a runtime exception.
- Bindings (`DB`, `MEDIA`, `SESSION`) are imported directly via standard Cloudflare module syntax:

```typescript
import { env } from "cloudflare:workers";

// Access D1 database binding
const result = await env.DB.prepare("SELECT * FROM article_views").all();
```

### TypeScript Configuration (`tsconfig.json`)
For TypeScript to recognize `cloudflare:workers` and typed bindings without compilation errors:
1. Include `@cloudflare/workers-types` in `compilerOptions.types`.
2. Include `worker-configuration.d.ts` in `include`:

```json
{
  "extends": "astro/tsconfigs/base",
  "compilerOptions": {
    "types": ["node", "@cloudflare/workers-types"]
  },
  "include": ["src", ".astro/types.d.ts", "emdash-env.d.ts", "worker-configuration.d.ts"]
}
```

---

## 4. Editorial Data Philosophy: Dynamic Derivation vs. Manual Fields

Manual inputs for easily computable metrics are an editorial and UX anti-pattern:
1. **Reading Time:** Forcing editors to type `"6 mnt baca"` leads to formatting inconsistencies and stale values when articles are revised.
2. **Popularity Rankings & Views:** Manually setting `is_popular`, `popular_rank`, and fake metrics like `"19.2k dibaca"` adds cognitive load and misleads readers.

### Solution A: Pure On-the-Fly Derivation (Reading Time)
- Reading time is calculated dynamically from Portable Text AST blocks using `getReadingTime(article.data.content)` in [`src/utils/reading-time.ts`](../src/utils/reading-time.ts).
- Cost in V8: **~0.02 ms per article**. Running across 24 homepage cards costs **~0.5 ms of CPU time**, avoiding database bloat and eliminating manual editorial work.

### Solution B: Edge-Cache Compatible Analytics (Pageviews & Popularity)
Because public Astro pages are cached at Cloudflare's global edge (`Astro.cache`), counting pageviews on server-side request handlers fails (cache hits never invoke the Worker).

```
Reader loads /[slug]
  │
  ├──► HTML delivered instantly (from Cloudflare CDN Edge Cache)
  │
  └──► Non-blocking background beacon:
       navigator.sendBeacon('/api/views/' + slug)
         │
         ▼
       POST /api/views/[slug] (Astro Endpoint)
         │
         ▼
       Cloudflare D1:
       INSERT INTO article_views (slug, views, updated_at)
       VALUES (?1, 1, datetime('now'))
       ON CONFLICT(slug) DO UPDATE SET
         views = views + 1,
         updated_at = datetime('now');
```

#### Zero-Traffic & Preview Safety (Graceful Degradation)
When view counts are low or zero (e.g. during preview testing or immediately post-launch):
- The homepage popular query sorts by `views DESC`.
- When views are tied or zero, it **tie-breaks with `publishedAt DESC`**, backfilling with latest articles.
- The sidebar widget is **always** populated with 5 articles, seamlessly transitioning from latest stories to popular stories as readership accumulates.
- If `views === 0`, it displays the clean reading time (`⏱ 6 mnt`) instead of fake flame badges.

---

## 5. Operational Runbook (Wrangler D1)

Execute these commands against the remote database (`afaqtafsir-website`) via `bunx wrangler d1 execute`:

### Inspect Schema State
```bash
# Check physical columns on ec_articles
bunx wrangler d1 execute afaqtafsir-website --remote --command="PRAGMA table_info(ec_articles);"

# Check registered CMS fields for articles
bunx wrangler d1 execute afaqtafsir-website --remote --command="SELECT f.id, f.slug, f.label FROM _emdash_fields f JOIN _emdash_collections c ON f.collection_id = c.id WHERE c.slug = 'articles';"
```

### Reset Analytics (e.g. on Launch Day)
To wipe preview/test view counts before official public launch:
```bash
bunx wrangler d1 execute afaqtafsir-website --remote --command="DELETE FROM article_views;"
```
