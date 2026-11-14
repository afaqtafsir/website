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

| Page             | Route             |
| ---------------- | ----------------- |
| Homepage         | `/`               |
| All posts        | `/posts`          |
| Single post      | `/posts/:slug`    |
| Category archive | `/category/:slug` |
| Tag archive      | `/tag/:slug`      |
| Search           | `/search`         |
| Static pages     | `/pages/:slug`    |
| 404              | fallback          |

## Screenshots

|       | Desktop                                                                                                                                     | Mobile                                                                                                                                    |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Light | ![homepage light desktop](https://raw.githubusercontent.com/emdash-cms/emdash/main/assets/templates/blog/latest/homepage-light-desktop.jpg) | ![homepage light mobile](https://raw.githubusercontent.com/emdash-cms/emdash/main/assets/templates/blog/latest/homepage-light-mobile.jpg) |
| Dark  | ![homepage dark desktop](https://raw.githubusercontent.com/emdash-cms/emdash/main/assets/templates/blog/latest/homepage-dark-desktop.jpg)   | ![homepage dark mobile](https://raw.githubusercontent.com/emdash-cms/emdash/main/assets/templates/blog/latest/homepage-dark-mobile.jpg)   |

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

- [ ] **Enable Workers Cache — required before launch, not optional.** Every
      route on this site exceeds the 10 ms free-plan CPU limit and stays up only
      on isolate tolerance, which is withdrawn once overruns become frequent.
      Traffic is what drives frequency, so **going public is itself the most
      likely trigger**. Caching does not make renders cheaper; it collapses how
      many renders happen, which is the variable that matters. See
      [Cloudflare Resource Limits and Monitoring](docs/CLOUDFLARE_RESOURCE_LIMITS_AND_MONITORING.md).

      Nothing is cached at the edge today -- `server-timing` reports
      `cache.hit;dur=0`, so every request runs the Worker and re-renders the
      page. Workers Cache sits *in front of* the Worker, so a hit never invokes
      it at all.

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

      And keep the limits of this in view: caching is a frequency control, not
      a cost control. A cache miss still costs 35-99 ms and still overruns. The
      cache is per-colo, every article and term is its own entry, and a crawler
      walking the URL space after launch hits mostly misses -- so this is a
      large mitigation, not a guarantee. Reference:
      [Workers Cache](https://docs.emdashcms.com/deployment/cloudflare/#workers-cache).
## Operations

### Record a D1 recovery bookmark

After building an upgrade and before production migrations or deployment, run:

```bash
bun run db:bookmark
```

This requires Bun and authenticated Wrangler access. It reads the top-level `DB`
binding from `wrangler.jsonc` and retrieves the remote database's current Time
Travel bookmark. Each run writes a new, Git-ignored JSON file under
`.local/backups/d1/` with the database name and ID, capture time, bookmark, and
restore command. It does not migrate, restore, or deploy anything. Retrieval
errors fail the command without saving a record.

Keep the record accessible alongside the matching previous application version.
The restore command assumes the `DB` binding still points to the recorded database
ID; check that before using it. Recording a bookmark does not extend D1 retention
(7 days on Workers Free, 30 days on Workers Paid), or back up media and secrets.
See [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/).

If adding a bookmark saved manually before an earlier upgrade, create a separate
JSON record using its original capture time and database identity. Do not replace
a newly captured bookmark or label it as a pre-upgrade recovery point.

- [Cloudflare Resource Limits and Monitoring](docs/CLOUDFLARE_RESOURCE_LIMITS_AND_MONITORING.md)
  -- which limits bind this site, the measured CPU baseline per route, content
  rules that keep it up, and how to triage a `1102` outage.

## See Also

- [Node.js variant](../blog) -- same template using SQLite and local file storage
- [All templates](../)
- [EmDash documentation](https://github.com/emdash-cms/emdash/tree/main/docs)
