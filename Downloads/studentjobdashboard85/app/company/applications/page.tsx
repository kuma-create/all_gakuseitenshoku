import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import CompanyApplicationsClient from "./company-applications-client"
import type { Application } from "@/types/application"

export default async function CompanyApplicationsPage() {
  const supabase = createClient()

  // セッションの取得
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/auth/signin")
  }

  // ユーザーロールの取得
  const { data: userRole } = await supabase.from("user_roles").select("*").eq("id", session.user.id).single()

  if (!userRole || userRole.role !== "company") {
    redirect("/dashboard")
  }

  // 企業ユーザー情報の取得
  const { data: companyUser } = await supabase.from("company_users").select("*").eq("user_id", session.user.id).single()

  if (!companyUser) {
    redirect("/company/pending")
  }

  // 企業の求人に対する応募を取得
  const { data: applications } = await supabase
    .from("applications")
    .select(`
      *,
      jobs:job_id (
        id,
        title,
        location,
        job_type,
        company_id,
        companies:company_id (
          id,
          name,
          logo_url
        )
      ),
      students:student_id (
        id,
        first_name,
        last_name,
        university,
        major,
        graduation_year,
        avatar_url
      )
    `)
    .eq("jobs.company_id", companyUser.company_id)
    .order("created_at", { ascending: false })

  return <CompanyApplicationsClient applications={(applications as Application[]) || []} />
}
