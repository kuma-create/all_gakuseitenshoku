// app/offers/[id]/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Building,
  Calendar,
  Clock,
  ExternalLink,
  MapPin,
  MessageSquare,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react"
import Link from "next/link"

import { supabase } from "@/lib/supabase/client"
import { LazyImage } from "@/components/ui/lazy-image"
import { Button } from "@/components/ui/button"
import type { Database } from "@/lib/supabase/types";
type ChatRoom = Database["public"]["Functions"]["get_or_create_chat_room_from_scout"]["Returns"];
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
// ── プレースホルダ置換ユーティリティ ────────────────
function personalize(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? "")
}
// ───────────────────────────────────────────
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

/* ---------------------------- 表示用ユーティリティ ---------------------------- */
/** 「300-600」→「300-600万円」のように末尾に「万円」を付与する */
const formatSalary = (s?: string | null) =>
  s && !s.endsWith("万円") ? `${s}万円` : s ?? "";
/* --------------------------------------------------------------------------- */

/* ------------------------------------------------------------------ */
/*                               型定義                                */
/* ------------------------------------------------------------------ */
interface OfferDetail {
  /* scouts */
  id: string
  message: string
  status: string
  created_at: string | null

  /* jobs */
  position: string | null

  /* companies */
  company_name: string
  logo: string | null
  description: string | null
  employee_count: number | null
  founded_year: number | null
  industry: string | null
  website: string | null

  /* 追加情報（UI 用） */
  title: string
  detailedMessage: string
  location: string
  workStyle: string
  salary: string | null
  benefits: string[]
  skills: string[]
  culture: string[]
  testimonials: { name: string; position: string; comment: string }[]

  /* companyInfo ブロック用まとめ */
  companyInfo: {
    employees: string
    founded: string
    industry: string
    website: string
    description: string | null
    culture: string[]
    testimonials: { name: string; position: string; comment: string }[]
  }
}

/* 一時的なクエリ結果型：Supabase がリレーションを解決できない場合に備えて */
type ScoutWithRelations = {
  id: string
  message: string
  status: string | null
  created_at: string | null
  offer_amount: string | null
  offer_position: string | null
  companies: {
    name: string
    logo: string | null
    description: string | null
    employee_count: number | null
    founded_year: number | null
    industry: string | null
    website: string | null
  } | null
  jobs: {
    title: string | null
    salary_range: string | null
  } | null
}

