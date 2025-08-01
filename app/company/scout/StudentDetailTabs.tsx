"use client"

import React, { useState, useMemo, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import clsx from "clsx"
import type { Database } from "@/lib/supabase/types"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"

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
  phone?: string | null
  email?: string | null

  student_with_email?: {
    email: string | null
  } | null
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
  showContact?: boolean
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

/* ----- Timeline item component (numbered & vertical line) ----- */
function TimelineItem({
  idx,
  exp,
  fmtDate,
}: {
  idx: number
  exp: Experience
  fmtDate: (iso?: string | null) => string
}) {
  return (
    <div className="relative pl-12 pb-10 first:pt-0 last:pb-0">
      {/* vertical line */}
      <span className="absolute left-4 top-0 h-full w-px bg-purple-300" />

      {/* index badge */}
      <span className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-white text-sm font-semibold">
        {idx + 1}
      </span>

      {/* content */}
      <div className="space-y-2">
        {/* header */}
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between">
          <h4 className="font-semibold text-sm sm:text-base">
            {exp.company_name ?? "（社名未登録）"}
          </h4>
          <span className="text-xs text-gray-500 mt-0.5 sm:mt-0">
            {fmtDate(exp.start_date)} 〜{" "}
            {exp.end_date ? fmtDate(exp.end_date) : "現在"}
          </span>
        </div>

        {exp.role && <p className="text-xs text-gray-500">{exp.role}</p>}

        {exp.summary_text && (
          <p className="text-sm whitespace-pre-wrap">{exp.summary_text}</p>
        )}

        {exp.skill_text && (
          <p className="text-xs text-gray-500">
            <span className="font-semibold">技術:</span> {exp.skill_text}
          </p>
        )}

        {exp.achievements && (
          <p className="text-xs text-gray-500">
            <span className="font-semibold">実績:</span> {exp.achievements}
          </p>
        )}
      </div>
    </div>
  )
}

export default function StudentDetailTabs({ student, showContact = false }: Props) {
  if (!student)
    return (
      <div className="p-6 text-sm text-gray-500">
        左側のリストから学生を選択してください
      </div>
    )

  const router = useRouter()

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

  const [experiences, setExperiences] = useState<Experience[]>(() =>
    !raw ? [] : (Array.isArray(raw) ? raw : [raw]).map(normalizeExperience),
  )

  // --- fallback: resume が無い場合は Supabase から取得 ---
  useEffect(() => {
    if (resume) return
    if (!student.user_id) return

    ;(async () => {
      const { data, error } = await supabase
        .from("resumes")
        .select("work_experiences")
        .eq("user_id", student.user_id!)
        .maybeSingle()

      if (error || !data?.work_experiences) return

      const list = Array.isArray(data.work_experiences)
        ? data.work_experiences
        : [data.work_experiences]

      setExperiences(list.map((raw: any, idx: number) => normalizeExperience(raw, idx)))
    })()
  }, [resume, student.user_id])

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 border-b bg-white sticky top-0 z-20">
        <span className="text-sm font-medium text-gray-700">学生詳細</span>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1"
          onClick={() => router.push("/company/scout/templates")}
        >
          <Settings className="h-4 w-4" />
          テンプレ管理
        </Button>
      </div>
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
            <Field label="卒業月" value={fmtDate(student.graduation_month)} />
          </Section>

          <Section title="プロフィール">
            <Field
              label="性別"
              value={
                student.gender === "male"
                  ? "男"
                  : student.gender === "female"
                  ? "女"
                  : "―"
              }
            />
            <Field
              label="インターン経験"
              value={student.has_internship_experience ? "あり" : "なし"}
            />
            <Field label="研究テーマ" value={student.research_theme} multiline />
            <Field label="About" value={student.about} multiline />
            <Field label="興味分野" value={student.interests?.join(" / ")} />
            {showContact && (
              <>
                {/* 電話は改行可＆ホバーで全文ツールチップ */}
                <div className="col-span-full">
                  <p className="text-xs text-gray-500 mb-0.5">電話</p>
                  <p
                    className="text-sm text-gray-900 break-all dark:text-gray-100"
                    title={student.phone ?? ""}
                  >
                    {student.phone ?? "―"}
                  </p>
                </div>
                {/* メールは改行可＆ホバーで全文ツールチップ */}
                <div className="col-span-full">
                  <p className="text-xs text-gray-500 mb-0.5">メール</p>
                  <p
                    className="text-sm text-gray-900 break-all dark:text-gray-100"
                    title={student.student_with_email?.email ?? student.email ?? ""}
                  >
                    {student.student_with_email?.email ?? student.email ?? "―"}
                  </p>
                </div>
              </>
            )}
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
              <div className="col-span-full">
                {experiences
                  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                  .map((exp, i) => (
                    <TimelineItem key={exp.id} idx={i} exp={exp} fmtDate={fmtDate} />
                  ))}
              </div>
            ) : (
              <Field label="" value="職歴・プロジェクト情報は未登録です。" multiline />
            )}
          </Section>
        </TabsContent>
      </Tabs>
    </div>
  )
}