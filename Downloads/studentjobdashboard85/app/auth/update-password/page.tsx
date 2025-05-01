import { UpdatePasswordForm } from "@/components/auth/update-password-form"

export const metadata = {
  title: "パスワード更新 | 学生転職",
  description: "新しいパスワードを設定してください。",
}

export default function UpdatePasswordPage() {
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">パスワード更新</h1>
          <p className="text-sm text-gray-500">新しいパスワードを設定してください。</p>
        </div>
        <UpdatePasswordForm />
      </div>
    </div>
  )
}
