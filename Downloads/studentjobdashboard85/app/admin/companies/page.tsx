import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import AdminCompaniesClient from "./admin-companies-client"

export const dynamic = "force-dynamic"

export default async function AdminCompaniesPage() {
  const supabase = createClient()

  // セッションを取得
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/auth/signin?redirect=/admin/companies")
  }

  // ユーザーロールを確認
  const { data: roleData } = await supabase.from("user_roles").select("role").eq("id", session.user.id).single()

  // 管理者でない場合はリダイレクト
  if (!roleData || roleData.role !== "admin") {
    redirect("/dashboard")
  }

  // 企業一覧を取得
  const { data: companies } = await supabase
    .from("companies")
    .select(`
      id,
      company_name,
      industry,
      location,
      created_at,
      company_users (
        user_id,
        role
      )
    `)
    .order("created_at", { ascending: false })

  return <AdminCompaniesClient companies={companies || []} />
}
