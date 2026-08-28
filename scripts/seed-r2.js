import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

const isRemote = process.argv.includes("--remote");
const targetFlag = isRemote ? "--remote" : "--local";

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
	{
		storage_key: "01M13B179KT22CZDYC6GCB7YN1.jpg",
		filename: "manuskrip-tafsir-nusantara.jpg",
		url: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=1200&h=675&fit=crop",
	},
	{
		storage_key: "01M13B17C9MYAYE91J0S6HEE2H.jpg",
		filename: "hermeneutika-gender-kontemporer.jpg",
		url: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1200&h=675&fit=crop",
	},
	{
		storage_key: "01M13B18J3JV283FT16R55DNS4.jpg",
		filename: "balaghah-iltifat-alkautsar.jpg",
		url: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=1200&h=675&fit=crop",
	},
	{
		storage_key: "01M13B18PEEY70SEDR0FQ068X1.jpg",
		filename: "epistemologi-maqashid-quran.jpg",
		url: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1200&h=675&fit=crop",
	},
	{
		storage_key: "01M13B18Z3M7DMDAW3YX15V82E.jpg",
		filename: "ekologi-tafsir-lingkungan.jpg",
		url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1200&h=675&fit=crop",
	},
	{
		storage_key: "01M13B193MD77XB90235WVYMB4.jpg",
		filename: "resensi-buku-nasr-hamid.jpg",
		url: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=1200&h=675&fit=crop",
	},
	{
		storage_key: "01M13B1986ZMEB45V41F90KXX0.jpg",
		filename: "siyasah-syura-demokrasi.jpg",
		url: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=1200&h=675&fit=crop",
	},
	{
		storage_key: "01M13B19H3YZYSXWA3Y3VZQM2S.jpg",
		filename: "tasawuf-surah-annur.jpg",
		url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&h=675&fit=crop",
	},
];

const tmpDir = "/tmp/afaq_seed_images";
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

async function run() {
	console.log(`\nStarting R2 Seed Upload (Target: ${isRemote ? "PRODUCTION CLOUDFLARE R2" : "LOCAL MINIFLARE R2"})...`);

	for (const item of MEDIA_SEEDS) {
		const filePath = path.join(tmpDir, item.filename);

		if (!fs.existsSync(filePath)) {
			console.log(`Fetching ${item.filename} from Unsplash...`);
			const res = await fetch(item.url);
			if (!res.ok) {
				console.error(`❌ Failed to fetch ${item.url} (status: ${res.status})`);
				continue;
			}
			const buffer = Buffer.from(await res.arrayBuffer());
			fs.writeFileSync(filePath, buffer);
		}

		console.log(`Uploading ${item.filename} -> R2 key: ${item.storage_key} (${targetFlag})...`);
		const r2Path = `afaqtafsir-website/${item.storage_key}`;
		const proc = spawnSync(
			"bunx",
			[
				"wrangler",
				"r2",
				"object",
				"put",
				r2Path,
				targetFlag,
				"--file",
				filePath,
				"--content-type",
				"image/jpeg",
			],
			{ stdio: "inherit" }
		);

		if (proc.status !== 0) {
			console.error(`❌ Upload failed for ${item.storage_key}`);
		} else {
			console.log(`✓ Uploaded ${item.storage_key}`);
		}
	}

	console.log(`\n✓ All seed media uploaded to ${isRemote ? "Production R2" : "Local R2"} successfully!\n`);
}

run();
