// 新実装：ダイアログ内チャット形式 DraftButton
"use client";

import { useState, useEffect, FormEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { Sparkles, Loader2, MessageSquare } from "lucide-react";

/** チャットで取得した回答を返す型 */
export type AIDraft = {
  description: string;
  achievements: string;
};

/* ------------------------------------------------------------
   質問シナリオ
------------------------------------------------------------ */
type Question = {
  key: string;
  label: string;
  placeholder: string;
  multiline?: boolean;
};

const QUESTIONS: Question[] = [
  {
    key: "description",
    label: "具体的な業務内容を 2〜3 文で教えてください",
    placeholder: "担当した業務内容や役割など",
    multiline: true,
  },
  {
    key: "achievements",
    label: "成果・実績（あれば）を教えてください",
    placeholder: "具体的な数値や評価など",
    multiline: true,
  },
];

/* ------------------------------------------------------------
   DraftButton ― チャット形式で情報収集 → 下書き生成
------------------------------------------------------------ */
type Props = {
  /** 取得した下書きを呼び出し元に渡す */
  onInsert: (draft: AIDraft) => void;
  /** ボタン表示文言（省略時 "AIで下書き"） */
  buttonLabel?: string;
};

export default function DraftButton({ onInsert, buttonLabel = "AIで下書き" }: Props) {

  /* UI state */
  const [open, setOpen]       = useState(false);
  const [step, setStep]       = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);

  /* 初期化 */
  useEffect(() => {
    if (!open) {
      setStep(0);
      setAnswers({});
      setInput("");
    }
  }, [open]);

  const handleSubmit = async (e: FormEvent) => {
    /* prevent this submit from bubbling to parent forms */
    e.preventDefault();
    e.stopPropagation();

    const q = QUESTIONS[step];
    if (!q) return;

    /* --- 回答を一時保持 --- */
    const value = input.trim();
    if (!value) return;

    /* 次の質問がある場合は state だけ更新して終了 */
    if (step + 1 < QUESTIONS.length) {
      setAnswers((p) => ({ ...p, [q.key]: value }));
      setInput("");
      setStep(step + 1);
      return;
    }

    /* === 最終質問：まとめて送信 === */
    const payload = { ...answers, [q.key]: value }; // answers にはまだ最後の回答が入っていないことがある
    setAnswers(payload); // for completeness
    /* === 人事担当受けする文面へ書き換え === */
    setLoading(true);
    try {
      const polisher = (txt: string) => {
        const sentences = txt
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean)
          .map((l) => {
            // 末尾の句点を除去
            let s = l.replace(/[。\.]$/, "");
            // 「ました」「です」で終わるように調整
            if (!/(ました|です)$/.test(s)) s += "ました";
            return `${s}。`;
          });
        const paragraph = sentences.join(" ");
        // Textarea 上限 500 文字に調整
        return paragraph.slice(0, 500);
      };

      const draft: AIDraft = {
        description:  polisher(payload.description),
        achievements: payload.achievements ? polisher(payload.achievements) : "",
      };

      onInsert(draft);
      toast.success("下書きを挿入しました");
      setOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("下書き生成に失敗しました");
    } finally {
      setLoading(false);
      setInput("");
      setStep(0);
    }
  };

  return (
    <>
      {/* ---------- Trigger Button ---------- */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={loading}
      >
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
        {buttonLabel}
      </Button>

      {/* ---------- Dialog ---------- */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              職務経歴書 – AI 下書きアシスタント
            </DialogTitle>
          </DialogHeader>

          {/* チャットログ */}
          <div className="mb-4 max-h-72 overflow-y-auto space-y-3 text-sm">
            {QUESTIONS.slice(0, step + 1).map((q, i) => (
              <div key={q.key} className="space-y-1">
                {/* AI の質問 */}
                <p className="rounded-lg bg-gray-100 p-2 dark:bg-slate-700">{q.label}</p>
                {/* ユーザー回答（過去分のみ表示） */}
                {i < step && (
                  <p className="ml-auto w-fit rounded-lg bg-primary/90 p-2 text-white">
                    {answers[q.key]}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* 入力フォーム */}
          {step < QUESTIONS.length && (
            <form onSubmit={handleSubmit} className="space-y-3">
              {QUESTIONS[step].multiline ? (
                <Textarea
                  placeholder={QUESTIONS[step].placeholder}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  required
                  rows={3}
                  className="text-sm"
                />
              ) : (
                <Input
                  placeholder={QUESTIONS[step].placeholder}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  required
                  className="text-sm"
                />
              )}

              <div className="flex justify-end">
                <Button type="submit" disabled={loading || !input.trim()}>
                  {step + 1 === QUESTIONS.length ? "生成する" : "次へ"}
                </Button>
              </div>
            </form>
          )}

          {/* 生成中インジケータ */}
          {loading && (
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              生成中…
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}