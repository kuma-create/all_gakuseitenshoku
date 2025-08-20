/* ───────────────────────────────────────────────
   app/jobs/[id]/page.tsx  ― 学生向け選考詳細 (Server)
   2025‑08‑08  SSR metadata 対応
──────────────────────────────────────────────── */

import type { Metadata } from "next";
import { headers } from "next/headers";
import ClientPage from "./ClientPage";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "";

async function getOrigin() {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto =
      h.get("x-forwarded-proto") ??
      (process.env.NODE_ENV === "development" ? "http" : "https");
    if (host) return `${proto}://${host}`;
  } catch {}
  return BASE_URL || "";
}

type Params = { id: string };

function selectionLabel(type?: string | null) {
  switch (type) {
    case "event": return "イベント";
    case "internship_short": return "短期インターン";
    case "internship_long":
    case "intern_long": return "長期インターン";
    case "fulltime":
    default: return "求人";
  }
}

/** App Router では next/head ではなく generateMetadata を使う */
export async function generateMetadata(
  { params }: { params: Params }
): Promise<Metadata> {
  const id = params.id;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  let title = `求人詳細 - 学生転職`;
  let description = "学生向け求人詳細ページ。";
  let ogImage: string | undefined;

  try {
    const url =
      `${supabaseUrl}/rest/v1/selections_view` +
      `?id=eq.${encodeURIComponent(id)}` +
      `&select=id,title,location,salary_range,selection_type,application_deadline,` +
      `company:companies(name,logo)`;

    const res = await fetch(url, {
      headers: { apikey: supabaseAnon, Authorization: `Bearer ${supabaseAnon}` },
      next: { revalidate: 60 },
    });

    if (res.ok) {
      const rows = await res.json();
      const row = Array.isArray(rows) ? rows[0] : null;
      if (row) {
        const label = selectionLabel(row.selection_type);
        const brand = "学生転職";
        const salary = row.salary_range ? String(row.salary_range) : "非公開";
        title = `${row?.company?.name ?? ""} | ${row.title}（${label}） - ${brand}`;
        description =
          `${row.title} の募集要項ページ。勤務地：${row.location ?? "未定"}、給与：${salary}。` +
          `締め切り：${row.application_deadline ?? "未定"}。${row?.company?.name ?? ""} の企業情報も掲載しています。`;
        ogImage = row?.company?.logo ?? undefined;
      }
    }
  } catch {
    /* 失敗時はフォールバックを使う */
  }

  const origin = await getOrigin();
  const canonical = origin ? `${origin}/jobs/${id}` : undefined;

  return {
    title,
    description,
    openGraph: {
      title, description, type: "website",
      url: canonical, images: ogImage ? [ogImage] : undefined,
    },
    alternates: canonical ? { canonical } : undefined,
  };
}

/* 本体はクライアントへ委譲 */
export default function Page({ params }: { params: Params }) {
  return <ClientPage id={params.id} />;
}