"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type Row = {
  id: string
  student_name: string
  job_title: string | null
  created_at: string
  status: string | null
}

export default function ApplicationsTable({ applications }: { applications: Row[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b text-left text-sm text-gray-500">
            <th className="pb-2">応募者名</th>
            <th className="pb-2">応募職種</th>
            <th className="pb-2">応募日</th>
            <th className="pb-2">ステータス</th>
            <th className="pb-2">アクション</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((a) => (
            <tr key={a.id} className="border-b">
              <td className="py-3">{a.student_name}</td>
              <td className="py-3">{a.job_title}</td>
              <td className="py-3">{a.created_at}</td>
              <td className="py-3">
                <Badge variant="secondary">{a.status ?? "―"}</Badge>
              </td>
              <td className="py-3">
                <Button variant="outline" size="sm">
                  詳細
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
