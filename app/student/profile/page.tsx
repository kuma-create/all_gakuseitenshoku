"use client"

import { useState, useEffect } from "react"
import {
  User,
  FileText,
  Target,
  Edit,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Code,
  ChevronUp,
  Info,
  Star,
} from "lucide-react"

import { useAuthGuard } from "@/lib/use-auth-guard"
import { useStudentProfile } from "@/lib/hooks/use-student-profile"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default function StudentProfilePage() {
  /* 1) 認証ガード */
  const ready = useAuthGuard("student")

  /* 2) プロフィール共通フック */
  const {
    data: profile,
    loading,
    error,
    saving,
    editing,
    updateLocal,
    save,
    resetLocal,
  } = useStudentProfile()

  /* 3) 表示タブ */
  const [tab, setTab] = useState<"basic" | "pr" | "pref">("basic")

  /* 4) 保存成功状態 */
  const [saveSuccess, setSaveSuccess] = useState(false)

// ① 必須項目が入っているかを判定するヘルパ
function isFilled(value: unknown) {
  if (Array.isArray(value)) return value.length > 0
  return value !== undefined && value !== null && value !== ""
}

// ② セクションごとに「必須」だと思うフィールドを定義
const sectionDone = {
  basic: isFilled(profile.full_name) && isFilled(profile.university) && isFilled(profile.faculty),
  pr:    isFilled(profile.pr_text),
  pref:  isFilled(profile.work_style) && isFilled(profile.salary_range),
}

// ③ 完了率を算出（任意）
const completionRate = Math.round(
  (Number(sectionDone.basic) + Number(sectionDone.pr) + Number(sectionDone.pref)) / 3 * 100,
)

// ④ UI に渡す
const sectionCompletion = {
  basic: sectionDone.basic ? 100 : 30,
  pr:    sectionDone.pr    ? 100 : 20,
  pref:  sectionDone.pref  ? 100 : 40,
}
  /* 6) 保存成功時のフィードバック */
  useEffect(() => {
    if (!saving && saveSuccess) {
      const timer = setTimeout(() => setSaveSuccess(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [saving, saveSuccess])

  /* 7) 保存ハンドラーの拡張 */
  const handleSave = async () => {
    await save()
    setSaveSuccess(true)
  }

  /* ---------- 状態別リターン ---------- */
  if (!ready || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="h-10 w-10 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
          <p className="text-sm text-gray-500">プロフィール情報を読み込み中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>エラーが発生しました</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  /* 完了率バーの色を返す */
  const getCompletionColor = (percentage: number): string => {
    if (percentage < 30) return "bg-red-500"
    if (percentage < 70) return "bg-yellow-500"
    return "bg-green-500"
  }

  /* セクションステータスアイコン */
  const getSectionStatusIcon = (percentage: number) => {
    if (percentage === 100) return <CheckCircle2 size={16} className="text-green-500" />
    if (percentage > 0) return <AlertCircle size={16} className="text-yellow-500" />
    return <AlertCircle size={16} className="text-red-500" />
  }

  /* ---------- 本体 ---------- */
  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      {/* ヘッダーとプログレストラッカー */}
      <div className="mb-6 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 p-4 shadow-sm sm:mb-8 sm:p-6">
        <div className="mb-4 flex flex-col items-start justify-between gap-2 sm:mb-6 sm:flex-row sm:items-center sm:gap-4">
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">マイプロフィール</h1>
            <p className="text-xs text-gray-500 sm:text-sm">あなたの基本情報や希望条件を入力してください</p>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            {editing ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={resetLocal}
                  className="h-8 gap-1 text-xs sm:h-10 sm:gap-2 sm:text-sm"
                >
                  <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> キャンセル
                </Button>
                <Button
                  disabled={saving}
                  onClick={handleSave}
                  className="relative h-8 gap-1 text-xs sm:h-10 sm:gap-2 sm:text-sm"
                >
                  {saving ? (
                    <>
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent sm:h-4 sm:w-4"></div>
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      保存する
                    </>
                  )}

                  {saveSuccess && (
                    <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[10px] text-white">
                      <CheckCircle2 size={10} />
                    </span>
                  )}
                </Button>

                {saveSuccess && (
                  <div className="animate-fade-in rounded-md bg-green-100 px-2 py-1 text-xs text-green-800">
                    保存しました！
                  </div>
                )}
              </div>
            ) : (
              <Button
                onClick={() => updateLocal({ __editing: true })}
                className="h-8 gap-1 text-xs sm:h-10 sm:gap-2 sm:text-sm"
              >
                <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> 編集
              </Button>
            )}
          </div>
        </div>

        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium sm:text-base">プロフィール完成度</h3>
          <span className="text-sm font-semibold">{completionRate}%</span>
        </div>

        <Progress value={completionRate} className={`h-2 ${getCompletionColor(completionRate)}`} />

        <div className="mt-4 grid grid-cols-3 gap-2">
          {(Object.entries(sectionCompletion) as [string, number][]).map(([section, percentage]) => {
            const sectionNames = {
              basic: "基本情報",
              pr: "自己PR",
              pref: "希望条件",
            }
            const sectionIcons = {
              basic: <User className="h-3.5 w-3.5 text-primary" />,
              pr: <FileText className="h-3.5 w-3.5 text-primary" />,
              pref: <Target className="h-3.5 w-3.5 text-primary" />,
            }

            return (
              <div
                key={section}
                className={`flex cursor-pointer items-center justify-between rounded-md border p-2 ${
                  tab === section ? "border-primary bg-primary/5" : "border-gray-200"
                }`}
                onClick={() => setTab(section as any)}
              >
                <div className="flex items-center gap-1.5">
                  {sectionIcons[section as keyof typeof sectionIcons]}
                  <span className="text-xs">{sectionNames[section as keyof typeof sectionNames]}</span>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-medium">{percentage}%</span>
                        {getSectionStatusIcon(percentage)}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        {percentage === 100 ? "完了しています" : percentage > 0 ? "入力中です" : "未入力です"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )
          })}
        </div>
      </div>

      {/* タブコンテンツ */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic" className="flex items-center gap-1 text-xs sm:text-sm">
            <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> 基本情報
          </TabsTrigger>
          <TabsTrigger value="pr" className="flex items-center gap-1 text-xs sm:text-sm">
            <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> 自己PR
          </TabsTrigger>
          <TabsTrigger value="pref" className="flex items-center gap-1 text-xs sm:text-sm">
            <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> 希望条件
          </TabsTrigger>
        </TabsList>

        {/* === 基本情報タブ ===================================== */}
        <TabsContent value="basic" className="space-y-4">
          {/* ---------- Collapsible #1 基本情報 ---------- */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger asChild>
              <div className="flex cursor-pointer items-center gap-2 rounded-md border bg-muted/50 p-3">
                <User className="h-4 w-4 text-primary" />
                <CardTitle className="text-base font-medium">基本情報</CardTitle>
                <ChevronUp className="ml-auto h-4 w-4 text-muted-foreground transition-transform data-[state=closed]:rotate-180" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="animate-accordion-down">
              <Card className="mt-2 border-t-0 pt-0">
                <CardContent className="space-y-4 p-4">
                  {[
                    { id: "full_name", label: "氏名", type: "text" },
                    { id: "phone", label: "電話番号", type: "text" },
                    { id: "address", label: "住所", type: "text" },
                  ].map(({ id, label, type }) => (
                    <div key={id} className="space-y-1">
                      <Label htmlFor={id} className="text-xs sm:text-sm">
                        {label}
                      </Label>
                      <Input
                        id={id}
                        type={type}
                        disabled={!editing}
                        value={(profile as any)[id] ?? ""}
                        onChange={(e) => updateLocal({ [id]: e.target.value })}
                        className="h-8 text-xs sm:h-10 sm:text-sm"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          {/* ---------- Collapsible #2 学歴 ---------- */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger asChild>
              <div className="flex cursor-pointer items-center gap-2 rounded-md border bg-muted/50 p-3">
                <GraduationCap className="h-4 w-4 text-primary" />
                <CardTitle className="text-base font-medium">学歴</CardTitle>
                <ChevronUp className="ml-auto h-4 w-4 text-muted-foreground transition-transform data-[state=closed]:rotate-180" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="animate-accordion-down">
              <Card className="mt-2 border-t-0 pt-0">
                <CardContent className="space-y-4 p-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="university" className="text-xs sm:text-sm">
                        大学名
                      </Label>
                      <Input
                        id="university"
                        type="text"
                        disabled={!editing}
                        value={profile.university ?? ""}
                        onChange={(e) => updateLocal({ university: e.target.value })}
                        className="h-8 text-xs sm:h-10 sm:text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="faculty" className="text-xs sm:text-sm">
                        学部
                      </Label>
                      <Input
                        id="faculty"
                        type="text"
                        disabled={!editing}
                        value={profile.faculty ?? ""}
                        onChange={(e) => updateLocal({ faculty: e.target.value })}
                        className="h-8 text-xs sm:h-10 sm:text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="admission_month" className="text-xs sm:text-sm">
                        入学年月
                      </Label>
                      <Input
                        id="admission_month"
                        type="month"
                        disabled={!editing}
                        value={profile.admission_month ?? ""}
                        onChange={(e) => updateLocal({ admission_month: e.target.value })}
                        className="h-8 text-xs sm:h-10 sm:text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="graduation_year" className="text-xs sm:text-sm">
                        卒業予定年
                      </Label>
                      <Input
                        id="graduation_year"
                        type="number"
                        disabled={!editing}
                        value={profile.graduation_year ?? ""}
                        onChange={(e) =>
                          updateLocal({
                            graduation_year: Number(e.target.value) || null,
                          })
                        }
                        className="h-8 text-xs sm:h-10 sm:text-sm"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          {/* ---------- Collapsible #3 スキル ---------- */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger asChild>
              <div className="flex cursor-pointer items-center gap-2 rounded-md border bg-muted/50 p-3">
                <Code className="h-4 w-4 text-primary" />
                <CardTitle className="text-base font-medium">スキル</CardTitle>
                <ChevronUp className="ml-auto h-4 w-4 text-muted-foreground transition-transform data-[state=closed]:rotate-180" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="animate-accordion-down">
              <Card className="mt-2 border-t-0 pt-0">
                <CardContent className="space-y-4 p-4">
                  {[
                    { id: "qualification_text", label: "資格", rows: 3 },
                    { id: "skill_text", label: "スキル", rows: 3 },
                    { id: "language_skill", label: "語学力", rows: 2 },
                  ].map(({ id, label, rows }) => (
                    <div key={id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={id} className="text-xs sm:text-sm">
                          {label}
                        </Label>
                        <span className="text-xs text-gray-500">{(profile as any)[id]?.length || 0}/500文字</span>
                      </div>
                      <Textarea
                        id={id}
                        rows={rows}
                        disabled={!editing}
                        value={(profile as any)[id] ?? ""}
                        onChange={(e) => updateLocal({ [id]: e.target.value })}
                        className="min-h-[80px] text-xs sm:text-sm"
                        maxLength={500}
                      />
                      {id === "skill_text" && (profile as any)[id] && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(profile as any)[id].split(",").map((skill: string, i: number) => (
                            <Badge key={i} variant="outline" className="bg-blue-50 text-xs">
                              {skill.trim()}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        </TabsContent>

        {/* === 自己PRタブ ======================================= */}
        <TabsContent value="pr">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 p-4">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base sm:text-lg">自己PR</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  あなたの強みや特徴をアピールしてください
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pr_text" className="text-xs sm:text-sm">
                    内容
                  </Label>
                  <span className="text-xs text-gray-500">{profile.pr_text?.length || 0}/800文字</span>
                </div>
                <Textarea
                  id="pr_text"
                  rows={10}
                  disabled={!editing}
                  value={profile.pr_text ?? ""}
                  onChange={(e) => updateLocal({ pr_text: e.target.value })}
                  className="min-h-[150px] text-xs sm:min-h-[200px] sm:text-sm"
                  maxLength={800}
                  placeholder="あなたの強み、特徴、価値観などをアピールしてください"
                />
              </div>

              <Alert className="bg-blue-50">
                <Info className="h-4 w-4 text-blue-500" />
                <AlertTitle className="text-sm font-medium text-blue-800">自己PRのポイント</AlertTitle>
                <AlertDescription className="text-xs text-blue-700">
                  <ul className="list-disc space-y-1 pl-4">
                    <li>具体的なエピソードを交えて説明しましょう</li>
                    <li>数字や成果を用いて客観的に伝えましょう</li>
                    <li>企業が求める人材像に合わせたアピールを心がけましょう</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="space-y-1">
                <Label className="text-xs sm:text-sm">強み（3つまで）</Label>
                <div className="grid grid-cols-1 gap-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <Input
                        placeholder={`強み${i}（例：問題解決能力）`}
                        className="h-8 text-xs sm:h-10 sm:text-sm"
                        disabled={!editing}
                        value={(profile as any)[`strength_${i}`] ?? ""}
                        onChange={(e) => updateLocal({ [`strength_${i}`]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === 希望条件タブ ===================================== */}
        <TabsContent value="pref">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 p-4">
              <Target className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base sm:text-lg">希望条件</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  あなたの希望する就業条件を入力してください
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <div className="space-y-1">
                <Label htmlFor="work_style" className="text-xs sm:text-sm">
                  希望勤務形態
                </Label>
                <Input
                  id="work_style"
                  disabled={!editing}
                  value={profile.work_style ?? ""}
                  onChange={(e) => updateLocal({ work_style: e.target.value })}
                  className="h-8 text-xs sm:h-10 sm:text-sm"
                  placeholder="正社員、契約社員、インターンなど"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="salary_range" className="text-xs sm:text-sm">
                  希望年収
                </Label>
                <Input
                  id="salary_range"
                  disabled={!editing}
                  value={profile.salary_range ?? ""}
                  onChange={(e) => updateLocal({ salary_range: e.target.value })}
                  className="h-8 text-xs sm:h-10 sm:text-sm"
                  placeholder="400万円〜500万円など"
                />
              </div>

              <Separator />

              <div className="space-y-1">
                <Label htmlFor="desired_industries" className="text-xs sm:text-sm">
                  希望業界
                </Label>

                {/* カンマ区切りで入力させる例 -------------- */}
                <Input
                  id="desired_industries"
                  disabled={!editing}
                  value={(profile.desired_industries ?? []).join(", ")}
                  onChange={(e) =>
                    updateLocal({
                      // 文字列 → 配列へ変換してローカルに保存
                      desired_industries: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  className="h-8 text-xs sm:h-10 sm:text-sm"
                  placeholder="IT、金融、メーカー など（カンマ区切り）"
                />

                {/* バッジ表示 -------------------------------- */}
                {profile.desired_industries?.length ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {profile.desired_industries.map((industry, i) => (
                      <Badge key={i} variant="outline" className="bg-green-50 text-xs">
                        {industry}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>


              {/* --- 希望勤務地 ------------------------------- */}
              <div className="space-y-1">
                <Label htmlFor="desired_locations" className="text-xs sm:text-sm">
                  希望勤務地
                </Label>

                {/* カンマ区切り入力 → 配列へ変換してローカルに保持 */}
                <Input
                  id="desired_locations"
                  disabled={!editing}
                  value={(profile.desired_locations ?? []).join(", ")}
                  onChange={(e) =>
                    updateLocal({
                      desired_locations: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  className="h-8 text-xs sm:h-10 sm:text-sm"
                  placeholder="東京、大阪、リモート など（カンマ区切り）"
                />

                {/* 入力済みをバッジ表示 */}
                {profile.desired_locations?.length ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {profile.desired_locations.map((loc, i) => (
                      <Badge key={i} variant="outline" className="bg-purple-50 text-xs">
                        {loc}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="preference_note" className="text-xs sm:text-sm">
                    備考
                  </Label>
                  <span className="text-xs text-gray-500">{profile.preference_note?.length || 0}/500文字</span>
                </div>
                <Textarea
                  id="preference_note"
                  rows={4}
                  disabled={!editing}
                  value={profile.preference_note ?? ""}
                  onChange={(e) => updateLocal({ preference_note: e.target.value })}
                  className="min-h-[100px] text-xs sm:text-sm"
                  maxLength={500}
                  placeholder="その他の希望条件があれば記入してください"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Sticky save button */}
      {editing && (
        <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-gray-200 bg-white p-4">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Progress value={completionRate} className={`h-2 w-24 sm:w-32 ${getCompletionColor(completionRate)}`} />
              <span className="text-xs font-medium sm:text-sm">{completionRate}% 完了</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetLocal} className="h-8 gap-1 text-xs sm:h-10 sm:gap-2 sm:text-sm">
                <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> キャンセル
              </Button>
              <Button onClick={handleSave} disabled={saving} className="h-8 gap-1 text-xs sm:h-10 sm:gap-2 sm:text-sm">
                {saving ? (
                  <>
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent sm:h-4 sm:w-4"></div>
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    保存する
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Spacer to prevent content from being hidden behind the sticky save button */}
      {editing && <div className="h-16"></div>}
    </div>
  )
}
