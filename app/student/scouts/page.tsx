"use client"

import React from "react"
import { ScoutNotification } from "@/components/scout-notification"

// 仮のスカウトデータ
const mockScouts = [
  {
    id: "1",
    companyName: "テクノロジー株式会社",
    position: "ソフトウェアエンジニア（新卒）",
    message:
      "当社のエンジニアチームに興味を持っていただけませんか？あなたのスキルセットと経験が、私たちの現在のプロジェクトに非常に適していると考えています。詳細についてお話しできれば幸いです。",
    createdAt: "2023-05-15T09:30:00Z",
    status: "pending",
    companyLogo: "/abstract-tech-logo.png",
  },
  {
    id: "2",
    companyName: "グローバルコンサルティング",
    position: "ビジネスアナリスト（インターン）",
    message:
      "あなたの分析スキルと問題解決能力に感銘を受けました。当社のサマーインターンシッププログラムについて詳しく知りたいと思いませんか？",
    createdAt: "2023-05-10T14:20:00Z",
    status: "accepted",
    companyLogo: "/consulting-firm-logo.png",
  },
  {
    id: "3",
    companyName: "フィンテックスタートアップ",
    position: "プロダクトマネージャー（新卒）",
    message:
      "あなたのプロフィールを拝見し、当社の製品チームに最適な人材だと感じました。革新的な金融ソリューションの開発に興味はありませんか？",
    createdAt: "2023-05-05T11:45:00Z",
    status: "declined",
    companyLogo: "/finance-company-logo.png",
  },
] as const

export default function ScoutsPage() {
  const [scouts, setScouts] = React.useState(mockScouts)
  const [loading, setLoading] = React.useState(false)

  const handleAccept = async (id: string) => {
    setLoading(true)
    // 実際の実装ではAPIリクエストを行う
    try {
      // await acceptScout(id);
      setScouts(scouts.map((scout) => (scout.id === id ? { ...scout, status: "accepted" as const } : scout)))
    } catch (error) {
      console.error("Error accepting scout:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDecline = async (id: string) => {
    setLoading(true)
    // 実際の実装ではAPIリクエストを行う
    try {
      // await declineScout(id);
      setScouts(scouts.map((scout) => (scout.id === id ? { ...scout, status: "declined" as const } : scout)))
    } catch (error) {
      console.error("Error declining scout:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">スカウト一覧</h1>

      <div className="space-y-6">
        {scouts.length > 0 ? (
          scouts.map((scout) => (
            <ScoutNotification
              key={scout.id}
              scout={scout}
              onAccept={handleAccept}
              onDecline={handleDecline}
              isLoading={loading}
            />
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">現在、スカウトはありません。</p>
          </div>
        )}
      </div>
    </div>
  )
}
