/* ------------------------------------------------------------------
   components/question-card.tsx
   - 必要最低限の null / undefined ガードを追加
   - レイアウト・UIUX は従来のまま
------------------------------------------------------------------- */
"use client"

import { useCallback, useState, useEffect } from "react"
import type { Database } from "@/lib/supabase/types"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

/* ---------- 問題文を柔軟に取得 ---------- */
function getDisplayText(q: any): string {
  return (
    q.stem ??
    q.text ??
    q.prompt ??
    q.question_text ??
    q.body ??
    q.content ??
    q.statement ??
    ""
  );
}

/* ---------- 型定義 ---------- */
export type QuestionRow = Database["public"]["Tables"]["question_bank"]["Row"]

interface Props {
  question: QuestionRow
  sessionId: string
  initialAnswer?: { choice?: number; text?: string }
  onSaved?: () => void
}

/**
 * <QuestionCard>
 * - 択一式 / 自由記述を自動判定して描画
 * - 入力と同時に /api/save-answer へ POST
 */
export function QuestionCard({
  question,
  sessionId,
  initialAnswer,
  onSaved,
}: Props) {
  const { toast } = useToast()

  /* ---------- state ---------- */
  const [choice, setChoice] = useState<string>(
    initialAnswer?.choice != null ? String(initialAnswer.choice) : "",
  )
  const [text, setText] = useState<string>(initialAnswer?.text ?? "")
  const [saving, setSaving] = useState(false)

  /* Question が切り替わったら state をリセット */
  useEffect(() => {
    setChoice(
      initialAnswer?.choice != null ? String(initialAnswer.choice) : "",
    );
    setText(initialAnswer?.text ?? "");
  }, [question.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- 保存処理 ---------- */
  const save = useCallback(
    async (payload: { choice?: number; text?: string }) => {
      try {
        setSaving(true)
        const res = await fetch("/api/save-answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            questionId: question.id,
            answer: payload,
          }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error)
        onSaved?.()
      } catch (e: any) {
        toast({ description: e.message })
      } finally {
        setSaving(false)
      }
    },
    [question.id, sessionId, toast, onSaved],
  )

  /* ---------- 択一式 ---------- */
  const cat = question.category?.toString?.() ?? "";
  if (["web_lang", "web-lang", "web_math", "web-math"].includes(cat)) {
    /* choice 配列が null / オブジェクト形式 / 素の文字列など混在しても落ちないように整形 */
    const rawChoices = question.choices as any
    const choices: { id: number | string; text: string }[] = Array.isArray(rawChoices)
      ? rawChoices.map((c: any, idx: number) => {
          /* c がオブジェクトなら id/text をそのまま、プリミティブなら index・値を利用 */
          if (c && typeof c === "object" && "id" in c && "text" in c) {
            return { id: (c as any).id ?? idx, text: (c as any).text ?? "" }
          }
          return { id: idx, text: String(c ?? "") }
        })
      : []

    return (
      <div className="space-y-4">
        <p className="font-medium" dangerouslySetInnerHTML={{ __html: getDisplayText(question) }} />

        <RadioGroup
          name={`q-${question.id}`}
          value={choice}
          onValueChange={(val) => {
            if (val === "") return;       // 空選択は無視
            setChoice(val)
            const num = Number.isNaN(Number(val)) ? undefined : Number(val)
            save({ choice: num })
          }}
        >
          {choices.map((c) => {
            const itemId = `q-${question.id}-${c.id}`
            return (
              <div key={c.id} className="flex items-center space-x-2">
                <RadioGroupItem id={itemId} value={String(c.id)} />
                <Label
                  htmlFor={itemId}
                  className="text-sm leading-relaxed"
                >
                  {c.text}
                </Label>
              </div>
            )
          })}
        </RadioGroup>
      </div>
    )
  }

  /* ---------- 自由記述 ---------- */
  return (
    <div className="space-y-4">
      <p className="font-medium" dangerouslySetInnerHTML={{ __html: getDisplayText(question) }} />
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        /* onBlur 時に差分があれば保存 */
        onBlur={() => {
          if (text !== initialAnswer?.text) save({ text })
        }}
        rows={6}
        placeholder="自由記述欄"
      />
      <div className="text-right">
        <Button
          size="sm"
          onClick={() => save({ text })}
          disabled={saving}
          variant="secondary"
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  )
}