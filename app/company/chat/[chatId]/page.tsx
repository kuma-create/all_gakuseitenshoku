"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { ModernChatUI } from "@/components/chat/modern-chat-ui"
import { ThemeToggle } from "@/components/theme-toggle"

// Mock data for the chat
const mockChats = {
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
      {
        id: 2,
        sender: "student",
        content:
          "こんにちは。はい、御社のフロントエンド開発に非常に興味があります。特にReactを使った開発経験を活かせればと思っています。",
        timestamp: "2023-05-10T10:35:00",
        status: "read",
      },
      {
        id: 3,
        sender: "company",
        content:
          "素晴らしいです！実は現在、Reactを使った新しいプロジェクトを開始する予定があります。山田さんのスキルセットはまさに私たちが探している人材です。",
        timestamp: "2023-05-10T10:40:00",
        status: "read",
      },
      {
        id: 4,
        sender: "student",
        content: "それは興味深いです。そのプロジェクトについて、もう少し詳しく教えていただけますか？",
        timestamp: "2023-05-10T10:45:00",
        status: "read",
      },
      {
        id: 5,
        sender: "company",
        content:
          "もちろんです。このプロジェクトは、当社の主要製品のUIを完全にリニューアルするものです。最新のReactとTypeScriptを使用し、パフォーマンスとユーザー体験を大幅に向上させることが目標です。",
        timestamp: "2023-05-10T10:50:00",
        status: "read",
      },
      {
        id: 6,
        sender: "company",
        content:
          "また、このプロジェクトでは、コンポーネントライブラリの構築も行う予定です。これにより、将来の開発効率が大幅に向上すると考えています。",
        timestamp: "2023-05-10T10:51:00",
        status: "read",
      },
      {
        id: 7,
        sender: "student",
        content:
          "それは非常に興味深いプロジェクトですね。私はインターンシップでコンポーネントライブラリの開発に携わった経験があります。ぜひ貢献したいと思います。",
        timestamp: "2023-05-10T11:00:00",
        status: "read",
      },
      {
        id: 8,
        sender: "company",
        content:
          "素晴らしいです！ぜひ一度、オフィスに来ていただいて、チームと顔を合わせながら詳細をお話しできればと思います。来週の水曜日か金曜日の午後はご都合いかがでしょうか？",
        timestamp: "2023-05-10T11:05:00",
        status: "read",
      },
      {
        id: 9,
        sender: "student",
        content: "ありがとうございます。金曜日の午後であれば都合がつきます。何時頃がよろしいでしょうか？",
        timestamp: "2023-05-10T11:10:00",
        status: "read",
      },
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

interface Message {
  id: number
  sender: "company" | "student"
  content: string
  timestamp: string
  status: "sent" | "delivered" | "read"
  attachment?: {
    type: string
    url: string
    name: string
  }
}

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const chatId = params.chatId as string
  const [chat, setChat] = useState<(typeof mockChats)[keyof typeof mockChats] | null>(null)

  useEffect(() => {
    // In a real app, fetch chat data from API
    const chatData = mockChats[chatId as keyof typeof mockChats] || null
    setChat(chatData)
  }, [chatId])

  const handleSendMessage = async (message: string, attachments?: File[]) => {
    try {
      // TODO: Supabase連携処理をここに追加
      console.log("送信:", message, attachments)

      // Simulate API delay for demo purposes
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Add the new message to the chat
      if (chat) {
        const newMsg: Message = {
          id: (chat.messages.length > 0 ? Math.max(...chat.messages.map((m) => m.id)) : 0) + 1,
          sender: "company",
          content: message.trim(),
          timestamp: new Date().toISOString(),
          status: "sent",
        }

        // If there's an attachment, add it to the message
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

        // Simulate message being delivered after a delay
        setTimeout(() => {
          setChat((prevChat) => {
            if (!prevChat) return null
            return {
              ...prevChat,
              messages: prevChat.messages.map((msg) => (msg.id === newMsg.id ? { ...msg, status: "delivered" } : msg)),
            }
          })
        }, 1000)

        // Simulate message being read after a longer delay
        setTimeout(() => {
          setChat((prevChat) => {
            if (!prevChat) return null
            return {
              ...prevChat,
              messages: prevChat.messages.map((msg) => (msg.id === newMsg.id ? { ...msg, status: "read" } : msg)),
            }
          })
        }, 3000)
      }

      return true
    } catch (error) {
      console.error("メッセージの送信に失敗しました:", error)
      throw error
    }
  }

  const handleScheduleInterview = (interviewDetails: any) => {
    // In a real app, this would create a calendar event and send an invitation
    console.log("面接予定:", interviewDetails)

    // Add a message about the scheduled interview
    const formattedDate = format(interviewDetails.date, "yyyy年MM月dd日", { locale: ja })
    const message = `面接日程を設定しました。\n日時: ${formattedDate} ${interviewDetails.time}～\n所要時間: ${interviewDetails.duration}\n${interviewDetails.type === "オンライン" ? `URL: ${interviewDetails.location}` : `場所: ${interviewDetails.location}`}`

    handleSendMessage(message)
  }

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
        messages={chat.messages}
        currentUser="company"
        recipient={{
          id: chat.student.id,
          name: chat.student.name,
          avatar: chat.student.avatar,
          status: chat.student.status as "オンライン" | "オフライン" | "離席中",
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
