"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  Send,
  Paperclip,
  Calendar,
  Clock,
  CheckCheck,
  Check,
  X,
  MessageSquare,
  User,
  FileText,
  Briefcase,
} from "lucide-react"
import type { Message } from "@/types/message"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ChatUser {
  id: string
  name: string
  avatar?: string
  status?: "オンライン" | "オフライン" | "離席中"
  lastSeen?: string
  role?: string
  company?: string
  university?: string
  major?: string
}

interface ModernChatUIProps {
  messages: Message[]
  currentUser: "company" | "student"
  recipient: ChatUser
  onSendMessage: (message: string, attachments?: File[]) => Promise<void>
  onScheduleInterview?: (details: any) => void
  className?: string
}

export function ModernChatUI({
  messages,
  currentUser,
  recipient,
  onSendMessage,
  onScheduleInterview,
  className,
}: ModernChatUIProps) {
  const [newMessage, setNewMessage] = useState("")
  const [attachments, setAttachments] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [isComposing, setIsComposing] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [showTools, setShowTools] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeTab, setActiveTab] = useState<string>("chat")
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [selectedTime, setSelectedTime] = useState<string>("15:00")
  const [selectedDay, setSelectedDay] = useState<string>("")
  const [isMobile, setIsMobile] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.style.height = "auto"
    const newHeight = Math.min(textarea.scrollHeight, 120)
    textarea.style.height = `${newHeight}px`
  }, [newMessage])

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Create preview URLs for attachments
  useEffect(() => {
    const urls = attachments.map((file) => URL.createObjectURL(file))
    setPreviewUrls(urls)

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [attachments])

  // Show suggestions based on conversation context
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1]

      // If the last message is from the other person and contains keywords about scheduling
      if (
        lastMessage.sender !== currentUser &&
        (lastMessage.content.includes("面接") ||
          lastMessage.content.includes("日程") ||
          lastMessage.content.includes("時間") ||
          lastMessage.content.includes("いつ"))
      ) {
        setShowSuggestions(true)
      } else {
        setShowSuggestions(false)
      }
    }
  }, [messages, currentUser])

  // Handle window resize for responsive layout
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSend = async () => {
    if ((!newMessage.trim() && attachments.length === 0) || isSending || isComposing) return

    try {
      setIsSending(true)
      await onSendMessage(newMessage, attachments)
      setNewMessage("")
      setAttachments([])
      setPreviewUrls([])
    } catch (error) {
      console.error("Failed to send message:", error)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && e.shiftKey) return
    if (e.key === "Enter" && !isComposing) {
      e.preventDefault()
      handleSend()
    }
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
    setNewMessage(templateText)
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
    setShowTools(false)
  }

  const handleScheduleSubmit = async () => {
    if (!selectedDate || !selectedTime) return

    // Format the date for display
    const dateObj = new Date(selectedDate)
    const formattedDate = format(dateObj, "yyyy年M月d日", { locale: ja })
    const dayOfWeek = format(dateObj, "(E)", { locale: ja })

    // Create system message
    const systemMessage = `面談候補日: ${formattedDate}${dayOfWeek} ${selectedTime}`

    try {
      setIsSending(true)
      // Send as a regular message for now
      await onSendMessage(systemMessage)
      setShowDatePicker(false)
    } catch (error) {
      console.error("Failed to send schedule:", error)
    } finally {
      setIsSending(false)
    }
  }

  const formatMessageDate = (dateString: string) => {
    const date = new Date(dateString)
    return format(date, "M月d日 HH:mm", { locale: ja })
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const renderMessageStatus = (status: Message["status"], timestamp: string) => {
    return (
      <div className="flex items-center gap-1 text-xs opacity-70">
        <span>{format(new Date(timestamp), "HH:mm")}</span>
        {status === "sent" && <Clock className="h-3 w-3" />}
        {status === "delivered" && <Check className="h-3 w-3" />}
        {status === "read" && <CheckCheck className="h-3 w-3" />}
      </div>
    )
  }

  const renderAttachment = (attachment: NonNullable<Message["attachment"]>) => {
    if (attachment.type.startsWith("image/")) {
      return (
        <div className="mt-2 rounded-md overflow-hidden">
          <img
            src={attachment.url || "/placeholder.svg"}
            alt={attachment.name}
            className="max-w-full h-auto max-h-60 object-contain"
          />
        </div>
      )
    }

    return (
      <div className="mt-2 flex items-center gap-2 rounded-md bg-gray-100 p-2 dark:bg-gray-700">
        <div className="text-blue-500">📎</div>
        <span className="text-sm truncate max-w-[200px]">{attachment.name}</span>
      </div>
    )
  }

  // Generate time options for the scheduler
  const timeOptions = [
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "12:00",
    "12:30",
    "13:00",
    "13:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
    "17:00",
    "17:30",
    "18:00",
    "18:30",
  ]

  // PC はページ側でサイドバーを常時表示しているので padding 調整はモバイル時のみ
  const mainContentStyle = isMobile && activeTab !== "chat" ? { paddingRight: "350px" } : {}

  return (
    <div className={cn("flex flex-col h-full bg-gray-50 dark:bg-gray-900", className)}>
      {/* Chat header - always visible */}
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border dark:border-gray-600">
              <AvatarImage src={recipient.avatar || "/placeholder.svg"} alt={recipient.name} />
              <AvatarFallback>{getInitials(recipient.name)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium dark:text-white">{recipient.name}</h3>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    recipient.status === "オンライン"
                      ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
                  )}
                >
                  {recipient.status}
                </Badge>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {currentUser === "company"
                  ? `${recipient.university || ""} ${recipient.major || ""}`
                  : recipient.company || ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
              <TabsList className="h-8 p-0.5">
                <TabsTrigger value="chat" className="h-7 px-3 text-xs">
                  <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                  チャット
                </TabsTrigger>
                {currentUser === "company" && (
                  <>
                    <TabsTrigger value="profile" className="h-7 px-3 text-xs">
                      <User className="h-3.5 w-3.5 mr-1.5" />
                      プロフィール
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="h-7 px-3 text-xs">
                      <FileText className="h-3.5 w-3.5 mr-1.5" />
                      書類
                    </TabsTrigger>
                  </>
                )}
                {currentUser === "student" && (
                  <TabsTrigger value="job" className="h-7 px-3 text-xs md:hidden">
                    <Briefcase className="h-3.5 w-3.5 mr-1.5" />
                    求人詳細
                  </TabsTrigger>
                )}
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Main content area with dynamic padding for sidebar */}
      <Tabs
        value={activeTab}
        className="flex-1 flex flex-col overflow-hidden transition-all duration-300"
        style={mainContentStyle}
      >
        <TabsContent value="chat" className="flex-1 flex flex-col p-0 m-0 data-[state=active]:flex-1 w-full">
          {/* Messages area */}
          <div
            ref={chatContainerRef}
            className="flex-1 min-h-0 overflow-y-auto p-4"
          >
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400">
                <div className="mb-3 rounded-full bg-gray-100 p-3 dark:bg-gray-800">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <p className="mb-1 text-lg font-medium">メッセージはまだありません</p>
                <p className="text-sm">最初のメッセージを送信しましょう</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => {
                  const isCurrentUser = message.sender === currentUser
                  const isSystemMessage = message.sender === "system"
                  const showAvatar = !isSystemMessage && (index === 0 || messages[index - 1].sender !== message.sender)

                  if (isSystemMessage) {
                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex justify-center"
                      >
                        <div className="bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-1 text-xs text-gray-600 dark:text-gray-300">
                          {message.content}
                        </div>
                      </motion.div>
                    )
                  }

                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`flex items-end gap-2 ${isCurrentUser ? "justify-end" : "justify-start"}`}
                    >
                      {!isCurrentUser && showAvatar && (
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarImage src={recipient.avatar || "/placeholder.svg"} alt={recipient.name} />
                          <AvatarFallback>{getInitials(recipient.name)}</AvatarFallback>
                        </Avatar>
                      )}

                      {!isCurrentUser && !showAvatar && <div className="w-8" />}

                      <div
                        className={cn(
                          "max-w-[80%] rounded-2xl px-4 py-2",
                          isCurrentUser
                            ? "rounded-br-sm bg-blue-600 text-white dark:bg-blue-700"
                            : "rounded-bl-sm bg-white text-gray-800 shadow-sm dark:bg-gray-800 dark:text-gray-100",
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>

                        {message.attachment && renderAttachment(message.attachment)}

                        <div
                          className={cn(
                            "mt-1 flex justify-end items-center gap-1",
                            isCurrentUser ? "text-blue-200 dark:text-blue-300" : "text-gray-500 dark:text-gray-400",
                          )}
                        >
                          {isCurrentUser ? (
                            renderMessageStatus(message.status, message.timestamp)
                          ) : (
                            <span className="text-xs">{format(new Date(message.timestamp), "HH:mm")}</span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Suggestions */}
          <AnimatePresence>
            {showSuggestions && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="px-4 py-2 border-t dark:border-gray-700"
              >
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  <Button
                    variant="outline"
                    size="sm"
                    className="whitespace-nowrap"
                    onClick={() => {
                      if (onScheduleInterview) {
                        setActiveTab("schedule")
                      } else {
                        handleTemplateSelect(
                          "面接の日程調整をさせていただきたいと思います。ご都合の良い日時を教えていただけますか？",
                        )
                      }
                    }}
                  >
                    <Calendar className="h-3.5 w-3.5 mr-1.5" />
                    面接日程を提案
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="whitespace-nowrap"
                    onClick={() =>
                      handleTemplateSelect("ご質問ありがとうございます。詳細については以下をご確認ください。")
                    }
                  >
                    <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                    質問に回答
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="whitespace-nowrap"
                    onClick={() => handleTemplateSelect("添付資料をご確認ください。")}
                  >
                    <FileText className="h-3.5 w-3.5 mr-1.5" />
                    資料を送付
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Message input area */}
          <div className="border-t bg-white p-3 dark:bg-gray-800 dark:border-gray-700 sticky bottom-0">
            {/* Attachment previews */}
            {attachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {attachments.map((file, index) => (
                  <div key={index} className="relative group">
                    {file.type.startsWith("image/") ? (
                      <div className="relative h-16 w-16 rounded overflow-hidden border dark:border-gray-600">
                        <img
                          src={previewUrls[index] || "/placeholder.svg"}
                          alt={file.name}
                          className="h-full w-full object-cover"
                        />
                        <button
                          onClick={() => handleRemoveAttachment(index)}
                          className="absolute top-0 right-0 bg-black bg-opacity-50 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
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

            <div className="flex items-end gap-2">
              {/* Left side action buttons */}
              <div className="flex gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Paperclip className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>ファイルを添付</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        onClick={() => setShowDatePicker(true)}
                      >
                        <Calendar className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>日程を調整</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                  multiple
                />
              </div>

              <div className="flex-1 rounded-2xl border bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                <Textarea
                  ref={textareaRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={() => setIsComposing(false)}
                  placeholder="メッセージを入力..."
                  className="min-h-[40px] max-h-[120px] border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 resize-none py-3 px-4 text-sm"
                />
              </div>

              <Button
                type="button"
                onClick={handleSend}
                disabled={(!newMessage.trim() && attachments.length === 0) || isSending || isComposing}
                size="icon"
                className={cn(
                  "h-10 w-10 rounded-full",
                  (!newMessage.trim() && attachments.length === 0) || isSending || isComposing
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500"
                    : "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800",
                )}
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>

            {isComposing && (
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                <span>入力中...</span>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Profile tab - now fixed to the right side on desktop */}
        <TabsContent
          value="profile"
          className="fixed top-0 right-0 w-full md:w-[350px] h-full overflow-y-auto p-0 m-0 bg-white dark:bg-gray-800 border-l dark:border-gray-700 shadow-md z-10 md:pt-[60px]"
        >
          {/* Header section */}
          <div className="relative">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 h-32 w-full"></div>
            <div className="absolute -bottom-16 left-0 w-full flex justify-center">
              <Avatar className="h-32 w-32 border-4 border-white dark:border-gray-800 shadow-md">
                <AvatarImage src={recipient.avatar || "/placeholder.svg"} alt={recipient.name} />
                <AvatarFallback className="text-2xl">{getInitials(recipient.name)}</AvatarFallback>
              </Avatar>
            </div>
          </div>

          <div className="mt-20 px-6 pb-6 space-y-6">
            {/* Name and status */}
            <div className="text-center">
              <h2 className="text-xl font-semibold">{recipient.name}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {recipient.university} {recipient.major}
              </p>
              <div className="flex justify-center mt-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    recipient.status === "オンライン"
                      ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
                  )}
                >
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full mr-1.5",
                      recipient.status === "オンライン" ? "bg-green-500" : "bg-gray-400",
                    )}
                  ></div>
                  {recipient.status}
                </Badge>
              </div>
            </div>

            {/* Skills section */}
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center">
                <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 p-1 rounded-md mr-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-code-2"
                  >
                    <path d="m18 16 4-4-4-4" />
                    <path d="m6 8-4 4 4 4" />
                    <path d="m14.5 4-5 16" />
                  </svg>
                </span>
                スキル
              </h3>
              <div className="flex flex-wrap gap-2">
                <div className="bg-white dark:bg-gray-700 rounded-full px-3 py-1 text-sm shadow-sm border border-gray-100 dark:border-gray-600">
                  React
                </div>
                <div className="bg-white dark:bg-gray-700 rounded-full px-3 py-1 text-sm shadow-sm border border-gray-100 dark:border-gray-600">
                  TypeScript
                </div>
                <div className="bg-white dark:bg-gray-700 rounded-full px-3 py-1 text-sm shadow-sm border border-gray-100 dark:border-gray-600">
                  Next.js
                </div>
                <div className="bg-white dark:bg-gray-700 rounded-full px-3 py-1 text-sm shadow-sm border border-gray-100 dark:border-gray-600">
                  UI/UXデザイン
                </div>
                <div className="bg-white dark:bg-gray-700 rounded-full px-3 py-1 text-sm shadow-sm border border-gray-100 dark:border-gray-600">
                  Git
                </div>
              </div>
            </div>

            {/* Experience section */}
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center">
                <span className="bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 p-1 rounded-md mr-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-briefcase"
                  >
                    <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                </span>
                経歴
              </h3>
              <div className="space-y-3">
                <div className="bg-white dark:bg-gray-700 rounded-lg p-3 shadow-sm border border-gray-100 dark:border-gray-600">
                  <div className="flex items-start">
                    <div className="bg-gray-100 dark:bg-gray-600 p-2 rounded-md mr-3">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="lucide lucide-building-2"
                      >
                        <path d="M6 22V2a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v20" />
                        <path d="M18 11h.01" />
                        <path d="M18 14h.01" />
                        <path d="M18 17h.01" />
                        <path d="M18 20h.01" />
                        <path d="M10 7H8" />
                        <path d="M10 10H8" />
                        <path d="M10 13H8" />
                        <path d="M10 16H8" />
                        <path d="M10 19H8" />
                        <path d="M6 22h16" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">テックスタートアップ株式会社</h4>
                        <span className="text-xs text-gray-500 dark:text-gray-400">2022年6月〜9月</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        フロントエンドエンジニアインターン
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        React、TypeScriptを使用したWebアプリケーション開発に従事。UIコンポーネントの設計と実装を担当。
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-700 rounded-lg p-3 shadow-sm border border-gray-100 dark:border-gray-600">
                  <div className="flex items-start">
                    <div className="bg-gray-100 dark:bg-gray-600 p-2 rounded-md mr-3">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="lucide lucide-graduation-cap"
                      >
                        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                        <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">大学プロジェクト</h4>
                        <span className="text-xs text-gray-500 dark:text-gray-400">2021年10月〜2022年2月</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">チームリーダー</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        5人チームでのWebアプリケーション開発プロジェクト。要件定義から実装までを担当。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Self-PR section */}
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center">
                <span className="bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 p-1 rounded-md mr-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-user"
                  >
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                自己PR
              </h3>
              <div className="bg-white dark:bg-gray-700 rounded-lg p-4 shadow-sm border border-gray-100 dark:border-gray-600 relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-green-500 rounded-l-lg"></div>
                <div className="max-h-[150px] overflow-y-auto pr-1 text-sm text-gray-600 dark:text-gray-300">
                  <p>
                    私はフロントエンド開発に情熱を持っており、特にReactとTypeScriptを用いたモダンなUI開発に強みがあります。
                    ユーザー体験を向上させるための細部へのこだわりと、効率的なコード設計を心がけています。
                  </p>
                  <p className="mt-2">
                    チームでの開発経験もあり、コミュニケーションを大切にしながら業務に取り組むことができます。
                    新しい技術への探究心も強く、常に最新のフロントエンド技術のトレンドをキャッチアップしています。
                  </p>
                  <p className="mt-2">
                    御社のミッションとビジョンに共感し、技術を通じて社会に貢献できることを楽しみにしています。
                  </p>
                </div>
              </div>
            </div>

            {/* Education section */}
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center">
                <span className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 p-1 rounded-md mr-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-book-open"
                  >
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  </svg>
                </span>
                学歴
              </h3>
              <div className="bg-white dark:bg-gray-700 rounded-lg p-3 shadow-sm border border-gray-100 dark:border-gray-600">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{recipient.university}</h4>
                  <span className="text-xs text-gray-500 dark:text-gray-400">2020年4月〜現在</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{recipient.major}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">GPA: 3.8/4.0</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Documents tab - now fixed to the right side on desktop */}
        <TabsContent
          value="documents"
          className="fixed top-0 right-0 w-full md:w-[350px] h-full overflow-y-auto p-4 m-0 bg-white dark:bg-gray-800 border-l dark:border-gray-700 shadow-md z-10 md:pt-[60px]"
        >
          <div className="space-y-4">
            <div className="border dark:border-gray-700 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 p-2 rounded">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">履歴書</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">PDF • 2023年4月15日アップロード</p>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                <FileText className="h-4 w-4 mr-1" />
                表示
              </Button>
            </div>

            <div className="border dark:border-gray-700 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 p-2 rounded">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">職務経歴書</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">PDF • 2023年4月15日アップロード</p>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                <FileText className="h-4 w-4 mr-1" />
                表示
              </Button>
            </div>

            <div className="border dark:border-gray-700 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 p-2 rounded">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">ポートフォリオ</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">URL • 2023年4月15日提出</p>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                <FileText className="h-4 w-4 mr-1" />
                表示
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Job details tab - now fixed to the right side on desktop */}
        <TabsContent
          value="job"
          className="fixed top-0 right-0 w-full md:w-[350px] h-full overflow-y-auto p-4 m-0 bg-white dark:bg-gray-800 border-l dark:border-gray-700 shadow-md z-10 md:pt-[60px] md:hidden"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src="/abstract-geometric-logo.png" alt="会社ロゴ" />
                <AvatarFallback>CO</AvatarFallback>
              </Avatar>
              <div>
                <h4 className="text-xl font-medium">フロントエンドエンジニア</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">株式会社テクノロジー</p>
              </div>
            </div>

            <div className="grid gap-2">
              <h5 className="font-medium">募集要項</h5>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">雇用形態</p>
                  <p>正社員</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">勤務地</p>
                  <p>東京都渋谷区</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">給与</p>
                  <p>年収450万円〜700万円</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">勤務時間</p>
                  <p>フレックスタイム制</p>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <h5 className="font-medium">必須スキル</h5>
              <div className="flex flex-wrap gap-1">
                <Badge variant="secondary">React</Badge>
                <Badge variant="secondary">TypeScript</Badge>
                <Badge variant="secondary">HTML/CSS</Badge>
                <Badge variant="secondary">Git</Badge>
              </div>
            </div>

            <div className="grid gap-2">
              <h5 className="font-medium">歓迎スキル</h5>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline">Next.js</Badge>
                <Badge variant="outline">GraphQL</Badge>
                <Badge variant="outline">UI/UXデザイン</Badge>
                <Badge variant="outline">テスト自動化</Badge>
              </div>
            </div>

            <div className="grid gap-2">
              <h5 className="font-medium">仕事内容</h5>
              <p className="text-sm">
                当社のWebアプリケーション開発チームの一員として、フロントエンド開発を担当していただきます。
                ReactとTypeScriptを用いたモダンなUI開発、コンポーネント設計、パフォーマンス最適化などを行っていただきます。
                また、バックエンドエンジニアやデザイナーと協力して、ユーザー体験の向上に取り組んでいただきます。
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Date picker dialog */}
      <Dialog open={showDatePicker} onOpenChange={setShowDatePicker}>
        <DialogContent className="sm:max-w-[425px]">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">面談日程の調整</h3>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="meeting-date">日付</Label>
                <Input
                  id="meeting-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="meeting-time">時間</Label>
                <Select value={selectedTime} onValueChange={setSelectedTime}>
                  <SelectTrigger id="meeting-time">
                    <SelectValue placeholder="時間を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowDatePicker(false)}>
                キャンセル
              </Button>
              <Button onClick={handleScheduleSubmit} disabled={!selectedDate || !selectedTime}>
                <Calendar className="mr-2 h-4 w-4" />
                日程を送信
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
