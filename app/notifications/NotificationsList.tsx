/* --------------------------------------------------------------------------
   app/notifications/NotificationsList.tsx
   - Client-side component: realtime notifications feed
-------------------------------------------------------------------------- */
"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/types"
import Link from "next/link"


type Noti = Database["public"]["Tables"]["notifications"]["Row"]

export default function NotificationsList({ userId: initialUserId }: { userId?: string }) {
  const [list, setList] = useState<Noti[]>([])
  const [loading, setLoading] = useState(true)
  const [uid, setUid] = useState<string | null>(initialUserId ?? null)

  useEffect(() => {
    if (!uid) {
      supabase.auth.getUser().then(res => {
        const fetchedId = res.data.user?.id ?? null
        setUid(fetchedId)
      })
      return
    }

    /* 初期取得 */
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setList(data ?? [])
        setLoading(false)
        if (data) void markAllAsRead(data)  // ★ 追加
      })

    /* Realtime 購読 */
    const ch = supabase
      .channel(`notifications:${uid}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${uid}`,
        },
        payload => {
          if (payload.eventType === "INSERT") {
            setList(prev => [payload.new as any, ...prev])
          } else if (payload.eventType === "UPDATE") {
            setList(prev =>
              prev.map(n => (n.id === payload.new.id ? (payload.new as any) : n)),
            )
          }
        },
      )
      .subscribe()

    return () => {
      // Do not return the Promise directly – React cleanup must return void
      void supabase.removeChannel(ch)
    }
  }, [uid])

  /** 通知タイプと related_id から遷移先を推定 */
  const deriveHref = (n: Noti): string => {
    // 1) DB に url が入っていれば優先
    if ((n as any).url) return (n as any).url as string

    // 2) url が無い場合は type + related_id から動的生成
    switch (n.notification_type) {
      case "application":
        return `/student/applications/${n.related_id}`

      case "chat":
        return `/student/chat/${n.related_id}`

      // 追加したい notification_type があればここに追記
      default:
        return "#"
    }
  }

  /** 未読の場合のみ既読にする */
  const markAsReadIfUnread = async (n: Noti) => {
    if (n.is_read) return

    // 1) 楽観的 UI 更新
    setList(prev =>
      prev.map(item =>
        item.id === n.id ? { ...item, is_read: true } : item,
      ),
    )

    // 2) DB 更新
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", n.id)
      .eq("user_id", uid ?? n.user_id)

    // 3) 失敗したらロールバック
    if (error) {
      console.error("notifications update error:", error)
      setList(prev =>
        prev.map(item =>
          item.id === n.id ? { ...item, is_read: false } : item,
        ),
      )
    }
  }

  /** 一覧表示と同時に未読をすべて既読化する */
  const markAllAsRead = async (items: Noti[]) => {
    if (!uid) return
    // まだ未読の ID 一覧を抽出
    const unreadIds = items.filter(i => !i.is_read).map(i => i.id)
    if (unreadIds.length === 0) return

    // 1) 楽観的 UI 更新
    setList(prev =>
      prev.map(item =>
        unreadIds.includes(item.id) ? { ...item, is_read: true } : item,
      ),
    )

    // 2) DB を一括更新
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", unreadIds)
      .eq("user_id", uid!)

    // 3) 失敗時はロールバック
    if (error) {
      console.error("notifications bulk update error:", error)
      setList(prev =>
        prev.map(item =>
          unreadIds.includes(item.id) ? { ...item, is_read: false } : item,
        ),
      )
    }
  }

  /* Skeleton は parent の <Suspense> が表示する */
  if (loading) return null

  if (!uid) return <p className="text-gray-500">ログインが必要です</p>

  if (list.length === 0) return <p className="text-gray-500">通知はありません</p>

  return (
    <ul className="space-y-4">
      {list.map(n => (
        <li key={n.id}>
          <Link
            href={deriveHref(n)}
            onClick={() => markAsReadIfUnread(n)}
            className={`block rounded border p-4 ${
              n.is_read ? "bg-muted" : "bg-white"
            } hover:bg-gray-50 transition cursor-pointer`}
          >
            <div>
              <p className="font-medium">{n.title}</p>
              {n.message && <p className="text-sm text-gray-600">{n.message}</p>}
              <p className="mt-1 text-xs text-gray-400">
                {n.created_at &&
                  new Date(n.created_at).toLocaleString("ja-JP", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}