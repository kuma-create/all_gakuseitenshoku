 "use client"
/* ------------------------------------------------------------------
   app/ipo/case/[category]/(session)/[sessionId]/test/page.tsx
   - started_at が NULL または期限切れの場合は今を起点に再計算
------------------------------------------------------------------- */

import {
  ArrowLeft, ArrowRight, Clock, Save, Loader2,
  AlertCircle,
} from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState, useRef } from "react"
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

// Helper: MCQ (4択) 判定
const isMCQ = (q: any) => {
  if (!q) return false;
  const arr = Array.isArray(q.choices) ? q.choices.filter((x: any) => typeof x === "string" ? x.trim().length > 0 : x != null) : [];
  const hasChoices = arr.length >= 2; // 2以上なら択一扱い
  const hasCorrect = Number.isInteger(q.correct_choice) && q.correct_choice >= 1 && q.correct_choice <= 4;
  return hasChoices && hasCorrect;
};

export default function WebTestPage() {
  const params = useParams<{ category: string; sessionId: string }>();
  const { category, sessionId } = params;
  const router = useRouter()
  const { toast } = useToast()

  /* ---------- state ---------- */
  /** challenge_id と student_id を保持 */
  const [sessionInfo, setSessionInfo] = useState<{
    challenge_id: string | null;
    student_id: string | null;
  } | null>(null);
  const [loading,   setLoading]   = useState(true)
  const [answers,   setAnswers]   = useState<AnswerRow[]>([])
  // answers のリアルタイム値を同期的に保持（setState の遅延対策）
  const answersRef = useRef<Record<string, any>>({});
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
      else {
        // Helper: MCQ (4択) 判定
        // const isMCQ = ... (already defined above)
        const rows = (data as AnswerRow[]).filter((r) => r.question);
        const filtered = category === "webtest" ? rows.filter((r) => isMCQ(r.question)) : rows;
        setAnswers(filtered);
        answersRef.current = filtered.reduce<Record<string, any>>((acc, r) => {
          if (r.question_id) acc[r.question_id] = r.answer_raw;
          return acc;
        }, {});
      }

      /* ---------- fallback ----------
         セッションに answers がまだ無い場合は challenge_sessions から
         challenge_id を取得して challenge_questions → question_bank を生成
      ---------------------------------- */
      if ((data as AnswerRow[]).length === 0) {
        /* ① challenge_sessions から challenge_id を取得 */
        const { data: sessRow, error: sessErr } = await supabase
          .from("challenge_sessions")
          .select("challenge_id")
          .eq("id", sessionId)
          .single();

        if (sessErr || !sessRow?.challenge_id) {
          toast({ description: sessErr?.message ?? "challenge_id を取得できません" });
        } else {
          /* ② challenge_questions → question_bank を取得 */
          const { data: cqRows, error: cqErr } = await supabase
            .from("challenge_questions")
            .select("question:question_bank(*)")
            .eq("challenge_id", sessRow.challenge_id)
            .order("order_no", { ascending: true });

          if (cqErr) {
            toast({ description: cqErr.message });
          } else {
            const fallbackAnswers: AnswerRow[] = (cqRows ?? []).map((row) => ({
              session_id:     sessionId,
              question_id:    row.question?.id ?? "",
              answer_raw:     null,
              created_at:     new Date().toISOString(),
              updated_at:     new Date().toISOString(),
              question:       row.question,
            })) as any;
            const fbFiltered = category === "webtest"
              ? fallbackAnswers.filter((r) => isMCQ(r.question))
              : fallbackAnswers;
            setAnswers(fbFiltered);
            answersRef.current = fbFiltered.reduce<Record<string, any>>((acc, r) => {
              if (r.question_id) acc[r.question_id] = r.answer_raw;
              return acc;
            }, {});
          }
        }
      }

      /* started_at 取得 → deadline 計算 (40 分) ------------------ */
      const { data: sess, error: sessErr } = await supabase
        .from("challenge_sessions")
        .select("started_at, challenge_id, student_id")
        .eq("id", sessionId)
        .maybeSingle()

      if (sessErr) toast({ description: sessErr.message })

      if (sess) {
        setSessionInfo({
          challenge_id: sess.challenge_id,
          student_id: sess.student_id,
        });
      }

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

  /* ---------- 子コンポーネントからの回答通知 ---------- */
  const handleAnswered = useCallback(
    (qid: string, choice: number | string | null) => {
      setAnswers((prev) =>
        prev.map((row) =>
          row.question_id === qid ? { ...row, answer_raw: choice } : row,
        ),
      )
      answersRef.current[qid] = choice;
    },
    [],
  )

  /* ---------- submit ---------- */
  const handleSubmit = useCallback(async () => {
    try {
      console.log("[handleSubmit] invoked");
      /* ----------------------------------------------------------
         1. answersRef から最新の回答マップを生成
      ---------------------------------------------------------- */
      const answerMap: Record<string, any> = {};
      for (const [qid, val] of Object.entries(answersRef.current)) {
        if (val != null) answerMap[qid] = val;
      }

      /* 未回答がある場合は確認ダイアログ ----------------------- */
      if (Object.keys(answerMap).length !== answers.length) {
        const proceed = confirm(
          "未回答の問題があります。このまま提出しますか？（採点は未回答を0点として計算されます）"
        );
        if (!proceed) {
          toast({ description: "提出をキャンセルしました。" });
          return;
        }
      }

      /* ----------------------------------------------------------
         2. challenge_id と student_id を取得
            - challenge_id: sessionInfo から取得
            - student_id  : sessionInfo から取得
      ---------------------------------------------------------- */
      const challengeId =
        sessionInfo?.challenge_id ??
        currentAnswer?.question?.challenge_id ??
        null;

      // ログインユーザー → student_id として扱う
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let studentId =
        sessionInfo?.student_id ??
        user?.id ??
        null;

      // --- fallback: obtain from challenge_sessions if still null ---
      if (!studentId) {
        const { data: sessRow2 } = await supabase
          .from("challenge_sessions")
          .select("student_id")
          .eq("id", sessionId)
          .single();
        studentId = sessRow2?.student_id ?? null;
      }

      /* challengeId がまだ取れない場合は DB を直接再取得 -------- */
      let finalChallengeId = challengeId;
      if (!finalChallengeId) {
        const { data: sessRow } = await supabase
          .from("challenge_sessions")
          .select("challenge_id")
          .eq("id", sessionId)
          .single();
        finalChallengeId = sessRow?.challenge_id ?? null;
      }

      if (!finalChallengeId || !studentId) {
        console.error("[handleSubmit] missing ids", {
          challengeId: finalChallengeId,
          studentId,
        });
        toast({
          description:
            "内部エラー: challengeId または studentId が取得できません。",
        });
        return;
      }

      /* ---------- auto score ---------- */
      const correctCount = answers.reduce((cnt, row) => {
        const correct = row.question?.correct_choice;      // 1‑4
        return cnt + (row.answer_raw === correct ? 1 : 0);
      }, 0);
      const finalScore = correctCount;                     // 今は 1問＝1点

      /* ----------------------------------------------------------
         3. challenge_submissions に JSONB で保存 (upsert)
         ---------------------------------------------------------- */
      // category: "webtest" or "case", etc.
      const isWeb = category === "webtest";
      const isBiz = category === "business" || category === "bizscore";
      const { error: upsertErr } = await supabase
        .from("challenge_submissions")
        .upsert(
          [
            {
              challenge_id: finalChallengeId!,
              student_id:   studentId!,
              session_id:   sessionId,
              answer:       "",
              answers:      answerMap as any,
              auto_score:   (isWeb || isBiz) ? finalScore : null,
              final_score:  (isWeb || isBiz) ? finalScore : null,
              status:       (isWeb || isBiz) ? "採点済み" : "未採点",
            },
          ],
          { onConflict: "session_id" }
        );

      // (Optional but recommended) challenge_sessions 側にもスコア反映
      if (!upsertErr) {
        await supabase
          .from("challenge_sessions")
          .update({ score: finalScore })
          .eq("id", sessionId);
      }

      if (!upsertErr) {
        console.log("[handleSubmit] submission saved:", { challengeId, studentId, answerMap });
        toast({ description: "提出が完了しました。採点結果を表示します。" });
        setSubmitted(true);
        router.replace(`/ipo/case/${category}/${sessionId}/result`);
        return;
      }

      if (upsertErr) {
        console.error("[handleSubmit] upsert error", upsertErr);
        toast({ description: upsertErr.message ?? "送信に失敗しました(Upsert)"} );
        return;
      }

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
                initialAnswer={{
                  choice:
                    typeof currentAnswer.answer_raw === "number"
                      ? currentAnswer.answer_raw
                      : undefined,
                }}
                onAnswered={handleAnswered}
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
