/* ───────────────────────────────────────────────
   app/jobs/[id]/page.tsx  ― 学生向け選考詳細
   2025‑05‑23  multi‑type (fulltime / internship / event) 対応
──────────────────────────────────────────────── */

"use client"
import React from "react";
import { use as usePromise, useState, useEffect, useCallback } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import {
  SkeletonBlock,
} from "@/components/ui/skeleton"

/* Supabase */
import { supabase } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/types"

/* 認証情報 */
import { useAuth } from "@/lib/auth-context"

/* dynamic import – heavy markdown description */
const JobDescription = dynamic(() => import("./JobDescription"), {
  loading: () => <SkeletonBlock h={300} />,
  ssr: false,
})

/* Variant UIs */
import { FulltimeInfo, InternInfo, EventInfo, InternLongInfo } from "./_variants"

import Head from "next/head";

/* ---------- 型 (簡略) ---------- */
type SelectionRow = Database["public"]["Views"]["selections_view"]["Row"]
type CompanyRow = {
  id: string
  name: string | null
  logo: string | null
  cover_image_url: string | null
  industry: string | null
  founded_year: number | null
  employee_count: number | null
  location: string | null
  website: string | null
  description: string | null
}
type SelectionWithCompany = SelectionRow & { company?: CompanyRow | null }

