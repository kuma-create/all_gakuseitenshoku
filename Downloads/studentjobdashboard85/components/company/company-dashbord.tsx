"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { LogOut, Briefcase, PlusCircle } from "lucide-react"

interface CompanyDashboardProps {
  companyName: string
}

export default function CompanyDashboard({ companyName }: CompanyDashboardProps) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    const supabase = createClient()

    try {
      await supabase.auth.signOut()
      router.push("/auth/signin")
      router.refresh()
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">{companyName}</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="text-gray-600 hover:text-red-600"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {isLoggingOut ? "ログアウト中..." : "ログアウト"}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Welcome Section */}
          <section className="bg-gray-50 rounded-lg p-8 mb-8 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">ようこそ、{companyName}さん！</h2>
            <p className="text-gray-600 mb-2">ダッシュボードから求人情報の管理や新規作成が行えます。</p>
          </section>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link href="/company/jobs" className="block">
              <Button
                className="w-full h-32 text-lg bg-white border-2 border-gray-200 hover:border-red-500 hover:bg-gray-50 text-gray-800 flex flex-col items-center justify-center transition-all"
                variant="outline"
              >
                <Briefcase className="h-8 w-8 mb-2 text-gray-600" />
                求人情報を見る
              </Button>
            </Link>

            <Link href="/company/jobs/create" className="block">
              <Button className="w-full h-32 text-lg bg-red-600 hover:bg-red-700 text-white flex flex-col items-center justify-center">
                <PlusCircle className="h-8 w-8 mb-2" />
                新しい求人を作成する
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
