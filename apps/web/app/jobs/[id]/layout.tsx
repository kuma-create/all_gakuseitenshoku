/* ───────────────────────────────────────────────
   dynamic meta 付きレイアウト ― 学生向け選考詳細
──────────────────────────────────────────────── */

import type { Metadata } from "next"
import { supabase } from "@/lib/supabase/client"

/** ① 動的メタデータ */
export async function generateMetadata(
  { params }: { params: { id: string } }
): Promise<Metadata> {
  const { id } = params

  /** 必要最小限だけ取得 (title / company) */
  const { data: sel } = await supabase
    .from("selections_view")
    .select(
      "title, location, salary_min, salary_max, selection_type, company:companies(name,logo)"
    )
    .eq("id", id)
    .single()

  if (!sel) {
    return { title: "求人詳細 | 学生転職" }
  }

  const {
    title,
    selection_type,
    location,
    salary_min,
    salary_max,
    company,
  } = sel as any

  const metaTitle = `${title} | ${company?.name ?? "求人詳細"} - 学生転職`
  const metaDescription = `${
    company?.name ?? ""
  }が募集する${
    selection_type === "event" ? "イベント" : "ポジション"
  }「${title}」の詳細ページです。勤務地：${
    location ?? "未定"
  }。給与：${salary_min ?? "非公開"}〜${salary_max ?? "非公開"}。`

  return {
    title: metaTitle,
    description: metaDescription,
    openGraph: {
      title: metaTitle,
      description: metaDescription,
      images: company?.logo ? [{ url: company.logo }] : [],
      type: "website",
      url: `/jobs/${id}`,
    },
    alternates: {
      canonical: `/jobs/${id}`,
    },
    robots: { index: true, follow: true },
  }
}

/** ② children をそのまま描画 (UI は page.tsx 側が担当) */
export default function JobDetailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}