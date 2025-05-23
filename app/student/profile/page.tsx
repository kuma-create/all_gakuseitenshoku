/* ────────────────────────────────────────────────
   app/student/profile/page.tsx – v3.2 (hook順完全修正版)
─────────────────────────────────────────────── */
"use client"

import { useState, useEffect, HTMLInputTypeAttribute } from "react"
import {
  User, FileText, Target, Edit, Save, X, CheckCircle2, AlertCircle,
  GraduationCap, Code, ChevronUp, Info, Loader2,
} from "lucide-react"
import { z } from "zod"
import { toast } from "@/components/ui/use-toast"

/* ---------- hooks ---------- */
import { useAuthGuard }        from "@/lib/use-auth-guard"
import { useStudentProfile }   from "@/lib/hooks/use-student-profile"
import { useProfileCompletion } from "@/lib/hooks/useProfileCompletion"

/* ---------- UI ---------- */
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card"
import { Tabs, TabsList, TabsContent } from "@/components/ui/tabs"
import {
  Collapsible, CollapsibleTrigger, CollapsibleContent,
} from "@/components/ui/collapsible"
import { Button }   from "@/components/ui/button"
import { Badge }    from "@/components/ui/badge"
import { Input }    from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label }    from "@/components/ui/label"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"

/* ── zod Schema ─────────────────────────────── */
const schema = z.object({
  last_name : z.string().min(1, "姓は必須です"),
  first_name: z.string().min(1, "名は必須です"),
  university: z.string().min(1, "大学名は必須です"),
  faculty   : z.string().min(1, "学部は必須です"),
  pr_text   : z.string().max(800, "自己PRは800文字以内"),
})

