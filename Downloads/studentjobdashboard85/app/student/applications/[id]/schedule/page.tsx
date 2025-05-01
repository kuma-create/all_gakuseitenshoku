import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import InterviewScheduleForm from "./interview-schedule-form"

export default async function InterviewSchedulePage({ params }: { params: { id: string } }) {
  const supabase = createServerComponentClient({ cookies })
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/auth/signin")
  }

  // 学生ユーザーかどうか確認
  const { data: studentProfile } = await supabase.from("students").select("*").eq("user_id", session.user.id).single()

  if (!studentProfile) {
    redirect("/dashboard")
  }

  // この応募が自分のものかどうか確認
  const { data: application } = await supabase
    .from("applications")
    .select("*")
    .eq("id", params.id)
    .eq("student_id", studentProfile.id)
    .single()

  if (!application) {
    redirect("/student/applications")
  }

  // 求人情報を取得
  const { data: job } = await supabase
    .from("jobs")
    .select("job_title, companies(company_name)")
    .eq("id", application.job_id)
    .single()

  return (
    <div className="container max-w-3xl py-6 px-4 md:px-6">
      <h1 className="text-2xl font-bold mb-2">面談候補日の提出</h1>
      {job && (
        <div className="mb-6">
          <p className="text-muted-foreground">
            求人: {job.job_title} - {job.companies?.company_name}
          </p>
        </div>
      )}
      <InterviewScheduleForm applicationId={params.id} studentId={studentProfile.id} />
    </div>
  )
}
