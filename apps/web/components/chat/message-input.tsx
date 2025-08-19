"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Send, Loader2 } from "lucide-react"

interface ChatMessageInputProps {
  onSendMessage: (message: string) => Promise<void>
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function ChatMessageInput({
  onSendMessage,
  placeholder = "メッセージを入力...",
  disabled = false,
  className = "",
}: ChatMessageInputProps) {
  const [message, setMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isComposing, setIsComposing] = useState(false) // IME composition state
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea (up to 3 lines)
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = "auto"

    // Calculate the number of lines
    const lineHeight = Number.parseInt(getComputedStyle(textarea).lineHeight) || 20
    const maxHeight = lineHeight * 3 // 3 lines max

    // Set the height based on content (with max height)
    const newHeight = Math.min(textarea.scrollHeight, maxHeight)
    textarea.style.height = `${newHeight}px`
  }, [message])

  const handleSend = async () => {
    if (!message.trim() || disabled || isSending || isComposing) return

    try {
      setIsSending(true)
      await onSendMessage(message.trim())
      setMessage("")
      // Auto-scroll is handled by the parent component
    } catch (error) {
      console.error("Failed to send message:", error)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // If Shift+Enter, allow default behavior (new line)
    if (e.key === "Enter" && e.shiftKey) {
      return
    }

    // If Enter and not composing, send message
    if (e.key === "Enter" && !isComposing) {
      e.preventDefault()
      handleSend()
    }
    // If Enter and composing, allow default behavior (IME conversion)
  }

  return (
    <div className={`sticky bottom-0 border-t bg-white p-3 ${className}`}>
      <div className="flex items-end rounded-lg border bg-gray-50 p-2 shadow-sm">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder={placeholder}
          disabled={disabled || isSending}
          className="max-h-24 min-h-[40px] w-full resize-none rounded-md border-0 bg-transparent p-1 focus:outline-none focus:ring-0"
          aria-label="メッセージ入力欄"
        />
        <button
          onClick={handleSend}
          disabled={!message.trim() || disabled || isSending || isComposing}
          className={`ml-2 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-colors ${
            !message.trim() || disabled || isSending || isComposing
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
          aria-label="メッセージを送信"
        >
          {isSending ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>
      {isComposing && (
        <div className="mt-1 text-xs text-gray-500">
          <span>入力中...</span>
        </div>
      )}
    </div>
  )
}
