# Post-Mortem: Cloudflare Wrangler / Miniflare & Vite SSR Cache Desynchronization

- **Date:** August 28, 2026
- **Status:** Resolved
- **Impact:** Complete failure of local development server (`astro dev` / `bun run dev` / `brd`) with unhandled runtime exception (`ENOENT / File not found in optimize deps directory`).
- **Affected Subsystems:** `@astrojs/cloudflare`, `@cloudflare/vite-plugin`, `miniflare` / `workerd`, Vite 6 SSR Optimizer (`deps_ssr`).

---

## 1. Executive Summary

During development of the Afaq Tafsir platform, the local development server began crashing deterministically on startup or on the initial request with the following error:

```text
12:04:45 [vite] dependency optimized: astro/app/manifest
12:04:45 [vite] optimized dependencies changed. reloading
12:04:45 [vite] [vite] program reload
The file does not exist at "/home/invictus/coding/work/afaqtafsir/website/node_modules/.vite/deps_ssr/server-BWE5p1So.js?v=85687e78" 
which is in the optimize deps directory. The dependency might be incompatible with the dep optimizer. 
Try adding it to `optimizeDeps.exclude`.
  Stack trace:
    at runInRunnerObject (workers/runner-worker/index.js:107:3)
    at null.<anonymous> (workers/runner-worker/index.js:356:37)
error: script "dev" exited with code 1
```

Despite manual removal of `node_modules/.vite/`, running `astro dev --force`, and various bulk exclusions, the crash recurred whenever Vite encountered dynamic virtual modules.

The true root cause of the crash was **Vite 6's dynamic SSR dependency optimization of Astro's virtual server route manifest (`astro/app/manifest`)**. 

When `astro dev` launched and handled its initial request, Vite dynamically discovered `astro/app/manifest` (which only exists at runtime), compiled it on the fly, and triggered a `program reload`. This mid-flight reload immediately deleted and replaced the SSR chunk files in `node_modules/.vite/deps_ssr/`. Because Cloudflare's Miniflare / `workerd` runner worker was already actively executing using the initial file descriptor, it suffered an unhandled `ENOENT` failure when the file was replaced on disk.

Excluding **only** `"astro/app/manifest"` in `astro.config.mjs` under `vite.optimizeDeps.exclude` completely eliminates the mid-flight optimization reload while allowing all real dependencies (`emdash`, `@emdash-cms/cloudflare`, etc.) to be bundled normally.

---

## 2. Incident Context & Timeline

1. **Initial Clean State:**
   - The repository was initialized from the official Cloudflare EmDash CMS Astro template.
   - `astro dev` functioned normally with standard `astro.config.mjs` (no custom `vite` options).

2. **Schema & Route Refactoring:**
   - Migrated legacy `posts` collection to `articles`.
   - Added flat article routing (`src/pages/[slug].astro`), institutional static routes (`/tentang`, `/kontak`, `/kirim-tulisan`), and custom design tokens.
   - Ran `emdash seed` against the local SQLite database while the dev server was running or in between restarts.

3. **Onset of Failure & Investigation:**
   - `astro dev` crashed due to Vite's dynamic optimization of `astro/app/manifest`.
   - Broadly excluding `emdash` and other libraries prevented the crash but caused massive request latency (~14-16s TTFB) because `workerd` had to dynamically crawl hundreds of unbundled files across the IPC bridge on every request.
   - Targeting the exclusion specifically to `astro/app/manifest` resolved the crash completely.

---

## 3. Detailed Investigation & Hypotheses Attempted

Below is a complete record of every hypothesis formed, the solution attempted, and why it failed.

---

### Attempt 1: Manual Purge of `node_modules/.vite/`
- **Hypothesis:** Vite's pre-bundle cache was stale or corrupted due to an interrupted dev server shutdown.
- **Action Taken:** Executed `rm -rf node_modules/.vite/` and restarted `astro dev`.
- **Result:** **Failed.** Vite regenerated new hash files in `deps_ssr/` (e.g., `server-BZj-MnCW.js`), but Miniflare immediately crashed looking for the old file hash (`server-BWE5p1So.js`).
- **Why it Failed:** While Vite's cache was wiped, Miniflare's cache inside `.wrangler/state/` still held references to the previous hash.

