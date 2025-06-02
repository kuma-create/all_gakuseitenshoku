/* ────────────────────────────────────────────────
   app/student/profile/page.tsx – v3.2 (hook順完全修正版)
─────────────────────────────────────────────── */
"use client"

import { useState, useEffect, useRef, HTMLInputTypeAttribute } from "react"
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
import SkillPicker from "@/components/SkillPicker"
import QualificationPicker from "@/components/QualificationPicker"
import type { Database } from "@/lib/supabase/types"


/* ---------- type patch: extend generated row ---------- */
type StudentProfileRow = Database["public"]["Tables"]["student_profiles"]["Row"] & {
  /** 新カラム: 配列型で追加 */
  skills?: string[] | null
  qualifications?: string[] | null
}

/* ── zod Schema ─────────────────────────────── */
const schema = z.object({
  last_name : z.string().min(1, "姓は必須です"),
  first_name: z.string().min(1, "名は必須です"),
  university: z.string().min(1, "大学名は必須です"),
  faculty   : z.string().min(1, "学部は必須です"),
  pr_text   : z.string().max(800, "自己PRは800文字以内"),
  preferred_industries : z.array(z.string()).default([]).optional(),
  desired_positions    : z.array(z.string()).default([]).optional(),
  desired_locations    : z.array(z.string()).default([]).optional(),
  work_style_options   : z.array(z.string()).default([]).optional(),
  admission_month  : z.string().regex(/^\d{4}-\d{2}$/).optional(),
  graduation_month : z.string().regex(/^\d{4}-\d{2}$/).optional(),
  gender             : z.enum(["male","female","other"]).optional(),
  desired_industries : z.array(z.string()).default([]).optional(),
})


/* ── checkbox master data ───────────────────────────── */
const INDUSTRY_OPTIONS = [
  "IT・通信","メーカー","商社","金融","コンサルティング","マスコミ",
  "広告・マーケティング","サービス","小売・流通","医療・福祉",
  "教育","公務員",
] as const;

const JOB_TYPE_OPTIONS = [
  "エンジニア","営業","企画・マーケティング","コンサルタント","研究・開発",
  "デザイナー","総務・人事","経理・財務","生産管理","品質管理",
  "物流","販売・サービス",
] as const;

const LOCATION_OPTIONS = [
  "東京","神奈川","千葉","埼玉","大阪","京都","兵庫","奈良",
  "愛知","福岡","北海道","宮城","広島","沖縄","海外","リモート可",
] as const;

const WORK_PREF_OPTIONS = [
  "フレックスタイム制","リモートワーク可","副業可","残業少なめ",
  "土日祝休み","有給取得しやすい","育児支援制度あり","研修制度充実",
] as const;

function CheckboxGroup({
  idPrefix,
  options,
  values,
  onChange,
  onSave,
}: {
  idPrefix: string;
  options: readonly string[];
  values: string[];
  onChange: (v: string[]) => void;
  onSave?: () => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 sm:gap-2">
      {options.map((opt) => {
        const checked = values.includes(opt);
        return (
          <div key={opt} className="flex items-center space-x-1 sm:space-x-2">
            <input
              id={`${idPrefix}-${opt}`}
              type="checkbox"
              className="h-3.5 w-3.5 sm:h-4 sm:w-4"
              checked={checked}
              onChange={(e) => {
                const nv = e.target.checked
                  ? [...values, opt]
                  : values.filter((v) => v !== opt);
                onChange(nv);

                /* 保存は 1 フレーム遅らせて、setState → re‑render が完了してから */
                if (onSave) {
                  window.requestAnimationFrame(() => {
                    onSave();
                  });
                }
              }}
            />
            <Label
              htmlFor={`${idPrefix}-${opt}`}
              className="text-xs sm:text-sm"
            >
              {opt}
            </Label>
          </div>
        );
      })}
    </div>
  );
}

