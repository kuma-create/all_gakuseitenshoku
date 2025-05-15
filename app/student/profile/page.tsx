/* ────────────────────────────────────────────────
   app/student/profile/page.tsx  – v2
   - 既存 UI を維持しつつ zod で入力検証
─────────────────────────────────────────── */
"use client"

import { useState, useEffect } from "react"
import {
  User, FileText, Target, Edit, Save, X, CheckCircle2, AlertCircle,
  GraduationCap, Code, ChevronUp, Info,
} from "lucide-react"
import { z } from "zod"
import { toast } from "@/components/ui/use-toast"

import { useAuthGuard }      from "@/lib/use-auth-guard"
import { useStudentProfile } from "@/lib/hooks/use-student-profile"
import { useProfileCompletion } from "@/hooks/useProfileCompletion"; 

import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
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
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"

/* ── zod Schema (必須 & 文字数チェック) ────────────────── */
const schema = z.object({
  last_name:  z.string().min(1, "姓は必須です"),
  first_name: z.string().min(1, "名は必須です"),
  university: z.string().min(1, "大学名は必須です"),
  faculty:    z.string().min(1, "学部は必須です"),
  pr_text:    z.string().max(800, "自己PRは800文字以内"),
})

/* reusable mini-components ------------------------------------------------ */
type FieldInputProps = {
  id: string
  label: string
  type?: React.HTMLInputTypeAttribute
  value: string | number
  disabled: boolean
  placeholder?: string
  onChange: (v: string) => void
  required?: boolean
  error?: string
}
const FieldInput = ({
  id, label, type = "text", value, disabled, placeholder, onChange, required, error,
}: FieldInputProps) => (
  <div className="space-y-1">
    <Label htmlFor={id} className="text-xs sm:text-sm">
      {label}{required && <span className="text-red-500">*</span>}
    </Label>
    <Input
      id={id}
      type={type}
      disabled={disabled}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-8 text-xs sm:h-10 sm:text-sm ${error && "border-red-500"}`}
    />
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
)

type FieldTextareaProps = {
  id: string
  label: string
  value: string
  rows?: number
  disabled: boolean
  max?: number
  placeholder?: string
  onChange: (v: string) => void
  error?: string
}
const FieldTextarea = ({
  id, label, value, rows = 4, disabled, max, placeholder, onChange, error,
}: FieldTextareaProps) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between">
      <Label htmlFor={id} className="text-xs sm:text-sm">{label}</Label>
      {max && (
        <span className="text-xs text-gray-500">
          {value.length}/{max}文字
        </span>
      )}
    </div>
    <Textarea
      id={id}
      rows={rows}
      placeholder={placeholder}
      disabled={disabled}
      value={value}
      maxLength={max}
      onChange={(e) => onChange(e.target.value)}
      className={`text-xs sm:text-sm ${error && "border-red-500"}`}
    />
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
)
/* ------------------------------------------------------------------------- */

type FormValues = z.infer<typeof schema>

export default function StudentProfilePage() {
  /* 1) auth guard --------------------------------------------------------- */
  const ready = useAuthGuard("student")

  /* 2) profile hook ------------------------------------------------------- */
  const {
    data       : profile,
    loading,
    error,
    saving,
    editing,
    updateLocal,
    save,
    resetLocal,
  } = useStudentProfile()

  /* 3) UI state ----------------------------------------------------------- */
  const [tab, setTab]       = useState<"basic" | "pr" | "pref">("basic")
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({})
  const [savedToast, setSavedToast] = useState(false)

  /* 4) completion --------------------------------------------------------- */
  const isFilled = (v: unknown) =>
    Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && v !== ""

  const completion = useProfileCompletion();     

  const sectionDone = {
    basic: isFilled(profile.last_name) && isFilled(profile.first_name),
    pr   : isFilled(profile.pr_text),
    pref : isFilled(profile.desired_industries) && isFilled(profile.work_style),
  }
  const completionRate =
    Math.round((Number(sectionDone.basic) + Number(sectionDone.pr) + Number(sectionDone.pref)) / 3 * 100)

  /* toast timer */
  useEffect(() => {
    if (savedToast) {
      const t = setTimeout(() => setSavedToast(false), 2500)
      return () => clearTimeout(t)
    }
  }, [savedToast])

  /* helper UI */
  const getBarColor = (pct: number) =>
    pct < 30 ? "bg-red-500" : pct < 70 ? "bg-yellow-500" : "bg-green-500"

  const Status = ({ pct }: { pct: number }) =>
    pct === 100
      ? <CheckCircle2 size={14} className="text-green-600" />
      : <AlertCircle   size={14} className={pct ? "text-yellow-600" : "text-red-600"} />

  /* save ----------------------------------------------------------------- */
  const handleSave = async () => {
    /* zod 検証 */
    const parse = schema.safeParse(profile)
    if (!parse.success) {
      const fieldErr: typeof errors = {}
      parse.error.errors.forEach(e => {
        const k = e.path[0] as keyof FormValues
        fieldErr[k] = e.message
      })
      setErrors(fieldErr)
      toast({ title: "入力エラーがあります", variant: "destructive" })
      return
    }

    setErrors({})
    await save()
    setSavedToast(true)
  }
  /* ================= RENDER ============================================ */
  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      {/* --- header ------------------------------------------------------- */}
      <div className="mb-6 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 p-4 shadow-sm sm:mb-8 sm:p-6">
        {/* row */}
        <div className="mb-4 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">マイプロフィール</h1>
            <p className="text-xs text-gray-500 sm:text-sm">
              学生情報を入力・更新してスカウト率を高めましょう
            </p>
          </div>

          {/* action buttons */}
          {editing ? (
            <div className="flex gap-2">
              <Button variant="outline" className="h-8 sm:h-10" onClick={resetLocal}>
                <X size={14} className="mr-1" /> キャンセル
              </Button>
              <Button className="h-8 sm:h-10" disabled={saving} onClick={handleSave}>
                {saving ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent mr-1" />
                    保存中…
                  </>
                ) : (
                  <>
                    <Save size={14} className="mr-1" /> 保存
                  </>
                )}
              </Button>
            </div>
          ) : (
            <Button className="h-8 sm:h-10" onClick={() => updateLocal({ __editing: true })}>
              <Edit size={14} className="mr-1" /> 編集
            </Button>
          )}
        </div>

        {/* progress bar */}
        <div className="mb-2 flex items-center justify-between text-sm">
          <span>プロフィール完成度</span>
          <span className="font-semibold">{completionRate}%</span>
        </div>
        <Progress value={completionRate} className={`h-2 ${getBarColor(completionRate)}`} />

        {/* section chips */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {(['basic', 'pr', 'pref'] as const).map((s) => {
            const pct = sectionDone[s] ? 100 : 0
            const names = { basic: '基本情報', pr: '自己PR', pref: '希望条件' }
            const icons = {
              basic: <User size={14} />, pr: <FileText size={14} />, pref: <Target size={14} />,
            }
            return (
              <button
                key={s}
                className={`flex items-center justify-between rounded-md border p-2 text-xs ${
                  tab === s ? 'border-primary bg-primary/5' : 'border-gray-200'
                }`}
                onClick={() => setTab(s)}
              >
                <span className="flex items-center gap-1 text-muted-foreground">
                  {icons[s]} {names[s]}
                </span>
                <span className="flex items-center gap-1">
                  {pct}%
                  <Status pct={pct} />
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* --- tabs --------------------------------------------------------- */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="space-y-6">
        <TabsList className="hidden" /> {/* トリガは上で自作したので隠す */}

        {/* BASIC ========================================================= */}
        <TabsContent value="basic" className="space-y-4">
          {/* ============ 基本情報 ============= */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger asChild>
              <SectionHeader icon={User} title="基本情報" />
            </CollapsibleTrigger>
            <CollapsibleContent className="animate-accordion-down">
              <Card className="border-t-0">
                <CardContent className="space-y-4 p-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FieldInput
                      id="last_name"
                      label="姓"
                      required
                      value={profile.last_name ?? ''}
                      disabled={!editing}
                      onChange={(v) => updateLocal({ last_name: v })}
                    />
                    <FieldInput
                      id="first_name"
                      label="名"
                      required
                      value={profile.first_name ?? ''}
                      disabled={!editing}
                      onChange={(v) => updateLocal({ first_name: v })}
                    />
                    <FieldInput
                      id="last_name_kana"
                      label="セイ"
                      value={profile.last_name_kana ?? ''}
                      disabled={!editing}
                      onChange={(v) => updateLocal({ last_name_kana: v })}
                    />
                    <FieldInput
                      id="first_name_kana"
                      label="メイ"
                      value={profile.first_name_kana ?? ''}
                      disabled={!editing}
                      onChange={(v) => updateLocal({ first_name_kana: v })}
                    />
                  </div>

                  <FieldInput
                    id="phone"
                    label="電話番号"
                    value={profile.phone ?? ''}
                    disabled={!editing}
                    onChange={(v) => updateLocal({ phone: v })}
                  />
                  <FieldInput
                    id="address"
                    label="住所"
                    value={profile.address ?? ''}
                    disabled={!editing}
                    onChange={(v) => updateLocal({ address: v })}
                  />
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          {/* ============ 学歴 =============== */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger asChild>
              <SectionHeader icon={GraduationCap} title="学歴" />
            </CollapsibleTrigger>
            <CollapsibleContent className="animate-accordion-down">
              <Card className="border-t-0">
                <CardContent className="space-y-4 p-4">
                  <FieldInput
                    id="university"
                    label="大学名"
                    value={profile.university ?? ''}
                    disabled={!editing}
                    onChange={(v) => updateLocal({ university: v })}
                  />
                  <FieldInput
                    id="faculty"
                    label="学部"
                    value={profile.faculty ?? ''}
                    disabled={!editing}
                    onChange={(v) => updateLocal({ faculty: v })}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FieldInput
                      id="admission_month"
                      type="month"
                      label="入学年月"
                      value={profile.admission_month ?? ''}
                      disabled={!editing}
                      onChange={(v) => updateLocal({ admission_month: v })}
                    />
                    <FieldInput
                      id="graduation_year"
                      type="number"
                      label="卒業予定年"
                      value={profile.graduation_year ?? ''}
                      disabled={!editing}
                      onChange={(v) => updateLocal({ graduation_year: Number(v) || null })}
                    />
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          {/* ============ スキル =============== */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger asChild>
              <SectionHeader icon={Code} title="スキル" />
            </CollapsibleTrigger>
            <CollapsibleContent className="animate-accordion-down">
              <Card className="border-t-0">
                <CardContent className="space-y-4 p-4">
                  <FieldTextarea
                    id="skill_text"
                    label="スキル"
                    rows={3}
                    value={profile.skill_text ?? ''}
                    disabled={!editing}
                    max={500}
                    placeholder="例: Java, Python, AWS, Figma..."
                    onChange={(v) => updateLocal({ skill_text: v })}
                  />
                  {profile.skill_text && (
                    <TagPreview items={profile.skill_text.split(',')} color="blue" />
                  )}

                  <FieldTextarea
                    id="qualification_text"
                    label="資格"
                    rows={3}
                    value={profile.qualification_text ?? ''}
                    disabled={!editing}
                    max={500}
                    onChange={(v) => updateLocal({ qualification_text: v })}
                  />
                  <FieldTextarea
                    id="language_skill"
                    label="語学力"
                    rows={2}
                    value={profile.language_skill ?? ''}
                    disabled={!editing}
                    max={300}
                    onChange={(v) => updateLocal({ language_skill: v })}
                  />
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        </TabsContent>

        {/* PR ============================================================ */}
        <TabsContent value="pr">
          <Card>
            <CardHeader className="flex gap-2 p-4">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>自己PR</CardTitle>
                <CardDescription>あなたの強みをアピールしましょう</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <FieldTextarea
                id="pr_text"
                label="自己PR"
                rows={8}
                max={800}
                value={profile.pr_text ?? ''}
                disabled={!editing}
                placeholder="具体的なエピソードや成果を数字で示すと効果的です"
                onChange={(v) => updateLocal({ pr_text: v })}
              />

              {/* 強み 3 つ */}
              <div className="space-y-1">
                <Label className="text-xs sm:text-sm">強み（最大3つ）</Label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <FieldInput
                      key={i}
                      id={`strength_${i}`}
                      label={`強み${i}`}
                      value={(profile as any)[`strength_${i}`] ?? ''}
                      disabled={!editing}
                      placeholder="例: 問題解決力"
                      onChange={(v) => updateLocal({ [`strength_${i}`]: v })}
                    />
                  ))}
                </div>
              </div>

              <TipBox />
            </CardContent>
          </Card>
        </TabsContent>

        {/* PREF ========================================================== */}
        <TabsContent value="pref">
          <Card>
            <CardHeader className="flex gap-2 p-4">
              <Target className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>希望条件</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <FieldInput
                id="work_style"
                label="希望勤務形態"
                value={profile.work_style ?? ''}
                disabled={!editing}
                placeholder="正社員 / インターン など"
                onChange={(v) => updateLocal({ work_style: v })}
              />
              <FieldInput
                id="salary_range"
                label="希望年収"
                value={profile.salary_range ?? ''}
                disabled={!editing}
                placeholder="400万〜500万"
                onChange={(v) => updateLocal({ salary_range: v })}
              />

              {/* industries */}
              <FieldInput
                id="desired_industries"
                label="希望業界（カンマ区切り）"
                value={(profile.desired_industries ?? []).join(', ')}
                disabled={!editing}
                onChange={(v) =>
                  updateLocal({
                    desired_industries: v
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
              {profile.desired_industries?.length ? (
                <TagPreview items={profile.desired_industries} color="green" />
              ) : null}

              {/* locations */}
              <FieldInput
                id="desired_locations"
                label="希望勤務地（カンマ区切り）"
                value={(profile.desired_locations ?? []).join(', ')}
                disabled={!editing}
                onChange={(v) =>
                  updateLocal({
                    desired_locations: v
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
              {profile.desired_locations?.length ? (
                <TagPreview items={profile.desired_locations} color="purple" />
              ) : null}

              <FieldTextarea
                id="preference_note"
                label="備考"
                rows={4}
                max={500}
                value={profile.preference_note ?? ''}
                disabled={!editing}
                onChange={(v) => updateLocal({ preference_note: v })}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* sticky save ------------------------------------------------------ */}
      {editing && (
        <footer className="fixed inset-x-0 bottom-0 z-10 border-t bg-white p-4">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Progress value={completionRate} className={`h-2 w-24 ${getBarColor(completionRate)}`} />
              <span className="text-xs sm:text-sm">{completionRate}% 完了</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetLocal} className="h-8 sm:h-10">
                <X size={14} className="mr-1" /> キャンセル
              </Button>
              <Button onClick={handleSave} disabled={saving} className="h-8 sm:h-10">
                {saving ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent mr-1" />
                    保存中
                  </>
                ) : (
                  <>
                    <Save size={14} className="mr-1" /> 保存
                  </>
                )}
              </Button>
            </div>
          </div>
        </footer>
      )}

      {/* toast ------------------------------------------------------------ */}
      {savedToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 rounded bg-green-600 px-3 py-2 text-xs text-white shadow-md">
          保存しました
        </div>
      )}
    </div>
  )
}

/* ===== helper presentational ============================================ */
function SectionHeader({ icon: Icon, title }: { icon: typeof User; title: string }) {
  return (
    <div className="flex cursor-pointer items-center gap-2 rounded-md border bg-muted/50 p-3">
      <Icon className="h-4 w-4 text-primary" />
      <CardTitle className="text-base font-medium">{title}</CardTitle>
      <ChevronUp className="ml-auto h-4 w-4 text-muted-foreground transition-transform data-[state=closed]:rotate-180" />
    </div>
  )
}

function TagPreview({ items, color }: { items: string[]; color: 'blue' | 'green' | 'purple' }) {
  const bg = { blue: 'bg-blue-50', green: 'bg-green-50', purple: 'bg-purple-50' }[color]
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {items.map((t, i) => (
        <Badge key={i} variant="outline" className={`${bg} text-xs`}>
          {t.trim()}
        </Badge>
      ))}
    </div>
  )
}

function TipBox() {
  return (
    <Alert className="bg-blue-50">
      <Info className="h-4 w-4 text-blue-500" />
      <AlertTitle className="text-sm font-medium text-blue-800">自己PRのコツ</AlertTitle>
      <AlertDescription className="text-xs text-blue-700 space-y-1">
        <p>・数字や結果を用いて具体性を出す</p>
        <p>・役割だけでなく、課題⇢行動⇢成果 を示す</p>
      </AlertDescription>
    </Alert>
  )
}
