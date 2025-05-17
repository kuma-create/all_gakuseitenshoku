"use client"

import { ArrowLeft, Clock, Info } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { LazyImage } from "@/components/ui/lazy-image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { supabase } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/types"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"

// 取り扱う列だけを抜き出したチャレンジ型
type ChallengeDetail = Pick<
  Database["public"]["Tables"]["challenges"]["Row"],
  | "id"
  | "title"
  | "description"
  | "company"
  | "time_limit_min"
  | "question_count"
>;

/**
 * /grandprix/webtest/[id]/confirm
 * - id = challengeId
 * - 静的 UI を残しつつ、Supabase から大会情報を取得し
 *   「テストを開始する」クリックで /api/start-session を呼び出す
 */
export default function WebTestConfirmPage() {
  const { category, challengeId } = useParams<{
    category: string
    challengeId: string
  }>()
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [challenge, setChallenge] = useState<ChallengeDetail | null>(null)
  const [agreed, setAgreed] = useState(false)
  const [starting, setStarting] = useState(false)

  /* ----------------------- fetch challenge ----------------------- */
  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from("challenges")
        .select(
          `id, title, description,
           company, time_limit_min, question_count`
        )
        .eq("id", challengeId)
        .single()
      if (error) toast({ description: error.message })
      else setChallenge(data as ChallengeDetail)
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challengeId])

  /* ----------------------- start session ----------------------- */
  const handleStart = useCallback(async () => {
    try {
      setStarting(true)
      const res = await fetch("/api/start-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "failed to start")
      router.replace(`/grandprix/${category}/${json.sessionId}/test`)
    } catch (e: any) {
      toast({ description: e.message })
    } finally {
      setStarting(false)
    }
  }, [challengeId, router, toast])

  /* --------------------------- UI --------------------------- */
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
      </div>
    )
  }

  if (!challenge) return <p className="p-4">Challenge が見つかりません</p>

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-center gap-2">
              <LazyImage
                src="/placeholder.svg?height=32&width=32"
                alt="学生転職ロゴ"
                width={32}
                height={32}
                className="h-8 w-8"
              />
              <span className="text-xl font-bold text-red-600">学生転職</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-2">
          <Link
            href={`/grandprix/${category}`}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Webテストに戻る</span>
          </Link>
        </div>

        <div className="mx-auto max-w-3xl">
          <Card className="border-emerald-200">
            <CardHeader className="bg-emerald-50">
              <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <CardTitle className="text-xl font-bold">{challenge.title}</CardTitle>
                  {challenge.company && <CardDescription>{challenge.company}</CardDescription>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="bg-gray-100 flex items-center">
                    <Clock className="mr-1 h-3 w-3" />
                    {challenge.time_limit_min ?? "--"}分
                  </Badge>

                  {/* difficulty があれば使い、無ければ「標準」 */}
                  <Badge variant="outline" className="bg-emerald-100 text-emerald-700">
                    {("difficulty" in challenge && (challenge as any).difficulty) || "標準"}
                  </Badge>

                  <Badge variant="outline" className="bg-gray-100">
                    問題数: {challenge.question_count ?? "--"}問
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-start gap-3">
                  <Info className="mt-0.5 h-5 w-5 text-emerald-600" />
                  <div>
                    <h3 className="font-medium text-emerald-800">開始前の注意事項</h3>
                    <p className="mt-1 text-sm text-emerald-700">
                      このテストは一度開始すると途中で中断することができません。時間に余裕がある時に挑戦してください。
                    </p>
                  </div>
                </div>
              </div>

              {/* challenge.description */}
              {challenge.description && (
                <div>
                  <h3 className="mb-2 text-lg font-medium">テスト概要</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{challenge.description}</p>
                </div>
              )}

              <Separator />

              {/* 固定セクション説明：実装簡略化のためハードコード */}
              <div>
                <h3 className="mb-2 text-lg font-medium">テスト内容</h3>
                <div className="space-y-4">
                  <div className="rounded-lg border border-gray-200 p-3">
                    <h4 className="font-medium">言語能力（20問）</h4>
                    <p className="mt-1 text-sm text-gray-600">語彙力、読解力、文章構成力を測定します。</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-3">
                    <h4 className="font-medium">非言語能力（20問）</h4>
                    <p className="mt-1 text-sm text-gray-600">数的処理能力、論理的思考力、図形認識能力を測定します。</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="mb-2 text-lg font-medium">準備するもの</h3>
                <ul className="ml-5 list-disc space-y-1 text-sm text-gray-600">
                  <li>メモ用紙とペン（計算問題用）</li>
                  <li>静かな環境（集中して取り組める場所）</li>
                  <li>安定したインターネット接続</li>
                </ul>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4 border-t bg-gray-50 p-6">
              <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <span>上記の注意事項を読み、理解しました。途中で中断できないことに同意します。</span>
              </label>
              <div className="flex w-full flex-col gap-3 sm:flex-row">
                <Link href={`/grandprix/${category}`} className="flex-1">
                  <Button variant="outline" className="w-full">
                    キャンセル
                  </Button>
                </Link>
                <Button
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                  onClick={handleStart}
                  disabled={!agreed || starting}
                >
                  {starting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  テストを開始する
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  )
}