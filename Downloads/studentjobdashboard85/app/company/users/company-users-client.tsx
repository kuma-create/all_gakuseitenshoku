"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Plus, User, Mail, Shield } from "lucide-react"
import { format } from "date-fns"
import { ja } from "date-fns/locale"

type Company = {
  id: number
  company_name: string
  industry?: string | null
  location?: string | null
  description?: string | null
  website_url?: string | null
}

type CompanyUser = {
  user_id: string
  role: string
  created_at: string
  auth_users: {
    email: string
    user_metadata: {
      full_name: string
    }
  }
}

export default function CompanyUsersClient({
  company,
  users,
  currentUserRole,
}: {
  company: Company
  users: CompanyUser[]
  currentUserRole: string
}) {
  const router = useRouter()
  const supabase = createClient()
  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // ユーザー追加用の状態
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [userRole, setUserRole] = useState("member")

  const isAdmin = currentUserRole === "admin" || currentUserRole === "owner"

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // 1. ユーザーを作成
      const { data: userData, error: userError } = await supabase.functions.invoke("create-company-user", {
        body: {
          email,
          password,
          fullName,
          companyId: company.id,
          companyName: company.company_name,
          userRole,
        },
      })

      if (userError) {
        throw new Error(`ユーザーの作成に失敗しました: ${userError.message}`)
      }

      setSuccess("企業ユーザーを追加しました")
      setFullName("")
      setEmail("")
      setPassword("")
      setUserRole("member")
      setIsAddUserOpen(false)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">ユーザー管理</h1>
        {isAdmin && (
          <Button onClick={() => setIsAddUserOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            ユーザーを追加
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-4 border-green-500 bg-green-50">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{company.company_name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>ユーザー数: {users.length}人</p>
        </CardContent>
      </Card>

      <h2 className="mb-4 text-xl font-semibold">ユーザー一覧</h2>
      <div className="space-y-4">
        {users.map((user) => (
          <Card key={user.user_id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                    <User className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium">{user.auth_users.user_metadata.full_name}</p>
                    <div className="flex items-center text-sm text-gray-500">
                      <Mail className="mr-1 h-3 w-3" />
                      {user.auth_users.email}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
                    <Shield className="mr-1 h-3 w-3" />
                    {user.role === "owner" ? "オーナー" : user.role === "admin" ? "管理者" : "メンバー"}
                  </div>
                  <div className="text-xs text-gray-500">
                    {format(new Date(user.created_at), "yyyy年MM月dd日", { locale: ja })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ユーザー追加ダイアログ */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>企業ユーザーを追加</DialogTitle>
            <DialogDescription>{company.company_name}に新しいユーザーを追加します。</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddUser}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">氏名 *</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス *</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">パスワード *</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="userRole">ユーザー権限 *</Label>
                <select
                  id="userRole"
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  className="w-full rounded-md border border-gray-300 p-2"
                  required
                >
                  <option value="member">メンバー</option>
                  <option value="admin">管理者</option>
                </select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddUserOpen(false)}>
                キャンセル
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <User className="mr-2 h-4 w-4" />}
                追加
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
