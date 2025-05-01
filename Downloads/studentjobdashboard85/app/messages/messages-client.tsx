"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { formatDistanceToNow } from "date-fns"
import { ja } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

interface MessagesClientProps {
  conversations: any[]
  userRole: string
  userId: string
}

export default function MessagesClient({ conversations, userRole, userId }: MessagesClientProps) {
  const [searchTerm, setSearchTerm] = useState("")

  // 検索フィルター
  const filteredConversations = conversations.filter((conv) => {
    const searchTarget =
      userRole === "student"
        ? conv.companies?.name || ""
        : `${conv.student_profiles?.first_name || ""} ${conv.student_profiles?.last_name || ""}`

    return (
      searchTarget.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (conv.jobs?.job_title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (conv.latestMessage?.content || "").toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  return (
    <div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <Input
          type="text"
          placeholder="メッセージを検索"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="space-y-2">
        {filteredConversations.length > 0 ? (
          filteredConversations.map((conv) => (
            <Link href={`/messages/${conv.id}`} key={conv.id}>
              <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-4">
                  {userRole === "student" ? (
                    <div className="flex-shrink-0">
                      {conv.companies?.logo_url ? (
                        <Image
                          src={conv.companies.logo_url || "/placeholder.svg"}
                          alt={conv.companies.name}
                          width={48}
                          height={48}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-gray-500 font-semibold">{conv.companies?.name?.charAt(0) || "?"}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-shrink-0">
                      {conv.student_profiles?.avatar_url ? (
                        <Image
                          src={conv.student_profiles.avatar_url || "/placeholder.svg"}
                          alt={`${conv.student_profiles.first_name} ${conv.student_profiles.last_name}`}
                          width={48}
                          height={48}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-gray-500 font-semibold">
                            {conv.student_profiles?.first_name?.charAt(0) || "?"}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold truncate">
                        {userRole === "student"
                          ? conv.companies?.name
                          : `${conv.student_profiles?.first_name || ""} ${conv.student_profiles?.last_name || ""}`}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {conv.latestMessage?.created_at
                          ? formatDistanceToNow(new Date(conv.latestMessage.created_at), {
                              addSuffix: true,
                              locale: ja,
                            })
                          : ""}
                      </span>
                    </div>

                    {conv.jobs && <div className="text-sm text-gray-600 mb-1">{conv.jobs.job_title}</div>}

                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-500 truncate">
                        {conv.latestMessage?.content || "メッセージがありません"}
                      </p>

                      {conv.unreadCount > 0 && (
                        <Badge variant="destructive" className="ml-2">
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? "検索条件に一致するメッセージはありません" : "メッセージはありません"}
          </div>
        )}
      </div>
    </div>
  )
}
