/* -------------------------------------------------------------------------
   app/my/interested-jobs/page.tsx
   保存済み（興味あり）求人一覧　★ JobCard が要求する型を満たすよう整形
---------------------------------------------------------------------------*/
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase/client"

import type { Database } from "@/lib/supabase/types"
import { JobCard } from "@/components/job-card"

/* ---------- 型 ---------- */
type JobRow = Database["public"]["Tables"]["jobs"]["Row"]
type CompanyPreview = Pick<
  Database["public"]["Tables"]["companies"]["Row"],
  "id" | "name" | "logo"
>

/** JobCard が期待する完全な型 */
export type JobWithTags = JobRow & {
  company     : CompanyPreview | null
  job_tags?   : { tag: string }[] | null  // JOIN 後に入る可能性
  tags        : string[]
  is_new      : boolean
  is_hot      : boolean
  is_featured : boolean
}


/* ======================================================================= */
export default function InterestedJobsPage() {
  const [loading, setLoading] = useState(true)
  const [jobs, setJobs]       = useState<JobWithTags[]>([])

  /* ---------------- Fetch ---------------- */
  useEffect(() => {
    ;(async () => {
      /* job_interests → jobs LEFT JOIN companies, job_tags */
      const { data, error } = await supabase
        .from("job_interests")
        .select(`
          job:jobs (
            *,
            company:companies!jobs_company_id_fkey ( id, name, logo ),
            job_tags!left ( tag )
          )
        `)

      if (error) {
        console.error(error)
        setJobs([])
      } else {
        /* job が null でない行を取り出し、JobWithTags に整形 */
        const now = Date.now()
        const extracted =
          data
            ?.flatMap((d) => (d.job ? [d.job] : []))
            .map((j) => {
                const ext = j as JobRow & {
                    is_hot?: boolean | null
                    is_featured?: boolean | null
                }
              const tags = j.job_tags?.map((t) => t.tag) ?? []

              /* is_new = 7 日以内に作成 */
              const isNew =
                !!j.created_at &&
                now - new Date(j.created_at).getTime() <
                  1000 * 60 * 60 * 24 * 7

              return {
                ...j,
                tags,
                is_new      : isNew,
                is_hot      : !!ext.is_hot,
                is_featured : !!ext.is_featured,
              } as JobWithTags
            }) ?? []

        setJobs(extracted)
      }
      setLoading(false)
    })()
  }, [])

  /* ---------------- UI ---------------- */
  if (loading) {
    return <Loader2 className="m-auto h-10 w-10 animate-spin" />
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">保存済み求人</h1>

      {jobs.length === 0 ? (
        <p>まだ保存した求人はありません</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <JobCard
                key={job.id}
                job={job}
                saved={true}           /* 一覧に出ている時点で必ず true */
                onToggleSave={() => {}} /* 何もしないダミー関数 */
                variant="grid"         /* 一覧カード用レイアウト */
            />
          ))}
        </div>
      )}

      <Link href="/jobs" className="mt-8 inline-block text-primary underline">
        ← 求人一覧に戻る
      </Link>
    </div>
  )
}
