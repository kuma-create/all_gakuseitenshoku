'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'

type Member = {
  id: string
  role: string
  invited_at: string
  user: {
    id: string
    name: string
    email: string
  }
}

// public.profiles テーブルから取得するユーザー型
type User = {
  id: string;
  name: string;
  email: string;
}

export default function CompanyMembersPage() {
  const [companyId, setCompanyId] = useState<string | null>(null)

  useEffect(() => {
    const fetchCompanyId = async () => {
      // 認証ユーザーを取得
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Failed to fetch user', userError);
        return;
      }

      // company_members から自分の所属会社IDを取得
      const { data: membership, error: membershipError } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (membershipError || !membership) {
        console.error('Failed to fetch company membership', membershipError);
        return;
      }

      setCompanyId(membership.company_id);
    };

    fetchCompanyId();
  }, [])

  const [members, setMembers] = useState<Member[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchMembers = async () => {
    if (!companyId) return

    const { data: membersRaw, error } = await supabase
      .from('company_members')
      .select('id, role, invited_at, user_id')
      .eq('company_id', companyId)

    if (error || !membersRaw) {
      console.error('Error fetching company_members:', error)
      return
    }

    const userIds = membersRaw.map((m) => m.user_id)

    // users_view ビュー経由で id, name, email を取得
    const { data: usersRaw, error: usersError } = await supabase
      .from('users_view')
      .select('id, name, email')
      .in('id', userIds) as unknown as { data: User[] | null; error: any };

    if (usersError || !usersRaw) {
      console.error('Error fetching users:', usersError)
      return
    }

    const userMap = new Map(usersRaw.map((u) => [u.id, u]))

    const merged: Member[] = membersRaw.map((m) => {
      const u = userMap.get(m.user_id)!
      return {
        id: m.id,
        role: m.role,
        invited_at: m.invited_at,
        user: {
          id: u.id,
          name: u.name,
          email: u.email,
        },
      }
    })

    setMembers(merged)
  }

  const handleInvite = async () => {
    if (!inviteEmail) return
    if (!companyId) return
    setLoading(true)

    // 既存ユーザーの検索
    const { data: existingUser, error: userError } = await supabase
      .from('users_view')
      .select('id')
      .eq('email', inviteEmail)
      .maybeSingle()

    if (userError) {
      alert('ユーザー検索中にエラーが発生しました')
      setLoading(false)
      return
    }

    if (!existingUser) {
      alert('そのメールアドレスのユーザーは登録されていません')
      setLoading(false)
      return
    }

    const invitedUserId = existingUser.id!

    const { error: insertError } = await supabase
      .from('company_members')
      .insert([
        {
          company_id: companyId,
          user_id: invitedUserId,
          role: 'recruiter',
          invited_at: new Date().toISOString(),
        },
      ])

    if (insertError) {
      alert('追加に失敗しました')
    } else {
      alert('メンバーを追加しました')
      setInviteEmail('')
      fetchMembers()
    }
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('company_members').delete().eq('id', id)
    if (error) {
      alert('削除に失敗しました')
    } else {
      fetchMembers()
    }
  }

  useEffect(() => {
    if (companyId) {
      fetchMembers()
    }
  }, [companyId])

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>企業メンバー一覧</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {members.map((m) => (
            <div key={m.id} className="flex justify-between items-center border p-2 rounded">
              <div>
                <p className="font-medium">{m.user.name}</p>
                <p className="text-sm text-gray-500">{m.user.email}</p>
                <p className="text-xs text-gray-400">{m.role}（{format(new Date(m.invited_at), 'yyyy/MM/dd')} に招待）</p>
              </div>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(m.id)}>
                削除
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>メンバー招待</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="email"
            placeholder="メールアドレスを入力"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <Button onClick={handleInvite} disabled={loading || !inviteEmail}>
            招待する
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
