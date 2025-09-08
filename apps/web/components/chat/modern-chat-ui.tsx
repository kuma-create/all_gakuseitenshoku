"use client"

import { supabase } from "@/lib/supabase/client";

import type React from "react"

import { useState, useRef, useEffect, useMemo } from "react"
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
} from "lucide-react"
import type { Message } from "@/types/message"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { cn } from "@/lib/utils"
import StudentDetailTabs from "@/app/company/scout/StudentDetailTabs";
import type { Database } from "@/lib/supabase/types";
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
  /** 学部 */
  faculty?: string | null
  /** 学科 */
  department?: string | null
  /** 入学月 (YYYY‑MM 型文字列) */
  admission_month?: string | null
  /** 卒業月 (YYYY‑MM 型文字列) */
  graduation_month?: string | null
  /** 性別 */
  gender?: string | null
  /** インターン経験有無 */
  has_internship_experience?: boolean | null
  /** 研究テーマ */
  research_theme?: string | null
  /** 自己 PR */
  about?: string | null
}


interface ModernChatUIProps {
  messages: Message[]
  currentUser: "company" | "student"
  recipient: ChatUser
  onSendMessage: (message: string, attachments?: File[]) => Promise<void>
  onScheduleInterview?: (details: any) => void
  /** スカウト承諾済み or 本人応募の場合 true にする */
  showStudentTitle?: boolean
  className?: string
}

