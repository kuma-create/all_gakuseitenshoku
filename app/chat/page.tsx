/* ─────────────────────────────────────────
   app/chat/page.tsx
   - Realtime 反映
   - Skeleton ローディング
   - ChatList を dynamic import で後読み込み
──────────────────────────────────────── */
"use client"

import { useEffect, useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { Search } from "lucide-react"

import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

/* ───── 型定義 ───────────────────────────── */
type ChatItem = {
  id: string
  company: string
  logo: string | null
  lastMessage: string
  time: string
  unread: boolean
  position: string | null
  type: "scout" | "apply"
}

/* ───── dynamic import: ChatList ─────────── */
const ChatList = dynamic(() => import("./ChatList"), {
  loading: () => (
    <ul className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="flex items-center gap-4 rounded-lg p-4">
          <div className="h-10 w-10 rounded-full bg-gray-300 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/2 bg-gray-300 rounded animate-pulse" />
            <div className="h-4 w-1/3 bg-gray-300 rounded animate-pulse" />
          </div>
          <div className="h-4 w-16 bg-gray-300 rounded animate-pulse" />
        </li>
      ))}
    </ul>
  ),
  ssr: false,
})

/* ───── 画面 ─────────────────────────────── */
export default function ChatPage() {
  const { user } = useAuth()

  const [chats, setChats] = useState<ChatItem[]>([])
  const [loading, setLoading] = useState(true)

  /* ------- 共通取得関数 --------------------------------- */
  const fetchChats = useCallback(async () => {
    if (!user?.id) return

    setLoading(true)

    /* RPC: get_my_chat_rooms でルーム一覧取得 */
    const { data, error } = await supabase.rpc("get_my_chat_rooms", {
      p_user: user.id,
    })

    if (error) {
      console.error("get_my_chat_rooms error", error)
      setLoading(false)
      return
    }

    type RpcRow = {
      id: string
      company_name: string | null
      company_logo: string | null
      last_message: string | null
      last_created: string | null
      is_unread: boolean
      job_id?: string | null
      [key: string]: any  // extra columns are allowed (company_id, student_id, etc.)
    }

    const items: ChatItem[] = (data as RpcRow[]).map((r) => ({
      id: r.id,
      company: r.company_name ?? "学生",
      logo: r.company_logo,
      lastMessage: r.last_message ?? "(メッセージなし)",
      time: r.last_created
        ? format(new Date(r.last_created), "yyyy/MM/dd HH:mm", {
            locale: ja,
          })
        : "-",
      unread: r.is_unread,
      position: null,
      type: r.job_id ? "apply" : "scout",
    }))

    setChats(items)
    setLoading(false)
  }, [user])

  /* 初回ロード */
  useEffect(() => {
    void fetchChats()
  }, [fetchChats])

  /* ------- Realtime 監視 ------------------------------ */
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel("messages-listener")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => void fetchChats(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        () => void fetchChats(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchChats, user])

  /* ------- JSX --------------------------------------- */
  return (
    <main className="container mx-auto max-w-4xl px-4 py-8">
      {/* ヘッダー */}
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">チャット</h1>
        <div className="flex items-center gap-2">
          <Input
            placeholder="会社名・求人名で検索"
            className="w-56"
          />
          <Button variant="outline" size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* タブ */}
      <Tabs defaultValue="all">
        <TabsList className="mb-4">
          <TabsTrigger value="all">すべて</TabsTrigger>
          <TabsTrigger value="scout">スカウト</TabsTrigger>
          <TabsTrigger value="apply">応募</TabsTrigger>
        </TabsList>

        {["all", "scout", "apply"].map((tab) => (
          <TabsContent key={tab} value={tab}>
            {loading ? (
              /* ChatList の loading fallback が Skeleton を返すので
                 “loading” フラグ中もそちらに任せて良い */
              <ChatList items={[]} />
            ) : (
              <ChatList
                items={chats.filter(
                  (c) => tab === "all" || c.type === tab,
                )}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </main>
  )
}
