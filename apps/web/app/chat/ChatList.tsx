"use client"

import Link from "next/link"
import { LazyImage } from "@/components/ui/lazy-image"
import { Badge } from "@/components/ui/badge"
import { usePathname } from "next/navigation"

type Item = {
  id: string
  company: string
  logo: string | null
  lastMessage: string
  time: string
  unread: boolean
  position: string | null
}

export default function ChatList({ items }: { items: Item[] }) {
  const pathname = usePathname();
  // 一覧は /chat トップのときだけ表示。それ以外（/chat/[id] など）は非表示。
  const isChatTop = pathname === "/chat" || pathname?.startsWith("/chat?");
  if (!isChatTop) {
    return null;
  }
  return (
    <ul className="space-y-4">
      {items.map((c) => (
        <li key={c.id}>
          <Link
            href={`/chat/${c.id}`}
            className="flex items-center gap-4 rounded-lg border p-4 transition hover:bg-gray-50"
          >
            {/* 会社ロゴ */}
            {c.logo ? (
              <LazyImage
                src={c.logo}
                alt={c.company}
                width={48}
                height={48}
                className="rounded-full object-cover"
              />
            ) : (
              <div className="grid h-12 w-12 place-items-center rounded-full bg-gray-200 text-sm">
                {c.company.at(0)}
              </div>
            )}

            {/* テキスト部 */}
            <div className="flex-1">
              <p className="flex items-center gap-2 text-sm font-medium">
                {c.company}
                {c.unread && (
                  <Badge className="bg-red-600">NEW</Badge>
                )}
              </p>
              {c.position && (
                <p className="text-xs text-gray-500">{c.position}</p>
              )}
              <p className="mt-1 line-clamp-1 text-sm text-gray-600">
                {c.lastMessage}
              </p>
            </div>

            {/* 更新日時 */}
            <span className="ml-auto whitespace-nowrap text-xs text-gray-400">
              {c.time}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
