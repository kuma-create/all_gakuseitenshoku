"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { ja } from "date-fns/locale"

interface InterviewScheduleFormProps {
  applicationId: string
  studentId: string
}

export default function InterviewScheduleForm({ applicationId, studentId }: InterviewScheduleFormProps) {
  const [schedules, setSchedules] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const addSchedule = () => {
    if (schedules.length >= 3) {
      toast({
        title: "最大3件まで",
        description: "面談候補日は最大3件までです",
        variant: "destructive",
      })
      return
    }
    setSchedules([...schedules, ""])
  }

  const removeSchedule = (index: number) => {
    const newSchedules = [...schedules]
    newSchedules.splice(index, 1)
    setSchedules(newSchedules)
  }

  const handleScheduleChange = (index: number, value: string) => {
    const newSchedules = [...schedules]
    newSchedules[index] = value
    setSchedules(newSchedules)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // バリデーション
    if (schedules.length === 0) {
      toast({
        title: "候補日が未設定",
        description: "少なくとも1つの面談候補日を設定してください",
        variant: "destructive",
      })
      return
    }

    const emptySchedules = schedules.some((schedule) => !schedule)
    if (emptySchedules) {
      toast({
        title: "日時が未入力",
        description: "すべての候補日に日時を入力してください",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // 面談候補日をSupabaseに保存
      const schedulesToInsert = schedules.map((schedule) => ({
        application_id: applicationId,
        student_id: studentId,
        scheduled_at: new Date(schedule).toISOString(),
        status: "pending",
      }))

      const { error } = await supabase.from("interview_schedules").insert(schedulesToInsert)

      if (error) throw error

      toast({
        title: "面談候補日を提出しました",
        description: "企業からの連絡をお待ちください",
      })

      // ダッシュボードにリダイレクト
      router.push("/student/dashboard")
    } catch (error) {
      console.error("Error submitting interview schedules:", error)
      toast({
        title: "エラーが発生しました",
        description: "面談候補日の提出に失敗しました。もう一度お試しください。",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return ""
    try {
      const date = new Date(dateString)
      return format(date, "yyyy年MM月dd日(E) HH:mm", { locale: ja })
    } catch (e) {
      return dateString
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">面談候補日</h2>
          <Button
            type="button"
            onClick={addSchedule}
            variant="outline"
            size="sm"
            disabled={schedules.length >= 3 || isSubmitting}
          >
            <Plus className="mr-1 h-4 w-4" /> 候補日を追加
          </Button>
        </div>

        {schedules.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              「候���日を追加」ボタンをクリックして、面談可能な日時を追加してください。
              <br />
              最大3件まで候補日を提出できます。
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {schedules.map((schedule, index) => (
              <Card key={index} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex-1">
                      <label htmlFor={`schedule-${index}`} className="block text-sm font-medium mb-1">
                        候補日 {index + 1}
                      </label>
                      <Input
                        id={`schedule-${index}`}
                        type="datetime-local"
                        value={schedule}
                        onChange={(e) => handleScheduleChange(index, e.target.value)}
                        disabled={isSubmitting}
                        className="w-full"
                        required
                      />
                      {schedule && (
                        <p className="mt-1 text-sm text-muted-foreground">{formatDateForDisplay(schedule)}</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      onClick={() => removeSchedule(index)}
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      disabled={isSubmitting}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">候補日を削除</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
          キャンセル
        </Button>
        <Button type="submit" disabled={schedules.length === 0 || isSubmitting} className="min-w-[120px]">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              提出中...
            </>
          ) : (
            "候補日を提出"
          )}
        </Button>
      </div>
    </form>
  )
}
