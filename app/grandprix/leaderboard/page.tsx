"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Save,
  Loader2,
  Timer,
  AlertCircle,
} from "lucide-react";
import { LazyImage } from "@/components/ui/lazy-image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { useToast } from "@/components/ui/use-toast";
import { QuestionCard } from "@/components/question-card";

type SessionAnswerRow = Database["public"]["Tables"]["session_answers"]["Row"];
type QuestionRow      = Database["public"]["Tables"]["question_bank"]["Row"];

interface AnswerRow extends SessionAnswerRow {
  question: QuestionRow;
}

export default function WebTestPage() {
  /* ------------------- URL パラメータ ------------------- */
  const params = useParams<{ category: string; sessionId: string }>();
  const category  = params.category;
  const sessionId = params.sessionId;

  const router = useRouter();
  const { toast } = useToast();

  /* ------------------- state ------------------- */
  const [loading,   setLoading]   = useState(true);
  const [answers,   setAnswers]   = useState<AnswerRow[]>([]);
  const [current,   setCurrent]   = useState(0);
  const [deadline,  setDeadline]  = useState<Date | null>(null);
  const [remaining, setRemaining] = useState<number>(0);   // 秒

  const total = answers.length;

  /* ------------------- データ取得 ------------------- */
  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      setLoading(true);

      /* 回答 + 問題文 */
      const { data, error } = await supabase
        .from("session_answers")
        .select("*, question:question_bank(*)")
        .eq("session_id", sessionId)
        .order("question_id");

      if (error) {
        toast({ description: error.message });
      } else {
        setAnswers(data as AnswerRow[]);
      }

      /* セッション開始時刻 */
      const { data: sess, error: sessErr } = await supabase
        .from("challenge_sessions")
        .select("started_at")
        .eq("id", sessionId)
        .maybeSingle();

      if (sessErr) {
        toast({ description: sessErr.message });
      } else if (sess?.started_at) {
        setDeadline(new Date(new Date(sess.started_at).getTime() + 40 * 60 * 1000)); // +40分
      }

      setLoading(false);
    })();
  }, [sessionId, toast]);

  /* ------------------- 提出 ------------------- */
  const handleSubmit = useCallback(async () => {
    try {
      const res = await fetch("/api/submit-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      router.replace(`/grandprix/${category}/${sessionId}/result`);
    } catch (e: any) {
      toast({ description: e.message });
    }
  }, [router, category, sessionId, toast]);

  /* ------------------- タイマー ------------------- */
  useEffect(() => {
    if (!deadline) return;
    const id = setInterval(() => {
      const sec = Math.max(0, Math.floor((deadline.getTime() - Date.now()) / 1000));
      setRemaining(sec);

      if (sec === 0) {
        clearInterval(id);
        handleSubmit(); // 自動提出
      }
    }, 1_000);

    return () => clearInterval(id);
  }, [deadline, handleSubmit]);

  /* ------------------- 派生値 ------------------- */
  const currentAnswer = answers[current];
  const progressPct   = useMemo(
    () => (total ? ((current + 1) / total) * 100 : 0),
    [current, total],
  );
  const remainStr = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(
    remaining % 60,
  ).padStart(2, "0")}`;

  /* ------------------- ローディング / エラー ------------------- */
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!currentAnswer) {
    return <p className="p-4">問題が見つかりません</p>;
  }

  /* ------------------- 画面 ------------------- */
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <LazyImage
              src="/placeholder.svg?height=32&width=32"
              alt="学生転職ロゴ"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <span className="text-xl font-bold text-red-600">学生転職</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 rounded-full bg-emerald-100 px-4 py-2">
              <Clock className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">
                残り時間: {remainStr}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl">
          {/* progress header */}
          <div className="mb-6">
            <h1 className="text-xl font-bold">総合 Web テスト</h1>
            <div className="mt-2 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">問題:</span>
                <div className="flex items-center gap-1">
                  <span className="font-medium">{current + 1}</span>
                  <span className="text-sm text-gray-500">/ {total}</span>
                </div>
              </div>

              <Progress
                value={progressPct}
                className="h-2 w-32 bg-gray-200"
                indicatorClassName="bg-emerald-500"
              />

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Timer className="h-4 w-4" />
                <span>
                  経過時間:{" "}
                  {((40 * 60 - remaining) / 60).toFixed(0).padStart(2, "0")}:
                  {((40 * 60 - remaining) % 60).toString().padStart(2, "0")}
                </span>
              </div>
            </div>
          </div>

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
                className="gap-1"
                onClick={() => setCurrent((p) => Math.max(0, p - 1))}
                disabled={current === 0}
              >
                <ArrowLeft className="h-4 w-4" />
                前の問題
              </Button>

              <Button
                variant="outline"
                className="gap-1"
                onClick={() => toast({ description: "一時保存しました" })}
              >
                <Save className="h-4 w-4" />
                一時保存
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
                  次の問題
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </CardFooter>
          </Card>

          {/* ナンバーボタン */}
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
                    idx === current ? "bg-emerald-500 hover:bg-emerald-600" : ""
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