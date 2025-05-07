/* ────────────────────────────────────────────────
   app/student/resume/page.tsx
   - 職務経歴（experiences テーブル）を CRUD
   - /student/resume
   - Sticky 保存バー & 簡易完了率
──────────────────────────────────────────────── */
"use client"

import { useState, useMemo } from "react"
import {
  PlusCircle, Trash2, Save, X, Briefcase,
  ChevronUp, Loader2, Info, CheckCircle2, AlertCircle,
} from "lucide-react"

import { useAuthGuard } from "@/lib/use-auth-guard"
import { useExperiences } from "@/lib/hooks/use-experiences"

import type { Database } from "@/lib/supabase/types"
type Row = Database["public"]["Tables"]["experiences"]["Row"]

import {
  Card, CardHeader, CardContent, CardTitle,
} from "@/components/ui/card"
import {
  Collapsible, CollapsibleTrigger, CollapsibleContent,
} from "@/components/ui/collapsible"
import { Button }   from "@/components/ui/button"
import { Input }    from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label }    from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Badge }    from "@/components/ui/badge"

/* ---------- 新規行テンプレ ---------- */
const emptyRow = (): Row => ({
  id: "",
  user_id: "",
  company_name : "",
  role         : "",
  start_date   : null,
  end_date     : null,
  achievements : "",
  created_at   : null,
})

/* ────────────────────────────── */
export default function ResumePage() {
  const ready = useAuthGuard("student")

  const {
    data: rows,
    loading,
    error,
    add, update, remove, refresh,
  } = useExperiences()

  /* 編集ローカル state */
  const [local,      setLocal]      = useState<Row[]>([])
  const [editing,    setEditing]    = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [localErr,   setLocalErr]   = useState<string | null>(null)

  /* ---------- 編集開始 / キャンセル ---------- */
  const startEdit = () => {
    setLocal(rows ?? [])
    setEditing(true)
  }
  const cancelEdit = () => {
    setEditing(false)
    setLocal([])
  }

  /* ---------- 保存 ---------- */
  const saveAll = async () => {
    try {
      setSaving(true)
      setLocalErr(null)

      /* upsert or insert */
      await Promise.all(
        local.map((r) => (r.id ? update(r.id, r) : add(r))),
      )

      /* 行が減った場合（削除）は remove すでに実行済みなので無視 */

      await refresh()
      setEditing(false)
    } catch (e: any) {
      setLocalErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  /* ---------- 完了率 ---------- */
  const completionRate = useMemo(() => {
    const totalFields = ["company_name", "role", "start_date", "achievements"]
    const filled = (editing ? local : rows ?? []).reduce((acc, row) => {
      totalFields.forEach((k) => {
        if ((row as any)[k]) acc++
      })
      return acc
    }, 0)
    const denom = totalFields.length * (editing ? local.length : rows?.length ?? 0) || 1
    return Math.round((filled / denom) * 100)
  }, [editing, local, rows])

  /* ---------- 状態ガード ---------- */
  if (!ready || loading || saving) {
    return (
      <ScreenCenter>
        <Loader2 className="mr-2 h-6 w-6 animate-spin text-primary" />
        <span>{saving ? "保存中…" : "ロード中…"}</span>
      </ScreenCenter>
    )
  }
  if (error || localErr) {
    return (
      <ScreenCenter>
        <Info className="mr-2 h-5 w-5 text-destructive" />
        {(error ?? localErr) as string}
      </ScreenCenter>
    )
  }

  /* ---------- UI ---------- */
  return (
    <>
      <main className="container mx-auto max-w-3xl space-y-6 px-4 py-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Briefcase className="h-6 w-6 text-primary" />
            職務経歴
          </h1>

          {editing ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={cancelEdit}>
                <X className="mr-1 h-4 w-4" /> キャンセル
              </Button>
              <Button onClick={saveAll}>
                <Save className="mr-1 h-4 w-4" /> 保存
              </Button>
            </div>
          ) : (
            <Button onClick={startEdit}>
              <PlusCircle className="mr-1 h-4 w-4" /> 編集
            </Button>
          )}
        </div>

        {/* 完了率バー */}
        <div className="flex items-center gap-3">
          <Progress value={completionRate} className="flex-1" />
          <Badge>{completionRate}%</Badge>
        </div>

        {/* 本体 */}
        {editing ? (
          <EditMode
            items={local}
            setItems={setLocal}
            completionRate={completionRate}
            deleteRow={async (idx, row) => {
              if (row.id) await remove(row.id)
              setLocal((prev) => prev.filter((_, i) => i !== idx))
            }}
          />
        ) : (
          <ViewMode items={rows ?? []} />
        )}
      </main>

      {/* Sticky 保存バー（編集中のみ） */}
      {editing && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <Progress value={completionRate} className="h-2 w-24" />
              <span className="text-xs font-medium">{completionRate}% 完了</span>
            </div>
            <Button onClick={saveAll} size="sm">
              <Save className="mr-1 h-4 w-4" /> すべて保存
            </Button>
          </div>
        </div>
      )}
    </>
  )
}

