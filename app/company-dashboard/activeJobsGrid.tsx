"use client"

import Link from "next/link"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Clock } from "lucide-react"

type Job = {
  id: string
  title: string
  applicants: number
  views: number | null
  days_left: number
}

export default function ActiveJobsGrid({ jobs }: { jobs: Job[] }) {
  /* ✅ 0 件のときはメッセージを表示 */
  if (jobs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-gray-500">
        公開中の求人はまだありません。
        <br />
        <Link
          href="/company/jobs/new"
          className="text-primary underline-offset-4 hover:underline"
        >
          新規求人を作成
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {jobs.map((j) => (
        /* カード全体をリンク化して詳細ページへ遷移できるようにする */
        <Link key={j.id} href={`/company/jobs/${j.id}`} className="block">
          <Card className="overflow-hidden hover:shadow-md transition-shadow">
            <CardHeader className="bg-gray-50 pb-2">
              <CardTitle className="text-base truncate">{j.title}</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-500">応募数</p>
                  <p className="font-medium">{j.applicants}</p>
                </div>
                <div>
                  <p className="text-gray-500">閲覧数</p>
                  <p className="font-medium">{j.views ?? "―"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500">掲載終了まで</p>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-red-600" />
                    <p className="font-medium">
                      {j.days_left !== undefined ? `${j.days_left}日` : "―"}
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
