import { Search, Plus, Star, Briefcase, Filter } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

export default function ChatPage() {
  // サンプルデータ
  const scoutChats = [
    {
      id: 1,
      company: "株式会社テクノロジー",
      logo: "/abstract-geometric-logo.png",
      lastMessage: "山田様のプロフィールを拝見し、特にプログラミングスキルと問題解決能力に感銘を受けました。",
      time: "14:30",
      unread: true,
      position: "フロントエンドエンジニア",
    },
    {
      id: 3,
      company: "フューチャーコンサルティング",
      logo: "/strategic-growth-meeting.png",
      lastMessage: "ご質問いただきありがとうございます。当社のコンサルタントポジションについて詳細をお伝えします。",
      time: "昨日",
      unread: false,
      position: "ITコンサルタント",
    },
    {
      id: 5,
      company: "ファイナンスパートナーズ",
      logo: "/modern-tech-workspace.png",
      lastMessage: "カジュアル面談のご案内をさせていただきます。ご都合の良い日程をお知らせください。",
      time: "5/8",
      unread: false,
      position: "データアナリスト",
    },
  ]

  const applyChats = [
    {
      id: 2,
      company: "グローバル商事",
      logo: "/modern-startup-team.png",
      lastMessage: "書類選考を通過されました。次の面接日程について調整させていただきたく存じます。",
      time: "昨日",
      unread: true,
      position: "バックエンドエンジニア",
    },
    {
      id: 4,
      company: "クリエイティブデザイン",
      logo: "/abstract-design-company.png",
      lastMessage: "ポートフォリオを拝見しました。特にUIデザインのセンスが素晴らしいと思います。",
      time: "5/10",
      unread: false,
      position: "UIデザイナー",
    },
  ]

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">メッセージ</h1>
        <p className="text-xs text-gray-600 sm:text-sm">企業とのメッセージをやり取りできます</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 sm:mb-6 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input placeholder="企業名やメッセージを検索" className="pl-9 text-xs sm:text-sm" />
        </div>
        <Button variant="outline" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
          <Filter className="h-4 w-4" />
        </Button>
        <Button className="h-8 gap-1 text-xs sm:h-10 sm:gap-2 sm:text-sm bg-red-600 hover:bg-red-700">
          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span>新規メッセージ</span>
        </Button>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-3">
          <TabsTrigger value="all">すべて</TabsTrigger>
          <TabsTrigger value="scout">
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5" />
              <span>スカウト</span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="apply">
            <div className="flex items-center gap-1">
              <Briefcase className="h-3.5 w-3.5" />
              <span>自己応募</span>
            </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-0">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...scoutChats, ...applyChats]
              .sort((a, b) => {
                // 未読を優先
                if (a.unread && !b.unread) return -1
                if (!a.unread && b.unread) return 1
                return 0
              })
              .map((chat) => (
                <ChatCard
                  key={chat.id}
                  chat={chat}
                  type={scoutChats.some((sc) => sc.id === chat.id) ? "scout" : "apply"}
                />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="scout" className="mt-0">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {scoutChats.map((chat) => (
              <ChatCard key={chat.id} chat={chat} type="scout" />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="apply" className="mt-0">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {applyChats.map((chat) => (
              <ChatCard key={chat.id} chat={chat} type="apply" />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface ChatCardProps {
  chat: {
    id: number
    company: string
    logo: string
    lastMessage: string
    time: string
    unread: boolean
    position: string
  }
  type: "scout" | "apply"
}

function ChatCard({ chat, type }: ChatCardProps) {
  return (
    <Link href={`/chat/${chat.id}`}>
      <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md">
        {chat.unread && <div className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-red-500"></div>}

        {/* タイプバッジ */}
        <div className="absolute left-0 top-0">
          <Badge
            variant="outline"
            className={`rounded-bl-none rounded-tr-none ${
              type === "scout"
                ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
                : "bg-green-100 text-green-800 hover:bg-green-100"
            }`}
          >
            {type === "scout" ? (
              <>
                <Star className="mr-1 h-3 w-3" /> スカウト
              </>
            ) : (
              <>
                <Briefcase className="mr-1 h-3 w-3" /> 自己応募
              </>
            )}
          </Badge>
        </div>

        <div className="p-4 pt-8">
          <div className="mb-3 flex items-center gap-3">
            <div className="h-12 w-12 overflow-hidden rounded-full">
              <Image
                src={chat.logo || "/placeholder.svg"}
                alt={`${chat.company}のロゴ`}
                width={48}
                height={48}
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">{chat.company}</h3>
              <p className="text-sm text-gray-600">{chat.position}</p>
            </div>
          </div>
          <p className="mb-2 line-clamp-2 text-sm text-gray-600">{chat.lastMessage}</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">{chat.time}</span>
            <Button variant="ghost" size="sm" className="h-8 text-xs">
              メッセージを見る
            </Button>
          </div>
        </div>
      </div>
    </Link>
  )
}
