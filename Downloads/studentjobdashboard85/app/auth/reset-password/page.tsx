import { PasswordResetForm } from "@/components/auth/password-reset-form"

export const metadata = {
  title: "パスワードリセット | 学生転職",
  description: "パスワードをリセットするためのリンクをメールで送信します。",
}

export default function ResetPasswordPage() {
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">パスワードリセット</h1>
          <p className="text-sm text-gray-500">
            登録したメールアドレスを入力してください。パスワードリセット用のリンクを送信します。
          </p>
        </div>
        <PasswordResetForm />
      </div>
    </div>
  )
}
