"use client"

/* ------------------------------------------------------------------
   Grand Prix – 結果ページ
   /grandprix/[category]/(session)/[sessionId]/result/page.tsx
------------------------------------------------------------------- */

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState, useMemo } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Trophy,
  Loader2,
  CheckCircle,
  XCircle,
} from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/lib/supabase/types"

import { LazyImage } from "@/components/ui/lazy-image"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/components/ui/use-toast"

/* ---------- 型定義 ---------- */
type SessionAnswerRow =
  Database["public"]["Tables"]["session_answers"]["Row"]
type QuestionRow = Database["public"]["Tables"]["question_bank"]["Row"]
type ChallengeSessionRow =
  Database["public"]["Tables"]["challenge_sessions"]["Row"]

interface AnswerRow extends SessionAnswerRow {
  question: QuestionRow
}

export default function WebTestResultPage() {
  const { category, sessionId } = useParams<{
    category: string
    sessionId: string
  }>()
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [answers, setAnswers] = useState<AnswerRow[]>([])
  const [session, setSession] = useState<ChallengeSessionRow | null>(null)

  /* ---------------- fetch ---------------- */
  useEffect(() => {
    ;(async () => {
      setLoading(true)

      /* 回答 + 問題情報 */
      const { data: ans, error } = await supabase
        .from("session_answers")
        .select("*, question:question_bank(*)")
        .eq("session_id", sessionId)

      if (error) toast({ description: error.message })
      else setAnswers(ans as AnswerRow[])

      /* セッション集計値 */
      const { data: sess, error: sessErr } = await supabase
        .from("challenge_sessions")
        .select("score, elapsed_sec")
        .eq("id", sessionId)
        .maybeSingle()

      if (sessErr) toast({ description: sessErr.message })
      else setSession(sess as ChallengeSessionRow)

      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  /* ---------------- 集計 ---------------- */
  const correctCount = useMemo(
    () => answers.filter((a) => a.is_correct).length,
    [answers]
  )
  const total = answers.length
  const percentage = total ? Math.round((correctCount / total) * 100) : 0

  /* ---------------- ローディング ---------------- */
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
      </div>
    )
  }

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="container mx-auto flex h-16 items-center px-4">
          <LazyImage
            src="/placeholder.svg?height=32&width=32"
            alt="学生転職ロゴ"
            width={32}
            height={32}
            className="h-8 w-8"
          />
          <span className="ml-2 text-xl font-bold text-red-600">学生転職</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-3xl space-y-8">
          {/* ---- スコア概要 ---- */}
          <Card>
            <CardHeader className="bg-emerald-50">
              <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                <Trophy className="h-6 w-6 text-emerald-600" />
                結果発表
              </CardTitle>
              <CardDescription>
                あなたの{" "}
                {category === "webtest" ? "Web テスト" : "診断"} 結果
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 p-6">
              <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
                {/* 合計得点 */}
                <div className="text-center md:text-left">
                  <p className="text-sm text-gray-500">総得点</p>
                  <p className="text-4xl font-bold text-emerald-600">
                    {session?.score?.toFixed(1)}
                  </p>
                </div>

                {/* 正答数 */}
                <div className="text-center md:text-left">
                  <p className="text-sm text-gray-500">正答数</p>
                  <p className="text-4xl font-bold text-emerald-600">
                    {correctCount}/{total}
                  </p>
                </div>

                {/* 正答率 */}
                <div className="flex-1">
                  <Progress
                    value={percentage}
                    className="h-3 bg-gray-200"
                    indicatorClassName="bg-emerald-500"
                  />
                  <p className="mt-1 text-right text-sm text-gray-600">
                    正答率 {percentage}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ---- 問題別一覧 ---- */}
          <Card>
            <CardHeader>
              <CardTitle>問題別 正誤一覧</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4 p-6">
              {answers.map((a, idx) => (
                <div
                  key={a.question_id}
                  className="flex items-start gap-4 rounded-lg border p-4"
                >
                  {a.is_correct ? (
                    <CheckCircle className="mt-0.5 h-5 w-5 text-emerald-600" />
                  ) : (
                    <XCircle className="mt-0.5 h-5 w-5 text-red-600" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">問題 {idx + 1}</p>
                    <div
                      className="mt-1 text-sm text-gray-700"
                      dangerouslySetInnerHTML={{
                        __html: a.question.stem.substring(0, 120) + "…",
                      }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>

            <CardFooter className="flex justify-end gap-2 bg-gray-50 p-4">
              <Button
                variant="outline"
                onClick={() => router.push(`/grandprix/${category}`)}
                className="gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                一覧へ戻る
              </Button>
              <Button
                onClick={() => router.push("/grandprix/leaderboard")}
                className="gap-1 bg-emerald-500 hover:bg-emerald-600"
              >
                ランキングを見る <ArrowRight className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  )
}
