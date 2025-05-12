/* ------------------------------------------------------------------------
   app/(company)/settings/page.tsx  – 会社設定ページ
   - company_members に full_name / email 列を追加した前提
   - user_id は auth.users.id を参照しつつ、担当者の氏名・メールも
     company_members に保持するシンプル設計
------------------------------------------------------------------------- */
"use client"

import { useEffect, useState } from "react"
import { Input  } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/types"

/* ---- 型定義 --------------------------------------------------------- */
type Member =
  Database["public"]["Tables"]["company_members"]["Row"] &
  { full_name: string | null; email: string | null }

export default function CompanySettingsPage() {
  const { toast } = useToast()

  /* ---- ローカル state ------------------------------------------------ */
  const [loading, setLoading] = useState(true)

  /* 会社プロフィール */
  const [companyId , setCompanyId ] = useState<string>("")
  const [name      , setName      ] = useState("")
  const [industry  , setIndustry  ] = useState("")
  const [description, setDescription] = useState("")

  /* 担当者リスト */
  const [members , setMembers ] = useState<Member[]>([])
  const [newName , setNewName ] = useState("")
  const [newEmail, setNewEmail] = useState("")

  /* ====================================================================
     初期ロード
     ==================================================================== */
  useEffect(() => {
    (async () => {
      try {
        /* 1) 認証ユーザー（ログイン済み）取得 */
        const { data: { session } } = await supabase.auth.getSession()
        const uid = session?.user?.id
        if (!uid) {
          toast({ title: "未ログインです", variant: "destructive" })
          return
        }

        /* 2) 自社プロフィール取得 */
        const { data: company, error: cErr } = await supabase
          .from("companies")
          .select("*")
          .eq("user_id", uid)
          .single()

        if (cErr || !company) {
          toast({ title: "会社プロフィール未作成", variant: "destructive" })
          return
        }

        setCompanyId(company.id)
        setName(company.name ?? "")
        setIndustry(company.industry ?? "")
        setDescription(company.description ?? "")

        /* 3) 担当者取得 – full_name / email を一緒に返す */
        const { data: rows, error: mErr } = await supabase
          .from("company_members")
          .select("*")
          .eq("company_id", company.id)
          .order("created_at")

        if (mErr) {
          toast({ title: "担当者取得失敗", description: mErr.message, variant: "destructive" })
        } else {
        setMembers((rows as Member[]) ?? [])
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [toast])

  /* ====================================================================
     会社プロフィール保存
     ==================================================================== */
  const saveProfile = async () => {
    const { error } = await supabase
      .from("companies")
      .update({
        name,
        industry,
        description,
      })
      .eq("id", companyId)

    if (error) {
      toast({ title: "保存失敗", description: error.message, variant: "destructive" })
    } else {
      toast({ title: "保存しました" })
    }
  }

  /* ====================================================================
     担当者追加
     - メールで auth.users を検索し user_id を取得
     - company_members に { company_id, user_id, full_name, email } を挿入
     ==================================================================== */
  const addMember = async () => {
    if (!newName || !newEmail) return

    /* 1) auth.users から user_id を取得（メールは一意想定） */
    const { data: userRow, error: findErr } = await supabase
      .from("users")               // ← public 側に VIEW がある場合はそちらでも OK
      .select("id")
      .eq("email", newEmail)
      .single()

    if (findErr || !userRow) {
      toast({ title: "該当メールのユーザーが見つかりません", variant: "destructive" })
      return
    }

    /* 2) company_members へ挿入 */
    const { data: inserted, error: insErr } = await supabase
      .from("company_members")
      .insert({
        company_id: companyId,
        user_id   : userRow.id,
        full_name : newName,
        email     : newEmail,
      })
      .select("*")
      .single()

    if (insErr) {
      toast({ title: "追加失敗", description: insErr.message, variant: "destructive" })
    } else if (inserted) {
    setMembers(prev => [...prev, inserted as Member])
      setNewName("")
      setNewEmail("")
    }
  }

  /* ====================================================================
     担当者削除
     ==================================================================== */
  const deleteMember = async (id: string) => {
    await supabase.from("company_members").delete().eq("id", id)
    setMembers(prev => prev.filter(m => m.id !== id))
  }

  /* ====================================================================
     UI
     ==================================================================== */
  if (loading) return <p className="p-4">Loading…</p>

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* ----- 会社プロフィール ----- */}
      <Card>
        <CardHeader>
          <CardTitle>会社プロフィール</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="会社名" />
          <Input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="業種" />
          <textarea
            className="w-full border rounded-md p-2"
            rows={4}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="会社概要"
          />
          <Button onClick={saveProfile}>保存</Button>
        </CardContent>
      </Card>

      {/* ----- 担当者リスト ----- */}
      <Card>
        <CardHeader>
          <CardTitle>担当者</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {members.map(m => (
            <div key={m.id} className="flex items-center gap-2">
              <span className="flex-1">{m.full_name}（{m.email}）</span>
              <Button size="icon" variant="ghost" onClick={() => deleteMember(m.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <div className="flex gap-2">
            <Input value={newName}  onChange={e => setNewName(e.target.value)}  placeholder="氏名"  />
            <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="メール" />
            <Button onClick={addMember}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
