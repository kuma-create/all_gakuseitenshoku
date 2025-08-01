// app/sitemap.xml/route.ts
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { formatISO } from "date-fns";

type JobLite = {
  id: string;
  updated_at: string | null;
};

// このルートは動的にレンダリングする
export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // Edge で動かす場合は "edge"

export async function GET() {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY! // service_role key
  );
  /* ---- 必要な URL を収集（例：最新 500 件） ---- */
  const { data, error } = await supabase
    .from("jobs")
    .select("id, updated_at")
    .eq("published", true)
    .order("updated_at", { ascending: false })
    .limit(500)
    .returns<JobLite[]>(); // ← 型を JobLite[] に固定

  if (error) {
    console.error("Supabase error:", error);
    return new Response("Server error", { status: 500 });
  }

  const jobs = (data ?? []) as JobLite[];

  /* ---- XML 生成 ---- */
  const urls = jobs
    .map(
      (j) => `<url>
  <loc>https://culture.gakuten.co.jp/jobs/${j.id}</loc>
  <lastmod>${formatISO(new Date(j.updated_at as string))}</lastmod>
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