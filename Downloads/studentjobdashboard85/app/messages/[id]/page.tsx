import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { redirect, notFound } from "next/navigation"
import MessageDetailClient from "./message-detail-client"
import type { Database } from "@/lib/database.types"

export default async function MessageDetailPage({ params }: { params: { id: string } }) {
  const conversationId = Number.parseInt(params.id)

  if (isNaN(conversationId)) {
    notFound()
  }

  const supabase = createServerComponentClient<Database>({ cookies })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/auth/signin")
  }

  const { data: userRole } = await supabase.from("user_roles").select("role").eq("id", session.user.id).single()

  const role = userRole?.role || "student"

  // 会話の詳細を取得
  const { data: conversation } = await supabase
    .from("conversations")
    .select(`
      *,
      companies (*),
      student_profiles (*),
      jobs (*),
      applications (*)
    `)
    .eq("id", conversationId)
    .single()

  if (!conversation) {
    notFound()
  }

  // アクセス権のチェック
  if (role === "student" && conversation.student_id !== session.user.id) {
    redirect("/messages")
  } else if (role === "company") {
    const { data: companyUser } = await supabase
      .from("company_users")
      .select("company_id")
      .eq("user_id", session.user.id)
      .single()

    if (!companyUser || companyUser.company_id !== conversation.company_id) {
      redirect("/messages")
    }
  }

  // メッセージを取得
  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })

  // 未読メッセージを既読に更新
  if (messages && messages.length > 0) {
    const unreadMessages = messages.filter((msg) => !msg.is_read && msg.sender_id !== session.user.id)

    if (unreadMessages.length > 0) {
      const unreadIds = unreadMessages.map((msg) => msg.id)

      await supabase.from("messages").update({ is_read: true }).in("id", unreadIds)
    }
  }

  // 面接スケジュールを取得
  const { data: interviewSchedules } = await supabase
    .from("interview_schedules")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("interview_date", { ascending: true })

  return (
    <div className="container mx-auto py-6">
      <MessageDetailClient
        conversation={conversation}
        messages={messages || []}
        interviewSchedules={interviewSchedules || []}
        currentUser={{
          id: session.user.id,
          role,
        }}
      />
    </div>
  )
}
