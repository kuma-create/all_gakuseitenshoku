"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, Clock, Loader2 } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/types"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"

/**
 * /grandprix/[category]
 * - category = webtest | business | case …
 * - Supabase から該当カテゴリの challenges を取得してカード表示
 * - 過去結果タブ: challenge_sessions から本人の履歴を20件
 */
export default function GrandPrixCategoryPage() {
  const { category } = useParams<{ category: string }>()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [challenges, setChallenges] =
    useState<Database["public"]["Tables"]["challenges"]["Row"][]>([])
  const [results, setResults] = useState<any[]>([])

  /* --------------- データ取得 --------------- */
  useEffect(() => {
    ;(async () => {
      setLoading(true)

      /* 1. 挑戦可能チャレンジ */
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("category", category)
        .order("created_at", { ascending: false })

      if (error) toast({ description: error.message })
      else setChallenges(data)

      /* 2. 過去の結果（ログイン済みユーザーのみ） */
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: res, error: resErr } = await supabase
          .from("challenge_sessions")
          .select(
            "id, score, elapsed_sec, created_at, challenge:challenges(title)"
          )
          .eq("student_id", user.id)
          .eq("challenge.category", category)
          .order("created_at", { ascending: false })
          .limit(20)

        if (!resErr) setResults(res as any[])
      }

      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category])

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <main className="container mx-auto px-4 py-8">
        {/* 戻るリンク */}
        <div className="mb-6 flex items-center gap-2">
          <Link
            href="/grandprix"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            種目一覧に戻る
          </Link>
        </div>

        {/* 見出し */}
        <div className="mb-8 flex flex-col items-start gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold">
              {category === "webtest"
                ? "Web テスト"
                : category === "business"
                ? "ビジネス診断"
                : "ケース診断"}
            </h1>
            <p className="text-sm text-gray-500">
              挑戦できる大会を選択してください
            </p>
          </div>
        </div>

        {/* タブ */}
        <Tabs defaultValue="available" className="w-full">
          <TabsList className="mb-6 grid w-full grid-cols-2">
            <TabsTrigger value="available">挑戦可能</TabsTrigger>
            <TabsTrigger value="results">過去の結果</TabsTrigger>
          </TabsList>

          {/* ---------- 挑戦可能 ---------- */}
          <TabsContent value="available">
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : challenges.length === 0 ? (
              <p className="text-center text-sm text-gray-500">
                現在公開中の大会はありません
              </p>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {challenges.map((c) => (
                  <Card key={c.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{c.title}</CardTitle>
                      {c.company && (
                        <CardDescription>{c.company}</CardDescription>
                      )}
                    </CardHeader>

                    <CardContent>
                      <div className="mb-4 flex flex-wrap gap-2">
                        <Badge variant="outline" className="bg-gray-100">
                          <Clock className="mr-1 h-3 w-3" />
                          {c.time_limit_min ?? 40}分
                        </Badge>
                        <Badge variant="outline" className="bg-gray-100">
                          問題数: {c.question_count ?? 40}問
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-3">
                        {(c.description ?? "").slice(0, 60)}…
                      </p>
                    </CardContent>

                    <CardFooter>
                      <Link
                        href={`/grandprix/${category}/${c.id}/confirm`}
                        className="w-full"
                      >
                        <Button className="w-full bg-emerald-500 hover:bg-emerald-600">
                          挑戦する
                        </Button>
                      </Link>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ---------- 過去の結果 ---------- */}
          <TabsContent value="results">
            {results.length === 0 ? (
              <p className="text-center text-sm text-gray-500">
                まだ結果がありません
              </p>
            ) : (
              <div className="space-y-4">
                {results.map((r) => (
                  <Card key={r.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-medium">{r.challenge.title}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(r.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-lg font-bold text-emerald-600">
                          {r.score?.toFixed(1)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {Math.round((r.elapsed_sec ?? 0) / 60)}分
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
