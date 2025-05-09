/* --------------------------------------------------------------------------
   app/notifications/page.tsx
   - 通知一覧ページ
-------------------------------------------------------------------------- */
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { countUnread, fetchNotifications, markAsRead } from "@/lib/notifications"
import { Skeleton } from "@/components/ui/skeleton"

export const dynamic = "force-dynamic"  // ← SSG しない

export default async function NotificationsPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) {
    redirect("/login")
  }
  const userId = session.user.id

  // 未読一覧取得
  const list = await fetchNotifications(userId)
  // ページを開いた時点で既読化
  const unreadIds = list.filter(n => !n.is_read).map(n => n.id)
  if (unreadIds.length) await markAsRead(unreadIds)

  return (
    <main className="container max-w-2xl py-10">
      <h1 className="mb-6 text-2xl font-bold">お知らせ</h1>

      {list.length === 0 && (
        <p className="text-gray-500">通知はありません</p>
      )}

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
    </main>
  )
}
