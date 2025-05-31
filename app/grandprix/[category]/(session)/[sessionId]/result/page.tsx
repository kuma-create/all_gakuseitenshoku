"use client"

/* ------------------------------------------------------------------
   Grand Prix – 結果ページ (Web テスト用)
   /grandprix/[category]/(session)/[sessionId]/result/page.tsx
------------------------------------------------------------------- */

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState, useMemo } from "react"
import {
  ArrowLeft, ArrowRight, Trophy, Loader2,
  CheckCircle, XCircle,
} from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/types"

import { LazyImage } from "@/components/ui/lazy-image"
import { Button }    from "@/components/ui/button"
import {
  Card, CardHeader, CardTitle, CardDescription,
  CardContent, CardFooter,
} from "@/components/ui/card"
import { Progress }   from "@/components/ui/progress"
import { useToast }   from "@/components/ui/use-toast"

/* ---------- 型定義 ---------- */
type SubmissionRow      = Database["public"]["Tables"]["challenge_submissions"]["Row"]
type WebTestQuestionRow = Database["public"]["Tables"]["webtest_questions"]["Row"]

/* ---------- util ---------- */
const fmtScore = (n: number | null | undefined) =>
  n != null ? n.toFixed(1) : "—"

export default function WebTestResultPage() {
  const { category, sessionId } = useParams<{ category: string; sessionId: string }>()
  const isWeb = category === "webtest";
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading]           = useState(true)
  const [submission, setSubmission]     = useState<SubmissionRow | null>(null)
  const [questions, setQuestions]       = useState<WebTestQuestionRow[]>([])

  /* ---------------- fetch ---------------- */
  useEffect(() => {
    ;(async () => {
      setLoading(true)

      /* ---------- 1. submission ---------- */
      const { data: sub, error: subErr } = await supabase
        .from("challenge_submissions")
        .select("id, session_id, answers, auto_score, final_score, challenge_id, created_at")
        .eq("session_id", sessionId)                       // ← change target column
        .order("created_at", { ascending: false })         // newest first
        .limit(1)
        .maybeSingle();                                    // avoid 406 when 0 row

      if (subErr) {
        toast({ description: subErr.message })
        setLoading(false)
        return
      }
      setSubmission(sub as SubmissionRow)

      /* ---------- 2. questions (webtest only) ---------- */
      if (isWeb) {
        const { data: qs, error: qErr } = await supabase
          .from("webtest_questions")
          .select("id, question, order_no, correct_choice")
          .eq("challenge_id", (sub as SubmissionRow).challenge_id)
          .order("order_no", { ascending: true });

        if (qErr) toast({ description: qErr.message });
        else setQuestions(qs as WebTestQuestionRow[]);
      }

      setLoading(false)
    })()
  }, [sessionId, toast, isWeb])

  /* ---------------- 集計 ---------------- */
  const correctCount = useMemo(() => {
    if (!isWeb || !submission) return 0;
    const ansMap = (submission.answers ?? {}) as Record<string, number>;
    return questions.reduce(
      (acc, q) => acc + (ansMap[q.id] === q.correct_choice ? 1 : 0),
      0,
    );
  }, [isWeb, submission, questions]);

  const total      = isWeb ? questions.length : 0;
  const percentage = isWeb && total ? Math.round((correctCount / total) * 100) : 0;
  const score      =
    submission?.final_score ?? submission?.auto_score ?? percentage

  /* ---------------- ローディング ---------------- */
  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
      </div>
    )

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* ---- ヘッダー ---- */}
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
                あなたの {category === "webtest" ? "Web テスト" : "診断"} 結果
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 p-6">
              <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
                {/* 総得点 */}
                <div className="text-center md:text-left">
                  <p className="text-sm text-gray-500">総得点</p>
                  <p className="text-4xl font-bold text-emerald-600">
                    {fmtScore(score)}
                  </p>
                </div>

                {isWeb && (
                  <>
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
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {isWeb ? (
            /* ---- 問題別一覧 ---- */
            <Card>
              <CardHeader>
                <CardTitle>問題別 正誤一覧</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4 p-6">
                {questions.map((q, idx) => {
                  const selected = (submission?.answers as Record<string, number>)[q.id];
                  const isCorrect = selected === q.correct_choice;
                  return (
                    <div
                      key={q.id}
                      className="flex items-start gap-4 rounded-lg border p-4"
                    >
                      {isCorrect ? (
                        <CheckCircle className="mt-0.5 h-5 w-5 text-emerald-600" />
                      ) : (
                        <XCircle className="mt-0.5 h-5 w-5 text-red-600" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium">問題 {idx + 1}</p>
                        <p className="mt-1 text-sm text-gray-700">
                          {(q.question ?? "").substring(0, 120)}
                          {(q.question ?? "").length > 120 && "…"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : (
            /* ---- 回答全文 (Case / Bizscore) ---- */
            <Card>
              <CardHeader>
                <CardTitle>あなたの回答</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <pre className="whitespace-pre-wrap text-sm text-gray-800">
                  {submission?.answer ?? "回答データが見つかりません"}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}