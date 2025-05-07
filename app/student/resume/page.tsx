/* ──────────────────────────────────────────────────────────
   app/student/resume/page.tsx   – 2025-05-07 Refactor
   - 職務経歴（experiences）を共通フックで CRUD
   - /student/resume でアクセス
───────────────────────────────────────────────────────── */
"use client"

import { useState } from "react"
import {
  Loader2, Info, PlusCircle, Trash2, Save, X, Briefcase,
} from "lucide-react"

import { useAuthGuard } from "@/lib/use-auth-guard"
import { useExperiences } from "@/lib/hooks/use-experiences"          /* ★ 追加 */

import type { Database } from "@/lib/supabase/types"
type ExperienceRow = Database["public"]["Tables"]["experiences"]["Row"]

import {
  Card, CardHeader, CardContent, CardTitle,
} from "@/components/ui/card"
import { Button }   from "@/components/ui/button"
import { Input }    from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label }    from "@/components/ui/label"

/* ---------- 新規行のテンプレ ---------- */
const emptyExperience = (): ExperienceRow => ({
  id: "",
  user_id: "",
  company_name : "",
  role         : "",
  start_date   : null,
  end_date     : null,
  achievements : "",
  created_at   : null,
})

/* ────────────────────── ページ本体 ────────────────────── */
export default function ResumePage() {
  const ready = useAuthGuard("student")

  /* --- 共通フック（fetch / add / update / remove） --- */
  const {
    data: experiences,
    loading,
    error,
    add,
    update,
    remove,
    refresh,
  } = useExperiences()

  /* --- 編集用ローカル state --- */
  const [editItems,  setEditItems]  = useState<ExperienceRow[]>([])
  const [isEditing,  setIsEditing]  = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  /* ---------- 編集開始時にコピー ---------- */
  const startEdit = () => {
    setEditItems(experiences ?? [])
    setIsEditing(true)
  }

  /* ---------- 保存（upsert） ---------- */
  const saveAll = async () => {
    try {
      setSaving(true)
      setLocalError(null)

      /* upsert したい行をまとめて実行 */
      await Promise.all(
        editItems.map((row) =>
          row.id ? update(row.id, row) : add(row),
        ),
      )

      /* 物理削除があれば remove() で実行済みなので OK */

      await refresh()          // 最新状態をサーバーから再取得
      setIsEditing(false)
    } catch (e: any) {
      setLocalError(e.message)
    } finally {
      setSaving(false)
    }
  }

  /* ---------- 行削除（編集モード中のみ） ---------- */
  const deleteItem = async (idx: number) => {
    const target = editItems[idx]
    if (target.id) {
      await remove(target.id)        // サーバーから即削除
    }
    setEditItems((prev) => prev.filter((_, i) => i !== idx))
  }

  /* ---------- 画面状態 ---------- */
  if (!ready || loading || saving) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="mr-2 h-6 w-6 animate-spin text-red-600" />
        <span>{saving ? "保存中…" : "ロード中…"}</span>
      </div>
    )
  }
  if (error || localError) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        <Info className="mr-2 h-5 w-5" />
        {error ?? localError}
      </div>
    )
  }

  /* ---------- UI ---------- */
  return (
    <main className="container mx-auto max-w-3xl space-y-6 px-4 py-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Briefcase className="h-6 w-6 text-red-600" />
          職務経歴
        </h1>

        {isEditing ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditing(false)}
            >
              <X className="mr-2 h-4 w-4" />
              キャンセル
            </Button>
            <Button onClick={saveAll}>
              <Save className="mr-2 h-4 w-4" />
              保存
            </Button>
          </div>
        ) : (
          <Button onClick={startEdit}>
            <PlusCircle className="mr-2 h-4 w-4" />
            編集
          </Button>
        )}
      </div>

      {/* メイン */}
      {isEditing ? (
        /* ---------- 編集モード ---------- */
        <div className="space-y-6">
          {editItems.map((exp, idx) => (
            <Card key={exp.id || idx} className="relative p-4">
              {/* 削除ボタン */}
              <button
                type="button"
                onClick={() => deleteItem(idx)}
                className="absolute right-3 top-3 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>

              <CardHeader className="pb-3">
                <CardTitle>経験 {idx + 1}</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* 企業名 */}
                <InputControl
                  label="企業名"
                  value={exp.company_name ?? ""}
                  onChange={(v) => setField(idx, "company_name", v)}
                />

                {/* 役割 */}
                <InputControl
                  label="役割 / 職種"
                  value={exp.role ?? ""}
                  onChange={(v) => setField(idx, "role", v)}
                />

                {/* 期間 */}
                <div className="grid gap-4 md:grid-cols-2">
                  <InputControl
                    label="開始日"
                    type="date"
                    value={exp.start_date ?? ""}
                    onChange={(v) => setField(idx, "start_date", v)}
                  />
                  <InputControl
                    label="終了日"
                    type="date"
                    value={exp.end_date ?? ""}
                    onChange={(v) => setField(idx, "end_date", v)}
                  />
                </div>

                {/* 実績 */}
                <TextareaControl
                  label="成果・実績"
                  value={exp.achievements ?? ""}
                  onChange={(v) => setField(idx, "achievements", v)}
                />
              </CardContent>
            </Card>
          ))}

          <Button
            variant="outline"
            className="w-full"
            onClick={() => setEditItems((prev) => [...prev, emptyExperience()])}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            経験を追加
          </Button>
        </div>
      ) : (
        /* ---------- 閲覧モード ---------- */
        <div className="space-y-6">
          {(experiences?.length ?? 0) === 0 ? (
            <p className="text-center text-muted-foreground">
              職務経歴はまだ登録されていません。
            </p>
          ) : (
            experiences!.map((exp, idx) => (
              <Card key={exp.id} className="p-4">
                <CardHeader className="pb-3">
                  <CardTitle>経験 {idx + 1}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <Field label="企業名"  value={exp.company_name} />
                  <Field label="役割"    value={exp.role} />
                  <Field
                    label="期間"
                    value={`${exp.start_date} 〜 ${exp.end_date ?? "現在"}`}
                  />
                  {exp.achievements && (
                    <Field
                      label="成果"
                      value={<span className="whitespace-pre-wrap">{exp.achievements}</span>}
                    />
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </main>
  )

  /* ───────── helpers ───────── */
  function setField<K extends keyof ExperienceRow>(
    idx: number,
    key: K,
    value: ExperienceRow[K],
  ) {
    setEditItems((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], [key]: value }
      return next
    })
  }
}

/* ---------------- 再利用ミニコンポーネント ---------------- */
type InputCtrlProps = {
  label: string
  value: string
  type?: React.InputHTMLAttributes<HTMLInputElement>["type"]
  onChange: (v: string) => void
}
function InputControl({ label, value, onChange, type = "text" }: InputCtrlProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

type TextareaCtrlProps = {
  label: string
  value: string
  onChange: (v: string) => void
}
function TextareaControl({ label, value, onChange }: TextareaCtrlProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Textarea
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

type FieldProps = { label: string; value: React.ReactNode }
function Field({ label, value }: FieldProps) {
  return (
    <p>
      <span className="font-medium">{label}: </span>
      {value}
    </p>
  )
}
