import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import InterviewScheduleClient from "./interview-schedule-client"

interface InterviewSchedulePageProps {
  params: {
    id: string
  }
}

export default async function InterviewSchedulePage({ params }: InterviewSchedulePageProps) {
  // 応募IDを取得
  const applicationId = Number.parseInt(params.id)

  // 無効なIDの場合は404
  if (isNaN(applicationId)) {
    return notFound()
  }

  const supabase = createClient()

  // セッションを取得
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // 認証チェック
  if (!session) {
    redirect("/auth/signin")
  }

  // 応募データを取得して、自社の求人に対する応募かどうかを確認
  // リレーションを明示的に指定して取得
  const { data: application, error } = await supabase
    .from("applications")
    .select(`
      id,
      job_id,
      job:job_id (
        company_id
      )
    `)
    .eq("id", params.id)
    .single()

  // 応募が存在しない場合は404
  if (error || !application) {
    console.error("応募データの取得エラー:", error)
    return notFound()
  }

  // 企業ユーザーのプロフィールを取得
  const { data: companyUser } = await supabase
    .from("company_users")
    .select("company_id")
    .eq("user_id", session.user.id)
    .single()

  // 企業ユーザーでない場合はリダイレクト
  if (!companyUser) {
    redirect("/dashboard")
  }

  // 自社の求人に対する応募でない場合はリダイレクト
  // job.company_id を使用するように修正
  if (application.job.company_id !== companyUser.company_id) {
    redirect("/company/applications")
  }

  return <InterviewScheduleClient applicationId={applicationId} />
}
