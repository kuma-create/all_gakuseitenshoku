"use client"

import { ChatContainer } from "@/components/chat/chat-container"

// Demo messages
const demoMessages = [
  {
    id: "1",
    content: "こんにちは！弊社のインターンシップに興味を持っていただきありがとうございます。",
    sender: "other" as const,
    timestamp: new Date(Date.now() - 3600000),
  },
  {
    id: "2",
    content: "はい、御社のAIプロジェクトに非常に興味があります。特に機械学習の分野で経験を積みたいと考えています。",
    sender: "user" as const,
    timestamp: new Date(Date.now() - 3500000),
  },
  {
    id: "3",
    content:
      "素晴らしいです！あなたのプロフィールを拝見しましたが、機械学習の基礎知識をお持ちのようですね。現在、私たちは自然言語処理のプロジェクトを進めています。このプロジェクトに参加することに興味はありますか？",
    sender: "other" as const,
    timestamp: new Date(Date.now() - 3400000),
  },
]

export default function ChatDemoPage() {
  return (
    <div className="flex h-screen flex-col">
      <header className="border-b bg-white p-4 shadow-sm">
        <h1 className="text-xl font-semibold">チャットデモ</h1>
      </header>

      <div className="flex-1 overflow-hidden">
        <ChatContainer initialMessages={demoMessages} />
      </div>
    </div>
  )
}
