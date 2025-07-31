// app/sitemap.xml/route.ts
import { supabase } from "@/lib/supabase/server"; // ここはサーバ用クライアント
import { formatISO } from "date-fns";

export async function GET() {
  /* ---- 必要な URL を収集（例：最新 500 件） ---- */
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, updated_at")
    .eq("published", true)
    .order("updated_at", { ascending: false })
    .limit(500);

  /* ---- XML 生成 ---- */
  const urls = jobs
    ?.map(
      (j) => `<url>
  <loc>https://culture.gakuten.co.jp/jobs/${j.id}</loc>
  <lastmod>${formatISO(new Date(j.updated_at))}</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.8</priority>
</url>`,
    )
    .join("");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url> <!-- Top page -->
    <loc>https://culture.gakuten.co.jp/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  ${urls ?? ""}
</urlset>`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml" },
  });
}