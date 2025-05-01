"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { Save, Upload, PlusCircle, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

interface StudentProfile {
  id?: string
  first_name?: string
  last_name?: string
  university?: string
  major?: string
  graduation_year?: number
  skills?: string[]
  bio?: string
  resume_url?: string
  avatar_url?: string
}

interface ProfileClientProps {
  initialProfile: StudentProfile
  userId: string
}

export default function ProfileClient({ initialProfile, userId }: ProfileClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [profile, setProfile] = useState<StudentProfile>({
    id: userId,
    first_name: initialProfile.first_name || "",
    last_name: initialProfile.last_name || "",
    university: initialProfile.university || "",
    major: initialProfile.major || "",
    graduation_year: initialProfile.graduation_year || new Date().getFullYear() + 1,
    skills: initialProfile.skills || [],
    bio: initialProfile.bio || "",
    resume_url: initialProfile.resume_url || "",
    avatar_url: initialProfile.avatar_url || "",
  })

  const [newSkill, setNewSkill] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // スキルの追加
  const addSkill = () => {
    if (newSkill.trim() && !profile.skills?.includes(newSkill.trim())) {
      setProfile({
        ...profile,
        skills: [...(profile.skills || []), newSkill.trim()],
      })
      setNewSkill("")
    }
  }

  // スキルの削除
  const removeSkill = (skill: string) => {
    setProfile({
      ...profile,
      skills: profile.skills?.filter((s) => s !== skill) || [],
    })
  }

  // アバター画像のアップロード
  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setIsUploading(true)

      if (!event.target.files || event.target.files.length === 0) {
        return
      }

      const file = event.target.files[0]
      const fileExt = file.name.split(".").pop()
      const filePath = `avatars/${userId}-${Math.random()}.${fileExt}`

      const { error: uploadError } = await supabase.storage.from("profiles").upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      const { data } = supabase.storage.from("profiles").getPublicUrl(filePath)

      setProfile({
        ...profile,
        avatar_url: data.publicUrl,
      })

      toast({
        title: "アップロード完了",
        description: "プロフィール画像がアップロードされました",
      })
    } catch (error) {
      toast({
        title: "エラー",
        description: "画像のアップロードに失敗しました",
        variant: "destructive",
      })
      console.error(error)
    } finally {
      setIsUploading(false)
    }
  }

  // 履歴書のアップロード
  const uploadResume = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setIsUploading(true)

      if (!event.target.files || event.target.files.length === 0) {
        return
      }

      const file = event.target.files[0]
      const fileExt = file.name.split(".").pop()
      const filePath = `resumes/${userId}-${Math.random()}.${fileExt}`

      const { error: uploadError } = await supabase.storage.from("profiles").upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      const { data } = supabase.storage.from("profiles").getPublicUrl(filePath)

      setProfile({
        ...profile,
        resume_url: data.publicUrl,
      })

      toast({
        title: "アップロード完了",
        description: "履歴書がアップロードされました",
      })
    } catch (error) {
      toast({
        title: "エラー",
        description: "履歴書のアップロードに失敗しました",
        variant: "destructive",
      })
      console.error(error)
    } finally {
      setIsUploading(false)
    }
  }

  // プロフィールの保存
  const saveProfile = async () => {
    try {
      setIsSaving(true)

      const { error } = await supabase.from("student_profiles").upsert({
        id: userId,
        first_name: profile.first_name,
        last_name: profile.last_name,
        university: profile.university,
        major: profile.major,
        graduation_year: profile.graduation_year,
        skills: profile.skills,
        bio: profile.bio,
        resume_url: profile.resume_url,
        avatar_url: profile.avatar_url,
        updated_at: new Date().toISOString(),
      })

      if (error) {
        throw error
      }

      toast({
        title: "保存完了",
        description: "プロフィールが更新されました",
      })

      router.refresh()
    } catch (error) {
      toast({
        title: "エラー",
        description: "プロフィールの保存に失敗しました",
        variant: "destructive",
      })
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="container py-8">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">プロフィール編集</h1>
          <p className="text-muted-foreground">あなたのプロフィール情報を入力して、企業にアピールしましょう</p>
        </div>
        <Button onClick={saveProfile} disabled={isSaving} className="gap-2 bg-red-600 hover:bg-red-700">
          <Save className="h-4 w-4" />
          {isSaving ? "保存中..." : "保存する"}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* 左カラム - プロフィール画像と履歴書 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>プロフィール画像</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className="relative mb-4 h-32 w-32 overflow-hidden rounded-full">
                <Image
                  src={profile.avatar_url || "/placeholder.svg?height=128&width=128&query=avatar"}
                  alt="プロフィール画像"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="w-full">
                <Label htmlFor="avatar-upload" className="w-full">
                  <div className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent">
                    <Upload className="h-4 w-4" />
                    画像をアップロード
                  </div>
                </Label>
                <Input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={uploadAvatar}
                  disabled={isUploading}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>履歴書</CardTitle>
              <CardDescription>PDFまたはWordファイルをアップロードしてください</CardDescription>
            </CardHeader>
            <CardContent>
              {profile.resume_url ? (
                <div className="mb-4 rounded-md bg-muted p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">履歴書がアップロードされています</span>
                    <a
                      href={profile.resume_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      表示
                    </a>
                  </div>
                </div>
              ) : (
                <div className="mb-4 rounded-md bg-muted p-3 text-center text-sm text-muted-foreground">
                  履歴書はまだアップロードされていません
                </div>
              )}
              <Label htmlFor="resume-upload" className="w-full">
                <div className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent">
                  <Upload className="h-4 w-4" />
                  履歴書をアップロード
                </div>
              </Label>
              <Input
                id="resume-upload"
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={uploadResume}
                disabled={isUploading}
              />
            </CardContent>
          </Card>
        </div>

        {/* 右カラム - プロフィール情報 */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>基本情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">姓</Label>
                  <Input
                    id="first_name"
                    value={profile.first_name}
                    onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                    placeholder="山田"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">名</Label>
                  <Input
                    id="last_name"
                    value={profile.last_name}
                    onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                    placeholder="太郎"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="university">大学</Label>
                <Input
                  id="university"
                  value={profile.university}
                  onChange={(e) => setProfile({ ...profile, university: e.target.value })}
                  placeholder="〇〇大学"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="major">学部・学科</Label>
                <Input
                  id="major"
                  value={profile.major}
                  onChange={(e) => setProfile({ ...profile, major: e.target.value })}
                  placeholder="〇〇学部△△学科"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="graduation_year">卒業予定年度</Label>
                <Select
                  value={profile.graduation_year?.toString()}
                  onValueChange={(value) => setProfile({ ...profile, graduation_year: Number(value) })}
                >
                  <SelectTrigger id="graduation_year">
                    <SelectValue placeholder="卒業予定年度を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {[...Array(6)].map((_, i) => {
                      const year = new Date().getFullYear() + i
                      return (
                        <SelectItem key={year} value={year.toString()}>
                          {year}年
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">自己紹介</Label>
                <Textarea
                  id="bio"
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  placeholder="自己紹介を入力してください"
                  className="min-h-[120px]"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>スキル</CardTitle>
              <CardDescription>あなたが持っているスキルを追加してください</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-wrap gap-2">
                {profile.skills?.map((skill) => (
                  <div key={skill} className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm">
                    <span>{skill}</span>
                    <button
                      onClick={() => removeSkill(skill)}
                      className="ml-1 rounded-full p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {profile.skills?.length === 0 && (
                  <div className="text-sm text-muted-foreground">スキルが追加されていません</div>
                )}
              </div>

              <div className="flex gap-2">
                <Input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="新しいスキルを追加"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                />
                <Button type="button" onClick={addSkill} className="bg-red-600 hover:bg-red-700">
                  <PlusCircle className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
