import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import MessagesClient from "./messages-client"
import type { Database } from "@/lib/database.types"

export default async function MessagesPage() {
  const supabase = createServerComponentClient<Database>({ cookies })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/auth/signin")
  }

  const { data: userRole } = await supabase.from("user_roles").select("role").eq("id", session.user.id).single()

  const role = userRole?.role || "student"

  let conversations = []
  let conversationsWithDetails = []

  if (role === "student") {
    // 学生の場合、自分が参加している会話を取得
    const { data: conversationsData } = await supabase
      .from("conversations")
      .select(`
        *,
        companies (
          id,
          name,
          logo_url
        ),
        jobs (
          id,
          job_title
        )
      `)
      .eq("student_id", session.user.id)
      .order("updated_at", { ascending: false })

    conversations = conversationsData || []

    // 各会話の最新メッセージを取得
    if (conversations.length > 0) {
      const conversationIds = conversations.map((conv) => conv.id)

      const { data: latestMessages } = await supabase
        .from("messages")
        .select("*")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false })

      // 会話ごとに最新のメッセージを関連付け
      conversationsWithDetails = conversations.map((conv) => {
        const messagesForConv = latestMessages?.filter((msg) => msg.conversation_id === conv.id) || []
        const latestMessage = messagesForConv.length > 0 ? messagesForConv[0] : null
        const unreadCount = messagesForConv.filter((msg) => !msg.is_read && msg.sender_id !== session.user.id).length

        return {
          ...conv,
          latestMessage,
          unreadCount,
        }
      })
    }
  } else if (role === "company") {
    // 企業ユーザーの場合、所属企業の会話を取得
    const { data: companyUser } = await supabase
      .from("company_users")
      .select("company_id")
      .eq("user_id", session.user.id)
      .single()

    if (companyUser) {
      const { data: conversationsData } = await supabase
        .from("conversations")
        .select(`
          *,
          student_profiles (
            id,
            first_name,
            last_name,
            university,
            avatar_url
          ),
          jobs (
            id,
            job_title
          )
        `)
        .eq("company_id", companyUser.company_id)
        .order("updated_at", { ascending: false })

      conversations = conversationsData || []

      // 各会話の最新メッセージを取得
      if (conversations.length > 0) {
        const conversationIds = conversations.map((conv) => conv.id)

        const { data: latestMessages } = await supabase
          .from("messages")
          .select("*")
          .in("conversation_id", conversationIds)
          .order("created_at", { ascending: false })

        // 会話ごとに最新のメッセージを関連付け
        conversationsWithDetails = conversations.map((conv) => {
          const messagesForConv = latestMessages?.filter((msg) => msg.conversation_id === conv.id) || []
          const latestMessage = messagesForConv.length > 0 ? messagesForConv[0] : null
          const unreadCount = messagesForConv.filter((msg) => !msg.is_read && msg.sender_id !== session.user.id).length

          return {
            ...conv,
            latestMessage,
            unreadCount,
          }
        })
      }
    }
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">メッセージ</h1>
      <MessagesClient conversations={conversationsWithDetails} userRole={role} userId={session.user.id} />
    </div>
  )
}
