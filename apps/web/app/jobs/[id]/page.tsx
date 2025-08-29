/* ───────────────────────────────────────────────
   app/jobs/[id]/page.tsx  ― 学生向け選考詳細 (Server)
   2025‑08‑08  SSR metadata 対応
──────────────────────────────────────────────── */

import type { Metadata } from "next";
import { headers } from "next/headers";
import ClientPage from "./ClientPage";
import Link from "next/link";
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

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
  const cookieStore = cookies();
  const supa = createServerComponentClient({ cookies: () => cookieStore });
  const { data: { session } } = await supa.auth.getSession();
  const isLoggedIn = !!session;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  let title = `求人詳細 - 学生転職`;
  let description = "学生向け求人詳細ページ。";
  let ogImage: string | undefined;

  try {
    const url =
      `${supabaseUrl}/rest/v1/selections_view` +
      `?id=eq.${encodeURIComponent(id)}` +
      `&select=id,title,location,salary_range,selection_type,application_deadline,cover_image_url,member_only,company:companies(name,logo,cover_image_url)`;

    const res = await fetch(url, {
      headers: { apikey: supabaseAnon, Authorization: `Bearer ${supabaseAnon}` },
      next: { revalidate: 60 },
    });

    if (res.ok) {
      const rows = await res.json();
      const row = Array.isArray(rows) ? rows[0] : null;
      // Determine member_only robustly (selections_view may not include it)
      let memberOnlyFlag: boolean = !!row?.member_only;
      if (row && !("member_only" in row) ) {
        try {
          const resJob = await fetch(
            `${supabaseUrl}/rest/v1/jobs?id=eq.${encodeURIComponent(id)}&select=member_only`,
            { headers: { apikey: supabaseAnon, Authorization: `Bearer ${supabaseAnon}` }, next: { revalidate: 60 } }
          );
          if (resJob.ok) {
            const js = await resJob.json();
            if (Array.isArray(js) && js[0] && typeof js[0].member_only !== "undefined") {
              memberOnlyFlag = !!js[0].member_only;
            }
          }
        } catch {}
      }
      const shouldMask = memberOnlyFlag && !isLoggedIn;
      if (row) {
        const label = selectionLabel(row.selection_type);
        const brand = "学生転職";
        const salary = row.salary_range ? String(row.salary_range) : "非公開";
        if (shouldMask) {
          title = `${row.title}（${label}・限定公開） - ${brand}`;
          description = `${row.title} の募集要項ページ（限定公開）。企業名・企業画像・勤務地はログイン後に表示されます。`;
          ogImage = undefined; // 画像は出さない
        } else {
          title = `${row?.company?.name ?? ""} | ${row.title}（${label}） - ${brand}`;
          description =
            `${row.title} の募集要項ページ。勤務地：${row.location ?? "未定"}、給与：${salary}。` +
            `締め切り：${row.application_deadline ?? "未定"}。${row?.company?.name ?? ""} の企業情報も掲載しています。`;
          ogImage = row?.cover_image_url ?? row?.company?.cover_image_url ?? row?.company?.logo ?? undefined;
        }
      }
    }
  } catch {
    /* 失敗時はフォールバックを使う */
  }

  const origin = await getOrigin();
  const canonical = origin ? `${origin}/jobs/${id}` : undefined;
  const ogImageAbs = ogImage
    ? (ogImage.startsWith("http") ? ogImage : (origin ? `${origin}${ogImage}` : ogImage))
    : undefined;

  return {
    title,
    description,
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      type: "article",
      url: canonical,
      siteName: "学生転職",
      locale: "ja_JP",
      images: ogImageAbs ? [ogImageAbs] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImageAbs ? [ogImageAbs] : undefined,
    },
    alternates: canonical ? { canonical } : undefined,
  };
}

export default async function Page({ params }: { params: Params }) {
  // ここで軽量にタイトル等だけを再取得（構造化データ用）。
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const cookieStore = cookies();
  const supa = createServerComponentClient({ cookies: () => cookieStore });
  const { data: { session } } = await supa.auth.getSession();
  const isLoggedIn = !!session;
  const id = params.id;
  let jp: any = null;
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/selections_view?id=eq.${encodeURIComponent(id)}&select=id,title,description,selection_type,application_deadline,location,salary_range,cover_image_url,member_only,company:companies(name,cover_image_url,logo)`,
      { headers: { apikey: supabaseAnon, Authorization: `Bearer ${supabaseAnon}` }, next: { revalidate: 60 } }
    );
    if (res.ok) {
      const rows = await res.json();
      jp = Array.isArray(rows) ? rows[0] : null;
    }
  } catch {}

  // Determine member_only robustly using jobs table as fallback
  let memberOnlyFlag: boolean = !!jp?.member_only;
  if (jp && !("member_only" in jp)) {
    try {
      const resJob = await fetch(
        `${supabaseUrl}/rest/v1/jobs?id=eq.${encodeURIComponent(id)}&select=member_only`,
        { headers: { apikey: supabaseAnon, Authorization: `Bearer ${supabaseAnon}` }, next: { revalidate: 60 } }
      );
      if (resJob.ok) {
        const js = await resJob.json();
        if (Array.isArray(js) && js[0] && typeof js[0].member_only !== "undefined") {
          memberOnlyFlag = !!js[0].member_only;
        }
      }
    } catch {}
  }
  const shouldMask = memberOnlyFlag && !isLoggedIn;

  const jsonLd = jp
    ? {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        title: jp.title,
        description: shouldMask
          ? `${jp.title} の募集要項（限定公開）。企業名や勤務地などの詳細はログイン後に表示されます。`
          : (jp.description ?? `${jp.title} の募集要項です。`),
        hiringOrganization: !shouldMask && jp?.company?.name
          ? { "@type": "Organization", name: jp.company.name }
          : undefined,
        datePosted: undefined,
        validThrough: jp.application_deadline || undefined,
        employmentType: selectionLabel(jp.selection_type),
        jobLocation: !shouldMask && jp.location
          ? { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: jp.location } }
          : undefined,
        baseSalary: jp.salary_range && !shouldMask
          ? { "@type": "MonetaryAmount", value: String(jp.salary_range) }
          : undefined,
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {shouldMask ? (
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-bold mb-2">{jp?.title ?? "求人詳細"}</h1>
            <p className="text-sm text-gray-600 mb-4">この求人は<strong>限定公開</strong>です。企業名・企業ロゴ・求人画像・勤務地などの詳細は、ログイン後に表示されます。</p>
            <div className="mt-6 flex items-center gap-3">
              <Link href="/login" className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50">ログイン</Link>
              <Link href="/signup" className="inline-flex items-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90">無料登録</Link>
            </div>
          </div>
        </div>
      ) : (
        <ClientPage id={params.id} />
      )}
    </>
  );
}