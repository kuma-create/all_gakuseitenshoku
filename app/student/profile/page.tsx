/* ────────────────────────────────────────────────
   app/student/profile/page.tsx
   - 基本情報 / 自己PR / 希望条件の 3 タブ
   - 「基本情報」タブ内で 学歴・スキル を Collapsible 分割
   - 上部にプロフィール完成度 ProgressBar
──────────────────────────────────────────────── */
"use client"

import { useState } from "react"
import {
  User, FileText, Target, Edit, Save, X,
  CheckCircle2, AlertCircle, GraduationCap, Code,
  ChevronUp,
} from "lucide-react"

import { useAuthGuard } from "@/lib/use-auth-guard"

import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs"
import {
  Collapsible, CollapsibleTrigger, CollapsibleContent,
} from "@/components/ui/collapsible"
import { Button }   from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge }    from "@/components/ui/badge"
import { Input }    from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label }    from "@/components/ui/label"

import { useStudentProfile } from "@/lib/hooks/use-student-profile"

export default function StudentProfilePage() {
  /* 1) 認証ガード */
  const ready = useAuthGuard("student")

  /* 2) プロフィール共通フック */
  const {
    data: profile,
    loading,
    error,
    saving,
    editing,             // true / false
    completionRate,
    updateLocal,
    save,
    resetLocal,
  } = useStudentProfile()

  /* 3) 表示タブ */
  const [tab, setTab] = useState<"basic" | "pr" | "pref">("basic")

  /* ---------- 状態別リターン ---------- */
  if (!ready || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
      </div>
    )
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        {error}
      </div>
    )
  }

  /* ---------- 本体 ---------- */
  return (
    <main className="container mx-auto max-w-4xl space-y-6 px-4 py-6">
      {/* ─── ヘッダー ─────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">マイプロフィール</h1>

        {editing ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetLocal}>
              <X className="mr-1 h-4 w-4" /> キャンセル
            </Button>
            <Button disabled={saving} onClick={save}>
              <Save className="mr-1 h-4 w-4" />
              {saving ? "保存中…" : "保存"}
            </Button>
          </div>
        ) : (
          <Button onClick={() => updateLocal({ __editing: true })}>
            <Edit className="mr-1 h-4 w-4" /> 編集
          </Button>
        )}
      </div>

      {/* ─── 完成度バー ─────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            プロフィール完成度
            <Badge>{completionRate}%</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={completionRate} />
          <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
            {[
              { label: "基本情報", key: "basicCompleted" },
              { label: "自己PR",   key: "prCompleted" },
              { label: "希望条件", key: "prefCompleted" },
            ].map(({ label, key }) => {
              const done = (profile as any)[key] as boolean | undefined
              return (
                <span
                  key={key}
                  className={`flex items-center gap-1 ${
                    done ? "text-green-600" : ""
                  }`}
                >
                  {done ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                  {label}
                </span>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* ─── タブ ───────────────────────────────────── */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">
            <User className="mr-1 h-4 w-4" /> 基本情報
          </TabsTrigger>
          <TabsTrigger value="pr">
            <FileText className="mr-1 h-4 w-4" /> 自己PR
          </TabsTrigger>
          <TabsTrigger value="pref">
            <Target className="mr-1 h-4 w-4" /> 希望条件
          </TabsTrigger>
        </TabsList>

        {/* === 基本情報タブ ===================================== */}
        <TabsContent value="basic" className="space-y-4">
          {/* ---------- Collapsible #1 基本情報 ---------- */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger asChild>
              <CardHeader className="flex cursor-pointer items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
                <User className="h-4 w-4 text-primary" />
                <CardTitle className="text-base font-medium">基本情報</CardTitle>
                <ChevronUp className="ml-auto h-4 w-4 text-muted-foreground transition-transform data-[state=closed]:rotate-180" />
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-4">
                {[
                  { id: "full_name",       label: "氏名",      type: "text" },
                  { id: "phone",           label: "電話番号",  type: "text" },
                  { id: "address",         label: "住所",      type: "text" },
                ].map(({ id, label, type }) => (
                  <div key={id} className="space-y-1">
                    <Label htmlFor={id}>{label}</Label>
                    <Input
                      id={id}
                      type={type}
                      disabled={!editing}
                      value={(profile as any)[id] ?? ""}
                      onChange={(e) => updateLocal({ [id]: e.target.value })}
                    />
                  </div>
                ))}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>

          {/* ---------- Collapsible #2 学歴 ---------- */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger asChild>
              <CardHeader className="mt-4 flex cursor-pointer items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
                <GraduationCap className="h-4 w-4 text-primary" />
                <CardTitle className="text-base font-medium">学歴</CardTitle>
                <ChevronUp className="ml-auto h-4 w-4 text-muted-foreground transition-transform data-[state=closed]:rotate-180" />
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-4">
                {[
                  { id: "university",   label: "大学名",       type: "text" },
                  { id: "faculty",      label: "学部",         type: "text" },
                  { id: "admission_month",  label: "入学年月(YYYY-MM)", type: "month" },
                  { id: "graduation_year",  label: "卒業予定年",        type: "number" },
                ].map(({ id, label, type }) => (
                  <div key={id} className="space-y-1">
                    <Label htmlFor={id}>{label}</Label>
                    <Input
                      id={id}
                      type={type}
                      disabled={!editing}
                      value={(profile as any)[id] ?? ""}
                      onChange={(e) =>
                        updateLocal({
                          [id]:
                            type === "number"
                              ? Number(e.target.value) || null
                              : e.target.value,
                        })
                      }
                    />
                  </div>
                ))}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>

          {/* ---------- Collapsible #3 スキル ---------- */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger asChild>
              <CardHeader className="mt-4 flex cursor-pointer items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
                <Code className="h-4 w-4 text-primary" />
                <CardTitle className="text-base font-medium">スキル</CardTitle>
                <ChevronUp className="ml-auto h-4 w-4 text-muted-foreground transition-transform data-[state=closed]:rotate-180" />
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-4">
                {[
                  { id: "qualification_text", label: "資格",      rows: 3 },
                  { id: "skill_text",         label: "スキル",    rows: 3 },
                  { id: "language_skill",     label: "語学力",    rows: 2 },
                ].map(({ id, label, rows }) => (
                  <div key={id} className="space-y-1">
                    <Label htmlFor={id}>{label}</Label>
                    <Textarea
                      id={id}
                      rows={rows}
                      disabled={!editing}
                      value={(profile as any)[id] ?? ""}
                      onChange={(e) => updateLocal({ [id]: e.target.value })}
                    />
                  </div>
                ))}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </TabsContent>

        {/* === 自己PRタブ ======================================= */}
        <TabsContent value="pr">
          <Card>
            <CardHeader>
              <CardTitle>自己PR</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                rows={10}
                disabled={!editing}
                value={profile.pr_text ?? ""}
                onChange={(e) => updateLocal({ pr_text: e.target.value })}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* === 希望条件タブ ===================================== */}
        <TabsContent value="pref">
          <Card>
            <CardHeader>
              <CardTitle>希望条件</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>希望勤務形態</Label>
                <Input
                  disabled={!editing}
                  value={profile.work_style ?? ""}
                  onChange={(e) => updateLocal({ work_style: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>希望年収</Label>
                <Input
                  disabled={!editing}
                  value={profile.salary_range ?? ""}
                  onChange={(e) => updateLocal({ salary_range: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>備考</Label>
                <Textarea
                  rows={4}
                  disabled={!editing}
                  value={profile.preference_note ?? ""}
                  onChange={(e) => updateLocal({ preference_note: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  )
}
