"use client"

import { Calendar, Filter, MessageSquare, Search } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

/** 1件のオファーを表す型 */
interface Offer {
  id: number
  company: string
  logo: string
  position: string
  message: string
  date: string
  isUnread: boolean
}

/** モックデータ */
const mockOffers: Offer[] = [
  {
    id: 1,
    company: "株式会社テクノロジー",
    logo: "/abstract-tech-logo.png",
    position: "エンジニア",
    message:
      "山田様のGitHubプロフィールを拝見し、特にReactとTypeScriptのプロジェクトに感銘を受けました。弊社ではフロントエンド開発チームを強化しており、あなたのスキルと経験が非常にマッチすると考えています。",
    date: "2023年5月15日",
    isUnread: true,
  },
  {
    id: 2,
    company: "グローバル商事",
    logo: "/global-trading-logo.png",
    position: "マーケティング",
    message:
      "山田様の分析力と創造性に注目しています。弊社では夏季インターンシッププログラムを開催予定で、実際のマーケティングプロジェクトに携わっていただく予定です。グローバルな環境で経験を積みたい方にぴったりの機会です。",
    date: "2023年5月14日",
    isUnread: true,
  },
  {
    id: 3,
    company: "フューチャーコンサルティング",
    logo: "/consulting-firm-logo.png",
    position: "コンサルタント",
    message:
      "山田様の論理的思考力と問題解決能力に感銘を受けました。弊社では様々な業界のクライアントに対してコンサルティングサービスを提供しており、あなたの能力を発揮できる環境があります。",
    date: "2023年5月13日",
    isUnread: true,
  },
  {
    id: 4,
    company: "クリエイティブデザイン",
    logo: "/placeholder.svg?key=5026d",
    position: "UI/UXデザイナー",
    message:
      "山田様のポートフォリオを拝見し、特にユーザー中心設計の考え方に共感しました。弊社ではユーザー体験を重視したデザインを行っており、あなたのスキルと視点が非常に価値あるものだと考えています。",
    date: "2023年5月10日",
    isUnread: false,
  },
  {
    id: 5,
    company: "ファイナンスパートナーズ",
    logo: "/finance-company-logo.png",
    position: "アナリスト",
    message:
      "山田様の数学的素養と分析力に注目しています。弊社では若手アナリストの育成に力を入れており、金融業界でのキャリアをお考えの方に最適な環境を提供しています。",
    date: "2023年5月8日",
    isUnread: false,
  },
]

export default function OffersPage() {
  const unreadOffers = mockOffers.filter((offer) => offer.isUnread)
  const readOffers = mockOffers.filter((offer) => !offer.isUnread)

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <main className="container mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl font-bold sm:text-2xl">オファー一覧</h1>
          <p className="text-sm text-gray-500">
            企業からのスカウトを確認・管理できます
          </p>
        </div>

        {/* Controls */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input placeholder="企業名やキーワードで検索" className="pl-10" />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Filter size={16} />
              <span>絞り込み</span>
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-6 grid w-full grid-cols-3">
            <TabsTrigger value="unread" className="text-sm">
              未読 ({unreadOffers.length})
            </TabsTrigger>
            <TabsTrigger value="read" className="text-sm">
              既読 ({readOffers.length})
            </TabsTrigger>
            <TabsTrigger value="all" className="text-sm">
              すべて ({mockOffers.length})
            </TabsTrigger>
          </TabsList>

          {/* All Offers Tab */}
          <TabsContent value="all" className="mt-0">
            {mockOffers.length > 0 ? (
              <div className="grid gap-4">
                {mockOffers.map((offer) => (
                  <OfferCard key={offer.id} offer={offer} />
                ))}
              </div>
            ) : (
              <EmptyState />
            )}
          </TabsContent>

          {/* Unread Offers Tab */}
          <TabsContent value="unread" className="mt-0">
            {unreadOffers.length > 0 ? (
              <div className="grid gap-4">
                {unreadOffers.map((offer) => (
                  <OfferCard key={offer.id} offer={offer} />
                ))}
              </div>
            ) : (
              <EmptyState message="未読のスカウトはありません" />
            )}
          </TabsContent>

          {/* Read Offers Tab */}
          <TabsContent value="read" className="mt-0">
            {readOffers.length > 0 ? (
              <div className="grid gap-4">
                {readOffers.map((offer) => (
                  <OfferCard key={offer.id} offer={offer} />
                ))}
              </div>
            ) : (
              <EmptyState message="既読のスカウトはありません" />
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

// OfferCard の props 型
interface OfferCardProps {
  offer: Offer
}

function OfferCard({ offer }: OfferCardProps) {
  return (
    <Card
      className={`overflow-hidden transition-all hover:shadow-md ${
        offer.isUnread ? "border-l-4 border-l-blue-500" : ""
      }`}
    >
      <div className="flex flex-col md:flex-row">
        {/* Company Info */}
        <div className="flex items-center gap-4 border-b border-gray-100 bg-white p-4 md:w-64 md:flex-col md:items-start md:border-b-0 md:border-r">
          <div className="relative h-12 w-12 overflow-hidden rounded-md border border-gray-200 md:h-16 md:w-16">
            <Image
              src={offer.logo || "/placeholder.svg"}
              alt={`${offer.company} のロゴ`}
              width={64}
              height={64}
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 md:mt-2 md:text-lg">
              {offer.company}
            </h3>
            <Badge variant="outline" className="mt-1 bg-gray-50">
              {offer.position}
            </Badge>
          </div>
        </div>

        {/* Offer Content */}
        <div className="flex-1 p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {offer.isUnread && (
                <Badge className="bg-blue-500 text-xs font-medium">新着</Badge>
              )}
              <Badge
                variant={offer.isUnread ? "outline" : "secondary"}
                className={
                  offer.isUnread
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "bg-gray-100 text-gray-700"
                }
              >
                {offer.isUnread ? "未読" : "既読"}
              </Badge>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Calendar size={14} />
              <span>{offer.date}</span>
            </div>
          </div>

          <p className="mb-4 text-sm text-gray-600">
            {offer.message.length > 100
              ? `${offer.message.substring(0, 100)}...`
              : offer.message}
          </p>

          <div className="flex flex-wrap gap-2 sm:flex-nowrap">
            <Link href={`/offers/${offer.id}`} className="w-full sm:w-auto">
              <Button variant="outline" className="w-full">
                詳細を見る
              </Button>
            </Link>
            <Link href={`/chat/${offer.id}`} className="w-full sm:w-auto">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                <MessageSquare size={16} className="mr-2" />
                チャットを開始
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Card>
  )
}

// EmptyState の props 型
interface EmptyStateProps {
  message?: string
}

function EmptyState({ message = "まだスカウトは届いていません" }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white p-8 py-12 text-center">
      <div className="mb-4 rounded-full bg-gray-100 p-3">
        <MessageSquare size={24} className="text-gray-400" />
      </div>
      <h3 className="mb-2 text-lg font-medium text-gray-700">{message}</h3>
      <p className="mb-6 text-sm text-gray-500">
        プロフィールを充実させてスカウトを受けよう
      </p>
      <Link href="/student/profile">
        <Button>プロフィールを編集する</Button>
      </Link>
    </div>
  )
}
