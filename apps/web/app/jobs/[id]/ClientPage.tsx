/* ───────────────────────────────────────────────
   app/jobs/[id]/page.tsx  ― 学生向け選考詳細
   2025‑05‑23  multi‑type (fulltime / internship / event) 対応
──────────────────────────────────────────────── */

"use client"
import React, { useState, useEffect, useCallback } from "react";
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
export default function ClientPage({ id }: { id: string }) {
  const { userType } = useAuth()
  const router        = useRouter()

  /* ---------- state ---------- */
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [job, setJob]           = useState<SelectionWithCompany | null>(null)
  const [limitedMask, setLimitedMask] = useState(false)
  const [limitedTitle, setLimitedTitle] = useState<string>("")
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

        // --- Early check: member_only & session ---
        const [{ data: sess }, { data: jobRow }] = await Promise.all([
          supabase.auth.getSession(),
          supabase.from("jobs").select("member_only,title").eq("id", id).maybeSingle(),
        ] as const);
        const isLoggedIn = !!sess.session;
        const isMemberOnly = !!jobRow?.member_only;
        if (isMemberOnly && !isLoggedIn) {
          setLimitedMask(true);
          setLimitedTitle(jobRow?.title ?? "");
          setLoading(false);
          return;
        }

        /* selection + company */
        const { data: selRows, error: selErr } = await supabase
          .from("selections_view")
          .select(`
            id,
            title,
            description,
            cover_image_url,
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
              work_days_per_week,
              allowance
            ),
            intern_long:intern_long_details!job_id(
              min_duration_months,
              work_days_per_week,
              hourly_wage,
              min_daily_hours,
              remuneration_type,
              commission_rate,
              is_paid,
              travel_expense,
              nearest_station,
              benefits,
              working_hours
            ),
            fulltime:fulltime_details!job_id(
              working_days,
              working_hours, 
              benefits
            ),
            event:event_details!job_id(
              event_date,
              event_time,
              event_end_time,
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
            (sel as any).intern_long?.benefits ??
            (sel as any).intern_long?.benefits_list ??
            (sel as any).fulltime?.benefits ??
            (sel as any).fulltime?.benefits_list;


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

        // ---- derive reward (給与/報酬) for long internship ----
        if ((sel as any).selection_type === "internship_long" || (sel as any).selection_type === "intern_long") {
          const il = (sel as any).intern_long || {};
          const sh = (sel as any).internship || {};

          // Prefer allowance from internship_details (the only table that has it)
          const allow = sh.allowance ?? null;
          if (allow != null && allow !== "") {
            (sel as any).salary_range =
              typeof allow === "number" ? `${Number(allow).toLocaleString()}円` : String(allow);
          } else {
            let reward: string | null = null;

            const paid = il.is_paid as boolean | undefined;
            const rt = il.remuneration_type as string | undefined;
            const wage = il.hourly_wage as number | undefined;
            const com = il.commission_rate as string | undefined;

            if (paid === false) {
              reward = "無給";
            } else if (rt === "hourly" && typeof wage === "number") {
              reward = `${Number(wage).toLocaleString()}円/時`;
            } else if (rt === "commission" && com) {
              reward = `歩合（${String(com)}）`;
            } else if (paid === true) {
              reward = "有給";
            }

            if (reward) {
              (sel as any).salary_range = reward;
            }
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

  /* ---------- ui: limited mask / loading / error ---------- */
  if (limitedMask) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <main className="container mx-auto px-4 py-8">
          <div className="mb-6 flex items-center gap-2">
            <Button variant="ghost" onClick={() => router.back()} className="text-gray-500 hover:text-red-600">
              <ArrowLeft className="mr-1 h-4 w-4" />
              戻る
            </Button>
          </div>
          <div className="mx-auto max-w-5xl">
            <Card className="border-0 shadow-md">
              <CardContent className="p-6">
                <h1 className="text-2xl font-bold mb-2">{limitedTitle || "求人詳細（限定公開）"}</h1>
                <p className="text-xs inline-flex items-center rounded-full bg-red-600 px-2 py-0.5 font-medium text-white mb-4">限定公開</p>
                <p className="text-sm text-gray-600">
                  この求人は<strong className="text-red-600">限定公開</strong>です。企業名・企業ロゴ・求人画像・勤務地などの詳細は、ログイン後に表示されます。
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <Button asChild variant="outline">
                    <a href="/login">ログイン</a>
                  </Button>
                  <Button asChild className="bg-red-600 hover:bg-red-700">
                    <a href="/signup">無料登録</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }
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

  return Body;
}