/* ── reusable field components ─────────────── */
type FieldInputProps = {
  id: string
  label: string
  value: string | number
  disabled?: boolean
  onChange: (v: string) => void
  type?: HTMLInputTypeAttribute
  placeholder?: string
  required?: boolean
  error?: string
}
const FieldInput = ({
  id, label, value, disabled = false, onChange,
  type = "text", placeholder, required, error,
}: FieldInputProps) => (
  <div className="space-y-1">
    <Label htmlFor={id} className="text-xs sm:text-sm">
      {label}{required && <span className="text-red-500">*</span>}
    </Label>
    <Input
      id={id} type={type} disabled={disabled}
      placeholder={placeholder} value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-8 text-xs sm:h-10 sm:text-sm ${error ? "border-red-500" : ""} ${
        value ? "text-gray-900 font-medium" : ""
      } placeholder:text-gray-400`}
    />
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
)

type FieldTextareaProps = {
  id: string; label: string; value: string
  disabled?: boolean; onChange: (v: string) => void
  rows?: number; max?: number; placeholder?: string; error?: string
}
const FieldTextarea = ({
  id, label, value, disabled = false, onChange,
  rows = 4, max, placeholder, error,
}: FieldTextareaProps) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between">
      <Label htmlFor={id} className="text-xs sm:text-sm">{label}</Label>
      {max && <span className="text-xs text-gray-500">{value.length}/{max}文字</span>}
    </div>
    <Textarea
      id={id} rows={rows} maxLength={max} disabled={disabled}
      placeholder={placeholder} value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`text-xs sm:text-sm ${error ? "border-red-500" : ""} ${
        value ? "text-gray-900 font-medium" : ""
      } placeholder:text-gray-400`}
    />
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
)

/* ---------- 型 ---------- */
type FormValues = z.infer<typeof schema>

/* ====================================================================== */
export default function StudentProfilePage() {
  /* 🚩 1) すべてのフックを **無条件で先頭** で呼ぶ */
  const ready = useAuthGuard("student")
  const {
    data: profile, loading, error, saving,
    updateLocal, save,
  } = useStudentProfile()
  // 入力値を更新しつつ即保存するユーティリティ
  const updateAndSave = (partial: Partial<typeof profile>) => {
    updateLocal(partial);
    void save();                      // 失敗時は既存 toast が catch
  };
  const completionObj = useProfileCompletion()               // null | { score: number }

  /* ↓ ローカル UI 用フックも guard の前に置く ↓ */
  const [tab, setTab] = useState<"basic" | "pr" | "pref">("basic")
  const [fieldErrs, setFieldErrs] =
    useState<Partial<Record<keyof FormValues, string>>>({})

  /* ── required keys per tab (saving scope) ─────────────────────────── */
  const TAB_REQUIRED: Record<typeof tab, (keyof FormValues)[]> = {
    basic: ['last_name', 'first_name', 'university', 'faculty'],
    pr   : ['pr_text'],
    pref : [],
  };

  const handleSave = async () => {
    /* 1) フロントバリデーション（現在タブのみ） ----------- */
    const parsed = schema.safeParse(profile);
    if (!parsed.success) {
      const reqKeys   = TAB_REQUIRED[tab];
      const errs: typeof fieldErrs = {};
      parsed.error.errors
        .filter(e => reqKeys.includes(e.path[0] as keyof FormValues))
        .forEach(e => {
          errs[e.path[0] as keyof FormValues] = e.message;
        });

      if (Object.keys(errs).length) {
        setFieldErrs(errs);
        toast({
          title: "入力エラーがあります",
          description: Object.values(errs).join(" / "),
          variant: "destructive",
        });
        return;
      }
    }
    /* エラーなし or 他タブのみ → クリア */
    setFieldErrs({});

    /* 2) 保存実行 ----------------------------------------- */
    try {
      // まず DB にコミット
      await save()

      // 成功トースト
      toast({
        title: "保存しました",
        variant: "default",
      })
    } catch (err: any) {
      toast({
        title: "保存に失敗しました",
        description: err?.message ?? "ネットワークまたはサーバーエラー",
        variant: "destructive",
      })
      console.error("profile save error:", err)
    }
  }


  /* 🚩 2) guard はフック呼び出しの **後ろ** なので常に同数のフック */
  if (!ready || loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
        読み込み中…
      </div>
    )
  }
  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center text-red-600">
        {error.message}
      </div>
    )
  }

  /* 3) 完成度などの派生値 ---------------------------------------- */

  const isFilled = (v: unknown) =>
    Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && v !== ""

  /* ── section completeness ── */
  const basicList = [
    profile.last_name,
    profile.first_name,
    profile.postal_code,
    profile.prefecture,
    profile.city,
    profile.address_line,
    profile.birth_date,
  ]
  const prList = [
    profile.pr_title,
    profile.pr_text,
    profile.about,
  ]
  const prefList = [
    profile.employment_type,
    profile.desired_positions,
    profile.work_style,
  ]

  const pct = (arr: unknown[]) =>
    Math.round((arr.filter(isFilled).length / arr.length) * 100)

  const sectionPct = {
    basic: pct(basicList),
    pr: pct(prList),
    pref: pct(prefList),
  }

  /* ── section error flags ───────────────────────────── */
  const sectionError = {
    basic: ['last_name', 'first_name', 'university', 'faculty']
      .some(k => !!fieldErrs[k as keyof FormValues]),
    pr   : ['pr_text']
      .some(k => !!fieldErrs[k as keyof FormValues]),
    pref : false, // 現状必須チェックなし
  } as const;

  /* overall completion: simple average of three sections */
  const completionScore = Math.round(
    (sectionPct.basic + sectionPct.pr + sectionPct.pref) / 3
  )

  /* 4) helpers */
  const getBarColor = (pct: number) =>
    pct < 30 ? "bg-red-500"
    : pct < 70 ? "bg-yellow-500"
    :            "bg-green-500"

  const Status = ({ pct }: { pct: number }) =>
    pct === 100
      ? <CheckCircle2 size={14} className="text-green-600" />
      : <AlertCircle size={14} className={pct ? "text-yellow-600" : "text-red-600"} />



  /* ================= RENDER ========================================== */
  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 pb-36">
      {/* ---------- header ---------- */}
      <div className="mb-6 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 p-4 shadow-sm sm:mb-8 sm:p-6">
        <div className="mb-4 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">マイプロフィール</h1>
            <p className="text-xs text-gray-500 sm:text-sm">
              学生情報を入力・更新してスカウト率を高めましょう
            </p>
          </div>

        </div>

        {/* progress */}
        <div className="mb-2 flex items-center justify-between text-sm">
          <span>プロフィール完成度</span>
          <span className="font-semibold">{completionScore}%</span>
        </div>
        <div className="h-2 w-full rounded bg-gray-200">
          <div
            className={`h-full rounded ${getBarColor(completionScore)}`}
            style={{ width: `${completionScore}%` }}
          />
        </div>

        {/* section chips */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {(['basic', 'pr', 'pref'] as const).map((s) => {
            const pct = sectionPct[s];
            const names = { basic: '基本情報', pr: '自己PR', pref: '希望条件' };
            const icons = {
              basic: <User size={14} />, pr: <FileText size={14} />, pref: <Target size={14} />,
            };
            return (
              <button
                key={s}
                className={`flex items-center justify-between rounded-md border p-2 text-xs ${
                  tab === s ? 'border-primary bg-primary/5' : 'border-gray-200'
                } ${sectionError[s] ? 'border-red-500 text-red-600' : ''}`}
                onClick={() => setTab(s)}
              >
                <span className="flex items-center gap-1 text-muted-foreground">
                  {icons[s]} {names[s]}
                </span>
                <span className={`flex items-center gap-1 ${sectionError[s] && 'text-red-600'}`}>
                  {pct}% <Status pct={pct} />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------- tabs ---------- */}
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
                      onChange={(v) => updateAndSave({ last_name: v })}
                      error={fieldErrs.last_name}
                    />
                    <FieldInput
                      id="first_name"
                      label="名"
                      required
                      value={profile.first_name ?? ''}
                      onChange={(v) => updateAndSave({ first_name: v })}
                      error={fieldErrs.first_name}
                    />
                    <FieldInput
                      id="last_name_kana"
                      label="セイ"
                      value={profile.last_name_kana ?? ''}
                      onChange={(v) => updateAndSave({ last_name_kana: v })}
                    />
                    <FieldInput
                      id="first_name_kana"
                      label="メイ"
                      value={profile.first_name_kana ?? ''}
                      onChange={(v) => updateAndSave({ first_name_kana: v })}
                    />
                  </div>

                  <FieldInput
                    id="phone"
                    label="電話番号"
                    value={profile.phone ?? ''}
                    onChange={(v) => updateAndSave({ phone: v })}
                  />
                  {/* 住所4項目 */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <FieldInput
                      id="postal_code"
                      label="郵便番号"
                      value={profile.postal_code ?? ''}
                      onChange={(v) => updateAndSave({ postal_code: v })}
                    />
                    <FieldInput
                      id="prefecture"
                      label="都道府県"
                      value={profile.prefecture ?? ''}
                      onChange={(v) => updateAndSave({ prefecture: v })}
                    />
                    <FieldInput
                      id="city"
                      label="市区町村"
                      value={profile.city ?? ''}
                      onChange={(v) => updateAndSave({ city: v })}
                    />
                  </div>
                  <FieldInput
                    id="address_line"
                    label="番地・建物名など"
                    value={profile.address_line ?? ''}
                    onChange={(v) => updateAndSave({ address_line: v })}
                  />
                  <FieldInput
                    id="hometown"
                    label="出身地"
                    value={profile.hometown ?? ''}
                    onChange={(v) => updateAndSave({ hometown: v })}
                  />
                  <FieldInput
                    id="birth_date"
                    type="date"
                    label="生年月日"
                    value={profile.birth_date ?? ''}
                    onChange={(v) => updateAndSave({ birth_date: v })}
                    placeholder="YYYY-MM-DD"
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
                    onChange={(v) => updateAndSave({ university: v })}
                    error={fieldErrs.university}
                  />
                  <FieldInput
                    id="faculty"
                    label="学部"
                    value={profile.faculty ?? ''}
                    onChange={(v) => updateAndSave({ faculty: v })}
                    error={fieldErrs.faculty}
                  />
                  <FieldInput
                    id="department"
                    label="学科"
                    value={profile.department ?? ''}
                    onChange={(v) => updateAndSave({ department: v })}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FieldInput
                      id="admission_month"
                      type="month"
                      label="入学年月"
                      value={profile.admission_month ?? ''}
                      onChange={(v) => updateAndSave({ admission_month: v })}
                    />
                    <FieldInput
                      id="graduation_year"
                      type="number"
                      label="卒業予定年"
                      value={profile.graduation_year ?? ''}
                      onChange={(v) => updateAndSave({ graduation_year: Number(v) || null })}
                    />
                  </div>
                  <FieldInput
                    id="graduation_month"
                    type="month"
                    label="卒業予定月"
                    value={profile.graduation_month ?? ''}
                    onChange={(v) => updateAndSave({ graduation_month: v })}
                  />
                  <FieldTextarea
                    id="research_theme"
                    label="研究テーマ"
                    rows={3}
                    value={profile.research_theme ?? ''}
                    max={500}
                    onChange={(v) => updateAndSave({ research_theme: v })}
                  />
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
                    max={500}
                    placeholder="例: Java, Python, AWS, Figma..."
                    onChange={(v) => updateAndSave({ skill_text: v })}
                  />
                  {profile.skill_text && (
                    <TagPreview items={profile.skill_text.split(',')} color="blue" />
                  )}

                  <FieldTextarea
                    id="qualification_text"
                    label="資格"
                    rows={3}
                    value={profile.qualification_text ?? ''}
                    max={500}
                    onChange={(v) => updateAndSave({ qualification_text: v })}
                  />
                  <FieldTextarea
                    id="language_skill"
                    label="語学力"
                    rows={2}
                    value={profile.language_skill ?? ''}
                    max={300}
                    onChange={(v) => updateAndSave({ language_skill: v })}
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
              <FieldInput
                id="pr_title"
                label="PR タイトル"
                value={profile.pr_title ?? ''}
                onChange={(v) => updateAndSave({ pr_title: v })}
              />
              <FieldTextarea
                id="about"
                label="ひとこと自己紹介"
                rows={2}
                max={200}
                value={profile.about ?? ''}
                placeholder="140文字以内で自己紹介"
                onChange={(v) => updateAndSave({ about: v })}
              />
              <FieldTextarea
                id="pr_text"
                label="自己PR"
                rows={8}
                max={800}
                value={profile.pr_text ?? ''}
                placeholder="具体的なエピソードや成果を数字で示すと効果的です"
                onChange={(v) => updateAndSave({ pr_text: v })}
                error={fieldErrs.pr_text}
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
                      placeholder="例: 問題解決力"
                      onChange={(v) => updateAndSave({ [`strength_${i}`]: v })}
                    />
                  ))}
                </div>
              </div>

              <FieldTextarea
                id="motive"
                label="志望動機"
                rows={4}
                max={600}
                value={profile.motive ?? ''}
                onChange={(v) => updateAndSave({ motive: v })}
              />
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
                placeholder="正社員 / インターン など"
                onChange={(v) => updateAndSave({ work_style: v })}
              />
              <FieldInput
                id="salary_range"
                label="希望年収"
                value={profile.salary_range ?? ''}
                placeholder="400万〜500万"
                onChange={(v) => updateAndSave({ salary_range: v })}
              />

              <FieldInput
                id="employment_type"
                label="雇用形態の希望"
                value={profile.employment_type ?? ''}
                placeholder="正社員 / 契約社員 / インターン"
                onChange={(v) => updateAndSave({ employment_type: v })}
              />

              <FieldInput
                id="desired_positions"
                label="希望ポジション（カンマ区切り）"
                value={(profile.desired_positions ?? []).join(', ')}
                onChange={(v) =>
                  updateAndSave({
                    desired_positions: v.split(',').map((s) => s.trim()).filter(Boolean),
                  })
                }
              />
              {profile.desired_positions?.length ? (
                <TagPreview items={profile.desired_positions} color="blue" />
              ) : null}

              <FieldInput
                id="work_style_options"
                label="働き方オプション（カンマ区切り）"
                value={(profile.work_style_options ?? []).join(', ')}
                placeholder="リモート可, フレックス など"
                onChange={(v) =>
                  updateAndSave({
                    work_style_options: v.split(',').map((s) => s.trim()).filter(Boolean),
                  })
                }
              />
              {profile.work_style_options?.length ? (
                <TagPreview items={profile.work_style_options} color="purple" />
              ) : null}

              <FieldInput
                id="preferred_industries"
                label="興味業界（カンマ区切り）"
                value={
                  Array.isArray(profile.preferred_industries)
                    ? profile.preferred_industries.map(String).join(", ")
                    : typeof profile.preferred_industries === "string"
                    ? profile.preferred_industries
                    : ""
                }
                onChange={(v) =>
                  updateAndSave({
                    preferred_industries: v
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
              {Array.isArray(profile.preferred_industries) &&
              profile.preferred_industries.length ? (
                <TagPreview
                  items={profile.preferred_industries.map(String)}
                  color="green"
                />
              ) : null}

              <div className="flex items-center gap-2">
                <input
                  id="has_internship_experience"
                  type="checkbox"
                  checked={profile.has_internship_experience ?? false}
                  onChange={(e) =>
                    updateAndSave({ has_internship_experience: e.target.checked })
                  }
                  className="h-4 w-4"
                />
                <Label htmlFor="has_internship_experience" className="text-xs sm:text-sm">
                  インターン経験あり
                </Label>
              </div>

              <FieldInput
                id="interests"
                label="興味・関心（カンマ区切り）"
                value={(profile.interests ?? []).join(', ')}
                onChange={(v) =>
                  updateAndSave({
                    interests: v.split(',').map((s) => s.trim()).filter(Boolean),
                  })
                }
              />
              {profile.interests?.length ? (
                <TagPreview items={profile.interests} color="blue" />
              ) : null}

              {/* locations */}
              <FieldInput
                id="desired_locations"
                label="希望勤務地（カンマ区切り）"
                value={(profile.desired_locations ?? []).join(', ')}
                onChange={(v) =>
                  updateAndSave({
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
                onChange={(v) => updateAndSave({ preference_note: v })}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* sticky footer -------------------------------------------------- */}
      <footer className="fixed inset-x-0 bottom-0 z-10 border-t bg-white p-4">
        <div className="container mx-auto flex items-center gap-2">
          <span className="text-xs sm:text-sm">完成度 {completionScore}%</span>
          <div className="h-1 w-24 rounded bg-gray-200">
            <div
              className={`h-full rounded ${getBarColor(completionScore)}`}
              style={{ width: `${completionScore}%` }}
            />
          </div>
          <span className="ml-auto text-xs text-gray-500">自動保存</span>
        </div>
      </footer>

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
