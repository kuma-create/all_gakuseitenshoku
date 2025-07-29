/**  Long‑term Internship Detail Page
 *   URL: /internships/[id]
 *   This page fetches the job record whose `selection_type` is "intern_long"
 *   and renders it with the dedicated <InternLongInfo> variant.
 *
 *   NOTE:
 *   - Requires the Supabase helpers `createClient` and the generated `Database` types.
 *   - <InternLongInfo> should already be exported from app/jobs/_variants.
 *   - If the record does not exist, we return 404 with next/navigation `notFound()`.
 */

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Database } from "@/lib/supabase/types";
import InternLongInfo from "@/app/jobs/[id]/_variants/InternLongInfo";

import type { Metadata } from "next";

/* ---------- SEO: dynamic metadata ---------- */
export async function generateMetadata(
  { params }: { params: { id: string } }
): Promise<Metadata> {
    const supabase = await createClient();

  const { data: job } = await supabase
    .from("jobs")
    .select(
      `
      title,
      description,
      companies(
        cover_image_url
      )
    `
    )
    .eq("id", params.id)
    .eq("selection_type", "intern_long")
    .maybeSingle();

  if (!job) {
    return {
      title: "長期インターン | 学生転職",
      description:
        "学生転職の長期インターン求人詳細ページです。最新の長期インターン情報をチェック！",
      robots: { index: false, follow: false },
    };
  }

  const title = `${job.title} | 長期インターン | 学生転職`;
  const description =
    job.description?.slice(0, 120).replace(/\n/g, " ") ??
    "学生転職の長期インターン求人詳細ページです。";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: job.companies?.cover_image_url ?? "/ogp/internships.png",
    },
    alternates: {
      canonical: `/internships/${params.id}`,
    },
  };
}
/* ---------- /SEO ---------- */

type Props = { params: { id: string } };

export default async function InternshipDetailPage({ params }: Props) {
    const supabase = await createClient();

  // Fetch the job (expecting a single long‑term internship record)
  const { data: job, error } = await supabase
    .from("jobs")
    .select(
      `
      *,
      companies(*),
      job_tags(tag)
    `
    )
    .eq("id", params.id)
    .eq("selection_type", "intern_long")
    .single();

  if (error || !job) {
    notFound();
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error InternLongInfo accepts more props; we provide only job here from the server side
  return <InternLongInfo job={job} />;
}