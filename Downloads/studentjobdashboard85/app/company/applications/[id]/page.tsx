import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import CompanyApplicationDetailClient from "./company-application-detail-client"

export default async function CompanyApplicationDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const applicationId = Number.parseInt(params.id)

  if (isNaN(applicationId)) {
    notFound()
  }

  // セッションの取得
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/auth/signin")
  }

  // ユーザーロールの取得
  const { data: userRole } = await supabase
    .from("user_roles")
    .select("role, is_approved")
    .eq("id", session.user.id)
    .single()

  // 企業アカウントでない場合はリダイレクト
  if (userRole?.role !== "company") {
    redirect("/dashboard")
  }

  // 企業アカウントで未承認の場合は承認待ちページにリダイレクト
  if (userRole?.is_approved === false) {
    redirect("/company/pending")
  }

  // 企業IDの取得
  const { data: companyUser } = await supabase
    .from("company_users")
    .select("company_id")
    .eq("user_id", session.user.id)
    .single()

  if (!companyUser) {
    // 企業ユーザーが見つからない場合はダッシュボードにリダイレクト
    redirect("/company/dashboard")
  }

  // 応募詳細の取得
  const { data: application } = await supabase
    .from("applications")
    .select(`
      *,
      jobs:job_id (
        *,
        companies:company_id (
          *
        )
      ),
      students:student_id (
        *
      )
    `)
    .eq("id", applicationId)
    .single()

  if (!application) {
    notFound()
  }

  // 自社の求人に対する応募かどうかを確認
  if (application.jobs.company_id !== companyUser.company_id) {
    redirect("/company/applications")
  }

  return <CompanyApplicationDetailClient application={application} />
}
