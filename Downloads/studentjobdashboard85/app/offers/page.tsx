import { ArrowUpDown, Calendar, Filter, Search } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

export default function OffersPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <main className="container mx-auto px-4 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl font-bold sm:text-2xl">オファー一覧</h1>
          <p className="text-xs text-gray-500 sm:text-sm">企業からのオファーを確認・管理できます</p>
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input placeholder="企業名、職種などで検索" className="pl-10 text-xs sm:text-sm" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1 text-xs sm:gap-2 sm:text-sm">
              <Filter size={14} className="sm:h-4 sm:w-4" />
              <span>絞り込み</span>
            </Button>
            <Button variant="outline" size="sm" className="gap-1 text-xs sm:gap-2 sm:text-sm">
              <ArrowUpDown size={14} className="sm:h-4 sm:w-4" />
              <span>並び替え</span>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-4 grid w-full grid-cols-4 sm:mb-6">
            <TabsTrigger value="all" className="text-xs sm:text-sm">
              すべて
            </TabsTrigger>
            <TabsTrigger value="unread" className="text-xs sm:text-sm">
              未読 (3)
            </TabsTrigger>
            <TabsTrigger value="interested" className="text-xs sm:text-sm">
              興味あり
            </TabsTrigger>
            <TabsTrigger value="processing" className="text-xs sm:text-sm">
              選考中
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-0">
            <div className="grid gap-4">
              {[
                {
                  id: 1,
                  company: "株式会社テクノロジー",
                  logo: "/placeholder.svg?height=64&width=64",
                  position: "エンジニア",
                  title: "あなたのプログラミングスキルに興味があります",
                  message:
                    "山田様のGitHubプロフィールを拝見し、特にReactとTypeScriptのプロジェクトに感銘を受けました。弊社ではフロントエンド開発チームを強化しており、あなたのスキルと経験が非常にマッチすると考えています。",
                  date: "2023年5月15日",
                  isNew: true,
                  status: "未回答",
                },
                {
                  id: 2,
                  company: "グローバル商事",
                  logo: "/placeholder.svg?height=64&width=64",
                  position: "マーケティング",
                  title: "インターンシップのご案内",
                  message:
                    "山田様の分析力と創造性に注目しています。弊社では夏季インターンシッププログラムを開催予定で、実際のマーケティングプロジェクトに携わっていただく予定です。グローバルな環境で経験を積みたい方にぴったりの機会です。",
                  date: "2023年5月14日",
                  isNew: true,
                  status: "未回答",
                },
                {
                  id: 3,
                  company: "フューチャーコンサルティング",
                  logo: "/placeholder.svg?height=64&width=64",
                  position: "コンサルタント",
                  title: "あなたの分析力を活かせる職場です",
                  message:
                    "山田様の論理的思考力と問題解決能力に感銘を受けました。弊社では様々な業界のクライアントに対してコンサルティングサービスを提供しており、あなたの能力を発揮できる環境があります。",
                  date: "2023年5月13日",
                  isNew: true,
                  status: "未回答",
                },
                {
                  id: 4,
                  company: "クリエイティブデザイン",
                  logo: "/placeholder.svg?height=64&width=64",
                  position: "UI/UXデザイナー",
                  title: "デザインスキルを活かしませんか",
                  message:
                    "山田様のポートフォリオを拝見し、特にユーザー中心設計の考え方に共感しました。弊社ではユーザー体験を重視したデザインを行っており、あなたのスキルと視点が非常に価値あるものだと考えています。",
                  date: "2023年5月10日",
                  isNew: false,
                  status: "興味あり",
                },
                {
                  id: 5,
                  company: "ファイナンスパートナーズ",
                  logo: "/placeholder.svg?height=64&width=64",
                  position: "アナリスト",
                  title: "金融業界でのキャリアをスタートしませんか",
                  message:
                    "山田様の数学的素養と分析力に注目しています。弊社では若手アナリストの育成に力を入れており、金融業界でのキャリアをお考えの方に最適な環境を提供しています。",
                  date: "2023年5月8日",
                  isNew: false,
                  status: "選考中",
                },
              ].map((offer) => (
                <Card key={offer.id} className="overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    <div className="flex items-center gap-3 border-b border-gray-100 bg-white p-3 md:w-64 md:flex-col md:items-start md:border-b-0 md:border-r md:p-4">
                      <div className="relative h-10 w-10 overflow-hidden rounded-md border border-gray-200 md:h-16 md:w-16">
                        <Image
                          src={offer.logo || "/placeholder.svg"}
                          alt={`${offer.company}のロゴ`}
                          width={64}
                          height={64}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 md:text-base">{offer.company}</h3>
                        <div className="mt-1 flex items-center gap-1 md:gap-2">
                          <Badge variant="outline" className="rounded-sm bg-gray-50 text-[10px] font-normal md:text-xs">
                            {offer.position}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 p-3 md:p-4">
                      <div className="mb-2 flex items-start justify-between">
                        <div className="flex items-center gap-1 md:gap-2">
                          <h3 className="text-sm font-bold text-gray-900 md:text-base">{offer.title}</h3>
                          {offer.isNew && <Badge className="bg-red-500 text-[10px] md:text-xs">新着</Badge>}
                        </div>
                        <Badge
                          variant={
                            offer.status === "未回答"
                              ? "outline"
                              : offer.status === "興味あり"
                                ? "secondary"
                                : "default"
                          }
                          className={
                            offer.status === "未回答"
                              ? "border-gray-200 text-[10px] text-gray-600 md:text-xs"
                              : offer.status === "興味あり"
                                ? "bg-blue-100 text-[10px] text-blue-700 md:text-xs"
                                : "bg-green-100 text-[10px] text-green-700 md:text-xs"
                          }
                        >
                          {offer.status}
                        </Badge>
                      </div>

                      <p className="mb-3 text-xs text-gray-600 line-clamp-2 md:mb-4 md:text-sm">{offer.message}</p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-[10px] text-gray-500 md:gap-2 md:text-xs">
                          <Calendar size={12} className="md:h-4 md:w-4" />
                          <span>{offer.date}</span>
                        </div>

                        <div className="flex gap-2">
                          <Link href={`/offers/${offer.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-[10px] md:h-8 md:px-3 md:text-xs"
                            >
                              詳細を見る
                            </Button>
                          </Link>
                          <Link href={`/chat/${offer.id}`}>
                            <Button
                              size="sm"
                              className="h-7 bg-red-600 px-2 text-[10px] hover:bg-red-700 md:h-8 md:px-3 md:text-xs"
                            >
                              返信する
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="unread" className="mt-0">
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
              <h3 className="text-lg font-medium text-gray-600">未読のオファーが表示されます</h3>
              <p className="mt-2 text-sm text-gray-500">現在、3件の未読オファーがあります</p>
            </div>
          </TabsContent>

          <TabsContent value="interested" className="mt-0">
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
              <h3 className="text-lg font-medium text-gray-600">興味ありに設定したオファーが表示されます</h3>
              <p className="mt-2 text-sm text-gray-500">現在、1件の興味ありオファーがあります</p>
            </div>
          </TabsContent>

          <TabsContent value="processing" className="mt-0">
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
              <h3 className="text-lg font-medium text-gray-600">選考中のオファーが表示されます</h3>
              <p className="mt-2 text-sm text-gray-500">現在、1件の選考中オファーがあります</p>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
