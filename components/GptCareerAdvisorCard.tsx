// components/GptCareerAdvisorCard.tsx
"use client"
import { useState } from "react"
import AdvisorDialog from "@/components/AdvisorDialog"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export default function GptCareerAdvisorCard() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* ---- カード本体 ---- */}
      <div
        className="group cursor-pointer p-6 rounded-lg border border-gray-200 bg-white hover:shadow-lg transition"
        onClick={() => setOpen(true)}
      >
        <h3 className="font-semibold text-lg mb-3">✨ GPTキャリアアドバイザー</h3>
        <p className="text-sm text-gray-600 mb-5">
          あなたの経験や興味から最適なキャリアパスを分析します…
        </p>
        <Button
          size="sm"
          className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md flex items-center justify-center gap-2 transition-colors"
          onClick={() => setOpen(true)}
        >
          AIアドバイザーに相談する <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      {/* ---- モーダル ---- */}
      <AdvisorDialog open={open} onOpenChange={setOpen} />
    </>
  )
}