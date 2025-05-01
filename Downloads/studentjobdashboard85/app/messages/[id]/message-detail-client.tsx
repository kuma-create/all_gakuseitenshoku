"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ChevronLeft, Send, Calendar, Paperclip, FileText, Download, Clock, Loader2 } from "lucide-react"
import type { Database } from "@/lib/database.types"
import { useToast } from "@/hooks/use-toast"

interface MessageDetailClientProps {
  conversation: any
  messages: any[]
  interviewSchedules: any[]
  currentUser: {
    id: string
    role: string
  }
}

export default function MessageDetailClient({
  conversation,
  messages: initialMessages,
  interviewSchedules,
  currentUser,
}: MessageDetailClientProps) {
  const [messages, setMessages] = useState(initialMessages)
  const [newMessage, setNewMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [attachment, setAttachment] = useState<File | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messageContainerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient<Database>()

  // 会話相手の情報
  const partner =
    currentUser.role === "student"
      ? conversation.companies
      : {
          name: `${conversation.student_profiles.first_name || ""} ${conversation.student_profiles.last_name || ""}`,
          avatar_url: conversation.student_profiles.avatar_url,
        }

  // メッセージが更新されたらスクロールを一番下に移動
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // リアルタイム更新のセットアップ
  useEffect(() => {
    const channel = supabase
      .channel(`conversation_${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const newMessage = payload.new as any

          // 自分が送信したメッセージでない場合のみ追加
          if (newMessage.sender_id !== currentUser.id) {
            setMessages((prevMessages) => [...prevMessages, newMessage])

            // 自動的に既読にする
            supabase.from("messages").update({ is_read: true }).eq("id", newMessage.id).then()
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, conversation.id, currentUser.id])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if ((!newMessage.trim() && !attachment) || isSubmitting) return

    setIsSubmitting(true)

    try {
      let attachmentUrl = null
      let attachmentType = null
      let attachmentName = null

      // 添付ファイルがある場合はアップロード
      if (attachment) {
        const fileExt = attachment.name.split(".").pop()
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `messages/${conversation.id}/${fileName}`

        const { error: uploadError, data } = await supabase.storage.from("attachments").upload(filePath, attachment)

        if (uploadError) {
          throw uploadError
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("attachments").getPublicUrl(filePath)

        attachmentUrl = publicUrl
        attachmentType = attachment.type
        attachmentName = attachment.name
      }

      // 受信者IDを設定
      const receiverId = currentUser.role === "student" ? conversation.company_user_id : conversation.student_id

      // メッセージを送信
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversation.id,
        sender_id: currentUser.id,
        receiver_id: receiverId,
        content: newMessage.trim(),
        sender_type: currentUser.role,
        attachment_url: attachmentUrl,
        attachment_type: attachmentType,
        attachment_name: attachmentName,
      })

      if (error) {
        throw error
      }

      // 会話の更新日時を更新
      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversation.id)

      setNewMessage("")
      setAttachment(null)

      // 最新のメッセージを取得して表示を更新
      const { data: updatedMessages } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true })

      if (updatedMessages) {
        setMessages(updatedMessages)
      }

      toast({
        title: "メッセージを送信しました",
        description: "相手に届きました",
        duration: 3000,
      })
    } catch (error) {
      console.error("Error sending message:", error)
      toast({
        title: "エラー",
        description: "メッセージの送信に失敗しました。もう一度お試しください。",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAttachmentClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachment(e.target.files[0])
    }
  }

  const removeAttachment = () => {
    setAttachment(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // テキストエリアの高さを自動調整
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value)
    e.target.style.height = "auto"
    e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`
  }

  // Enterキーでメッセージを送信（Shift+Enterで改行）
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(e)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* ヘッダー */}
      <div className="flex items-center gap-4 mb-4 sticky top-0 bg-background z-10 py-2">
        <Button variant="ghost" size="icon" onClick={() => router.push("/messages")} className="shrink-0">
          <ChevronLeft className="h-5 w-5" />
          <span className="sr-only">戻る</span>
        </Button>

        <div className="flex items-center gap-3 overflow-hidden">
          {partner.avatar_url || partner.logo_url ? (
            <Image
              src={partner.avatar_url || partner.logo_url}
              alt={partner.name}
              width={40}
              height={40}
              className="rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
              <span className="text-primary font-semibold">{partner.name?.charAt(0) || "?"}</span>
            </div>
          )}

          <div className="overflow-hidden">
            <h2 className="font-semibold truncate">{partner.name}</h2>
            {conversation.jobs && (
              <p className="text-sm text-muted-foreground truncate">{conversation.jobs.job_title}</p>
            )}
          </div>
        </div>
      </div>

      <Separator className="mb-4" />

      {/* メッセージ一覧 */}
      <div ref={messageContainerRef} className="flex-1 overflow-y-auto mb-4 space-y-4 p-2 scroll-smooth">
        {/* 求人情報 */}
        {conversation.jobs && (
          <Card className="mb-4 shadow-sm border-muted">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{conversation.jobs.job_title}</h3>
                  <p className="text-sm text-muted-foreground">{conversation.companies.name}</p>
                </div>
                {conversation.application_id && (
                  <Link href={`/applications/${conversation.application_id}`}>
                    <Button variant="outline" size="sm">
                      応募詳細
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 面接スケジュール */}
        {interviewSchedules.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-2 flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>面接スケジュール</span>
            </h3>

            {interviewSchedules.map((schedule) => (
              <Card key={schedule.id} className="mb-2 shadow-sm border-muted">
                <CardContent className="p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">
                        {format(new Date(schedule.interview_date), "yyyy年MM月dd日(EEE)", { locale: ja })}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {schedule.start_time?.substring(0, 5) || ""} - {schedule.end_time?.substring(0, 5) || ""}
                        </span>
                      </div>
                      <div className="text-xs mt-1">
                        <Badge
                          variant={
                            schedule.status === "confirmed"
                              ? "default"
                              : schedule.status === "pending"
                                ? "outline"
                                : schedule.status === "cancelled"
                                  ? "destructive"
                                  : "secondary"
                          }
                        >
                          {schedule.status === "confirmed"
                            ? "確定"
                            : schedule.status === "pending"
                              ? "調整中"
                              : schedule.status === "cancelled"
                                ? "キャンセル"
                                : "完了"}
                        </Badge>
                        <span className="ml-2">{schedule.interview_type === "online" ? "オンライン" : "対面"}</span>
                      </div>
                    </div>

                    {currentUser.role === "student" && schedule.status === "pending" && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          調整
                        </Button>
                        <Button size="sm">確定</Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* メッセージ */}
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            メッセージはまだありません。最初のメッセージを送信しましょう。
          </div>
        ) : (
          messages.map((message) => {
            const isCurrentUser = message.sender_id === currentUser.id
            const messageDate = new Date(message.created_at)
            const today = new Date()
            const isToday = messageDate.toDateString() === today.toDateString()
            const dateFormat = isToday ? "HH:mm" : "MM/dd HH:mm"

            return (
              <div key={message.id} className={`flex ${isCurrentUser ? "justify-end" : "justify-start"} group`}>
                <div
                  className={`
                    max-w-[80%] sm:max-w-[70%] rounded-2xl p-3 
                    ${
                      isCurrentUser
                        ? "bg-primary text-primary-foreground rounded-tr-none"
                        : "bg-muted text-foreground rounded-tl-none"
                    }
                  `}
                >
                  {message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>}

                  {message.attachment_url && (
                    <div
                      className={`
                      mt-2 p-2 rounded flex items-center gap-2
                      ${isCurrentUser ? "bg-primary-foreground/20" : "bg-background/80"}
                    `}
                    >
                      <FileText className="h-4 w-4" />
                      <a
                        href={message.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm underline truncate flex-1"
                      >
                        {message.attachment_name || "添付ファイル"}
                      </a>
                      <a
                        href={message.attachment_url}
                        download
                        className="p-1 hover:bg-black/10 rounded"
                        aria-label="ダウンロード"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </div>
                  )}

                  <div
                    className={`
                    text-xs mt-1 opacity-70 group-hover:opacity-100 transition-opacity
                    ${isCurrentUser ? "" : ""}
                  `}
                  >
                    {format(messageDate, dateFormat)}
                    {isCurrentUser && <span className="ml-1">{message.is_read ? "既読" : "未読"}</span>}
                  </div>
                </div>
              </div>
            )
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* メッセージ入力 */}
      <form onSubmit={handleSendMessage} className="mt-auto">
        {attachment && (
          <div className="bg-muted p-2 rounded-md mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm truncate">{attachment.name}</span>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={removeAttachment} className="h-6 w-6 p-0">
              ×
            </Button>
          </div>
        )}

        <div className="flex gap-2 items-end">
          <Button type="button" variant="outline" size="icon" onClick={handleAttachmentClick} className="shrink-0">
            <Paperclip className="h-5 w-5" />
            <span className="sr-only">ファイルを添付</span>
          </Button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          />

          <Textarea
            value={newMessage}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="メッセージを入力..."
            className="flex-1 resize-none min-h-[40px] max-h-[150px] py-2"
            rows={1}
          />

          <Button type="submit" disabled={(!newMessage.trim() && !attachment) || isSubmitting} className="shrink-0">
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            <span className="sr-only">送信</span>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1 text-right">Shift+Enterで改行、Enterで送信</p>
      </form>
    </div>
  )
}
