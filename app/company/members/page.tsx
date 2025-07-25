'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'

/**
 * Extract detailed error string from Supabase FunctionsHttpError
 */
async function extractFunctionError(e: any): Promise<string | undefined> {
  // supabase@v2: error.context.response is a Response
  if (e?.context?.response) {
    try {
      const res: Response = e.context.response
      const txt = await res.text()
      if (txt) return txt
    } catch (_) {}
  }

  // fallback: error.context.body is a ReadableStream (older types)
  if (e?.context?.body) {
    try {
      const txt = await new Response(e.context.body).text()
      if (txt) return txt
    } catch (_) {}
  }

  return undefined
}

type User = {
  id: string
  email: string
  name?: string
}

type Member = {
  id: string
  role: string
  invited_at: string
  user: User
}

export default function CompanyMembersPage() {
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    const fetchCompanyId = async () => {
      // 1) Get current auth user
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error || !user) {
        console.error('Failed to fetch user', error)
        return
      }

      setCurrentUserId(user.id)

      // 2) Try metadata first (keeps backward‑compatibility)
      let id: string | null = user.user_metadata?.company_id ?? null

      // 3) Fallback: look up company_members table
      if (!id) {
        const { data: memberRow, error: memberError } = await supabase
          .from('company_members')
          .select('company_id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (memberError) {
          console.error('Error looking up company_members:', memberError)
          return
        }

        id = memberRow?.company_id ?? null

        if (!id) {
          // 3rd fallback: if user is the owner column in companies table
          const { data: ownedCompany, error: companyErr } = await supabase
            .from('companies')
            .select('id')
            .eq('owner_id', user.id)
            .maybeSingle()

          if (companyErr) {
            console.error('Error looking up companies (owner):', companyErr)
            return
          }

          id = ownedCompany?.id ?? null
          if (!id) {
            console.error('No company membership or ownership found for user')
            return
          }
        }
      }

      setCompanyId(id)
    }

    fetchCompanyId()
  }, [])

  const [members, setMembers] = useState<Member[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const fetchMembers = async () => {
    if (!companyId) return

    const { data: membersRaw, error } = await supabase
      .from('company_members')
      .select('id, role, invited_at, user_id')
      .eq('company_id', companyId)
      .order('invited_at', { ascending: false })

    if (error || !membersRaw) {
      console.error('Error fetching company_members:', error)
      return
    }

    const userIds = membersRaw.map((m) => m.user_id)

    const {
      data: usersRaw,
      error: usersError,
    } = await supabase
      .from('company_member_emails')
      .select('id, email')
      .in('id', userIds)

    const usersFormatted: User[] = (usersRaw ?? [])
      .filter(
        (u): u is { id: string; email: string } =>
          typeof u.id === 'string' && typeof u.email === 'string'
      )
      .map((u) => ({
        id: u.id,
        email: u.email,
      }))
    const userMap = new Map(usersFormatted.map((u) => [u.id, u]))

    const merged: Member[] = membersRaw.flatMap((m) => {
      const u = userMap.get(m.user_id)
      if (!u) {
        console.warn(`User info not found for user_id=${m.user_id}`)
        return []
      }
      return [
        {
          id: m.id,
          role: m.role,
          invited_at: m.invited_at,
          user: u,
        },
      ]
    })

    const filtered = currentUserId
      ? merged.filter((m) => m.user.id !== currentUserId)
      : merged

    setMembers(filtered)
  }

  const handleInvite = async () => {
    const emailToInvite = inviteEmail.trim().toLowerCase()
    if (members.some((m) => m.user.email.toLowerCase() === emailToInvite)) {
      setErrorMsg('このメールアドレスは既に招待済みです')
      return
    }
    if (!emailToInvite || !companyId) return
    setLoading(true)

    try {
      const { data, error } = await supabase.functions.invoke('send-invite', {
        body: {
          email: emailToInvite,
          company_id: companyId,
          role: 'recruiter',
        },
      })

      let detailed =
        (error as any)?.data?.error || // JSON error field from supabase-js
        (data as any)?.error

      if (!detailed && error) {
        detailed = await extractFunctionError(error)
      }

      const msg =
        detailed ||
        (error as any)?.message ||
        JSON.stringify(error, null, 2)

      if (error) {
        if (/already been registered/i.test(msg)) {
          setErrorMsg(null)
          setInviteEmail('')
          fetchMembers()
        } else {
          setErrorMsg(`招待に失敗しました: ${msg}`)
        }
      } else {
        setErrorMsg(null)
        setInviteEmail('')
        fetchMembers()
      }
    } catch (e) {
      setErrorMsg(`招待に失敗しました: ${(e as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (rowId: string) => {
    if (!companyId) return

    const { data: deletedRows, error } = await supabase
      .from('company_members')
      .delete()
      .eq('id', rowId)
      .eq('company_id', companyId)
      .select('id')

    if (error) {
      alert(`削除に失敗しました: ${error.message}`)
      return
    }
    if (!deletedRows || deletedRows.length === 0) {
      alert('削除対象が見つかりませんでした。')
      return
    }

    setMembers((prev) => prev.filter((m) => m.id !== rowId))
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
          {members.length === 0 ? (
            <p className="text-sm text-gray-500 px-4 pb-4">メンバーがいません</p>
          ) : (
            members.map((m) =>
              m.user.id === currentUserId ? null : (
                <div
                  key={m.id}
                  className="flex justify-between items-center border p-2 rounded"
                >
                  <div>
                    <p className="font-medium">{m.user.name || m.user.email}</p>
                    <p className="text-sm text-gray-500">{m.user.email}</p>
                    <p className="text-xs text-gray-400">
                      {m.role}（
                      {format(new Date(m.invited_at), 'yyyy/MM/dd')} に招待）
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={m.role === 'owner'}
                    onClick={() => {
                      if (
                        confirm('本当に削除しますか？')
                      ) {
                        handleDelete(m.id)
                      }
                    }}
                  >
                    削除
                  </Button>
                </div>
              )
            )
          )}
        </CardContent>
      </Card>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>メンバー招待</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}
          <Input
            type="email"
            placeholder="メールアドレスを入力"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <Button
            onClick={handleInvite}
            disabled={loading || !inviteEmail}
          >
            招待する
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
