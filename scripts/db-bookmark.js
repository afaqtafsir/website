import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

async function main() {
	if (process.argv.length > 2) {
		throw new Error(
			"Usage: bun run db:bookmark (uses the top-level DB binding)",
		);
	}
	const config = Bun.JSONC.parse(
		await readFile(`${root}wrangler.jsonc`, "utf8"),
	);
	const database = config.d1_databases?.find((entry) => entry.binding === "DB");
	if (!database?.database_name || !database?.database_id) {
		throw new Error(
			"wrangler.jsonc must define a DB binding with a name and ID.",
		);
	}

	console.log(`Retrieving remote D1 bookmark for ${database.database_name}...`);
	const result = spawnSync(
		"bunx",
		[
			"--no-install",
			"wrangler",
			"d1",
			"time-travel",
			"info",
			"DB",
			"--config",
			"wrangler.jsonc",
			"--env",
			"",
			"--json",
		],
		{ cwd: root, encoding: "utf8", stdio: ["inherit", "pipe", "inherit"] },
	);
	if (result.error) throw result.error;
	if (result.status !== 0) {
		throw new Error("Wrangler failed; no bookmark record was saved.");
	}
	const { bookmark } = JSON.parse(result.stdout);
	if (
		typeof bookmark !== "string" ||
		!/^[a-fA-F0-9]+(?:-[a-fA-F0-9]+)+$/.test(bookmark)
	) {
		throw new Error(
			"Wrangler returned no valid bookmark; no record was saved.",
		);
	}

	const capturedAt = new Date().toISOString();
	const record = {
		capturedAt,
		databaseName: database.database_name,
		databaseId: database.database_id,
		bookmark,
		restoreCommand: `bunx wrangler d1 time-travel restore DB --config wrangler.jsonc --env '' --bookmark=${bookmark}`,
	};
	const directory = `${root}.local/backups/d1`;
	await mkdir(directory, { recursive: true });
	const filename = `${directory}/${capturedAt.replaceAll(":", "-")}.json`;
	// Never replace an earlier recovery record, even if timestamps collide.
	await writeFile(filename, `${JSON.stringify(record, null, 2)}\n`, {
		flag: "wx",
	});
	console.log(`Saved ${filename}`);
	console.log(
		"This records existing history; it does not extend Time Travel retention.",
	);
}

main().catch((error) => {
	console.error(`Bookmark capture failed: ${error.message}`);
	process.exitCode = 1;
});
