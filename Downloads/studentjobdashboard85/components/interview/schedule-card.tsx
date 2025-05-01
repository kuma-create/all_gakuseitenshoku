"use client"

import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { Calendar, Clock, MapPin, LinkIcon, FileText, Loader2, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { InterviewSchedule } from "@/types/interview"

interface ScheduleCardProps {
  schedule: InterviewSchedule
  isConfirmed: boolean
  isConfirming: boolean
  onConfirm: (scheduleId: string) => void // 文字列型に変更
  hasOtherConfirmed: boolean
}

export function ScheduleCard({ schedule, isConfirmed, isConfirming, onConfirm, hasOtherConfirmed }: ScheduleCardProps) {
  // 日付をフォーマットする
  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "yyyy年MM月dd日(E) HH:mm", { locale: ja })
  }

  if (isConfirmed) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">確定済み面接日程</CardTitle>
            <Badge className="bg-green-600">確定済み</Badge>
          </div>
          <CardDescription>以下の日程で面接が確定しています。応募者にも通知されています。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-green-600" />
            <span className="font-medium">日時:</span>
            <span>{formatDateTime(schedule.scheduled_at)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-green-600" />
            <span className="font-medium">所要時間:</span>
            <span>{schedule.duration_minutes}分</span>
          </div>
          {schedule.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-green-600" />
              <span className="font-medium">場所:</span>
              <span>{schedule.location}</span>
            </div>
          )}
          {schedule.meeting_link && (
            <div className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-green-600" />
              <span className="font-medium">ミーティングリンク:</span>
              <a
                href={schedule.meeting_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {schedule.meeting_link}
              </a>
            </div>
          )}
          {schedule.notes && (
            <div className="flex gap-2">
              <FileText className="h-5 w-5 shrink-0 text-green-600" />
              <div>
                <span className="font-medium">備考:</span>
                <p className="mt-1 whitespace-pre-wrap text-sm">{schedule.notes}</p>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              // カレンダーに追加する機能（プレースホルダー）
              // 実装予定
            }}
          >
            カレンダーに追加
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">候補日</CardTitle>
        <CardDescription>{formatDateTime(schedule.scheduled_at)}</CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="grid gap-2 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>所要時間: {schedule.duration_minutes}分</span>
          </div>
          {schedule.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{schedule.location}</span>
            </div>
          )}
          {schedule.notes && (
            <div className="flex gap-2">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="line-clamp-2">{schedule.notes}</p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full" disabled={isConfirming || hasOtherConfirmed} onClick={() => onConfirm(schedule.id)}>
          {isConfirming ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              確定中...
            </>
          ) : hasOtherConfirmed ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              別の日程が確定済み
            </>
          ) : (
            "この日程で確定する"
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
