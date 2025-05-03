"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search, MessageSquare, Clock, ChevronRight, Filter, SortDesc, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { motion, AnimatePresence } from "framer-motion"

// Mock data for chats
const mockChats = [
  {
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
    lastMessage: {
      content: "金曜日の14時はいかがでしょうか？",
      timestamp: "2023-05-10T11:15:00",
      isRead: true,
      sender: "company",
    },
    unreadCount: 0,
    tags: ["面接候補", "インターン"],
  },
  {
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
    lastMessage: {
      content: "インターンシップの詳細について教えていただけますか？",
      timestamp: "2023-05-09T15:30:00",
      isRead: false,
      sender: "student",
    },
    unreadCount: 2,
    tags: ["質問対応中"],
  },
  {
    id: "3",
    student: {
      id: 3,
      name: "鈴木 一郎",
      university: "大阪大学",
      major: "電子工学",
      graduationYear: 2024,
      avatar: "/placeholder.svg?height=40&width=40",
      status: "オフライン",
    },
    lastMessage: {
      content: "履歴書を添付しました。ご確認いただければ幸いです。",
      timestamp: "2023-05-08T09:45:00",
      isRead: true,
      sender: "student",
    },
    unreadCount: 0,
    tags: ["書類選考中"],
  },
  {
    id: "4",
    student: {
      id: 4,
      name: "高橋 実",
      university: "名古屋大学",
      major: "機械工学",
      graduationYear: 2025,
      avatar: "/placeholder.svg?height=40&width=40",
      status: "オンライン",
    },
    lastMessage: {
      content: "面接の日程変更は可能でしょうか？",
      timestamp: "2023-05-07T16:20:00",
      isRead: false,
      sender: "student",
    },
    unreadCount: 1,
    tags: ["面接調整中"],
  },
  {
    id: "5",
    student: {
      id: 5,
      name: "伊藤 美咲",
      university: "早稲田大学",
      major: "デザイン学",
      graduationYear: 2024,
      avatar: "/placeholder.svg?height=40&width=40",
      status: "オフライン",
    },
    lastMessage: {
      content: "ポートフォリオのリンクをお送りします。",
      timestamp: "2023-05-06T13:10:00",
      isRead: true,
      sender: "student",
    },
    unreadCount: 0,
    tags: ["内定候補"],
  },
]

// Available tags for filtering
const availableTags = ["すべて", "面接候補", "インターン", "質問対応中", "書類選考中", "面接調整中", "内定候補"]

