/* ------------------------------------------------------------------
   app/grandprix/[category]/(session)/[sessionId]/test/page.tsx
   - started_at が NULL または期限切れの場合は今を起点に再計算
------------------------------------------------------------------- */
"use client"

import {
  ArrowLeft, ArrowRight, Clock, Save, Loader2,
  AlertCircle,
} from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/types"

import { LazyImage } from "@/components/ui/lazy-image"
import { Button }    from "@/components/ui/button"
import {
  Card, CardHeader, CardTitle, CardDescription,
  CardContent, CardFooter,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { QuestionCard } from "@/components/question-card"

/* ---------- 型 ---------- */
type SessionAnswerRow =
  Database["public"]["Tables"]["session_answers"]["Row"]
type QuestionRow = Database["public"]["Tables"]["question_bank"]["Row"]

interface AnswerRow extends SessionAnswerRow {
  question: QuestionRow | null
}

export default function WebTestPage() {
  const { category, sessionId } = useParams<{ category: string; sessionId: string }>()
  const router = useRouter()
  const { toast } = useToast()

  /* ---------- state ---------- */
  const [loading,   setLoading]   = useState(true)
  const [answers,   setAnswers]   = useState<AnswerRow[]>([])
  const [current,   setCurrent]   = useState(0)
  const total = answers.length
  const [deadline,  setDeadline]  = useState<Date | null>(null)
  const [remaining, setRemaining] = useState(0)

  // 提出済みかどうか
  const [submitted, setSubmitted] = useState(false);

  /* ---------- fetch ---------- */
  useEffect(() => {
    (async () => {
      setLoading(true)

      /* 回答 + 問題文 */
      const { data, error } = await supabase
        .from("session_answers")
        .select("*, question:question_bank(*)")
        .eq("session_id", sessionId)
        .order("question_id", { ascending: true, nullsFirst: false })

      if (error) toast({ description: error.message })
      else setAnswers((data as AnswerRow[]).filter((r) => r.question))

      /* started_at 取得 → deadline 計算 (40 分) ------------------ */
      const { data: sess, error: sessErr } = await supabase
        .from("challenge_sessions")
        .select("started_at")
        .eq("id", sessionId)
        .maybeSingle()

      if (sessErr) toast({ description: sessErr.message })

      const now = new Date()
      let start   = sess?.started_at ? new Date(sess.started_at) : now
      let dl      = new Date(start.getTime() + 40 * 60 * 1000)

      /* ① started_at が NULL なら DB に現在時刻を書き込む -------- */
      if (!sess?.started_at) {
        await supabase
          .from("challenge_sessions")
          .update({ started_at: now.toISOString() })
          .eq("id", sessionId)
        start = now
        dl    = new Date(now.getTime() + 40 * 60 * 1000)
      }

      /* ② 40 分を超えていたら強制リセット ----------------------- */
      if (dl < now) {
        start = now
        dl    = new Date(now.getTime() + 40 * 60 * 1000)
      }

      setDeadline(dl)
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  /* ---------- ナビゲーション警告 ---------- */
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!submitted) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [submitted]);

  /* ---------- timer ---------- */
  useEffect(() => {
    if (!deadline) return
    const id = setInterval(() => {
      const sec = Math.max(0, Math.floor((deadline.getTime() - Date.now()) / 1000))
      setRemaining(sec)
      if (sec === 0) {
        clearInterval(id)
        handleSubmit()
      }
    }, 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline])

  /* ---------- derived ---------- */
  const currentAnswer = answers[current]
  const progressPct = useMemo(
    () => (total ? ((current + 1) / total) * 100 : 0),
    [current, total],
  )
  const remainStr = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(
    remaining % 60,
  ).padStart(2, "0")}`;
  const remainMin = Math.ceil(remaining / 60);

  /* ---------- submit ---------- */
  const handleSubmit = useCallback(async () => {
    try {
      /* ----------------------------------------------------------
         1. answers[] から設問 UUID → 選択肢番号 のマップを生成
      ---------------------------------------------------------- */
      const answerMap = answers.reduce<Record<string, number>>((acc, row) => {
        if (row.question_id && row.answer_raw !== null && row.answer_raw !== undefined) {
          /* answer_raw は 1–4 の択一番号が入っている想定 */
          acc[row.question_id] = Number(row.answer_raw);
        }
        return acc;
      }, {});

      /* 未回答がある場合は警告して中断 ------------------------- */
      if (Object.keys(answerMap).length !== answers.length) {
        toast({ description: "未回答の問題があります。すべて回答してください。" });
        return;
      }

      /* ----------------------------------------------------------
         2. challenge_id と student_id を取得
            - challenge_id: 問題側に埋め込まれている想定
            - student_id  : session_answers の行に保持されている想定
      ---------------------------------------------------------- */
      const challengeId = answers[0]?.question?.challenge_id;
      const studentId   = (answers[0] as any)?.student_id;

      if (!challengeId || !studentId) {
        toast({ description: "必要な情報が不足しています (challengeId / studentId)" });
        return;
      }

      /* ----------------------------------------------------------
         3. challenge_submissions に JSONB で保存 (upsert)
         ---------------------------------------------------------- */
      const { error: upsertErr } = await supabase
        .from("challenge_submissions")
        .upsert(
          [
            {
              challenge_id: challengeId,
              student_id:   studentId,
              answer:       "",                       // 必須列
              answers:      answerMap as any,
              status:       "未採点",
            },
          ],
          { onConflict: "challenge_id,student_id" }
        );

      if (!upsertErr) {
        setSubmitted(true);
        router.replace(`/grandprix/${category}/${sessionId}/result`);
        return;
      }

      if (upsertErr) throw upsertErr;

    } catch (e: any) {
      toast({ description: e.message ?? "送信に失敗しました" });
    }
  }, [router, sessionId, category, toast, answers]);

  /* ---------- UI ---------- */
  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
      </div>
    )

  if (!currentAnswer?.question)
    return <p className="p-4">問題が見つかりません</p>

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ––– ヘッダー（既存のまま） ––– */}
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <LazyImage
              src="/placeholder.svg?height=32&width=32"
              alt="学生転職ロゴ"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <span className="text-xl font-bold text-red-600">学生転職</span>
          </Link>

          <div className="flex items-center gap-3 rounded-full bg-emerald-100 px-4 py-2">
            <Clock className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">
              残り {remainMin} 分
            </span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl">
          {/* 進捗ヘッダー */}
          <div className="mb-6">
            <h1 className="text-xl font-bold">
              {category === "webtest" ? "総合Webテスト" : "診断テスト"}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">問題:</span>
                <span className="font-medium">
                  {current + 1}/{total}
                </span>
              </div>

              <Progress
                value={progressPct}
                className="h-2 w-32 bg-gray-200"
                indicatorClassName="bg-emerald-500"
              />

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                <span>残り {remainMin} 分</span>
              </div>
            </div>
          </div>

          {/* 注意アラート */}
          <Alert className="mb-6 border-emerald-200 bg-emerald-50 text-emerald-800">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>注意</AlertTitle>
            <AlertDescription>
              ブラウザを閉じたり更新したりすると、回答が失われる可能性があります。
            </AlertDescription>
          </Alert>

          {/* 問題カード */}
          <Card className="mb-6">
            <CardHeader className="bg-gray-50">
              <CardTitle className="text-lg">問題 {current + 1}</CardTitle>
              <CardDescription>
                以下の問いに対して、最も適切な答えを選んでください。
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6">
              <QuestionCard
                question={currentAnswer.question}
                sessionId={sessionId}
                initialAnswer={currentAnswer.answer_raw as any}
              />
            </CardContent>

            <CardFooter className="flex justify-between border-t bg-gray-50 p-4">
              <Button
                variant="outline"
                onClick={() => setCurrent((p) => Math.max(0, p - 1))}
                disabled={current === 0}
                className="gap-1"
              >
                <ArrowLeft className="h-4 w-4" /> 前の問題
              </Button>

              <Button
                variant="outline"
                className="gap-1"
                onClick={() => toast({ description: "Saved" })}
              >
                <Save className="h-4 w-4" /> 一時保存
              </Button>

              {current + 1 === total ? (
                <Button
                  className="bg-red-600 hover:bg-red-700"
                  onClick={handleSubmit}
                >
                  テスト終了・提出
                </Button>
              ) : (
                <Button
                  className="gap-1 bg-emerald-500 hover:bg-emerald-600"
                  onClick={() => setCurrent((p) => Math.min(total - 1, p + 1))}
                >
                  次の問題 <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </CardFooter>
          </Card>

          {/* 問題番号ボタン */}
          <div className="flex justify-between">
            <div className="flex flex-wrap gap-2">
              {answers.map((_, idx) => (
                <Button
                  key={idx}
                  variant={
                    idx === current
                      ? "default"
                      : idx < current
                      ? "secondary"
                      : "outline"
                  }
                  size="sm"
                  className={
                    idx === current
                      ? "bg-emerald-500 hover:bg-emerald-600"
                      : ""
                  }
                  onClick={() => setCurrent(idx)}
                >
                  {idx + 1}
                </Button>
              ))}
            </div>

            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={handleSubmit}
            >
              テスト終了・提出
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
