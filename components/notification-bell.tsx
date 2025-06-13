"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bell } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"

type Noti = {
  id: string
  title: string
  message: string | null
  body?: string | null
  is_read: boolean
  created_at: string
}

export default function NotificationBell() {
  const { user } = useAuth()
  const userId = user?.id
  const [unread, setUnread] = useState<number>(0)
  const [list, setList] = useState<Noti[] | null>(null)
  const [loading, setLoading] = useState(false)

  /* ---- 初回ロード ---- */
  useEffect(() => {
    if (!userId) return
    supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false)
      .then(({ count }) => setUnread(count ?? 0))
  }, [userId])

  /* ---- Realtime 購読 ---- */
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        _payload => {
          setUnread(u => u + 1)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  /* ---- Popover 開いた時に最新取得 ---- */
  const loadList = async () => {
    if (!userId || loading) return
    setLoading(true)

    // fetch latest notifications
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (!error) {
      setList(data as Noti[])
      // mark unread as read
      const unreadIds = data
        .filter((n: any) => !n.is_read)
        .map((n: any) => n.id)

      if (unreadIds.length) {
        await supabase
          .from("notifications")
          .update({ is_read: true })
          .in("id", unreadIds)

        setUnread(0)
      }
    }
    setLoading(false)
  }

  if (!userId) return null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label="通知"
          className="relative transition-colors hover:text-red-600"
          onClick={loadList}
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
              {unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <h3 className="px-4 py-2 text-sm font-semibold">お知らせ</h3>
        <div className="max-h-80 overflow-y-auto">
          {loading && (
            <div className="p-4 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          )}

          {(!loading && list?.length === 0) && (
            <p className="p-4 text-sm text-gray-500">通知はありません</p>
          )}

          {(!loading && list?.length) && (
            <ul className="divide-y">
              {list.map(n => (
                <li key={n.id} className="px-4 py-2 hover:bg-muted/50">
                  <p className="text-sm font-medium">
                    {n.title}
                    {!n.is_read && (
                      <span className="ml-1 inline-block rounded bg-red-500 px-1 text-xs text-white">
                        NEW
                      </span>
                    )}
                  </p>
                  {/* body と message どちらでも読めるように */}
                  {(n.body ?? n.message) && (
                    <p className="text-xs text-gray-600">
                      {n.body ?? n.message}
                    </p>
                  )}
                  <p className="mt-1 text-[10px] text-gray-400">
                    {n.created_at && new Date(n.created_at).toLocaleString("ja-JP", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t p-2 text-center">
          <Link
            href="/notifications"
            className="text-sm text-primary hover:underline"
          >
            すべて見る
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}
