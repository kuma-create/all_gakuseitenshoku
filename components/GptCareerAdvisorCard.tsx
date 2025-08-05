"use client"
import { useAIAdvisor } from "@/components/ai-advisor/provider"
import { Button } from "@/components/ui/button"
import { ArrowRight, Check, Sparkles } from "lucide-react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"

/** デフォルトの AI アドバイザー設定 */
const DEFAULT_ADVISOR_CONFIG: AIAdvisorConfig = {
  role: "assistant",
  systemPrompt: "あなたは学生のキャリア相談に応えるAIアドバイザーです。",
};

interface GptCareerAdvisorCardProps {
  /** 任意設定。未指定ならデフォルトを使用 */
  advisorConfig?: Partial<AIAdvisorConfig>
}

export default function GptCareerAdvisorCard({
  advisorConfig = DEFAULT_ADVISOR_CONFIG,
}: GptCareerAdvisorCardProps) {
  const { openAdvisor } = useAIAdvisor()
  // `advisorConfig` は現状未使用だが、将来の拡張に備えて残す

  return (
    <>
      {/* ---- カード本体 ---- */}
      <Card
        className="w-full rounded-xl border-0 bg-white shadow-lg ring-1 ring-gray-100"
        onClick={openAdvisor}
      >
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center gap-4">
          {/* Icon bubble */}
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-yellow-400 text-white shadow">
            <Sparkles className="h-6 w-6" />
          </div>

          {/* Title & lead copy */}
          <div>
            <CardTitle className="text-lg font-bold">学転AIアドバイザー</CardTitle>
            <CardDescription>
              AI があなたの経験・興味を分析し、最適なキャリアパスをご提案します
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Quick capability list */}
          <ul className="grid gap-3 text-sm text-gray-700 sm:grid-cols-2">
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 text-green-600" />
              職務経歴書 / ES の添削
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 text-green-600" />
              面接対策 & 質問リスト
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 text-green-600" />
              あなた専用キャリアパス提案
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 text-green-600" />
              企業研究のポイント提示
            </li>
          </ul>

          {/* CTA button */}
          <Button
            size="lg"
            className="w-full rounded-full bg-red-600 py-6 text-base font-semibold tracking-wide hover:bg-red-700"
            onClick={openAdvisor}
          >
            AIアドバイザーに相談する
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </>
  )
}