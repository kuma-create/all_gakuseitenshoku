import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft, CheckCircle, Clock } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function CompanyPendingPage() {
  const supabase = createClient()

  // セッションを取得
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/auth/signin")
  }

  // ユーザー情報を取得
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/signin")
  }

  // ユーザーロールを確認
  const { data: roleData } = await supabase.from("user_roles").select("role, is_approved").eq("id", user.id).single()

  // 企業ユーザーでない場合はリダイレクト
  if (!roleData || roleData.role !== "company") {
    redirect("/dashboard")
  }

  // 既に承認済みの場合は企業ダッシュボードにリダイレクト
  if (roleData && roleData.is_approved) {
    redirect("/company/dashboard")
  }

  const companyName = user.user_metadata?.company_name || "企業"

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <div className="flex justify-center mb-4">
              <Clock className="h-16 w-16 text-yellow-500" />
            </div>
            <CardTitle className="text-center text-2xl">審査待ち</CardTitle>
            <CardDescription className="text-center">{companyName}様の企業アカウントは現在審査中です</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                企業アカウントは管理者による承認が必要です。承認されるまでしばらくお待ちください。
                承認されると、登録したメールアドレスに通知が送信されます。
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                <div>
                  <h3 className="font-medium">アカウント登録完了</h3>
                  <p className="text-sm text-gray-500">基本情報の登録が完了しました</p>
                </div>
              </div>
              <div className="flex items-start">
                <Clock className="h-5 w-5 text-yellow-500 mr-2 mt-0.5" />
                <div>
                  <h3 className="font-medium">審査中</h3>
                  <p className="text-sm text-gray-500">管理者による審査を行っています</p>
                </div>
              </div>
              <div className="flex items-start opacity-50">
                <CheckCircle className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                <div>
                  <h3 className="font-medium">承認完了</h3>
                  <p className="text-sm text-gray-500">企業ダッシュボードが利用可能になります</p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Link href="/company/contact" passHref>
              <Button className="w-full">お問い合わせ</Button>
            </Link>
            <Link href="/" passHref>
              <Button variant="outline" className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                ホームに戻る
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
