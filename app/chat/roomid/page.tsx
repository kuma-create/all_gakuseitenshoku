/* ───────────────────────────────────────────────
   チャット詳細ページ
────────────────────────────────────────────── */
"use client"

import { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import { LazyImage } from "@/components/ui/lazy-image"
import { ArrowUp } from "lucide-react"
import { format } from "date-fns"
import { ja }    from "date-fns/locale"

import { supabase } from "@/lib/supabase/client"
import { useAuth }  from "@/lib/auth-context"
import { markMessagesRead, sendMessage } from "../chat-actions"

import { Input }  from "@/components/ui/input"
import { Button } from "@/components/ui/button"

/* ---------- 型 ---------- */
type MessageRow = {
  id: string
  sender_id: string
  content: string
  is_read: boolean
  created_at: string
}

/* ---------- 画面 ---------- */
export default function ChatRoomPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const { user }   = useAuth()

  const [messages, setMessages] = useState<MessageRow[]>([])
  const [input,    setInput]    = useState("")
  const bottomRef  = useRef<HTMLDivElement>(null)

  /* 初回ロード + 既読化 */
  useEffect(() => {
    if (!roomId || !user) return
    ;(async () => {
      /* メッセージ取得 */
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_room_id", roomId as string)
        .order("created_at", { ascending: true })
        .returns<MessageRow[]>()

      setMessages(data ?? [])

      /* 未読→既読 */
      await markMessagesRead(roomId as string, user.id)
    })()
  }, [roomId, user])

  /* Realtime 購読 */
  useEffect(() => {
    if (!roomId) return
    const channel = supabase.channel("room-" + roomId)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `chat_room_id=eq.${roomId}` },
        payload => {
          setMessages(prev => [...prev, payload.new as MessageRow])
          // 受信側なら既読化（自分が送信した場合は sender_id が同じなのでスキップ）
          if (payload.new.sender_id !== user?.id) {
            markMessagesRead(roomId as string, user!.id)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId, user])

  /* 送信 */
  async function handleSend() {
    if (!input.trim()) return
    if (!roomId || !user) return

    await sendMessage(roomId as string, user.id, input.trim())
    setInput("")
  }

  /* 自動スクロール */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  /* ---------- JSX ---------- */
  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      {/* ------- メッセージ一覧 ------- */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(m => {
          const isMe = m.sender_id === user?.id
          return (
            <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              {!isMe && (
                <LazyImage
                  src="/avatar-default.png"
                  alt="avatar"
                  width={32}
                  height={32}
                  className="mr-2 rounded-full"
                />
              )}
              <div
                className={`rounded-md px-3 py-2 text-sm shadow ${
                  isMe ? "bg-primary text-white" : "bg-gray-100"
                }`}
              >
                <p>{m.content}</p>
                <span className="mt-1 block text-[10px] text-right text-gray-400">
                  {format(new Date(m.created_at), "MM/dd HH:mm", { locale: ja })}
                </span>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* ------- 入力欄 ------- */}
      <form
        onSubmit={(e) => {
          e.preventDefault(); void handleSend()
        }}
        className="flex gap-2 border-t p-3"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="メッセージを入力"
          className="flex-1"
        />
        <Button size="icon" type="submit">
          <ArrowUp className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}
