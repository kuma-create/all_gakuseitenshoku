/* ------------------------------------------------------------------
   components/question-card.tsx – v2
   - 4択/自由記述を自動判定（choices>=2 or correct_choice(1-4)で択一）
   - choices の形式差異を吸収（string配列 / {text}配列 / choice1..4 のどれでも）
   - 1-based の選択値を保存
------------------------------------------------------------------- */
"use client"

import { useCallback, useState, useEffect, useMemo } from "react"
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
  onAnswered?: (questionId: string, choice: number | string | null) => void
}

/* ---------- 選択肢の正規化 ---------- */
function normalizeChoices(q: any): string[] {
  // 最優先: choices(json配列)
  const raw = q?.choices
  if (Array.isArray(raw)) {
    return raw
      .map((c: any) => {
        if (typeof c === "string") return c
        if (c && typeof c === "object") {
          if (typeof c.text === "string") return c.text
          if (typeof c.label === "string") return c.label
          if (typeof c.value === "string") return c.value
        }
        return c != null ? String(c) : ""
      })
      .filter((s: string) => s.trim().length > 0)
  }

  // 次点: choice1..4 / choice_1..4
  const c1 = q?.choice1 ?? q?.choice_1 ?? null
  const c2 = q?.choice2 ?? q?.choice_2 ?? null
  const c3 = q?.choice3 ?? q?.choice_3 ?? null
  const c4 = q?.choice4 ?? q?.choice_4 ?? null
  return [c1, c2, c3, c4]
    .map((v) => (typeof v === "string" ? v : v != null ? String(v) : ""))
    .filter((s) => s.trim().length > 0)
}

export function QuestionCard({
  question,
  sessionId,
  initialAnswer,
  onSaved,
  onAnswered,
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
    setChoice(initialAnswer?.choice != null ? String(initialAnswer.choice) : "")
    setText(initialAnswer?.text ?? "")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id])

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

  /* ---------- 択一式 or 自由記述を自動判定 ---------- */
  const choices = useMemo(() => normalizeChoices(question), [question])
  const hasCorrect = Number.isInteger(question?.correct_choice) &&
    question!.correct_choice! >= 1 && question!.correct_choice! <= 4
  const isMCQ = hasCorrect || choices.length >= 2

  if (isMCQ) {
    // 1-based の value を採用
    const normalized = choices.map((label, idx) => ({ value: idx + 1, label }))

    return (
      <div className="space-y-4">
        <p className="font-medium" dangerouslySetInnerHTML={{ __html: getDisplayText(question) }} />

        <RadioGroup
          name={`q-${question.id}`}
          value={choice}
          onValueChange={(val) => {
            if (val === "") return
            setChoice(val)
            const num = Number(val)
            save({ choice: Number.isNaN(num) ? undefined : num })
            onAnswered?.(question.id, Number.isNaN(num) ? null : num)
          }}
        >
          {normalized.map((c) => {
            const itemId = `q-${question.id}-${c.value}`
            return (
              <div key={c.value} className="flex items-center space-x-2">
                <RadioGroupItem id={itemId} value={String(c.value)} />
                <Label htmlFor={itemId} className="text-sm leading-relaxed">
                  {c.label}
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
        onChange={(e) => {
          const v = e.target.value
          setText(v)
          onAnswered?.(question.id, v)
        }}
        rows={6}
        placeholder="自由記述欄"
      />
      <div className="text-right">
        <Button size="sm" onClick={() => save({ text })} disabled={saving} variant="secondary">
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  )
}