/* ------------------------------------------------------------------ */
/*                               画面                                  */
/* ------------------------------------------------------------------ */
export default function OfferDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [offer, setOffer] = useState<OfferDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /* ------------------------------ fetch ----------------------------- */
  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)

      try {
        // id が取れなければ即エラー
        if (!id) {
          throw new Error("URL が不正です（id が取得できません）")
        }

        /* ① 学生氏名を取得 ----------------------- */
        const {
          data: { user },
        } = await supabase.auth.getUser()

        let fullName = ""
        if (user?.id) {
          const { data: profile } = await supabase
            .from("student_profiles")
            .select("full_name")
            .eq("user_id", user.id)
            .single()
          fullName = profile?.full_name ?? ""
        }
        /* --------------------------------------- */

        /* ② scouts, companies, jobs を取得 ------- */
        const { data, error } = await supabase
          .from("scouts")
          .select(
            `
             id,
             message,
             status,
             created_at,
             offer_amount,
             offer_position,
             companies!fk_scouts_company (
               name,
               logo,
               description,
               employee_count,
               founded_year,
               industry,
               website
             ),
             jobs!scouts_job_id_fkey (
               title,
               salary_range
             )
           `
          )
          .eq("id", id)
          .maybeSingle()
          .returns<ScoutWithRelations>();

        if (error) {
          throw error;               // Supabase error → catch へ
        }
        if (!data) {
          throw new Error("オファーが見つかりません");
        }

        const personalizedMsg = personalize(data.message, {
          name:     fullName,
          company:  data.companies?.name ?? "",
          position: data.offer_position ?? data.jobs?.title ?? "",
        })

        /* ③ クエリ結果 → 画面用構造に変換 -------- */
        setOffer({
          // scouts
          id: data.id,
          message: personalizedMsg,
          status:
            data.status === "rejected"
              ? "declined"
              : (data.status as "sent" | "accepted" | "declined") ?? "sent",
          created_at: data.created_at,

          // jobs
          position: data.offer_position ?? data.jobs?.title ?? null,

          // companies
          company_name: data.companies?.name ?? "",
          logo: data.companies?.logo ?? null,
          description: data.companies?.description ?? null,
          employee_count: data.companies?.employee_count ?? null,
          founded_year: data.companies?.founded_year ?? null,
          industry: data.companies?.industry ?? null,
          website: data.companies?.website ?? null,

          // 追加情報
          title: data.jobs?.title ?? "タイトル未設定",
          detailedMessage: personalizedMsg,
          location: "未設定",
          workStyle: "未設定",
          salary:
            data.offer_amount && data.offer_amount !== "テスト"
            ? data.offer_amount
            : (data.jobs?.salary_range && data.jobs.salary_range !== "テスト"
              ? data.jobs.salary_range
              : null),
          benefits: [],
          skills: [],
          culture: [],
          testimonials: [],

          // companyInfo
          companyInfo: {
            employees: data.companies?.employee_count
              ? `${data.companies.employee_count}名`
              : "未設定",
            founded: data.companies?.founded_year
              ? `${data.companies.founded_year}`
              : "未設定",
            industry: data.companies?.industry ?? "未設定",
            website: data.companies?.website ?? "",
            description: data.companies?.description ?? null,
            culture: [],
            testimonials: [],
          },
        })
      } catch (e: any) {
        console.error(e)
        setError(e?.message ?? "不明なエラーが発生しました。")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [id])

  /* ------------------------------ UI ------------------------------- */
  if (loading) return <p className="p-6 text-center">読み込み中…</p>
  if (error || !offer)
    return <p className="p-6 text-center text-red-600">{error}</p>

  const dateLabel = offer.created_at
    ? new Date(offer.created_at).toLocaleDateString("ja-JP")
    : ""
  const isNew = offer.status === "sent"
  const isUnread = offer.status === "sent"

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <main className="container mx-auto px-4 pt-2 pb-8">
        {/* 戻るリンク */}
        <div className="mb-6">
          <Link
            href="/offers"
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" /> オファー一覧へ戻る
          </Link>
        </div>

        {/* ───────── ヘッダー ───────── */}
        <div className="mb-6 rounded-lg border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <LazyImage
              src={offer.logo ?? "/placeholder.svg"}
              alt={`${offer.company_name} のロゴ`}
              width={64}
              height={64}
              className="rounded-lg border object-cover"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{offer.company_name}</h1>
                {isNew && <Badge className="bg-red-500">新着</Badge>}
                <Badge
                  variant={isUnread ? "outline" : "secondary"}
                  className={
                    isUnread ? "border-blue-200 bg-blue-50 text-blue-700" : ""
                  }
                >
                  {offer.status}
                </Badge>
              </div>
              {offer.position && (
                <p className="mt-1 text-sm text-gray-600">{offer.position}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">{dateLabel} 受信</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* ───────── 左カラム ───────── */}
          <div className="space-y-6 md:col-span-2">
            {/* サマリー */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{offer.title}</CardTitle>
                <CardDescription>オファー概要</CardDescription>
              </CardHeader>
              <CardContent>

                {/* 属性テーブル */}
                <div className="mt-4 grid grid-cols-2 gap-3 bg-gray-50 p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span>勤務地: {offer.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span>勤務形態: {offer.workStyle}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span>受信日: {dateLabel}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-gray-500" />
                    <span>業種: {offer.industry ?? "未設定"}</span>
                  </div>
                </div>

                {/* スキルタグ */}
                {offer.skills.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium">求めるスキル</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {offer.skills.map((skill) => (
                        <Badge
                          key={skill}
                          variant="outline"
                          className="bg-blue-50 text-blue-700"
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 詳細メッセージ */}
            {offer.detailedMessage && (
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="w-full bg-white p-4 text-left font-medium hover:bg-gray-50">
                  詳細メッセージを表示
                </CollapsibleTrigger>
                <Separator />
                <CollapsibleContent className="bg-white p-4">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700">
                    {offer.detailedMessage}
                  </pre>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* 企業情報 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">企業情報</CardTitle>
                <CardDescription>
                  {offer.company_name} について
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {offer.companyInfo.description && (
                  <p className="text-sm text-gray-700">
                    {offer.companyInfo.description}
                  </p>
                )}

                {/* 基本情報 */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="font-medium">基本情報</p>
                    <ul className="mt-2 space-y-1 text-gray-600">
                      <li>従業員数: {offer.companyInfo.employees}</li>
                      <li>設立: {offer.companyInfo.founded}</li>
                      <li>業種: {offer.companyInfo.industry}</li>
                    </ul>
                  </div>

                  {/* 企業文化 */}
                  {offer.companyInfo.culture.length > 0 && (
                    <div>
                      <p className="font-medium">企業文化</p>
                      <ul className="mt-2 space-y-1 text-gray-600">
                        {offer.companyInfo.culture.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* 社員の声 */}
                {offer.companyInfo.testimonials.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <p className="font-medium">社員の声</p>
                      {offer.companyInfo.testimonials.map((t, i) => (
                        <div
                          key={i}
                          className="rounded-md bg-gray-50 p-3 text-sm"
                        >
                          <p className="italic">"{t.comment}"</p>
                          <p className="mt-1 text-xs font-medium">
                            — {t.name}, {t.position}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* 公式サイト */}
                {offer.companyInfo.website && (
                  <div className="mt-4 flex items-center justify-between rounded-md bg-gray-50 p-3">
                    <span>公式サイト</span>
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={offer.companyInfo.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1"
                      >
                        サイトを見る <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ───────── 右カラム ───────── */}
          <div className="space-y-6">
            {/* 想定年収 */}
            {offer.salary && (
              <Card>
                <CardHeader>
                  <CardTitle>想定年収</CardTitle>
                </CardHeader>
                <CardContent className="rounded-lg bg-gradient-to-r from-orange-50 to-amber-50 p-6 text-center shadow-inner">
                  <p className="text-2xl font-extrabold tracking-tight text-red-600">
                    {formatSalary(offer.salary)}
                  </p>
                  <p className="text-xs text-gray-500">※変動あり</p>
                </CardContent>
              </Card>
            )}

            {/* オファーポジション */}
            {offer.position && (
              <Card>
                <CardHeader>
                  <CardTitle>オファーポジション</CardTitle>
                </CardHeader>
                <CardContent className="rounded-lg bg-gray-50 p-6 text-center shadow-sm">
                  <p className="text-lg font-semibold tracking-wide text-gray-800">
                    {offer.position}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* 福利厚生 */}
            {offer.benefits.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>福利厚生</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {offer.benefits.map((b, i) => (
                      <li key={i}>・{b}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* 興味ボタン */}
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>このオファーについて</CardTitle>
                <CardDescription>
                  興味の有無を教えてください
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <InterestButtons offerId={offer.id} offerStatus={offer.status} />
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>

      {/* モバイル固定アクション */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-white p-4 md:hidden">
        <InterestButtons offerId={offer.id} offerStatus={offer.status} isMobile />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*                          興味ボタン共通                             */
/* ------------------------------------------------------------------ */
function InterestButtons({
  offerId,
  offerStatus,
  isMobile = false,
}: {
  offerId: string
  offerStatus: string
  isMobile?: boolean
}) {
  const [status, setStatus] = useState<"sent" | "accepted" | "declined">(
    offerStatus === "declined"
      ? "declined"
      : (offerStatus as "sent" | "accepted" | "declined")
  )
  const [showDialog, setShowDialog] = useState(false)
  const router = useRouter();

  // handlers
  const handleAccept = async () => {
    try {
      // 0) scout (= オファー) 行を取得して会社 / 学生 / 求人 ID を取り出す
      const { data: scout, error: scoutErr } = await supabase
        .from("scouts")
        .select("company_id, student_id, job_id")
        .eq("id", offerId)
        .single();

      if (scoutErr || !scout) {
        throw scoutErr ?? new Error("オファーが取得できませんでした");
      }

      const { company_id, student_id, job_id } = scout;

      // 1) オファーステータスを accepted に更新
      const { error: updateErr } = await supabase
        .from("scouts")
        .update({ status: "accepted", accepted_at: new Date().toISOString() })
        .eq("id", offerId);

      if (updateErr) throw updateErr;

      // 2) 既存チャットルームを検索（company_id × student_id で一意）
      const { data: existingRoom, error: existErr } = await supabase
        .from("chat_rooms")
        .select("id")
        .eq("company_id", company_id)
        .eq("student_id", student_id)
        .maybeSingle();

      if (existErr) throw existErr;

      let roomId: string | undefined = existingRoom?.id;

      // 3) 無ければ新規作成
      if (!roomId) {
        const { data: newRoom, error: insertErr } = await supabase
          .from("chat_rooms")
          .insert({ company_id, student_id, job_id })
          .select("id")
          .single();

        // 既に存在していた場合（レースコンディションなど）をリカバー
        if (insertErr && (insertErr as any).code === "23505") {
          const { data: retryRoom, error: retryErr } = await supabase
            .from("chat_rooms")
            .select("id")
            .eq("company_id", company_id)
            .eq("student_id", student_id)
            .single();
          if (retryErr) throw retryErr;
          roomId = retryRoom.id;
        } else if (insertErr) {
          throw insertErr;
        } else {
          roomId = newRoom.id;
        }
      }

      // 4) 承諾メッセージを自動送信
      if (roomId) {
        const { error: msgErr } = await supabase
          .from("messages")
          .insert({
            chat_room_id: roomId,
            sender_id:    student_id,      // 学生本人を送信者として記録
            content:      "スカウトを承諾しました！！",
          });

        if (msgErr) console.error("auto‑message error", msgErr);
      }
      // 5) 企業へメール通知
      try {
        // 会社側 Auth UID・会社名を取得
        const { data: companyAuth, error: companyAuthErr } = await supabase
          .from("companies")
          .select("user_id, name")
          .eq("id", company_id)
          .single();

        if (companyAuthErr) throw companyAuthErr;

        // 学生氏名を取得
        const { data: studentProfile, error: studentErr } = await supabase
          .from("student_profiles")
          .select("full_name")
          .eq("id", student_id)        // scouts.student_id は student_profiles.id
          .single();
        if (studentErr) throw studentErr;
        const studentName = studentProfile?.full_name ?? "学生";
        const companyName = (companyAuth as { user_id: string; name: string })?.name ?? "";

        if (companyAuth?.user_id) {
          await supabase.functions.invoke("send-email", {
            body: {
              user_id:           companyAuth.user_id,   // 会社側 Auth UID
              from_role:         "student",             // 送信者ロール
              notification_type: "scout_accepted",      // テンプレート切り替え用
              related_id:        offerId,
              link:              `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://gakuten.co.jp"}/company/chat/${roomId}`,
              title:             `【学生転職】${studentName}さんがスカウトを承諾しました！！`,
              message:           `${studentName}さんがスカウトを承諾しました。<a href="${process.env.NEXT_PUBLIC_SITE_URL ?? "https://gakuten.co.jp"}/company/chat/${roomId}">チャットルームに移動する</a>`,
            },
          });
        }
        // --- システム監視用メール送信 --------------------
        try {
          await supabase.functions.invoke("send-email", {
            body: {
              user_id:           "e567ebe5-55d3-408a-b591-d567cdd3470a", // システム監視用ユーザー ID
              from_role:         "system",
              notification_type: "scout_accepted_system",
              related_id:        offerId,
              title:             `【学生転職】 スカウトが承諾されました！！`,
              message:           `会社名：${companyName}\n学生名：${studentName}`,
            },
          });
        } catch (sysEmailErr) {
          console.error("send-email (system) error", sysEmailErr);
        }
      } catch (emailErr) {
        console.error("send-email error", emailErr);
      }
      // 6) チャット画面へ遷移
      router.push(`/chat/${roomId}`);
    } catch (err) {
      console.error("handleAccept error", err);
      alert("チャットルームの作成に失敗しました。時間をおいて再度お試しください。");
    }
  };
  const handleDecline = () => setShowDialog(true)
  const confirmDecline = async () => {
    const { error } = await supabase
      .from("scouts")
      .update({
        status:      "declined",
        declined_at: new Date().toISOString(),
      })
      .eq("id", offerId)

    if (error) {
      alert(`辞退に失敗しました: ${error.message}`)
      return
    }
    setStatus("declined")
    setShowDialog(false)
  }

  // UI
  if (status === "declined") {
    return <p className="text-sm text-gray-500">辞退済みのオファーです。</p>
  }

  if (status === "sent") {
    return (
      <>
        <div className={isMobile ? "flex flex-col gap-3" : "grid grid-cols-2 gap-3"}>
          <Button
            variant="outline"
            onClick={handleDecline}
            className="flex items-center gap-1.5"
          >
            <ThumbsDown className="h-4 w-4" />
            辞退する
          </Button>
          <Button
            onClick={handleAccept}
            className="flex items-center gap-1.5"
          >
            <ThumbsUp className="h-4 w-4" />
            承諾する
          </Button>
        </div>

        {/* 確認ダイアログ */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>オファーを辞退しますか？</DialogTitle>
              <DialogDescription>
                辞退すると取り消せません。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                キャンセル
              </Button>
              <Button variant="destructive" onClick={confirmDecline}>
                辞退する
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  // status === "accepted"
  return (
    <Button
      className="w-full gap-1.5 bg-red-600 hover:bg-red-700"
      asChild
    >
      <Link href={`/chat/${offerId}`} className="flex items-center gap-1">
        <MessageSquare className="h-4 w-4" />
        チャットに移動する
      </Link>
    </Button>
  )
}
