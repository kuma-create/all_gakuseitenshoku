"use client"

import type React from "react"

import { useState } from "react"
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
import { Loader2, Calendar } from "lucide-react"

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

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [requirements, setRequirements] = useState("")
  const [location, setLocation] = useState(company.location || "")
  const [jobType, setJobType] = useState("full_time")
  const [salaryMin, setSalaryMin] = useState("")
  const [salaryMax, setSalaryMax] = useState("")
  const [applicationDeadline, setApplicationDeadline] = useState("")
  const [isRemote, setIsRemote] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title || !description) {
      toast({
        title: "入力エラー",
        description: "求人タイトルと説明は必須項目です",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // 給与範囲をJSONオブジェクトとして保存
      const salaryRange = {
        min: salaryMin ? Number.parseInt(salaryMin) : null,
        max: salaryMax ? Number.parseInt(salaryMax) : null,
      }

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
      router.push("/company/jobs")
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

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="title" className="text-base">
                求人タイトル <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: Webエンジニア、営業担当者など"
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-base">
                求人詳細 <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="仕事内容、企業の魅力、求める人物像などを記入してください"
                className="mt-1 min-h-[200px]"
                required
              />
            </div>

            <div>
              <Label htmlFor="requirements" className="text-base">
                応募要件
              </Label>
              <Textarea
                id="requirements"
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder="必要なスキル、経験、資格などを記入してください"
                className="mt-1 min-h-[150px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="location" className="text-base">
                  勤務地
                </Label>
                <div className="flex items-center space-x-2 mt-1">
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
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="例: 東京都渋谷区"
                    className="mt-2"
                  />
                )}
              </div>

              <div>
                <Label htmlFor="jobType" className="text-base">
                  雇用形態
                </Label>
                <Select value={jobType} onValueChange={setJobType}>
                  <SelectTrigger id="jobType" className="mt-1">
                    <SelectValue placeholder="雇用形態を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">正社員</SelectItem>
                    <SelectItem value="part_time">アルバイト・パート</SelectItem>
                    <SelectItem value="contract">契約社員</SelectItem>
                    <SelectItem value="internship">インターンシップ</SelectItem>
                    <SelectItem value="other">その他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-base">給与範囲</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Input
                    type="number"
                    value={salaryMin}
                    onChange={(e) => setSalaryMin(e.target.value)}
                    placeholder="最低額"
                    className="w-full"
                  />
                  <span>〜</span>
                  <Input
                    type="number"
                    value={salaryMax}
                    onChange={(e) => setSalaryMax(e.target.value)}
                    placeholder="最高額"
                    className="w-full"
                  />
                  <span>万円</span>
                </div>
              </div>

              <div>
                <Label htmlFor="applicationDeadline" className="text-base">
                  応募締切日
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="applicationDeadline"
                    type="date"
                    value={applicationDeadline}
                    onChange={(e) => setApplicationDeadline(e.target.value)}
                    className="pl-10"
                  />
                  <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="isActive" checked={isActive} onCheckedChange={(checked) => setIsActive(checked === true)} />
              <label
                htmlFor="isActive"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                この求人を公開する
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
              キャンセル
            </Button>
            <Button type="submit" disabled={isSubmitting}>
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
        </form>
      </CardContent>
    </Card>
  )
}
