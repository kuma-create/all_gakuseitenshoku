"use client"

import { useState } from "react"
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

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

export default function OfferDetailPage({ params }: { params: { id: string } }) {
  // Mock data for the offer
  const offer = {
    id: params.id,
    company: "株式会社テクノロジー",
    logo: "/abstract-tech-logo.png",
    position: "フロントエンドエンジニア",
    title: "あなたのプログラミングスキルに興味があります",
    message:
      "山田様のGitHubプロフィールを拝見し、特にReactとTypeScriptのプロジェクトに感銘を受けました。弊社ではフロントエンド開発チームを強化しており、あなたのスキルと経験が非常にマッチすると考えています。",
    detailedMessage: `山田様

この度は弊社にご興味をお持ちいただき、誠にありがとうございます。株式会社テクノロジーの採用担当、佐藤と申します。

山田様のGitHubプロフィールを拝見し、特にReactとTypeScriptを使用したプロジェクトに感銘を受けました。特に、状態管理の実装方法やコンポーネント設計の考え方が弊社の開発方針と非常に合致しています。

弊社では現在、フロントエンド開発チームを強化しており、以下のようなプロジェクトを進行中です：

1. 大規模ECサイトのフロントエンドリニューアル（React, TypeScript, Next.js）
2. 社内管理システムのモダン化（React, GraphQL）
3. 新規サービスの開発（React Native, TypeScript）

山田様のスキルと経験は、これらのプロジェクトで大いに活かせると考えております。

弊社では以下のような環境を提供しています：

・最新技術を積極的に取り入れる文化
・フレックスタイム制度とリモートワークの併用
・技術勉強会の定期開催と外部カンファレンス参加支援
・年間120万円の自己啓発支援制度

ご興味をお持ちいただけましたら、一度オンラインでお話しさせていただきたく存じます。ご都合の良い日時をお知らせいただければ幸いです。

ご検討のほど、よろしくお願い申し上げます。

株式会社テクノロジー
採用担当 佐藤 健太
`,
    date: "2023年5月15日",
    location: "東京都渋谷区",
    workStyle: "ハイブリッド（週3出社）",
    salary: "年収600万円〜900万円（経験・能力による）",
    benefits: ["フレックスタイム制", "リモートワーク可", "書籍購入支援", "資格取得支援"],
    skills: ["React", "TypeScript", "Next.js", "GraphQL", "React Native"],
    isNew: true,
    status: "未読",
    companyInfo: {
      employees: "150名",
      founded: "2015年",
      industry: "Web/アプリ開発",
      website: "https://example.com",
      description:
        "株式会社テクノロジーは、最新のWeb技術を活用したサービス開発を行うテックカンパニーです。顧客のビジネス課題を解決するためのWebアプリケーション開発から、自社プロダクトの開発まで幅広く手がけています。エンジニアが主体となって意思決定を行う文化があり、技術的なチャレンジを大切にしています。",
      culture: [
        "フラットな組織構造と意思決定の速さ",
        "技術力向上を重視する文化",
        "ワークライフバランスの尊重",
        "多様性を認め合う環境",
      ],
      testimonials: [
        {
          name: "田中 誠",
          position: "シニアエンジニア",
          comment: "入社して3年目ですが、常に新しい技術に触れる機会があり、エンジニアとして成長できる環境です。",
        },
        {
          name: "鈴木 美咲",
          position: "プロダクトマネージャー",
          comment: "エンジニアとビジネスサイドの連携が取れており、技術的な提案が尊重される文化が素晴らしいです。",
        },
      ],
    },
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* ヘッダー - 固定ヘッダーは省略 */}

      <main className="container mx-auto px-4 py-6 md:py-8">
        {/* 戻るボタン */}
        <div className="mb-6">
          <Link
            href="/offers"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>オファー一覧へ戻る</span>
          </Link>
        </div>

        {/* ヘッダー情報 */}
        <div className="mb-6 rounded-lg border bg-white p-4 shadow-sm md:p-6">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-gray-200 bg-white">
              <Image
                src={offer.logo || "/placeholder.svg"}
                alt={`${offer.company}のロゴ`}
                width={64}
                height={64}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900 md:text-2xl">{offer.company}</h1>
                {offer.isNew && <Badge className="bg-red-500">新着</Badge>}
                <Badge
                  variant="outline"
                  className={
                    offer.status === "未読"
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-gray-50 text-gray-600"
                  }
                >
                  {offer.status}
                </Badge>
              </div>
              <p className="mt-1 text-sm font-medium text-gray-600">{offer.position}</p>
              <p className="mt-1 text-xs text-gray-500">{offer.date}受信</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* 左カラム - オファー詳細と企業情報 */}
          <div className="space-y-6 md:col-span-2">
            {/* オファーサマリーカード */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{offer.title}</CardTitle>
                <CardDescription>オファーの概要</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-700">{offer.message}</p>

                <div className="grid gap-3 rounded-md bg-gray-50 p-3 text-sm md:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-700">勤務地: {offer.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-700">勤務形態: {offer.workStyle}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-700">受信日: {offer.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-700">業種: {offer.companyInfo.industry}</span>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium">求めるスキル</p>
                  <div className="flex flex-wrap gap-1.5">
                    {offer.skills.map((skill, index) => (
                      <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 詳細メッセージセクション */}
            <Collapsible defaultOpen className="rounded-lg border bg-white shadow-sm">
              <CollapsibleTrigger className="flex w-full items-center justify-between p-4 text-left font-medium text-gray-900 hover:bg-gray-50">
                <span>詳細メッセージ</span>
                <span className="text-xs text-gray-500">クリックして{true ? "折りたたむ" : "展開する"}</span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Separator />
                <div className="whitespace-pre-line p-4 text-sm text-gray-700">{offer.detailedMessage}</div>
              </CollapsibleContent>
            </Collapsible>

            {/* 企業情報セクション */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">企業情報</CardTitle>
                <CardDescription>株式会社テクノロジーについて</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-700">{offer.companyInfo.description}</p>

                <div className="grid gap-3 text-sm md:grid-cols-2">
                  <div>
                    <p className="font-medium text-gray-900">基本情報</p>
                    <ul className="mt-2 space-y-1 text-gray-600">
                      <li className="flex items-center gap-2">
                        <span className="h-1 w-1 rounded-full bg-gray-400"></span>
                        <span>従業員数: {offer.companyInfo.employees}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="h-1 w-1 rounded-full bg-gray-400"></span>
                        <span>設立: {offer.companyInfo.founded}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="h-1 w-1 rounded-full bg-gray-400"></span>
                        <span>業種: {offer.companyInfo.industry}</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <p className="font-medium text-gray-900">企業文化</p>
                    <ul className="mt-2 space-y-1 text-gray-600">
                      {offer.companyInfo.culture.map((item, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <span className="h-1 w-1 rounded-full bg-gray-400"></span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="mb-3 font-medium text-gray-900">社員の声</p>
                  <div className="space-y-3">
                    {offer.companyInfo.testimonials.map((testimonial, index) => (
                      <div key={index} className="rounded-md bg-gray-50 p-3">
                        <p className="text-sm italic text-gray-700">"{testimonial.comment}"</p>
                        <p className="mt-2 text-xs font-medium text-gray-900">
                          {testimonial.name} - {testimonial.position}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-md bg-gray-50 p-3">
                  <span className="text-sm font-medium text-gray-700">公式Webサイト</span>
                  <Button variant="outline" size="sm" className="gap-1.5" asChild>
                    <a href={offer.companyInfo.website} target="_blank" rel="noopener noreferrer">
                      <span>サイトを見る</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右カラム - 応募情報と給与 */}
          <div className="space-y-6">
            {/* 給与情報カード */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">想定年収</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg bg-gray-50 p-4 text-center">
                  <p className="text-xl font-bold text-red-600">{offer.salary}</p>
                  <p className="mt-1 text-xs text-gray-500">※経験・能力により変動します</p>
                </div>
              </CardContent>
            </Card>

            {/* 福利厚生カード */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">福利厚生</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {offer.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500"></div>
                      <span className="text-sm text-gray-700">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* アクションカード - デスクトップでは固定されない */}
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg">このオファーについて</CardTitle>
                <CardDescription>興味がありますか？</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  このオファーに興味を示すと、企業とのチャットが開始され、より詳しい情報交換や面接の調整が可能になります。
                </p>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <InterestButtons offerId={offer.id} />
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>

      {/* モバイル用固定アクションボタン */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-white p-4 shadow-lg md:hidden">
        <InterestButtons offerId={offer.id} isMobile />
      </div>
    </div>
  )
}

// 興味ボタンコンポーネント - 状態管理を含む
function InterestButtons({ offerId, isMobile = false }: { offerId: string; isMobile?: boolean }) {
  const [interest, setInterest] = useState<"none" | "interested" | "not_interested">("none")
  const [showDialog, setShowDialog] = useState(false)

  const handleInterest = () => {
    setInterest("interested")
  }

  const handleNotInterested = () => {
    setShowDialog(true)
  }

  const confirmNotInterested = () => {
    setInterest("not_interested")
    setShowDialog(false)
  }

  return (
    <>
      <div className={`grid w-full gap-3 ${isMobile ? "" : "sm:grid-cols-2"}`}>
        <Button
          variant="outline"
          className={`gap-1.5 ${
            interest === "not_interested"
              ? "border-gray-300 bg-gray-100 text-gray-500"
              : "border-gray-300 text-gray-700 hover:bg-gray-100"
          }`}
          onClick={handleNotInterested}
          disabled={interest === "not_interested"}
        >
          <ThumbsDown className="h-4 w-4" />
          <span>興味がない</span>
        </Button>
        <Button
          variant={interest === "interested" ? "default" : "outline"}
          className={`gap-1.5 ${
            interest === "interested"
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "border-blue-200 text-blue-600 hover:bg-blue-50"
          }`}
          onClick={handleInterest}
          disabled={interest === "interested"}
        >
          <ThumbsUp className="h-4 w-4" />
          <span>興味がある</span>
        </Button>
      </div>

      <Button className="w-full gap-1.5 bg-red-600 hover:bg-red-700" disabled={interest !== "interested"}>
        <MessageSquare className="h-4 w-4" />
        <span>チャットを開始する</span>
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>興味がないを選択</DialogTitle>
            <DialogDescription>
              このオファーに興味がないことを企業に通知します。この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-gray-600">
              「興味がない」を選択すると、このオファーに関する通知は停止されます。また、企業側にもあなたが興味を持っていないことが通知されます。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={confirmNotInterested}>
              興味がないを確定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
