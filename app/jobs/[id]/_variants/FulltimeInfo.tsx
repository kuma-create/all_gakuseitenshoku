"use client"

import Image from "next/image"
import Link from "next/link"
import type { Dispatch, SetStateAction } from "react"
import {
  ArrowLeft,
  Briefcase,
  Building,
  Calendar,
  Check,
  CheckCircle,
  Clock,
  ExternalLink,
  FileText,
  ListFilter,
  MapPin,
  Plus,
  Quote,
  Send,
  Star,
  Users,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"

/* ---------- 型 ---------- */
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
  job: any
  company: Company
  tags: string[]
  related: any[]
  apply: () => void
  hasApplied: boolean
  showForm: boolean
  setShowForm: Dispatch<SetStateAction<boolean>>
}

/* ---------- Component ---------- */
export default function FulltimeInfo({
  job,
  company,
  tags,
  related,
  apply,
  hasApplied,
  showForm,
  setShowForm,
}: Props) {
  /* ----- local state (保存済み) ----- */
  const [isInterested, setIsInterested] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // クライアントサイドのみ localStorage から取得
    const raw = typeof window !== "undefined" ? localStorage.getItem("savedJobs") : null
    const arr: string[] = raw ? JSON.parse(raw) : []
    setIsInterested(arr.includes(job.id))
  }, [job.id])

  const toggleSaveJob = () => {
    const savedJobsFromStorage = localStorage.getItem("savedJobs")
    let savedJobs: string[] = savedJobsFromStorage ? JSON.parse(savedJobsFromStorage) : []
    if (isInterested) savedJobs = savedJobs.filter((id) => id !== job.id)
    else savedJobs.push(job.id)
    localStorage.setItem("savedJobs", JSON.stringify(savedJobs))
    setIsInterested(!isInterested)
  }

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

  /* ----- helpers ----- */
  const salary =
    job?.salary_min && job?.salary_max
      ? `年収${job.salary_min}万円〜${job.salary_max}万円`
      : "非公開"

  const isNew =
    job?.created_at &&
    new Date(job.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <main className="container mx-auto px-4 py-8">
        {/* Back link */}
        <div className="mb-6 flex items-center gap-2">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1 text-xs text-gray-500 transition-colors hover:text-red-600 sm:text-sm"
          >
            <ArrowLeft size={16} />
            <span>求人一覧に戻る</span>
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* ---------------- 左カラム ---------------- */}
          <div className="md:col-span-2">
            {/* Header */}
            <Card className="mb-6 overflow-hidden border-0 shadow-md">
              <div className="h-32 w-full bg-gradient-to-r from-red-500 to-red-600 opacity-90"></div>
              <CardContent className="relative -mt-16 bg-white p-6">
                <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                  <div className="relative h-20 w-20 overflow-hidden rounded-xl border-4 border-white bg-white shadow-md">
                    <Image
                      src={company?.logo ?? "/placeholder.svg?height=128&width=128&query=company logo"}
                      alt={`${company?.name} のロゴ`}
                      width={128}
                      height={128}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-xl font-bold text-gray-900 sm:text-2xl md:text-3xl">
                      {job?.title}
                    </h1>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Link
                        href={`/companies/${company?.id}`}
                        className="text-base font-medium text-red-600 hover:text-red-700 hover:underline sm:text-lg"
                      >
                        {company?.name}
                      </Link>
                      {isNew && (
                        <Badge className="bg-red-500 text-xs font-medium uppercase text-white">
                          新着
                        </Badge>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {tags.map((tag, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="bg-red-50 text-xs text-red-700"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* summary grid */}
                <div className="grid grid-cols-1 gap-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-700 sm:grid-cols-2">
                  <SummaryItem icon={<MapPin size={16} />} label="勤務地" value={job?.location} />
                  <SummaryItem icon={<Building size={16} />} label="勤務形態" value={job?.work_style ?? "ハイブリッド"} />
                  <SummaryItem icon={<Briefcase size={16} />} label="給与" value={salary} />
                  <SummaryItem
                    icon={<Calendar size={16} />}
                    label="応募締切"
                    value={
                      job?.deadline
                        ? new Date(job.deadline).toLocaleDateString("ja-JP")
                        : "期限なし"
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* description */}
            {job?.description && (
              <SectionCard icon={FileText} title="業務内容">
                <div
                  className="prose max-w-none text-gray-700"
                  dangerouslySetInnerHTML={{
                    __html: job.description.replace(/\n/g, "<br />"),
                  }}
                />
              </SectionCard>
            )}

            {/* requirements */}
            <SectionCard icon={CheckCircle} title="応募条件・スキル">
              <RequirementBlock
                title="応募資格"
                icon={<Check size={16} />}
                list={job?.requirements}
              />
              {job?.preferred_skills && (
                <RequirementBlock
                  title="歓迎スキル"
                  icon={<Plus size={16} />}
                  list={job.preferred_skills}
                />
              )}
            </SectionCard>

            {/* working conditions */}
            <SectionCard icon={Clock} title="勤務時間・給与">
              <div className="space-y-5">
                <ConditionBox title="勤務時間" text={job?.working_hours ?? "9:00〜18:00（休憩1時間）"} />
                <ConditionBox title="給与" text={`${salary}（経験・能力により決定）`} />
                <div>
                  <h3 className="mb-3 text-base font-medium">福利厚生</h3>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {(job?.benefits ?? "").split("\n").filter(Boolean).map((b: string, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <Check size={16} className="text-green-600" />
                        <span className="text-gray-700">{b}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>

          {/* ---------------- 右カラム ---------------- */}
          <RightColumn
            company={company}
            job={job}
            related={related}
            isInterested={isInterested}
            toggleSaveJob={toggleSaveJob}
            hasApplied={hasApplied}
            showForm={showForm}
            setShowForm={setShowForm}
            apply={apply}
            handleApplyClick={handleApplyClick}
          />
        </div>
      </main>
    </div>
  )
}

/* ---------- small components ---------- */
function SummaryItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
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

function SectionCard({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <Card className="mb-6 border-0 shadow-md">
      <CardHeader className="border-b border-gray-100 bg-gray-50 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-bold">
          <Icon className="h-5 w-5 text-red-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">{children}</CardContent>
    </Card>
  )
}

function RequirementBlock({ title, icon, list }: { title: string; icon: React.ReactNode; list?: string }) {
  if (!list) return null
  return (
    <div className="mb-6 last:mb-0">
      <h3 className="mb-3 text-base font-medium">{title}</h3>
      <ul className="space-y-2 text-gray-700">
        {list.split("\n").filter(Boolean).map((l: string, i: number) => (
          <li key={i} className="flex items-start gap-2">
            <div className="mt-1 text-red-600">{icon}</div>
            <span>{l}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ConditionBox({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-4">
      <h3 className="mb-2 text-base font-medium">{title}</h3>
      <p className="text-gray-700">{text}</p>
    </div>
  )
}

function RightColumn({
  company,
  job,
  related,
  isInterested,
  toggleSaveJob,
  hasApplied,
  showForm,
  setShowForm,
  apply,
  handleApplyClick,
}: any) {
  const router = useRouter();
  /* local imports inside to avoid clutter */

  return (
    <div className="space-y-6">
      {/* Apply / Save */}
      <Card className="sticky top-4 border-0 shadow-md">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="rounded-lg bg-red-50 p-4 text-center">
              <h3 className="text-lg font-bold text-red-700">この求人に興味がありますか？</h3>
              <p className="mt-1 text-sm text-gray-700">応募はカンタン1分で完了します</p>
            </div>

            <div className="flex flex-col gap-3">
              {hasApplied ? (
                <Button disabled className="w-full bg-green-600 hover:bg-green-700">
                  <Check size={16} className="mr-1" />
                  応募済み
                </Button>
              ) : job.status === "closed" ? (
                <Button disabled className="w-full bg-gray-400">募集終了</Button>
              ) : (
                <Button
                  className="w-full bg-red-600 hover:bg-red-700"
                  onClick={handleApplyClick}
                >
                  <Send size={16} className="mr-2" />
                  この求人に応募する
                </Button>
              )}

              <Button
                variant={isInterested ? "default" : "outline"}
                className={`w-full gap-1 ${isInterested ? "bg-yellow-500 hover:bg-yellow-600" : ""}`}
                onClick={toggleSaveJob}
              >
                <Star size={16} className={isInterested ? "fill-current" : ""} />
                <span>{isInterested ? "興味ありに登録済み" : "興味ありに登録"}</span>
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
                    // 1) 応募処理
                    await apply();
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
                    // 3) chat_rooms テーブルに upsert して単一レコードを取得
                    const { data: room, error: roomErr } = await supabase
                      .from("chat_rooms")
                      .upsert(
                        {
                          company_id: company.id,
                          student_id: profileData.id,
                          job_id: job.id,
                        },
                        { onConflict: "company_id,student_id" } // company_id × student_id で一意
                      )
                      .select()
                      .single();
                    if (roomErr) throw roomErr;

                    // 4) 応募メッセージを自動送信
                    const { error: msgErr } = await supabase
                      .from("messages")
                      .insert({
                        chat_room_id: room.id,
                        sender_id:    profileData.id,      // 学生を送信者として記録
                        content:      "選考に応募しました！！",
                      });
                    if (msgErr) console.error("auto-message error", msgErr);

                    // 5) チャット画面へ遷移
                    router.push(`/chat/${room.id}`);
                    setShowForm(false);
                  } catch (err) {
                    console.error("apply & chat room error", err);
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

      {/* Company info */}
      <Card className="border-0 shadow-md">
        <CardHeader className="border-b border-gray-100 bg-gray-50 pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <Building className="h-5 w-5 text-red-600" />
            企業情報
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-gray-200">
              <Image
                src={company?.logo ?? "/placeholder.svg?height=64&width=64&query=company logo"}
                alt={`${company?.name}のロゴ`}
                width={64}
                height={64}
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <h3 className="text-lg font-bold">{company?.name}</h3>
              <p className="text-sm text-gray-500">{company?.industry}</p>
            </div>
          </div>

          <div className="mb-4 space-y-3 text-sm">
            <InfoLine icon={<MapPin size={16} />} text={company?.location} />
            <InfoLine icon={<Users size={16} />} text={`社員数：${company?.employee_count ?? "非公開"}名`} />
            <InfoLine icon={<Calendar size={16} />} text={`設立：${company?.founded_year ?? "非公開"}年`} />
          </div>

          {company?.description && (
            <div className="mb-4 rounded-lg bg-gray-50 p-4">
              <h4 className="mb-2 text-sm font-medium">会社概要</h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {company.description}
              </p>
            </div>
          )}

          <div className="flex justify-center">
            <Button variant="outline" size="sm" asChild className="gap-1">
              <Link href={`/companies/${company?.id}`}>
                <ExternalLink size={14} />
                企業詳細を見る
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Related jobs */}
      <Card className="border-0 shadow-md">
        <CardHeader className="border-b border-gray-100 bg-gray-50 pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <ListFilter className="h-5 w-5 text-red-600" />
            関連求人
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {related.length ? (
            <div className="space-y-4">
              {related.map((rel: any) => (
                <div
                  key={rel.id}
                  className="flex gap-3 border-b border-gray-100 pb-4 last:border-0 last:pb-0"
                >
                  <div className="relative h-12 w-12 overflow-hidden rounded-md border border-gray-200">
                    <Image
                      src={
                        rel.company?.logo ||
                        "/placeholder.svg?height=48&width=48&query=company logo"
                      }
                      alt={rel.company?.name || "logo"}
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">
                      <Link
                        href={`/jobs/${rel.id}`}
                        className="hover:text-red-600 hover:underline"
                      >
                        {rel.title}
                      </Link>
                    </h4>
                    <p className="text-xs text-gray-500">{rel.company?.name}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                      <MapPin size={12} />
                      <span>{rel.location}</span>
                      <span>•</span>
                      <span>年収{rel.salary_min}万円〜</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-gray-500">
              関連する求人はありません
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ----------- helper ----------- */
function InfoLine({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string | null;
}) {
  if (!text) return null;
  return (
    <div className="flex items-start gap-2">
      {icon}
      <span className="text-gray-700">{text}</span>
    </div>
  );
}