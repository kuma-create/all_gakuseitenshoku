"use client"

import { LazyImage } from "@/components/ui/lazy-image"
import { Badge } from "@/components/ui/badge"

type Msg = {
  id: string
  student_name: string
  content: string
  created_at: string
  is_read: boolean
}

export default function MessagesPreview({ messages }: { messages: Msg[] }) {
  return (
    <div className="space-y-3">
      {messages.map((m) => (
        <div key={m.id} className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-full bg-gray-200">
              <LazyImage
                src="/placeholder.svg?height=40&width=40&text=👤"
                alt={m.student_name}
                width={40}
                height={40}
              />
            </div>
            <div>
              <p className="font-medium">{m.student_name}</p>
              <p className="text-sm text-gray-600 line-clamp-1">{m.content}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">
              {new Date(m.created_at).toLocaleString("ja-JP", {
                month: "numeric",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            {!m.is_read && <Badge className="mt-1 bg-red-500">未読</Badge>}
          </div>
        </div>
      ))}
    </div>
  )
}
