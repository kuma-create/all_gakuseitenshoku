"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

export async function signUp(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const userType = formData.get("userType") as "student" | "company"

  // サービスロールキーを使用してクライアントを作成
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  try {
    // ユーザー登録（管理者権限で）
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { user_type: userType },
    })

    if (error) {
      return { success: false, error: error.message }
    }

    if (data.user) {
      // まず既存のレコードを確認
      const { data: existingRole } = await supabase.from("user_roles").select("*").eq("id", data.user.id).single()

      // 既存のレコードがなければ挿入、あれば更新
      if (!existingRole) {
        // ユーザーロールを設定
        const { error: roleError } = await supabase.from("user_roles").insert([
          {
            id: data.user.id,
            role: userType,
            is_approved: userType === "student", // 学生は自動承認、企業は管理者承認
          },
        ])

        if (roleError) {
          console.error("ロール設定エラー:", roleError)
          return { success: false, error: `ロール設定エラー: ${roleError.message}` }
        }
      }

      // 学生プロフィールを作成
      if (userType === "student") {
        // まず既存のプロフィールを確認
        const { data: existingProfile } = await supabase
          .from("student_profiles")
          .select("*")
          .eq("id", data.user.id)
          .single()

        // 既存のプロフィールがなければ挿入
        if (!existingProfile) {
          const { error: profileError } = await supabase.from("student_profiles").insert([
            {
              id: data.user.id,
            },
          ])

          if (profileError) {
            console.error("プロフィール作成エラー:", profileError)
            return { success: false, error: `プロフィール作成エラー: ${profileError.message}` }
          }
        }
      }
    }

    revalidatePath("/auth/signin")
    return {
      success: true,
      message: "登録が完了しました。確認メールを送信しましたので、メールのリンクをクリックして登録を完了してください。",
    }
  } catch (error: any) {
    console.error("登録エラー:", error)
    return { success: false, error: error.message || "登録に失敗しました。もう一度お試しください。" }
  }
}
