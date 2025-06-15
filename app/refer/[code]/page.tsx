'use client'

/**
 * /refer/[code]
 *
 * 1. 受け取った紹介コードを `localStorage.setItem('referral_code', code)` に保存
 * 2. 直ちにサインアップページへ遷移（ログイン状態ならトップへ）
 *
 * 「登録完了 → Edge Function 側で referral_uses に INSERT」という
 * フローを想定したシンプルなリダイレクト専用ページです。
 */

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function ReferralRedirect() {
  const router = useRouter()
  const params = useParams() as { code?: string }
  const code = params?.code ?? null

  useEffect(() => {
    if (!code) {
      router.replace('/') // 無効リンク → ホーム
      return
    }

    try {
      localStorage.setItem('referral_code', code)
    } catch (_) {
      /* ignore Safari private mode errors */
    }

    // TODO: change destination if signup path differs
    router.replace('/signup')
  }, [code, router])

  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-red-600" />
    </div>
  )
}