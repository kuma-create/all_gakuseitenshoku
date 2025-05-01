import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import JobCreateForm from "./job-create-form"

export default async function CreateJobPage() {
  const supabase = createClient()

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

  // 企業情報の取得
  const { data: company } = await supabase
    .from("companies")
    .select("id, name, industry, location")
    .eq("id", companyUser.company_id)
    .single()

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">求人を作成</h1>
      <JobCreateForm company={company} userId={session.user.id} />
    </div>
  )
}
