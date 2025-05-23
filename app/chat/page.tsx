/* ─────────────────────────────────────────
   app/chat/page.tsx
   - Realtime 反映
   - Skeleton ローディング
   - ChatList を dynamic import で後読み込み
──────────────────────────────────────── */
"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { Search, Plus, Filter } from "lucide-react"

import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import {
  SkeletonCircle,
  SkeletonText,
} from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

/* ───── 型定義 ───────────────────────────── */
type ChatRoomWithRelations = {
  id: string
  company_id: string | null
  student_id: string | null
  job_id: string | null
  updated_at: string | null
  companies: { name: string; logo: string | null } | null
  jobs: { title: string | null } | null
  messages: {
    content: string
    created_at: string
    is_read: boolean
    sender_id: string
  }[]
}

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

/* ───── Skeleton (インライン定義) ─────────── */
function SkeletonChatItem() {
  return (
    <li className="flex items-center gap-4 rounded-lg p-4">
      <SkeletonCircle />
      <div className="flex-1 space-y-2">
        <SkeletonText w="w-1/2" />
        <SkeletonText w="w-1/3" />
      </div>
      <SkeletonText w="w-16" />
    </li>
  )
}

/* ───── dynamic import: ChatList ─────────── */
const ChatList = dynamic(() => import("./ChatList"), {
  loading: () => (
    <ul className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonChatItem key={i} />
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

    const { data, error } = await supabase
      .from("chat_rooms")
      .select(`
        id,
        company_id,
        student_id,
        job_id,
        updated_at,
        companies ( name, logo ),
        jobs      ( title ),
        messages:messages!messages_chat_room_id_fkey (
          content,
          created_at,
          is_read,
          sender_id
        )
      `,
      )
      .eq("student_id", user.id)
      .order("updated_at", { ascending: false })
      .returns<ChatRoomWithRelations[]>()

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

    /* 整形 */
    const items: ChatItem[] = (data ?? []).map((r) => {
      const latest = r.messages?.[0] ?? null
      const unread =
        latest && !latest.is_read && latest.sender_id !== user.id

      return {
        id: r.id,
        company: r.companies?.name ?? "不明",
        logo: r.companies?.logo ?? null,
        lastMessage: latest?.content ?? "(メッセージなし)",
        time: latest
          ? format(new Date(latest.created_at), "yyyy/MM/dd HH:mm", {
              locale: ja,
            })
          : "-",
        unread,
        position: r.jobs?.title ?? null,
        type: r.job_id ? "apply" : "scout",
      }
    })

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
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
          <Button size="icon">
            <Plus className="h-5 w-5" />
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
