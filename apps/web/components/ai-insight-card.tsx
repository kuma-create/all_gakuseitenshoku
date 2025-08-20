 "use client"

import { useState } from "react"
import AdvisorDialog from "@/components/AdvisorDialog"
import { ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sparkles, MessageSquare } from "lucide-react"

export type AiInsightCardProps = {}

export default function AiInsightCard({}: AiInsightCardProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
    <Card className="bg-gradient-to-br from-primary-700 to-primary-600 text-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center">
          <Sparkles className="mr-2 h-5 w-5 text-yellow-400" />
          GPTキャリアアドバイザー
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-300 mb-4">
          あなたの経験や興味から、最適なキャリアパスを分析します。質問に答えるだけで、AIがパーソナライズされたアドバイスを提供します。
        </p>
        <div className="bg-gray-800/50 rounded-lg p-3 mb-4">
          <div className="flex items-start mb-3">
            <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center mr-2 flex-shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="text-xs bg-gray-700/50 rounded-lg p-2">
              こんにちは！あなたのキャリア分析をお手伝いします。どんな業界に興味がありますか？
            </div>
          </div>
          <div className="flex items-start">
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center mr-2 flex-shrink-0">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div className="text-xs bg-gray-700/50 rounded-lg p-2">
              IT業界に興味があります。特にAIやデータ分析の分野で...
            </div>
          </div>
        </div>
        <Button
          className="w-full bg-white/10 hover:bg-white/20 justify-center gap-2"
          onClick={() => setOpen(true)}
        >
          AIアドバイザーに相談する <ArrowRight className="w-4 h-4" />
        </Button>
      </CardContent>
    </Card>
    <AdvisorDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
