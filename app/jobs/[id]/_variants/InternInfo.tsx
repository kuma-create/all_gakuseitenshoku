"use client"

import React from "react"

import Image from "next/image"
import type { Dispatch, SetStateAction } from "react"

type Company = {
  id: string
  name: string | null
  logo_url: string | null
  cover_image_url: string | null
  industry: string | null
  founded_year: number | null
  employee_count: number | null
  location: string | null
  description: string | null
}

type Props = {
  job: any // TODO: refine to SelectionRow
  company: Company
  tags: string[]
  related: any[]
  apply: () => void
  hasApplied: boolean
  showForm: boolean
  setShowForm: Dispatch<SetStateAction<boolean>>
}

export default function InternInfo({
  job,
  company,
  tags,
  related,
  apply,
  hasApplied,
  showForm,
  setShowForm,
}: Props) {
  /* helpers */
  const period =
    job?.internship?.period ??
    `${job?.internship?.start_date ?? "—"} 〜 ${job?.internship?.end_date ?? "—"}`
  const workingDays = job?.internship?.working_days ?? "応相談"
  const hourlyWage =
    job?.salary_min && job?.salary_max
      ? `${job.salary_min.toLocaleString()}〜${job.salary_max.toLocaleString()}円／時`
      : "要相談"

  return (
    <div className="space-y-8 px-6 py-10 max-w-4xl mx-auto">
      {/* header */}
      <header className="flex items-center space-x-3">
        {company.logo_url && (
          <Image
            src={company.logo_url}
            alt={company.name ?? "company logo"}
            width={48}
            height={48}
            className="rounded"
          />
        )}
        <h1 className="text-3xl font-bold tracking-tight">
          {job?.title ?? "インターンシップ詳細"}
        </h1>
      </header>

      {/* summary */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-gray-50 p-6 rounded">
        <div>
          <p className="text-gray-500 text-sm">企業名</p>
          <p className="font-medium">{company.name}</p>
        </div>
        <div>
          <p className="text-gray-500 text-sm">実施期間</p>
          <p className="font-medium">{period}</p>
        </div>
        <div>
          <p className="text-gray-500 text-sm">勤務日数</p>
          <p className="font-medium">{workingDays}</p>
        </div>
        <div>
          <p className="text-gray-500 text-sm">報酬</p>
          <p className="font-medium">{hourlyWage}</p>
        </div>
        {tags.length > 0 && (
          <div className="sm:col-span-2">
            <p className="text-gray-500 text-sm">タグ</p>
            <p className="font-medium">{tags.join(" / ")}</p>
          </div>
        )}
      </section>

      {/* description */}
      {job?.description && (
        <section>
          <h2 className="text-xl font-semibold mb-3">インターン内容</h2>
          <p className="whitespace-pre-wrap leading-relaxed">
            {job.description}
          </p>
        </section>
      )}

      {/* apply button */}
      <div>
        {hasApplied ? (
          <button
            className="px-8 py-2 rounded bg-gray-300 text-gray-600 cursor-not-allowed"
            disabled
          >
            応募済み
          </button>
        ) : (
          <button
            onClick={() => {
              if (!showForm) setShowForm(true)
              else apply()
            }}
            className="px-8 py-2 rounded bg-primary text-white hover:opacity-90 transition"
          >
            {showForm ? "確認して応募" : "このインターンに応募する"}
          </button>
        )}
      </div>

      {/* related */}
      {related.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-3">関連インターン</h2>
          <ul className="space-y-1 list-disc list-inside text-sm text-gray-700">
            {related.map((r) => (
              <li key={r.id}>{r.title}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}