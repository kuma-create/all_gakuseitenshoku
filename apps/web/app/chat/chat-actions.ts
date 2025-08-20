/* ───────────────────────────────────────────────
   app/chat/chat-actions.ts – サーバーアクション集
────────────────────────────────────────────── */
"use server"

import { createClient } from "@/lib/supabase/server"

/* ------------------------------------------------
   未読メッセージを既読にする
------------------------------------------------- */
export async function markMessagesRead(
  roomId: string,
  userId: string,
) {
  const supabase = await createClient()      // ★ await を追加

  const { error } = await supabase
    .from("messages")
    .update({ is_read: true })
    .eq("chat_room_id", roomId)
    .neq("sender_id", userId)
    .eq("is_read", false)

  if (error) throw error
}

/* ------------------------------------------------
   新規メッセージ送信
------------------------------------------------- */
export async function sendMessage(
  roomId: string,
  senderId: string,
  content: string,
) {
  const supabase = await createClient()      // ★ ここも await

  /* メッセージ INSERT */
  const { error } = await supabase.from("messages").insert({
    chat_room_id: roomId,
    sender_id:    senderId,
    content,
    is_read:      false,
    created_at:   new Date().toISOString(),
  })
  if (error) throw error

  /* chat_rooms.updated_at を更新 */
  const { error: roomErr } = await supabase
    .from("chat_rooms")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", roomId)

  if (roomErr) throw roomErr
}