/* ---------- メイン ---------- */
export default function JobDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(props.params);           // unwrap the promise
  const { userType } = useAuth()
  const router        = useRouter()

  /* ---------- state ---------- */
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [job, setJob]           = useState<SelectionWithCompany | null>(null)
  const [company, setCompany]   = useState<CompanyRow | null>(null)
  const [tags, setTags]         = useState<string[]>([])
  const [related, setRelated]   = useState<SelectionRow[]>([])
  const [hasApplied, setHasApplied]     = useState(false)
  const [showForm, setShowForm]         = useState(false)

  /* ---------- 1 user / day view count ---------- */
  const trackView = useCallback(async (id: string) => {
    if (userType !== "student") return
    await supabase.rpc("increment_job_view", { _job_id: id })
  }, [userType])

  /* ---------- fetch ---------- */
  useEffect(() => {
    if (!id) return
    ;(async () => {
      try {
        setLoading(true)

        /* selection + company */
        const { data: selRows, error: selErr } = await supabase
          .from("selections_view")
          .select(`
            *,
            company:companies(
              id,
              name,
              logo,
              cover_image_url,
              industry,
              founded_year,
              employee_count,
              location,
              website,
              description
            ),
            internship:internship_details!job_id(*),
            intern_long_details!job_id(
              min_duration_months,
              work_days_per_week,
              remuneration_type,
              hourly_wage,
              commission_rate
            ),
            fulltime:fulltime_details!job_id(*),
            event:event_details!job_id(*)
          `)
          .eq("id", id)
          .limit(1)              // まず 1 件に絞る

        if (selErr) throw selErr
        if (!selRows || selRows.length === 0) {
          throw new Error("選考が見つかりませんでした")
        }

        const sel = selRows[0] as unknown as SelectionWithCompany

        /* tags */
        const { data: tagRows } = await supabase
          .from("job_tags")
          .select("tag")
          .eq("job_id", id)
        const tagList = tagRows?.map(t => t.tag) ?? []

        /* related */
        let rel: SelectionRow[] = []
        if (sel.company_id) {
          const { data: r } = await supabase
            .from("selections_view")
            .select(`id,title,location,salary_min,salary_max,selection_type,
                     company:companies(name,logo)`)
            .eq("company_id", sel.company_id)
            .neq("id", id)
            .limit(3)
          rel = (r ?? []) as unknown as SelectionRow[]
        }

        /* applied? – look up student_profile first */
        const { data:{ user } } = await supabase.auth.getUser()
        let appliedRow = null
        if (user) {
          const { data: profile } = await supabase
            .from("student_profiles")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle()

          const profileId = profile?.id
          if (profileId) {
            if (sel.selection_type === "event") {
              const { data: ep } = await supabase
                .from("event_participants")
                .select("id")
                .eq("event_id", id)
                .eq("student_id", profileId)
                .maybeSingle()
              appliedRow = ep
            } else {
              const { data: app } = await supabase
                .from("applications")
                .select("id")
                .eq("job_id", id)
                .eq("student_id", profileId)
                .maybeSingle()
              appliedRow = app
            }
          }
        }

        /* view count */
        trackView(id)

        /* set */
        setJob(sel)
        // cast sel.company to the extended CompanyRow shape
        const comp = sel.company as unknown as CompanyRow
        setCompany(comp ?? null)
        setTags(tagList)
        setRelated(rel)
        setHasApplied(Boolean(appliedRow))
      } catch (e:any) {
        console.error(e)
        setError(e.message ?? "取得に失敗しました")
      } finally {
        setLoading(false)
      }
    })()
  }, [id, trackView])

  /* ---------- apply ---------- */
  const handleApply = async () => {
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      if (!user) throw new Error("サインインが必要です");
      // --- resolve student profile id ---
      const { data: profile, error: profileErr } = await supabase
        .from("student_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profileErr) throw profileErr;
      if (!profile) throw new Error("学生プロフィールが見つかりません。アカウント設定からプロフィールを作成してください。");

      // Send application via backend API (handles insert + email)
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: id, student_id: profile.id }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || '応募に失敗しました');
      }
      setHasApplied(true);
      setShowForm(false);
    } catch (e:any) {
      alert(e.message ?? "応募に失敗しました")
    }
  }

  /* ---------- ui: loading / error ---------- */
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-red-500 mb-4" />
        読み込み中…
      </div>
    )
  }
  if (error || !job) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <Card className="max-w-md border-red-200 bg-red-50">
          <CardContent className="p-6 space-y-4 text-center">
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
            <p className="text-red-800 font-medium">
              {error ?? "選考が見つかりませんでした"}
            </p>
            <Button onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" /> 戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  /* ---------- SEO meta & variant render ---------- */
  // --- dynamic meta tags ---
  const metaTitle =
    job && company
      ? `${job.title} | ${company.name ?? "求人詳細"} - 学生転職`
      : "求人詳細 - 学生転職";
  const metaDescription =
    job && company
      ? `${company.name ?? ""}が募集する${
          job.selection_type === "event" ? "イベント" : "ポジション"
        }「${job.title}」の詳細ページです。勤務地：${
          job.location ?? "未定"
        }。給与：${job.salary_min ?? "非公開"}〜${
          job.salary_max ?? "非公開"
        }。`
      : "学生向け求人詳細ページ。";

  // --- choose variant component ---
  let Body: React.JSX.Element;
  switch (
    job.selection_type as
      | "fulltime"
      | "internship_short"
      | "internship_long"
      | "intern_long"
      | "event"
  ) {
    case "internship_short":
      Body = (
        <InternInfo
          job={job}
          company={company!}
          tags={tags}
          related={related}
          apply={handleApply}
          hasApplied={hasApplied}
          showForm={showForm}
          setShowForm={setShowForm}
        />
      );
      break;
    case "internship_long":
      Body = (
        <InternLongInfo
          job={job}
          company={company!}
          tags={tags}
          related={related}
          apply={handleApply}
          hasApplied={hasApplied}
          showForm={showForm}
          setShowForm={setShowForm}
        />
      );
      break;
    case "intern_long":
      Body = (
        <InternLongInfo
          job={job}
          company={company!}
          tags={tags}
          related={related}
          apply={handleApply}
          hasApplied={hasApplied}
          showForm={showForm}
          setShowForm={setShowForm}
        />
      );
      break;
    case "event":
      Body = (
        <EventInfo
          job={job}
          company={company!}
          tags={tags}
          related={related}
          apply={handleApply}
          hasApplied={hasApplied}
          showForm={showForm}
          setShowForm={setShowForm}
        />
      );
      break;
    default:
      Body = (
        <FulltimeInfo
          job={job}
          company={company!}
          tags={tags}
          related={related}
          apply={handleApply}
          hasApplied={hasApplied}
          showForm={showForm}
          setShowForm={setShowForm}
        />
      );
  }

  // --- final render with SEO meta ---
  return (
    <>
      <Head>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        {company?.logo && <meta property="og:image" content={company.logo} />}
        <meta property="og:type" content="website" />
        <meta
          property="og:url"
          content={`${process.env.NEXT_PUBLIC_BASE_URL}/jobs/${id}`}
        />
        <link
          rel="canonical"
          href={`${process.env.NEXT_PUBLIC_BASE_URL}/jobs/${id}`}
        />
      </Head>
      {Body}
    </>
  );
}
