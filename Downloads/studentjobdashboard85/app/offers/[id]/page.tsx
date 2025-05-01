import { ArrowLeft, Building, Calendar, Clock, MapPin, MessageSquare, ThumbsDown, ThumbsUp } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

export default function OfferDetailPage({ params }: { params: { id: string } }) {
  // 実際のアプリケーションではIDに基づいてデータを取得します
  // ここではサンプルデータを使用します
  const offer = {
    id: params.id,
    company: "株式会社テクノロジー",
    logo: "/placeholder.svg?height=96&width=96",
    position: "エンジニア",
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
    status: "未回答",
    companyInfo: {
      employees: "150名",
      founded: "2015年",
      industry: "Web/アプリ開発",
      website: "https://example.com",
    },
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/placeholder.svg?height=32&width=32"
                alt="学生転職ロゴ"
                width={32}
                height={32}
                className="h-8 w-8"
              />
              <span className="text-xl font-bold text-red-600">学生転職</span>
            </Link>
            <nav className="hidden md:block">
              <ul className="flex items-center gap-6">
                <li>
                  <Link
                    href="/"
                    className="flex items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-red-600"
                  >
                    マイページ
                  </Link>
                </li>
                <li>
                  <Link
                    href="/resume"
                    className="flex items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-red-600"
                  >
                    職務経歴書
                  </Link>
                </li>
                <li>
                  <Link
                    href="/offers"
                    className="flex items-center gap-1.5 text-sm font-medium text-red-600 transition-colors hover:text-red-700"
                  >
                    オファー一覧
                  </Link>
                </li>
                <li>
                  <Link
                    href="/chat"
                    className="flex items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-red-600"
                  >
                    チャット
                  </Link>
                </li>
                <li>
                  <Link
                    href="/features"
                    className="flex items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-red-600"
                  >
                    特集
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <MessageSquare className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500"></span>
              <span className="sr-only">メッセージ</span>
            </Button>
            <div className="flex items-center gap-2">
              <div className="hidden text-sm font-medium text-gray-700 md:block">山田 太郎</div>
              <div className="relative h-8 w-8 overflow-hidden rounded-full">
                <Image
                  src="/placeholder.svg?height=32&width=32"
                  alt="プロフィール画像"
                  width={32}
                  height={32}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-2">
          <Link href="/offers" className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 sm:text-sm">
            <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>オファー一覧に戻る</span>
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* 左カラム - 企業情報 */}
          <div className="md:col-span-1">
            <Card>
              <CardHeader className="flex flex-col items-center p-4 text-center sm:p-6">
                <div className="mb-3 h-16 w-16 overflow-hidden rounded-lg border border-gray-200 sm:mb-4 sm:h-24 sm:w-24">
                  <Image
                    src={offer.logo || "/placeholder.svg"}
                    alt={`${offer.company}のロゴ`}
                    width={96}
                    height={96}
                    className="h-full w-full object-cover"
                  />
                </div>
                <CardTitle className="text-lg sm:text-xl">{offer.company}</CardTitle>
                <CardDescription className="text-xs sm:text-sm">{offer.companyInfo.industry}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 p-4 text-xs sm:space-y-4 sm:p-6 sm:text-sm">
                <div className="flex items-center gap-2">
                  <Building className="h-3.5 w-3.5 text-gray-500 sm:h-4 sm:w-4" />
                  <span className="text-gray-600">従業員数: {offer.companyInfo.employees}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-gray-500 sm:h-4 sm:w-4" />
                  <span className="text-gray-600">設立: {offer.companyInfo.founded}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-gray-500 sm:h-4 sm:w-4" />
                  <span className="text-gray-600">所在地: {offer.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-gray-500 sm:h-4 sm:w-4" />
                  <span className="text-gray-600">勤務形態: {offer.workStyle}</span>
                </div>

                <Separator />

                <div>
                  <h3 className="mb-2 text-xs font-medium sm:text-sm">求めるスキル</h3>
                  <div className="flex flex-wrap gap-1">
                    {offer.skills.map((skill, index) => (
                      <Badge key={index} variant="outline" className="bg-blue-50 text-[10px] text-blue-700 sm:text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="mb-2 text-xs font-medium sm:text-sm">福利厚生</h3>
                  <ul className="space-y-1 text-xs text-gray-600 sm:text-sm">
                    {offer.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Separator />

                <div className="rounded-lg bg-gray-50 p-3">
                  <h3 className="mb-1 text-xs font-medium sm:text-sm">想定年収</h3>
                  <p className="text-base font-bold text-red-600 sm:text-lg">{offer.salary}</p>
                </div>
              </CardContent>
              <CardFooter className="p-4 sm:p-6">
                <Button variant="outline" className="w-full text-xs sm:text-sm" asChild>
                  <a href={offer.companyInfo.website} target="_blank" rel="noopener noreferrer">
                    企業サイトを見る
                  </a>
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* 右カラム - オファー詳細 */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base sm:text-xl">{offer.title}</CardTitle>
                      {offer.isNew && <Badge className="bg-red-500 text-[10px] sm:text-xs">新着</Badge>}
                    </div>
                    <CardDescription className="mt-1 text-xs sm:text-sm">
                      <span className="font-medium">{offer.position}</span> • {offer.date}受信
                    </CardDescription>
                  </div>
                  <Badge
                    variant={
                      offer.status === "未回答" ? "outline" : offer.status === "興味あり" ? "secondary" : "default"
                    }
                    className={
                      offer.status === "未回答"
                        ? "border-gray-200 text-[10px] text-gray-600 sm:text-xs"
                        : offer.status === "興味あり"
                          ? "bg-blue-100 text-[10px] text-blue-700 sm:text-xs"
                          : "bg-green-100 text-[10px] text-green-700 sm:text-xs"
                    }
                  >
                    {offer.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-4 sm:space-y-6 sm:p-6">
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 sm:p-4">
                  <h3 className="mb-2 text-xs font-medium sm:text-sm">オファーメッセージ</h3>
                  <div className="whitespace-pre-line text-xs text-gray-700 sm:text-sm">{offer.detailedMessage}</div>
                </div>

                <div>
                  <h3 className="mb-2 text-base font-medium sm:mb-3 sm:text-lg">このオファーについて</h3>
                  <div className="space-y-3 rounded-lg border border-gray-200 p-3 sm:space-y-4 sm:p-4">
                    <p className="text-xs text-gray-600 sm:text-sm">
                      このオファーは、あなたのスキルと経験に基づいて、{offer.company}
                      からあなた専用に送られたものです。オファーを受け取ることで、企業とのチャットが開始され、より詳細な情報交換や面接の調整が可能になります。
                    </p>
                    <p className="text-xs text-gray-600 sm:text-sm">
                      オファーを受け取っても、最終的な就職の意思決定を行う必要はありません。まずは企業との対話を通じて、お互いの理解を深めることをおすすめします。
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3 border-t bg-gray-50 p-4 sm:p-6">
                <div className="text-center text-xs text-gray-500 sm:text-sm">
                  このオファーに興味がありますか？以下のアクションから選択してください
                </div>
                <div className="flex w-full flex-col gap-2 sm:flex-row sm:gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 gap-1 border-gray-300 text-xs text-gray-700 hover:bg-gray-100 hover:text-gray-900 sm:gap-2 sm:text-sm"
                  >
                    <ThumbsDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span>興味なし</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 gap-1 border-blue-200 text-xs text-blue-600 hover:bg-blue-50 hover:text-blue-700 sm:gap-2 sm:text-sm"
                  >
                    <ThumbsUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span>興味あり（保留）</span>
                  </Button>
                  <Link href={`/chat/${offer.id}`} className="flex-1">
                    <Button className="w-full gap-1 bg-red-600 text-xs hover:bg-red-700 sm:gap-2 sm:text-sm">
                      <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span>オファーを受けてチャットする</span>
                    </Button>
                  </Link>
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
