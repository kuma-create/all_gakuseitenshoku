"use client"

import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Building } from "lucide-react"
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
    <div className="flex-1 overflow-y-auto p-6 space-y-8">
      {/* 自己PR */}
      <section>
        <h3 className="font-semibold text-lg mb-2">自己PR</h3>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {student.about ?? student.pr_body ?? "自己PRは未登録です。"}
        </p>
      </section>

      <Separator />

      {/* スキル & 興味 */}
      <section className="space-y-4">
        <div>
          <h4 className="font-semibold mb-1">技術スキル</h4>
          <div className="flex flex-wrap gap-2">
            {(student.skills ?? []).map((s) => (
              <Badge key={s} variant="secondary">
                {s}
              </Badge>
            ))}
            {student.skills?.length === 0 && (
              <span className="text-xs text-gray-400">未登録</span>
            )}
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-1">興味分野</h4>
          <div className="flex flex-wrap gap-2">
            {(student.interests ?? []).map((i) => (
              <Badge key={i}>{i}</Badge>
            ))}
            {student.interests?.length === 0 && (
              <span className="text-xs text-gray-400">未登録</span>
            )}
          </div>
        </div>
      </section>

      <Separator />

      {/* 経験・プロジェクト */}
      <section className="space-y-4">
        <h3 className="font-semibold text-lg flex items-center">
          <Building className="h-5 w-5 mr-2" />
          職歴・プロジェクト
        </h3>

        {experiences.length > 0 ? (
          experiences.map((exp, idx) => (
            <div
              key={idx}
              className="border-l-2 border-blue-300 pl-4 space-y-1"
            >
              <p className="font-medium">{exp?.company}</p>
              <p className="text-sm text-gray-600">{exp?.position}</p>
              <p className="text-xs text-gray-500">{exp?.period}</p>
              {exp?.description && (
                <p className="text-sm text-gray-700">{exp.description}</p>
              )}
            </div>
          ))
        ) : (
          <p className="text-xs text-gray-400">職歴・プロジェクト情報は未登録です。</p>
        )}
      </section>
    </div>
  )
}