"use client"

import { useCallback, useEffect, useState } from "react"
import type { Database } from "@/lib/supabase/types"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

// 型定義
export type QuestionRow = Database["public"]["Tables"]["question_bank"]["Row"]

interface Props {
  question: QuestionRow
  sessionId: string
  initialAnswer?: { choice?: number; text?: string }
  onSaved?: () => void
}

/**
 * <QuestionCard>
 * - 択一式・自由記述を自動判定してレンダリング
 * - 変更と同時に /api/save-answer へ POST
 */
export function QuestionCard({ question, sessionId, initialAnswer, onSaved }: Props) {
  const { toast } = useToast()
  const [choice, setChoice] = useState<string | null>(
    initialAnswer?.choice?.toString() ?? null,
  )
  const [text, setText] = useState<string>(initialAnswer?.text ?? "")
  const [saving, setSaving] = useState(false)

  /* ---------------------------------- 保存処理 ---------------------------------- */
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

  /* ---------------------------------- 択一式 ---------------------------------- */
  if (question.category === "web_lang" || question.category === "web_math") {
    const choices = (question.choices as any[]) ?? []
    return (
      <div className="space-y-4">
        <p className="font-medium" dangerouslySetInnerHTML={{ __html: question.stem }} />

        <RadioGroup
          value={choice ?? undefined}
          onValueChange={(val) => {
            setChoice(val)
            save({ choice: parseInt(val, 10) })
          }}
        >
          {choices.map((c) => (
            <RadioGroupItem key={c.id} value={c.id.toString()}>
              {c.text}
            </RadioGroupItem>
          ))}
        </RadioGroup>
      </div>
    )
  }

  /* ---------------------------------- 自由記述 --------------------------------- */
  return (
    <div className="space-y-4">
      <p className="font-medium" dangerouslySetInnerHTML={{ __html: question.stem }} />
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
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
