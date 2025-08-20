/* ------------------------------------------------------------------
   app/registration-complete/page.tsx
   - サインアップ後に呼ばれる “登録完了” 画面
   - student_profiles に空レコードを upsert
   ------------------------------------------------------------------*/
   "use client"

   import { useEffect, useState } from "react"
   import { useRouter, useSearchParams } from "next/navigation"
   import { CheckCircle, Loader2 } from "lucide-react"
   import { supabase } from "@/lib/supabase/client"
   import type { Database } from "@/lib/supabase/types"
   
   import { Button } from "@/components/ui/button"
   import {
     Card, CardContent, CardDescription, CardFooter,
     CardHeader, CardTitle,
   } from "@/components/ui/card"
   import { Alert, AlertDescription } from "@/components/ui/alert"
   
   /* ---------- 定数 ---------- */
   const DASHBOARD_PATH = "/student-dashboard" // 実際のパスに合わせて変更
   
   export default function RegistrationCompletePage() {
     const router       = useRouter()
     const searchParams = useSearchParams()
   
     /* サインアップ時にクエリで渡している値 */
     const userId = searchParams.get("userId")
     const email  = searchParams.get("email")
   
     const [isCreatingProfile, setIsCreatingProfile] = useState(false)
     const [profileCreated  , setProfileCreated]   = useState(false)
     const [error          , setError]             = useState<string | null>(null)
     const [countdown      , setCountdown]         = useState(5)
   
     /* ------------------------------------------------------------
        プロフィールを upsert
        - UNIQUE(user_id) 制約があっても重複 insert にならない
        - 必須カラムがある場合は null かデフォルト値を入れておく
     ------------------------------------------------------------ */
     useEffect(() => {
       if (!userId || profileCreated) return
   
       let timerId: NodeJS.Timeout | null = null
   
       const createProfile = async () => {
         setIsCreatingProfile(true)
         setError(null)
   
         try {
           /* --- ① Auth セッション確認（RLS 用）--- */
           const { data: sessionData, error: sessionErr } =
             await supabase.auth.getSession()
           if (sessionErr) throw sessionErr
           if (!sessionData?.session) {
             throw new Error("ログインセッションが無効です。再度ログインしてください。")
           }
   
           /* --- ② student_profiles を upsert --- */
           const { error: upsertErr } = await supabase
             .from("student_profiles")
             .upsert(
               {
                 user_id: userId,
                 email        : email ?? null,
                 full_name    : "",     // ← 後続フォームで更新予定
                 university   : null,
                 faculty      : null,
                 department   : null,
                 graduation_year: null,
                 referral     : null,
               },
               { onConflict: "user_id" }
             )
   
           if (upsertErr) throw upsertErr
   
           /* --- ③ 成功 → カウントダウン開始 --- */
           setProfileCreated(true)
           timerId = setInterval(() => {
             setCountdown((prev) => {
               if (prev <= 1) {
                 clearInterval(timerId!)
                 router.push(DASHBOARD_PATH)
                 return 0
               }
               return prev - 1
             })
           }, 1_000)
         } catch (err: any) {
           console.error("Profile creation error:", err)
           setError(err.message ?? "プロフィールの作成に失敗しました。")
         } finally {
           setIsCreatingProfile(false)
         }
       }
   
       createProfile()
   
       /* --- アンマウント時にタイマーをクリア --- */
       return () => {
         if (timerId) clearInterval(timerId)
       }
       // userId, profileCreated, email が変わることは通常ないので supabase / router は依存に含めない
       // eslint-disable-next-line react-hooks/exhaustive-deps
     }, [userId, email, profileCreated])
   
     /* ------------------------------------------------------------
        UI
     ------------------------------------------------------------ */
     return (
       <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
         <Card className="w-full max-w-md">
           <CardHeader className="text-center">
             <CardTitle className="text-2xl">登録完了</CardTitle>
             <CardDescription>
               アカウントが正常に作成されました
             </CardDescription>
           </CardHeader>
   
           <CardContent className="space-y-4">
             {/* --- プロフィール作成中 --- */}
             {isCreatingProfile && (
               <div className="flex flex-col items-center justify-center py-8">
                 <Loader2 className="h-8 w-8 animate-spin text-red-600 mb-4" />
                 <p className="text-gray-600">プロフィールを作成中...</p>
               </div>
             )}
   
             {/* --- 成功 --- */}
             {profileCreated && !isCreatingProfile && (
               <div className="text-center space-y-4">
                 <div className="flex justify-center">
                   <div className="rounded-full bg-green-100 p-3">
                     <CheckCircle className="h-8 w-8 text-green-600" />
                   </div>
                 </div>
                 <div>
                   <h3 className="text-lg font-medium">
                     登録が完了しました！
                   </h3>
                   <p className="text-gray-600 mt-1">
                     {countdown}秒後にダッシュボードに移動します...
                   </p>
                 </div>
               </div>
             )}
   
             {/* --- エラー --- */}
             {error && !isCreatingProfile && (
               <Alert variant="destructive">
                 <AlertDescription>{error}</AlertDescription>
               </Alert>
             )}
           </CardContent>
   
           <CardFooter className="flex justify-center">
             {profileCreated ? (
               <Button
                 onClick={() => router.push(DASHBOARD_PATH)}
                 className="bg-red-600 hover:bg-red-700"
               >
                 今すぐダッシュボードへ
               </Button>
             ) : error ? (
               <Button
                 onClick={() => router.push("/signup")}
                 variant="outline"
               >
                 登録画面に戻る
               </Button>
             ) : null}
           </CardFooter>
         </Card>
       </div>
     )
   }
   