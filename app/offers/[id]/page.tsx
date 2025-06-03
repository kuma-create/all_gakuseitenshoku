// app/offers/[id]/page.tsx
"use client"

import { useEffect, useState } from "react"
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
  salary: string
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
  } | null
}

/* ------------------------------------------------------------------ */
/*                               画面                                  */
/* ------------------------------------------------------------------ */
export default function OfferDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = params
  const [offer, setOffer] = useState<OfferDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /* ------------------------------ fetch ----------------------------- */
  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from("scouts")
        .select(
          `
          id,
          message,
          status,
          created_at,
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
            title
          )
        `
        )
        .eq("id", id)
        .single()
        .returns<ScoutWithRelations>() // 型を明示して配列/オブジェクト扱いにする

      if (error || !data) {
        console.error(error)
        setError("オファー詳細の取得に失敗しました。")
        setLoading(false)
        return
      }

      /* ------------------ クエリ結果 → 画面用構造に変換 ----------------- */
      setOffer({
        /** scouts */
        id: data.id,
        message: data.message,
        status: data.status ?? "",
        created_at: data.created_at,

        /** jobs */
        position: data.jobs?.title ?? null,

        /** companies */
        company_name: data.companies?.name ?? "",
        logo: data.companies?.logo ?? null,
        description: data.companies?.description ?? null,
        employee_count: data.companies?.employee_count ?? null,
        founded_year: data.companies?.founded_year ?? null,
        industry: data.companies?.industry ?? null,
        website: data.companies?.website ?? null,

        /** 追加情報（ダミー or 後日スキーマ追加） */
        title: "オファータイトルをここに設定",
        detailedMessage: data.message,
        location: "未設定",
        workStyle: "未設定",
        salary: "未設定",
        benefits: [],
        skills: [],
        culture: [],
        testimonials: [],

        /* companyInfo まとめ */
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

      setLoading(false)
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
      <main className="container mx-auto px-4 py-6 md:py-8">
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
                <p className="text-sm text-gray-700">{offer.message}</p>

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
                <CardContent className="rounded-lg bg-gray-50 p-4 text-center">
                  <p className="text-xl font-bold text-red-600">
                    {offer.salary}
                  </p>
                  <p className="text-xs text-gray-500">※変動あり</p>
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
                <InterestButtons offerId={offer.id} />
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>

      {/* モバイル固定アクション */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-white p-4 md:hidden">
        <InterestButtons offerId={offer.id} isMobile />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*                          興味ボタン共通                             */
/* ------------------------------------------------------------------ */
function InterestButtons({
  offerId,
  isMobile = false,
}: {
  offerId: string
  isMobile?: boolean
}) {
  const [interest, setInterest] = useState<
    "none" | "interested" | "not_interested"
  >("none")
  const [showDialog, setShowDialog] = useState(false)

  const handleInterest = () => setInterest("interested")
  const handleNotInterested = () => setShowDialog(true)
  const confirmNotInterested = () => {
    setInterest("not_interested")
    setShowDialog(false)
    /** TODO: supabase に PATCH 処理を追加する場合はここ */
  }

  return (
    <>
      <div className={isMobile ? "" : "grid grid-cols-2 gap-3"}>
        <Button
          variant="outline"
          onClick={handleNotInterested}
          disabled={interest === "not_interested"}
        >
          <ThumbsDown className="h-4 w-4" />
          興味がない
        </Button>
        <Button
          variant={interest === "interested" ? "default" : "outline"}
          onClick={handleInterest}
          disabled={interest === "interested"}
        >
          <ThumbsUp className="h-4 w-4" />
          興味がある
        </Button>
      </div>

      <Button
        className="mt-3 w-full gap-1.5 bg-red-600 hover:bg-red-700"
        disabled={interest !== "interested"}
        asChild
      >
        <Link href={`/chat/${offerId}`} className="flex items-center gap-1">
          <MessageSquare className="h-4 w-4" />
          チャットを開始する
        </Link>
      </Button>
      {/* 確認ダイアログ */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>興味がないを確定</DialogTitle>
            <DialogDescription>
              このオファーに興味がないことを企業に通知します。取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={confirmNotInterested}>
              確定する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
