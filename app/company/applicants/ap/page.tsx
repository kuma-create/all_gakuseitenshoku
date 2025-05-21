"use client"

/* ------------------------------------------------------------------
   応募者詳細 – 会社ダッシュボード
   - applications  ↔  student_profiles  ↔  jobs
   - skills, interests は jsonb 配列で保持している前提
------------------------------------------------------------------- */

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import useSWR from "swr"
import Link from "next/link"
import {
  Calendar,
  ChevronRight,
  Download,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  School,
  Star,
  User,
} from "lucide-react"

import { supabase } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/types"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { notFound } from "next/navigation";

import type { ReactElement } from "react";

/* ---------- 型 ---------- */
type ApplicationRow =
  Database["public"]["Tables"]["applications"]["Row"];
type StudentRow =
  Database["public"]["Tables"]["student_profiles"]["Row"];
type JobRow = Database["public"]["Tables"]["jobs"]["Row"];

/** 取得オブジェクト */
export type ApplicantDetail = {
  application: ApplicationRow;            // applications の行そのまま
  student: StudentRow;                    // student_profiles の行そのまま
  job: Pick<JobRow, "id" | "title">;      // jobs の必要最小限
};

/* ---------- Status 表示定義 ---------- */
export const STATUS_OPTIONS = [
  "未対応",
  "書類選考中",
  "一次面接調整中",
  "一次面接済",
  "二次面接調整中",
  "二次面接済",
  "最終面接調整中",
  "最終面接済",
  "内定",
  "内定辞退",
  "不採用",
] as const

const statusColorMap: Record<string, string> = {
  未対応: "bg-gray-500",
  書類選考中: "bg-blue-500",
  一次面接調整中: "bg-indigo-500",
  一次面接済: "bg-purple-500",
  二次面接調整中: "bg-violet-500",
  二次面接済: "bg-fuchsia-500",
  最終面接調整中: "bg-pink-500",
  最終面接済: "bg-rose-500",
  内定: "bg-green-500",
  内定辞退: "bg-yellow-500",
  不採用: "bg-red-500",
}

/* ---------- データ取得 ---------- */
async function fetchApplicantDetail(appId: string): Promise<ApplicantDetail | null> {
  const { data, error } = await supabase
    .from("applications")
    .select(
      `
        id,
        status,
        applied_at,
        interest_level,
        self_pr,
        resume_url,
        student:student_profiles (
          id,
          full_name,
          university,
          faculty,
          academic_year,
          graduation_year,
          hometown,
          email,
          phone,
          skills,
          interests,
          preferred_industries
        ),
        job:jobs (
          id,
          title
        )
      `,
    )
    .eq("id", appId)
    .single()

  if (error) throw error
  return data as unknown as ApplicantDetail
}

