"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { toast } from "react-hot-toast"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { addComment, fetchComments, isBookmarked, toggleBookmark } from "@/lib/supabase/comments"
import { Button } from "@/components/ui/button"
import { Heart, MessageCircle, Bookmark } from "lucide-react"
import type { Tables } from "@/lib/supabase/types";
import type { Article } from "@/lib/getArticles";


// Supabase row type with joined profile
type CommentWithProfile = {
  id: string
  article_id: string
  body: string
  created_at: string
  user_id: string
  profiles: {
    full_name: string
    avatar_url: string
  } | null
}

export default function ArticleDetailDrawer({
  article,
  open,
  onOpenChange,
}: {
  article: Article
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [comments, setComments] = useState<CommentWithProfile[]>([])
  const [commentText, setCommentText] = useState("")
  const [bookmarked, setBookmarked] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    if (!open) return
    fetchComments(article.url).then((data) => {
      // Filter out any parser errors and only keep valid comments
      const validComments = (data as any[]).filter(
        (item): item is CommentWithProfile => !('error' in item)
      )
      setComments(validComments)
    })
    isBookmarked(article.url).then(setBookmarked)
  }, [open, article.url])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session)
    })
  }, [open])

  const handleAddComment = async () => {
    // Require login
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      toast.error("コメント投稿にはログインが必要です")
      return
    }

    if (!commentText.trim()) return

    try {
      await addComment(article.url, commentText)
      setCommentText("")
      const refreshed = await fetchComments(article.url)
      const validComments = (refreshed as any[]).filter(
        (item): item is CommentWithProfile => !("error" in item)
      )
      setComments(validComments)
    } catch (err) {
      toast.error("コメントの投稿に失敗しました")
      console.error(err)
    }
  }

  const handleBookmark = async () => {
    const now = await toggleBookmark(article.url)
    setBookmarked(now)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-screen md:w-[80vw] lg:w-[70vw] max-w-none overflow-y-auto bg-white shadow-xl">
        <div className="flex flex-col h-screen">
          {/* Header */}
          <header className="flex items-start justify-between gap-2 p-4 border-b">
            <div className="flex-1 pr-4">
              <h2 className="text-lg font-semibold leading-6">{article.title}</h2>
              <p className="text-xs text-gray-500 mt-1">
                {article.source} ・ {article.publishedAt.slice(0, 10)}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleBookmark}>
              <Bookmark
                className={`h-5 w-5 transition ${bookmarked ? "fill-red-600 text-red-600" : ""}`}
              />
            </Button>
          </header>

          {/* Content scroll area */}
          <main className="flex-1 overflow-y-auto p-4 space-y-4">
            {article.imageUrl && (
              <img
                src={article.imageUrl}
                alt=""
                className="max-h-60 md:max-h-72 w-full object-cover rounded-md"
              />
            )}
            <p className="text-sm text-gray-700 whitespace-pre-line">{article.description}</p>
            <Button asChild className="w-max">
              <a href={article.url} target="_blank" rel="noreferrer">
                続きを読む ↗
              </a>
            </Button>
          </main>

          {/* Comments */}
          <section className="border-t flex flex-col max-h-[40vh]">
            <h3 className="text-sm font-semibold p-4 pb-2">
              コメント ({comments.length})
            </h3>

            {/* Comments list */}
            <div className="flex-1 overflow-y-auto px-4 space-y-3">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2 text-sm">
                  <img
                    src={c.profiles?.avatar_url ?? "/images/default-avatar.png"}
                    alt=""
                    className="h-8 w-8 rounded-full"
                  />
                  <div>
                    <p className="text-xs font-semibold">{c.profiles?.full_name ?? "匿名"}</p>
                    <p>{c.body}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Comment input fixed at bottom */}
            <div className="border-t p-4 bg-white sticky bottom-0">
              <div className="flex gap-2">
                <textarea
                  className="flex-1 border rounded p-2 text-sm resize-none"
                  rows={2}
                  placeholder={isLoggedIn ? "コメントを書く…" : "ログインするとコメントできます"}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  disabled={!isLoggedIn}
                />
                <Button onClick={handleAddComment} disabled={!isLoggedIn || !commentText.trim()}>
                  <MessageCircle className="mr-1 h-4 w-4" />
                  投稿
                </Button>
              </div>
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}