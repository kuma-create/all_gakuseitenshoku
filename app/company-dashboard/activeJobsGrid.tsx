"use client"

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
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {jobs.map((j) => (
        <Card key={j.id} className="overflow-hidden">
          <CardHeader className="bg-gray-50 pb-2">
            <CardTitle className="text-base">{j.title}</CardTitle>
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
                  <p className="font-medium">{j.days_left}日</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