export default function ChatListPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "unread">("newest")
  const [showFilters, setShowFilters] = useState(false)
  const [pinnedChats, setPinnedChats] = useState<string[]>([])

  // Filter chats based on search term, active tab, and selected tags
  const filteredChats = mockChats
    .filter((chat) => {
      const matchesSearch =
        chat.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chat.student.university.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chat.lastMessage.content.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesTab = activeTab === "all" || (activeTab === "unread" && chat.unreadCount > 0)

      const matchesTags = selectedTags.length === 0 || chat.tags.some((tag) => selectedTags.includes(tag))

      return matchesSearch && matchesTab && matchesTags
    })
    .sort((a, b) => {
      // First sort by pinned status
      if (pinnedChats.includes(a.id) && !pinnedChats.includes(b.id)) return -1
      if (!pinnedChats.includes(a.id) && pinnedChats.includes(b.id)) return 1

      // Then sort by the selected sort order
      if (sortOrder === "unread") {
        return b.unreadCount - a.unreadCount
      } else if (sortOrder === "newest") {
        return new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime()
      } else {
        return new Date(a.lastMessage.timestamp).getTime() - new Date(b.lastMessage.timestamp).getTime()
      }
    })

  // Format date for display
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

  // Navigate to individual chat
  const navigateToChat = (chatId: string) => {
    router.push(`/company/chat/${chatId}`)
  }

  // Toggle pin status for a chat
  const togglePinChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setPinnedChats((prev) => (prev.includes(chatId) ? prev.filter((id) => id !== chatId) : [...prev, chatId]))
  }

  // Handle tag selection
  const handleTagSelect = (tag: string) => {
    if (tag === "すべて") {
      setSelectedTags([])
    } else {
      setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
    }
  }

  return (
    <div className="container mx-auto py-6 px-4">
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
            onClick={() => setShowFilters(!showFilters)}
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
                {sortOrder === "newest" ? "新しい順" : sortOrder === "oldest" ? "古い順" : "未読優先"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-0">
              <div className="p-1">
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
              </div>
            </PopoverContent>
          </Popover>

          <Button onClick={() => router.push("/company/scout")}>
            <MessageSquare className="mr-2 h-4 w-4" />
            スカウト
          </Button>
        </div>
      </div>

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
                    onClick={() => handleTagSelect(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-4">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="all">すべてのメッセージ</TabsTrigger>
          <TabsTrigger value="unread">
            未読メッセージ
            {mockChats.reduce((count, chat) => count + chat.unreadCount, 0) > 0 && (
              <Badge variant="destructive" className="ml-2">
                {mockChats.reduce((count, chat) => count + chat.unreadCount, 0)}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-3">
        {filteredChats.length > 0 ? (
          filteredChats.map((chat) => (
            <motion.div
              key={chat.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card
                className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer ${
                  chat.unreadCount > 0 ? "border-l-4 border-l-blue-500" : ""
                } ${pinnedChats.includes(chat.id) ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                onClick={() => navigateToChat(chat.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1 min-w-0">
                      <div className="relative h-12 w-12 rounded-full overflow-hidden flex-shrink-0">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={chat.student.avatar || "/placeholder.svg"} alt={chat.student.name} />
                          <AvatarFallback>
                            {chat.student.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                            chat.student.status === "オンライン" ? "bg-green-500" : "bg-gray-400"
                          }`}
                        />
                      </div>
                      <div className="ml-4 flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h3 className={`font-medium truncate ${chat.unreadCount > 0 ? "font-semibold" : ""}`}>
                              {chat.student.name}
                            </h3>
                            {pinnedChats.includes(chat.id) && (
                              <span className="text-blue-500 dark:text-blue-400">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <line x1="12" y1="17" x2="12" y2="22" />
                                  <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
                                </svg>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center ml-2">
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {formatDate(chat.lastMessage.timestamp)}
                            </span>
                            {chat.unreadCount > 0 && (
                              <Badge className="ml-2 bg-blue-500 text-white">{chat.unreadCount}</Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 truncate">
                          {chat.student.university} • {chat.student.major}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <p
                            className={`text-sm truncate ${
                              chat.unreadCount > 0
                                ? "font-medium text-gray-900 dark:text-gray-100"
                                : "text-gray-500 dark:text-gray-400"
                            }`}
                          >
                            {chat.lastMessage.sender === "company" && "あなた: "}
                            {chat.lastMessage.content}
                          </p>
                          <div className="flex gap-1 ml-2 flex-shrink-0">
                            {chat.tags.slice(0, 1).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs px-1 py-0 h-5">
                                {tag}
                              </Badge>
                            ))}
                            {chat.tags.length > 1 && (
                              <Badge variant="outline" className="text-xs px-1 py-0 h-5">
                                +{chat.tags.length - 1}
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 hover:opacity-100"
                              onClick={(e) => togglePinChat(chat.id, e)}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className={pinnedChats.includes(chat.id) ? "text-blue-500" : ""}
                              >
                                <line x1="12" y1="17" x2="12" y2="22" />
                                <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
                              </svg>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 ml-2 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="text-gray-400 mb-4">
              <MessageSquare className="h-12 w-12 mx-auto" />
            </div>
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

      {filteredChats.length > 0 && (
        <div className="mt-6 text-center text-sm text-gray-500 flex items-center justify-center">
          <Clock className="h-4 w-4 mr-1" />
          <span>最終更新: 2025年4月25日 10:30</span>
        </div>
      )}
    </div>
  )
}
