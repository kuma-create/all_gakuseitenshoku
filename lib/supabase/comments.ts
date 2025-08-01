import { supabase } from "@/lib/supabase/client"

/** 現在のブラウザセッションから user を取得（未ログインなら null） */
async function getCurrentUser() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()
  if (error) throw error
  return session?.user ?? null
}

export async function fetchComments(articleId: string) {
  const { data, error } = await supabase
    .from("article_comments")
    .select(`
id,
body,
created_at,
profiles!inner(full_name, avatar_url)
`)
    .eq("article_id", articleId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data
}

export async function addComment(articleId: string, body: string) {
  // 現在ログイン中のユーザー ID を取得
  const user = await getCurrentUser()
  if (!user) throw new Error("User not authenticated")

  // user_id を含めてコメントを挿入
  const { error } = await supabase
    .from("article_comments")
    .insert({ article_id: articleId, body, user_id: user.id })

  if (error) throw error
}

export async function toggleBookmark(articleId: string) {
  // 認証ユーザー取得
  const user = await getCurrentUser()
  if (!user) throw new Error("User not authenticated")

  // 既にブックマーク済みかチェック
  const { data, error } = await supabase
    .from("article_bookmarks")
    .select("id")
    .eq("article_id", articleId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (error && error.code !== "PGRST116") throw error

  if (data) {
    // 既にある → 削除
    await supabase.from("article_bookmarks").delete().eq("id", data.id)
    return false
  } else {
    // ない → 追加
    await supabase
      .from("article_bookmarks")
      .insert({ article_id: articleId, user_id: user.id })
    return true
  }
}

export async function isBookmarked(articleId: string) {
  // 認証ユーザー取得
  const user = await getCurrentUser()
  if (!user) return false

  const { data } = await supabase
    .from("article_bookmarks")
    .select("id")
    .eq("article_id", articleId)
    .eq("user_id", user.id)
    .maybeSingle()

  return !!data
}