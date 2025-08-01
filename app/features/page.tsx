'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Gift,
  Share,
  Users,
  Download,
  Search,
  BookOpen,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/supabase/types' // adjust the import path if your generated types live elsewhere

// ───────────────────────────────────────────────────────────
// 型定義
// ───────────────────────────────────────────────────────────
type ReferralUse = {
  id: string
  status: 'pending' | 'completed'
}

type ReferralData = {
  code: string
  referral_uses: ReferralUse[]
}

// ───────────────────────────────────────────────────────────
// メインコンポーネント
// ───────────────────────────────────────────────────────────
export default function FeaturesPage() {
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()

  const [referral, setReferral] = useState<ReferralData | null>(null)
  const [loading, setLoading] = useState(true)

  // 初回マウント時に紹介コード＆利用状況を取得
  useEffect(() => {
    const fetchReferral = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.push('/login')
        return
      }

      // ① 紹介コード＋利用状況を取得
      const { data, error } = await supabase
        .from('referral_codes')
        .select('code, referral_uses ( id, status )')
        .eq('user_id', session.user.id)
        .single<ReferralData>()

      if (error && error.code !== 'PGRST116') {
        console.error('Fetch referral error', error)
      }

      let current = data as ReferralData | null

      // ② なければ RPC で発行
      if (!current) {
        const { data: newCode, error: rpcErr } = await supabase.rpc(
          'create_referral_code'
        )
        if (rpcErr) {
          console.error('RPC create_referral_code error', rpcErr)
        }
        current = { code: newCode as string, referral_uses: [] }
      }

      setReferral(current)
      setLoading(false)
    }

    fetchReferral()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading || !referral) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    )
  }

  const completed = referral.referral_uses.filter(
    (u) => u.status === 'completed'
  )
  const rewardYen = completed.length * 2000
  const referralLink = `https://gakuten.co.jp/refer/${referral.code}`

  // ── コピー & シェア（モバイル） ─────────────────────
  const handleCopy = async () => {
    try {
      // クリップボードへコピー
      await navigator.clipboard.writeText(referralLink)

      // スマホ / タブレット判定
      const isMobile =
        /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

      // Web Share API が使える端末でのみシェアシートを表示
      if (isMobile && typeof (navigator as any).share === 'function') {
        await (navigator as any).share({
          title: '学生転職',
          text: '学生転職に登録してAmazonギフト券をもらおう！',
          url: referralLink,
        })
      } else {
        // PC などでは従来のアラート
        alert('リンクをコピーしました')
      }
    } catch (err) {
      console.error('Copy / Share error', err)
    }
  }

  // 就活役立ちツール: ホワイトペーパー一覧
  const whitepapers = [
    {
      slug: 'interview',
      title: '面接必勝資料！',
      thumbnail: '/whitepaper.jpg',
      description:
        '人事面接・最終面接まで完全攻略！逆質問例や合否ポイントを徹底解説した保存版ガイド。',
      updatedAt: '2025-06-15',
    },
    // 追加例:
    // {
    //   slug: 'finance',
    //   title: '財務ホワイトペーパー',
    //   thumbnail: '/whitepapers/finance/cover.png',
    // },
  ]
  // ───────────────────────────────────────────────────────────
  // UI
  // ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">特集</h1>
          <p className="text-sm text-gray-500">
            学生転職の特別企画やキャンペーン情報
          </p>
        </div>

        <Tabs defaultValue="referral" className="w-full">
          {/* ── タブ見出し ───────────────────────── */}
          <TabsList className="mb-6 grid w-full grid-cols-2">
            <TabsTrigger value="referral" className="text-sm">
              友達紹介キャンペーン
            </TabsTrigger>
            <TabsTrigger value="tools" className="text-sm">
              就活役立ちツール
            </TabsTrigger>
          </TabsList>

          {/* ── 友達紹介キャンペーン タブ ────────────────── */}
          <TabsContent value="referral" className="mt-0">
            <div className="grid gap-8 md:grid-cols-2">
              {/* ▼ 左カラム ▽ */}
              <div className="order-2 md:order-1">
                <Card className="overflow-hidden">
                  {/* ヘッダー */}
                  <div className="bg-gradient-to-r from-red-600 to-red-400 p-6 text-white">
                    <div className="flex items-center gap-3">
                      <Users className="h-8 w-8" />
                      <h2 className="text-2xl font-bold">
                        友達紹介キャンペーン
                      </h2>
                    </div>
                    <p className="mt-2">
                      友達を紹介して、お互いに特典をゲットしよう！
                    </p>
                  </div>

                  {/* コンテンツ */}
                  <CardContent className="p-6">
                    <div className="space-y-6">
                      {/* 概要 */}
                      <section>
                        <h3 className="mb-2 text-lg font-bold">
                          キャンペーン内容
                        </h3>
                        <p className="text-sm text-gray-600">
                          あなたの友達が学生転職に登録し、プロフィールを完成させると、紹介した方にも紹介された方にも
                          <span className="font-semibold text-red-600">
                            Amazonギフト券2,000円分
                          </span>
                          をプレゼント！
                        </p>
                      </section>

                      {/* 特典表示 */}
                      <section className="grid gap-4 md:grid-cols-2">
                        {[
                          { title: '紹介する側の特典' },
                          { title: '紹介される側の特典' },
                        ].map((item) => (
                          <div
                            key={item.title}
                            className="rounded-lg bg-red-50 p-4"
                          >
                            <div className="mb-2 flex items-center gap-2">
                              <Gift className="h-5 w-5 text-red-600" />
                              <h4 className="font-medium">{item.title}</h4>
                            </div>
                            <p className="text-sm text-gray-600">
                              登録・プロフィール完成で
                              <br />
                              <span className="font-bold text-red-600">
                                Amazonギフト券2,000円分
                              </span>
                            </p>
                          </div>
                        ))}
                      </section>

                      {/* 紹介リンク */}
                      <section>
                        <h3 className="mb-2 text-lg font-bold">
                          あなたの紹介リンク
                        </h3>
                        <div className="flex items-center gap-2">
                          <Input
                            value={referralLink}
                            readOnly
                            className="bg-gray-50"
                          />
                          <Button
                            variant="outline"
                            className="flex-shrink-0 gap-1 border-red-200 text-red-600 hover:bg-red-50"
                            onClick={handleCopy}
                          >
                            <Share className="h-4 w-4" />
                            <span>コピー</span>
                          </Button>
                        </div>
                      </section>

                      {/* SNS シェア */}
                      <section className="space-y-3">
                        <h3 className="text-lg font-bold">SNSでシェアする</h3>
                        <div className="flex flex-wrap gap-2">
                          {/* Twitter */}
                          <Button
                            variant="outline"
                            className="gap-2 border-sky-200 text-sky-600 hover:bg-sky-50"
                            asChild
                          >
                            <a
                              target="_blank"
                              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                                '学生転職に登録してAmazonギフト券をもらおう！'
                              )}&url=${encodeURIComponent(referralLink)}`}
                            >
                              {/* simple X icon */}
                              <svg
                                className="h-4 w-4"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                              </svg>
                              <span>Twitter</span>
                            </a>
                          </Button>

                          {/* LINE */}
                          <Button
                            variant="outline"
                            className="gap-2 border-green-200 text-green-600 hover:bg-green-50"
                            asChild
                          >
                            <a
                              target="_blank"
                              href={`https://line.me/R/msg/text/?${encodeURIComponent(
                                `学生転職に登録して一緒に特典をもらおう！\n${referralLink}`
                              )}`}
                            >
                              <svg
                                className="h-4 w-4"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M12 2C6.48 2 2 6.48 2 12c0 5.52 4.48 10 10 10s10-4.48 10-10c0-5.52-4.48-10-10-10zm0 18c-4.41 0-8-3.59-8-8 0-4.41 3.59-8 8-8s8 3.59 8 8c0 4.41-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
                              </svg>
                              <span>LINE</span>
                            </a>
                          </Button>
                        </div>
                      </section>
                    </div>
                  </CardContent>

                  {/* 紹介状況 */}
                  <CardFooter className="border-t bg-gray-50 p-6">
                    <div className="space-y-4">
                      <h3 className="font-bold">紹介状況</h3>
                      <div className="rounded-lg border border-gray-200 bg-white p-4">
                        {/* 集計 */}
                        <div className="mb-4 grid grid-cols-2 gap-4">
                          <div className="text-center">
                            <p className="text-sm text-gray-500">紹介した友達</p>
                            <p className="text-2xl font-bold text-red-600">
                              {referral.referral_uses.length}
                              <span className="text-sm text-gray-500">人</span>
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-gray-500">獲得した特典</p>
                            <p className="text-2xl font-bold text-red-600">
                              {rewardYen.toLocaleString()}
                              <span className="text-sm text-gray-500">円分</span>
                            </p>
                          </div>
                        </div>

                        {/* 一覧 */}
                        <div className="max-h-60 space-y-2 overflow-auto">
                          {referral.referral_uses.map((u) => (
                            <div
                              key={u.id}
                              className="flex items-center justify-between rounded-md bg-gray-50 p-2"
                            >
                              <span className="text-sm">
                                {`ユーザーID: ${u.id.slice(0, 8)}…`}
                              </span>
                              <Badge
                                className={
                                  u.status === 'completed'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-yellow-100 text-yellow-700'
                                }
                              >
                                {u.status === 'completed'
                                  ? '特典獲得済み'
                                  : '確認待ち'}
                              </Badge>
                            </div>
                          ))}
                          {referral.referral_uses.length === 0 && (
                            <p className="text-center text-sm text-gray-500">
                              まだ紹介はありません
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardFooter>
                </Card>
              </div>

              {/* ▼ 右カラム ▽ */}
              <div className="order-1 md:order-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl font-bold">
                      友達紹介の手順
                    </CardTitle>
                    <CardDescription>
                      簡単3ステップで友達を紹介できます
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="space-y-6 p-6">
                      {[
                        {
                          step: 1,
                          title: 'あなた専用の紹介リンクを取得',
                          desc: 'このページに表示されている紹介リンクをコピーします。',
                        },
                        {
                          step: 2,
                          title: '友達に紹介リンクを送る',
                          desc: 'SNS、メール、メッセージアプリなどで友達に紹介リンクを送ります。',
                        },
                        {
                          step: 3,
                          title: '友達が登録・プロフィール完成',
                          desc: '友達が学生転職に登録し、プロフィールを完成させると、お互いに特典がもらえます。',
                        },
                      ].map((item) => (
                        <div key={item.step} className="flex items-start gap-4">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                            {item.step}
                          </div>
                          <div>
                            <h3 className="font-medium">{item.title}</h3>
                            <p className="mt-1 text-sm text-gray-600">
                              {item.desc}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ── 就活役立ちツール タブ ───────────────────── */}
          <TabsContent value="tools" className="mt-0">
            <div className="grid gap-4 md:grid-cols-2">
              {whitepapers.map((wp) => (
                <Card
                  key={wp.slug}
                  className="flex items-start gap-6 p-6 hover:shadow-sm transition-shadow"
                >
                  {/* サムネイルを大きめに */}
                  <img
                    src={wp.thumbnail}
                    alt={wp.title}
                    className="h-28 w-28 flex-shrink-0 rounded-lg object-cover"
                    onError={(e) =>
                      ((e.target as HTMLImageElement).src = '/placeholder.png')
                    }
                  />

                  {/* タイトル & 説明文 */}
                  <div className="flex-grow space-y-1">
                    <h3 className="text-lg font-semibold">{wp.title}</h3>
                    {wp.description && (
                      <p className="text-sm text-gray-600">{wp.description}</p>
                    )}
                    {wp.updatedAt && (
                      <p className="text-xs text-gray-400">更新日: {wp.updatedAt}</p>
                    )}
                  </div>

                  {/* 開くボタン */}
                  <Button variant="secondary" size="sm" asChild>
                    <Link
                      href={`/whitepapers/${wp.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      開く
                    </Link>
                  </Button>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