/* ========== 編集モード UI ========== */
type EditProps = {
  items: Row[]
  setItems: React.Dispatch<React.SetStateAction<Row[]>>
  completionRate: number
  deleteRow: (idx: number, row: Row) => void
}
function EditMode({ items, setItems, deleteRow }: EditProps) {
  /* 行フィールド更新 */
  const setField = <K extends keyof Row>(idx: number, key: K, val: Row[K]) =>
    setItems((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], [key]: val }
      return next
    })

  return (
    <div className="space-y-6">
      {items.map((exp, idx) => (
        <Collapsible key={exp.id || idx} defaultOpen>
          <CollapsibleTrigger asChild>
            <CardHeader className="flex cursor-pointer items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
              <span className="font-medium">
                {exp.company_name || `職歴 ${idx + 1}`}
              </span>
              <ChevronUp className="ml-auto h-4 w-4 text-muted-foreground transition-transform data-[state=closed]:rotate-180" />
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="relative">
              <button
                className="absolute right-4 top-4 text-muted-foreground hover:text-destructive"
                onClick={() => deleteRow(idx, exp)}
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <CardContent className="space-y-4 pt-8">
                <InputCtrl
                  label="企業名"
                  value={exp.company_name ?? ""}
                  onChange={(v) => setField(idx, "company_name", v)}
                />
                <InputCtrl
                  label="役割 / 職種"
                  value={exp.role ?? ""}
                  onChange={(v) => setField(idx, "role", v)}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <InputCtrl
                    label="開始日"
                    type="date"
                    value={exp.start_date ?? ""}
                    onChange={(v) => setField(idx, "start_date", v)}
                  />
                  <InputCtrl
                    label="終了日"
                    type="date"
                    value={exp.end_date ?? ""}
                    onChange={(v) => setField(idx, "end_date", v)}
                  />
                </div>
                <TextareaCtrl
                  label="成果・実績"
                  value={exp.achievements ?? ""}
                  onChange={(v) => setField(idx, "achievements", v)}
                />
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      ))}

      <Button
        variant="outline"
        className="w-full"
        onClick={() => setItems((prev) => [...prev, emptyRow()])}
      >
        <PlusCircle className="mr-1 h-4 w-4" /> 職歴を追加
      </Button>
    </div>
  )
}

/* ========== 閲覧モード UI ========== */
function ViewMode({ items }: { items: Row[] }) {
  if (items.length === 0) {
    return (
      <p className="text-center text-muted-foreground">
        職務経歴はまだ登録されていません。
      </p>
    )
  }
  return (
    <div className="space-y-6">
      {items.map((exp, idx) => (
        <Card key={exp.id} className="p-4">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              {exp.company_name || `職歴 ${idx + 1}`}
              {(exp.company_name && exp.role) && (
                <Badge variant="outline" className="ml-2 text-xs">
                  {exp.role}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Field label="期間">{`${exp.start_date} 〜 ${exp.end_date ?? "現在"}`}</Field>
            {exp.achievements && (
              <Field label="成果">
                <span className="whitespace-pre-wrap">{exp.achievements}</span>
              </Field>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/* ========== 再利用ミニコンポーネント ========== */
function ScreenCenter({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      {children}
    </div>
  )
}

function InputCtrl({
  label, value, onChange, type = "text",
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: React.InputHTMLAttributes<HTMLInputElement>["type"]
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

function TextareaCtrl({
  label, value, onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Textarea
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

function Field({
  label, children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <p>
      <span className="font-medium">{label}: </span>{children}
    </p>
  )
}
