# Media Storage & Cloudflare R2 Seeding Architecture

- **Date:** August 28, 2026
- **Status:** Documented & Verified
- **Scope:** EmDash CMS Media Subsystem, Cloudflare R2 (`MEDIA` binding), Local Miniflare R2 Storage, D1 Metadata Synchronization, Offline Seeding.

---

## 1. Overview: Dual-Layer Media Architecture

In an EmDash CMS project running on Cloudflare Workers, media management is decoupled across two distinct systems:

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Request                         │
│       GET /_emdash/api/media/file/[storage_key].jpg         │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     EmDash Media Router                     │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
               ▼                               ▼
┌─────────────────────────────┐ ┌─────────────────────────────┐
│      Cloudflare D1          │ │       Cloudflare R2         │
│  (Structured Metadata)      │ │   (Binary Object Store)     │
│                             │ │                             │
│ - media table               │ │ - Bucket: afaqtafsir-website│
│ - id, filename, mime_type   │ │ - Key: [storage_key].jpg    │
│ - width, height, alt        │ │ - Binary image bytes        │
│ - storage_key reference     │ │                             │
└─────────────────────────────┘ └─────────────────────────────┘
```

1. **D1 SQL Database (`DB` binding):**
   - Stores rich metadata in the `media` table: `id`, `filename`, `mime_type`, `width`, `height`, `alt`, and `storage_key`.
   - Embeds lightweight JSON references inside collection tables (e.g., `featured_image` in `ec_articles`).

2. **Cloudflare R2 Bucket (`MEDIA` binding):**
   - Stores raw binary object streams (JPEGs, PNGs, WebPs) keyed by their unique `storage_key` (e.g., `01M13B173KRFM2FNBPG7N55XM9.jpg`).
   - Serves objects directly to the browser with long-term immutable caching headers:
     `cache-control: public, max-age=31536000, immutable`.

---

## 2. The Offline Seeding Caveat ("Media Not Found")

### Why Offline Seeding Creates a Desync:
When populating initial demo or production seed content via the EmDash CLI:

```bash
bunx emdash seed seed/seed.json -d .wrangler/state/v3/d1/.../database.sqlite
```

1. The `-d` flag directs the CLI to operate **directly on the SQLite file** without a running web server or worker daemon.
2. The CLI reads `$media` entries from `seed.json`, downloads the source images, extracts metadata, and writes records into the `media` and `ec_articles` SQL tables.
3. **However**, because Cloudflare's native `workerd` process is not running, the offline CLI **has no access to the `MEDIA` R2 bucket binding**.
4. **The Result:**
   - D1 contains all the metadata for the images.
   - The local R2 bucket remains empty (`_mf_objects` table is empty).
   - Visiting any page displays **"Media Not Found"** because `GET /_emdash/api/media/file/[storage_key]` queries R2 and receives a 404.

---

## 3. Populating Local R2 Objects via Wrangler CLI

Wrangler provides native support for uploading objects directly into the local Miniflare R2 store via the `--local` flag:

```bash
bunx wrangler r2 object put <bucket-name>/<storage-key> --local --file <path-to-file> --content-type <mime-type>
```

### Example:
```bash
bunx wrangler r2 object put afaqtafsir-website/01M13B173KRFM2FNBPG7N55XM9.jpg \
  --local \
  --file /tmp/images/hawa-penciptaan-tafsir.jpg \
  --content-type image/jpeg
```

---

## 4. Automated Seed Upload Script

To automate uploading all seed media into local R2, use a Node/Bun script that matches `seed.json` `$media` definitions to the generated `storage_key` values in the D1 `media` table:

```javascript
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

const MEDIA_SEEDS = [
	{
		storage_key: "01M13B173KRFM2FNBPG7N55XM9.jpg",
		filename: "hawa-penciptaan-tafsir.jpg",
		url: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=1200&h=675&fit=crop",
	},
	{
		storage_key: "01M13B1776D32SW7NKJMYN90YD.jpg",
		filename: "kosmologi-ratqan-fataqnah.jpg",
		url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=675&fit=crop",
	},
	// ... additional media items
];

const tmpDir = "/tmp/afaq_seed_images";
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

async function seedLocalR2() {
	console.log(`Syncing ${MEDIA_SEEDS.length} media items to local R2...`);

	for (const item of MEDIA_SEEDS) {
		const filePath = path.join(tmpDir, item.filename);
		
		// 1. Fetch image bytes if not cached locally
		if (!fs.existsSync(filePath)) {
			const res = await fetch(item.url);
			if (!res.ok) throw new Error(`Failed to fetch ${item.url}`);
			fs.writeFileSync(filePath, Buffer.from(await res.arrayBuffer()));
		}

		// 2. Put into local Miniflare R2 bucket
		const r2Target = `afaqtafsir-website/${item.storage_key}`;
		const proc = spawnSync("bunx", [
			"wrangler",
			"r2",
			"object",
			"put",
			r2Target,
			"--local",
			"--file",
			filePath,
			"--content-type",
			"image/jpeg",
		], { stdio: "inherit" });

		if (proc.status === 0) {
			console.log(`✓ Uploaded ${item.storage_key}`);
		}
	}
}

seedLocalR2();
```

---

## 5. Verification & Health Check

### 1. Verify Object in Local R2 via CLI:
```bash
bunx wrangler r2 object get afaqtafsir-website/01M13B173KRFM2FNBPG7N55XM9.jpg --local
```

Expected Output:
```text
Resource location: local 
Downloading "01M13B173KRFM2FNBPG7N55XM9.jpg" from "afaqtafsir-website".
Download complete.
```

### 2. Verify Object Serving via HTTP Endpoint:
```bash
curl -I http://localhost:4321/_emdash/api/media/file/01M13B173KRFM2FNBPG7N55XM9.jpg
```

Expected Headers:
```http
HTTP/1.1 200 OK
content-type: image/jpeg
content-length: 87926
cache-control: public, max-age=31536000, immutable
content-disposition: inline
```

---

## 6. Production Deployment Notes

When deploying to production Cloudflare Workers:
1. Running `bunx emdash seed` with API credentials (`--url https://...`) or running migrations through the runtime will execute inside the worker environment where the live `env.MEDIA` binding is active.
2. Direct image uploads in the EmDash Admin UI (`/_emdash/admin/media`) automatically stream files directly into R2 and insert the matching records into D1 in a single transaction.
