"use client"

import Link from "next/link"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Clock } from "lucide-react"

type Selection = {
  id: string
  title: string
  applicants: number
  views: number | null
  days_left: number
}

export default function ActiveJobsGrid({ selections }: { selections: Selection[] }) {
  /* ✅ 0 件のときはメッセージを表示 */
  if (selections.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-gray-500">
        公開中の選考はまだありません。
        <br />
        <Link
          href="/company/selections/new"
          className="text-primary underline-offset-4 hover:underline"
        >
          新規選考を作成
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {selections.map((s) => (
        /* カード全体をリンク化して詳細ページへ遷移できるようにする */
        <Link key={s.id} href={`/company/selections/${s.id}`} className="block">
          <Card className="overflow-hidden hover:shadow-md transition-shadow">
            <CardHeader className="bg-gray-50 pb-2">
              <CardTitle className="text-base truncate">{s.title}</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-500">応募数</p>
                  <p className="font-medium">{s.applicants}</p>
                </div>
                <div>
                  <p className="text-gray-500">閲覧数</p>
                  <p className="font-medium">{s.views ?? "―"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500">掲載終了まで</p>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-red-600" />
                    <p className="font-medium">
                      {s.days_left !== undefined ? `${s.days_left}日` : "―"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
