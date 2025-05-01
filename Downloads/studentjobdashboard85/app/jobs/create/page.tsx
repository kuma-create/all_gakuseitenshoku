"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

export default function CreateJobPosting() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [isLoading, setIsLoading] = useState(false)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    location: "",
    job_type: "",
    salary_range: "",
    application_deadline: "",
    description: "",
    requirements: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // ログインユーザーの企業IDを取得
  useEffect(() => {
    async function fetchCompanyId() {
      try {
        // ユーザー情報を取得
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
          toast({
            title: "エラー",
            description: "ユーザー情報の取得に失敗しました。再度ログインしてください。",
            variant: "destructive",
          })
          router.push("/auth/signin")
          return
        }

        // ユーザーに紐づく企業情報を取得
        const { data: companyUser, error: companyUserError } = await supabase
          .from("company_users")
          .select("company_id")
          .eq("user_id", user.id)
          .single()

        if (companyUserError || !companyUser) {
          toast({
            title: "エラー",
            description: "企業情報の取得に失敗しました。",
            variant: "destructive",
          })
          return
        }

        setCompanyId(companyUser.company_id)
      } catch (error) {
        console.error("企業ID取得エラー:", error)
        toast({
          title: "エラー",
          description: "企業情報の取得中にエラーが発生しました。",
          variant: "destructive",
        })
      }
    }

    fetchCompanyId()
  }, [supabase, router, toast])

  // フォーム入力の変更を処理
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // 入力があればエラーをクリア
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  // セレクトの変更を処理
  const handleSelectChange = (value: string, name: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))

    // 入力があればエラーをクリア
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  // フォームのバリデーション
  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // 必須項目のチェック
    Object.entries(formData).forEach(([key, value]) => {
      if (!value.trim()) {
        newErrors[key] = "入力必須項目です"
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // フォーム送信処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // バリデーション
    if (!validateForm()) {
      toast({
        title: "入力エラー",
        description: "必須項目をすべて入力してください。",
        variant: "destructive",
      })
      return
    }

    // 企業IDがない場合はエラー
    if (!companyId) {
      toast({
        title: "エラー",
        description: "企業情報が取得できませんでした。再度ログインしてください。",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // 求人データを作成
      const jobData = {
        company_id: companyId,
        title: formData.title,
        location: formData.location,
        job_type: formData.job_type,
        salary_range: formData.salary_range,
        application_deadline: formData.application_deadline,
        description: formData.description,
        requirements: formData.requirements,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // Supabaseに求人データを保存
      const { error } = await supabase.from("job_postings").insert(jobData)

      if (error) {
        throw error
      }

      toast({
        title: "求人を作成しました",
        description: "求人情報が正常に登録されました。",
      })

      // ダッシュボードにリダイレクト
      router.push("/company/dashboard")
      router.refresh()
    } catch (error: any) {
      console.error("求人作成エラー:", error)
      toast({
        title: "エラーが発生しました",
        description: error.message || "求人の作成中にエラーが発生しました。",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">新しい求人を作成</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="title" className="text-base font-medium">
                  募集タイトル <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="例: Webエンジニア、営業担当者など"
                  className={`mt-1 ${errors.title ? "border-red-500" : ""}`}
                />
                {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
              </div>

              <div>
                <Label htmlFor="location" className="text-base font-medium">
                  勤務地 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="例: 東京都渋谷区"
                  className={`mt-1 ${errors.location ? "border-red-500" : ""}`}
                />
                {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location}</p>}
              </div>

              <div>
                <Label htmlFor="job_type" className="text-base font-medium">
                  雇用形態 <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.job_type} onValueChange={(value) => handleSelectChange(value, "job_type")}>
                  <SelectTrigger className={`mt-1 ${errors.job_type ? "border-red-500" : ""}`}>
                    <SelectValue placeholder="雇用形態を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="正社員">正社員</SelectItem>
                    <SelectItem value="契約社員">契約社員</SelectItem>
                    <SelectItem value="インターン">インターン</SelectItem>
                    <SelectItem value="アルバイト">アルバイト</SelectItem>
                  </SelectContent>
                </Select>
                {errors.job_type && <p className="text-red-500 text-sm mt-1">{errors.job_type}</p>}
              </div>

              <div>
                <Label htmlFor="salary_range" className="text-base font-medium">
                  給与範囲 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="salary_range"
                  name="salary_range"
                  value={formData.salary_range}
                  onChange={handleChange}
                  placeholder="例: 400万円〜600万円"
                  className={`mt-1 ${errors.salary_range ? "border-red-500" : ""}`}
                />
                {errors.salary_range && <p className="text-red-500 text-sm mt-1">{errors.salary_range}</p>}
              </div>

              <div>
                <Label htmlFor="application_deadline" className="text-base font-medium">
                  募集締切日 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="application_deadline"
                  name="application_deadline"
                  type="date"
                  value={formData.application_deadline}
                  onChange={handleChange}
                  className={`mt-1 ${errors.application_deadline ? "border-red-500" : ""}`}
                />
                {errors.application_deadline && (
                  <p className="text-red-500 text-sm mt-1">{errors.application_deadline}</p>
                )}
              </div>

              <div>
                <Label htmlFor="description" className="text-base font-medium">
                  募集内容 <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="仕事内容、企業の魅力、求める人物像などを記入してください"
                  className={`mt-1 min-h-[150px] ${errors.description ? "border-red-500" : ""}`}
                />
                {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
              </div>

              <div>
                <Label htmlFor="requirements" className="text-base font-medium">
                  応募条件 <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="requirements"
                  name="requirements"
                  value={formData.requirements}
                  onChange={handleChange}
                  placeholder="必要なスキル、経験、資格などを記入してください"
                  className={`mt-1 min-h-[150px] ${errors.requirements ? "border-red-500" : ""}`}
                />
                {errors.requirements && <p className="text-red-500 text-sm mt-1">{errors.requirements}</p>}
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
                キャンセル
              </Button>
              <Button type="submit" disabled={isLoading} className="bg-red-600 hover:bg-red-700">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    送信中...
                  </>
                ) : (
                  "求人を作成"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
