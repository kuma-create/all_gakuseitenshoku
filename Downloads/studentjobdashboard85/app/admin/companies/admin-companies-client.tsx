"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Plus, Building, Users, User } from "lucide-react"

type Company = {
  id: number
  company_name: string
  industry: string | null
  location: string | null
  created_at: string
  company_users: { user_id: string; role: string }[]
}

export default function AdminCompaniesClient({ companies }: { companies: Company[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false)
  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // 企業追加用の状態
  const [companyName, setCompanyName] = useState("")
  const [industry, setIndustry] = useState("")
  const [location, setLocation] = useState("")
  const [description, setDescription] = useState("")
  const [websiteUrl, setWebsiteUrl] = useState("")

  // ユーザー追加用の状態
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // 企業を追加
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .insert([
          {
            company_name: companyName,
            industry,
            location,
            description,
            website_url: websiteUrl,
          },
        ])
        .select()
        .single()

      if (companyError) {
        throw new Error(`企業の追加に失敗しました: ${companyError.message}`)
      }

      setSuccess("企業を追加しました")
      setCompanyName("")
      setIndustry("")
      setLocation("")
      setDescription("")
      setWebsiteUrl("")
      setIsAddCompanyOpen(false)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCompany) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // 1. ユーザーを作成
      const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          company_name: selectedCompany.company_name,
        },
      })

      if (userError || !userData.user) {
        throw new Error(`ユーザーの作成に失敗しました: ${userError?.message}`)
      }

      // 2. ユーザーロールを設定
      const { error: roleError } = await supabase.from("user_roles").insert([
        {
          id: userData.user.id,
          role: "company",
          is_approved: true,
        },
      ])

      if (roleError) {
        throw new Error(`ユーザーロールの設定に失敗しました: ${roleError.message}`)
      }

      // 3. 企業とユーザーを関連付け
      const { error: linkError } = await supabase.from("company_users").insert([
        {
          user_id: userData.user.id,
          company_id: selectedCompany.id,
          role: "admin",
        },
      ])

      if (linkError) {
        throw new Error(`企業とユーザーの関連付けに失敗しました: ${linkError.message}`)
      }

      setSuccess("企業ユーザーを追加しました")
      setFullName("")
      setEmail("")
      setPassword("")
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
        <h1 className="text-3xl font-bold">企業管理</h1>
        <Button onClick={() => setIsAddCompanyOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          企業を追加
        </Button>
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

      <Tabs defaultValue="companies">
        <TabsList className="mb-4">
          <TabsTrigger value="companies">企業一覧</TabsTrigger>
          <TabsTrigger value="users">ユーザー一覧</TabsTrigger>
        </TabsList>

        <TabsContent value="companies">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {companies.map((company) => (
              <Card key={company.id}>
                <CardHeader>
                  <CardTitle>{company.company_name}</CardTitle>
                  <CardDescription>
                    {company.industry} • {company.location}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Building className="mr-2 h-4 w-4 text-gray-500" />
                      <span>ID: {company.id}</span>
                    </div>
                    <div className="flex items-center">
                      <Users className="mr-2 h-4 w-4 text-gray-500" />
                      <span>ユーザー数: {company.company_users?.length || 0}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setSelectedCompany(company)
                      setIsAddUserOpen(true)
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    ユーザーを追加
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="users">
          <div className="rounded-md border">
            <div className="p-4">
              <p>ユーザー一覧は準備中です。</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* 企業追加ダイアログ */}
      <Dialog open={isAddCompanyOpen} onOpenChange={setIsAddCompanyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>企業を追加</DialogTitle>
            <DialogDescription>新しい企業情報を入力してください。</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddCompany}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">企業名 *</Label>
                <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">業種</Label>
                <Input id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">所在地</Label>
                <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">企業概要</Label>
                <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="websiteUrl">Webサイト</Label>
                <Input id="websiteUrl" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddCompanyOpen(false)}>
                キャンセル
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                追加
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ユーザー追加ダイアログ */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>企業ユーザーを追加</DialogTitle>
            <DialogDescription>{selectedCompany?.company_name}に新しいユーザーを追加します。</DialogDescription>
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
