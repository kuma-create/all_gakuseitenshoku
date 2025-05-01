import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import CompanyJobsClient from "./company-jobs-client"

export const dynamic = "force-dynamic"

export default async function CompanyJobsPage() {
  const supabase = createClient()

  // セッションを取得
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/auth/signin")
  }

  // ユーザーロールを取得
  const { data: userRole } = await supabase
    .from("user_roles")
    .select("role, is_approved")
    .eq("id", session.user.id)
    .single()

  // 企業アカウントでない場合はリダイレクト
  if (!userRole || userRole.role !== "company") {
    redirect("/dashboard")
  }

  // 承認待ちならリダイレクト
  if (userRole.is_approved === false) {
    redirect("/company/pending")
  }

  // 企業ユーザー情報を取得
  // 企業ユーザー情報を取得（エラーハンドリング付き）
  const { data: companyUser, error: companyUserError } = await supabase
    .from("company_users")
    .select("company_id")
    .eq("user_id", session.user.id)
    .single()

  if (companyUserError || !companyUser) {
    redirect("/company/dashboard")
  }

  const companyId = companyUser.company_id

  // 求人一覧を取得
  const { data: jobs } = await supabase
    .from("job_postings")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })

  // 各求人ごとの応募数をまとめて取得
  const { data: applications } = await supabase.from("applications").select("job_id").eq("company_id", companyId) // ← 応募側のデータ構造で必要に応じて

  // 求人IDごとに応募数をカウント
  const applicationCounts: Record<string, number> = {}
  if (applications) {
    applications.forEach((app) => {
      if (app.job_id) {
        applicationCounts[app.job_id] = (applicationCounts[app.job_id] || 0) + 1
      }
    })
  }

  return <CompanyJobsClient jobs={jobs || []} applicationCounts={applicationCounts} companyId={companyId} />
}
