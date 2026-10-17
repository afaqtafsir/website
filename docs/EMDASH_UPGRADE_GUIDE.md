# EmDash CMS General Upgrade Guide

A battle-tested operational guide for upgrading an **EmDash CMS** site running on **Astro** with **Cloudflare Workers and Cloudflare D1**.

---

## 1. Architectural Model & Lifecycle Decoupling

To upgrade EmDash reliably, you must understand how its lifecycle is split across three distinct phases:

```
┌─────────────────────────────────┐
│ 1. Dependency Phase             │
│    bunx upgrade-emdash@latest   │  --> Updates package.json, lockfile, & .emdash/UPGRADE.md
└────────────────┬────────────────┘
                 │ (manifest NOT yet updated)
                 ▼
┌─────────────────────────────────┐
│ 2. Compilation Phase            │
│    bun run build                │  --> EmDash Astro integration runs Vite hooks;
└────────────────┬────────────────┘      compiles .emdash/migrations.json & emdash-env.d.ts
                 │
                 ▼
┌─────────────────────────────────┐
│ 3. Runtime Phase (Edge Deploy)  │
│    Cloudflare Workers / CI      │  --> On first HTTP request, Worker compares migrations.json
│    + Cloudflare D1              │      with _emdash_migrations and executes pending migrations.
└─────────────────────────────────┘
```

> [!WARNING]
> **The Two-Phase Commit Trap:** `upgrade-emdash` deliberately **does not** run `astro build`. If you commit and push to Git immediately after running `upgrade-emdash`, you will push upgraded dependencies with a **stale migration manifest**. If using Cloudflare's native Git CI/CD, this risks deploying a version mismatch. **Always run `bun run build` before committing.**

---

## 2. Pre-Upgrade Prerequisites & Quirks

### 2.1 The `packageManager` Declaration Trap
`upgrade-emdash` checks the `"packageManager"` field in `package.json` before falling back to lockfiles (`bun.lock`, `pnpm-lock.yaml`).
* **The Trap:** Official EmDash starter templates ship with `"packageManager": "pnpm@..."`. On systems using Bun without `pnpm` installed, `upgrade-emdash` crashes with `spawn pnpm ENOENT` and rolls back.
* **The Fix:** Ensure `package.json` either declares Bun (`"packageManager": "bun@<version>"`) or omit the field entirely so it auto-detects `bun.lock`.

### 2.2 Cloudflare D1 Backup Limitation (FTS5)
Standard SQL dumps (`wrangler d1 export`) fail on EmDash databases with:
```text
✘ [ERROR] D1 Export error: cannot export databases with Virtual Tables (fts5)
```
EmDash creates SQLite `fts5` virtual tables (`_emdash_fts_*`) for search. Cloudflare's SQL serializer cannot dump virtual shadow tables.

* **The Production Safety Standard:** Always capture a **Cloudflare D1 Time Travel bookmark** before any deployment with schema changes:
  ```bash
  bunx wrangler d1 time-travel info <database-name>
  ```
* **Rollback Command (if disaster strikes):**
  ```bash
  bunx wrangler d1 time-travel restore <database-name> --bookmark=<bookmark-id>
  ```

---

## 3. Step-by-Step Upgrade Runbook

### Step 1: Capture Pre-Upgrade D1 Safety Bookmark
Before touching dependencies or deploying:
```bash
bunx wrangler d1 time-travel info afaqtafsir-website
```
Record the latest bookmark ID in your deployment notes.

---

### Step 2: Execute `upgrade-emdash`
Run the official upgrade orchestrator:
```bash
bunx upgrade-emdash@latest
```
*It will:*
1. Resolve matching versions across `emdash` and `@emdash-cms/*`.
2. Update `package.json` preserving version range prefixes (`^`).
3. Run `bun install` to update `bun.lock`.
4. Refresh EmDash agent skills in `.agents/skills/`.
5. Generate a tailored change audit at `.emdash/UPGRADE.md`.

---

