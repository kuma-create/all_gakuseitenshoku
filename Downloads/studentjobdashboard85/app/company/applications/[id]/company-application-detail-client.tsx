"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  FileText,
  Building2,
  MapPin,
  Briefcase,
  ChevronLeft,
  ExternalLink,
  User,
  GraduationCap,
  FileTextIcon as FileText2,
  MessageSquare,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// 応募ステータスの定義
const APPLICATION_STATUS = {
  pending: { label: "審査中", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  document_screening: { label: "書類選考中", color: "bg-blue-100 text-blue-800", icon: FileText },
  interview_adjustment: { label: "面接調整中", color: "bg-purple-100 text-purple-800", icon: Calendar },
  interview_scheduled: { label: "面接予定", color: "bg-indigo-100 text-indigo-800", icon: Calendar },
  interview_completed: { label: "面接完了", color: "bg-cyan-100 text-cyan-800", icon: CheckCircle2 },
  offer: { label: "内定", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  rejected: { label: "不採用", color: "bg-red-100 text-red-800", icon: XCircle },
  cancelled: { label: "キャンセル", color: "bg-gray-100 text-gray-800", icon: XCircle },
}

// 型定義
interface Student {
  id: string
  first_name: string | null
  last_name: string | null
  university: string | null
  major: string | null
  graduation_year: number | null
  skills: string[] | null
  interests: string[] | null
  resume_url: string | null
  avatar_url: string | null
}

interface Company {
  id: number
  name: string
  description: string | null
  logo_url: string | null
  website: string | null
  created_at: string
  updated_at: string
}

interface Job {
  id: number
  company_id: number
  job_title: string
  job_description: string
  location: string
  employment_type: string
  salary_min: number
  salary_max: number
  work_style: string
  application_deadline: string
  is_active: boolean
  created_at: string
  updated_at: string
  companies: Company
}

interface Application {
  id: number
  student_id: string
  job_id: number
  status: string
  self_pr: string | null
  questions: string | null
  interview_dates: number[] | null
  resume_url: string | null
  created_at: string
  updated_at: string
  jobs: Job
  students: Student
}

interface CompanyApplicationDetailClientProps {
  application: Application
}

export default function CompanyApplicationDetailClient({ application }: CompanyApplicationDetailClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [newStatus, setNewStatus] = useState(application.status)
  const [isUpdating, setIsUpdating] = useState(false)

  // 応募ステータスを更新する関数
  const updateApplicationStatus = async () => {
    if (!newStatus) return

    try {
      setIsUpdating(true)

      const { error } = await supabase
        .from("applications")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", application.id)

      if (error) throw error

      toast({
        title: "ステータスを更新しました",
        description: `応募のステータスが「${APPLICATION_STATUS[newStatus as keyof typeof APPLICATION_STATUS]?.label || newStatus}」に更新されました`,
      })

      // 応募リストを更新
      router.refresh()
      setIsStatusDialogOpen(false)
    } catch (error) {
      console.error(error)
      toast({
        title: "エラーが発生しました",
        description: "ステータスの更新に失敗しました。もう一度お試しください。",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  // 応募ステータスに応じたバッジを表示する関数
  const StatusBadge = ({ status }: { status: string }) => {
    const statusInfo = APPLICATION_STATUS[status as keyof typeof APPLICATION_STATUS] || {
      label: status,
      color: "bg-gray-100 text-gray-800",
      icon: AlertCircle,
    }
    const Icon = statusInfo.icon

    return (
      <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.color}`}>
        <Icon className="mr-1 h-3 w-3" />
        {statusInfo.label}
      </div>
    )
  }

  // 面接希望日を表示する関数
  const formatInterviewDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return format(date, "yyyy年MM月dd日(E) HH:mm", { locale: ja })
  }

  // 学生の氏名を表示する関数
  const getStudentName = () => {
    return `${application.students.last_name || ""} ${application.students.first_name || ""}`.trim() || "名前未設定"
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <Button variant="ghost" className="mb-2 gap-1 pl-0" onClick={() => router.push("/company/applications")}>
          <ChevronLeft className="h-4 w-4" />
          応募一覧に戻る
        </Button>
        <h1 className="text-2xl font-bold">応募詳細</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* 左カラム - 応募者情報 */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader className="p-4">
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12 overflow-hidden rounded-full">
                  <Image
                    src={application.students.avatar_url || "/placeholder.svg?height=48&width=48&query=person"}
                    alt={getStudentName()}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <CardTitle className="text-base">{getStudentName()}</CardTitle>
                  <CardDescription className="text-xs">
                    応募日: {format(new Date(application.created_at), "yyyy年MM月dd日", { locale: ja })}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <h3 className="mb-3 font-semibold">応募者情報</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-gray-400" />
                  <span>{application.students.university || "大学未設定"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <span>{application.students.major || "学部未設定"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>
                    {application.students.graduation_year
                      ? `${application.students.graduation_year}年卒業予定`
                      : "卒業年未設定"}
                  </span>
                </div>
                {application.students.skills && application.students.skills.length > 0 && (
                  <div className="flex items-start gap-2">
                    <User className="mt-0.5 h-4 w-4 text-gray-400" />
                    <div>
                      <span className="block">スキル:</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {application.students.skills.map((skill, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Separator className="my-4" />

              <div className="space-y-3">
                <h4 className="text-sm font-medium">求人情報</h4>
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="h-4 w-4 text-gray-400" />
                  <span>{application.jobs.job_title}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span>{application.jobs.location}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <Link href={`/jobs/${application.job_id}`} className="text-blue-600 hover:underline">
                    求人詳細を見る
                  </Link>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t p-4">
              <Button variant="outline" onClick={() => setIsStatusDialogOpen(true)}>
                ステータス変更
              </Button>
              <Button
                variant="default"
                className="bg-red-600 hover:bg-red-700"
                onClick={() => router.push(`/chat/${application.student_id}`)}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                メッセージを送る
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/company/applications/${application.id}/interview-schedule`)}
              >
                <Calendar className="mr-2 h-4 w-4" />
                面接日程管理
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* 右カラム - 応募詳細 */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader className="p-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">応募状況</CardTitle>
                <StatusBadge status={application.status} />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-6">
                {/* ステータス履歴 */}
                <div>
                  <h3 className="mb-3 text-sm font-medium">ステータス履歴</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full bg-green-100 p-1">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium">応募完了</div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(application.created_at), "yyyy年MM月dd日 HH:mm", { locale: ja })}
                        </div>
                      </div>
                    </div>

                    {application.status !== "pending" && (
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-full bg-blue-100 p-1">
                          <FileText className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium">書類選考中</div>
                          <div className="text-xs text-gray-500">
                            {format(new Date(application.updated_at), "yyyy年MM月dd日 HH:mm", { locale: ja })}
                          </div>
                        </div>
                      </div>
                    )}

                    {[
                      "interview_adjustment",
                      "interview_scheduled",
                      "interview_completed",
                      "offer",
                      "rejected",
                    ].includes(application.status) && (
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-full bg-purple-100 p-1">
                          <Calendar className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <div className="font-medium">面接調整中</div>
                          <div className="text-xs text-gray-500">
                            {format(new Date(application.updated_at), "yyyy年MM月dd日 HH:mm", { locale: ja })}
                          </div>
                        </div>
                      </div>
                    )}

                    {["interview_scheduled", "interview_completed", "offer", "rejected"].includes(
                      application.status,
                    ) && (
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-full bg-indigo-100 p-1">
                          <Calendar className="h-4 w-4 text-indigo-600" />
                        </div>
                        <div>
                          <div className="font-medium">面接予定</div>
                          <div className="text-xs text-gray-500">
                            {format(new Date(application.updated_at), "yyyy年MM月dd日 HH:mm", { locale: ja })}
                          </div>
                        </div>
                      </div>
                    )}

                    {["interview_completed", "offer", "rejected"].includes(application.status) && (
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-full bg-cyan-100 p-1">
                          <CheckCircle2 className="h-4 w-4 text-cyan-600" />
                        </div>
                        <div>
                          <div className="font-medium">面接完了</div>
                          <div className="text-xs text-gray-500">
                            {format(new Date(application.updated_at), "yyyy年MM月dd日 HH:mm", { locale: ja })}
                          </div>
                        </div>
                      </div>
                    )}

                    {application.status === "offer" && (
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-full bg-green-100 p-1">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <div className="font-medium">内定</div>
                          <div className="text-xs text-gray-500">
                            {format(new Date(application.updated_at), "yyyy年MM月dd日 HH:mm", { locale: ja })}
                          </div>
                        </div>
                      </div>
                    )}

                    {application.status === "rejected" && (
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-full bg-red-100 p-1">
                          <XCircle className="h-4 w-4 text-red-600" />
                        </div>
                        <div>
                          <div className="font-medium">不採用</div>
                          <div className="text-xs text-gray-500">
                            {format(new Date(application.updated_at), "yyyy年MM月dd日 HH:mm", { locale: ja })}
                          </div>
                        </div>
                      </div>
                    )}

                    {application.status === "cancelled" && (
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-full bg-gray-100 p-1">
                          <XCircle className="h-4 w-4 text-gray-600" />
                        </div>
                        <div>
                          <div className="font-medium">キャンセル</div>
                          <div className="text-xs text-gray-500">
                            {format(new Date(application.updated_at), "yyyy年MM月dd日 HH:mm", { locale: ja })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* 応募内容 */}
                <div>
                  <h3 className="mb-3 text-sm font-medium">応募内容</h3>

                  {application.self_pr && (
                    <div className="mb-4">
                      <div className="mb-1 text-sm font-medium">自己PR</div>
                      <div className="rounded-md border p-3 text-sm">
                        {application.self_pr.split("\n").map((line, i) => (
                          <p key={i} className={i > 0 ? "mt-2" : ""}>
                            {line}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {application.questions && (
                    <div className="mb-4">
                      <div className="mb-1 text-sm font-medium">質問への回答</div>
                      <div className="rounded-md border p-3 text-sm">
                        {application.questions.split("\n").map((line, i) => (
                          <p key={i} className={i > 0 ? "mt-2" : ""}>
                            {line}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {application.resume_url && (
                    <div className="mb-4">
                      <div className="mb-1 text-sm font-medium">履歴書</div>
                      <div className="flex items-center gap-2 rounded-md border p-3">
                        <FileText2 className="h-5 w-5 text-gray-400" />
                        <a
                          href={application.resume_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          履歴書を表示
                          <ExternalLink className="ml-1 inline h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  )}

                  {application.interview_dates && application.interview_dates.length > 0 && (
                    <div>
                      <div className="mb-1 text-sm font-medium">面接希望日</div>
                      <div className="space-y-2">
                        {application.interview_dates.map((date, index) => (
                          <div key={index} className="flex items-center gap-2 rounded-md border p-3">
                            <Calendar className="h-5 w-5 text-gray-400" />
                            <span className="text-sm">{formatInterviewDate(date)}</span>
                            {application.status === "interview_adjustment" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="ml-auto"
                                onClick={() => {
                                  // 面接日程を確定する処理
                                  // 実際の実装では、面接日程を確定するAPIを呼び出す
                                  toast({
                                    title: "面接日程を確定しました",
                                    description: `${formatInterviewDate(date)}に面接を設定しました`,
                                  })
                                }}
                              >
                                この日程で確定
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ステータス変更ダイアログ */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>応募ステータスの変更</DialogTitle>
            <DialogDescription>
              応募のステータスを更新します。応募者には更新されたステータスが通知されます。
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <div className="rounded-md border p-4">
                <div className="mb-2 font-medium">{application.jobs.job_title}</div>
                <div className="text-sm text-gray-500">応募者: {getStudentName()}</div>
              </div>

              <div className="space-y-2">
                <label htmlFor="status" className="text-sm font-medium">
                  新しいステータス
                </label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="ステータスを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">審査中</SelectItem>
                    <SelectItem value="document_screening">書類選考中</SelectItem>
                    <SelectItem value="interview_adjustment">面接調整中</SelectItem>
                    <SelectItem value="interview_scheduled">面接予定</SelectItem>
                    <SelectItem value="interview_completed">面接完了</SelectItem>
                    <SelectItem value="offer">内定</SelectItem>
                    <SelectItem value="rejected">不採用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
              キャンセル
            </Button>
            <Button
              variant="default"
              onClick={updateApplicationStatus}
              disabled={isUpdating || !newStatus || newStatus === application.status}
            >
              {isUpdating ? "更新中..." : "ステータスを更新"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
