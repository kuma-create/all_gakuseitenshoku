/* ──────────────────────────────────────────────────────────
   app/student/profile/page.tsx
   - basicInfo / selfPR を Supabase で CRUD
   - skills, experiences などは次フェーズで別テーブル化予定
   ────────────────────────────────────────────────────────── */
   "use client"

   import { useEffect, useState } from "react"
   import {
     Edit, Save, X, User, Info, Loader2,
   } from "lucide-react"
   
   import { supabase } from "@/lib/supabase/client"
   import type { Database } from "@/lib/supabase/types"
   
   import { useAuthGuard } from "@/lib/use-auth-guard"
   import { Button } from "@/components/ui/button"
   import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
   import { Input } from "@/components/ui/input"
   import { Textarea } from "@/components/ui/textarea"
   import { Label } from "@/components/ui/label"
   
   /* ---------- 型 ---------- */
   type StudentProfile = Database["public"]["Tables"]["student_profiles"]["Row"]
   
   /* ---------- プレースホルダ（初期値用） ---------- */
// 空プロフィール（DB 行型 StudentProfile と完全一致させる）
const emptyProfile: StudentProfile = {
  /* ─────────── 必須キー ─────────── */
  id: "",
  user_id: "",

  /* ─────────── 基本情報 ─────────── */
  full_name: "",
  last_name: "",
  first_name: "",
  last_name_kana: "",
  first_name_kana: "",
  birth_date: null,
  gender: null,
  phone: "",
  email: null,          // ← auth の email だけ使う場合は null で OK
  address: "",

  /* ─────────── 学歴・研究 ─────────── */
  university: "",
  faculty: "",
  department: null,
  admission_month: null,
  graduation_month: null,
  graduation_year: null,
  enrollment_status: null,
  research_theme: "",

  /* ─────────── スキル・資格 ─────────── */
  qualification_text: "",
  skill_text: "",
  language_skill: "",
  framework_lib: "",
  dev_tools: "",
  skills: null,         // JSON or text[] を使う場合は [] 初期化でも可

  /* ─────────── 自己 PR ─────────── */
  pr_title: "",
  pr_body: "",
  strength1: "",
  strength2: "",
  strength3: "",
  motive: "",
  pr_text: "",          // 旧フィールド残す場合

  /* ─────────── 希望条件 ─────────── */
  desired_industries:  null,
  desired_positions:   null,
  desired_locations:   null,
  work_style:          null,      // full_remote / hybrid / office
  employment_type:     null,      // fulltime / contract / parttime / intern
  salary_range:        null,      // <300 / 300-400 …
  work_style_options:  null,      // text[] 例: {flex, remote} など
  preference_note:     "",

  /* ─────────── その他 ─────────── */
  profile_image: null,
  created_at:   null,
}

   
   export default function StudentProfilePage() {
     /* 認証判定（未ログインならリダイレクト） */
     const ready = useAuthGuard("student")
     const [loading, setLoading]   = useState(true)
     const [error,   setError]     = useState<string | null>(null)
   
     const [profile,       setProfile]       = useState<StudentProfile>(emptyProfile)
     const [isEditing,     setIsEditing]     = useState(false)
     const [editedProfile, setEditedProfile] = useState<StudentProfile>(emptyProfile)
   
     /* ------------------------ 読み込み ------------------------ */
     useEffect(() => {
       if (!ready) return    // auth 未完了
   
       ;(async () => {
         setLoading(true)
         setError(null)
   
         try {
           /* 1) 現在のユーザー取得 */
           const {
             data: { user },
             error: userErr,
           } = await supabase.auth.getUser()
           if (userErr || !user) throw new Error("ユーザー情報を取得できませんでした")
   
           /* 2) student_profiles を検索（無ければ自動作成） */
           const { data, error } = await supabase
             .from("student_profiles")
             .select("*")
             .eq("user_id", user.id)
             .single()
   
           let prof: StudentProfile
           if (error && error.code === "PGRST116") {
             /* レコードが無ければ新規 INSERT */
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
   
     /* ------------------------ UI 制御 ------------------------ */
     if (!ready || loading) {
       return (
         <div className="min-h-screen flex items-center justify-center bg-gray-50">
           <Loader2 className="mr-2 h-6 w-6 animate-spin text-red-500" />
           <span>ロード中...</span>
         </div>
       )
     }
     if (error) {
       return (
         <div className="min-h-screen flex items-center justify-center text-red-600">
           <Info className="mr-2 h-6 w-6" /> {error}
         </div>
       )
     }
   
     /* ------------------------ ハンドラ ------------------------ */
     const toggleEditMode = () => {
       if (isEditing) setEditedProfile(profile)   // cancel → 差し戻し
       setIsEditing(prev => !prev)
     }
   
     const saveChanges = async () => {
       try {
         setLoading(true)
         const { error } = await supabase
           .from("student_profiles")
           .update({
             full_name:       editedProfile.full_name,
             university:      editedProfile.university,
             faculty:         editedProfile.faculty,
             graduation_year: editedProfile.graduation_year,
             pr_text:         editedProfile.pr_text,
           })
           .eq("id", editedProfile.id)
   
         if (error) throw error
   
         setProfile(editedProfile)
         setIsEditing(false)
       } catch (err: any) {
         setError(err.message)
       } finally {
         setLoading(false)
       }
     }
   
     /* ------------------------ 画面 ------------------------ */
     return (
       <div className="container mx-auto max-w-3xl space-y-6 py-6">
         {/* ヘッダー */}
         <div className="flex items-center justify-between">
           <h1 className="text-3xl font-bold">マイプロフィール</h1>
           {isEditing ? (
             <div className="flex gap-2">
               <Button variant="outline" onClick={toggleEditMode}>
                 <X className="mr-2 h-4 w-4" /> キャンセル
               </Button>
               <Button onClick={saveChanges}>
                 <Save className="mr-2 h-4 w-4" /> 保存
               </Button>
             </div>
           ) : (
             <Button onClick={toggleEditMode}>
               <Edit className="mr-2 h-4 w-4" /> 編集
             </Button>
           )}
         </div>
   
         {/* 基本情報カード */}
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
                     onChange={e => setEditedProfile({ ...editedProfile, full_name: e.target.value })}
                   />
                 </div>
   
                 <div className="space-y-2">
                   <Label htmlFor="university">大学名</Label>
                   <Input
                     id="university"
                     value={editedProfile.university ?? ""}
                     onChange={e => setEditedProfile({ ...editedProfile, university: e.target.value })}
                   />
                 </div>
   
                 <div className="space-y-2">
                   <Label htmlFor="faculty">学部</Label>
                   <Input
                     id="faculty"
                     value={editedProfile.faculty ?? ""}
                     onChange={e => setEditedProfile({ ...editedProfile, faculty: e.target.value })}
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
   
         {/* 自己PRカード */}
         <Card>
           <CardHeader className="pb-3">
             <CardTitle>自己PR</CardTitle>
           </CardHeader>
           <CardContent>
             {isEditing ? (
               <Textarea
                 rows={8}
                 value={editedProfile.pr_text ?? ""}
                 onChange={e => setEditedProfile({ ...editedProfile, pr_text: e.target.value })}
               />
             ) : (
               <blockquote className="border-l-4 border-muted pl-4 italic">
                 {profile.pr_text
                   ? profile.pr_text.split("\n\n").map((p, i) => (
                       <p key={i} className="my-2 whitespace-pre-wrap">{p}</p>
                     ))
                   : "自己PRが登録されていません"}
               </blockquote>
             )}
           </CardContent>
         </Card>
       </div>
     )
   }
   