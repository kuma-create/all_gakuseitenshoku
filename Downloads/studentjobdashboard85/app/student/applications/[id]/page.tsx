import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CalendarClock } from "lucide-react"

export default async function StudentApplicationDetailPage({ params }: { params: { id: string } }) {
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
    .select(`
      *,
      jobs(
        id,
        job_title,
        location,
        employment_type,
        job_description,
        companies(
          id,
          company_name
        )
      )
    `)
    .eq("id", params.id)
    .eq("student_id", studentProfile.id)
    .single()

  if (!application) {
    redirect("/student/applications")
  }

  // 面接スケジュールを確認
  const { data: interviewSchedules } = await supabase
    .from("interview_schedules")
    .select("*")
    .eq("application_id", params.id)
    .eq("student_id", studentProfile.id)

  const hasSubmittedSchedules = interviewSchedules && interviewSchedules.length > 0

  return (
    <div className="container py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">応募詳細</h1>
          <p className="text-muted-foreground">
            {application.jobs?.job_title} - {application.jobs?.companies?.company_name}
          </p>
        </div>

        {!hasSubmittedSchedules && (
          <Link href={`/student/applications/${params.id}/schedule`}>
            <Button>
              <CalendarClock className="mr-2 h-4 w-4" />
              面談候補日を提出
            </Button>
          </Link>
        )}
      </div>

      {/* 既存の応募詳細コンテンツ */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* 応募情報 */}
        <div className="space-y-6">{/* 既存のコンテンツ */}</div>

        {/* 求人情報 */}
        <div className="space-y-6">
          {/* 既存のコンテンツ */}

          {/* 面接スケジュール情報 */}
          {hasSubmittedSchedules && (
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-medium mb-2">面談候補日</h3>
              <p className="text-sm text-muted-foreground">
                面談候補日を提出済みです。企業からの連絡をお待ちください。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