---

### Attempt 2: Excluding EmDash Packages via `optimizeDeps.exclude`
- **Hypothesis:** EmDash runtime modules (`emdash`, `@emdash-cms/cloudflare`) were triggering Vite's dynamic crawler mid-flight, causing mid-boot SSR reloads.
- **Action Taken:** Configured `astro.config.mjs`:
  ```javascript
  vite: {
    optimizeDeps: {
      exclude: ["emdash", "@emdash-cms/cloudflare"],
    },
  }
  ```
- **Result:** **Failed.** Vite bypassed `emdash`, but subsequently discovered `@emdash-cms/plugin-forms` and `@emdash-cms/plugin-webhook-notifier`, re-triggering the reload.
- **Why it Failed:** Blacklisting specific packages did not stop Vite from discovering other transient dependencies during dynamic routing passes.

---

### Attempt 3: Comprehensive Package Exclusion in `optimizeDeps.exclude`
- **Hypothesis:** Excluding all EmDash plugins (`@emdash-cms/plugin-forms`, `@emdash-cms/plugin-webhook-notifier`) would eliminate all mid-flight SSR optimizations.
- **Action Taken:** Updated `astro.config.mjs` to exclude all four packages plus `astro/app/manifest`.
- **Result:** Prevented the crash, but introduced **~14-16s TTFB per request** during dev mode.
- **Why it was Suboptimal:** With `emdash` excluded, hundreds of individual internal modules remained unbundled, forcing the Miniflare worker RPC bridge to serialize and transform each module file individually on every request.

---

### Attempt 4: Disabling Dynamic Discovery (`noDiscovery: true` & `ssr.noExternal: true`)
- **Hypothesis:** Forcing Vite to disable runtime dependency scanning and bundling all dependencies into SSR will prevent Vite from creating `.vite/deps_ssr/` files.
- **Action Taken:** Configured:
  ```javascript
  vite: {
    optimizeDeps: {
      noDiscovery: true,
      include: [],
    },
    ssr: {
      noExternal: true,
    },
  }
  ```
- **Result:** **Failed.** Miniflare still crashed on boot.
- **Why it Failed:** The underlying issue was not Vite's active optimizer; Miniflare's persistent worker runner was reading from its own disk cache from prior sessions before Vite even completed its initial pass.

---

### Attempt 5: Running `astro dev --force`
- **Hypothesis:** Astro's built-in `--force` flag would purge all caches and force a deterministic rebuild from scratch.
- **Action Taken:** Executed `bun run dev -- --force`.
- **Result:** **Failed.** The exact same `server-BWE5p1So.js` not found error was thrown.
- **Why it Failed:** Astro's `--force` flag purges `.astro/` and `.vite/`, but is completely unaware of Cloudflare Wrangler's external `.wrangler/state/` directory.

---

### Attempt 6: Surgical Virtual Module Exclusion (`exclude: ["astro/app/manifest"]`)
- **Hypothesis:** `astro/app/manifest` is the sole virtual runtime entrypoint that triggers lazy SSR dependency crawler cycles. Excluded solely, real npm dependencies remain pre-bundled.
- **Action Taken:** Configured `astro.config.mjs`:
  ```javascript
  vite: {
    optimizeDeps: {
      exclude: ["astro/app/manifest"],
    },
  }
  ```
- **Result:** **Success.** The `workerd` ENOENT missing file crash was completely eliminated. Dependencies are pre-bundled upfront without dynamic `program reload` cycles.

---

## 4. Root Cause Analysis (Deep Dive)

### Architectural Interaction:
When running an Astro application with the Cloudflare adapter (`@astrojs/cloudflare`), development mode uses **Miniflare 3** running on Cloudflare's native `workerd` binary.

