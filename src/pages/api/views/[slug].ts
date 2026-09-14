import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

export const POST: APIRoute = async ({ params }) => {
	const slug = params.slug;
	if (!slug) {
		return new Response(JSON.stringify({ error: "Missing article slug" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	try {
		if (env?.DB) {
			await env.DB.prepare(`
				INSERT INTO article_views (slug, views, updated_at)
				VALUES (?1, 1, datetime('now'))
				ON CONFLICT(slug) DO UPDATE SET
					views = views + 1,
					updated_at = datetime('now');
			`)
				.bind(slug)
				.run();
		}
		return new Response(null, { status: 204 });
	} catch (err) {
		console.error("[analytics] Failed to increment view count for", slug, err);
		return new Response(null, { status: 500 });
	}
};

export const GET: APIRoute = async ({ params }) => {
	const slug = params.slug;
	if (!slug) {
		return new Response(JSON.stringify({ error: "Missing article slug" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	try {
		if (env?.DB) {
			const row = await env.DB.prepare(
				"SELECT views, updated_at FROM article_views WHERE slug = ?1",
			)
				.bind(slug)
				.first<{ views: number; updated_at: string }>();

			return new Response(
				JSON.stringify({
					slug,
					views: row?.views ?? 0,
					updatedAt: row?.updated_at ?? null,
				}),
				{
					status: 200,
					headers: {
						"Content-Type": "application/json",
						"Cache-Control": "public, max-age=60",
					},
				},
			);
		}

		return new Response(JSON.stringify({ slug, views: 0, updatedAt: null }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (err) {
		console.error("[analytics] Failed to retrieve view count for", slug, err);
		return new Response(JSON.stringify({ slug, views: 0, updatedAt: null }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	}
};
