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
import Image from "next/image"
import Link from "next/link"

import { supabase } from "@/lib/supabase/client"
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

interface OfferDetail {
  id: string
  company_name: string
  logo_url: string | null
  title: string
  message: string
  detailedMessage: string
  created_at: string | null
  position: string
  status: string
  location: string
  workStyle: string
  salary: string
  benefits: string[]
  skills: string[]
  companyInfo: {
    employees: string
    founded: string
    industry: string
    website: string
    description: string
    culture: string[]
    testimonials: { name: string; position: string; comment: string }[]
  }
}

export default function OfferDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  const [offer, setOffer] = useState<OfferDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from("scouts")
        .select(`
          id,
          message,
          status,
          created_at,
          company_profiles (
            company_name,
            logo_url,
            description,
            employee_count,
            founded_year,
            industry,
            website_url
          ),
          jobs (
            title
          )
        `)
        .eq("id", id)
        .single()

      if (error || !data) {
        console.error(error)
        setError("オファー詳細の取得に失敗しました。")
        setLoading(false)
        return
      }

      setOffer({
        id: data.id,
        company_name: data.company_profiles.company_name,
        logo_url: data.company_profiles.logo_url,
        title: "オファータイトルをここに設定",      // 必要に応じて調整
        message: data.message,
        detailedMessage: data.message,             // 別カラムがあればそちらを使ってください
        created_at: data.created_at,
        position: data.jobs?.title ?? "",
        status:    data.status ?? "",
        location: "未設定",                        // 実データがあれば置き換え
        workStyle: "未設定",
        salary: "未設定",
        benefits: [],                              // 実データがあれば配列で
        skills: [],                                // 実データがあれば配列で
        companyInfo: {
          employees: `${data.company_profiles.employee_count ?? 0}名`,
          founded: `${data.company_profiles.founded_year ?? ""}`,
          industry: data.company_profiles.industry ?? "",
          website: data.company_profiles.website_url ?? "",
          description: data.company_profiles.description ?? "",
          culture: [],       // 実データがあれば配列で
          testimonials: [],  // 実データがあれば配列で
        },
      })
      setLoading(false)
    }
    load()
  }, [id])

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

        {/* ヘッダー */}
        <div className="mb-6 rounded-lg border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <Image
              src={offer.logo_url ?? "/placeholder.svg"}
              alt={`${offer.company_name} のロゴ`}
              width={64}
              height={64}
              className="rounded-lg border"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{offer.company_name}</h1>
                {isNew && <Badge className="bg-red-500">新着</Badge>}
                <Badge
                  variant={isUnread ? "outline" : "secondary"}
                  className={isUnread ? "border-blue-200 bg-blue-50 text-blue-700" : ""}
                >
                  {offer.status}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mt-1">{offer.position}</p>
              <p className="text-xs text-gray-500 mt-1">{dateLabel} 受信</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* 左カラム */}
          <div className="md:col-span-2 space-y-6">
            {/* サマリー */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{offer.title}</CardTitle>
                <CardDescription>オファー概要</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">{offer.message}</p>
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
                    <span>業種: {offer.companyInfo.industry}</span>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="font-medium text-sm">求めるスキル</p>
                  <div className="flex flex-wrap gap-1 mt-2">
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
              </CardContent>
            </Card>

            {/* 詳細メッセージ */}
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="w-full p-4 text-left font-medium bg-white hover:bg-gray-50">
                詳細メッセージを表示
              </CollapsibleTrigger>
              <Separator />
              <CollapsibleContent className="p-4 bg-white">
                <pre className="whitespace-pre-wrap text-sm text-gray-700">
                  {offer.detailedMessage}
                </pre>
              </CollapsibleContent>
            </Collapsible>

            {/* 企業情報 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">企業情報</CardTitle>
                <CardDescription>
                  {offer.company_name} について
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-700">
                  {offer.companyInfo.description}
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="font-medium">基本情報</p>
                    <ul className="mt-2 space-y-1 text-gray-600">
                      <li>従業員数: {offer.companyInfo.employees}</li>
                      <li>設立: {offer.companyInfo.founded}</li>
                      <li>業種: {offer.companyInfo.industry}</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium">企業文化</p>
                    <ul className="mt-2 space-y-1 text-gray-600">
                      {offer.companyInfo.culture.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <Separator />
                <div className="space-y-3">
                  <p className="font-medium">社員の声</p>
                  {offer.companyInfo.testimonials.map((t, i) => (
                    <div
                      key={i}
                      className="bg-gray-50 p-3 rounded-md text-sm"
                    >
                      <p className="italic">"{t.comment}"</p>
                      <p className="mt-1 text-xs font-medium">
                        — {t.name}, {t.position}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-between items-center bg-gray-50 p-3 rounded-md">
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
              </CardContent>
            </Card>
          </div>

          {/* 右カラム */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>想定年収</CardTitle>
              </CardHeader>
              <CardContent className="text-center bg-gray-50 p-4 rounded-lg">
                <p className="text-xl font-bold text-red-600">
                  {offer.salary}
                </p>
                <p className="text-xs text-gray-500">※変動あり</p>
              </CardContent>
            </Card>
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
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>このオファーについて</CardTitle>
                <CardDescription>興味の有無を教えてください</CardDescription>
              </CardHeader>
              <CardFooter>
                <InterestButtons offerId={offer.id} />
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>

      {/* モバイル用アクション */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-white p-4 md:hidden">
        <InterestButtons offerId={offer.id} isMobile />
      </div>
    </div>
  )
}

// 興味ボタン
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
  }

  return (
    <>
      <div className={`${isMobile ? "" : "grid grid-cols-2 gap-3"}`}>
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
        className="w-full gap-1.5 bg-red-600 hover:bg-red-700 mt-3"
        disabled={interest !== "interested"}
        asChild
      >
        <Link href={`/chat/${offerId}`} className="flex items-center gap-1">
          <MessageSquare className="h-4 w-4" />
          チャットを開始する
        </Link>
      </Button>

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
