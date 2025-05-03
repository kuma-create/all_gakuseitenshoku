"use client"

import { useState, useRef, useEffect } from "react"
import { ChatMessageInput } from "./message-input"

interface Message {
  id: string
  content: string
  sender: "user" | "other"
  timestamp: Date
}

interface ChatContainerProps {
  initialMessages?: Message[]
  onSendMessage?: (message: string) => Promise<void>
  className?: string
}

export function ChatContainer({ initialMessages = [], onSendMessage, className = "" }: ChatContainerProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // Example handler for sending messages
  const handleSendMessage = async (content: string) => {
    // If an external handler is provided, use it
    if (onSendMessage) {
      await onSendMessage(content)
      return
    }

    // Otherwise, handle locally (demo mode)
    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, newMessage])

    // Simulate response after a delay (demo only)
    setTimeout(() => {
      const response: Message = {
        id: (Date.now() + 1).toString(),
        content: `返信: ${content}`,
        sender: "other",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, response])
    }, 1000)
  }

  return (
    <div className={`flex h-full flex-col ${className}`}>
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((message) => (
          <div key={message.id} className={`mb-4 flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                message.sender === "user"
                  ? "rounded-tr-sm bg-blue-600 text-white"
                  : "rounded-tl-sm bg-white text-gray-800 shadow"
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
              <div
                className={`mt-1 text-right text-xs ${message.sender === "user" ? "text-blue-200" : "text-gray-500"}`}
              >
                {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <ChatMessageInput onSendMessage={handleSendMessage} />
    </div>
  )
}
