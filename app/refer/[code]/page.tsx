'use client'

/**
 * /refer/[code]
 *
 * 1. ログイン済みの場合：紹介コードを無視し、対象外メッセージを表示
 * 2. 未ログインの場合：紹介コードを localStorage に保存して /signup へリダイレクト
 *
 * 登録後は Edge Function 側で referral_uses テーブルに INSERT する想定。
 */

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/supabase/types'

export default function ReferralRedirect() {
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()
  const params = useParams() as { code?: string }
  const code = params?.code ?? null
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    (async () => {
      if (!code) {
        router.replace('/signup') // 無効リンク → サインアップ
        return
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()

      // ログイン済み
      if (session?.user) {
        setLoggedIn(true)
        try {
          localStorage.removeItem('referral_code')
        } catch (_) {
          /* ignore */
        }
        return // リダイレクトしない
      }

      // 未ログインユーザー → コード保存してサインアップへ
      try {
        localStorage.setItem('referral_code', code)
      } catch (_) {
        /* Safari プライベートモード等の例外は無視 */
      }

      router.replace('/signup')
    })()
  }, [code, router, supabase])

  if (loggedIn) {
    return (
      <div className="flex h-screen w-screen items-center justify-center px-4 text-center">
        <p className="text-sm text-gray-700">
          既にご登録いただいた方は対象外となっております。誠に申し訳ありません。
        </p>
      </div>
    )
  }

  // ローディング（未ログイン判定中 or リダイレクト前）
  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-red-600" />
    </div>
  )
}