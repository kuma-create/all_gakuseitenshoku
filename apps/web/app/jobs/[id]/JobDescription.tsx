"use client"

import { FileText } from "lucide-react"
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"

type Props = { html: string }

export default function JobDescription({ html }: Props) {
  return (
    <Card className="mb-6 border-0 shadow-md">
      <CardHeader className="border-b border-gray-100 bg-gray-50 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-bold">
          <FileText className="h-5 w-5 text-red-600" />
          業務内容
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="prose max-w-none text-gray-700">
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </CardContent>
    </Card>
  )
}
