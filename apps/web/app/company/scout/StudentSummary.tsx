"use client"

import {
  Mail,
  Phone,
  Calendar,
  GraduationCap,
  MapPin,
  Send,
} from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import type { Database } from "@/lib/supabase/types"

type Student = Database["public"]["Tables"]["student_profiles"]["Row"] & {
  /** ネスト取得したレジュメ */
  resumes?: {
    work_experiences: any[] | null
  }[]

  /* ──────── 追加: 型ジェネレーター未更新列を補完 ──────── */
  major?: string | null
  location?: string | null
  graduation_year?: number | null
  skills?: string[] | null
  has_internship_experience?: boolean | null
  status?: string | null
  email?: string | null
  phone?: string | null
}

interface Props {
  student: Student | null
  onScout: () => void
}

export default function StudentSummary({ student, onScout }: Props) {
  if (!student)
    return (
      <div className="flex h-full w-full items-center justify-center text-gray-400">
        学生を選択してください
      </div>
    )

  return (
    <aside className="w-full md:w-[26%] shrink-0 border-r p-6 space-y-6 sticky top-[56px] h-[calc(100vh-56px)] overflow-y-auto bg-white">
      {/* アバター＆氏名 */}
      <div className="text-center space-y-3">
        <Avatar className="h-24 w-24 mx-auto">
          <AvatarImage
            src={student.avatar_url ?? "/placeholder.svg"}
            alt={student.full_name ?? ""}
          />
          <AvatarFallback>
            {student.full_name?.slice(0, 2) ?? "👤"}
          </AvatarFallback>
        </Avatar>
        <h2 className="text-xl font-bold">{student.full_name}</h2>
        <div className="flex flex-wrap justify-center gap-1 text-xs">
          <Badge variant="outline">{student.university}</Badge>
          <Badge variant="outline">{student.major}</Badge>
          <Badge variant="outline">{student.graduation_year}卒</Badge>
        </div>
      </div>

      <Separator />

      {/* 連絡先 */}
      <div className="space-y-2 text-sm">
        {student.email && (
          <p className="flex items-center">
            <Mail className="h-4 w-4 mr-2" />
            {student.email}
          </p>
        )}
        {student.phone && (
          <p className="flex items-center">
            <Phone className="h-4 w-4 mr-2" />
            {student.phone}
          </p>
        )}
        {student.location && (
          <p className="flex items-center">
            <MapPin className="h-4 w-4 mr-2" />
            {student.location}
          </p>
        )}
      </div>

      <Separator />

      {/* 学歴・在籍 */}
      <div className="space-y-1 text-sm">
        {student.admission_month && (
          <p className="flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            入学 {student.admission_month.split("T")[0]}
          </p>
        )}
        {student.graduation_month && (
          <p className="flex items-center">
            <GraduationCap className="h-4 w-4 mr-2" />
            卒業 {student.graduation_month.split("T")[0]}
          </p>
        )}
      </div>

      {/* スカウト送りボタン */}
      <Button className="w-full mt-auto" onClick={onScout}>
        <Send className="h-4 w-4 mr-1" />
        スカウト送信
      </Button>
    </aside>
  )
}