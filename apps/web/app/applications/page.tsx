/* ────────────────────────────────────────────────────────────
   app/applications/page.tsx
   - 学生の応募履歴一覧
──────────────────────────────────────────────────────────── */
import Link from "next/link"
import { redirect } from "next/navigation"
import {
  Briefcase, Building2, Calendar, CornerDownRight,
} from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/supabase/types"

type CompanyRow = Database["public"]["Tables"]["companies"]["Row"]
type JobWithCompany = Database["public"]["Tables"]["jobs"]["Row"] & {
  companies: CompanyRow | null
}
type ApplicationRow =
  Database["public"]["Tables"]["applications"]["Row"] & {
    jobs: JobWithCompany | null
  }


export const dynamic = "force-dynamic" // ← SSG させない

export default async function ApplicationsPage() {
  /* ------------------------------------------------------------
     1) 認証チェック
  ------------------------------------------------------------ */
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) redirect("/login")
  const uid = session.user.id

  /* ------------------------------------------------------------
     2) 応募履歴を取得
        - applications.student_id = uid
        - jobs, companies をリレーションで取得
  ------------------------------------------------------------ */
  const { data, error } = await supabase
    .from("applications")
    .select(
      `
        *,
        jobs (*, companies (*))
      `,
    )
    .eq("student_id", uid)
    .order("created_at", { ascending: false })
  if (error) throw error

  const rows = (data ?? []) as ApplicationRow[]

  /* ------------------------------------------------------------
     3) UI
  ------------------------------------------------------------ */
  return (
    <main className="container max-w-3xl py-10">
      <h1 className="mb-6 text-2xl font-bold">応募履歴</h1>

      {rows.length === 0 && (
        <p className="text-gray-500">まだ応募履歴がありません。</p>
      )}

      <ul className="space-y-4">
        {rows.map(app => {
          const job = app.jobs
          const company = job?.companies
          return (
            <li
              key={app.id}
              className="rounded border px-4 py-3 hover:bg-muted/50"
            >
              <div className="flex flex-col gap-1">
                {/* 会社名 & 職種 */}
                <p className="flex items-center gap-2 text-base font-medium">
                  <Building2 size={16} className="text-gray-600" />
                  {company?.name ?? "非公開企業"}
                </p>
                <p className="flex items-center gap-2 text-sm text-gray-700">
                  <Briefcase size={14} className="text-gray-600" />
                  {job?.title ?? "求人タイトルなし"}
                </p>

                {/* ステータス & 日時 */}
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <CornerDownRight size={12} />
                    ステータス: {app.status ?? "応募中"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    応募日:
                    {app.created_at &&
                      new Date(app.created_at).toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                  </span>
                </div>

                {/* 詳細リンク */}
                {job && (
                  <Link
                    href={`/jobs/${job.id}`}
                    className="mt-2 inline-flex w-max items-center text-sm text-primary hover:underline"
                  >
                    求人詳細を見る
                  </Link>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
