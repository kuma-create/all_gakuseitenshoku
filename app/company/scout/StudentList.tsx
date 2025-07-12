"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Check } from "lucide-react"
import clsx from "clsx"
import type { Database } from "@/lib/supabase/types"
import { Card, CardContent } from "@/components/ui/card"
import { supabase as sb } from "@/lib/supabase/client"

/** 最終アクティブを「○分前 / ○時間前 / ○日前」に整形 */
function formatLastActive(ts?: string | null): string | null {
  if (!ts) return null
  const date = new Date(ts)
  if (Number.isNaN(date.getTime())) return null

  const diffMs = Date.now() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))

  if (diffMins < 1) return "たった今"
  if (diffMins < 60) return `${diffMins}分前`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}時間前`

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}日前`
}

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
  qualifications?: string[] | null
  has_internship_experience?: boolean | null
  graduation_year?: number | null
  profile_completion?: number | null
  status?: string | null
}

/** 最新のインターン先会社名を取得 */
function getLatestInternCompany(stu: Student): string | null {
  type RawExp = {
    company_name?: string | null
    company?: string | null
    name?: string | null
    start_date?: string | null
    end_date?: string | null
  }

  // ---- 1) resumes → work_experiences ----
  // stu.resumes が配列でない場合（単一オブジェクト or null）も吸収
  const resumesArray =
    Array.isArray(stu?.resumes)
      ? stu.resumes
      : stu?.resumes
      ? [stu.resumes]
      : []

  const resumeExps: RawExp[] = resumesArray.flatMap((r) =>
    (r?.work_experiences as RawExp[] | null | undefined) ?? []
  )

  // ---- 2) fallback: stu.experiences (旧スキーマ) ----
  const directExps: RawExp[] = Array.isArray((stu as any)?.experiences)
    ? (stu as any).experiences
    : []

  const exps: RawExp[] = [...resumeExps, ...directExps]
  if (exps.length === 0) return null

  // end_date → start_date の降順でソート
  const sortKey = (e: RawExp) => e.end_date ?? e.start_date ?? ""
  exps.sort((a, b) => sortKey(b).localeCompare(sortKey(a)))

  const latest = exps[0]
  return latest.company_name ?? latest.company ?? latest.name ?? null
}

interface Props {
  students: Student[]
  selectedId: string | null
  onSelect: (student: Student) => void
}

export default function StudentList({ students, selectedId, onSelect }: Props) {
  const [memos, setMemos] = useState<Record<string, string>>({})

  return (
    <div className="space-y-4 overflow-y-auto p-4 max-h-full">
      {students.map((stu) => {
        const company = getLatestInternCompany(stu)
        return (
          <Card
            key={stu.id}
            onClick={() => onSelect(stu)}
            className={clsx(
              "cursor-pointer transition hover:shadow-md",
              selectedId === stu.id && "ring-2 ring-indigo-400"
            )}
          >
            <CardContent className="p-4 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12 shrink-0">
                  {stu.avatar_url ? (
                    <AvatarImage src={stu.avatar_url} alt={stu.full_name ?? ""} />
                  ) : null}
                  <AvatarFallback>
                    {stu.avatar_url ? null : company?.slice(0, 2) ?? "👤"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{stu.university}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {company ?? "インターン情報なし"}
                  </p>
                  {(stu.major || stu.location) && (
                    <p className="text-[11px] text-gray-500 truncate">
                      {[stu.major, stu.location].filter(Boolean).join(" / ")}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1 mt-2">
                    {stu.skills?.slice(0, 2).map((sk) => (
                      <Badge key={sk} variant="secondary" className="text-[10px]">
                        {sk}
                      </Badge>
                    ))}

                    {stu.qualifications?.slice(0, 1).map((ql) => (
                      <Badge key={ql} variant="secondary" className="text-[10px]">
                        {ql}
                      </Badge>
                    ))}

                    {stu.has_internship_experience && (
                      <Badge variant="outline" className="text-[10px]">
                        インターン
                      </Badge>
                    )}

                    {formatLastActive(stu.last_active) && (
                      <Badge variant="outline" className="text-[10px]">
                        {formatLastActive(stu.last_active)}
                      </Badge>
                    )}

                    {stu.graduation_year && (
                      <Badge variant="outline" className="text-[10px]">
                        {stu.graduation_year}卒
                      </Badge>
                    )}

                    {typeof stu.profile_completion === "number" && (
                      <Badge variant="outline" className="text-[10px]">
                        記載率{stu.profile_completion}%
                      </Badge>
                    )}

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
              </div>
              <div
                className="flex items-center gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <Input
                  placeholder="メモを入力"
                  className="flex-1 text-sm"
                  value={memos[stu.id] ?? ""}
                  onChange={(e) => {
                    e.stopPropagation()
                    setMemos({ ...memos, [stu.id]: e.target.value })
                  }}
                />
                <Check
                  className="h-5 w-5 text-green-500 cursor-pointer"
                  onClick={async (e) => {
                    e.stopPropagation()
                    const memoText = memos[stu.id] ?? ""
                    const { error } = await sb
                      .from("student_profiles")
                      .update({ memo: memoText })
                      .eq("id", stu.id)
                    if (error) console.error("Memo save error:", error)
                  }}
                />
              </div>
            </CardContent>
          </Card>
        )
      })}
      {students.length === 0 && (
        <p className="text-sm text-gray-500 text-center pt-20">学生が見つかりません</p>
      )}
    </div>
  )
}