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
type SelectionWithCompany = SelectionRow & {
  company?: CompanyRow | null
  /** raw nested relation rows pulled from Supabase */
  requirements?: { requirement: string }[]
  skills?: { skill: string }[]
  work_hours?: { hours: string | null }[]
  benefits?: { benefit: string }[]
  /** flattened arrays for easy consumption by variant UIs */
  requirementsList?: string[]
  skillsList?: string[]
  workHoursList?: (string | null)[]
  benefitsList?: string[]
  salary_range?: string | null
}

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
            id,
            title,
            description,
            requirements,
            location,
            work_type,
            salary_range,
            selection_type,
            created_at,
            company_id,
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
            internship:internship_details!job_id(
              start_date,
              end_date,
              work_days_per_week
            ),
            intern_long:intern_long_details!job_id(
              min_duration_months,
              work_days_per_week,
              hourly_wage,
              travel_expense,
              nearest_station,
              benefits
            ),
            fulltime:fulltime_details!job_id(
              working_days,
              working_hours, 
              benefits
            ),
            event:event_details!job_id(
              event_date,
              capacity,
              venue,
              format,
              is_online
            )
          `)
          .eq("id", id)
          .limit(1)              // まず 1 件に絞る

        if (selErr) {
          // expose Supabase error details for easier debugging
          console.error("[selections_view] Supabase error:", {
            message: selErr.message,
            details: selErr.details,
            hint: selErr.hint,
            code: selErr.code,
          });
          throw new Error(selErr.message || selErr.details || "取得に失敗しました");
        }
        if (!selRows || selRows.length === 0) {
          throw new Error("選考が見つかりませんでした")
        }

        const sel = selRows[0] as unknown as SelectionWithCompany

        /* ---- fetch requirements / skills / hours / benefits ---- */
        const [
          { data: reqRows,  error: reqErr },
          { data: sklRows,  error: sklErr },
          { data: hrsRows,  error: hrsErr },
          { data: benRows,  error: benErr },
        ] = await Promise.all([
          // @ts-expect-error job_requirements not in generated types yet
          supabase.from("job_requirements").select("requirement").eq("job_id", id),
          // @ts-expect-error job_skills not in generated types yet
          supabase.from("job_skills").select("skill").eq("job_id", id),
          // @ts-expect-error job_work_hours not in generated types yet
          supabase.from("job_work_hours").select("hours").eq("job_id", id),
          // @ts-expect-error job_benefits not in generated types yet
          supabase.from("job_benefits").select("benefit").eq("job_id", id),
        ]);

        if (reqErr || sklErr || hrsErr || benErr) {
          console.warn("detail fetch error", reqErr, sklErr, hrsErr, benErr);
        }

        const requirementsList =
          Array.isArray(reqRows) ? reqRows.map((r: any) => (r as any).requirement) : [];
        const skillsList =
          Array.isArray(sklRows) ? sklRows.map((s: any) => (s as any).skill) : [];
        const workHoursList =
          Array.isArray(hrsRows) ? hrsRows.map((h: any) => (h as any).hours) : [];
        const benefitsList =
          Array.isArray(benRows) ? benRows.map((b: any) => (b as any).benefit) : [];

        /* attach flattened arrays */
        (sel as any).requirementsList = requirementsList;
        /* ---- fallback: use jobs.requirements text column ---- */
        const rawReq = (sel as any).requirements;
        if (
          (!(sel as any).requirementsList ||
            (sel as any).requirementsList.length === 0) &&
          typeof rawReq === "string"
        ) {
          const clean = rawReq.trim();
          if (clean !== "") {
            const tokens = clean
              .split(/\r?\n|・|,/)
              .map((t: string) => t.trim())
              .filter(Boolean);
            (sel as any).requirementsList = tokens;
          }
        }

        /* ---- fallback: work hours & benefits from joined / nested columns ---- */

        // --- Work Hours ---
        // Merge explicit hours (job_work_hours & working_hours) with days‑per‑week information
        let combinedWH: (string | null)[] = [...workHoursList];

        // 1) working_hours columns (exact time range)
        const explicitHours =
          (sel as any).fulltime?.working_hours ??
          (sel as any).intern_long?.working_hours ??
          (sel as any).internship?.working_hours; // in case you add later

        if (explicitHours && String(explicitHours).trim() !== "") {
          combinedWH.push(String(explicitHours).trim());
        }

        // 2) days‑per‑week columns
        const dPerWeek =
          (sel as any).internship?.work_days_per_week ??
          (sel as any).intern_long?.work_days_per_week ??
          (sel as any).fulltime?.working_days;

        if (dPerWeek) {
          // If numeric => "週 N 日", else use the raw string
          const token = /^\d+$/.test(String(dPerWeek).trim())
            ? `週 ${dPerWeek} 日`
            : String(dPerWeek).trim();
          combinedWH.push(token);
        }

        // remove null / empty & duplicates
        combinedWH = [...new Set(combinedWH.filter(Boolean))];

        if (combinedWH.length > 0) {
          (sel as any).workHoursList = combinedWH;
        }

        // --- Benefits ---
        if (!benefitsList || benefitsList.length === 0) {
          const rawBen =
            (sel as any).fulltime?.benefits ??
            (sel as any).fulltime?.benefits_list ??
            (sel as any).intern_long?.benefits ??
            (sel as any).intern_long?.benefits_list;

          let tokens: string[] = [];

          if (typeof rawBen === "string" && rawBen.trim() !== "") {
            tokens = rawBen
              // split by common Japanese separators as well
              .split(/\r?\n|・|,|、|／|\//)
              .map((t: string) => t.trim())
              .filter(Boolean);
          } else if (Array.isArray(rawBen)) {
            tokens = rawBen.map((t: any) => String(t).trim()).filter(Boolean);
          }

          if (tokens.length > 0) {
            (sel as any).benefitsList = tokens;
          }
        }

        (sel as any).skillsList       = skillsList;
        (sel as any).workHoursList    = (sel as any).workHoursList ?? workHoursList;
        (sel as any).benefitsList     = (sel as any).benefitsList  ?? benefitsList;

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

  /* ---------- SEO meta ---------- */
  const brand = "学生転職";

  const metaTitle =
    job && company
      ? `${company.name ?? ""} | ${job.title}（${
          job.selection_type === "event" ? "イベント" : "求人"
        }） - ${brand}`
      : `求人詳細 - ${brand}`;

  const salary =
    (job as any).salary_min && (job as any).salary_max
      ? `${(job as any).salary_min}〜${(job as any).salary_max}`
      : job.salary_range ?? "非公開";

  const metaDescription =
    job && company
      ? `${job.title} の募集要項ページ。勤務地：${
          job.location ?? "未定"
        }、給与：${salary}。締め切り：${
          (job as any).application_deadline ?? "未定"
        }。${company.name ?? ""} の企業情報も掲載しています。`
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
