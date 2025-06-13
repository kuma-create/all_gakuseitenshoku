/* --------------------------------------------------------------------------
   app/notifications/NotificationsList.tsx
   - Client-side component: realtime notifications feed
-------------------------------------------------------------------------- */
"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/types"


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

  /* Skeleton は parent の <Suspense> が表示する */
  if (loading) return null

  if (!uid) return <p className="text-gray-500">ログインが必要です</p>

  if (list.length === 0) return <p className="text-gray-500">通知はありません</p>

  return (
    <ul className="space-y-4">
      {list.map(n => (
        <li
          key={n.id}
          className={`rounded border p-4 ${
            n.is_read ? "bg-muted" : "bg-white"
          }`}
        >
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
        </li>
      ))}
    </ul>
  )
}