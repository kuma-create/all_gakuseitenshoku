// app/company/chat/[chatId]/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { format } from "date-fns"
import { ja } from "date-fns/locale"

// ← デフォルトではなく named import に
import { ModernChatUI } from "@/components/chat/modern-chat-ui"
// Message 型も named import
import type { Message as ChatMessage } from "@/types/message"
import { ThemeToggle } from "@/components/theme-toggle"

/** モック用の“生”メッセージ型 */
type RawMessage = {
  id: number
  sender: string
  content: string
  timestamp: string
  status: string
  attachment?: {
    type: string
    url: string
    name: string
  }
}

/** モック用のチャット型 */
type RawChat = {
  id: string
  student: {
    id: number
    name: string
    university: string
    major: string
    graduationYear: number
    avatar: string
    status: string
  }
  messages: RawMessage[]
}

const mockChats: Record<string, RawChat> = {
  "1": {
    id: "1",
    student: {
      id: 1,
      name: "山田 太郎",
      university: "東京大学",
      major: "情報工学",
      graduationYear: 2024,
      avatar: "/placeholder.svg?height=40&width=40",
      status: "オンライン",
    },
    messages: [
      {
        id: 1,
        sender: "company",
        content:
          "山田さん、こんにちは。弊社のフロントエンドエンジニアのポジションに興味を持っていただきありがとうございます。",
        timestamp: "2023-05-10T10:30:00",
        status: "read",
      },
      // …（元のメッセージをすべて含めてください）
      {
        id: 10,
        sender: "company",
        content: "金曜日の14時はいかがでしょうか？",
        timestamp: "2023-05-10T11:15:00",
        status: "delivered",
      },
    ],
  },
  "2": {
    id: "2",
    student: {
      id: 2,
      name: "佐藤 花子",
      university: "京都大学",
      major: "経営学",
      graduationYear: 2025,
      avatar: "/placeholder.svg?height=40&width=40",
      status: "オフライン",
    },
    messages: [],
  },
}

export default function ChatPage() {
  const { chatId } = useParams()
  const [chat, setChat] = useState<RawChat | null>(null)

  useEffect(() => {
    const data = mockChats[chatId as string] ?? null
    setChat(data)
  }, [chatId])

  const handleSendMessage = async (
    content: string,
    attachments?: File[]
  ): Promise<void> => {
    if (!chat) return

    // TODO: 本番ではここで Supabase 連携
    console.log("送信:", content, attachments)
    await new Promise((r) => setTimeout(r, 500))

    const nextId =
      chat.messages.length > 0
        ? Math.max(...chat.messages.map((m) => m.id)) + 1
        : 1

    const newMsg: RawMessage = {
      id: nextId,
      sender: "company",
      content: content.trim(),
      timestamp: new Date().toISOString(),
      status: "sent",
    }
    if (attachments && attachments.length > 0) {
      const file = attachments[0]
      newMsg.attachment = {
        type: file.type,
        url: URL.createObjectURL(file),
        name: file.name,
      }
    }

    setChat({
      ...chat,
      messages: [...chat.messages, newMsg],
    })

    // delivered → read をシミュレート
    setTimeout(() => {
      setChat((prev) =>
        prev
          ? {
              ...prev,
              messages: prev.messages.map((m) =>
                m.id === nextId ? { ...m, status: "delivered" } : m
              ),
            }
          : prev
      )
    }, 1000)

    setTimeout(() => {
      setChat((prev) =>
        prev
          ? {
              ...prev,
              messages: prev.messages.map((m) =>
                m.id === nextId ? { ...m, status: "read" } : m
              ),
            }
          : prev
      )
    }, 3000)
  }

  const handleScheduleInterview = (details: {
    date: Date
    time: string
    duration: string
    type: "オンライン" | "オフライン"
    location: string
  }) => {
    const formatted = format(details.date, "yyyy年MM月dd日", { locale: ja })
    const msg = `面接日程を設定しました。\n日時: ${formatted} ${
      details.time
    }～\n所要時間: ${details.duration}\n${
      details.type === "オンライン"
        ? `URL: ${details.location}`
        : `場所: ${details.location}`
    }`
    void handleSendMessage(msg)
  }

  if (!chat) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  // RawMessage → ChatMessage にマッピング
  const messages: ChatMessage[] = chat.messages.map((m) => ({
    id: m.id,
    sender: m.sender as ChatMessage["sender"],
    content: m.content,
    timestamp: m.timestamp,
    status: m.status as ChatMessage["status"],   // ← Union にキャスト
    ...(m.attachment ? { attachment: m.attachment } : {}),
  }))

  return (
    <div className="flex h-screen flex-col">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <ModernChatUI
        messages={messages}
        currentUser="company"
        recipient={{
          id: chat.student.id,
          name: chat.student.name,
          avatar: chat.student.avatar,
          status: chat.student
            .status as "オンライン" | "オフライン" | "離席中",
          university: chat.student.university,
          major: chat.student.major,
        }}
        onSendMessage={handleSendMessage}
        onScheduleInterview={handleScheduleInterview}
        className="h-full"
      />
    </div>
  )
}
