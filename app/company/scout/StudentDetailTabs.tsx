"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Building, MessageSquare } from "lucide-react"
import type { Database } from "@/lib/supabase/types"

type Experience = {
  company?: string
  position?: string
  period?: string
  description?: string
}

function isExperienceArray(data: unknown): data is Experience[] {
  return Array.isArray(data)
}

type Student = Database["public"]["Tables"]["student_profiles"]["Row"]

interface Props {
  student: Student | null
}

export default function StudentDetailTabs({ student }: Props) {
  if (!student) return null

  const experiences: Experience[] = isExperienceArray(student.experience)
    ? student.experience
    : []

  return (
    <Tabs defaultValue="profile" className="flex-1 overflow-y-auto p-6">
      <TabsList className="mb-6">
        <TabsTrigger value="profile">プロフィール</TabsTrigger>
        <TabsTrigger value="skills">スキル</TabsTrigger>
        <TabsTrigger value="career">経験</TabsTrigger>
        <TabsTrigger value="notes">メモ</TabsTrigger>
      </TabsList>

      {/* プロフィール */}
      <TabsContent value="profile" className="space-y-4">
        <h3 className="font-semibold text-lg">自己PR</h3>
        <p className="whitespace-pre-wrap">{student.about ?? student.pr_body}</p>
      </TabsContent>

      {/* スキル */}
      <TabsContent value="skills" className="space-y-4">
        <h3 className="font-semibold text-lg">技術スキル</h3>
        <div className="flex flex-wrap gap-2">
          {(student.skills ?? []).map((s) => (
            <Badge key={s} variant="secondary">
              {s}
            </Badge>
          ))}
        </div>
        <Separator />
        <h3 className="font-semibold text-lg">興味分野</h3>
        <div className="flex flex-wrap gap-2">
          {(student.interests ?? []).map((i) => (
            <Badge key={i}>{i}</Badge>
          ))}
        </div>
      </TabsContent>

      {/* 経験 */}
      <TabsContent value="career" className="space-y-6">
        <h3 className="font-semibold text-lg flex items-center">
          <Building className="h-5 w-5 mr-2" />
          職歴・プロジェクト
        </h3>

        {experiences.map((exp, idx) => (
          <div key={idx} className="border-l-2 border-blue-300 pl-4 space-y-1">
            <p className="font-medium">{exp?.company}</p>
            <p className="text-sm text-gray-600">{exp?.position}</p>
            <p className="text-xs text-gray-500">{exp?.period}</p>
            {exp?.description && (
              <p className="text-sm text-gray-700">{exp.description}</p>
            )}
          </div>
        ))}
      </TabsContent>

      {/* メモ（社内向け） */}
      <TabsContent value="notes">
        <p className="flex items-center text-sm text-gray-500">
          <MessageSquare className="h-4 w-4 mr-2" />
          社内向けメモ機能は今後実装予定です
        </p>
      </TabsContent>
    </Tabs>
  )
}