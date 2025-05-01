import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import JobApplyClient from "./job-apply-client"

export default async function JobApplyPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  // ユーザー認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // 未ログインの場合はログインページにリダイレクト
    redirect("/auth/signin?redirect=/jobs/" + params.id + "/apply")
  }

  // 求人情報を取得
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select(`
      id,
      job_title,
      job_description,
      location,
      employment_type,
      salary_min,
      salary_max,
      work_style,
      application_deadline,
      companies (
        id,
        name,
        description,
        logo_url
      )
    `)
    .eq("id", params.id)
    .single()

  if (jobError || !job) {
    console.error("Error fetching job:", jobError)
    redirect("/jobs")
  }

  // 学生プロフィール情報を取得
  const { data: profile, error: profileError } = await supabase
    .from("student_profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (profileError && profileError.code !== "PGRST116") {
    console.error("Error fetching profile:", profileError)
  }

  // 既に応募済みかチェック
  const { data: existingApplication, error: applicationError } = await supabase
    .from("applications")
    .select("id, status")
    .eq("student_id", user.id)
    .eq("job_id", params.id)
    .single()

  if (applicationError && applicationError.code !== "PGRST116") {
    console.error("Error checking application:", applicationError)
  }

  // 面接候補日程を取得（実際のアプリケーションでは別テーブルから取得する）
  // ここではサンプルデータを使用
  const interviewDates = [
    { id: 1, date: "2023年6月1日", time: "10:00〜11:00", available: true },
    { id: 2, date: "2023年6月1日", time: "14:00〜15:00", available: true },
    { id: 3, date: "2023年6月2日", time: "10:00〜11:00", available: true },
    { id: 4, date: "2023年6月2日", time: "14:00〜15:00", available: true },
    { id: 5, date: "2023年6月5日", time: "10:00〜11:00", available: true },
  ]

  return (
    <JobApplyClient
      job={job}
      profile={profile || null}
      interviewDates={interviewDates}
      existingApplication={existingApplication || null}
    />
  )
}
