/* --------------------------------------------------------------------------
   app/notifications/page.tsx
   - 通知一覧ページ
-------------------------------------------------------------------------- */
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Suspense } from "react"
import NotificationsList from "./NotificationsList"
import { SkeletonList } from "@/components/ui/skeleton"

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

  return (
    <main className="container max-w-2xl py-10">
      <h1 className="mb-6 text-2xl font-bold">お知らせ</h1>

      <Suspense fallback={<SkeletonList length={4} />}>
        {/* Client-side list with realtime updates */}
        <NotificationsList userId={userId} />
      </Suspense>
    </main>
  )
}
