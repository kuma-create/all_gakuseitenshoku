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
  job: any // TODO: narrow to SelectionRow once shared types are exported
  company: Company
  tags: string[]
  related: any[]
  apply: () => void
  hasApplied: boolean
  showForm: boolean
  setShowForm: Dispatch<SetStateAction<boolean>>
}

export default function EventInfo({
  job,
  company,
  tags,
  related,
  apply,
  hasApplied,
  showForm,
  setShowForm,
}: Props) {
  return (
    <div className="space-y-8 px-6 py-10 max-w-3xl mx-auto">
      {/* --- header --- */}
      <div className="flex items-center space-x-3">
        {company.logo_url && (
          <Image
            src={company.logo_url}
            alt={company.name ?? "company logo"}
            width={40}
            height={40}
            className="rounded"
          />
        )}
        <h1 className="text-2xl font-semibold">
          {job?.title ?? "イベント詳細"}
        </h1>
      </div>

      {/* --- basic info --- */}
      <section className="space-y-2">
        <p className="text-gray-600">{company.name}</p>
        {job?.application_deadline && (
          <p className="text-sm text-gray-500">
            応募締切：{job.application_deadline}
          </p>
        )}
        {tags.length > 0 && (
          <p className="text-sm text-gray-500">
            タグ：{tags.join(" / ")}
          </p>
        )}
      </section>

      {/* --- description --- */}
      {job?.description && (
        <section>
          <h2 className="font-medium mb-2">概要</h2>
          <p className="whitespace-pre-wrap">{job.description}</p>
        </section>
      )}

      {/* --- action --- */}
      <div>
        {hasApplied ? (
          <button
            className="px-6 py-2 rounded bg-gray-300 text-gray-600 cursor-not-allowed"
            disabled
          >
            申し込み済み
          </button>
        ) : (
          <button
            onClick={() => {
              if (!showForm) setShowForm(true)
              else apply()
            }}
            className="px-6 py-2 rounded bg-primary text-white hover:opacity-90 transition"
          >
            {showForm ? "確認して応募" : "このイベントに申し込む"}
          </button>
        )}
      </div>

      {/* --- related --- */}
      {related.length > 0 && (
        <section>
          <h2 className="font-medium mb-3">関連イベント</h2>
          <ul className="space-y-1 list-disc list-inside text-sm text-gray-600">
            {related.map((r) => (
              <li key={r.id}>{r.title}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}