"use client"

import React from "react"
import clsx from "clsx"
import { Badge } from "@/components/ui/badge"
import type { Database } from "@/lib/supabase/types"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs"

/* ---------- 型 ---------- */
type Student = Database["public"]["Tables"]["student_profiles"]["Row"] & {
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

/* ---------- Experience ---------- */
type Experience = {
  id: string
  user_id: string
  company_name: string | null
  role: string | null
  start_date: string | null
  end_date: string | null
  achievements: string | null
  created_at: string | null
  kind: string | null
  summary_text: string | null
  skill_text: string | null
  qualification_text: string | null
  payload: any
  order: number | null
}

// ----- Resume 型 -----
type Resume = {
  work_experiences: Experience[] | null
}

interface Props {
  student: Student | null
}

/* ---------- presenter helpers ---------- */
function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-base">{title}</h3>
      <div className="bg-gray-50 border rounded p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        {children}
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  multiline = false,
}: {
  label: string
  value: string | number | boolean | null | undefined
  multiline?: boolean
}) {
  return (
    <div className={multiline ? "col-span-full" : ""}>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p
        className={clsx(
          multiline ? "whitespace-pre-wrap" : "truncate",
          "text-sm",
        )}
      >
        {value !== null && value !== undefined && value !== ""
          ? String(value)
          : "―"}
      </p>
    </div>
  )
}

