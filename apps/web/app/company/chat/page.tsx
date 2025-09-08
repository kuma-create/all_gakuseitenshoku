// app/company/chat/page.tsx
"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import {
  Search,
  MessageSquare,
  Clock,
  Filter,
  SortDesc,
  X,
  ChevronRight,
} from "lucide-react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { motion, AnimatePresence } from "framer-motion"

// --- Supabase 返却データ型 ---
type RawChatRow = {
  id: string
  student_profiles: {
    id: string
    full_name: string
    university: string
    department: string
    graduation_month: string         // ISO date string
    avatar_url: string | null
    status: "オンライン" | "オフライン"
  }
  messages: {
    id: string            // もし必要なら
    sender_id: string
    content: string
    is_read: boolean | null
    attachment_url: string | null
    created_at: string
  }[]
}

// --- UI 用データ型 ---
interface ChatItem {
  id: string
  student: {
    id: string
    name: string
    university: string
    major: string
    graduationYear: number
    avatar: string
    status: "オンライン" | "オフライン"
  }
  lastMessage:
    | {
        content: string
        timestamp: string
        sender: "student" | "company"
        isRead: boolean
      }
    | null
  unreadCount: number
  tags: string[]           // 今回はいったん空配列固定
}

export default function ChatListPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [chats, setChats] = useState<ChatItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "unread">("newest")
  const [showFilters, setShowFilters] = useState(false)
  const [pinnedChats, setPinnedChats] = useState<string[]>([])

  // — データ取得 & 整形 —
