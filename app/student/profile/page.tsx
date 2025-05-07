/* ──────────────────────────────────────────────────────────
   app/student/profile/page.tsx
   - 基本情報 & 自己PR を Supabase で CRUD
   - 行が存在しない場合は INSERT して自動作成
───────────────────────────────────────────────────────── */
"use client"

import { useEffect, useState } from "react"
import {
  Edit,
  Save,
  X,
  User,
  Info,
  Loader2,
} from "lucide-react"

import { supabase } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/types"

import { useAuthGuard } from "@/lib/use-auth-guard"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

/* ---------- 型 ---------- */
type StudentProfile =
  Database["public"]["Tables"]["student_profiles"]["Row"]

/* ---------- 空プロフィール ---------- */
const emptyProfile: StudentProfile = {
  id: "",
  user_id: "",
  /* 基本 */
  full_name: "",
  last_name: "",
  first_name: "",
  last_name_kana: "",
  first_name_kana: "",
  birth_date: null,
  gender: null,
  phone: "",
  email: null,
  address: "",
  /* 学歴 */
  university: "",
  faculty: "",
  department: null,
  admission_month: null,
  graduation_month: null,
  graduation_year: null,
  enrollment_status: null,
  research_theme: "",
  /* スキル・資格 */
  qualification_text: "",
  skill_text: "",
  language_skill: "",
  framework_lib: "",
  dev_tools: "",
  skills: null,
  /* 自己 PR */
  pr_title: "",
  pr_body: "",
  strength1: "",
  strength2: "",
  strength3: "",
  motive: "",
  pr_text: "",
  /* 希望条件 */
  desired_industries: null,
  desired_positions:  null,
  desired_locations:  null,
  work_style:         null,
  employment_type:    null,
  salary_range:       null,
  work_style_options: null,
  preference_note:    "",
  /* その他 */
  profile_image: null,
  created_at:    null,
}

export default function StudentProfilePage() {
  /* 認証チェック */
  const ready = useAuthGuard("student")
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const [profile,       setProfile]       = useState<StudentProfile>(emptyProfile)
  const [isEditing,     setIsEditing]     = useState(false)
  const [editedProfile, setEditedProfile] = useState<StudentProfile>(emptyProfile)

  /* ------------------------ 取得 ------------------------ */
  useEffect(() => {
    if (!ready) return

    ;(async () => {
      setLoading(true)
      setError(null)

      try {
        const {
          data: { user },
          error: authErr,
        } = await supabase.auth.getUser()
        if (authErr || !user) throw new Error("認証情報を取得できませんでした")

        /* 自分のプロフィール 1 行を取得 */
        const { data, error } = await supabase
          .from("student_profiles")
          .select("*")
          .eq("user_id", user.id)
          .single()

        let prof: StudentProfile
        if (error && error.code === "PGRST116") {
          /* 行が無ければ作成 */
          const { data: inserted, error: insErr } = await supabase
            .from("student_profiles")
            .insert({ user_id: user.id, full_name: user.email ?? "" })
            .select()
            .single()
          if (insErr || !inserted) throw insErr
          prof = inserted as StudentProfile
        } else if (error) {
          throw error
        } else {
          prof = data as StudentProfile
        }

        setProfile(prof)
        setEditedProfile(prof)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [ready])

  /* ------------------------ 保存 ------------------------ */
  async function saveChanges() {
    try {
      setLoading(true)
      setError(null)

      /* サインイン中ユーザー */
      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser()
      if (authErr || !user) throw new Error("認証が失われました")

      /* updatePayload: undefined を除外 */
      const updatePayload = Object.fromEntries(
        Object.entries(editedProfile).filter(([, v]) => v !== undefined),
      )

      /* UPDATE → 0 行なら INSERT */
      const { data: upd, error: updErr } = await supabase
        .from("student_profiles")
        .update(updatePayload)
        .eq("user_id", user.id)
        .select()
        .single()

      let prof = upd as StudentProfile | null
      if (updErr && updErr.code !== "PGRST116") throw updErr

      if (!prof) {
        const { data: ins, error: insErr } = await supabase
          .from("student_profiles")
          .insert({ user_id: user.id, ...updatePayload })
          .select()
          .single()
        if (insErr || !ins) throw insErr
        prof = ins as StudentProfile
      }

      setProfile(prof)
      setEditedProfile(prof)
      setIsEditing(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  /* ------------------------ UI 制御 ------------------------ */
  if (!ready || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-6 w-6 animate-spin mr-2 text-red-500" />
        <span>ロード中...</span>
      </div>
    )
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        <Info className="mr-2 h-6 w-6" />
        {error}
      </div>
    )
  }

  /* ------------------------ 画面 ------------------------ */
  return (
    <div className="container mx-auto max-w-3xl space-y-6 py-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">マイプロフィール</h1>

        {isEditing ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              setEditedProfile(profile)
              setIsEditing(false)
            }}>
              <X className="mr-2 h-4 w-4" />
              キャンセル
            </Button>
            <Button onClick={saveChanges}>
              <Save className="mr-2 h-4 w-4" />
              保存
            </Button>
          </div>
        ) : (
          <Button onClick={() => setIsEditing(true)}>
            <Edit className="mr-2 h-4 w-4" />
            編集
          </Button>
        )}
      </div>

      {/* 基本情報 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center">
            <User className="mr-2 h-5 w-5 text-muted-foreground" />
            <CardTitle>基本情報</CardTitle>
          </div>
        </CardHeader>

        <CardContent>
          {isEditing ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full_name">氏名</Label>
                <Input
                  id="full_name"
                  value={editedProfile.full_name ?? ""}   
                  onChange={e =>
                    setEditedProfile({ ...editedProfile, full_name: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="university">大学名</Label>
                <Input
                  id="university"
                  value={editedProfile.university ?? ""} 
                  onChange={e =>
                    setEditedProfile({ ...editedProfile, university: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="faculty">学部</Label>
                <Input
                  id="faculty"
                  value={editedProfile.faculty ?? ""}  
                  onChange={e =>
                    setEditedProfile({ ...editedProfile, faculty: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="graduation_year">卒業予定年</Label>
                <Input
                  id="graduation_year"
                  type="number"
                  value={editedProfile.graduation_year ?? ""}
                  onChange={e =>
                    setEditedProfile({
                      ...editedProfile,
                      graduation_year: Number(e.target.value) || null,
                    })
                  }
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">氏名</p>
                <p className="text-lg">{profile.full_name || "未登録"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">大学名</p>
                <p className="text-lg">{profile.university || "未登録"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">学部</p>
                <p className="text-lg">{profile.faculty || "未登録"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">卒業予定年</p>
                <p className="text-lg">
                  {profile.graduation_year ? `${profile.graduation_year}年` : "未登録"}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 自己PR */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>自己PR</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Textarea
              rows={8}
              value={editedProfile.pr_text ?? ""} 
              onChange={e =>
                setEditedProfile({ ...editedProfile, pr_text: e.target.value })
              }
            />
          ) : (
            <blockquote className="border-l-4 border-muted pl-4 italic">
              {profile.pr_text
                ? profile.pr_text.split("\n\n").map((p, i) => (
                    <p key={i} className="my-2 whitespace-pre-wrap">
                      {p}
                    </p>
                  ))
                : "自己PRが登録されていません"}
            </blockquote>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
