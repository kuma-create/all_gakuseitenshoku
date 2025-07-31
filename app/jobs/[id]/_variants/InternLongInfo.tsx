"use client"

import React, { useState, useEffect, Dispatch, SetStateAction } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Building,
  Clock,
  Send,
  Star,
  Check,
  Plus,
  Users,
  Briefcase,
  ExternalLink,
  ListFilter,
  FileText,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"

/* ---------- types ---------- */
type Company = {
  id: string
  name: string | null
  logo: string | null
  cover_image_url: string | null
  industry: string | null
  founded_year: number | null
  employee_count: number | null
  location: string | null
  description: string | null
}

type Props = {
  job: any // SelectionRow
  company: Company
  tags: string[]
  related: any[]
  apply: () => void
  hasApplied: boolean
  showForm: boolean
  setShowForm: Dispatch<SetStateAction<boolean>>
}

export default function InternInfo({
  job,
  company,
  tags,
  related,
  apply,
  hasApplied,
  showForm,
  setShowForm,
}: Props) {
  const [isInterested, setIsInterested] = useState(false)
  const router = useRouter()

  const handleApplyClick = async () => {
    // 1) Check login state
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push("/login")
      return
    }

    // 2) Check if the user has finished account registration (i.e., has a student profile)
    const { data: profile, error } = await supabase
      .from("student_profiles")
      .select("id")
      .eq("user_id", session.user.id)
      .maybeSingle()

    if (error || !profile) {
      router.push("/signup")
      return
    }

    // 3) All good – show the application confirm dialog
    setShowForm(true)
  }

  useEffect(() => {
    // クライアントサイドのみ localStorage から取得
    const raw = typeof window !== "undefined" ? localStorage.getItem("savedInterns") : null
    const arr: string[] = raw ? JSON.parse(raw) : []
    setIsInterested(arr.includes(job.id))
  }, [job.id])

  /* computed */
  // Prefer intern_long_details; fall back to internship_details
  const details = job?.intern_long ?? job?.internship ?? {};
  const period =
    details?.period ??
    `${details?.start_date ?? "—"} 〜 ${details?.end_date ?? "—"}`
  const workingDays = details?.working_days ?? "応相談"
  const hourlyWage =
    job?.salary_min && job?.salary_max
      ? `${job.salary_min.toLocaleString()}〜${job.salary_max.toLocaleString()}円／時`
      : "要相談"

  const isNew =
    job?.created_at &&
    new Date(job.created_at).getTime() >
      Date.now() - 7 * 24 * 60 * 60 * 1000

  /* save toggle */
  const toggleSave = () => {
    const raw = localStorage.getItem("savedInterns")
    let arr: string[] = raw ? JSON.parse(raw) : []
    if (isInterested) arr = arr.filter((id) => id !== job.id)
    else arr.push(job.id)
    localStorage.setItem("savedInterns", JSON.stringify(arr))
    setIsInterested(!isInterested)
  }

  return (
    <main className="container mx-auto px-4 py-8 pb-24">
      {/* back */}
      <Link
        href="/internships" 
        className="mb-6 inline-flex items-center gap-1 text-xs text-gray-500 transition-colors hover:text-red-600 sm:text-sm"
      >
        <ArrowLeft size={16} />
        インターン一覧に戻る
      </Link>

      <div className="grid gap-6 md:grid-cols-3">
        {/* ---------- 左カラム ---------- */}
        <div className="md:col-span-2">
          {/* header */}
          <Card className="mb-6 overflow-hidden border-0 shadow-md">
            <div className="h-32 w-full bg-gradient-to-r from-red-500 to-red-600 opacity-90"></div>
            <CardContent className="relative -mt-16 bg-white p-6">
              <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <div className="relative h-20 w-20 overflow-hidden rounded-xl border-4 border-white bg-white shadow-md">
                  <Image
                    src={
                      company.logo ??
                      "/placeholder.svg?height=128&width=128&query=company logo"
                    }
                    alt="logo"
                    width={128}
                    height={128}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h1 className="text-xl font-bold text-gray-900 sm:text-2xl md:text-3xl">
                    {job.title}
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Link
                      href={`/companies/${company.id}`}
                      className="text-base font-medium text-red-600 hover:text-red-700 hover:underline sm:text-lg"
                    >
                      {company.name}
                    </Link>
                    {isNew && (
                      <Badge className="bg-red-500 text-xs font-medium text-white">
                        新着
                      </Badge>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tags.map((t, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="bg-red-50 text-xs text-red-700"
                      >
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* summary */}
              <div className="grid grid-cols-1 gap-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-700 sm:grid-cols-2">
                <SummaryItem
                  icon={<Calendar size={16} />}
                  label="期間"
                  value={period}
                />
                <SummaryItem
                  icon={<Clock size={16} />}
                  label="勤務日数"
                  value={workingDays}
                />
                <SummaryItem
                  icon={<Briefcase size={16} />}
                  label="報酬"
                  value={hourlyWage}
                />
                <SummaryItem
                  icon={<MapPin size={16} />}
                  label="勤務地"
                  value={job.location ?? "オンライン可"}
                />
              </div>
            </CardContent>
          </Card>

          {/* description */}
          {job.description && (
            <SectionCard title="インターン内容">
              <p className="whitespace-pre-wrap text-gray-700">
                {job.description}
              </p>
            </SectionCard>
          )}

          {/* requirements */}
          <SectionCard title="応募条件">
            {job.requirements ? (
              <ul className="space-y-2 text-sm text-gray-700">
                {job.requirements
                  .split("\n")
                  .filter(Boolean)
                  .map((r: string, i: number) => (
                    <li key={i} className="flex gap-2">
                      <Plus size={16} className="text-red-600 mt-0.5" />
                      <span>{r}</span>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-700">—</p>
            )}
          </SectionCard>
          {/* 備考 */}
          <SectionCard title="備考" icon={<FileText size={16} />}>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex gap-2">
                <span>
                  交通費: {details?.travel_expense ?? "—"}
                </span>
              </li>
              <li className="flex gap-2">
                <span>
                  最寄駅: {details?.nearest_station ?? "—"}
                </span>
              </li>
              <li className="flex gap-2">
                <span>
                  福利厚生: {details?.benefits ?? "—"}
                </span>
              </li>
            </ul>
          </SectionCard>
        </div>

        {/* ---------- 右カラム ---------- */}
        <div className="space-y-6">
          {/* apply & save */}
          <Card className="sticky top-4 z-30 bg-white border-0 shadow-md">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="rounded-lg bg-red-50 p-4 text-center">
                  <h3 className="text-lg font-bold text-red-700">
                    このインターンに応募しますか？
                  </h3>
                  <p className="mt-1 text-sm text-gray-700">
                    応募は 1 分で完了します
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  {hasApplied ? (
                    <Button disabled className="w-full bg-green-600 hover:bg-green-700">
                      <Check size={16} className="mr-1" />
                      応募済み
                    </Button>
                  ) : (
                    <Button
                      className="w-full bg-red-600 hover:bg-red-700"
                      onClick={handleApplyClick}
                    >
                      <Send size={16} className="mr-2" />
                      このインターンに応募する
                    </Button>
                  )}

                  <Button
                    variant={isInterested ? "default" : "outline"}
                    className={`w-full gap-1 ${
                      isInterested ? "bg-yellow-500 hover:bg-yellow-600" : ""
                    }`}
                    onClick={toggleSave}
                  >
                    <Star
                      size={16}
                      className={isInterested ? "fill-current" : ""}
                    />
                    <span>
                      {isInterested ? "興味ありに登録済み" : "興味ありに登録"}
                    </span>
                  </Button>
                </div>
              </div>
            </CardContent>

            <Dialog open={showForm} onOpenChange={setShowForm}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-center text-gray-800">
                    下記の内容で応募を確定しますか？
                  </DialogTitle>
                </DialogHeader>

                <DialogFooter className="flex flex-col gap-2">
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={async () => {
                      try {
                        // 1) 既存の apply() を呼び出し、applications テーブルに応募を登録
                        const result = await apply();
                        console.log('応募APIのレスポンス:', result);
                        toast({ title: "応募が完了しました 🎉" });

                        // 2) ログイン中ユーザーの student_profiles.id を取得
                        const {
                          data: { session },
                        } = await supabase.auth.getSession();
                        const { data: profileData, error: profileErr } = await supabase
                          .from("student_profiles")
                          .select("id")
                          .eq("user_id", session!.user.id)
                          .maybeSingle();
                        if (profileErr || !profileData) {
                          throw profileErr || new Error("プロフィール取得エラー");
                        }

                        // 3) chat_rooms テーブルに upsert (存在しなければ新規作成)し、select().single()で取得
                        const { data: room, error: roomErr } = await supabase
                          .from("chat_rooms")
                          .upsert(
                            {
                              company_id: company.id,
                              student_id: profileData.id,
                              job_id: job.id,
                            },
                            {
                              onConflict: "company_id,student_id,job_id",
                            }
                          )
                          .select()
                          .single();
                        if (roomErr) throw roomErr;

                        // 4) 応募メッセージを自動送信
                        const { error: msgErr } = await supabase
                          .from("messages")
                          .insert({
                            chat_room_id: room.id,
                            sender_id:    profileData.id,        // 学生を送信者として記録
                            content:      "インターンに応募しました！！",
                          });
                        if (msgErr) console.error("auto-message error", msgErr);

                        // 5) チャットルームへ遷移
                        router.push(`/chat/${room.id}`);
                        setShowForm(false);
                      } catch (err: any) {
                        console.error("apply error", err);
                        toast({
                          title: "応募またはチャットルーム作成に失敗しました",
                          description:
                            typeof err?.message === "string"
                              ? err.message
                              : "ネットワークまたはサーバーエラーが発生しました",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <Check size={16} className="mr-2" />
                    応募を確定する
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowForm(false)}
                  >
                    キャンセル
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </Card>

          {/* company info */}
          <SectionCard title="企業情報">
            <CompanyInfo company={company} />
          </SectionCard>

          {/* related */}
          <Card className="border-0 shadow-md">
            <CardHeader className="border-b border-gray-100 bg-gray-50 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <ListFilter className="h-5 w-5 text-red-600" />
                関連インターン
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {related.length ? (
                <ul className="space-y-2 text-sm">
                  {related.map((r: any) => (
                    <li key={r.id} className="flex items-center gap-2">
                      <Link
                        href={`/jobs/${r.id}`}
                        className="hover:text-red-600 hover:underline"
                      >
                        {r.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center text-sm text-gray-500">
                  関連するインターンはありません
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}

/* ---------- small components ---------- */
function SummaryItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600">
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  )
}

function SectionCard({
  title,
  children,
  icon,
}: {
  title: string
  children: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <Card className="mb-6 border-0 shadow-md">
      <CardHeader className="border-b border-gray-100 bg-gray-50 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-bold text-red-600">
          {icon && icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">{children}</CardContent>
    </Card>
  )
}

function CompanyInfo({ company }: { company: Company }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative h-14 w-14 overflow-hidden rounded-lg border border-gray-200">
          <Image
            src={
              company.logo ??
              "/placeholder.svg?height=56&width=56&query=company logo"
            }
            alt="logo"
            width={56}
            height={56}
            className="h-full w-full object-cover"
          />
        </div>
        <div>
          <h3 className="font-bold">{company.name}</h3>
          <p className="text-sm text-gray-500">{company.industry}</p>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <InfoLine icon={<MapPin size={16} />} text={company.location} />
        <InfoLine
          icon={<Users size={16} />}
          text={`社員数：${company.employee_count ?? "非公開"}名`}
        />
        <InfoLine
          icon={<Calendar size={16} />}
          text={`設立：${company.founded_year ?? "非公開"}年`}
        />
      </div>

      {company.description && (
        <p className="whitespace-pre-wrap text-sm text-gray-700">
          {company.description}
        </p>
      )}

      <div className="flex justify-center">
        <Button variant="outline" size="sm" asChild className="gap-1">
          <Link href={`/companies/${company.id}`}>
            <ExternalLink size={14} />
            企業詳細を見る
          </Link>
        </Button>
      </div>
    </div>
  )
}

function InfoLine({
  icon,
  text,
}: {
  icon: React.ReactNode
  text: string | null
}) {
  if (!text) return null
  return (
    <div className="flex items-center gap-2 text-gray-600">
      {icon}
      <span className="text-sm">{text}</span>
    </div>
  )
}