# EmDash upgrade work order

This file is the handoff for upgrading the project at `/home/invictus/coding/work/afaqtafsir/website` to the npm `latest` release. The updater resolved the direct packages, changed and installed them where needed, refreshed the project EmDash skills, and compared the installed core migration manifests. It did not edit application code, apply a database migration, or deploy the site.

## Package changes

- `@emdash-cms/cloudflare`: `1.0.1` → `1.3.0` (`^1.0.1` → `^1.3.0`)
- `emdash`: `1.1.0` → `1.3.0` (`^1.0.1` → `^1.3.0`)

## Release entries to assess

These are the complete authored major, minor, and patch entries crossed by the direct EmDash packages in this project. Changesets dependency-bump entries and attribution wrappers have been removed. Check whether each entry affects code or configuration in this project. Do not adopt an unrelated feature merely because it appears here.

### Change 1

Applies to: `@emdash-cms/cloudflare@1.3.0` (patch)  
Source: [#3886](https://github.com/emdash-cms/emdash/pull/3886)

Fixes sandboxed plugins' `ctx.media.readBytes()` calls failing with "Media storage is not configured" under concurrent requests on Cloudflare Workers with an R2 `MEDIA` binding. Sites without that binding continue to use the existing storage callback fallback.
  
  Updates `createPluginRuntimeTestHost()` to store media fixtures and uploads in its local R2 binding, so plugins can read their bytes through the production bridge.

### Change 2

Applies to: `@emdash-cms/cloudflare@1.3.0` (patch)  
Source: [#4047](https://github.com/emdash-cms/emdash/pull/4047)

Fixes the Playground toolbar covering the end of site pages on narrow screens. Site pages now leave room below their last content, so footer links and buttons such as the theme switcher can be scrolled clear of the toolbar and clicked.

### Change 3

Applies to: `@emdash-cms/cloudflare@1.3.0` (patch), `emdash@1.3.0` (patch)  
Source: [#4053](https://github.com/emdash-cms/emdash/pull/4053)

Fixes the `defaultRole` and `roleMapping` hover text for external auth providers and Cloudflare Access, which called role 30 "Editor" and role 40 "Developer". Role 30 is Author and can publish its own content, and role 40 is Editor. Only the descriptions and examples changed, not how roles resolve.
  
  #### What should I do?
  
  If you set `defaultRole` or a `roleMapping` entry to `30` because the hover text said Editor, check that Author access is what you meant. Use `20` (Contributor) for people who should not publish. The Access `defaultRole` still defaults to `30`.

### Change 4

Applies to: `@emdash-cms/cloudflare@1.2.0` (minor), `emdash@1.2.0` (minor)  
Source: [#3875](https://github.com/emdash-cms/emdash/pull/3875)

Adds a `syncName` option to external auth providers such as Cloudflare Access. By default, EmDash still replaces a user's name with the provider's name on every authenticated request, so a name edited in the admin is restored on that user's next request. Set `syncName: false` to keep names edited in the admin; the provider's name is then used only when the user is first provisioned.
  
  ```js
  auth: access({
  	teamDomain: "myteam.cloudflareaccess.com",
  	syncName: false,
  }),
  ```

### Change 5

Applies to: `@emdash-cms/cloudflare@1.2.0` (patch), `emdash@1.2.0` (patch)  
Source: [#3828](https://github.com/emdash-cms/emdash/pull/3828)

Fixes videos served from `/_emdash/api/media/file/` not playing in Safari and on iOS, and not seeking past the buffered part in other browsers. With the local, S3, and R2 storage adapters, the media route answers `Range` requests with `206 Partial Content`, or `416 Range Not Satisfiable` for a range past the end of the file, and sends `Accept-Ranges: bytes`.
  
  Custom storage adapters can serve ranges by accepting the optional `options.range` argument to `download()` and setting `range` on the result, as described in [the storage interface docs](https://docs.emdashcms.com/deployment/storage/#byte-ranges). Adapters that ignore the argument still work: range requests to them receive the whole file, or `416` for a range past the end of the file.

### Change 6

Applies to: `@emdash-cms/cloudflare@1.2.0` (patch), `emdash@1.2.0` (patch)  
Source: [#3855](https://github.com/emdash-cms/emdash/pull/3855)

Adds `ETag` and `Last-Modified` validators to media file responses and `/image` transforms, and returns `304 Not Modified` when a browser's `If-None-Match` or `If-Modified-Since` precondition matches. This lets cached mutable media (images that can be replaced under the same storage key) be revalidated with a single header exchange instead of re-downloaded on every visit. Storage backends now report `lastModified` with downloads where available (local filesystem, S3-compatible, and R2). The short `public, max-age=0, must-revalidate` cache lifetime for images is unchanged, so replacements still appear immediately.

### Change 7

Applies to: `@emdash-cms/cloudflare@1.2.0` (patch), `emdash@1.2.0` (patch)  
Source: [#3776](https://github.com/emdash-cms/emdash/pull/3776)

Fixes plugin `ctx.storage.<collection>.getMany()` and `deleteMany()` failing on D1 with `too many SQL variables` when passed more than 98 ids. Both now accept any number of ids, in trusted and sandboxed plugins alike.

### Change 8

Applies to: `@emdash-cms/cloudflare@1.2.0` (patch), `emdash@1.2.0` (patch)  
Source: [#3681](https://github.com/emdash-cms/emdash/pull/3681)

Fixes stored cross-site scripting through the editor toolbar. EmDash inserted the toolbar before the first `</body>` in a response, but Astro leaves `<` and `>` unescaped in attribute values, so content such as an image's alt text could contain `</body>` and move the toolbar inside that attribute, turning the rest of the text into live markup. The editor toolbar, and the Cloudflare preview and playground toolbars, now go only before the closing body tag of a whole HTML document, never into server island or partial page responses.
  
  Before this fix:
  
  - Unless a site set `toolbar: false`, an Author's published content could run script for any signed-in Author, Editor, or Admin who viewed it, and a Contributor's draft could do the same to a signed-in Author, Editor, or Admin who previewed it.
  - With `toolbar: "client"`, published content could also run script for every visitor.
  - In preview Workers built with `createPreviewMiddleware`, published content could run script for anyone who opened a preview link, whatever the `toolbar` setting.

### Change 9

Applies to: `@emdash-cms/cloudflare@1.1.0` (patch)  
Source: [#3633](https://github.com/emdash-cms/emdash/pull/3633)

Fixes Kysely `numAffectedRows` on the Durable Object SQL database backend and the preview database: writes now report the number of changed table rows (SQLite `changes()`) instead of `rowsWritten`, which also counts index entries. This resolves false `stale` outcomes when fencing a collection for deletion with media-usage tracking enabled, and fixes any other `numAffectedRows` / `numUpdatedRows` comparisons against indexed tables.

### Change 10

Applies to: `emdash@1.3.0` (minor)  
Source: [#4117](https://github.com/emdash-cms/emdash/pull/4117)

Updates the visual-editing rich text editor's selection toolbar and slash menu to match the admin editor's.
  
  Selecting text now shows the admin's toolbar: a Turn into menu, link, bold, italic, underline, strikethrough, inline code, and a More menu with subscript, superscript, alignment, and Clear formatting. With the caret in a link, a bar shows where it goes, with buttons to edit or remove it, and clicking a link no longer opens it in a new tab. A typed bare domain such as `example.com` links to `https://example.com`, and a link the editor can't use is refused with a message.
  
  The slash menu now groups its commands, shows each one's Markdown shortcut and description, ranks matches as you type (`/bl` finds Bullet List), and finds Heading 4 to 6 by name. Headings 4 to 6 now show at their own size while editing instead of as Heading 1. Both menus follow the system's light or dark theme and stay readable in dark mode.

### Change 11

Applies to: `emdash@1.3.0` (minor)  
Source: [#4137](https://github.com/emdash-cms/emdash/pull/4137)

Adds an image picker and an image toolbar to the visual-editing rich text editor.
  
  Typing `/image` now opens a picker below the line instead of a full-screen dialog. It shows the media library nine images a page, newest first, with a tab for each media provider the site has set up. One click, or the arrow keys and Enter, inserts an image.
  
  The picker no longer uploads images. To use a new image, upload it to the media library in the admin first, then choose it with `/image`. When the library is empty, the picker links to the media library, which opens in a new tab.
  
  Images now show as they publish, with their alignment and a caption field right underneath. Selecting one shows a toolbar to replace it, edit its alt text, or delete it. Replacing an image keeps its caption and takes the new image's alt text.
  
  Typing `/image` now opens a picker only in the editor it was typed in, not in every editor on the page, and an inserted image no longer gets its file name as its alt text. An image inserted from a line inside a quote or list now goes after the quote or list; saving used to drop an image inside one.

### Change 12

Applies to: `emdash@1.3.0` (minor)  
Source: [#4068](https://github.com/emdash-cms/emdash/pull/4068)

Adds `emdash migrate --take-over-lock <id>`, which applies pending migrations under a stuck D1 migration lock without freeing it first. Releasing the lock with `--release-lock` and then running `emdash migrate` let a Worker in `auto` mode take the free lock in between, and the apply failed with a lock error.
  
  ```sh
  pnpm emdash migrate --take-over-lock 1788264000000
  ```
  
  Like `--release-lock`, it asks you to confirm the target, or needs `--expected-target-fingerprint` in a non-interactive shell.

### Change 13

Applies to: `emdash@1.3.0` (minor)  
Source: [#4136](https://github.com/emdash-cms/emdash/pull/4136)

Adds readable revision history to the content editor. Selecting a version in the **Revisions** panel shows it in place, read-only, with added text highlighted and removed text struck through in the color of the person who saved it. The selected version lists its changes in plain words, such as "Changed the title", and selecting one scrolls to it. **Restore** moves to a bar at the bottom of the editor, and a version that matches an earlier one is marked "Restored from" with that version's date. **Save** and **Publish** pause while a version is open. The panel no longer shows raw JSON.
  
  The revisions list API (`GET /_emdash/api/content/{collection}/{id}/revisions`) and the MCP `revision_list` tool include each revision's `author` as `{ id, name }`, or `null` when no author was recorded or the account no longer exists, so editors without access to user management can see who saved each version.
  
  `ContentEditor`'s `onRevisionRestored` callback can now return a promise. The restore stays pending until it settles, and the restore dialog shows the error if it rejects. When a host passes this callback, the restored version stays on screen until `item` carries the restored draft, and the writer can't go back to editing before then. The editor still refreshes the entry's `content` and `revisions` queries, so a host that reads `item` from the entry's `content` query needs no change. Other hosts must reload `item` from the callback.

### Change 14

Applies to: `emdash@1.3.0` (minor)  
Source: [#3623](https://github.com/emdash-cms/emdash/pull/3623)

Adds a **Disallow AI training** option to **Settings > SEO**. When it is on, `/robots.txt` disallows the AI training crawlers and opt-out tokens `Amazonbot`, `Applebot-Extended`, `Bytespider`, `CCBot`, `ClaudeBot`, `Google-Extended`, `GPTBot`, and `meta-externalagent`, and adds a `Content-Signal: search=yes, ai-train=no` line. Search engine access stays as your other rules define it. The rules are added to both the default and a custom `robots.txt`. The option is also available as `seo.disallowAiTraining` in the settings API and the MCP `settings_update` tool. It is off by default, so existing `robots.txt` output is unchanged.

### Change 15

Applies to: `emdash@1.3.0` (patch)  
Source: [#4034](https://github.com/emdash-cms/emdash/pull/4034)

Fixes `emdash whoami` failing on sites behind Cloudflare Access: it now sends the headers from `--header` and `EMDASH_HEADERS` and reads `EMDASH_URL`, like the other commands. Without a token on localhost, it now signs in through the dev bypass and reports the dev user, and exits 1 when no site answers or the site isn't running under `astro dev`, so scripts can use it as a reachability check.

### Change 16

Applies to: `emdash@1.3.0` (patch)  
Source: [#3955](https://github.com/emdash-cms/emdash/pull/3955)

Fixes `<CommentForm>` making right-to-left pages (`<html dir="rtl">`) about 10,000 pixels wider, with a horizontal scrollbar. This happened on every such page in Firefox, and in Chrome and Safari when the form or an element around it is positioned, for example with `position: relative`. On right-to-left pages, `<Comments>` now also indents threaded replies from the right, and the separator before a signed-in commenter's email in `<CommentForm>` no longer touches the email.

### Change 17

Applies to: `emdash@1.3.0` (patch)  
Source: [#3907](https://github.com/emdash-cms/emdash/pull/3907)

Reduces `getComments()` to a single database query when the approved comment list fits on one page.
  
  Pages rendering comments previously ran a `COUNT` query followed by the list query, even when the result was not truncated. `getComments()` now fetches the list first and derives the total from the returned rows whenever cursor pagination indicates there are no more pages, falling back to `COUNT` only for posts that exceed the page limit. Cache misses on sites without an object cache benefit most.

### Change 18

Applies to: `emdash@1.3.0` (patch)  
Source: [#4133](https://github.com/emdash-cms/emdash/pull/4133)

Fixes Contributors being unable to save changes to their own drafts. A Contributor could create an entry, but the next save, the entry lock, and setting categories or tags returned 403. Contributors can now edit their own entries while they are drafts, in the admin, the REST API, and the MCP `content_update` tool. They still cannot edit entries once they are published or scheduled, or publish them.
  
  The new `content:edit_own_drafts` permission grants this and is held by Contributor and every higher role. No other role's permissions change.

### Change 19

Applies to: `emdash@1.3.0` (patch)  
Source: [#3937](https://github.com/emdash-cms/emdash/pull/3937)

Fixes slower page loads for logged-out visitors on D1 with `session: "auto"` or `"primary-first"` and no `coalesce`. A session runs a request's queries one at a time, so EmDash's preload of site settings, menus, widget areas, and taxonomy terms for HTML pages delayed the page's own first query and added queries the page might never use. In that setup EmDash no longer preloads them; those queries run only when the page uses them. Sites with `coalesce: true` keep the preload, batched into one round trip.
  
  New Cloudflare sites from the templates now use `d1({ binding: "DB", session: "auto", coalesce: true })`, so reads issued together share one D1 round trip, with or without read replication. To get the same on an existing site, set `session: "auto"` (or `"primary-first"`) and `coalesce: true` in its `d1()` call; `coalesce` has no effect without a session. `coalesce` is experimental: a read and a write started together may run write-first, so await a read before a write that must not affect it.

### Change 20

Applies to: `emdash@1.3.0` (patch)  
Source: [#4171](https://github.com/emdash-cms/emdash/pull/4171)

Fixes the admin dashboard for users without `content:read_drafts`, such as Subscribers. Recent activity and collection counts now include only published entries, matching what these users can open elsewhere in the admin, and scheduled-publication policy notices are no longer shown to them. Contributors and above see the dashboard as before.

### Change 21

Applies to: `emdash@1.3.0` (patch)  
Source: [#4128](https://github.com/emdash-cms/emdash/pull/4128)

On sites that use a route cache such as Workers Cache, creating or duplicating an entry no longer purges cached pages. The new entry is a draft that no public page shows, so pages that list the collection stay cached until a later change to published content. This applies to `POST /_emdash/api/content/{collection}`, `POST /_emdash/api/content/{collection}/{id}/duplicate`, and the `content_create` and `content_duplicate` MCP tools. `content_create` with `status: "published"` still purges the collection and the new entry.

### Change 22

Applies to: `emdash@1.3.0` (patch)  
Source: [#4000](https://github.com/emdash-cms/emdash/pull/4000)

Fixes first-user passkey registration so the newly created Admin is authenticated immediately after registration verification. Clicking "Open the dashboard" now opens the dashboard instead of redirecting to the login page.

### Change 23

Applies to: `emdash@1.3.0` (patch)  
Source: [#4073](https://github.com/emdash-cms/emdash/pull/4073)

Fixes force-deleting a collection so it also removes the entries' records in shared tables: revisions, SEO data, comments, content bylines, taxonomy assignments, entry locks, and the revision prune queue. Previously these rows were left behind because only the content table, FTS table, and collection row were dropped.

### Change 24

Applies to: `emdash@1.3.0` (patch)  
Source: [#4045](https://github.com/emdash-cms/emdash/pull/4045)

Fixes site settings updates during a running export so the export's `write_epoch` bump happens inside the same transaction. If the export fence cannot record the write, the settings update now rolls back instead of committing invisibly to the export.

### Change 25

Applies to: `emdash@1.3.0` (patch)  
Source: [#3824](https://github.com/emdash-cms/emdash/pull/3824)

Fixes MCP `content_create` and `content_update` rejecting writes that omit a blocks field with "must be an array". A create that omits a blocks field treats it as empty, and an update keeps the stored blocks. Supplied non-array values are still rejected.

### Change 26

Applies to: `emdash@1.3.0` (patch)  
Source: [#3885](https://github.com/emdash-cms/emdash/pull/3885)

Fix plugin storage cursor behavior when the anchor row of an ordered page is deleted. `PluginStorageRepository.query()` now encodes scalar ordered field values into the cursor and compares subsequent pages against those values, so ascending walks no longer end early and descending walks no longer restart from the top. Cursors for non-scalar values (objects or arrays) or very long strings fall back to the anchor-row lookup used before this fix, keeping those pages working while still surfacing a clear invalid-cursor error when that anchor row has been deleted. Legacy cursors that do not contain the field values still work under the same fallback.

### Change 27

Applies to: `emdash@1.3.0` (patch)  
Source: [#3825](https://github.com/emdash-cms/emdash/pull/3825)

Fixes content writes to single-type blocks fields rejecting blocks that omit `_type`, including nested Markdown conversion over MCP and the TypeScript client. EmDash infers the only allowed type on ordinary writes; multiple allowed types, seed files, and stored blocks of a different type still require an explicit `_type`. Explicit invalid types remain errors.

### Change 28

Applies to: `emdash@1.3.0` (patch)  
Source: [#3942](https://github.com/emdash-cms/emdash/pull/3942)

Fixes the visual-editing rich text editor adding a revision to the entry's history every time it saves on blur. Its saves now replace the pending draft revision, like the admin editor's autosave.

### Change 29

Applies to: `emdash@1.3.0` (patch)  
Source: [#3982](https://github.com/emdash-cms/emdash/pull/3982)

Fixes new and changed redirects being ignored for pages already in the Workers Cache. Saving a redirect for an exact path now clears the cached page at that path.

### Change 30

Applies to: `emdash@1.3.0` (patch)  
Source: [#4102](https://github.com/emdash-cms/emdash/pull/4102)

Fixes the MCP `content_create` tool so it accepts optional `seo` and `publishedAt` fields and persists them in the same call. Agents no longer need to create a post and then call `content_update` just to set SEO metadata or backdate an item. `publishedAt` is gated behind the `content:publish_any` permission, matching the REST API and `content_update`.

### Change 31

Applies to: `emdash@1.3.0` (patch)  
Source: [#3791](https://github.com/emdash-cms/emdash/pull/3791)

Fixes two problems with number fields in the content editor. Clearing a number field now saves it as empty instead of `0`, which previously failed a field's minimum (such as `min: 1`) or silently stored zero. Decimal values such as `4.50` no longer block the Save button with the browser's "nearest valid values" message, while `integer` fields keep stepping in whole numbers.

### Change 32

Applies to: `emdash@1.3.0` (patch)  
Source: [#3202](https://github.com/emdash-cms/emdash/pull/3202)

Fixes full-text search so queries containing lowercase words like "and", "or", "not" or "near" are no longer parsed as FTS5 operators. This restores results for searches with possessive apostrophes and keeps prefix matching for those queries.

### Change 33

Applies to: `emdash@1.3.0` (patch)  
Source: [#4092](https://github.com/emdash-cms/emdash/pull/4092)

Fixes WordPress imports through the EmDash Exporter plugin losing Advanced Custom Fields values: a field stored on only one post was never created, and a repeater row that only one post had was lost. For ACF field groups assigned to a post type, the import now creates a field for every ACF field and stores selects, checkboxes, repeaters, groups, relationships and other structured values as JSON. Relationship, post object, user and taxonomy values that arrive as WordPress posts, users or terms keep only their IDs, so a related post's content and password or a user's password hash are not copied into EmDash. A collection from an earlier import keeps the fields it has, so its repeaters still arrive as one field per row and sub-field.
  
  #### What should I do?
  
  Running the import again skips entries that already exist, so if you imported ACF relationship, post object or user fields through the exporter with an earlier version, check those JSON fields for whole WordPress posts and users yourself.

### Change 34

Applies to: `emdash@1.3.0` (patch)  
Source: [#988](https://github.com/emdash-cms/emdash/pull/988)

Fixes MCP tool names for plugins with scoped IDs such as `@acme/calendar`: their tools are listed as `acme__calendar__<tool>`, which MCP clients accept. Update saved calls that use the old scoped names. Plugins with plain IDs keep their names, and the admin plugin list displays the generated names before consent.
  
  A plugin tool whose JSON Schema cannot be read no longer stops other tools from loading. Unreadable input schemas accept object inputs for route validation; unreadable output schemas are omitted. Duplicate generated names keep the first tool and log a warning instead of disabling the MCP endpoint.

### Change 35

Applies to: `emdash@1.3.0` (patch)  
Source: [#3584](https://github.com/emdash-cms/emdash/pull/3584)

Removes up to two database round trips from the first request after a cold start on sites with the plugin marketplace or registry enabled.
  
  With the sandbox disabled (`sandbox: false`), a failure to load the in-process plugin adapter now stops startup with an error instead of silently starting without any marketplace plugins, matching how sandboxed plugins listed in the integration config already behave.

### Change 36

Applies to: `emdash@1.3.0` (patch)  
Source: [#4005](https://github.com/emdash-cms/emdash/pull/4005)

Fixes server-rendered pages that inspect public plugin route metadata before dispatching, so logged-out visitors can load plugin data. Public metadata is available through `getPublicPluginRouteMeta` for both visitors and signed-in users. Private route metadata stays on the signed-in `getPluginRouteMeta` helper.

### Change 37

Applies to: `emdash@1.3.0` (patch)  
Source: [#2768](https://github.com/emdash-cms/emdash/pull/2768)

Fixes scheduled maintenance stopping after the initialization request in Cloudflare `astro dev`. EmDash now drives its own maintenance through a dev-only workerd route from the long-lived dev server, keeping plugin cron jobs, scheduled publishing, cleanup, and declared plugin storage index creation running between requests without invoking application-wide scheduled jobs. Also works with HTTPS dev servers, including self-signed certificates.

### Change 38

Applies to: `emdash@1.3.0` (patch)  
Source: [#3997](https://github.com/emdash-cms/emdash/pull/3997)

Fixes Astro's route cache, such as Workers Cache, storing a page at a redirect's source after the redirect was saved. A Worker isolate that had not yet reloaded its redirect rules could render the old page and the route cache kept it, even after the cached page was purged. Before the route cache stores a response, the redirect middleware now checks that its rules are current and answers with the redirect when they have changed. This costs one database read for each response the route cache stores; other responses are unchanged.

### Change 39

Applies to: `emdash@1.3.0` (patch)  
Source: [#4097](https://github.com/emdash-cms/emdash/pull/4097)

Fixes oversized plugin screenshots failing to load in the admin registry gallery with HTTP 413.
  
  The registry artifact proxy now requests the `feed_fullsize` image preset for screenshots instead of `feed_thumbnail`. This aligns the admin preview with the public plugin site and avoids the lossless upscaling that pushed modest source images over the 1 MiB proxy cap.

### Change 40

Applies to: `emdash@1.3.0` (patch)  
Source: [#4072](https://github.com/emdash-cms/emdash/pull/4072)

Fixes the datetime normalization migration taking hours on large Cloudflare D1 sites and starting over after every interruption. It now writes changed rows in batches, and running `emdash migrate` again after a failed write continues from the last written batch.

### Change 41

Applies to: `emdash@1.3.0` (patch)  
Source: [#4044](https://github.com/emdash-cms/emdash/pull/4044)

Fix saving a draft when retired fields remain only in the published content row. A full read-then-write update no longer fails validation for keys the entry already stores in its live data but that are absent from the current draft revision. Genuinely never-stored unknown keys are still rejected.

### Change 42

Applies to: `emdash@1.3.0` (patch)  
Source: [#3987](https://github.com/emdash-cms/emdash/pull/3987)

Fixes saves in the admin and through MCP reporting an error when the configured cache provider fails to purge, although the change was already saved. These saves now report success, and the failed purge is logged.

### Change 43

Applies to: `emdash@1.3.0` (patch)  
Source: [#3921](https://github.com/emdash-cms/emdash/pull/3921)

Fixes `emdash seed` to avoid leaking duplicate media rows and adds `--skip-media` for storage-less seeds.
  
  - `$media` references now deduplicate against existing ready media rows by content hash, so re-running `emdash seed ... --on-conflict=update` reuses the same rows instead of creating new ones each time.
  - New `--skip-media` flag resolves `$media` references to external URLs without downloading files or creating local `./uploads`, which is useful when seeding a site whose media lives in remote object storage.

### Change 44

Applies to: `emdash@1.3.0` (patch)  
Source: [#4014](https://github.com/emdash-cms/emdash/pull/4014)

Fixes visual editing selecting all of a text field's text when it is clicked, which made the first keystroke replace the whole value. A click now places the caret where it lands, including on a field inside a link, and text selected by dragging stays selected.

### Change 45

Applies to: `emdash@1.3.0` (patch)  
Source: [#3942](https://github.com/emdash-cms/emdash/pull/3942)

Fixes visual editing for empty Portable Text fields, such as the body of a new post. Edit mode now renders the inline editor for them, so the field can be written on the page instead of having no editor at all. The empty editor stays blank until it is clicked, then shows a "Type / for commands..." hint. In edit mode, an empty Portable Text field reads as an empty array instead of `null`.

### Change 46

Applies to: `emdash@1.3.0` (patch)  
Source: [#4058](https://github.com/emdash-cms/emdash/pull/4058)

Warns during `astro build` and `astro dev` when the installed `@emdash-cms/cloudflare` version differs from `emdash`. The adapter depends on the exact `emdash` version it was released with, so upgrading only one of the two packages installs a second copy of `emdash` that the adapter runs against. The warning names both versions and the command to install matching ones.

### Change 47

Applies to: `emdash@1.3.0` (patch)  
Source: [#3265](https://github.com/emdash-cms/emdash/pull/3265)

Fixes `getEmDashCollection`'s `where` filter so an object with none of `gt`, `gte`, `lt` or `lte` (such as `{ in: [...] }`) now logs a warning instead of silently returning unfiltered rows. Long array values no longer fail on Cloudflare D1 with "too many SQL variables": the longest arrays are each bound as one JSON parameter, keeping ordering and paging in the database on SQLite, D1 and PostgreSQL. Values bound that way compare as text.

### Change 48

Applies to: `emdash@1.3.0` (patch)  
Source: [#4056](https://github.com/emdash-cms/emdash/pull/4056)

Fixes WordPress WXR imports overcounting skipped items. The "skipped (already exists)" count in the admin, and the `skipped` value returned by `POST /_emdash/api/import/wordpress/execute`, now only include entries whose slug already exists in the target collection and locale. Menu items, reusable blocks (imported as sections), revisions and post types you disabled are no longer counted. The "X of Y" progress shown during the import no longer runs past the number of selected items.

### Change 49

Applies to: `emdash@1.3.0` (patch)  
Source: [#4113](https://github.com/emdash-cms/emdash/pull/4113)

Send an identifying `User-Agent: EmDash-Importer/1.0` header on all WordPress plugin importer requests. Without this header, hosts that block requests with an empty User-Agent (such as ScalaHosting's bot filter) returned 403 during analyze and media import. The plugin API fetcher now adds the header to every request, and direct media downloads from `fetchMedia` send the same value. This matches the existing media import route behavior.

### Change 50

Applies to: `emdash@1.3.0` (patch)  
Source: [#4150](https://github.com/emdash-cms/emdash/pull/4150)

Explains why the WordPress exporter import can't connect when Cloudflare's bot protection answers with a challenge page. The URL check and the analyze and import steps now say that bot protection blocked the request and how to let it through, instead of reporting that WordPress couldn't be detected or that the analysis failed. In this case the analyze and execute endpoints return the `WP_SITE_CHALLENGE` error code with status 502, and probe results include `challenged: true`.

### Change 51

Applies to: `emdash@1.3.0` (patch)  
Source: [#4150](https://github.com/emdash-cms/emdash/pull/4150)

Stops a WordPress exporter import with the bot-protection message when Cloudflare challenges a request for taxonomies, menus, site settings, or the media list. Previously the import skipped that part without telling you and finished without it. The analyze and execute endpoints now return `WP_SITE_CHALLENGE` with status 502 in these cases too.

### Change 52

Applies to: `emdash@1.3.0` (patch)  
Source: [#3892](https://github.com/emdash-cms/emdash/pull/3892)

Fixes the WordPress export file (WXR) import in the admin keeping links to the old WordPress domain in imported content. Links to the source site are now rewritten to root-relative paths. The WordPress permalink structure is kept (for example `/2024/05/my-post/`), so add redirects if your routes differ. Links to uploaded files stay absolute, including in raw HTML blocks, which the WordPress plugin import previously turned into broken relative `/wp-content/` links. Links inside reusable blocks imported as sections are not changed.
  
  The import analysis now also shows the real site title and address instead of a generic "WordPress Site" heading. For programmatic use, `parseWxrString` now returns the export's site metadata (it was always empty before), and content fetched through `wxrSource` gets the same link rewriting.

### Change 53

Applies to: `emdash@1.3.0` (patch)  
Source: [#4090](https://github.com/emdash-cms/emdash/pull/4090)

Fixes WordPress XML imports creating `acf_field` and `acf_field_group` collections full of serialized field settings on sites that use Advanced Custom Fields. The admin import now skips ACF's own post types, as it already does for WordPress internals such as revisions and menu items. Collections created by earlier imports stay in place; delete them in the admin if you don't need them.

### Change 54

Applies to: `emdash@1.3.0` (patch)  
Source: [#4123](https://github.com/emdash-cms/emdash/pull/4123)

Fixes `media:afterUpload` hooks being silently dropped for REST API multipart uploads and MCP `media_create` uploads on Cloudflare Workers. Both upload paths now defer hook execution through `after()`, matching the admin confirm flow so hooks that perform async work complete as expected.

### Change 55

Applies to: `emdash@1.2.0` (minor)  
Source: [#3056](https://github.com/emdash-cms/emdash/pull/3056)

Adds an `admin.locales` option that limits the admin interface to the languages a site uses, which makes the admin bundle smaller.
  
  ```js
  emdash({
  	admin: { locales: ["en", "de"] },
  });
  ```
  
  Only the listed languages are built into the admin and offered in its language switcher. Users whose preferred languages aren't listed see English. `en` is always included as the fallback, even when the list leaves it out, so `admin: { locales: ["en-GB"] }` still ships English alongside British English. A code the admin doesn't ship fails the build, and the error lists the available codes. Sites that don't set the option keep every language.

### Change 56

Applies to: `emdash@1.2.0` (minor)  
Source: [#3877](https://github.com/emdash-cms/emdash/pull/3877)

Updates the admin user editor to show the name as read-only, with a hint to change it at the identity provider, when an external auth provider such as Cloudflare Access syncs names (the default). Previously the field looked editable, but the change was replaced on that user's next request. Set `syncName: false` in the provider config to make names editable again.

### Change 57

Applies to: `emdash@1.2.0` (minor)  
Source: [#3744](https://github.com/emdash-cms/emdash/pull/3744)

Adds a **Change domain** dialog to **Settings > General** for moving a site to a new domain. Before it changes the **Site URL**, EmDash checks that the new domain serves the site. Links in emails and plugins, sitemaps, `robots.txt`, hreflang links, social image URLs, and canonical links set in the SEO panel then use the new domain. If the check can't reach the site, for example on `localhost` or behind a login, the dialog offers to store the address without the check.
  
  The **Site URL** field becomes read-only, and saving **Settings > General** no longer writes it. When `siteUrl`, `EMDASH_SITE_URL`, or `SITE_URL` is set, the page names that address, which links in emails and plugins keep using.
  
  Passkeys only work at the address where they were created. After a move, keep signing in at the old address, or sign in at the new one with an email link and add a passkey there.

### Change 58

Applies to: `emdash@1.2.0` (minor)  
Source: [#3697](https://github.com/emdash-cms/emdash/pull/3697)

Adds a `labels` prop to the `Comments` and `CommentForm` components from `emdash/ui/comments`, so sites can translate the comment heading, member badge, Like button, form fields, submit button, and status messages. Keys you leave out keep their English defaults.
  
  `Comments` now formats comment dates in the page locale (`Astro.currentLocale`) instead of always using `en-US`, and accepts a `locale` prop to override it. Sites without Astro i18n routing still show `en-US` dates; pass `locale="en-US"` to keep the previous format on a localized site.
  
  After a successful submission, `CommentForm` now says "Comment published" when the comment is approved immediately and "Comment submitted for review" when it waits for moderation, instead of always showing "Comment submitted!".

### Change 59

Applies to: `emdash@1.2.0` (minor)  
Source: [#3744](https://github.com/emdash-cms/emdash/pull/3744)

Adds an **Email users** action to **Settings > General** that tells every other active user where the site now lives. Each user gets an email with a button to the sign-in page at the configured `siteUrl`, or the **Site URL** when none is set, and a note that passkeys from the old address don't work there. The email does not sign anyone in. The action needs an email provider, passkey sign-in, and the `users:manage` permission, and shows how many emails were sent and how many the provider rejected.
  
  The emails come from the new `POST /_emdash/api/settings/domain/notify` endpoint. It accepts signed-in sessions only and can be used 3 times per hour per site.

### Change 60

Applies to: `emdash@1.2.0` (minor)  
Source: [#3827](https://github.com/emdash-cms/emdash/pull/3827)

Adds a video block to the rich text editor. Type `/video` to choose a Media Library video or upload one. Closing the picker leaves an empty video block in place, which you can fill later by clicking it or dropping a video file on it. Video files dropped or pasted anywhere in the text also upload to the Media Library and appear where you dropped them. The video plays in the editor at the width of the text, with a caption field under it and **Replace video** and **Delete video** in its corner. A video's **Used in** tab in the Media Library lists the entries that use it in a video block.
  
  On the site, `Video` from `emdash/ui` renders the `video` block as the browser's own player with its caption. Media Library videos play from your storage's public URL when one is configured, and need the block's `asset.url`: a block without one renders nothing on the site, and the editor shows it as unplayable. A block whose `asset.provider` names a media provider renders from that provider's embed. An empty video block is saved without `asset` and renders nothing.
  
  Uploads follow `maxUploadSize`, 50 MiB by default. The admin's content security policy now allows media from `blob:` and `https:` URLs (`media-src 'self' blob: https:`), as it already did for images. This lets the admin read a video's size before uploading it, and preview a video block whose `asset.url` is on another site. Before, videos uploaded from the admin in production were saved without a width and height.
  
  #### What should I do?
  
  - If a plugin already defines a `video` block, the editor keeps using the plugin's block: it doesn't offer the built-in Video block, and dropped video files aren't uploaded. On the site, the plugin's renderer still wins; a plugin without one gets `Video` for blocks that have only the built-in fields. In TypeScript, narrowing `PortableTextBlock` on `_type === "video"` now gives `PortableTextVideoBlock | PortableTextUnknownBlock`, so reading the plugin's own fields needs a check.
  - If you edit Portable Text with `portableTextToProsemirror` and `prosemirrorToPortableText` from `emdash` in your own TipTap editor, add a `videoBlock` node with the attributes `src`, `mediaId`, `provider`, `caption`, `width` and `height` to its schema. `portableTextToProsemirror` turns every built-in video block into that node, and a schema without it can't load the document.
  - The media usage API and `emdash/client` can now return the reference type `"portable_text_video"` for a video used in a video block. Code that checks every reference type, or validates the list, needs to accept it.
  - With Astro's content security policy turned on and media on another host, allow that host in `media-src`.

### Change 61

Applies to: `emdash@1.2.0` (minor)  
Source: [#3773](https://github.com/emdash-cms/emdash/pull/3773)

Adds numbered pages to every collection list in the admin. The All and Trash tabs load one page of entries at a time, so a collection opens with 20 entries instead of fetching 100, and both tabs use the Media Library's pagination footer pinned to the bottom of the screen: the entry range, 20, 50, or 100 entries per page, and controls to jump to any page. The Trash badge counts every trashed entry instead of stopping at 50, and every trashed entry is reachable.
  
  Selections persist across pages. Changing the search, a filter, the locale, or the collection clears them.
  
  `GET /_emdash/api/content/{collection}` and `GET /_emdash/api/content/{collection}/trash` accept a 1-based `page` parameter instead of `cursor`. A numbered page returns `total` and no `nextCursor`, and sending both `page` and `cursor` returns a `400` validation error. Cursor pagination is unchanged.
  
  `ContentList` accepts optional `pagination` and `trashPagination` props for numbered pages; without them it behaves as before.

### Change 62

Applies to: `emdash@1.2.0` (minor)  
Source: [#3744](https://github.com/emdash-cms/emdash/pull/3744)

Adds a **Continue on** button to **Settings > General** after a site moves to a new domain. Passkeys only work at the address where they were created, so a user signed in at the old address can select the button to sign in at the new one without email. The single-use link expires after 5 minutes and opens **Settings > Security**, ready to add a passkey for the new address. The button appears when you are signed in at an address other than the **Site URL**, or the configured `siteUrl` when one is set. It is not shown when an external provider such as Cloudflare Access handles sign-in.
  
  The link comes from the new `POST /_emdash/api/auth/handover` endpoint, which accepts signed-in sessions only and allows 5 links per user every 5 minutes. `GET /_emdash/api/settings/domain` now also returns `siteOrigin`, the address the link points to.
  
  `@emdash-cms/auth` exports `createMagicLinkUrl()`, which creates a single-use sign-in link without sending an email.

### Change 63

Applies to: `emdash@1.2.0` (patch)  
Source: [#3781](https://github.com/emdash-cms/emdash/pull/3781)

Fixes locally stored images being served as unoptimized originals on sites that set their public origin with `EMDASH_SITE_URL` or `SITE_URL` instead of `siteUrl`, such as Node.js deployments behind an HTTPS reverse proxy. The variable must be set when `astro build` runs; a value set only in the runtime environment does not enable image optimization.

### Change 64

Applies to: `emdash@1.2.0` (patch)  
Source: [#3767](https://github.com/emdash-cms/emdash/pull/3767)

Fixes API token "Last used" dates and the cleanup of expired authentication and rate-limit records on Cloudflare Workers, where the Worker could stop before these writes finished. These writes now finish after the response is sent, and a failure is logged instead of ignored.

### Change 65

Applies to: `emdash@1.2.0` (patch)  
Source: [#3753](https://github.com/emdash-cms/emdash/pull/3753)

Fixes scheduled 404-log cleanup to run only when the table has grown past its cap. The check uses a bounded sample, so most cron ticks no longer scan the entire `_emdash_404_log` table when there is nothing to evict. This prevents the per-minute cleanup from consuming a large D1 row-read budget for tables that are below the limit.

### Change 66

Applies to: `emdash@1.2.0` (patch)  
Source: [#3762](https://github.com/emdash-cms/emdash/pull/3762)

Fixes WordPress imports turning tables in Classic editor posts into a single paragraph. Tables whose cells hold only text now import as tables, keeping their rows, header row, formatting and links. Tables with images, headings, lists or merged cells, with a caption or footer rows, or inside a `<div>` or `<figure>` keep their previous output.
  
  `gutenbergToPortableText()` also sets `hasHeaderRow: true` on tables whose first row holds only `<th>` cells.

### Change 67

Applies to: `emdash@1.2.0` (patch)  
Source: [#3802](https://github.com/emdash-cms/emdash/pull/3802)

Fixes `getEmDashCollection()` returning published content in edit mode and preview, while `getEmDashEntry()` returned the draft. Lists now show each entry's draft revision to editors in edit mode, and the draft of the previewed entry to a preview link, so inline edits made on a list page no longer appear to revert after saving and previews of list pages show the changes. Other entries in a preview, and all public requests, still get published content.

### Change 68

Applies to: `emdash@1.2.0` (patch)  
Source: [#3631](https://github.com/emdash-cms/emdash/pull/3631)

Fixes `comment:afterCreate` hooks being cut short on Cloudflare Workers. The hooks for a new comment ran as fire-and-forget work that the host did not keep alive, so they could be cancelled as soon as the response was sent. Sandboxed plugins, which call back into the host for settings and email, were stopped at their first call and never ran: a plugin that emails admins about new comments sent nothing. These hooks now run through the host's `waitUntil`, after the response, until they finish.

### Change 69

Applies to: `emdash@1.2.0` (patch)  
Source: [#3381](https://github.com/emdash-cms/emdash/pull/3381)

Fixes comment listings so a fractional `limit` no longer fails with a 500. The page size is rounded down to a whole number on the public comments endpoint, the moderation inbox, and plugin comment reads, and a non-numeric `limit` uses the default of 50.

### Change 70

Applies to: `emdash@1.2.0` (patch)  
Source: [#3785](https://github.com/emdash-cms/emdash/pull/3785)

Fixes `plugin:install` and `plugin:activate` never running for plugins registered in the `plugins` array of `astro.config.mjs`, so setup such as `ctx.cron.schedule()` in `plugin:activate` now takes effect.
  
  Each plugin's hooks run once, when the site first starts with that plugin. On existing sites, this happens on the first start after upgrading for every plugin in `plugins` that you have never enabled, disabled, or changed MCP access for in the admin. A `plugin:install` hook that is not safe to run on a site where the plugin is already in use will run then, so check your plugins before upgrading.
  
  If either hook throws, EmDash logs the error and disables the plugin instead of retrying on every start. Re-enable it from the Plugins page after fixing the problem; this runs `plugin:activate` again.

### Change 71

Applies to: `emdash@1.2.0` (patch)  
Source: [#3930](https://github.com/emdash-cms/emdash/pull/3930)

Fixes `PUT /_emdash/api/content/{collection}/{id}` so a save that carries `_rev` can no longer overwrite a change another writer saved while the request was being processed. The token was checked once against the first read of the entry, and a save that landed before the entry was read again for the write went unnoticed. The version used by the write is now checked against `_rev` as well, and a mismatch returns `409 CONFLICT`. Saves without `_rev` are unchanged.

### Change 72

Applies to: `emdash@1.2.0` (patch)  
Source: [#3911](https://github.com/emdash-cms/emdash/pull/3911)

Load `EMDASH_ENCRYPTION_KEY` from the project `.env` into `process.env` during `astro dev`. This lets freshly scaffolded Node.js sites save plugin settings declared with `type: "secret"` without first exporting the `.env` file into the shell. Existing environment variables are honored and never overwritten; other EmDash variables are not copied so that `.env` values intended for production do not override generated dev values.

### Change 73

Applies to: `emdash@1.2.0` (patch)  
Source: [#3744](https://github.com/emdash-cms/emdash/pull/3744)

Fixes email links pointing to the address a site was set up on after it moved to a new domain. Sign-in, invitation, self-signup, recovery, and comment notification emails now use the **Site URL** from **Settings > General** when `siteUrl`, `EMDASH_SITE_URL`, or `SITE_URL` is not configured, and fall back to the setup address when the field is empty. Only the origin of the **Site URL** is used, and it must use `https://` unless the host is a loopback address. A configured `siteUrl` still takes precedence. `emdash export-seed` no longer copies the **Site URL** into the seed.
  
  If you don't configure `siteUrl` and the **Site URL** field holds an address that doesn't serve this site's admin, for example an old domain, links in these emails point there after upgrading. Check the field before upgrading; clearing it restores the previous behavior. Seeds that set `settings.url`, including seeds exported by earlier versions, still fill in the **Site URL**, so remove `url` from a seed copied from another site before using it.

### Change 74

Applies to: `emdash@1.2.0` (patch)  
Source: [#3920](https://github.com/emdash-cms/emdash/pull/3920)

Fixes `emdash types` so the generated `.emdash/types.ts` imports `BylineSummary`, `ContentBylineCredit`, and `TaxonomyTerm` alongside `PortableTextBlock`.
  
  Previously the CLI downloaded TypeScript definitions whose collection interfaces referenced these three names but only imported `PortableTextBlock`, causing `tsc` to report `TS2304` errors for every collection.

### Change 75

Applies to: `emdash@1.2.0` (patch)  
Source: [#3591](https://github.com/emdash-cms/emdash/pull/3591)

Fixes the visual editor stripping superscript and subscript formatting from Portable Text fields on save, and adds superscript and subscript buttons to its formatting menu. A field that contains formatting the visual editor can't represent now shows a message instead of opening for editing, so editing on the page no longer silently removes that formatting.

### Change 76

Applies to: `emdash@1.2.0` (patch)  
Source: [#3736](https://github.com/emdash-cms/emdash/pull/3736)

Fixes the `core:recent-posts` widget so it shows each post's publication date and thumbnail. Dates use the page's locale and the site's configured timezone, falling back to UTC when the timezone setting isn't recognized. The widget doesn't apply the `dateFormat` setting; dates always use the locale's long format, such as "October 1, 2026" in English. Thumbnails render at up to 96 pixels wide instead of at full size.

### Change 77

Applies to: `emdash@1.2.0` (patch)  
Source: [#3731](https://github.com/emdash-cms/emdash/pull/3731)

Fixes `decodeSlug()` so malformed percent-escaped slugs return `undefined` instead of throwing, letting `[slug]` pages fall through to their 404 handling.

### Change 78

Applies to: `emdash@1.2.0` (patch)  
Source: [#3941](https://github.com/emdash-cms/emdash/pull/3941)

Fixes installing and updating registry plugins whose releases were attested with `actions/attest-build-provenance` v3, including releases from the workflow that `emdash-plugin release setup` generates. These installs previously failed with "release provenance could not be verified". Provenance in both GitHub formats is now accepted, and releases built on self-hosted runners are still rejected.

### Change 79

Applies to: `emdash@1.2.0` (patch)  
Source: [#3851](https://github.com/emdash-cms/emdash/pull/3851)

Adds Indonesian translations for the site domain-change flow, general settings screen, marketplace capability labels, and visual-editing toolbar strings.

### Change 80

Applies to: `emdash@1.2.0` (patch)  
Source: [#3746](https://github.com/emdash-cms/emdash/pull/3746)

Fixes in-page visual editing removing the link and alignment from Portable Text images. Saving any edit to a Portable Text field from the page no longer turns linked images into plain images or resets left, right, center, wide, and full alignment.

### Change 81

Applies to: `emdash@1.2.0` (patch)  
Source: [#3795](https://github.com/emdash-cms/emdash/pull/3795)

Fixes the content editor failing to open any entry with a date field when the site timezone setting is not a valid IANA timezone (for example `Lisboa` instead of `Europe/Lisbon`). The editor now falls back to UTC for such a value instead of crashing, and the settings API and MCP settings tool reject an unrecognized timezone with a validation error. A site that already stores one can still save its other settings, and can fix the timezone in Settings > General.

### Change 82

Applies to: `emdash@1.2.0` (patch)  
Source: [#3922](https://github.com/emdash-cms/emdash/pull/3922)

Fixes `entry.id` sometimes missing the locale prefix on multilingual sites. With several locales configured, entries in a locale whose URLs are prefixed get an `entry.id` such as `en/my-post`. With a Cloudflare database (D1, Durable Object SQL or Hyperdrive), in production and in `astro dev`, the prefix could be missing, depending on what else had already run in the same isolate, so the same entry returned `my-post` on some requests and `en/my-post` on others. Collection queries, `getEmDashEntry()` and referenced entries now always include the prefix.
  
  If your templates add the locale to links themselves, for example `/en/posts/${entry.id}`, or pass `entry.id` to `getEmDashEntry()`, use `entry.data.slug` instead, which never includes the locale.

### Change 83

Applies to: `emdash@1.2.0` (patch)  
Source: [#3914](https://github.com/emdash-cms/emdash/pull/3914)

Fixes admin media uploads skipping `media:beforeUpload` and `media:afterUpload` plugin hooks. Plugins can validate, rename, change the file type, or cancel uploads before they are accepted, and receive a notification after a new media item becomes ready. Filename and type changes are validated; the upload size stays tied to the original client bytes.

### Change 84

Applies to: `emdash@1.2.0` (patch)  
Source: [#3755](https://github.com/emdash-cms/emdash/pull/3755)

Fixes `emdash media upload --alt` and `--caption`, which reported a successful upload but saved neither value on the new media item. Direct uploads to `POST /_emdash/api/media` store the `alt` and `caption` form fields.

### Change 85

Applies to: `emdash@1.2.0` (patch)  
Source: [#3758](https://github.com/emdash-cms/emdash/pull/3758)

Fixes the admin's new-entry form ignoring field default values: a boolean field with `defaultValue: true` started switched off, and saving the entry untouched could store no value. New entries in the admin now start with each field's default value.
  
  Manifest field descriptors now include stored field defaults as `defaultValue`, except for relation-bound reference fields.

### Change 86

Applies to: `emdash@1.2.0` (patch)  
Source: [#3573](https://github.com/emdash-cms/emdash/pull/3573)

Speeds up the first anonymous page views on each new server instance, such as a fresh Cloudflare Worker isolate, when migrations run automatically: the database setup check now runs at the same time as runtime startup instead of before it.
  
  When all migrations are already applied, a temporary database error during the startup migration check (for example a lost D1 connection) no longer blocks runtime startup on that instance for 30 seconds; the next request tries again. An error while pending migrations are being applied, or a migration lock left behind by a stopped instance, still pauses retries.

### Change 87

Applies to: `emdash@1.2.0` (patch)  
Source: [#3806](https://github.com/emdash-cms/emdash/pull/3806)

Fixes collection sitemaps silently dropping entries beyond the first 50,000. Each `/sitemap-{collection}.xml` now holds up to 2,000 entries, ordered by entry ID instead of last update, and continues at `/sitemap-{collection}-2.xml`, `-3.xml`, and so on. `/sitemap.xml` lists every page with its own last-modified date, and translations that land on different pages still list each other as hreflang alternates.
  
  #### What should I do?
  
  Nothing, if search engines read `/sitemap.xml` and you have not replaced the sitemap routes. For collections with more than 2,000 listed entries:
  
  - If you submitted a collection sitemap such as `/sitemap-post.xml` directly to a search console, submit `/sitemap.xml` instead so search engines find every page.
  - If you replaced `src/pages/sitemap.xml.ts`, add `/sitemap-{collection}-{n}.xml` for each further page of 2,000 entries.
  - If you replaced `src/pages/sitemap-[collection].xml.ts`, handle the `-{n}` suffix in the `collection` parameter (for example `post-2`) and serve that page of entries.

### Change 88

Applies to: `emdash@1.2.0` (patch)  
Source: [#3546](https://github.com/emdash-cms/emdash/pull/3546)

Adds `group` to plugin admin pages, in native plugin descriptors and in `admin.pages` of `emdash-plugin.jsonc`, to place them in collapsible admin sidebar folders. A page whose group matches the group of a collection shown in the sidebar appears inside that folder, after its collections and taxonomies. Pages that share any other group, from one plugin or several, fold into one folder in the Plugins section. Pages without a group stay where they are.

### Change 89

Applies to: `emdash@1.2.0` (patch)  
Source: [#3602](https://github.com/emdash-cms/emdash/pull/3602)

Fixes trusted (in-process) plugin API routes dropping error `details`: a route that throws `PluginRouteError.badRequest(message, details)`, or whose `input` schema rejects the request, now returns those details in the JSON error body (`error.details`), so a form can show which fields failed. Unexpected errors still return only a generic message.

### Change 90

Applies to: `emdash@1.2.0` (patch)  
Source: [#3741](https://github.com/emdash-cms/emdash/pull/3741)

Fixes native plugin routes returning a generic `INTERNAL_ERROR` under `astro dev` when the handler throws `PluginRouteError`, so the client receives the error's code, status, and message.

### Change 91

Applies to: `emdash@1.2.0` (patch)  
Source: [#3744](https://github.com/emdash-cms/emdash/pull/3744)

Fixes plugins seeing an outdated site address in `ctx.site.url` and `ctx.url()`. They now use the same origin as links in emails: the configured `siteUrl`, `EMDASH_SITE_URL`, or `SITE_URL`, then the **Site URL** from **Settings > General**, then the address the site was set up on. Previously plugins only saw the setup address, even when `siteUrl` was configured or the site had moved to a new domain. A changed **Site URL** reaches plugins after the server restarts or, on Cloudflare Workers, as new isolates start.

### Change 92

Applies to: `emdash@1.2.0` (patch)  
Source: [#3931](https://github.com/emdash-cms/emdash/pull/3931)

Fixes `parseApiResponse` from `emdash/plugin-utils` rejecting with an error message that ends in a bare colon when a plugin route responds with an error page instead of an error message. The message is now the fallback message alone, without the HTTP status text, which browsers leave empty over HTTP/2 and HTTP/3.

### Change 93

Applies to: `emdash@1.2.0` (patch)  
Source: [#3574](https://github.com/emdash-cms/emdash/pull/3574)

Speeds up the first request on a fresh Cloudflare Worker isolate for sites on D1 or Durable Object SQLite: runtime startup now loads the stored plugin provider selections (such as the active comment moderator) with its other startup reads, saving one database round trip.

### Change 94

Applies to: `emdash@1.2.0` (patch)  
Source: [#3553](https://github.com/emdash-cms/emdash/pull/3553)

Stops the datetime normalization migration from printing an error-level `[datetime migration] 0 noncanonical values …` line on new sites and on upgrades with nothing to convert. When stored datetimes are rewritten, the migration still prints its report, now as an informational message.

### Change 95

Applies to: `emdash@1.2.0` (patch)  
Source: [#1899](https://github.com/emdash-cms/emdash/pull/1899)

Adds an optional `urlTemplate` prop to the `core:recent-posts` widget (e.g. `"/blog/:slug"` or `"/:slug"` for catch-all routes), using the same `:collection`, `:id`, `:slug`, and `:path` tokens as LiveSearch's `routeMap`, with a localized label in the admin widget form. Without a template the widget links exactly as before.

### Change 96

Applies to: `emdash@1.2.0` (patch)  
Source: [#3287](https://github.com/emdash-cms/emdash/pull/3287)

Fixes missing redirect hit counts and 404 log entries on Cloudflare Workers. The Worker could stop before these writes finished. It now stays alive until they complete, and a failed write is logged with a `[emdash:redirects]` prefix.

### Change 97

Applies to: `emdash@1.2.0` (patch)  
Source: [#3943](https://github.com/emdash-cms/emdash/pull/3943)

Fixes publishing and installing registry plugins attested by a GitHub Actions reusable workflow in the same repository and ref as its calling workflow. These releases previously failed with `PROVENANCE_UNVERIFIABLE` because the caller and signer were treated as the same workflow.

### Change 98

Applies to: `emdash@1.2.0` (patch)  
Source: [#3898](https://github.com/emdash-cms/emdash/pull/3898)

Fixes Astro route rules caching responses that belong to one visitor. With a cache provider such as `cacheCloudflare()`, a page rendered for a signed-in user (for example a comment form showing their name and email) could be stored and served to anonymous visitors, and a catch-all rule such as `/[...slug]` could store EmDash admin API responses or anonymous `401` responses and serve them to other users.
  
  Responses rendered for a signed-in user, and responses sent with `Cache-Control: private` or `no-store`, are no longer stored in the route cache. This includes EmDash API responses such as `/_emdash/api/search`, so route rules no longer cache them. A page requested by a signed-in user is filled into the cache by the next anonymous visitor instead.

### Change 99

Applies to: `emdash@1.2.0` (patch)  
Source: [#3559](https://github.com/emdash-cms/emdash/pull/3559)

Fixes Select All inside code blocks in the admin and inline visual editors so it selects only the code instead of the entire document.

### Change 100

Applies to: `emdash@1.2.0` (patch)  
Source: [#3861](https://github.com/emdash-cms/emdash/pull/3861)

Fixes every-minute cron ticks exceeding the Workers Free CPU limit on cold isolates by running system cleanup once per hour instead of on every tick. The scheduled-publish sweep, cron tasks, and heartbeat still run each minute; bookkeeping cleanups now run only on the top of the hour.

### Change 101

Applies to: `emdash@1.2.0` (patch)  
Source: [#3525](https://github.com/emdash-cms/emdash/pull/3525)

Fixes `emdash seed --no-content` applying the seed's content entries, bylines, and taxonomy terms anyway. The flag now skips them as documented, so combining it with `--on-conflict update` no longer overwrites existing entries.
  
  #### What should I do?
  
  If a script uses the undocumented `--noContent` spelling, switch it to `--no-content` or `--content=false`. `--noContent` was the only spelling that skipped content before this release. It is now ignored without an error, so the command applies the seed's content.

### Change 102

Applies to: `emdash@1.2.0` (patch)  
Source: [#3857](https://github.com/emdash-cms/emdash/pull/3857)

Warns when a seed file's `repeater` field has no `validation.subFields`, or declares its sub-fields under `fields` instead. Such a repeater previously seeded without any warning, and the admin then showed rows labelled "Item 1", "Item 2" with no inputs to edit. `emdash seed` prints the warning naming the field, and `validateSeed()` returns it in `warnings`; the seed still applies as before. The setup wizard does not display seed warnings.

### Change 103

Applies to: `emdash@1.2.0` (patch)  
Source: [#3672](https://github.com/emdash-cms/emdash/pull/3672)

Fixes seed validation accepting reserved collection and field slugs, such as a field named `version`. `emdash seed --validate` and the check that runs before a seed is applied now report the reserved slug, instead of the seed passing validation and then failing while it is applied.

### Change 104

Applies to: `emdash@1.2.0` (patch)  
Source: [#3578](https://github.com/emdash-cms/emdash/pull/3578)

Warns when `emdash seed` (including `--validate`) finds a widget that sets its options under `settings`. Seeding ignores that key; widget options belong in `props`.

### Change 105

Applies to: `emdash@1.2.0` (patch)  
Source: [#3754](https://github.com/emdash-cms/emdash/pull/3754)

Fixes the setup wizard staying on "Loading EmDash..." on sites whose Astro `security.csp` sets `scriptDirective.strictDynamic`. The setup page now gets the same Content-Security-Policy as the rest of the admin.

### Change 106

Applies to: `emdash@1.2.0` (patch)  
Source: [#3749](https://github.com/emdash-cms/emdash/pull/3749)

Fixes new sites created from a template keeping the template's site title and tagline instead of the ones entered in the setup wizard. Sites set up on 0.39.0 or later keep their stored values after upgrading; change them under Settings → General.

### Change 107

Applies to: `emdash@1.2.0` (patch)  
Source: [#3595](https://github.com/emdash-cms/emdash/pull/3595)

Fixes `/sitemap-{collection}.xml` returning 500 `<!-- EmDash not configured -->` for names that are not valid collection slugs, such as the `/sitemap-0.xml` that crawlers request. These now return 404.

### Change 108

Applies to: `emdash@1.2.0` (patch)  
Source: [#3750](https://github.com/emdash-cms/emdash/pull/3750)

Fixes blurry small images, such as avatars and icons, on high-density screens, and stops requesting high-density sizes larger than the original image.
  
  Media-provider images in `Image` from `emdash/ui`, Portable Text images, and galleries now get a `srcset` with the rendered width and, up to 1920 pixels, a high-density candidate: twice the rendered width, or the original width when that is smaller. Before, provider images narrower than 320 pixels had no `srcset` at all, and other provider images could list widths larger than the original. Provider images shown at their original size, as gallery images always are, now also offer that original width, even above 1920 pixels.
  
  `Image` applies the same high-density candidate to media URLs from another origin, such as a public R2 bucket.

### Change 109

Applies to: `emdash@1.2.0` (patch)  
Source: [#3889](https://github.com/emdash-cms/emdash/pull/3889)

Fixes assigning more than about 30 categories or tags to an entry on Cloudflare D1, and removing more than about 100 at once. These failed with `too many SQL variables`, whether from the admin, the content terms API, a plugin, or the WordPress import, which left such imported posts without any terms.

### Change 110

Applies to: `emdash@1.2.0` (patch)  
Source: [#3823](https://github.com/emdash-cms/emdash/pull/3823)

Fixes parameterized redirect patterns so URLs with a trailing slash match the same rule as URLs without one, consistent with exact and catch-all redirects.

### Change 111

Applies to: `emdash@1.2.0` (patch)  
Source: [#3771](https://github.com/emdash-cms/emdash/pull/3771)

Fixes the visual editing toolbar's Publish button switching to English after a save when the toolbar is shown in another language. The button now keeps its translated label, and the toolbar's status badges and image popover can be translated as well.

### Change 112

Applies to: `emdash@1.2.0` (patch)  
Source: [#3756](https://github.com/emdash-cms/emdash/pull/3756)

Fixes Publish in the visual editing toolbar publishing an older version when it is clicked while an inline Portable Text edit is still saving, which left that edit as unpublished changes. Publish now waits until every save on the page has finished.

### Change 113

Applies to: `emdash@1.2.0` (patch)  
Source: [#3894](https://github.com/emdash-cms/emdash/pull/3894)

Fixes the `WebMcpSearch` component's `search_site` tool so agents can tell a failed search from an empty one. An empty query, an HTTP error or a network failure now fails the tool call, where it previously reached the agent as a successful result. Results now arrive as a JSON array of `{ title, url, collection, excerpt }` objects, without a JSON-encoded string nested inside.

### Change 114

Applies to: `emdash@1.2.0` (patch)  
Source: [#3575](https://github.com/emdash-cms/emdash/pull/3575)

Updates `getWidgetAreas()` to return areas in creation order (previously unspecified), and removes a database round trip from logged-out page loads on Cloudflare D1.

### Change 115

Applies to: `emdash@1.2.0` (patch)  
Source: [#3896](https://github.com/emdash-cms/emdash/pull/3896)

Fixes WordPress imports leaving links to the old site's uploads in place outside image blocks. After the media import, these URLs now also point to the imported media: cover backgrounds, file blocks, self-hosted audio and video, links in text and tables (for example to a PDF), buttons, and images and links in raw HTML blocks. Content imported before this fix is not changed.

### Change 116

Applies to: `emdash@1.2.0` (patch)  
Source: [#3895](https://github.com/emdash-cms/emdash/pull/3895)

Fixes scheduled WordPress posts being imported as plain drafts. The WordPress export file (WXR) import and the WordPress plugin import in the admin now schedule them for their original publish date. Posts whose scheduled date has already passed are still imported as drafts. Posts imported before this fix are skipped on a re-import, so schedule them from the editor or delete and import them again.
  
  The WordPress plugin import also reads post dates as UTC now. On Node servers running in a time zone other than UTC, imported created and modified dates were shifted by the server's offset.

## Agent skills

The updater ran:

```sh
npx --yes skills@1.7.0 add emdash-cms/skills -y
```

Use the refreshed `upgrading-emdash` skill for this work order. If the skills command reported a conflict or failure, resolve that before continuing.

## Core database migrations

Installed EmDash changed from `1.1.0` to `1.3.0`.

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
