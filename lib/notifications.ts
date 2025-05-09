/* ------------------------------------------------------------------
   lib/notifications.ts
   - サーバー側で使う通知 API ラッパー
------------------------------------------------------------------ */
"use server"

import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/supabase/types"

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"]

/** 未読数を返す */
export async function countUnread(userId: string) {
  const supabase = await createClient()
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false)
  return count ?? 0
}

/** 最新 20 件を取得（未読→既読→古い順） */
export async function fetchNotifications(userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("is_read", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(20)
  if (error) throw error
  return data as NotificationRow[]
}

/** 既読化 */
export async function markAsRead(ids: string[]) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .in("id", ids)
  if (error) throw error
}