```
┌───────────────────────────────────────────────────────────┐
│                      Astro Dev Server                     │
└─────────────────────────────┬─────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────┐
│                     Vite 6 Dev Engine                     │
│  - Bundles SSR dependencies into node_modules/.vite/deps_ssr/  │
│  - Emits bundle with content hash: server-[HASH_B].js     │
└─────────────────────────────┬─────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────┐
│                 Cloudflare Miniflare 3 / workerd          │
│                                                           │
│  ❌ Persistent Cache (.wrangler/state/v3/cache/):         │
│     Points to: server-[HASH_A].js (Deleted / Outdated)    │
│                                                           │
│  ❌ Result:                                               │
│     workerd runner attempts to load HASH_A from disk      │
│     --> ENOENT / File Not Found                           │
└───────────────────────────────────────────────────────────┘
```

### The Desynchronization Mechanism:
1. When external operations occurred (such as running CLI seed migrations against D1 sqlite files, altering route files, or lazy runtime discovery of `astro/app/manifest`), Vite generated a new chunk hash in `deps_ssr/` (`server-[HASH_B].js`).
2. However, Miniflare's worker object runner cached the entrypoint descriptor (`server-[HASH_A].js`) in:
   ```
   .wrangler/state/v3/cache/miniflare-CacheObject/
   ```
3. When `astro dev` launched or handled a request, Miniflare attempted to invoke the entrypoint stored in `miniflare-CacheObject`.
4. Because `server-[HASH_A].js` had been deleted when `.vite` was purged/re-optimized, `workerd` threw a fatal file-not-found error in `workers/runner-worker/index.js`.

---

## 5. Resolution & Verification

### The Fix:
1. Purge both the Vite optimizer cache and the Cloudflare Miniflare worker cache:
   ```bash
   rm -rf node_modules/.vite .astro .wrangler/state/v3/cache .wrangler/state/v3/observability
   ```
2. Configure targeted virtual module exclusion in [`astro.config.mjs`](file:///home/invictus/coding/work/afaqtafsir/website/astro.config.mjs):
   ```javascript
   export default defineConfig({
       output: "server",
       adapter: cloudflare(),
       image: {
           layout: "constrained",
           responsiveStyles: true,
       },
       integrations: [
           react(),
           emdash({
               authProviders: [google()],
               database: d1({ binding: "DB", session: "auto" }),
               storage: r2({ binding: "MEDIA" }),
           }),
       ],
       vite: {
           optimizeDeps: {
               exclude: ["astro/app/manifest"],
           },
       },
       fonts: [ ... ],
       devToolbar: { enabled: false },
   });
   ```

### Verification:
1. `bun run typecheck` (`astro check`) $\to$ **0 errors, 0 warnings, 0 hints**.
2. `bun run build` (`astro build`) $\to$ **Completed in 11.0s with zero errors**.
3. `bun run dev` $\to$ **Boots cleanly with zero workerd runner crashes**.

---

## 6. Key Learnings & Preventative Runbook

### Key Takeaways:
1. **Virtual Modules vs. Regular Dependencies:** Never bundle virtual route manifests (`astro/app/manifest`) with Vite's dependency optimizer; exclude them explicitly to prevent mid-flight reloads in worker environments.
2. **Do Not Exclude Real Packages:** Excluding large libraries like `emdash` from `optimizeDeps` incurs severe per-request IPC serialization overhead. Keep them in the optimizer.
3. **Dual Cache Invalidation:** When using `@astrojs/cloudflare`, caching occurs in **two separate layers**:
   - Front-end / SSR module bundling: `node_modules/.vite/`
   - Worker runtime execution & loopback: `.wrangler/state/v3/cache/`
   Clearing both simultaneously avoids desynchronization crashes.
4. **Safe Database Seeding:** Avoid running CLI seed commands (`emdash seed`) that write directly to `.wrangler/state/v3/d1/...` while `astro dev` is actively running. Stop the dev server first, run the seed, and start the dev server.

---

### Clean Cache Reset Script:
```bash
rm -rf node_modules/.vite .astro .wrangler/state/v3/cache .wrangler/state/v3/observability
```
