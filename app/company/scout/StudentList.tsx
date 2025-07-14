"use client"

import { useState, useEffect } from "react"
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

/** ISO 文字列を `YYYY/MM/DD` 形式へ */
function formatDate(ts?: string | null): string | null {
  if (!ts) return null
  const date = new Date(ts)
  if (Number.isNaN(date.getTime())) return null

  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  return `${yyyy}/${mm}/${dd}`
}

/** 学生リストで追加メタ情報も扱えるよう intersection 型に */
type Student = Database["public"]["Tables"]["student_profiles"]["Row"] & {
  /** 動的計算されたマッチ度 */
  match_score?: number
  /** 最終アクティブ時刻を元にした表示用文字列 */
  last_active?: string

  /** student_profiles の last_sign_in_at */
  last_sign_in_at?: string | null

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

  work_experiences?: any[] | null
}

/** 最新のインターン先会社名を取得（複数スキーマ互換） */
function getLatestInternCompany(stu: Student): string | null {
  type RawExp = {
    company_name?: string | null
    company?: string | null
    name?: string | null
    start_date?: string | null
    end_date?: string | null
  }

  /* ----------------------------- 1) 現行スキーマ ----------------------------- */
  // student_profiles.work_experiences が直接来る場合
  const directWorkExps: RawExp[] = Array.isArray((stu as any).work_experiences)
    ? ((stu as any).work_experiences as RawExp[])
    : []

  /* ----------------------------- 2) resumes テーブル ----------------------------- */
  const resumesArray =
    Array.isArray(stu.resumes) ? stu.resumes : stu.resumes ? [stu.resumes] : []

  const resumesWorkExps: RawExp[] = resumesArray.flatMap((r) =>
    Array.isArray(r?.work_experiences) ? (r.work_experiences as RawExp[]) : []
  )

  /* ----------------------------- 3) 旧スキーマ fallback ----------------------------- */
  const legacyExps: RawExp[] = Array.isArray((stu as any).experiences)
    ? ((stu as any).experiences as RawExp[])
    : []

  /* ----------------------------- 集約＆整形 ----------------------------- */
  const exps: RawExp[] = [...directWorkExps, ...resumesWorkExps, ...legacyExps]
  if (exps.length === 0) return null

  // 日付が新しい順（end_date → start_date）でソート（null/空は最後）
  const sortKey = (e: RawExp) => e.end_date ?? e.start_date ?? ""
  exps.sort((a, b) => sortKey(b).localeCompare(sortKey(a)))

  const latest = exps[0]
  return latest.company_name ?? latest.company ?? latest.name ?? null
}

interface Props {
  /** 企業 ID */
  companyId?: string
  /** 学生一覧（表示順は上位コンポーネントでフィルタ／ソート済み） */
  students: Student[]
  /** 現在選択されている学生 ID（なければ null） */
  selectedId: string | null
  /** 学生カードがクリックされたときのハンドラ */
  onSelect: (student: Student) => void
}

export default function StudentList({ companyId, students, selectedId, onSelect }: Props) {
  const [memos, setMemos] = useState<Record<string, string>>({})

  useEffect(() => {
    const loadMemos = async () => {
      if (!companyId) {
        console.warn("StudentList: companyId is undefined; skip memo fetch")
        return
      }
      const { data, error } = await sb
        .from("company_student_memos")
        .select("student_id, memo")
        .eq("company_id", companyId)

      if (!error && data) {
        const initial = data.reduce<Record<string, string>>((acc, cur) => {
          acc[cur.student_id as string] = (cur.memo as string) ?? ""
          return acc
        }, {})
        setMemos(initial)
      } else if (error) {
        console.error("Load memos error:", error)
      }
    }
    loadMemos()
  }, [companyId ?? ""])

  return (
    <div className="space-y-4 overflow-y-auto p-4 max-h-full">
      {students.map((stu: Student) => {
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
                  <p className="text-[11px] text-gray-500 truncate">
                    登録: {formatDate(stu.created_at) ?? "－"} / 最終ログイン: {formatDate(stu.last_sign_in_at) ?? "－"}
                  </p>

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

                    {formatLastActive(stu.last_sign_in_at) && (
                      <Badge variant="outline" className="text-[10px]">
                        {formatLastActive(stu.last_sign_in_at)}
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
                    if (!companyId) {
                      console.error("Memo save aborted: companyId is undefined")
                      return
                    }
                    const memoText = (memos[stu.id] ?? "").trim()
                    const { error } = await sb
                      .from("company_student_memos")
                      .upsert(
                        {
                          student_id: stu.id,
                          company_id: companyId,
                          memo: memoText,               // ← 空文字でも OK（null だと型エラー）
                        } as Database["public"]["Tables"]["company_student_memos"]["Insert"]
                      )
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