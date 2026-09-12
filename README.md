# EmDash Blog Template (Cloudflare)

A clean, minimal blog built with [EmDash](https://github.com/emdash-cms/emdash) and deployed on Cloudflare Workers with D1 and R2.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/emdash-cms/templates/tree/main/blog-cloudflare)

![Blog template homepage](https://raw.githubusercontent.com/emdash-cms/emdash/main/assets/templates/blog/latest/homepage-light-desktop.jpg)

## What's Included

- Featured post hero on the homepage
- Post archive with reading time estimates
- Category and tag archives
- Full-text search
- RSS feed
- SEO metadata and JSON-LD
- Dark/light mode
- Forms plugin and webhook notifier

## Pages

| Page | Route |
|---|---|
| Homepage | `/` |
| All posts | `/posts` |
| Single post | `/posts/:slug` |
| Category archive | `/category/:slug` |
| Tag archive | `/tag/:slug` |
| Search | `/search` |
| Static pages | `/pages/:slug` |
| 404 | fallback |

## Screenshots

| | Desktop | Mobile |
|---|---|---|
| Light | ![homepage light desktop](https://raw.githubusercontent.com/emdash-cms/emdash/main/assets/templates/blog/latest/homepage-light-desktop.jpg) | ![homepage light mobile](https://raw.githubusercontent.com/emdash-cms/emdash/main/assets/templates/blog/latest/homepage-light-mobile.jpg) |
| Dark | ![homepage dark desktop](https://raw.githubusercontent.com/emdash-cms/emdash/main/assets/templates/blog/latest/homepage-dark-desktop.jpg) | ![homepage dark mobile](https://raw.githubusercontent.com/emdash-cms/emdash/main/assets/templates/blog/latest/homepage-dark-mobile.jpg) |

## Infrastructure

- **Runtime:** Cloudflare Workers
- **Database:** D1
- **Storage:** R2
- **Framework:** Astro with `@astrojs/cloudflare`

## Local Development

```bash
pnpm install
pnpm bootstrap
pnpm dev
```

## Deploying

```bash
pnpm deploy
```

Or click the deploy button above to set up the project in your Cloudflare account.

## TODO before going public

- [ ] **Enable Workers Cache.** Every request currently runs the Worker and
      re-renders the page -- nothing is cached at the edge (`server-timing` reports
      `cache.hit;dur=0`). Workers Cache sits *in front of* the Worker, so matching
      requests never invoke it at all. This is the main source of CPU headroom
      available without leaving the free plan.

      Setup: `"cache": { "enabled": true }` in `wrangler.jsonc`, plus
      `cache: { provider: cacheCloudflare() }` from `@astrojs/cloudflare/cache` in
      `astro.config.mjs`, and explicit `routeRules` (e.g.
      `"/": { maxAge: 300, swr: 86400 }`). The pages already call
      `Astro.cache.set(cacheHint)`, so tag-based invalidation starts working as
      soon as a provider is configured.

      Two caveats before switching it on:

      - A `200` with no `Cache-Control` is still cached -- 2 hours, by RFC 9111
        heuristic freshness. Give every custom route an explicit header, using
        `private, no-store` for anything session-dependent.
      - The cache runs before the Worker, so it cannot vary on cookies. A logged-in
        editor may be served the cached anonymous variant of a public page, without
        the visual editing toolbar, until the entry expires.

      Deferred because the site is not public yet. See
      [Workers Cache](https://docs.emdashcms.com/deployment/cloudflare/#workers-cache).

## See Also

- [Node.js variant](../blog) -- same template using SQLite and local file storage
- [All templates](../)
- [EmDash documentation](https://github.com/emdash-cms/emdash/tree/main/docs)
