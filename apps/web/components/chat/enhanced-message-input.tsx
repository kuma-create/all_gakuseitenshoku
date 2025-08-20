"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Send, Paperclip, Smile, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { MessageTemplates } from "./message-templates"

interface EnhancedMessageInputProps {
  onSendMessage: (message: string, attachments?: File[]) => void
  disabled?: boolean
}

export function EnhancedMessageInput({ onSendMessage, disabled = false }: EnhancedMessageInputProps) {
  const [message, setMessage] = useState("")
  const [isComposing, setIsComposing] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-resize textarea effect
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = "auto"

    // Calculate the number of lines
    const lineHeight = 20 // Approximate line height
    const maxHeight = lineHeight * 5 // 5 lines max

    // Set the height based on content (with max height)
    const newHeight = Math.min(textarea.scrollHeight, maxHeight)
    textarea.style.height = `${newHeight}px`
  }, [message])

  // Create preview URLs for attachments
  useEffect(() => {
    const urls = attachments.map((file) => URL.createObjectURL(file))
    setPreviewUrls(urls)

    // Clean up URLs when component unmounts
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [attachments])

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

  const handleSend = () => {
    if ((!message.trim() && attachments.length === 0) || disabled) return

    onSendMessage(message, attachments)
    setMessage("")
    setAttachments([])
    setPreviewUrls([])
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files)
      setAttachments((prev) => [...prev, ...newFiles])
    }
  }

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
    URL.revokeObjectURL(previewUrls[index])
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index))
  }

  const handleTemplateSelect = (templateText: string) => {
    setMessage(templateText)
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  return (
    <div className="border-t bg-white p-3 dark:bg-gray-800 dark:border-gray-700">
      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((file, index) => (
            <div key={index} className="relative">
              {file.type.startsWith("image/") ? (
                <div className="relative h-16 w-16 rounded overflow-hidden border dark:border-gray-600">
                  <img
                    src={previewUrls[index] || "/placeholder.svg"}
                    alt={file.name}
                    className="h-full w-full object-cover"
                  />
                  <button
                    onClick={() => handleRemoveAttachment(index)}
                    className="absolute top-0 right-0 bg-black bg-opacity-50 rounded-full p-0.5"
                    aria-label="添付ファイルを削除"
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
              ) : (
                <div className="relative flex items-center gap-1 rounded bg-gray-100 px-2 py-1 dark:bg-gray-700">
                  <span className="text-xs truncate max-w-[100px]">{file.name}</span>
                  <button
                    onClick={() => handleRemoveAttachment(index)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    aria-label="添付ファイルを削除"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end rounded-lg border bg-gray-50 p-2 shadow-sm dark:bg-gray-700 dark:border-gray-600">
        {/* File attachment button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full flex-shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
        >
          <Paperclip className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <span className="sr-only">ファイルを添付</span>
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
          multiple
          disabled={disabled}
        />

        {/* Message templates */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full flex-shrink-0"
              disabled={disabled}
            >
              <Smile className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              <span className="sr-only">テンプレート</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <MessageTemplates onSelect={handleTemplateSelect} />
          </PopoverContent>
        </Popover>

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder="メッセージを入力..."
          className="ml-2 max-h-24 min-h-[40px] w-full resize-none rounded-md border-0 bg-transparent p-1 focus:outline-none focus:ring-0 dark:text-white"
          disabled={disabled}
          aria-label="メッセージ入力欄"
        />

        {/* Send button */}
        <Button
          type="button"
          onClick={handleSend}
          disabled={(!message.trim() && attachments.length === 0) || disabled || isComposing}
          className={`ml-2 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-colors ${
            (!message.trim() && attachments.length === 0) || disabled || isComposing
              ? "bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-600 dark:text-gray-500"
              : "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
          }`}
          aria-label="メッセージを送信"
        >
          <Send className="h-5 w-5" aria-hidden="true" />
        </Button>
      </div>

      {isComposing && (
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          <span>入力中...</span>
        </div>
      )}
    </div>
  )
}
