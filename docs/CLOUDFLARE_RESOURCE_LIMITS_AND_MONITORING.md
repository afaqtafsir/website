# Cloudflare Resource Limits and Monitoring

How this site consumes Cloudflare Workers resources, which limits actually bind
it, and how to watch them. Written after the 2026-09-11 CPU incident (see
[The isolate flexibility trap](#the-isolate-flexibility-trap)).

Reference: [Workers limits](https://developers.cloudflare.com/workers/platform/limits/).

---

## Status: over budget on every route

**This site is on Workers Free, whose CPU limit is 10 ms per request. Every
single route exceeds it.** Measured 2026-09-12, after the base64 cleanup:

| Route                   | CPU (cold) | CPU (warm) | Limit | Over by |
| ----------------------- | ---------- | ---------- | ----- | ------- |
| `/`                     | 99 ms      | 17-35 ms   | 10 ms | 2-10x   |
| `/<article-slug>`       | 28-37 ms   |            | 10 ms | 3-4x    |
| `/kategori/<slug>`      | 35 ms      |            | 10 ms | 3.5x    |
| `/tag/<slug>`           | 23 ms      |            | 10 ms | 2.3x    |
| `/penulis/<slug>`       | 22 ms      |            | 10 ms | 2.2x    |
| `/penulis`              | 19 ms      |            | 10 ms | 1.9x    |
| `/search`               | 13 ms      |            | 10 ms | 1.3x    |
| `/tentang` (no content) | 11 ms      |            | 10 ms | 1.1x    |
| `/_emdash/api/media/*`  | 2-4 ms     |            | 10 ms | under   |

For context, Cloudflare states the average Worker uses ~2.2 ms, and that
"heavier workloads that handle authentication, server-side rendering, or parse
large payloads typically use 10-20 ms". Astro SSR + EmDash puts us at the top of
that band before any content is involved: even `/tentang`, which queries no
articles at all, costs 11 ms.

**The site works anyway.** That is not because we are under the limit -- it is
because of isolate flexibility, explained below. It is a tolerance, not a
budget, and it is the single most important thing to understand about this
deployment.

---

## The isolate flexibility trap

From the Cloudflare docs:

> Each isolate has some built-in flexibility to allow for cases where your
> Worker **infrequently** runs over the configured limit. If your Worker starts
> hitting the limit **consistently**, its execution will be terminated according
> to the limit configured.

This is a cliff, not a slope. Two regimes:

- **Tolerated** -- occasional overruns are absorbed. A 35 ms render on a 10 ms
  limit returns `200`. This is where we live today.
- **Enforced** -- once breaches become consistent, the runtime stops absorbing
  them and terminates strictly at 10 ms. Everything that costs more than 10 ms
  starts failing.

The second regime applies to the **whole Worker script**, not the route that
caused it. That is what makes this dangerous: one expensive page can take down
pages that were never expensive.

### What happened on 2026-09-11

One article (`pkumi-dalami-tradisi-keilmuan-majelis-tarjih-muhammadiyah`) was
edited in the admin UI and two photos were pasted into the body, where they were
stored as base64 `data:` URIs instead of being uploaded to R2. That made its
Portable Text row **3,275,304 bytes** -- 200x the ~13 KB of every other article.

`getEmDashCollection()` has no field-selection option (`CollectionFilter` is
`status` / `limit` / `cursor` / `offset` / `where` / `orderBy` / `locale` only).
It always does `SELECT r.*` and JSON-parses the full `content` column, even when
the template renders nothing but a title and an excerpt. So every page whose
result set contained that row paid a 3.2 MB parse:

- `/` -- `limit: 24`, returns all articles
- `/penulis` -- `limit: 100`
- `/penulis/tiara-nur-mulyawati` -- she is its author
- `/<any-article>` -- the related-articles query (`[slug].astro`, `limit: 4`)
  and it ranked 3rd by `published_at`
- the archives for its own category and tag terms

That was frequent enough to count as consistent, so the runtime switched the
whole script into enforced mode. **Every route began returning
`error code: 1102` at exactly `cpu=10ms`, including `/tentang`**, which had been
costing 7 ms and touches no articles whatsoever. The admin UI went down too,
because opening that entry in the editor loaded the same payload.

Two details made this confusing to diagnose, both worth remembering:

1. **Astro streams responses.** Some requests flushed headers and partial HTML
   before the CPU blowup, so `curl` reported `200` on a body that had no closing
   `</html>`. Others died before the flush and returned `503`. Always check for
   a complete body, not just the status code.
2. **Recovery is not instant.** After the cause was removed the script stayed in
   enforced mode for a while, then returned to tolerated mode on its own. A fix
   that looks ineffective may just need time.

Aftermath, once the images were moved to R2 and the revisions pruned:

| Measure                | Before        | After     |
| ---------------------- | ------------- | --------- |
| Article `content` row  | 3,275,304 b   | 13,173 b  |
| Its revision history   | 9,843,423 b   | 27,752 b  |
| Whole D1 database      | 14.97 MB      | 2.11 MB   |

---

## What drives CPU on this site

In rough order of contribution:

1. **Parsing `content` for entries that only render as cards.** Every listing
   query ships and parses every article body. With 8 articles at ~13 KB that is
   ~100 KB of JSON per homepage render, thrown away after reading the title.
   This scales linearly with both article count and article length -- it is the
   thing that will break next.
2. **Portable Text rendering** of a full article body on `/<slug>`.
3. **Term and byline hydration.** Correlated `json_group_array` subqueries per
   entry, expanded in JS.
4. **Astro SSR itself** -- layout, fonts, SEO, menus. This is the ~11 ms floor
   that `/tentang` demonstrates.

Known amplifiers in the templates:

- `src/pages/index.astro` -- `limit: 24`, so every published article is fetched
  in full on the most-visited page.
- `src/pages/[slug].astro` -- the related-articles query fetches **4 complete
  article bodies to render 3 cards** that use only title, image, and category.
- `src/pages/penulis/index.astro` -- `limit: 100`, full bodies, to aggregate
  byline names.

There is no API-level fix for these, because field selection does not exist.
The levers are: keep bodies small, lower the limits to what is actually
rendered, or cache.

---

## Content rules

These are not style preferences. They are what keeps the site up.

1. **Never paste images into the editor body.** Upload them to the media library
   so they land in R2 and the body carries only a reference. A pasted image
   becomes a base64 `data:` URI inside the Portable Text and is then loaded and
   parsed by every listing query on the site.
2. **A correct image block looks like this** -- `asset.url` must carry the
   `/_emdash/api/media/file/` prefix, not a bare storage key, or Astro throws
   `src parameter must be an imported image or a URL`:

   ```json
   {
     "_type": "image",
     "_key": "...",
     "alt": "...",
     "width": 1280,
     "height": 720,
     "asset": {
       "_ref": "<media ULID>",
       "url": "/_emdash/api/media/file/<storage-key>.png"
     }
   }
   ```

3. **Keep article bodies under ~50 KB.** Normal long-form here is 10-16 KB.
   Anything past 100 KB should be investigated.
4. **Remember revisions.** Every save writes another copy. The bad article held
   3.2 MB in `ec_articles` and 9.8 MB more across 4 revisions. Cleaning the
   entry without pruning revisions leaves the payload reachable from the editor.

### Check for oversized rows

Run this after any bulk content edit, and any time the site feels slow:

```bash
bunx wrangler d1 execute afaqtafsir-website --remote \
  --command "SELECT slug, length(content) AS bytes FROM ec_articles WHERE deleted_at IS NULL ORDER BY bytes DESC LIMIT 5"
```

Find inlined base64 anywhere in content:

```bash
bunx wrangler d1 execute afaqtafsir-website --remote \
  --command "SELECT slug, length(content) AS bytes FROM ec_articles WHERE content LIKE '%data:image%'"
```

Find revision bloat:

```bash
bunx wrangler d1 execute afaqtafsir-website --remote \
  --command "SELECT entry_id, count(*) AS n, sum(length(data)) AS total FROM revisions GROUP BY entry_id ORDER BY total DESC LIMIT 5"
```

---

## How to monitor

Observability is already enabled in `wrangler.jsonc` (`head_sampling_rate: 1`,
logs persisted), so every invocation is recorded.

### Live CPU per request

The most useful tool by far. `wrangler tail` reports `cpuTime`, `wallTime`, and
`outcome` for each invocation:

```bash
bunx wrangler tail website --format json > /tmp/tail.json
# ...make requests in another shell...
```

The output is pretty-printed JSON objects concatenated, **not** JSONL, so parse
it with a streaming decoder rather than line by line:

```python
import json
raw = open('/tmp/tail.json').read()
dec, i, rows = json.JSONDecoder(), 0, []
while i < len(raw):
    while i < len(raw) and raw[i] in ' \n\r\t':
        i += 1
    if i >= len(raw):
        break
    obj, i = dec.raw_decode(raw, i)
    rows.append(obj)

for r in rows:
    url = ((r.get('event') or {}).get('request') or {}).get('url', '')
    if not url or '/cdn-cgi/' in url:
        continue
    print(r.get('outcome'), r.get('cpuTime'), 'ms', url)
    for e in (r.get('exceptions') or []):
        print('   EXC:', e.get('name'), e.get('message'))
```

`outcome` is the field that matters:

| Outcome          | Meaning                                              |
| ---------------- | ---------------------------------------------------- |
| `ok`             | Completed.                                           |
| `exceededCpu`    | Hit the CPU limit. Client sees `error code: 1102`.    |
| `exceededMemory` | Hit the 128 MB isolate limit. Also `1102`.            |
| `exception`      | Threw. The `exceptions` array carries the real error. |

### Dashboard

**Workers & Pages > website > Metrics > Errors > Invocation Statuses**, then
look at `Exceeded CPU Time Limits`. Any non-zero value here means the script has
entered enforced mode -- treat it as an outage, not a warning.

### Database

```bash
bunx wrangler d1 execute afaqtafsir-website --remote --command "SELECT 1" >/dev/null
bunx wrangler d1 info afaqtafsir-website
```

`d1 info` reports `database_size`, `read_queries_24h`, `rows_read_24h`, and the
write equivalents. Baseline on 2026-09-12: 2.11 MB, 24,849 reads / 486,826 rows
read per 24h, 3,141 writes / 5,635 rows written. The read figures are inflated
by testing and by the per-minute cron; a quiet day should be well under them.

### Checking a page really rendered

Because of streaming, status code alone lies. Always confirm the body is
complete:

```bash
curl -s -o /tmp/p -w "http=%{http_code} size=%{size_download}\n" https://preview.afaqtafsir.id/
grep -q '</html>' /tmp/p && echo complete || echo TRUNCATED
```

---

## Limits that bind this site

| Limit                     | Free            | Paid          | Our position                                       |
| ------------------------- | --------------- | ------------- | -------------------------------------------------- |
| **CPU per request**       | **10 ms**       | 30 s (max 5m) | **Over on every route.** The binding constraint.    |
| CPU per Cron Trigger      | 10 ms           | 30 s          | `* * * * *` in `wrangler.jsonc`; watch it.          |
| Requests/day              | 100,000         | unlimited     | Cron alone is 1,440/day. Fine while private.        |
| Subrequests/request       | 50              | 10,000        | Every D1 query and R2 read counts. Not yet counted. |
| Memory per isolate        | 128 MB          | 128 MB        | Fine now; the 3.2 MB row was a real risk.           |
| Simultaneous connections  | 6               | 6             | Not a concern.                                      |
| Worker size uncompressed  | 64 MiB          | 64 MiB        | Not a concern.                                      |
| Worker startup time       | 1 s             | 1 s           | Not a concern.                                      |
| Cache API calls/request   | 50              | 1,000         | Shares the subrequest quota.                        |
| Cron Triggers per account | 5               | 250           | Using 1.                                            |

Notes on the ones that could bite later:

- **Subrequests (50/request on Free).** Each D1 query, R2 read, and KV access is
  a subrequest. An article page runs the entry query, a related query, a terms
  batch, site settings, menus, and widget queries. We have not counted them
  precisely and should before launch -- a page that adds a few more queries
  could approach 50.
- **Cron CPU is also 10 ms on Free.** The trigger runs every minute for
  scheduled publishing and maintenance. If it starts doing real work it will
  breach on the same terms as a page request, with the same script-wide
  consequence.
- **Daily requests (100k).** Not a concern while the site is private, but note
  the failure mode is configurable per route: *fail open* bypasses the Worker,
  *fail closed* serves a 1027 error page. Decide which you want before launch.

---

## What to do about the CPU overrun

In increasing order of effort.

1. **Enable Workers Cache.** The cache sits *in front of* the Worker, so a hit
   never invokes it and costs no CPU at all. This does not reduce the cost of a
   render; it reduces how often you pay it, which is what matters when you are
   over a per-request limit. Tracked as the pre-launch item in the README.
   Caveats there.
2. **Lower the listing limits** to what is actually rendered -- `limit: 24` on
   the homepage and `limit: 100` on `/penulis` both fetch far more than they
   display.
3. **Stop fetching bodies for card lists.** No field selection exists in
   `getEmDashCollection()`, so this means either querying D1 directly through
   the binding for card data, or accepting the cost.
4. **Workers Paid.** 10 ms to 30 s. Removes the constraint rather than managing
   it. Deferred -- but understand that until one of the above lands, the site
   runs on tolerance, and a traffic burst or one oversized entry can flip it to
   enforced mode again.

---

## Quick triage: the site is returning 1102

1. Confirm the outcome: `bunx wrangler tail website --format json`, look for
   `exceededCpu` vs `exceededMemory`.
2. Look for an oversized row -- run the content size query above. This is the
   most likely cause and was the cause last time.
3. If you find one, unpublish it first (`status='draft'`) to stop the bleeding,
   then repair the content, then prune its revisions.
4. Give it time. The script does not leave enforced mode the instant the cause
   is removed.
5. Verify with the complete-body check, across several routes, not just one.