// 認証ユーザー取得
const fetchChats = useCallback(async () => {
  setLoading(true);
  setError(null);

  // 1) 会社ユーザーの ID を取得
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    setError("認証情報が取得できませんでした");
    setLoading(false);
    return;
  }
  const companyAuthUserId = user.id;  // Supabase auth uid

  try {
    // 2) company_id で絞り込み & 正しいカラム名で取得
    const { data, error: sbError } = await supabase
      .from("chat_rooms")
      .select(`
        id,
        company_id,
        student_profiles (
          id,
          full_name,
          university,
          department,
          graduation_month,
          avatar_url,
          status
        ),
        messages (
          id,
          sender_id,
          content,
          is_read,
          attachment_url,
          created_at
        )
      `);

    if (sbError) throw sbError;

      // TS のヒントに従い、一度 unknown に落としてから RawChatRow[] にキャスト
      const raw = (data ?? []) as unknown as RawChatRow[]

      const items: ChatItem[] = raw.map((r) => {
        // メッセージは日付順にソート
        const msgs = Array.isArray(r.messages) ? [...r.messages] : []
        msgs.sort(
          (a, b) =>
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime()
        )
        const last = msgs.length ? msgs[msgs.length - 1] : null
        const lastSender: "company" | "student" = last
          ? last.sender_id === companyAuthUserId
            ? "company"
            : "student"
          : "company"
        const unread = msgs.filter(
          (m) => m.sender_id !== companyAuthUserId && !m.is_read
        ).length;
        
        return {
          id: r.id,
          student: {
            id: r.student_profiles.id,
            name: r.student_profiles.full_name,
            university: r.student_profiles.university,
            major: r.student_profiles.department,
            graduationYear: r.student_profiles.graduation_month
              ? new Date(r.student_profiles.graduation_month).getFullYear()
              : NaN,
            avatar: r.student_profiles.avatar_url || "/placeholder.svg",
            status: r.student_profiles.status,
          },
          lastMessage: last
            ? {
                content: last.content,
                timestamp: last.created_at,
                sender: lastSender,
                isRead: last.is_read ?? false,
              }
            : null,
          unreadCount: unread,
          tags: [],
        }
      })

      setChats(items)
    } catch (e: any) {
      console.error(e)
      setError(e.message)
      toast({
        title: "の取得に失敗しました",
        description: e.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchChats()
  }, [fetchChats])

  // — 日付フォーマット —
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return `${date.getHours()}:${date.getMinutes().toString().padStart(2, "0")}`
    } else if (diffDays === 1) {
      return "昨日"
    } else if (diffDays < 7) {
      const days = ["日", "月", "火", "水", "木", "金", "土"]
      return `${days[date.getDay()]}曜日`
    } else {
      return `${date.getMonth() + 1}/${date.getDate()}`
    }
  }

  // — フィルタ＆ソート —
  const filtered = chats
    .filter((chat) => {
      const term = (searchTerm ?? "").toLowerCase();

      // 各フィールドが null/undefined の場合に備えて空文字に変換
      const studentName = (chat.student.name ?? "").toLowerCase();
      const studentUniversity = (chat.student.university ?? "").toLowerCase();
      const lastContent = chat.lastMessage?.content
        ? chat.lastMessage.content.toLowerCase()
        : "";

      const matchSearch =
        studentName.includes(term) ||
        studentUniversity.includes(term) ||
        lastContent.includes(term);

      const matchTab =
        activeTab === "all" || (activeTab === "unread" && chat.unreadCount > 0);

      const matchTags =
        selectedTags.length === 0 ||
        chat.tags.some((t) => selectedTags.includes(t));

      return matchSearch && matchTab && matchTags;
    })
    .sort((a, b) => {
      // ピン優先
      if (pinnedChats.includes(a.id) && !pinnedChats.includes(b.id)) return -1
      if (!pinnedChats.includes(a.id) && pinnedChats.includes(b.id)) return 1
      // 未読優先
      if (sortOrder === "unread") {
        return b.unreadCount - a.unreadCount
      }
      // 日付順
      const ta = a.lastMessage?.timestamp ?? ""
      const tb = b.lastMessage?.timestamp ?? ""
      return sortOrder === "newest"
        ? new Date(tb).getTime() - new Date(ta).getTime()
        : new Date(ta).getTime() - new Date(tb).getTime()
    })

  // --- 既読フラグを更新 ---
  const markMessagesAsRead = async (chatRoomId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    // 学生→企業の未読メッセージだけを既読にする
    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("chat_room_id", chatRoomId)
      .neq("sender_id", user.id)
      .eq("is_read", false)
  }

  // — 操作ハンドラ —
  const navigateToChat = async (id: string) => {
    // 楽観的にローカルの未読数をクリア
    setChats((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              unreadCount: 0,
              lastMessage: c.lastMessage
                ? { ...c.lastMessage, isRead: true }
                : null,
            }
          : c
      )
    )

    // DB 上でも既読フラグを立てる
    await markMessagesAsRead(id)

    // 詳細チャット画面へ遷移
    router.push(`/company/chat/${id}`)
  }
  const togglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setPinnedChats((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }
  const availableTags = ["すべて", ...Array.from(new Set(chats.flatMap((c) => c.tags)))]
  const handleTag = (tag: string) => {
    if (tag === "すべて") {
      setSelectedTags([])
    } else {
      setSelectedTags((prev) =>
        prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
      )
    }
  }

  // — ローディング & エラー状態 —
  if (loading) {
    return (
      <div className="space-y-4 p-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent>
              <Skeleton className="h-6 w-1/3 mb-2" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertTitle>読み込みエラー</AlertTitle>
          <AlertDescription>
            {error}
            <div className="mt-2">
              <Button onClick={fetchChats}>再読み込み</Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // — メイン UI —
  return (
    <div className="container mx-auto py-6 px-4">
      {/* ヘッダー */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">メッセージ</h1>
          <p className="text-gray-500">学生とのチャットメッセージを管理</p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={() => setShowFilters((f) => !f)}
          >
            <Filter className="h-4 w-4" />
            フィルター
            {selectedTags.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {selectedTags.length}
              </Badge>
            )}
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <SortDesc className="h-4 w-4" />
                {sortOrder === "newest"
                  ? "新しい順"
                  : sortOrder === "oldest"
                  ? "古い順"
                  : "未読優先"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1">
              <Button
                variant={sortOrder === "newest" ? "secondary" : "ghost"}
                size="sm"
                className="w-full justify-start"
                onClick={() => setSortOrder("newest")}
              >
                新しい順
              </Button>
              <Button
                variant={sortOrder === "oldest" ? "secondary" : "ghost"}
                size="sm"
                className="w-full justify-start"
                onClick={() => setSortOrder("oldest")}
              >
                古い順
              </Button>
              <Button
                variant={sortOrder === "unread" ? "secondary" : "ghost"}
                size="sm"
                className="w-full justify-start"
                onClick={() => setSortOrder("unread")}
              >
                未読優先
              </Button>
            </PopoverContent>
          </Popover>
          <Button onClick={() => router.push("/company/scout")}>
            <MessageSquare className="mr-2 h-4 w-4" />
            スカウト
          </Button>
        </div>
      </div>

      {/* 検索バー */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            placeholder="名前、大学、メッセージで検索..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* タグフィルター */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 overflow-hidden"
          >
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border dark:border-gray-700">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">タグでフィルター</h3>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowFilters(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {availableTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={
                      tag === "すべて"
                        ? selectedTags.length === 0
                          ? "default"
                          : "outline"
                        : selectedTags.includes(tag)
                        ? "default"
                        : "outline"
                    }
                    className="cursor-pointer"
                    onClick={() => handleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* タブ切り替え */}
      <Tabs
        defaultValue="all"
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "all" | "unread")}
        className="mb-4"
      >
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="all">すべてのメッセージ</TabsTrigger>
          <TabsTrigger value="unread">
            未読メッセージ
            {chats.reduce((cnt, c) => cnt + c.unreadCount, 0) > 0 && (
              <Badge variant="destructive" className="ml-2">
                {chats.reduce((cnt, c) => cnt + c.unreadCount, 0)}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* チャット一覧 */}
      <div className="space-y-3">
        {filtered.length > 0 ? (
          filtered.map((chat) => (
            <motion.div
              key={chat.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => navigateToChat(chat.id)}
            >
              <Card
                className={`group hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer ${
                  chat.unreadCount > 0 ? "border-l-4 border-l-blue-500" : ""
                } ${pinnedChats.includes(chat.id) ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
              >
                <CardContent className="p-4 flex items-start">
                  <div className="relative h-12 w-12 rounded-full overflow-hidden flex-shrink-0">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={chat.student.avatar} alt={chat.student.name} />
                      <AvatarFallback>
                        {(chat.student.name ?? "")
                          .split(" ")
                          .filter(Boolean)
                          .map((n) => n[0])
                          .join("") || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                        chat.student.status === "オンライン" ? "bg-green-500" : "bg-gray-400"
                      }`}
                    />
                  </div>
                  <div className="ml-4 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className={`font-medium truncate ${chat.unreadCount > 0 ? "font-semibold" : ""}`}>
                        {chat.student.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {chat.lastMessage ? formatDate(chat.lastMessage.timestamp) : ""}
                        </span>
                        {chat.unreadCount > 0 && (
                          <Badge className="ml-2 bg-blue-500 text-white">{chat.unreadCount}</Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {chat.student.university} ・ {chat.student.major}
                    </p>
                    <p
                      className={`text-sm mt-1 truncate ${
                        chat.unreadCount > 0
                          ? "font-medium text-gray-900 dark:text-gray-100"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {chat.lastMessage?.sender === "company" ? "あなた: " : ""}
                      {chat.lastMessage?.content}
                    </p>
                  </div>
                  <div className="flex flex-col items-end ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                      onClick={(e) => togglePin(chat.id, e)}
                    >
                      <ChevronRight className="h-4 w-4 rotate-90" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">メッセージが見つかりません</h3>
            <p className="text-gray-500 mb-4">検索条件に一致するメッセージはありません。</p>
            {(searchTerm || selectedTags.length > 0) && (
              <div className="flex justify-center gap-2">
                {searchTerm && (
                  <Button variant="outline" onClick={() => setSearchTerm("")}>
                    検索をクリア
                  </Button>
                )}
                {selectedTags.length > 0 && (
                  <Button variant="outline" onClick={() => setSelectedTags([])}>
                    フィルターをクリア
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 最終更新タイムスタンプ */}
      {filtered.length > 0 && (
        <div className="mt-6 text-center text-sm text-gray-500 flex items-center justify-center">
          <Clock className="h-4 w-4 mr-1" />
          <span>最終更新: {new Date().toLocaleString()}</span>
        </div>
      )}
    </div>
  )
}
