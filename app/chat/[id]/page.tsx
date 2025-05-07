"use client"

import { useState, useEffect, useTransition, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { ModernChatUI } from "@/components/chat/modern-chat-ui"
import { ThemeToggle } from "@/components/theme-toggle"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/types"
import type { Message } from "@/types/message"

// ─────────────────────────────────────────
// 型定義
// ─────────────────────────────────────────
type ChatRoomRow = Database["public"]["Tables"]["chat_rooms"]["Row"]
type CompanyRow  = Database["public"]["Tables"]["companies"]["Row"]
type MessageRow  = Database["public"]["Tables"]["messages"]["Row"]

interface ChatData {
  room: ChatRoomRow
  company: CompanyRow
  messages: Message[]
}

// ─────────────────────────────────────────
// ページコンポーネント
// ─────────────────────────────────────────
export default function StudentChatPage() {
  const params  = useParams()
  const router  = useRouter()
  const chatId  = params.id as string
  const [chat, setChat] = useState<ChatData | null>(null) // ← ChatData に Message[] が含まれるので OK
  const [, startTransition] = useTransition()

  // 1. 初期ロード
  useEffect(() => {
    const supabase = createClient()

    const loadChat = async () => {
      const supabase = createClient()

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser()
      if (userErr || !user) {
        console.error("認証ユーザーが取れません", userErr)
        return
      }

      /* chat room + company 取得 */
      const { data: room, error: roomErr } = await supabase
        .from("chat_rooms")
        .select("*, companies(*)")
        .eq("id", chatId)
        .maybeSingle<ChatRoomRow & { companies: CompanyRow }>()

      if (roomErr || !room) {
        console.error(roomErr)
        router.push("/chat")
        return
      }

      /* messages 取得 */
      const { data: msgs, error: msgErr } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_room_id", chatId)
        .order("created_at", { ascending: true })
        .returns<MessageRow[]>()

      if (msgErr) {
        console.error(msgErr)
        return
      }

  

      const mapped: Message[] = msgs.map((m) => ({
        id:        Number(m.id),
        sender:    m.sender_id === user.id ? "student" : "company", // ← user.id が使える
        content:   m.content,
        timestamp: m.created_at ?? "",
        status:    m.is_read ? "read" : "delivered",
        attachment: m.attachment_url
          ? { type: "file", url: m.attachment_url, name: "添付" }
          : undefined,
      }))
    
      setChat({ room, company: room.companies, messages: mapped })
    }
    

    loadChat()
  }, [chatId, router])

  // 2. メッセージ送信
  const handleSendMessage = useCallback(
    async (message: string, attachments?: File[]): Promise<void> => {
      if (!chat) return

      const supabase = createClient()

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser()
      if (userErr || !user) {
        console.error("ユーザー取得失敗", userErr)
        return
      }

      /* 添付ファイル (任意) */
      let attachmentInfo: Message["attachment"] | undefined
      if (attachments?.length) {
        const file = attachments[0]
        const { data, error } = await supabase.storage
          .from("attachments")
          .upload(`${chatId}/${Date.now()}-${file.name}`, file, {
            contentType: file.type,
          })
        if (error) {
          console.error(error)
          return
        }
        attachmentInfo = {
          type: file.type,
          url:  supabase.storage.from("attachments").getPublicUrl(data.path).data.publicUrl,
          name: file.name,
        }
      }

      /* DB へ INSERT */
      const { data: inserted, error } = await supabase
        .from("messages")
        .insert({
          chat_room_id: chatId,
          sender_id: /* ← 現在ログインしている supabase.auth.user().id */ user.id,
          content: message.trim(),
          attachment_url: attachmentInfo?.url ?? null,
          is_read: false,
        })
        .select()
        .single<MessageRow>()

      if (error || !inserted) {
        console.error(error)
        return
      }

      /* 楽観的更新 */
      const newMsg: Message = {
        id:        Number(inserted.id),
        sender:    "student",
        content:   inserted.content,
        timestamp: inserted.created_at ?? "",
        status:    "sent",
        attachment: attachmentInfo,
      }
      
      setChat((prev) =>
        prev ? { ...prev, messages: [...prev.messages, newMsg] } : prev,
      )

      /* 擬似 delivered */
      startTransition(() => {
        setTimeout(() => {
          setChat((prev) =>
            prev
              ? {
                  ...prev,
                  messages: prev.messages.map((m) =>
                    m.id === newMsg.id ? { ...m, status: "delivered" } : m,
                  ),
                }
              : prev,
          )
        }, 1000)
      })
    },
    [chat, chatId],
  )

  // ──────────────────────────────
  // UI
  // ──────────────────────────────
  if (!chat) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <ModernChatUI
        /* 受信・送信済みメッセージ */
        messages={chat.messages}
        /* 今ログインしている側を指定 */
        currentUser="student"
        /* 相手（企業）情報 */
        recipient={{
          id:      Number.parseInt(chat.company.id.replace(/[^0-9]/g, "").slice(0, 9)) || 0,
          name:    chat.company.name,
          avatar:  chat.company.logo ?? "", 
          status:  "オフライン",  
        }}
        /* メッセージ送信ハンドラ */
        onSendMessage={handleSendMessage}
        className="h-full"
      />
    </div>
  )
}
