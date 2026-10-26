# EmDash upgrade work order

This file is the handoff for upgrading the project at `/home/invictus/coding/work/afaqtafsir/website` to the npm `latest` release. The updater resolved the direct packages, changed and installed them where needed, refreshed the project EmDash skills, and compared the installed core migration manifests. It did not edit application code, apply a database migration, or deploy the site.

## Package changes

- `@emdash-cms/cloudflare`: `1.3.0` → `1.3.1` (`^1.3.0` → `^1.3.1`)
- `emdash`: `1.3.0` → `1.3.1` (`^1.3.0` → `^1.3.1`)

## Release entries to assess

These are the complete authored major, minor, and patch entries crossed by the direct EmDash packages in this project. Changesets dependency-bump entries and attribution wrappers have been removed. Check whether each entry affects code or configuration in this project. Do not adopt an unrelated feature merely because it appears here.

### Change 1

Applies to: `@emdash-cms/cloudflare@1.3.1` (patch)  
Source: [#4234](https://github.com/emdash-cms/emdash/pull/4234)

Fixes imports of `d1()`, `r2()`, `kvCache()`, and other config descriptors when `wrangler` is not installed. Wrangler is now an optional peer dependency and is only loaded when calling `sandbox()`. Projects using `sandbox()` must still install `wrangler`.

### Change 2

Applies to: `emdash@1.3.1` (patch)  
Source: [#4069](https://github.com/emdash-cms/emdash/pull/4069)

Fixes sites on Cloudflare Workers in the default `auto` migration mode serving pages without their content, with a 200 status, after an upgrade whose migrations a request could not finish.
  
  Such a site now answers with a 503 response until its migrations are applied, so uptime checks notice it. A deployed Worker also no longer starts a migration that processes every entry and revision of a large site, such as the datetime normalization from 0.39.0; it answers with 503 until `emdash migrate` applies it.
  
  #### What should I do?
  
  If your site runs on Workers in `auto` mode and upgrades from 0.38 or earlier, run `emdash migrate` before you deploy, as described in [Apply large content migrations from the CLI](https://docs.emdashcms.com/deployment/core-migrations/#apply-large-content-migrations-from-the-cli).
  
  If a site answers with 503 after an upgrade, read the Worker log. When it names a pending migration, apply it with `emdash migrate`. When it reports a held migration lock, follow [Release a stuck migration lock](https://docs.emdashcms.com/deployment/core-migrations/#release-a-stuck-migration-lock).

### Change 3

Applies to: `emdash@1.3.1` (patch)  
Source: [#4226](https://github.com/emdash-cms/emdash/pull/4226)

Fixes purged pages being cached again with stale site settings, including SEO verification tags, titles, and logos, on sites with or without an object cache. Route-cache fills with an object cache read settings directly from the database. Without an object cache, responses using an outdated settings snapshot are kept out of the route cache, and the next render reloads the settings. Warm settings snapshots also revalidate in the background after 30 seconds, retaining the last good value if a reload fails.

### Change 4

Applies to: `emdash@1.3.1` (patch)  
Source: [#4180](https://github.com/emdash-cms/emdash/pull/4180)

Fixes `emdash login` and `emdash logout` ignoring `EMDASH_URL`. Without `--url`, they now use the site in `EMDASH_URL`, like the other commands, instead of always going to `http://localhost:4321`.

### Change 5

Applies to: `emdash@1.3.1` (patch)  
Source: [#4239](https://github.com/emdash-cms/emdash/pull/4239)

Fixes CLI commands failing behind Cloudflare Access once the EmDash access token saved by `emdash login` has expired. Refreshing the token now sends the custom headers from `--header`, `EMDASH_HEADERS` and `emdash login`, as every other request does. `EmDashClient` from `emdash/client` now also runs the `interceptors` you pass on its automatic token refresh request.

### Change 6

Applies to: `emdash@1.3.1` (patch)  
Source: [#4070](https://github.com/emdash-cms/emdash/pull/4070)

Fixes `createField` on D1 leaving a field in the schema without a backing column when the collection reaches the column limit. Failed fields can now be created after freeing a column, without a `FIELD_EXISTS` error.

### Change 7

Applies to: `emdash@1.3.1` (patch)  
Source: [#4161](https://github.com/emdash-cms/emdash/pull/4161)

Fix an issue where the redirect middleware would rerun a route and hide the original error when the route (or later middleware) threw. The catch block is now narrowed to the redirect lookup, so `next()` is called exactly once and route errors propagate to Astro. Failures during the middleware's own post-response work (404 logging and cache handling) are still caught and logged rather than propagated.

### Change 8

Applies to: `emdash@1.3.1` (patch)  
Source: [#4181](https://github.com/emdash-cms/emdash/pull/4181)

Fixes the admin dashboard showing the number of users to roles that cannot list users. The Users card, and `userCount` in the `GET /_emdash/api/dashboard` response, are now limited to Administrators.

### Change 9

Applies to: `emdash@1.3.1` (patch)  
Source: [#4170](https://github.com/emdash-cms/emdash/pull/4170)

Fixes `<Image>` from `emdash/ui` so images with a blurhash placeholder keep their focal point. The generated style previously omitted the separating semicolon between the placeholder background and `object-position`, which caused browsers to discard both declarations.

### Change 10

Applies to: `emdash@1.3.1` (patch)  
Source: [#4013](https://github.com/emdash-cms/emdash/pull/4013)

Fixes the admin login page so the help text under a provider's `LoginForm` is no longer hard-coded to "Enter your handle to sign in." for every provider.
  
  Providers can now export an optional `loginHelp` string or component from their admin entry. When `loginHelp` is absent, the page falls back to a neutral "Continue with {label}." message.
  
  The built-in AT Protocol provider keeps its handle-specific prompt and translates it using the admin's active locale. It requires `@lingui/react` as a peer dependency; if your package manager does not install peers automatically, install a compatible Lingui 5 version alongside the provider.

### Change 11

Applies to: `emdash@1.3.1` (patch)  
Source: [#4043](https://github.com/emdash-cms/emdash/pull/4043)

Fixes media previews and file downloads timing out on Node.js sites using S3-compatible storage, including Cloudflare R2, after repeated cache revalidation or HEAD requests.

### Change 12

Applies to: `emdash@1.3.1` (patch)  
Source: [#4024](https://github.com/emdash-cms/emdash/pull/4024)

Fixes `getEmDashCollection()` returning empty results when `where` or `orderBy` uses a custom field while migration `086_relations_structural` is pending. Reference fields become available on the next request after migrating, without waiting for the object cache to expire. Missing columns unrelated to caller fields are reported as collection-loading errors rather than filter warnings.

### Change 13

Applies to: `emdash@1.3.1` (patch)  
Source: [#4255](https://github.com/emdash-cms/emdash/pull/4255)

Fixes menu item create, update, and reorder requests accepting missing, cross-menu, or cyclic parents that can hide items from rendered menus. Invalid parent changes now return a validation error without changing the menu; reorder validation uses the final state of the batch.
  
  Unchanged parent links from older writes do not block label edits or reorders, so menus with legacy invalid data remain editable.

### Change 14

Applies to: `emdash@1.3.1` (patch)  
Source: [#4224](https://github.com/emdash-cms/emdash/pull/4224)

Fixes locale-aware queries when Astro locales use custom paths and codes, such as `{ path: "en", codes: ["en-US"] }`. Passing `Astro.currentLocale` to content, menu, taxonomy, and byline queries now matches rows stored under either the configured path or its codes. New writes use the path, while existing code-stamped rows keep their IDs, locale values, and associations. Reapplying seeds using either spelling reuses existing rows instead of creating duplicates.
  
  When both path- and code-stamped rows exist for the same slug or name, lookups and seed matching prefer the path, then codes in configuration order. Public content queries consider only published rows, so a draft path row does not hide a published code row. Existing rows are not merged or deleted: listings retain both, and row-ID lookups remain available. This read-side compatibility avoids a destructive data migration or manual renaming during upgrade.

### Change 15

Applies to: `emdash@1.3.1` (patch)  
Source: [#4229](https://github.com/emdash-cms/emdash/pull/4229)

Fixes repeated plugin storage index registration so unchanged declarations no longer rewrite the `_plugin_indexes` registry rows on every sync. This reduces background write traffic on D1 and other SQLite-backed deployments when index declarations have not changed.

### Change 16

Applies to: `emdash@1.3.1` (patch)  
Source: [#4220](https://github.com/emdash-cms/emdash/pull/4220)

Reduces database round trips for the `search()`, `searchCollection()`, and `getSuggestions()` helpers, including searches with no matches, to improve response times on Cloudflare D1. Empty or whitespace-only queries no longer query the database. Autocomplete also skips collections whose search indexes are missing.

### Change 17

Applies to: `emdash@1.3.1` (patch)  
Source: [#4201](https://github.com/emdash-cms/emdash/pull/4201)

Fixes captions being omitted from image field values and their generated TypeScript types. Image selection, content saves, and seed export/import preserve captions, including explicitly empty captions. Seed exports keep library defaults separately from per-use captions. Image and focal-point edits retain per-use captions unless the caption is explicitly edited. Templates should read the top-level `caption`; the legacy `meta.caption` alias stays consistent when present.
  
  For existing image fields whose captions were previously omitted, reselect the image or explicitly edit its caption, then save and publish the content entry. Upgrading alone does not fill captions into previously stored content values.

### Change 18

Applies to: `emdash@1.3.1` (patch)  
Source: [#4256](https://github.com/emdash-cms/emdash/pull/4256)

Fixes D1 parameter-limit errors when updating the status of up to 100 comments at once or saving content with more than 100 byline credits.

### Change 19

Applies to: `emdash@1.3.1` (patch)  
Source: [#4225](https://github.com/emdash-cms/emdash/pull/4225)

Fixes duplicate menu items and widgets when concurrent first requests apply the same seed through D1 bindings. Menu and widget replacements are atomic on D1 bindings, transactional SQLite, and PostgreSQL, so a failed replacement retains the previous items. This does not make replacements atomic on the Durable Object SQL backend.

### Change 20

Applies to: `emdash@1.3.1` (patch)  
Source: [#4221](https://github.com/emdash-cms/emdash/pull/4221)

Fixes the `Image` component from `emdash/ui` rejecting the `quality` prop during `astro check`. Quality now reaches both Astro image rendering paths and providers that support it, without leaking onto unoptimized `<img>` elements.
  
  Fixes EmDash's internal-media transforms on Cloudflare serving the full-size original for Astro quality presets or fractional and out-of-range numbers. Presets `low`, `mid`, `high`, and `max` map to 25, 50, 80, and 100; finite numbers are rounded and clamped to 1–100.

### Change 21

Applies to: `emdash@1.3.1` (patch)  
Source: [#4074](https://github.com/emdash-cms/emdash/pull/4074)

Fixes stale automatic slug-change redirects hiding new entries published at the old URL. Publishing an entry now removes the automatic redirect from its URL, so visitors can reach the new page.

### Change 22

Applies to: `emdash@1.3.1` (patch)  
Source: [#4179](https://github.com/emdash-cms/emdash/pull/4179)

Fixes Subscribers, and other users without `content:read_drafts`, seeing unpublished content through the content API and MCP tools. Asking for the terms or translations of a draft or scheduled entry now returns not found, and MCP `content_get` returns only the published version of an entry with unpublished changes.

### Change 23

Applies to: `emdash@1.3.1` (patch)  
Source: [#4203](https://github.com/emdash-cms/emdash/pull/4203)

Fixes pages that show categories, tags or term counts hanging with a 524 error for every visitor on a Cloudflare Workers isolate after one visitor disconnected while the isolate was loading taxonomy definitions or its list of collections.

### Change 24

Applies to: `emdash@1.3.1` (patch)  
Source: [#4106](https://github.com/emdash-cms/emdash/pull/4106)

Stop forcing `blank: true` on every new text link.
  
  TipTap's Link extension defaults `HTMLAttributes.target` to `"_blank"`. Because both the admin rich-text editor and the inline visual editor configured Link with only styling classes, the default survived deep-merge, so every link created with `setLink()` was serialized as `blank: true` and rendered with `target="_blank" rel="noopener noreferrer"`. Both editors now set `target: null` in their Link `HTMLAttributes`, so newly saved text links no longer open in a new tab unless an author explicitly chooses that option (available only for image links today).
  
  Existing content that already has `blank: true` is unchanged and will continue to open in a new tab.

### Change 25

Applies to: `emdash@1.3.1` (patch)  
Source: [#4207](https://github.com/emdash-cms/emdash/pull/4207)

Fixes edits disappearing after unpublishing an entry in a collection without revisions: the editor showed the previously published content after every save, and the next save wrote it back over the edits. Saves now keep the edits, including on entries unpublished before this release.

## Agent skills

The updater ran:

```sh
npx --yes skills@1.7.0 add emdash-cms/skills -y
```

Use the refreshed `upgrading-emdash` skill for this work order. If the skills command reported a conflict or failure, resolve that before continuing.

## Core database migrations

Installed EmDash changed from `1.3.0` to `1.3.1`.

No core migrations were added by this upgrade.

Build the upgraded project and inspect the exact database target:

```sh
bun run build
bunx emdash migrate --status
```

If the status reports pending migrations, stop before starting or deploying the upgraded application. Follow [Backups and recovery](https://docs.emdashcms.com/guides/backups/) to create a restorable recovery point. A JSON backup is not a recovery point. After a human has reviewed the target and backup, apply the pending migrations:

```sh
bunx emdash migrate
```

The command shows the target and asks for confirmation. In a non-interactive shell, add `--expected-target-fingerprint` with the target fingerprint that the status command printed for the reviewed database.

Deploy the same build artifact with the project's deployment workflow, without rebuilding it. On Cloudflare Workers, run `wrangler deploy`.

Verify the deployed database against that artifact:

```sh
bunx emdash migrate --check
```

## Verification

1. Assess every release entry above and make the project changes it requires.
2. Run the project's format, tests, typecheck, and build commands.
3. Inspect the migration target and pending names before applying them.
4. Verify the public site, admin sign-in, content editing, media reads, and encrypted plugin settings after deployment.
