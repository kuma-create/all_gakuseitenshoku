import type { Database } from "@/lib/database.types"

// Supabaseのデータベース型定義から面接スケジュールの型を取得
export type InterviewSchedule = Database["public"]["Tables"]["interview_schedules"]["Row"]

export interface InterviewScheduleClientProps {
  applicationId: number
}
