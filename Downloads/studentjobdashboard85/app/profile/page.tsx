import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import ProfileClient from "./profile-client"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function ProfilePage() {
  const supabase = createClient()

  // セッションの取得
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/auth/signin?redirect=/profile")
  }

  // ユーザーロールの取得
  const { data: userRole } = await supabase.from("user_roles").select("role").eq("id", session.user.id).single()

  if (!userRole || userRole.role !== "student") {
    redirect("/dashboard")
  }

  // 学生プロフィールの取得
  const { data: profile } = await supabase.from("student_profiles").select("*").eq("id", session.user.id).single()

  return <ProfileClient initialProfile={profile || {}} userId={session.user.id} />
}
