import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import CompanyDashboardClient from "./company-dashboard-client"

export const dynamic = "force-dynamic"

export default async function CompanyDashboardPage() {
  const supabase = createClient()

  try {
    // 1. セッション確認
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError) {
      console.error("セッション取得エラー:", sessionError)
      return redirect("/auth/signin")
    }

    if (!session) {
      return redirect("/auth/signin")
    }

    // 2. ユーザー取得
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      console.error("ユーザー取得エラー:", userError)
      return redirect("/auth/signin")
    }

    if (!user) {
      return redirect("/auth/signin")
    }

    // 3. ユーザーロール確認（企業かつ承認済み）
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role, is_approved")
      .eq("id", user.id)
      .single()

    if (roleError) {
      console.error("ユーザーロール取得エラー:", roleError)
      return redirect("/dashboard")
    }

    if (!roleData || roleData.role !== "company") {
      return redirect("/dashboard")
    }

    if (roleData.is_approved === false) {
      return redirect("/company/pending")
    }

    // 4. 企業ID取得
    const { data: companyUser, error: companyUserError } = await supabase
      .from("company_users")
      .select("company_id")
      .eq("user_id", user.id)
      .single()

    if (companyUserError) {
      console.error("企業ユーザー取得エラー:", companyUserError)
      return redirect("/dashboard")
    }

    if (!companyUser?.company_id) {
      return redirect("/company/dashboard") // fallback
    }

    const companyId = companyUser.company_id

    // 5. 企業情報取得
    const { data: companyData, error: companyError } = await supabase
      .from("companies")
      .select("*")
      .eq("id", companyId)
      .single()

    if (companyError) {
      console.error("企業情報取得エラー:", companyError)
      // エラーがあっても続行するが、ログは残す
    }

    // 6. 求人情報取得
    const { data: jobPostings, error: jobPostingsError } = await supabase
      .from("job_postings")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })

    if (jobPostingsError) {
      console.error("求人情報取得エラー:", jobPostingsError)
      // エラーがあっても続行するが、ログは残す
    }

    // 7. 応募情報取得
    const { data: applications, error: applicationsError } = await supabase
      .from("applications")
      .select("*, job_postings(*), student_profiles(*)") // profiles を student_profiles に変更
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })

    if (applicationsError) {
      console.error("応募情報取得エラー:", applicationsError)
      // エラーがあっても続行するが、ログは残す
    }

    // 8. クライアントコンポーネントに渡す
    return (
      <CompanyDashboardClient
        user={user}
        company={companyData || { name: user.user_metadata?.company_name || "企業名未設定" }}
        jobPostings={jobPostings || []}
        applications={applications || []}
      />
    )
  } catch (error) {
    // 予期せぬエラーのハンドリング
    console.error("予期せぬエラーが発生しました:", error)
    return redirect("/error")
  }
}
