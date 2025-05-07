"use client"

import { useEffect, useState } from "react"
import { Search, Plus, Star, Briefcase, Filter } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { ja } from "date-fns/locale"

/* ------------------------------ 型定義 ------------------------------ */

interface MessageRow {
  content: string
  created_at: string
  is_read: boolean | null
}

interface ChatRoomRow {
  id: string
  job_id: string | null
  companies: { name: string; logo: string | null } | null
  jobs: { title: string } | null
  messages: MessageRow[]
}

interface ChatItem {
  id: string
  company: string
  logo: string | null
  lastMessage: string
  time: string
  unread: boolean
  position: string
  /** job_id がある＝応募 / 無い＝スカウト */
  type: "scout" | "apply"
}

/* ------------------------------ 本体 ------------------------------ */

export default function ChatPage() {
  const [chats, setChats] = useState<ChatItem[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")

  useEffect(() => {
    async function loadChats() {
      /** 1) ログインユーザー取得 */
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser()

      if (userErr || !user) {
        console.error("Not logged in", userErr)
        setLoading(false)
        return
      }

      /** 2) chat_rooms ←→ companies / jobs / messages を JOIN して取得 */
      const { data, error } = await supabase
        .from("chat_rooms")
        .select(
          `
          id,
          job_id,
          companies (
            name,
            logo
          ),
          jobs (
            title
          ),
          messages (
            content,
            created_at,
            is_read
          )
        `
        )
        .eq("student_id", user.id)
        .order("updated_at", { ascending: false })

      if (error) {
        console.error("Error loading chat rooms", error)
        setLoading(false)
        return
      }

      /** 3) UI 用に整形 */
      const items: ChatItem[] = (data as unknown as ChatRoomRow[]).map((room) => {
        const latest = room.messages
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          )[0]

        return {
          id: room.id,
          company: room.companies?.name ?? "不明",
          logo: room.companies?.logo ?? null,
          lastMessage: latest?.content ?? "",
          time: latest
            ? format(new Date(latest.created_at), "MM/dd HH:mm", { locale: ja })
            : "",
          unread: room.messages.some((m) => !m.is_read),
          position: room.jobs?.title ?? "",
          type: room.job_id ? "apply" : "scout",
        }
      })

      setChats(items)
      setLoading(false)
    }

    loadChats()
  }, [])

  /* ------------------------------ レンダリング ------------------------------ */

  if (loading) return <p className="p-6 text-center">読み込み中…</p>

  const filtered =
    query.length > 0
      ? chats.filter(
          (c) =>
            c.company.includes(query) ||
            c.lastMessage.includes(query) ||
            c.position.includes(query),
        )
      : chats

  const scout = filtered.filter((c) => c.type === "scout")
  const apply = filtered.filter((c) => c.type === "apply")

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      {/* 検索 + 新規メッセージ */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="会社名・メッセージを検索"
          className="flex-1"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button size="icon" variant="outline">
          <Filter className="h-4 w-4" />
        </Button>
        <Button className="h-8 gap-1 text-xs sm:h-10 sm:gap-2 sm:text-sm bg-red-600 hover:bg-red-700">
          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span>新規メッセージ</span>
        </Button>
      </div>

      {/* タブ */}
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
              <span>応募</span>
            </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {filtered.map((chat) => (
            <ChatCard key={chat.id} chat={chat} />
          ))}
        </TabsContent>

        <TabsContent value="scout" className="space-y-4">
          {scout.map((chat) => (
            <ChatCard key={chat.id} chat={chat} />
          ))}
        </TabsContent>

        <TabsContent value="apply" className="space-y-4">
          {apply.map((chat) => (
            <ChatCard key={chat.id} chat={chat} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}

/* ------------------------------ サブコンポーネント ------------------------------ */

function ChatCard({ chat }: { chat: ChatItem }) {
  return (
    <Link
      href={`/chat/${chat.id}`}
      className="block rounded-lg border p-4 transition hover:bg-gray-50"
    >
      <div className="flex items-start">
        <Image
          src={chat.logo || "/placeholder.png"}
          alt={chat.company}
          width={40}
          height={40}
          className="mr-3 rounded-full object-cover"
        />
        <div className="flex-1">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="font-medium">{chat.company}</h3>
            {chat.unread && <Badge className="ml-2">未読</Badge>}
          </div>
          <p className="text-sm text-gray-600">{chat.position}</p>
          <p className="mb-2 line-clamp-2 text-sm text-gray-600">
            {chat.lastMessage}
          </p>
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
