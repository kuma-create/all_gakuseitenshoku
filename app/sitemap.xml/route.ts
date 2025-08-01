// app/sitemap.xml/route.ts
import { supabase } from "@/lib/supabase/server";
import { formatISO } from "date-fns";

/**
 * Absolute base URL for your site (defaults to https://gakuten.co.jp).
 * Override by setting NEXT_PUBLIC_SITE_URL when running on preview/other domains.
 */
const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://gakuten.co.jp";

type StaticRoute = { path: string; changefreq?: string; priority?: string };

export async function GET() {
  /* ---------- 1. Static URLs ---------- */
  const staticPages: StaticRoute[] = [
    { path: "/", changefreq: "daily", priority: "1.0" },
    { path: "/media", changefreq: "daily", priority: "0.8" },
    { path: "/internships", changefreq: "daily", priority: "0.8" },
    { path: "/jobs", changefreq: "daily", priority: "0.8" },
  ];

  /* ---------- 2. Dynamic URLs ---------- */
  // NOTE: Adjust table & column names to your schema if they differ.
  const [{ data: jobs }, { data: media }, { data: internships }] =
    await Promise.all([
      supabase
        .from("jobs")
        .select("id, updated_at")
        .eq("published", true)
        .order("updated_at", { ascending: false })
        .limit(1000),
      supabase
        .from("media_posts")
        .select("slug, updated_at")
        .eq("status", "published")
        .order("updated_at", { ascending: false })
        .limit(1000),
      supabase
        .from("intern_jobs")
        .select("id, updated_at")
        .eq("published", true)
        .order("updated_at", { ascending: false })
        .limit(1000),
    ]);

  const urlFragments: string[] = [];

  // Static pages
  for (const p of staticPages) {
    urlFragments.push(`<url>
  <loc>${BASE_URL}${p.path}</loc>
  ${p.changefreq ? `<changefreq>${p.changefreq}</changefreq>` : ""}
  ${p.priority ? `<priority>${p.priority}</priority>` : ""}
</url>`);
  }

  // Jobs
  jobs?.forEach((j) =>
    urlFragments.push(`<url>
  <loc>${BASE_URL}/jobs/${j.id}</loc>
  <lastmod>${formatISO(new Date(j.updated_at))}</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.8</priority>
</url>`),
  );

  // Media articles
  media?.forEach((m) =>
    urlFragments.push(`<url>
  <loc>${BASE_URL}/media/${m.slug}</loc>
  <lastmod>${formatISO(new Date(m.updated_at))}</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.7</priority>
</url>`),
  );

  // Internships
  internships?.forEach((i) =>
    urlFragments.push(`<url>
  <loc>${BASE_URL}/internships/${i.id}</loc>
  <lastmod>${formatISO(new Date(i.updated_at))}</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.7</priority>
</url>`),
  );

  /* ---------- 3. Build XML ---------- */
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlFragments.join("\n")}
</urlset>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // Edge cache for 1 hour, then stale-while‑revalidate
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=59",
    },
  });
}