### Step 3: Audit `.emdash/UPGRADE.md`
Open `.emdash/UPGRADE.md` and review the crossed release notes:
* **Breaking Changes:** Check if any imports, removed APIs, or changed defaults affect your `src/` or `astro.config.mjs`.
* **Portable Text Changes:** Verify if new block types (`/video`, `/iframe`, isolated `/html`) impact custom serializers.
* **Database Work:** Check the "Core database migrations" section at the bottom of the work order.

---

### Step 4: Reconcile Migration Manifest (`bun run build`)
**Mandatory step.** Trigger EmDash's Astro compiler hooks:
```bash
bun run build
```
*What this accomplishes:*
* Recompiles `.emdash/migrations.json` to the target EmDash version, appending any newly added core migrations (`090`, `091`, etc.) and computing the SHA-256 fingerprint.
* Regenerates TypeScript collection types in `emdash-env.d.ts`.

---

### Step 5: Code Quality & Type Diagnostics
Ensure zero regressions before staging:
```bash
bun run typecheck
bun run check
```
*(Runs `astro check` and `biome check`)*.

---

### Step 6: Atomic Git Commit
Stage all upgrade-related artifacts together in **one coherent atomic commit**:
```bash
git add package.json bun.lock .emdash/migrations.json .emdash/UPGRADE.md emdash-env.d.ts .agents/
git commit -m "chore(deps): upgrade emdash to <version>"
```

> [!TIP]
> Grouping dependencies, generated types, and `.emdash/migrations.json` in a single commit guarantees that future readers landing on `git blame` see the exact point where code and database schema contracts were synchronized.

---

### Step 7: Deployment

#### Scenario A: Cloudflare Native Git Integration (Auto-Deploy)
Push your atomic commit:
```bash
git push origin main
```
Cloudflare Workers Builds will clone the repository, run `bun run build`, and deploy the worker.

#### Scenario B: Manual CLI Deploy
```bash
bun run deploy
```
*(Runs `astro build && wrangler deploy`)*.

---

### Step 8: Post-Deploy Verification Audit

Because `astro.config.mjs` configures `database: d1({ binding: "DB", session: "auto" })`, EmDash automatically applies pending migrations during the first inbound request.

Run these verification commands against the live production D1 database:

#### 1. Confirm Applied Migrations
```bash
bunx wrangler d1 execute afaqtafsir-website --remote --command="SELECT name, timestamp FROM _emdash_migrations ORDER BY name DESC LIMIT 5;"
```
*Ensure all new migrations listed in `.emdash/migrations.json` show up with recent timestamps.*

#### 2. Confirm Migration Lock Release
```bash
bunx wrangler d1 execute afaqtafsir-website --remote --command="SELECT * FROM _emdash_migrations_lock;"
```
*Must return `is_locked = 0`. If `is_locked = 1`, a migration process stalled or timed out.*

#### 3. Edge HTTP Status Checks
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://www.afaqtafsir.id
curl -s -o /dev/null -w "%{http_code}\n" https://www.afaqtafsir.id/_emdash/admin
```
*Public routes must return `200 OK`. Admin route must return `302` (redirect to login).*

---

## 4. Emergency Procedures & Recovery

### Stuck Migration Lock (`is_locked = 1`)
If a Worker crashes during migration under traffic or a lock fails to free:
* **EmDash 1.3.0+:** Run lock takeover:
  ```bash
  bunx emdash migrate --take-over-lock <migration_lock_id>
  ```
* **Manual SQL Fallback:**
  ```bash
  bunx wrangler d1 execute afaqtafsir-website --remote --command="UPDATE _emdash_migrations_lock SET is_locked = 0 WHERE id = 'migration_lock';"
  ```

### Database Rollback (Time Travel)
If a migration corrupts data or causes runtime 500s:
1. Revert Git commit and redeploy prior application version.
2. Restore D1 to the pre-upgrade bookmark captured in Step 1:
   ```bash
   bunx wrangler d1 time-travel restore afaqtafsir-website --bookmark=<bookmark-id>
   ```