export default function StudentDetailTabs({ student }: Props) {
  if (!student)
    return (
      <div className="p-6 text-sm text-gray-500">
        左側のリストから学生を選択してください
      </div>
    )

  /* helpers */
  const fmtDate = (iso?: string | null) =>
    iso ? iso.slice(0, 7).replace("-", "/") : "―"

  /* ----- レジュメ( work_experiences ) 取得 ----- */
  const resume: Resume | null =
    Array.isArray(student.resumes) && student.resumes.length
      ? student.resumes[0]
      : null

  /* ---------- work_experiences 正規化 ---------- */
  const normalizeExperience = (raw: any, idx: number): Experience => ({
    id: String(raw.id ?? idx),
    user_id: student.id,
    company_name: raw.company_name ?? raw.company ?? null,
    role: raw.role ?? raw.position ?? null,
    start_date: raw.start_date ?? raw.startDate ?? null,
    end_date: raw.end_date ?? raw.endDate ?? null,
    achievements: raw.achievements ?? null,
    created_at: null,
    kind: raw.kind ?? null,
    summary_text: raw.summary_text ?? raw.description ?? null,
    skill_text: raw.skill_text ?? raw.technologies ?? null,
    qualification_text: raw.qualification_text ?? null,
    payload: raw,
    order: raw.order ?? idx,
  })

  /* work_experiences が配列でない場合も対応 */
  const raw = resume?.work_experiences

  const experiences: Experience[] = !raw
    ? []
    : (Array.isArray(raw) ? raw : [raw]).map(normalizeExperience)
console.log("DEBUG resume =", resume)
console.log("DEBUG experiences =", experiences)

  return (
    <Tabs defaultValue="basic" className="flex-1 overflow-y-auto">
      {/* ------------ タブバー ------------- */}
      <TabsList className="sticky top-0 z-10 bg-white">
        <TabsTrigger value="basic">基本情報</TabsTrigger>
        <TabsTrigger value="pr">自己PR</TabsTrigger>
        <TabsTrigger value="pref">希望条件</TabsTrigger>
        <TabsTrigger value="resume">職務経歴書</TabsTrigger>
      </TabsList>

      {/* ========== 基本情報 TAB ========== */}
      <TabsContent value="basic" className="p-6 space-y-6">
        <Section title="学歴">
          <Field label="大学" value={student.university} />
          <Field label="学部" value={student.faculty} />
          <Field label="学科" value={student.department} />
          <Field label="入学月" value={fmtDate(student.admission_month)} />
          <Field label="卒業月" value={fmtDate(student.graduation_month)} />
        </Section>

        <Section title="プロフィール">
          <Field label="性別" value={student.gender} />
          <Field label="ステータス" value={student.status} />
          <Field
            label="インターン経験"
            value={student.has_internship_experience ? "あり" : "なし"}
          />
          <Field label="研究テーマ" value={student.research_theme} multiline />
          <Field label="About" value={student.about} multiline />
          <Field label="興味分野" value={student.interests?.join(" / ")} />
        </Section>
      </TabsContent>

      {/* ========== 自己PR TAB ========== */}
      <TabsContent value="pr" className="p-6 space-y-6">
        <Section title="自己PR">
          <Field label="PR タイトル" value={student.pr_title} />
          <Field label="PR 本文" value={student.pr_body} multiline />
          <Field label="ひとこと自己紹介" value={student.pr_text} multiline />
          <Field
            label="Strength 1"
            value={student.strength1 ?? "―"}
            multiline
          />
          <Field
            label="Strength 2"
            value={student.strength2 ?? "―"}
            multiline
          />
          <Field
            label="Strength 3"
            value={student.strength3 ?? "―"}
            multiline
          />
        </Section>

        <Section title="スキル & 資格">
          <Field label="資格" value={student.qualification_text} multiline />
          <Field label="スキル詳細" value={student.skill_text} multiline />
          <Field
            label="語学スキル"
            value={student.language_skill}
            multiline
          />
        </Section>

        <Section title="職歴・プロジェクト">
          {experiences.length > 0 ? (
            <div className="col-span-full space-y-6">
              {experiences
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                .map((exp) => (
                  <div key={exp.id} className="bg-white rounded-md border p-4 space-y-1">
                    <Field label="企業・組織名" value={exp.company_name ?? "（社名未登録）"} />
                    <Field label="役職・ポジション" value={exp.role ?? "―"} />
                    <Field
                      label="在籍期間"
                      value={`${fmtDate(exp.start_date)} 〜 ${
                        exp.end_date ? fmtDate(exp.end_date) : "現在"
                      }`}
                    />
                    <Field label="業務内容" value={exp.summary_text} multiline />
                    <Field label="使用技術・ツール" value={exp.skill_text} multiline />
                    <Field label="成果・実績" value={exp.achievements} multiline />
                  </div>
                ))}
            </div>
          ) : (
            <Field label="" value="職歴・プロジェクト情報は未登録です。" multiline />
          )}
        </Section>
      </TabsContent>

      {/* ========== 希望条件 TAB ========== */}
      <TabsContent value="pref" className="p-6 space-y-6">
        <Section title="希望条件">
          <Field
            label="希望業界"
            value={student.desired_industries?.join(", ")}
          />
          <Field
            label="希望職種"
            value={student.desired_positions?.join(", ")}
          />
          <Field
            label="希望勤務地"
            value={student.desired_locations?.join(", ")}
          />
          <Field label="希望勤務形態" value={student.work_style} />
          <Field label="雇用形態" value={student.employment_type} />
          <Field label="希望年収" value={student.salary_range} />
          <Field
            label="働き方オプション"
            value={student.work_style_options?.join(", ")}
          />
          <Field label="補足メモ" value={student.preference_note} multiline />
        </Section>
      </TabsContent>

      {/* ========== 職務経歴書 TAB ========== */}
      <TabsContent value="resume" className="p-6 space-y-6">

        {/* 職歴 */}
        <Section title="職歴・プロジェクト">
          {experiences.length > 0 ? (
            <div className="col-span-full space-y-6">
              {experiences
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                .map((exp) => (
                  <div key={exp.id} className="bg-white rounded-md border p-4 space-y-1">
                    <Field label="企業・組織名" value={exp.company_name ?? "（社名未登録）"} />
                    <Field label="役職・ポジション" value={exp.role ?? "―"} />
                    <Field
                      label="在籍期間"
                      value={`${fmtDate(exp.start_date)} 〜 ${
                        exp.end_date ? fmtDate(exp.end_date) : "現在"
                      }`}
                    />
                    <Field label="業務内容" value={exp.summary_text} multiline />
                    <Field label="使用技術・ツール" value={exp.skill_text} multiline />
                    <Field label="成果・実績" value={exp.achievements} multiline />
                  </div>
                ))}
            </div>
          ) : (
            <Field label="" value="職歴・プロジェクト情報は未登録です。" multiline />
          )}
        </Section>

        {/* スキル & 資格 */}
        <Section title="スキル & 資格">
          <Field label="資格" value={student.qualification_text} multiline />
          <Field label="スキル詳細" value={student.skill_text} multiline />
          <Field label="語学スキル" value={student.language_skill} multiline />
        </Section>

        {/* 希望条件 */}
        <Section title="希望条件">
          <Field
            label="希望業界"
            value={student.desired_industries?.join(', ')}
          />
          <Field
            label="希望職種"
            value={student.desired_positions?.join(', ')}
          />
          <Field
            label="希望勤務地"
            value={student.desired_locations?.join(', ')}
          />
          <Field label="希望勤務形態" value={student.work_style} />
          <Field label="雇用形態" value={student.employment_type} />
          <Field label="希望年収" value={student.salary_range} />
          <Field
            label="働き方オプション"
            value={student.work_style_options?.join(', ')}
          />
        </Section>
      </TabsContent>
    </Tabs>
  )
}