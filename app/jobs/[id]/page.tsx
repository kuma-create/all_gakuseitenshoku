/* ───────────────────────────────────────────────
   app/jobs/[id]/page.tsx  ― 学生向け選考詳細
   2025‑05‑23  multi‑type (fulltime / internship / event) 対応
──────────────────────────────────────────────── */
"use client"

import { useState, useEffect, useCallback } from "react"
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
import { FulltimeInfo, InternInfo, EventInfo } from "./_variants"

/* ---------- 型 (簡略) ---------- */
type SelectionRow = Database["public"]["Views"]["selections_view"]["Row"]
type CompanyRow = {
  id: string
  name: string | null
  logo_url: string | null
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
export default function JobDetailPage({ params }: { params: { id: string } }) {
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
    if (!params.id) return
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
              logo_url,
              cover_image_url,
              industry,
              founded_year,
              employee_count,
              location,
              website,
              description
            ),
            internship:internship_details!job_id(*),
            fulltime:fulltime_details!job_id(*),
            event:event_details!job_id(*)
          `)
          .eq("id", params.id)
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
          .eq("job_id", params.id)
        const tagList = tagRows?.map(t => t.tag) ?? []

        /* related */
        let rel: SelectionRow[] = []
        if (sel.company_id) {
          const { data: r } = await supabase
            .from("selections_view")
            .select(`id,title,location,salary_min,salary_max,selection_type,
                     company:companies(name, logo as logo_url)`)
            .eq("company_id", sel.company_id)
            .neq("id", params.id)
            .limit(3)
          rel = (r ?? []) as unknown as SelectionRow[]
        }

        /* applied? */
        const { data:{ user } } = await supabase.auth.getUser()
        const { data: applied } = await supabase
          .from("applications")
          .select("id")
          .eq("job_id", params.id)
          .eq("student_id", user?.id ?? "")
          .maybeSingle()

        /* view count */
        trackView(params.id)

        /* set */
        setJob(sel)
        // cast sel.company to the extended CompanyRow shape
        const comp = sel.company as unknown as CompanyRow
        setCompany(comp ?? null)
        setTags(tagList)
        setRelated(rel)
        setHasApplied(Boolean(applied))
      } catch (e:any) {
        console.error(e)
        setError(e.message ?? "取得に失敗しました")
      } finally {
        setLoading(false)
      }
    })()
  }, [params.id, trackView])

  /* ---------- apply ---------- */
  const handleApply = async () => {
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      if (!user) throw new Error("サインインが必要です")

      if (job?.selection_type === "event") {
        const participant: Database["public"]["Tables"]["event_participants"]["Insert"] = {
          event_id   : params.id,
          student_id : user.id,
          status     : "reserved",
        }
        const { error } = await supabase.from("event_participants").insert(participant)
        if (error) throw error
      } else {
        const appRow: Database["public"]["Tables"]["applications"]["Insert"] = {
          job_id     : params.id,
          student_id : user.id,
        }
        const { error } = await supabase.from("applications").insert(appRow)
        if (error) throw error
      }
      setHasApplied(true)
      setShowForm(false)
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

  /* ---------- variant render ---------- */
  switch (job.selection_type as "fulltime" | "internship_short" | "event") {
    case "internship_short":
      return (
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
      )
    case "event":
      return (
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
      )
    default:
      return (
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
      )
  }
}
