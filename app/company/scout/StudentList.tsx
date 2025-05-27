"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import clsx from "clsx"
import type { Database } from "@/lib/supabase/types"
import { Card, CardContent } from "@/components/ui/card"

/** 学生リストで追加メタ情報も扱えるよう intersection 型に */
type Student = Database["public"]["Tables"]["student_profiles"]["Row"] & {
  /** 動的計算されたマッチ度 */
  match_score?: number
  /** 最終アクティブ時刻を元にした表示用文字列 */
  last_active?: string

  /** ネスト取得したレジュメ */
  resumes?: {
    work_experiences: any[] | null
  }[]

  /* ──────── 追加: 型ジェネレーター未更新列を補完 ──────── */
  major?: string | null
  location?: string | null
  skills?: string[] | null
  has_internship_experience?: boolean | null
  graduation_year?: number | null
  status?: string | null
}

interface Props {
  students: Student[]
  selectedId: string | null
  onSelect: (student: Student) => void
}

export default function StudentList({ students, selectedId, onSelect }: Props) {
  return (
    <div className="space-y-4 h-[calc(100vh-56px)] overflow-y-auto p-4">
      {students.map((stu) => (
        <Card
          key={stu.id}
          onClick={() => onSelect(stu)}
          className={clsx(
            "cursor-pointer transition hover:shadow-md",
            selectedId === stu.id && "ring-2 ring-indigo-400"
          )}
        >
          <CardContent className="p-4 flex items-start gap-3">
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarImage
                src={stu.avatar_url ?? "/placeholder.svg"}
                alt={stu.full_name ?? ""}
              />
              <AvatarFallback>{stu.full_name?.slice(0, 2) ?? "👤"}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{stu.full_name}</p>
              <p className="text-xs text-gray-500 truncate">{stu.university}</p>

              <div className="flex flex-wrap gap-1 mt-2">
                {stu.skills?.slice(0, 2).map((sk) => (
                  <Badge key={sk} variant="secondary" className="text-[10px]">
                    {sk}
                  </Badge>
                ))}
                <Badge variant="outline" className="text-[10px]">
                  {stu.graduation_year}卒
                </Badge>
                {typeof stu.match_score === "number" && (
                  <Badge variant="outline" className="text-[10px]">
                    {stu.match_score}%
                  </Badge>
                )}
              </div>
            </div>

            {stu.status && (
              <Badge variant="secondary" className="shrink-0 text-xs">
                {stu.status}
              </Badge>
            )}
          </CardContent>
        </Card>
      ))}
      {students.length === 0 && (
        <p className="text-sm text-gray-500 text-center pt-20">学生が見つかりません</p>
      )}
    </div>
  )
}