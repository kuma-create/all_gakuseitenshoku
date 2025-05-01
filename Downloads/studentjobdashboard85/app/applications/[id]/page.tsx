import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import ApplicationDetailClient from "./application-detail-client"

export default async function ApplicationDetailPage({ params }: { params: { id: string } }) {
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
  const { data: userRole } = await supabase.from("user_roles").select("*").eq("id", session.user.id).single()

  if (!userRole || userRole.role !== "student") {
    redirect("/dashboard")
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
      )
    `)
    .eq("id", applicationId)
    .eq("student_id", session.user.id)
    .single()

  if (!application) {
    notFound()
  }

  return <ApplicationDetailClient application={application} />
}
