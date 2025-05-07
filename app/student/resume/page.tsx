/* ──────────────────────────────────────────────────────────
   app/student/resume/page.tsx
   - 学生の「職務経歴（インターン・アルバイト・実務）」専用ページ
   - /student/resume でアクセス
   - Supabase で experiences テーブルを CRUD
     （id: uuid / user_id: uuid / company_name / role / start_date /
       end_date / achievements / created_at）
   - 1 行でも無い場合は空配列で表示
───────────────────────────────────────────────────────── */
"use client"

import { useEffect, useState } from "react"
import {
  Loader2,
  Info,
  PlusCircle,
  Trash2,
  Save,
  X,
  Briefcase,
} from "lucide-react"

import { supabase } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/types"
import { useAuthGuard } from "@/lib/use-auth-guard"

import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
} from "@/components/ui/card"
import { Button }   from "@/components/ui/button"
import { Input }    from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label }    from "@/components/ui/label"

/* ---------- 型 ---------- */
type ExperienceRow =
  Database["public"]["Tables"]["experiences"]["Row"]

/* ---------- 空 Experience ---------- */
const emptyExperience = (): ExperienceRow => ({
  id: "",
  user_id: "",
  company_name: "",
  role: "",
  start_date: null,
  end_date: null,
  achievements: "",
  created_at: null,
})

/* ────────────────────── ページ本体 ────────────────────── */
export default function ResumePage() {
  const ready = useAuthGuard("student")

  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const [items, setItems]       = useState<ExperienceRow[]>([])
  const [editItems, setEditItems] = useState<ExperienceRow[]>([])
  const [isEditing, setIsEditing] = useState(false)

  /* ---------------- Fetch experiences ---------------- */
  useEffect(() => {
    if (!ready) return

    ;(async () => {
      setLoading(true)
      setError(null)

      try {
        const { data: { user }, error: authErr } = await supabase.auth.getUser()
        if (authErr || !user) throw new Error("認証エラー")

        const { data, error } = await supabase
          .from("experiences")
          .select("*")
          .eq("user_id", user.id)
          .order("start_date", { ascending: false })

        if (error) throw error

        const rows = data as ExperienceRow[]
        setItems(rows)
        setEditItems(rows)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [ready])

  /* ---------------- Save (upsert 全件) ---------------- */
  const saveAll = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser()
      if (authErr || !user) throw new Error("認証エラー")

      /* payload → id 空文字なら削除して INSERT 扱い */
      const payload = editItems.map(e => {
        const row = { ...e, user_id: user.id }
        if (!row.id) delete (row as any).id
        return row
      })

      /* 1) upsert でまとめて書き込み */
      const { error: upErr } = await supabase
        .from("experiences")
        .upsert(payload, { onConflict: "id" })

      if (upErr) throw upErr

      /* 2) id が空で無くなった行を再取得して state に反映 */
      const { data, error: selErr } = await supabase
        .from("experiences")
        .select("*")
        .eq("user_id", user.id)
        .order("start_date", { ascending: false })

      if (selErr) throw selErr
      const rows = data as ExperienceRow[]
      setItems(rows)
      setEditItems(rows)
      setIsEditing(false)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  /* ---------------- Delete single row (即時) ---------------- */
  const deleteItem = async (id: string) => {
    if (!id) {
      // まだ DB に無いローカル行
      setEditItems(prev => prev.filter(e => e.id !== id))
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase
        .from("experiences")
        .delete()
        .eq("id", id)
      if (error) throw error
      setEditItems(prev => prev.filter(e => e.id !== id))
      setItems(prev => prev.filter(e => e.id !== id))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  /* ---------------- UI ---------------- */
  if (!ready || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-6 w-6 mr-2 animate-spin text-red-600" />
        <span>ロード中...</span>
      </div>
    )
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        <Info className="h-5 w-5 mr-2" /> {error}
      </div>
    )
  }

  return (
    <main className="container mx-auto max-w-3xl space-y-6 px-4 py-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-red-600" />
          職務経歴
        </h1>

        {isEditing ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              setEditItems(items)
              setIsEditing(false)
            }}>
              <X className="h-4 w-4 mr-2" /> キャンセル
            </Button>
            <Button onClick={saveAll}>
              <Save className="h-4 w-4 mr-2" /> 保存
            </Button>
          </div>
        ) : (
          <Button onClick={() => setIsEditing(true)}>
            <PlusCircle className="h-4 w-4 mr-2" /> 編集
          </Button>
        )}
      </div>

      {/* コンテンツ */}
      {isEditing ? (
        <div className="space-y-6">
          {editItems.map((exp, idx) => (
            <Card key={exp.id || idx} className="relative p-4">
              <button
                type="button"
                onClick={() => deleteItem(exp.id)}
                className="absolute top-3 right-3 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>

              <CardHeader className="pb-3">
                <CardTitle>経験 {idx + 1}</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* company */}
                <div className="space-y-2">
                  <Label>企業名</Label>
                  <Input
                    value={exp.company_name ?? ""}
                    onChange={e => updateField(idx, "company_name", e.target.value)}
                  />
                </div>

                {/* role */}
                <div className="space-y-2">
                  <Label>役割 / 職種</Label>
                  <Input
                    value={exp.role ?? ""}
                    onChange={e => updateField(idx, "role", e.target.value)}
                  />
                </div>

                {/* dates */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>開始日</Label>
                    <Input
                      type="date"
                      value={exp.start_date ?? ""}
                      onChange={e => updateField(idx, "start_date", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>終了日</Label>
                    <Input
                      type="date"
                      value={exp.end_date ?? ""}
                      onChange={e => updateField(idx, "end_date", e.target.value)}
                    />
                  </div>
                </div>

                {/* achievements */}
                <div className="space-y-2">
                  <Label>成果・実績</Label>
                  <Textarea
                    rows={4}
                    value={exp.achievements ?? ""}
                    onChange={e => updateField(idx, "achievements", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          {/* 追加ボタン */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setEditItems(prev => [...prev, emptyExperience()])}
          >
            <PlusCircle className="h-4 w-4 mr-2" /> 経験を追加
          </Button>
        </div>
      ) : (
        /* 表示モード */
        <div className="space-y-6">
          {items.length === 0 ? (
            <p className="text-center text-muted-foreground">職務経歴はまだ登録されていません。</p>
          ) : (
            items.map((exp, idx) => (
              <Card key={exp.id} className="p-4">
                <CardHeader className="pb-3">
                  <CardTitle>経験 {idx + 1}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p><span className="font-medium">企業名:</span> {exp.company_name}</p>
                  <p><span className="font-medium">役割:</span> {exp.role}</p>
                  <p>
                    <span className="font-medium">期間:</span>{" "}
                    {exp.start_date} 〜 {exp.end_date ?? "現在"}
                  </p>
                  {exp.achievements && (
                    <p className="whitespace-pre-wrap">
                      <span className="font-medium">成果:</span> {exp.achievements}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </main>
  )

  /* --- インライン helper: フィールド更新 --- */
  function updateField<K extends keyof ExperienceRow>(
    idx: number,
    key: K,
    value: ExperienceRow[K]
  ) {
    setEditItems(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [key]: value }
      return next
    })
  }
}
