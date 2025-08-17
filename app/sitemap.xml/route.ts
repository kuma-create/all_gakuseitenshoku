// app/sitemap.xml/route.ts
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { formatISO } from "date-fns";

// Note: updated_at may be null for some Job records.
type JobLite = {
  id: string;
  updated_at: string | null;
  created_at: string | null;
};

type MediaLite = {
  slug: string;
  updated_at: string | null;
  created_at: string | null;
};

/**
 * Absolute base URL for your site (defaults to https://gakuten.co.jp).
 * Override by setting NEXT_PUBLIC_SITE_URL when running on preview/other domains.
 */
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gakuten.co.jp";
const MAX_URLS = 50000; // 1‑file limit per sitemap spec
const BUILD_TIME = formatISO(new Date());

type StaticRoute = { path: string; changefreq?: string; priority?: string; lastmod?: string };

// このルートは動的にレンダリングする
export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // Edge で動かす場合は "edge"

export async function GET() {
    const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY! // service_role key
  );
  /* ---------- 1. Static URLs ---------- */
  const staticPages: StaticRoute[] = [
    { path: "/", changefreq: "daily", priority: "1.0", lastmod: BUILD_TIME },
    { path: "/media", changefreq: "daily", priority: "0.8", lastmod: BUILD_TIME },
    { path: "/internships", changefreq: "daily", priority: "0.8", lastmod: BUILD_TIME },
    { path: "/jobs", changefreq: "daily", priority: "0.8", lastmod: BUILD_TIME },
    { path: "/ipo", changefreq: "weekly", priority: "0.9", lastmod: BUILD_TIME },
  ];

  /* ---------- 2. Dynamic URLs ---------- */
  const [{ data: jobs }, { data: media }] =
    await Promise.all([
      supabase
        .from("jobs")
        .select("id, created_at")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(MAX_URLS)
        .returns<JobLite[]>(),

      supabase
        .from("media_posts")
        .select("slug, updated_at, created_at")
        .eq("status", "published")
        .order("updated_at", { ascending: false })
        .limit(MAX_URLS)
        .returns<MediaLite[]>(),
    ]);

  // --- DEBUG: report how many URLs we are about to emit ---
  const countsComment = `<!-- sitemap counts: static=${staticPages.length} jobs=${
    jobs?.length ?? 0
  } media=${media?.length ?? 0} -->`;

  const urlFragments: string[] = [];

  // Helper for lastmod
  const toLastMod = (u: string | null, c: string | null) =>
    formatISO(new Date(u ?? c ?? BUILD_TIME));

  // Static pages
  for (const p of staticPages) {
    urlFragments.push(`<url>
  <loc>${BASE_URL}${p.path}</loc>
  ${p.lastmod ? `<lastmod>${p.lastmod}</lastmod>` : ""}
  ${p.changefreq ? `<changefreq>${p.changefreq}</changefreq>` : ""}
  ${p.priority ? `<priority>${p.priority}</priority>` : ""}
</url>`);
  }

  // Jobs
  (jobs ?? []).forEach((j) =>
    urlFragments.push(`<url>
  <loc>${BASE_URL}/jobs/${j.id}</loc>
  <lastmod>${toLastMod(j.updated_at, j.created_at)}</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.8</priority>
</url>`),
  );

  // Media articles
  (media ?? []).forEach((m) =>
    urlFragments.push(`<url>
  <loc>${BASE_URL}/media/${m.slug}</loc>
  <lastmod>${toLastMod(m.updated_at, m.created_at)}</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.7</priority>
</url>`),
  );

  /* ---------- 3. Build XML ---------- */
  const body = `<?xml version="1.0" encoding="UTF-8"?>
${countsComment}
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlFragments.join("\n")}
</urlset>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // Edge cache for 1 hour, then stale-while‑revalidate
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=59",
    },
  });
}
