import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import CompanyUsersClient from "./company-users-client"

export const dynamic = "force-dynamic"

export default async function CompanyUsersPage() {
  const supabase = createClient()

  // セッションを取得
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/auth/signin?redirect=/company/users")
  }

  // ユーザーロールを確認
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role, is_approved")
    .eq("id", session.user.id)
    .single()

  // 企業ユーザーでない場合はリダイレクト
  if (!roleData || roleData.role !== "company") {
    redirect("/dashboard")
  }

  // 承認待ちの場合はペンディングページにリダイレクト
  if (roleData && !roleData.is_approved) {
    redirect("/company/pending")
  }

  // 企業情報を取得
  const { data: companyUser } = await supabase
    .from("company_users")
    .select("company_id, role")
    .eq("user_id", session.user.id)
    .single()

  if (!companyUser) {
    // 企業に所属していない場合はダッシュボードにリダイレクト
    redirect("/company/dashboard")
  }

  // 企業情報を取得
  const { data: company } = await supabase.from("companies").select("*").eq("id", companyUser.company_id).single()

  // 企業ユーザー一覧を取得
  const { data: users } = await supabase
    .from("company_users")
    .select(`
      user_id,
      role,
      created_at,
      auth_users:user_id (
        email,
        user_metadata
      )
    `)
    .eq("company_id", companyUser.company_id)
    .order("created_at", { ascending: false })

  return (
    <CompanyUsersClient
      company={company || { id: companyUser.company_id, company_name: "企業名未設定" }}
      users={users || []}
      currentUserRole={companyUser.role}
    />
  )
}
