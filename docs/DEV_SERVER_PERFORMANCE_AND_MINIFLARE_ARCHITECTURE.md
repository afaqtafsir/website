# Architecture & Performance: Astro Dev Server vs. Cloudflare Worker Production

- **Date:** August 28, 2026
- **Status:** Documented & Verified
- **Scope:** `@astrojs/cloudflare`, `@cloudflare/vite-plugin`, Miniflare 3 (`workerd`), Vite 6 SSR Runtime, D1 Database, Production Preview.

---

## 1. Executive Summary

During performance testing of the Afaq Tafsir website, a significant latency gap was observed between local development (`astro dev`) and compiled production preview (`astro preview`):

| Environment | Command | Total TTFB | Page Render | DB Total (D1) | Total Request |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Local Dev (`astro dev`)** | `bun run dev` | **13,000ms – 15,000ms** | 78ms – 140ms | 12ms – 19ms | ~15,500ms |
| **Production Preview (`astro preview`)** | `bun run preview` | **41ms** | **17ms** | **12ms** | **98ms** |

This disparity is **not caused by application code, queries, or EmDash CMS logic**. It is the architectural result of Vite 6's dynamic SSR Module Runner communicating over an IPC WebSocket RPC bridge during development vs. a single self-contained V8 worker bundle in production.

---

## 2. Architectural Deep Dive: Dev vs. Production

### A. Development Architecture (`astro dev`)

In development, Astro and `@astrojs/cloudflare` simulate the Cloudflare Workers environment using **Miniflare 3** running Cloudflare's C++ `workerd` binary, coupled to Vite via an on-demand Module Runner:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Vite Dev Server (Port 4321)                  │
│  - Hosts HTTP listener on 127.0.0.1:4321                        │
│  - Manages AST transformations, HMR, and source maps            │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                        (WebSocket / IPC)
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│               Cloudflare Miniflare 3 (`workerd`)                │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ __VITE_RUNNER_OBJECT__ (Durable Object)                   │  │
│  │ - Intercepts requests to worker entrypoint                │  │
│  │ - Initiates __VITE_INVOKE_MODULE__ RPC over loopback      │  │
│  └────────────────────────────┬──────────────────────────────┘  │
│                               │                                 │
│                               ▼                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ ModuleRunner                                              │  │
│  │ - Requests every unbundled JS module from Node/Bun        │  │
│  │ - Compiles & evaluates code dynamically inside isolate    │  │
│  │ - ⚠️ Incurs multi-second IPC & serialization overhead      │  │
│  └────────────────────────────┬──────────────────────────────┘  │
│                               │                                 │
│                               ▼                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Astro SSR Handler & EmDash Runtime                        │  │
│  │ - Executes in ~17ms - 78ms                                │  │
│  │ - Queries local D1 SQLite in ~12ms                        │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Why `astro dev` has high TTFB:**
1. **On-Demand Module Serialization:** Modules are not pre-compiled into a single file. Every imported file, component, and utility is serialized and sent across the WebSocket RPC bridge between the Node/Bun host process and the `workerd` isolate on demand.
2. **Dynamic Route Manifest Discovery:** Astro generates virtual route manifests (`astro/app/manifest`) at runtime, which require runtime AST evaluation within the runner.

---

### B. Production Architecture (`astro build` -> `astro preview` / Cloudflare Workers)

In production or when running `astro preview`, Vite compiles the entire site into a single self-contained bundle (`dist/_worker.js`):

```
┌─────────────────────────────────────────────────────────────────┐
│           Cloudflare Edge Worker / Preview (`workerd`)          │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Single Static Bundle: dist/_worker.js (Pre-compiled)      │  │
│  │ - No Vite dev engine                                      │  │
│  │ - No ModuleRunner WebSocket RPC                           │  │
│  │ - Zero IPC serialization                                  │  │
│  │ - In-memory V8 execution                                  │  │
│  └────────────────────────────┬──────────────────────────────┘  │
│                               │                                 │
│                               ▼                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ D1 Database (SQLite / Edge Replicas)                      │  │
│  │ - Fast local execution (12ms)                             │  │
│  └───────────────────────────────────────────────────────────┘  │
│                               │                                 │
│                               ▼                                 │
│               Total Response Time: ~41ms TTFB                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Two Critical Dev-Server Pitfalls & Resolutions

During optimization, two distinct environmental traps were identified and resolved:

### Pitfall 1: Dynamic SSR Manifest Crash (`server-[HASH].js` ENOENT)
- **Problem:** Vite 6 attempted to dynamically pre-bundle Astro's virtual route manifest (`astro/app/manifest`) at runtime, invalidating `node_modules/.vite/deps_ssr/` and causing `workerd` to crash with unhandled `ENOENT` errors.
- **Fix:** Explicitly exclude only `astro/app/manifest` in `astro.config.mjs`:
  ```javascript
  vite: {
      optimizeDeps: {
          exclude: ["astro/app/manifest"],
      },
  },
  ```
  This prevents Vite from triggering mid-flight reloads while allowing real dependencies (`emdash`, `@emdash-cms/cloudflare`, etc.) to bundle properly.

### Pitfall 2: Dual-Stack IPv6/IPv4 Socket Timeout
- **Problem:** Astro dev server defaulted to binding `[::1]:4321` (IPv6), while Miniflare internal worker listeners bound to `127.0.0.1` (IPv4). Proxy handshakes to `localhost` suffered 15-second Linux TCP socket timeouts before falling back.
- **Fix:** Explicitly set IPv4 host binding in `astro.config.mjs`:
  ```javascript
  server: {
      host: "127.0.0.1",
  },
  ```

---

## 4. Benchmark Verification

Tested with `httpstat` on a live production preview build (`bun run build && bun run preview`):

```json
{
  "url": "http://localhost:4321/",
  "response": {
    "status_line": "HTTP/1.1 200 OK",
    "headers": {
      "server-timing": "rt;dur=0;desc=\"Runtime init\", render;dur=17;desc=\"Page render\", mw;dur=17;desc=\"Total middleware\", db.total;dur=12;desc=\"DB total\", db.count;dur=2;desc=\"Query count\", db.first;dur=1;desc=\"First query at\", db.last;dur=14;desc=\"Last query at\", cache.hit;dur=1;desc=\"Cache hits\", cache.miss;dur=5;desc=\"Cache misses\""
    }
  },
  "timings_ms": {
    "dns": 0,
    "connect": 0,
    "tls": 0,
    "server": 41,
    "transfer": 57,
    "total": 98
  }
}
```

---

## 5. Developer Runbook

### For Rapid Local Development:
```bash
bun run dev
```
- Admin UI available at: `http://127.0.0.1:4321/_emdash/admin`
- HMR and dynamic live content reloading enabled.

### For Accurate Performance & Pre-Deployment Auditing:
```bash
bun run build
bun run preview
```
- Runs the actual compiled Cloudflare Worker via local Miniflare.
- Accurately benchmarks production TTFB (~40ms), SEO tags, and database queries.

### Clean Cache Reset Command:
If any cache desynchronization occurs during schema edits or dependency updates:
```bash
rm -rf node_modules/.vite .astro .wrangler/state/v3/cache .wrangler/state/v3/observability
```
