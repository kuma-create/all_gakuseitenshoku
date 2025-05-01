"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  FileText,
  HelpCircle,
  Loader2,
  MapPin,
  Sparkles,
  Users,
} from "lucide-react"

interface JobCreateFormProps {
  company: {
    id: string
    name: string
    industry: string
    location: string
  }
  userId: string
}

export default function JobCreateForm({ company, userId }: JobCreateFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [activeTab, setActiveTab] = useState("basic")
  const [formProgress, setFormProgress] = useState(0)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [requirements, setRequirements] = useState("")
  const [location, setLocation] = useState(company.location || "")
  const [jobType, setJobType] = useState("正社員")
  const [salaryMin, setSalaryMin] = useState("")
  const [salaryMax, setSalaryMax] = useState("")
  const [applicationDeadline, setApplicationDeadline] = useState("")
  const [isRemote, setIsRemote] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPreview, setShowPreview] = useState(false)

  // フォームの進捗状況を計算
  useEffect(() => {
    const fields = [
      { name: "title", value: title },
      { name: "location", value: isRemote ? "リモート" : location },
      { name: "jobType", value: jobType },
      { name: "salary", value: salaryMin || salaryMax },
      { name: "applicationDeadline", value: applicationDeadline },
      { name: "description", value: description },
      { name: "requirements", value: requirements },
    ]

    const filledFields = fields.filter((field) => field.value).length
    const progress = Math.round((filledFields / fields.length) * 100)
    setFormProgress(progress)
  }, [title, location, jobType, salaryMin, salaryMax, applicationDeadline, description, requirements, isRemote])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // バリデーション
    const newErrors: Record<string, string> = {}
    if (!title) newErrors.title = "求人タイトルを入力してください"
    if (!isRemote && !location) newErrors.location = "勤務地を入力してください"
    if (!jobType) newErrors.jobType = "雇用形態を選択してください"
    if (!salaryMin && !salaryMax) newErrors.salary = "給与範囲を入力してください"
    if (!applicationDeadline) newErrors.applicationDeadline = "募集締切日を入力してください"
    if (!description) newErrors.description = "募集内容を入力してください"
    if (!requirements) newErrors.requirements = "応募条件を入力してください"

    setErrors(newErrors)

    if (Object.keys(newErrors).length > 0) {
      toast({
        title: "入力エラー",
        description: "すべての必須項目を入力してください",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // 給与範囲をフォーマット
      const salaryRange = `${salaryMin ? salaryMin + "万円" : ""}${salaryMin && salaryMax ? "〜" : ""}${
        salaryMax ? salaryMax + "万円" : ""
      }`

      // 求人データを作成
      const jobData = {
        company_id: company.id,
        title,
        description,
        requirements,
        location: isRemote ? "リモート" : location,
        job_type: jobType,
        salary_range: salaryRange,
        application_deadline: applicationDeadline || null,
        is_active: isActive,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: userId,
      }

      // Supabaseに求人データを保存
      const { data, error } = await supabase.from("job_postings").insert(jobData).select()

      if (error) {
        throw error
      }

      toast({
        title: "求人を作成しました",
        description: "求人が正常に作成されました",
      })

      // 求人一覧ページにリダイレクト
      router.push("/company/dashboard")
      router.refresh()
    } catch (error: any) {
      console.error("求人作成エラー:", error)
      toast({
        title: "エラーが発生しました",
        description: error.message || "求人の作成中にエラーが発生しました",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // プレビューを表示するかどうかを切り替える
  const togglePreview = () => {
    setShowPreview(!showPreview)
  }

  return (
    <div className="space-y-6">
      {/* 進捗バー */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">求人情報の完成度</span>
          <span className="text-sm font-medium">{formProgress}%</span>
        </div>
        <Progress value={formProgress} className="h-2" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* メインフォーム */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden border-2 border-gray-100 shadow-md">
            <CardContent className="p-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full rounded-none grid grid-cols-3 bg-gray-50">
                  <TabsTrigger value="basic" className="data-[state=active]:bg-white py-3">
                    <Briefcase className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">基本情報</span>
                  </TabsTrigger>
                  <TabsTrigger value="details" className="data-[state=active]:bg-white py-3">
                    <FileText className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">詳細情報</span>
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="data-[state=active]:bg-white py-3" onClick={togglePreview}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">プレビュー</span>
                  </TabsTrigger>
                </TabsList>

                <form onSubmit={handleSubmit}>
                  {/* 基本情報タブ */}
                  <TabsContent value="basic" className="p-6 space-y-6">
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center mb-1">
                          <Label htmlFor="title" className="text-base font-medium">
                            求人タイトル <span className="text-red-500">*</span>
                          </Label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" className="h-6 w-6 p-0 ml-1">
                                  <HelpCircle className="h-4 w-4 text-gray-400" />
                                  <span className="sr-only">ヒント</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">
                                  学生が検索しやすいキーワードを含��ましょう。例：「Webエンジニア（React/Next.js）」
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <div className="relative">
                          <Briefcase className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                          <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="例: Webエンジニア、営業担当者など"
                            className={`pl-10 ${errors.title ? "border-red-500" : ""}`}
                          />
                        </div>
                        {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
                      </div>

                      <div>
                        <div className="flex items-center mb-1">
                          <Label htmlFor="location" className="text-base font-medium">
                            勤務地 <span className="text-red-500">*</span>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2 mb-2">
                          <Checkbox
                            id="isRemote"
                            checked={isRemote}
                            onCheckedChange={(checked) => setIsRemote(checked === true)}
                          />
                          <label
                            htmlFor="isRemote"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            リモートワーク可
                          </label>
                        </div>
                        {!isRemote && (
                          <div className="relative">
                            <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                            <Input
                              id="location"
                              value={location}
                              onChange={(e) => setLocation(e.target.value)}
                              placeholder="例: 東京都渋谷区"
                              className={`pl-10 ${errors.location ? "border-red-500" : ""}`}
                            />
                          </div>
                        )}
                        {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location}</p>}
                      </div>

                      <div>
                        <Label htmlFor="jobType" className="text-base font-medium mb-1 block">
                          雇用形態 <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <Users className="absolute left-3 top-3 h-5 w-5 text-gray-400 pointer-events-none z-10" />
                          <Select value={jobType} onValueChange={setJobType}>
                            <SelectTrigger id="jobType" className={`pl-10 ${errors.jobType ? "border-red-500" : ""}`}>
                              <SelectValue placeholder="雇用形態を選択" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="正社員">正社員</SelectItem>
                              <SelectItem value="契約社員">契約社員</SelectItem>
                              <SelectItem value="インターン">インターン</SelectItem>
                              <SelectItem value="アルバイト">アルバイト</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {errors.jobType && <p className="text-red-500 text-sm mt-1">{errors.jobType}</p>}
                      </div>

                      <div>
                        <Label className="text-base font-medium mb-1 block">
                          給与範囲 <span className="text-red-500">*</span>
                        </Label>
                        <div className="flex items-center space-x-2">
                          <div className="relative flex-1">
                            <Coins className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                            <Input
                              type="number"
                              value={salaryMin}
                              onChange={(e) => setSalaryMin(e.target.value)}
                              placeholder="最低額"
                              className={`pl-10 ${errors.salary ? "border-red-500" : ""}`}
                            />
                          </div>
                          <span>〜</span>
                          <div className="relative flex-1">
                            <Input
                              type="number"
                              value={salaryMax}
                              onChange={(e) => setSalaryMax(e.target.value)}
                              placeholder="最高額"
                              className={errors.salary ? "border-red-500" : ""}
                            />
                          </div>
                          <span className="whitespace-nowrap">万円/年</span>
                        </div>
                        {errors.salary && <p className="text-red-500 text-sm mt-1">{errors.salary}</p>}
                      </div>

                      <div>
                        <Label htmlFor="applicationDeadline" className="text-base font-medium mb-1 block">
                          応募締切日 <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                          <Input
                            id="applicationDeadline"
                            type="date"
                            value={applicationDeadline}
                            onChange={(e) => setApplicationDeadline(e.target.value)}
                            className={`pl-10 ${errors.applicationDeadline ? "border-red-500" : ""}`}
                          />
                        </div>
                        {errors.applicationDeadline && (
                          <p className="text-red-500 text-sm mt-1">{errors.applicationDeadline}</p>
                        )}
                      </div>

                      <div className="flex justify-end pt-4">
                        <Button
                          type="button"
                          onClick={() => setActiveTab("details")}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          次へ <span className="ml-1">→</span>
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  {/* 詳細情報タブ */}
                  <TabsContent value="details" className="p-6 space-y-6">
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center mb-1">
                          <Label htmlFor="description" className="text-base font-medium">
                            募集内容 <span className="text-red-500">*</span>
                          </Label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" className="h-6 w-6 p-0 ml-1">
                                  <HelpCircle className="h-4 w-4 text-gray-400" />
                                  <span className="sr-only">ヒント</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">
                                  仕事内容、企業の魅力、チームの雰囲気など、具体的に記載すると応募が増えます。
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <Textarea
                          id="description"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="仕事内容、企業の魅力、求める人物像などを記入してください"
                          className={`min-h-[200px] ${errors.description ? "border-red-500" : ""}`}
                        />
                        {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>より詳しく書くと応募率が上がります</span>
                          <span>{description.length}文字</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center mb-1">
                          <Label htmlFor="requirements" className="text-base font-medium">
                            応募条件 <span className="text-red-500">*</span>
                          </Label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" className="h-6 w-6 p-0 ml-1">
                                  <HelpCircle className="h-4 w-4 text-gray-400" />
                                  <span className="sr-only">ヒント</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">
                                  必須スキルと歓迎スキルを分けて書くと、応募者のミスマッチを減らせます。
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <Textarea
                          id="requirements"
                          value={requirements}
                          onChange={(e) => setRequirements(e.target.value)}
                          placeholder="必要なスキル、経験、資格などを記入してください"
                          className={`min-h-[150px] ${errors.requirements ? "border-red-500" : ""}`}
                        />
                        {errors.requirements && <p className="text-red-500 text-sm mt-1">{errors.requirements}</p>}
                      </div>

                      <div className="flex items-center space-x-2 pt-2">
                        <Checkbox
                          id="isActive"
                          checked={isActive}
                          onCheckedChange={(checked) => setIsActive(checked === true)}
                        />
                        <label
                          htmlFor="isActive"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          この求人を公開する（チェックを外すと下書き保存されます）
                        </label>
                      </div>

                      <div className="flex justify-between pt-4">
                        <Button type="button" variant="outline" onClick={() => setActiveTab("basic")}>
                          <span className="mr-1">←</span> 戻る
                        </Button>
                        <div className="space-x-2">
                          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                            キャンセル
                          </Button>
                          <Button type="submit" disabled={isSubmitting} className="bg-red-600 hover:bg-red-700">
                            {isSubmitting ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                保存中...
                              </>
                            ) : (
                              "求人を作成"
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* プレビュータブ */}
                  <TabsContent value="preview" className="p-6">
                    <div className="bg-white rounded-lg border p-6 space-y-6">
                      <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-gray-900">{title || "（求人タイトル未入力）"}</h2>
                        <div className="flex flex-wrap gap-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {company.name}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {jobType}
                          </span>
                          {isRemote ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <MapPin className="mr-1 h-3 w-3" />
                              リモート
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              <MapPin className="mr-1 h-3 w-3" />
                              {location || "（勤務地未入力）"}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <Building2 className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">会社名</p>
                            <p className="font-medium">{company.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Coins className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">給与</p>
                            <p className="font-medium">
                              {salaryMin || salaryMax
                                ? `${salaryMin ? salaryMin + "万円" : ""}${
                                    salaryMin && salaryMax ? "〜" : ""
                                  }${salaryMax ? salaryMax + "万円" : ""}/年`
                                : "（給与未入力）"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">応募締切</p>
                            <p className="font-medium">
                              {applicationDeadline
                                ? new Date(applicationDeadline).toLocaleDateString("ja-JP", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  })
                                : "（締切日未入力）"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Users className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">雇用形態</p>
                            <p className="font-medium">{jobType}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-semibold flex items-center">
                            <FileText className="mr-2 h-5 w-5 text-red-500" />
                            募集内容
                          </h3>
                          <div className="mt-2 text-gray-700 whitespace-pre-line">
                            {description || "（募集内容未入力）"}
                          </div>
                        </div>

                        <div>
                          <h3 className="text-lg font-semibold flex items-center">
                            <CheckCircle2 className="mr-2 h-5 w-5 text-red-500" />
                            応募条件
                          </h3>
                          <div className="mt-2 text-gray-700 whitespace-pre-line">
                            {requirements || "（応募条件未入力）"}
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 flex justify-between">
                        <Button type="button" variant="outline" onClick={() => setActiveTab("details")}>
                          <span className="mr-1">←</span> 編集に戻る
                        </Button>
                        <Button type="submit" disabled={isSubmitting} className="bg-red-600 hover:bg-red-700">
                          {isSubmitting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              保存中...
                            </>
                          ) : (
                            "求人を作成"
                          )}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </form>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* サイドバー：ヒントとプレビュー */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-2 border-gray-100 shadow-md">
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold mb-3 flex items-center">
                <Sparkles className="mr-2 h-5 w-5 text-red-500" />
                求人作成のヒント
              </h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 mt-0.5 shrink-0" />
                  <span>
                    <strong>具体的なタイトル</strong>
                    ：「Webエンジニア」より「React/Next.jsエンジニア」の方が適切な応募者が集まります
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 mt-0.5 shrink-0" />
                  <span>
                    <strong>詳細な仕事内容</strong>：具体的なプロジェクトや使用技術を記載すると、ミスマッチが減ります
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 mt-0.5 shrink-0" />
                  <span>
                    <strong>企業の魅力</strong>：社風や成長機会について記載すると、学生の興味を引きます
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 mt-0.5 shrink-0" />
                  <span>
                    <strong>明確な応募条件</strong>：必須スキルと歓迎スキルを分けて記載すると良いでしょう
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-100 shadow-md">
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold mb-3 flex items-center">
                <FileText className="mr-2 h-5 w-5 text-red-500" />
                完成度チェック
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">タイトルの魅力度</span>
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-2 w-6 ${
                          i < (title.length > 5 ? (title.length > 15 ? 5 : 3) : 1) ? "bg-red-500" : "bg-gray-200"
                        } ${i > 0 ? "ml-0.5" : ""}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">募集内容の詳細度</span>
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-2 w-6 ${
                          i < (description.length > 50 ? (description.length > 200 ? 5 : 3) : 1)
                            ? "bg-red-500"
                            : "bg-gray-200"
                        } ${i > 0 ? "ml-0.5" : ""}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">応募条件の明確さ</span>
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-2 w-6 ${
                          i < (requirements.length > 30 ? (requirements.length > 150 ? 5 : 3) : 1)
                            ? "bg-red-500"
                            : "bg-gray-200"
                        } ${i > 0 ? "ml-0.5" : ""}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
