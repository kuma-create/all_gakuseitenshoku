"use client"

/* ------------------------------------------------------------------
   Case – 結果ページ (Web テスト/ケース/ビジスコア 用)
   /ipo/case/[category]/(session)/[sessionId]/result/page.tsx
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
type WebTestQuestionRow = Database["public"]["Tables"]["question_bank"]["Row"]

/* ---------- util ---------- */
const fmtScore = (n: number | null | undefined) =>
  n != null ? n.toFixed(1) : "—"

/**
 * YouTube URL → 埋め込み用 src 変換
 * 変換できない場合は null を返す
 */
const toYoutubeEmbed = (raw: string | null): string | null => {
  if (!raw) return null;
  try {
    const url = new URL(raw);

    // youtu.be/<id>
    if (url.hostname === "youtu.be") {
      return `https://www.youtube.com/embed/${url.pathname.slice(1)}`;
    }

    // youtube.com/watch?v=<id>
    if (url.hostname.includes("youtube.com")) {
      const v = url.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;

      // 既に /embed/<id>
      if (url.pathname.startsWith("/embed/")) return raw;
    }
  } catch {
    /* ignore malformed URL */
  }
  return null;
};

export default function WebTestResultPage() {
  const { category, sessionId } = useParams<{ category: string; sessionId: string }>()
  const isWeb = category === "webtest";
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading]           = useState(true)
  const [submission, setSubmission]     = useState<SubmissionRow | null>(null)
  const [questions, setQuestions]       = useState<WebTestQuestionRow[]>([])
  const [caseQuestions, setCaseQuestions] = useState<WebTestQuestionRow[]>([]);

  // 解説動画 URL (Case/Bizscore 用)
  const [answerUrl, setAnswerUrl] = useState<string | null>(null);

  /* ---------------- fetch ---------------- */
  useEffect(() => {
    ;(async () => {
      setLoading(true)

      /* ---------- 1. submission ---------- */
      const { data: sub, error: subErr } = await supabase
        .from("challenge_submissions")
        .select("id, session_id, answer, answers, auto_score, final_score, challenge_id, created_at, updated_at")
        .eq("session_id", sessionId)
        .order("updated_at", { ascending: false })         // 最新更新順
        .limit(1)
        .maybeSingle();                                    // 0 行でも 406 を回避

      if (subErr) {
        toast({ description: subErr.message })
        setLoading(false)
        return
      }
      setSubmission(sub as SubmissionRow)

      /* ---------- 2. questions (webtest only) ---------- */
      if (isWeb) {
        // answerMap の question_id をキーに設問を取得
        const answerMap = (sub?.answers ?? {}) as Record<string, number>;
        const qIds      = Object.keys(answerMap);

        if (qIds.length) {
          const { data: qs, error: qErr } = await supabase
            .from("question_bank")                           // 設問マスタ
            .select("id, stem, order_no, correct_choice")          // use stem directly
            .in("id", qIds)
            .order("order_no", { ascending: true });

          if (qErr) toast({ description: qErr.message });
          else setQuestions(qs as WebTestQuestionRow[]);
        }
      } else {
        /* -------- Case / Bizscore 用 -------- */
        if (sub?.challenge_id) {
          const { data: qs, error: qErr } = await supabase
            .from("challenge_questions")
            .select("order_no, question:question_bank(id, stem)")
            .eq("challenge_id", sub.challenge_id)
            .order("order_no");

          if (qErr) toast({ description: qErr.message });
          else {
            const flattened = (qs ?? []).map((row) => row.question) as WebTestQuestionRow[];
            setCaseQuestions(flattened);
          }
        }

        /* ---------- 3. 解説動画 URL 取得 ---------- */
        if (!isWeb && sub?.challenge_id) {
          const { data: ch, error: chErr } = await supabase
            .from("challenges")              // チャレンジマスタ
            .select("answer_video_url")
            .eq("id", sub.challenge_id)
            .maybeSingle();

          if (chErr) toast({ description: chErr.message });
          else setAnswerUrl(ch?.answer_video_url ?? null);
        }
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

  const total      = isWeb ? Object.keys((submission?.answers ?? {})).length : 0;
  const percentage = isWeb && total ? Math.round((correctCount / total) * 100) : 0;
  const score      =
    submission?.final_score ?? submission?.auto_score ?? percentage

  /* ---------------- 結果通知予定日 (Case/Bizscore) ---------------- */
  const resultNotice = useMemo(() => {
    if (isWeb || !submission?.created_at) return null;
    const d = new Date(submission.created_at);
    d.setDate(d.getDate() + 3);          // 3 日後を目安
    return d.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
  }, [isWeb, submission]);

  /* ---------------- Case / Bizscore free-text answer ---------------- */
  const freeTextAnswer = useMemo(() => {
    if (!submission) return "";

    // 1) answer column
    const ans = submission.answer as unknown;
    if (typeof ans === "string") return ans;
    if (typeof ans === "object" && ans && "text" in ans) {
      return (ans as any).text ?? "";
    }

    // 2) answers JSON 下位キー
    const answersJson = submission.answers as any;
    if (answersJson) {
      if (typeof answersJson.text === "string")     return answersJson.text;
      if (typeof answersJson.answer === "string")   return answersJson.answer;
    }
    return "";
  }, [submission]);

  /* ---------------- Case 用 choice データを文字列化 ---------------- */
  const choiceSummary = !isWeb && !freeTextAnswer && submission?.answers
    ? Object.entries(submission.answers as Record<string, number>)
        .map(([qid, choice]) => `・QID ${qid} → 選択肢 ${choice}`)
        .join("\n")
    : "";

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
                {isWeb && (
                  <div className="text-center md:text-left">
                    <p className="text-sm text-gray-500">総得点</p>
                    <p className="text-4xl font-bold text-emerald-600">
                      {fmtScore(score)}
                    </p>
                  </div>
                )}

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
                          {(q.stem ?? "").substring(0, 120)}
                          {(q.stem ?? "").length > 120 && "…"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : (
            <>
              {/* ---- 採点・結果通知予定 ---- */}
              <Card>
                <CardHeader>
                  <CardTitle>結果通知について</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-2 text-sm text-gray-700">
                  <p>ご提出いただいた回答は運営側で採点後、結果をお知らせします。</p>
                  {resultNotice && (
                    <p>目安：<span className="font-semibold">{resultNotice} まで</span> にメールにて通知予定</p>
                  )}
                </CardContent>
              </Card>

              {/* ---- 回答全文 (Case / Bizscore) ---- */}
              <Card>
                <CardHeader>
                  <CardTitle>あなたの回答</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {freeTextAnswer ? (
                    /* ---- 自由記述タイプ (Case) ---- */
                    <pre className="whitespace-pre-wrap text-sm text-gray-800">
                      {freeTextAnswer}
                    </pre>
                  ) : (
                    /* ---- 選択式 (Bizscore) ---- */
                    <ul className="space-y-4">
                      {caseQuestions.map((q, idx) => {
                        const rawChoice =
                          (submission?.answers as Record<string, any> | undefined)?.[q.id];
                        const choice =
                          typeof rawChoice === "object"
                            ? rawChoice?.text ?? JSON.stringify(rawChoice)
                            : rawChoice;
                        return (
                          <li key={q.id}>
                            <p className="font-medium">Q{idx + 1}. {q.stem}</p>
                            <p className="mt-1 text-gray-800">あなたの回答: {choice ?? "—"}</p>
                          </li>
                        );
                      })}
                      {caseQuestions.length === 0 && (
                        <p className="text-gray-500">回答データが見つかりません</p>
                      )}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* ---- 解説動画 ---- */}
          {answerUrl && (
            <Card>
              <CardHeader>
                <CardTitle>解説動画</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {(() => {
                  const embedSrc = toYoutubeEmbed(answerUrl);
                  if (embedSrc) {
                    return (
                      <div className="aspect-video w-full">
                        <iframe
                          src={embedSrc}
                          title="解説動画"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="h-full w-full rounded-md border"
                        />
                      </div>
                    );
                  }
                  return (
                    <Button asChild variant="outline">
                      <a href={answerUrl} target="_blank" rel="noopener noreferrer">
                        YouTubeで解説を見る
                      </a>
                    </Button>
                  );
                })()}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}