/* ── reusable field components ─────────────── */
type FieldInputProps = {
  id: string
  label: string
  value: string | number
  disabled?: boolean
  onChange: (v: string) => void
  onBlur?: () => void
  type?: HTMLInputTypeAttribute
  placeholder?: string
  required?: boolean
  error?: string
  min?: string
  max?: string
}
const FieldInput = ({
  id, label, value, disabled = false, onChange, onBlur,
  type = "text", placeholder, required, error, min, max,
}: FieldInputProps) => (
  <div className="space-y-1">
    <Label htmlFor={id} className="text-xs sm:text-sm">
      {label}{required && <span className="text-red-500">*</span>}
    </Label>
    <Input
      id={id} type={type} disabled={disabled}
      placeholder={placeholder} min={min} max={max} value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
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
  onBlur?: () => void
  rows?: number; max?: number; placeholder?: string; error?: string
}
const FieldTextarea = ({
  id, label, value, disabled = false, onChange, onBlur,
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
      onBlur={onBlur}
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
    data: rawProfile, loading, error, saving,
    updateLocal, save,
  } = useStudentProfile()
  // Cast to the extended type so skills / qualifications are recognized
  const profile = rawProfile as StudentProfileRow
  // dirtyRef, updateMark, handleBlur
  const dirtyRef = useRef(false)

  // 値を変更 → ローカルだけ更新し dirty フラグ
  const updateMark = (partial: Partial<StudentProfileRow>) => {
    updateLocal(partial)
    dirtyRef.current = true
  }

  // フォーカスアウトかナビゲーション時に呼び出し
  const handleBlur = async () => {
    if (!dirtyRef.current) return
    dirtyRef.current = false
    try {
      await save()
    } catch (e: any) {
      toast({
        title: "保存に失敗しました",
        description: e?.message ?? "ネットワークまたはサーバーエラー",
        variant: "destructive",
      })
    }
  }
  // Save before unload / route change
  useEffect(() => {
    const fn = () => {
      if (dirtyRef.current) {
        // fire and forget; cannot await in beforeunload
        save()
      }
    }
    window.addEventListener("beforeunload", fn)
    return () => window.removeEventListener("beforeunload", fn)
  }, [save])
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
    profile.gender,
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
    profile.desired_industries,
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
    <div className="container mx-auto px-4 py-6 sm:py-8 pb-28 md:pb-8">
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
                      onChange={(v) => updateMark({ last_name: v })}
                      onBlur={handleBlur}
                      error={fieldErrs.last_name}
                    />
                    <FieldInput
                      id="first_name"
                      label="名"
                      required
                      value={profile.first_name ?? ''}
                      onChange={(v) => updateMark({ first_name: v })}
                      onBlur={handleBlur}
                      error={fieldErrs.first_name}
                    />
                    <FieldInput
                      id="last_name_kana"
                      label="セイ"
                      value={profile.last_name_kana ?? ''}
                      onChange={(v) => updateMark({ last_name_kana: v })}
                      onBlur={handleBlur}
                    />
                    <FieldInput
                      id="first_name_kana"
                      label="メイ"
                      value={profile.first_name_kana ?? ''}
                      onChange={(v) => updateMark({ first_name_kana: v })}
                      onBlur={handleBlur}
                    />
                  </div>

                  <FieldInput
                    id="phone"
                    label="電話番号"
                    value={profile.phone ?? ''}
                    onChange={(v) => updateMark({ phone: v })}
                    onBlur={handleBlur}
                  />
                  {/* 性別 */}
                  <div className="space-y-1">
                    <Label className="text-xs sm:text-sm">性別</Label>
                    <div className="flex gap-4">
                      {[
                        { key: "male",   label: "男性" },
                        { key: "female", label: "女性" },
                        { key: "other",  label: "その他" },
                      ].map(({ key, label }) => (
                        <label key={key} className="flex items-center gap-1 text-xs sm:text-sm">
                          <input
                            type="radio"
                            name="gender"
                            value={key}
                            checked={profile.gender === key}
                            onChange={() => updateMark({ gender: key })}
                            onBlur={handleBlur}
                            className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                  {/* 住所4項目 */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <FieldInput
                      id="postal_code"
                      label="郵便番号"
                      value={profile.postal_code ?? ''}
                      onChange={(v) => updateMark({ postal_code: v })}
                      onBlur={handleBlur}
                    />
                    <FieldInput
                      id="prefecture"
                      label="都道府県"
                      value={profile.prefecture ?? ''}
                      onChange={(v) => updateMark({ prefecture: v })}
                      onBlur={handleBlur}
                    />
                    <FieldInput
                      id="city"
                      label="市区町村"
                      value={profile.city ?? ''}
                      onChange={(v) => updateMark({ city: v })}
                      onBlur={handleBlur}
                    />
                  </div>
                  <FieldInput
                    id="address_line"
                    label="番地・建物名など"
                    value={profile.address_line ?? ''}
                    onChange={(v) => updateMark({ address_line: v })}
                    onBlur={handleBlur}
                  />
                  <FieldInput
                    id="hometown"
                    label="出身地"
                    value={profile.hometown ?? ''}
                    onChange={(v) => updateMark({ hometown: v })}
                    onBlur={handleBlur}
                  />
                  <FieldInput
                    id="birth_date"
                    type="date"
                    label="生年月日"
                    value={profile.birth_date ?? ''}
                    onChange={(v) => updateMark({ birth_date: v })}
                    onBlur={handleBlur}
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
                    onChange={(v) => updateMark({ university: v })}
                    onBlur={handleBlur}
                    error={fieldErrs.university}
                  />
                  <FieldInput
                    id="faculty"
                    label="学部"
                    value={profile.faculty ?? ''}
                    onChange={(v) => updateMark({ faculty: v })}
                    onBlur={handleBlur}
                    error={fieldErrs.faculty}
                  />
                  <FieldInput
                    id="department"
                    label="学科"
                    value={profile.department ?? ''}
                    onChange={(v) => updateMark({ department: v })}
                    onBlur={handleBlur}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FieldInput
                      id="admission_month"
                      type="month"
                      label="入学年月"
                      value={profile.admission_month?.slice(0, 7) ?? ''}
                      min="2018-01"
                      max="2030-12"
                      onChange={(v) => updateMark({ admission_month: v })}
                      onBlur={handleBlur}
                    />
                    <FieldInput
                      id="graduation_month"
                      type="month"
                      label="卒業予定月"
                      value={profile.graduation_month?.slice(0, 7) ?? ''}
                      min="2018-01"
                      max="2030-12"
                      onChange={(v) => updateMark({ graduation_month: v })}
                      onBlur={handleBlur}
                    />
                  </div>
                  <FieldTextarea
                    id="research_theme"
                    label="研究テーマ"
                    rows={3}
                    value={profile.research_theme ?? ''}
                    max={500}
                    onChange={(v) => updateMark({ research_theme: v })}
                    onBlur={handleBlur}
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
                  <SkillPicker
                    values={profile.skills ?? []}
                    onChange={(vals) => {
                      updateMark({ skills: vals })
                      handleBlur()
                    }}
                  />
                  {(profile.skills?.length ?? 0) > 0 && (
                    <TagPreview items={profile.skills as string[]} color="blue" />
                  )}

                  <QualificationPicker
                    values={profile.qualifications ?? []}
                    onChange={(vals) => {
                      updateMark({ qualifications: vals })
                      handleBlur()
                    }}
                  />
                  {(profile.qualifications?.length ?? 0) > 0 && (
                    <TagPreview items={profile.qualifications as string[]} color="green" />
                  )}
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
                onChange={(v) => updateMark({ pr_title: v })}
                onBlur={handleBlur}
              />
              <FieldTextarea
                id="about"
                label="ひとこと自己紹介"
                rows={2}
                max={200}
                value={profile.about ?? ''}
                placeholder="140文字以内で自己紹介"
                onChange={(v) => updateMark({ about: v })}
                onBlur={handleBlur}
              />
              <FieldTextarea
                id="pr_text"
                label="自己PR"
                rows={10}
                max={800}
                value={profile.pr_text ?? ''}
                placeholder="課題 → 行動 → 成果 の順でエピソードを具体的に記述しましょう"
                onChange={(v) => updateMark({ pr_text: v })}
                onBlur={handleBlur}
                error={fieldErrs.pr_text}
              />

              {/* 強み 3 つ */}
              <div className="space-y-1">
                <Label className="text-xs sm:text-sm">強み（最大3つ）</Label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <FieldInput
                      key={i}
                      id={`strength${i}`}
                      label={`強み${i}`}
                      value={(profile as any)[`strength${i}`] ?? ''}
                      placeholder="例: 問題解決力"
                      onChange={(v) => updateMark({ [`strength${i}`]: v })}
                      onBlur={handleBlur}
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
                onChange={(v) => updateMark({ motive: v })}
                onBlur={handleBlur}
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
                onChange={(v) => updateMark({ work_style: v })}
                onBlur={handleBlur}
              />
              <FieldInput
                id="salary_range"
                label="希望年収"
                value={profile.salary_range ?? ''}
                placeholder="400万〜500万"
                onChange={(v) => updateMark({ salary_range: v })}
                onBlur={handleBlur}
              />

              <FieldInput
                id="employment_type"
                label="雇用形態の希望"
                value={profile.employment_type ?? ''}
                placeholder="正社員 / 契約社員 / インターン"
                onChange={(v) => updateMark({ employment_type: v })}
                onBlur={handleBlur}
              />

              {/* --- 希望職種 --- */}
              <div className="space-y-1 sm:space-y-2">
                <Label className="text-xs sm:text-sm">希望職種</Label>
                <CheckboxGroup
                  idPrefix="job"
                  options={JOB_TYPE_OPTIONS}
                  values={profile.desired_positions ?? []}
                  onChange={(vals) => updateMark({ desired_positions: vals })}
                  onSave={handleBlur}
                />
              </div>

              {/* --- 働き方オプション --- */}
              <div className="space-y-1 sm:space-y-2">
                <Label className="text-xs sm:text-sm">働き方オプション</Label>
                <CheckboxGroup
                  idPrefix="workpref"
                  options={WORK_PREF_OPTIONS}
                  values={profile.work_style_options ?? []}
                  onChange={(vals) => updateMark({ work_style_options: vals })}
                  onSave={handleBlur}
                />
              </div>

              {/* --- 希望業界 --- */}
              <div className="space-y-1 sm:space-y-2">
                <Label className="text-xs sm:text-sm">希望業界</Label>
                <CheckboxGroup
                  idPrefix="desiredindustry"
                  options={INDUSTRY_OPTIONS}
                  values={
                    Array.isArray(profile.preferred_industries)
                      ? profile.preferred_industries.map(String)
                      : []
                  }
                  onChange={(vals) => updateMark({ preferred_industries: vals })}
                  onSave={handleBlur}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="has_internship_experience"
                  type="checkbox"
                  checked={profile.has_internship_experience ?? false}
                  onChange={(e) =>
                    updateMark({ has_internship_experience: e.target.checked })
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
                  updateMark({
                    interests: v.split(',').map((s) => s.trim()).filter(Boolean),
                  })
                }
                onBlur={handleBlur}
              />
              {profile.interests?.length ? (
                <TagPreview items={profile.interests} color="blue" />
              ) : null}

              {/* locations */}
              {/* --- 希望勤務地 --- */}
              <div className="space-y-1 sm:space-y-2">
                <Label className="text-xs sm:text-sm">希望勤務地</Label>
                <CheckboxGroup
                  idPrefix="loc"
                  options={LOCATION_OPTIONS}
                  values={profile.desired_locations ?? []}
                  onChange={(vals) => updateMark({ desired_locations: vals })}
                  onSave={handleBlur}
                />
              </div>

              <FieldTextarea
                id="preference_note"
                label="備考"
                rows={4}
                max={500}
                value={profile.preference_note ?? ''}
                onChange={(v) => updateMark({ preference_note: v })}
                onBlur={handleBlur}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* sticky footer -------------------------------------------------- */}
      <footer className="fixed inset-x-0 bottom-0 z-10 border-t bg-white p-4 md:static md:border-0 md:p-0">
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
