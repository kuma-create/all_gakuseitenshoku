/* ───────────────────────────────────────────────
   app/company/jobs/new/page.tsx
   新規求人作成フォーム ─ Supabase に INSERT する完全版
────────────────────────────────────────────── */
"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Save, MapPin, Calendar, DollarSign,
  Eye, EyeOff, Briefcase, Clock, Building2,
} from "lucide-react"

import { supabase } from "@/lib/supabase/client"      // ★ Supabase クライアント
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export default function NewJobPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [isSaving, setIsSaving] = useState(false)
  const [showSuccessOptions, setShowSuccessOptions] = useState(false)

  const [formData, setFormData] = useState({
    title: "",
    department: "",
    employmentType: "正社員",
    description: "",
    requirements: "",
    location: "",
    workingDays: "",
    workingHours: "",
    salary: "",
    benefits: "",
    applicationDeadline: "",
    startDate: "",
    status: "非公開",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  /* ---------------- 入力ハンドラ ---------------- */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((p) => { const n = { ...p }; delete n[name]; return n })
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((p) => { const n = { ...p }; delete n[name]; return n })
  }

  /* ---------------- バリデーション ---------------- */
  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.title.trim())        newErrors.title        = "求人タイトルを入力してください"
    if (!formData.description.trim())  newErrors.description  = "職務内容を入力してください"
    if (!formData.location.trim())     newErrors.location     = "勤務地を入力してください"
    if (!formData.workingDays.trim())  newErrors.workingDays  = "勤務日を入力してください"
    if (!formData.salary.trim())       newErrors.salary       = "給与を入力してください"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  /* ---------------- 送信 ---------------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) {
      toast({ title: "入力エラー", description: "必須項目をすべて入力してください。", variant: "destructive" })
      return
    }

    setIsSaving(true)

    try {
      /* 0) ログインユーザーを取得 */
      const { data: userData, error: authErr } = await supabase.auth.getUser()
      if (authErr) throw authErr
      const user = userData.user
      if (!user) { toast({ title: "未ログイン", description: "再度ログインしてください", variant: "destructive" }); return }

      /* 1) 自社プロフィール ID を取得 */
      const { data: cp, error: cpErr } = await supabase
        .from("company_profiles")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle()

      if (cpErr) throw cpErr
      if (!cp)   { toast({ title: "会社プロフィールが未登録です", description: "プロフィールを作成してください", variant: "destructive" }); return }

      /* 2) jobs へ INSERT */
      const payload = {
        company_id      : cp.id,
        title           : formData.title,
        description     : formData.description,
        requirements    : formData.requirements || null,
        location        : formData.location || null,
        work_type       : formData.employmentType,
        salary_range    : formData.salary || null,
        published       : formData.status === "公開",
        published_until : formData.applicationDeadline || null,
      } as const

      const { error: insertErr } = await supabase.from("jobs").insert(payload)
      if (insertErr) throw insertErr

      /* 3) 成功 UI */
      toast({ title: "作成完了", description: "新しい求人が作成されました。" })
      setShowSuccessOptions(true)
    } catch (err: any) {
      console.error("Job insert error:", err)
      toast({ title: "エラー", description: err?.message ?? "求人の作成に失敗しました。", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  /* ---------------- JSX ---------------- */
  return (
    <div className="container mx-auto py-8 px-4 pb-24">
      <div className="flex flex-col space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Button variant="outline" onClick={() => router.push("/company/jobs")} className="w-fit">
            <ArrowLeft className="mr-2 h-4 w-4" /> 求人一覧へ戻る
          </Button>
          <h1 className="text-2xl font-bold">新しい求人を作成</h1>
        </div>

        {/* 成功後の選択肢 */}
        {showSuccessOptions ? (
          <SuccessCard
            onBack={() => router.push("/company/jobs")}
            onCreateAnother={() => {
              setFormData({ ...formData, title:"", department:"", description:"", requirements:"", location:"", workingDays:"", workingHours:"", salary:"", benefits:"", applicationDeadline:"", startDate:"", status:"非公開" })
              setShowSuccessOptions(false)
            }}
          />
        ) : (
          /* フォーム本体 */
          <FormBody
            formData={formData}
            errors={errors}
            onInputChange={handleInputChange}
            onSelectChange={handleSelectChange}
            onSubmit={handleSubmit}
            isSaving={isSaving}
          />
        )}
      </div>
    </div>
  )
}

/* ---------------- 切り出しコンポーネント ---------------- */

function SuccessCard({ onBack, onCreateAnother }: { onBack: () => void; onCreateAnother: () => void }) {
  return (
    <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" className="text-green-600 dark:text-green-400">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-medium">求人が作成されました</h3>
            <p className="text-sm text-muted-foreground mt-1">次に何をしますか？</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button variant="outline" onClick={onBack} className="w-full sm:w-auto">求人一覧へ戻る</Button>
            <Button onClick={onCreateAnother} className="w-full sm:w-auto">別の求人を作成</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface FormProps {
  formData: any
  errors: Record<string,string>
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onSelectChange: (name:string,value:string)=>void
  onSubmit: (e: React.FormEvent)=>void
  isSaving: boolean
}

function FormBody({ formData, errors, onInputChange, onSelectChange, onSubmit, isSaving }: FormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* === 基本情報カード === */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            <CardTitle>基本情報</CardTitle>
          </div>
          <CardDescription>求人の基本的な情報を入力してください</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* タイトル */}
          <Field
            id="title"
            label="求人タイトル"
            required
            value={formData.title}
            onChange={onInputChange}
            placeholder="例: フロントエンドエンジニア"
            error={errors.title}
            icon={<></>}
          />

          {/* 部署 + 雇用形態 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field id="department" label="部署" value={formData.department} onChange={onInputChange}
                   placeholder="例: 開発部" icon={<Building2 className="h-4 w-4 text-gray-500" />} />
            <SelectField id="employmentType" label="雇用形態" value={formData.employmentType}
              onValueChange={(v)=>onSelectChange("employmentType",v)}
              items={["正社員","契約社員","パート・アルバイト","インターン","業務委託"]}/>
          </div>

          {/* 職務内容 */}
          <TextareaField id="description" label="職務内容" required value={formData.description}
            onChange={onInputChange} error={errors.description}
            placeholder="職務内容の詳細を記入してください…" minHeight />

          {/* 応募要件 */}
          <TextareaField id="requirements" label="応募要件" value={formData.requirements}
            onChange={onInputChange} placeholder="必須スキル、経験年数 …" />
        </CardContent>
      </Card>

      {/* === 勤務条件カード === */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle>勤務条件</CardTitle>
          </div>
          <CardDescription>勤務地や給与などの条件を入力してください</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field id="location" label="勤務地" required value={formData.location} onChange={onInputChange}
                 placeholder="例: 東京都渋谷区" icon={<MapPin className="h-4 w-4 text-gray-500" />} error={errors.location} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field id="workingDays" label="勤務日" required value={formData.workingDays} onChange={onInputChange}
                   placeholder="例: 月〜金" icon={<Calendar className="h-4 w-4 text-gray-500" />} error={errors.workingDays} />
            <Field id="workingHours" label="勤務時間" value={formData.workingHours} onChange={onInputChange}
                   placeholder="例: 9:00〜18:00" icon={<Clock className="h-4 w-4 text-gray-500" />} />
          </div>

          <Field id="salary" label="給与" required value={formData.salary} onChange={onInputChange}
                 placeholder="例: 年収500万円〜800万円" icon={<DollarSign className="h-4 w-4 text-gray-500" />}
                 error={errors.salary} />

          <TextareaField id="benefits" label="福利厚生" value={formData.benefits} onChange={onInputChange}
            placeholder="社会保険完備、交通費支給…" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field id="applicationDeadline" label="応募締切日" type="date" value={formData.applicationDeadline}
                   onChange={onInputChange} />
            <Field id="startDate" label="勤務開始日" value={formData.startDate}
                   onChange={onInputChange} placeholder="応相談" />
          </div>
        </CardContent>
      </Card>

      {/* === 公開設定カード === */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            <CardTitle>公開設定</CardTitle>
          </div>
          <CardDescription>求人の公開状態を設定してください</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={formData.status} onValueChange={(v)=>onSelectChange("status",v)} className="space-y-3">
            <RadioItem value="公開" label="公開" icon={<Eye className="mr-2 h-4 w-4 text-green-600" />} badge="公開中" badgeClass="bg-green-50 text-green-700 border-green-200" />
            <RadioItem value="非公開" label="非公開" icon={<EyeOff className="mr-2 h-4 w-4 text-gray-500" />} badge="下書き" />
          </RadioGroup>
          <p className="text-sm text-muted-foreground mt-3">
            「公開」を選択すると、すぐに求人が公開されます。「非公開」を選択すると、下書きとして保存されます。
          </p>
        </CardContent>
      </Card>

      {/* === 固定フッター保存ボタン === */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 z-10">
        <div className="container mx-auto flex justify-end">
          <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
            {isSaving
              ? (<><div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />保存中...</>)
              : (<><Save className="mr-2 h-4 w-4" /> 求人を作成</>)}
          </Button>
        </div>
      </div>
    </form>
  )
}

/* ---------------- 汎用フィールド ---------------- */

function Field({
  id, label, required, icon, error, ...inputProps
}: React.ComponentProps<typeof Input> & {
  label: string
  required?: boolean
  icon?: React.ReactNode
  error?: string
}) {
  return (
    <div>
      <Label htmlFor={id} className="flex items-center gap-1">
        {label}{required && <span className="text-red-500">*</span>}
      </Label>
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</span>}
        <Input id={id} {...inputProps} className={`mt-1 ${icon?"pl-10":""} ${error?"border-red-500":""}`} />
      </div>
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  )
}

function TextareaField({...props}: React.ComponentProps<typeof Textarea> & { label:string; required?:boolean; error?:string; minHeight?:boolean }) {
  const { id,label,required,error,minHeight,...rest }=props
  return(
    <div>
      <Label htmlFor={id} className="flex items-center gap-1">
        {label}{required && <span className="text-red-500">*</span>}
      </Label>
      <Textarea id={id} {...rest} className={`mt-1 ${minHeight?"min-h-[150px]":""} ${error?"border-red-500":""}`} />
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  )
}

function SelectField({ id,label,value,onValueChange,items }:{
  id:string;label:string;value:string;onValueChange:(v:string)=>void;items:string[]
}){
  return(
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id={id} className="mt-1">
          <SelectValue placeholder={`${label}を選択`} />
        </SelectTrigger>
        <SelectContent>
          {items.map(i=><SelectItem key={i} value={i}>{i}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}

function RadioItem({ value,label,icon,badge,badgeClass }:{
  value:string;label:string;icon:React.ReactNode;badge:string;badgeClass?:string
}){
  return(
    <div className="flex items-center space-x-3">
      <RadioGroupItem value={value} id={value}/>
      <Label htmlFor={value} className="flex items-center cursor-pointer">
        {icon}{label}
        <Badge variant="outline" className={`ml-2 ${badgeClass??""}`}>{badge}</Badge>
      </Label>
    </div>
  )
}
