"use client"

import Image from "next/image"
import type { Dispatch, SetStateAction } from "react"

type Company = {
  id: string
  name: string | null
  logo: string | null
  cover_image_url: string | null
}

type Props = {
  job: any // TODO: narrow once shared types are available
  company: Company
  tags: string[]
  related: any[]
  apply: () => void
  hasApplied: boolean
  showForm: boolean
  setShowForm: Dispatch<SetStateAction<boolean>>
}

export default function FulltimeInfo({
  job,
  company,
  tags,
  related,
  apply,
  hasApplied,
  showForm,
  setShowForm,
}: Props) {
  /* ----- helpers ----- */
  const salary = job?.salary_min && job?.salary_max
    ? `${job.salary_min.toLocaleString()}〜${job.salary_max.toLocaleString()}円`
    : "非公開"

  return (
    <div className="space-y-8 px-6 py-10 max-w-4xl mx-auto">
      {/* === header === */}
      <header className="flex items-center space-x-3">
        {company.logo && (
          <Image
            src={company.logo}
            alt={company.name ?? "company logo"}
            width={48}
            height={48}
            className="rounded"
          />
        )}
        <h1 className="text-3xl font-bold tracking-tight">
          {job?.title ?? "求人詳細"}
        </h1>
      </header>

      {/* === summary === */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-gray-50 p-6 rounded">
        <div>
          <p className="text-gray-500 text-sm">企業名</p>
          <p className="font-medium">{company.name}</p>
        </div>
        <div>
          <p className="text-gray-500 text-sm">勤務地</p>
          <p className="font-medium">{job?.location ?? "未定"}</p>
        </div>
        <div>
          <p className="text-gray-500 text-sm">給与レンジ</p>
          <p className="font-medium">{salary}</p>
        </div>
        {job?.application_deadline && (
          <div>
            <p className="text-gray-500 text-sm">応募締切</p>
            <p className="font-medium">{job.application_deadline}</p>
          </div>
        )}
        {tags.length > 0 && (
          <div className="sm:col-span-2">
            <p className="text-gray-500 text-sm">タグ</p>
            <p className="font-medium">{tags.join(" / ")}</p>
          </div>
        )}
      </section>

      {/* === description === */}
      {job?.description && (
        <section>
          <h2 className="text-xl font-semibold mb-3">仕事内容</h2>
          <p className="whitespace-pre-wrap leading-relaxed">
            {job.description}
          </p>
        </section>
      )}

      {/* === apply button === */}
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
            {showForm ? "確認して応募" : "この求人に応募する"}
          </button>
        )}
      </div>

      {/* === related jobs === */}
      {related.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-3">同じ企業の他求人</h2>
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