export function ModernChatUI({
  messages,
  currentUser,
  recipient,
  onSendMessage,
  onScheduleInterview,
  showStudentTitle = false,
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
  // Supabase‑fetched data
  const [profileData, setProfileData] = useState<Partial<ChatUser> | null>(null);
  /** Scout 画面と同じ型でプロファイルを渡す */
  type StudentProfile = Database["public"]["Tables"]["student_profiles"]["Row"];
  const studentForDetail: StudentProfile | null = useMemo(() => {
    if (!recipient) return null;
    return {
      ...(recipient as any),
      ...(profileData ?? {}),
    } as any;
  }, [recipient, profileData]);
  // Fetch profile from Supabase
  useEffect(() => {
    if (!recipient.id) return;

    const fetchData = async () => {
      // Fetch *all* columns plus nested resumes so that
      // StudentDetailTabs receives complete data.
      const STUDENT_SELECT = `
        *,
        resumes:resumes (
          work_experiences
        )
      `;

      let { data: prof, error: profErr } = await supabase
        .from("student_profiles")
        .select(STUDENT_SELECT)
        .eq("id", recipient.id)
        .single();

      // If no row by primary id, try auth_user_id then user_id
      if (!prof && !profErr) {
        const { data: byAuth } = await supabase
          .from("student_profiles")
          .select(STUDENT_SELECT)
          .eq("auth_user_id", recipient.id)
          .single();
        prof = byAuth ?? prof;
      }
      if (!prof && !profErr) {
        const { data: byUser } = await supabase
          .from("student_profiles")
          .select(STUDENT_SELECT)
          .eq("user_id", recipient.id)
          .single();
        prof = byUser ?? prof;
      }

      // --- Get e‑mail from the student_with_email view so that StudentDetailTabs can display it ---
      let emailFromView: string | null = null;
      const { data: emailRow, error: emailErr } = await supabase
        .from("student_with_email")
        .select("email")
        .eq("student_id", recipient.id)
        .maybeSingle();

      if (emailErr) {
        console.error("student_with_email fetch error:", emailErr);
      } else if (emailRow?.email) {
        emailFromView = emailRow.email;
      }

      if (prof || emailFromView) {
        setProfileData({
          ...(recipient as any),  // minimal ChatUser fields (id, name, avatar …)
          ...(prof as any),       // full student_profiles row (may be null)
          // Ensure StudentDetailTabs receives { student_with_email: { email } }
          student_with_email: { email: emailFromView ?? (prof as any)?.email ?? null },
        });
      } else {
        console.warn(
          "No student_profiles row and no student_with_email row matched for id/auth_user_id/user_id =",
          recipient.id,
        );
      }
    };

    fetchData();
  }, [recipient.id]);
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

  const renderAttachment = (
    attachment: NonNullable<Message["attachment"]>,
    isOwn: boolean
  ) => {
    if (attachment.type.startsWith("image/")) {
      return (
        <a
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group mt-2 inline-block max-w-xs overflow-hidden rounded-md"
        >
          <img
            src={(attachment.url ?? "/placeholder.svg")}
            alt={attachment.name}
            className="max-h-60 w-full object-contain transition-transform group-hover:scale-105"
          />
        </a>
      )
    }

    // url が undefined の場合に備えて空文字を使用
    const url = attachment.url ?? "";

    const displayName =
      attachment.name ||
      url.split("/").pop()?.split("?")[0] ||
      "ファイル";

    return (
      <a
        href={url || "#"}
        download={displayName}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "mt-2 inline-flex max-w-xs items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
          isOwn
            ? "bg-white/90 text-foreground hover:bg-white shadow"
            : "bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
        )}
      >
        <Paperclip className="h-4 w-4 shrink-0" />
        <span className="truncate">{displayName}</span>
      </a>
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
      {/* Student title bar (for accepted scout / self‑applied) */}
      {showStudentTitle && currentUser === "company" && (
        <div className="sticky top-12 z-30 bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-4 py-2">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 border dark:border-gray-600">
              <AvatarImage src={recipient.avatar || "/placeholder.png"} alt={recipient.name} />
              <AvatarFallback>{getInitials(recipient.name)}</AvatarFallback>
            </Avatar>
            <span className="text-base font-semibold text-gray-800 dark:text-gray-100">
              {recipient.name || "学生"}
            </span>
          </div>
        </div>
      )}
      {/* Chat header (企業側のみ表示) */}
      {currentUser === "company" && (
        <div className="sticky top-12 left-0 right-0 z-30 bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border dark:border-gray-600">
              <AvatarImage src={recipient.avatar || "/placeholder.png"} alt={recipient.name} />
              <AvatarFallback>{getInitials(recipient.name)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center">
                <h3 className="font-medium dark:text-white">{recipient.name}</h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {currentUser === "company"
                  ? `${recipient.university || ""} ${recipient.faculty || ""}`
                  : recipient.company || ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
              <TabsList className="h-8 p-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg flex gap-0.5 sticky top-0 z-20">
                <TabsTrigger
                  value="chat"
                  className="h-7 px-3 text-xs rounded-md data-[state=active]:bg-white data-[state=active]:shadow data-[state=inactive]:opacity-80"
                >
                  <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                  チャット
                </TabsTrigger>
                {currentUser === "company" && (
                  <>
                    <TabsTrigger
                      value="profile"
                      className="h-7 px-3 text-xs rounded-md data-[state=active]:bg-white data-[state=active]:shadow data-[state=inactive]:opacity-80"
                    >
                      <User className="h-3.5 w-3.5 mr-1.5" />
                      プロフィール
                    </TabsTrigger>
                  </>
                )}
                {/* {currentUser === "student" && (
                  <TabsTrigger
                    value="job"
                    className="h-7 px-3 text-xs rounded-md data-[state=active]:bg-white data-[state=active]:shadow data-[state=inactive]:opacity-80"
                  >
                    <Briefcase className="h-3.5 w-3.5 mr-1.5" />
                    求人詳細
                  </TabsTrigger>
                )} */}
              </TabsList>
            </Tabs>
          </div>
        </div>
        </div>
      )}

      {/* Main content area with dynamic padding for sidebar */}
      <Tabs
        value={activeTab}
        className="flex-1 flex flex-col min-h-0 transition-all duration-300"
        style={mainContentStyle}
      >
        <TabsContent
          value="chat"
          className="flex-1 flex flex-col min-h-0 p-0 m-0 w-full"
        >
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
                          <AvatarImage src={recipient.avatar || "/placeholder.png"} alt={recipient.name} />
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

                        {message.attachment && renderAttachment(message.attachment, isCurrentUser)}

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
                          src={previewUrls[index] || "/placeholder.png"}
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

        {/* Profile tab - company only */}
        {currentUser === "company" && (
          <TabsContent
            value="profile"
            className="fixed top-[64px] right-0 w-full md:w-[350px] h-[calc(100%-64px)] overflow-y-auto p-0 m-0 bg-white dark:bg-gray-800 border-l dark:border-gray-700 shadow-md z-10"
          >
              {/* --- Student detail (reuse scout component) --- */}
              <StudentDetailTabs student={studentForDetail} showContact />
          </TabsContent>
        )}


        {/* Job details tab removed. */}
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