export default function ApplicantProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { applicantId } = params as { applicantId: string };
  const applicationId = applicantId;

  /* --- 取得 --- */
  const {
    data: detail,
    mutate,
    error,
    isLoading,
  } = useSWR(
    applicationId ? `application-${applicationId}` : null,
    () => fetchApplicantDetail(applicationId),
  )

  if (isLoading) return <p className="p-8">Loading...</p>
  if (error) return <p className="p-8 text-red-600">{error.message}</p>
  if (!detail) notFound();

  /* --- ローカル State --- */
  type Status = (typeof STATUS_OPTIONS)[number] | null;
  const [status, setStatus] = useState<Status>(detail.application.status)
  const [isFavorite, setIsFavorite] = useState(
    (detail.application.interest_level ?? 0) >= 80,
  ) // お気に入り判定ロジックは適宜

  /* ---------- ハンドラ ---------- */
  const handleStatusChange = (newStatus: string) => {
    const cast = newStatus as Status;
    if (!cast) return;
    setStatus(cast);
    supabase
      .from("applications")
      .update({ status: cast })
      .eq("id", detail.application.id)
      .then(() => mutate());
  };

  const toggleFavorite = async () => {
    const nextFav = !isFavorite
    setIsFavorite(nextFav)
    const interest = nextFav ? 100 : detail.application.interest_level ?? 0
    await supabase
      .from("applications")
      .update({ interest_level: interest })
      .eq("id", detail.application.id)
    mutate()
  }

  const navigateToChat = () => {
    router.push(`/company/chat/${detail.student.id}`)
  }

  const badgeColor = status ? statusColorMap[status] : "bg-gray-500";

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-gray-500 mb-6">
        <Link href="/company/applicants" className="hover:text-gray-700">
          応募者一覧
        </Link>
        <ChevronRight className="h-4 w-4 mx-2" />
        <span className="font-medium text-gray-900">{detail.student.full_name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* -------- Main Content -------- */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl font-bold">
                    {detail.student.full_name}
                  </CardTitle>
                  <CardDescription className="flex items-center mt-1">
                    <School className="h-4 w-4 mr-1" />
                    {detail.student.university} {detail.student.faculty}
                  </CardDescription>
                </div>
                <Badge
                  className={`${badgeColor} text-white px-3 py-1 text-sm`}
                >
                  {status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row justify-between text-sm text-gray-500">
                <div className="flex items-center mb-2 sm:mb-0">
                  <Calendar className="h-4 w-4 mr-1" />
                  応募日: {detail.application.applied_at}
                </div>
                <div>応募職種: {detail.job.title}</div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="basic-info" className="w-full">
            <TabsList className="grid grid-cols-3 mb-6">
              <TabsTrigger value="basic-info">基本情報</TabsTrigger>
              <TabsTrigger value="self-intro">自己PR・職務経歴</TabsTrigger>
              <TabsTrigger value="skills">スキル・志望業界</TabsTrigger>
            </TabsList>

            {/* --- Basic Info --- */}
            <TabsContent value="basic-info">
              <Card>
                <CardHeader>
                  <CardTitle>基本情報</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(() => {
                      const basicItems: {
                        icon: ReactElement;
                        label: string;
                        value: string | number | null | undefined;
                      }[] = [
                        { icon: <User className="h-5 w-5 mr-2 text-gray-500 mt-0.5" />, label: "学年", value: detail.student.academic_year },
                        { icon: <Calendar className="h-5 w-5 mr-2 text-gray-500 mt-0.5" />, label: "卒業予定年", value: detail.student.graduation_year },
                        { icon: <MapPin className="h-5 w-5 mr-2 text-gray-500 mt-0.5" />, label: "出身地", value: detail.student.hometown },
                        { icon: <Mail className="h-5 w-5 mr-2 text-gray-500 mt-0.5" />, label: "メールアドレス", value: detail.student.email },
                        { icon: <Phone className="h-5 w-5 mr-2 text-gray-500 mt-0.5" />, label: "電話番号", value: detail.student.phone },
                      ];
                      return basicItems.map(({ icon, label, value }) => (
                        <div key={label} className="flex items-start">
                          {icon}
                          <div>
                            <p className="text-sm font-medium text-gray-500">{label}</p>
                            <p>{value ?? "—"}</p>
                          </div>
                        </div>
                      ))
                    })()}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* --- Self Intro --- */}
            <TabsContent value="self-intro">
              <Card>
                <CardHeader>
                  <CardTitle>自己PR・職務経歴</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">自己PR</h3>
                    <div className="whitespace-pre-line text-gray-700">
                      {detail.application.self_pr}
                    </div>
                  </div>

                  {Boolean(detail.application.resume_url) && (
                    <div>
                      <h3 className="text-lg font-medium mb-2">職務経歴書</h3>
                      <a
                        href={detail.application.resume_url as string}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline" className="flex items-center">
                          <Download className="h-4 w-4 mr-2" />
                          職務経歴書をダウンロード
                        </Button>
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* --- Skills --- */}
            <TabsContent value="skills">
              <Card>
                <CardHeader>
                  <CardTitle>スキル・志望業界</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">スキル</h3>
                    <div className="flex flex-wrap gap-2">
                      {detail.student.skills?.map((s) => (
                        <Badge key={s} variant="secondary">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-2">興味・関心</h3>
                    <div className="flex flex-wrap gap-2">
                      {detail.student.interests?.map((i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="bg-purple-50 text-purple-700 border-purple-200"
                        >
                          #{i}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-2">志望業界</h3>
                    <div className="flex flex-wrap gap-2">
                      {((detail.student.preferred_industries ?? []) as string[]).map((ind) => (
                        <Badge
                          key={ind}
                          variant="outline"
                          className="bg-blue-50 text-blue-700 border-blue-200"
                        >
                          {ind}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* -------- Sidebar -------- */}
        <div className="space-y-6">
          {/* Action Card */}
          <Card>
            <CardHeader>
              <CardTitle>アクション</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                className="w-full flex items-center justify-center"
                size="lg"
                onClick={navigateToChat}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                チャットを開始
              </Button>

              {/* status change */}
              <div className="space-y-2">
                <label className="text-sm font-medium">ステータスを変更</label>
                <Select value={status ?? ""} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="ステータスを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* favorite */}
              <Button
                variant={isFavorite ? "default" : "outline"}
                className="w-full flex items-center justify-center"
                onClick={toggleFavorite}
              >
                {isFavorite ? (
                  <>
                    <Star className="h-4 w-4 mr-2 fill-current" />
                    お気に入りから削除
                  </>
                ) : (
                  <>
                    <Star className="h-4 w-4 mr-2" />
                    お気に入りに追加
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* ここにタイムラインやメモなど、既存 UI コンポーネントをそのまま配置 */}
        </div>
      </div>
    </div>
  )
}