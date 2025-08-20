/* ------------------------------------------------------------------
   components/job-card.tsx
   - 一覧用カード（グリッド・リスト両対応）
   - カード全体が <Link> でクリック可能
------------------------------------------------------------------ */
"use client"

import Link   from "next/link"
import Image  from "next/image"
import { Heart } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { JobWithTags } from "@/lib/supabase/models"

type Props = {
  job: JobWithTags
  saved: boolean
  onToggleSave: (id: string) => void
  variant?: "grid" | "list"
}

export function JobCard({ job, saved, onToggleSave, variant = "grid" }: Props) {
  /* ------ 共通要素 ------ */
  const CompanyLogo = (
    <div className="relative h-12 w-12 overflow-hidden rounded-full border-2 border-white bg-white shadow-md md:h-14 md:w-14">
      {job.company?.logo ? (
        <Image
          src={job.company.logo}
          alt={job.company.name}
          fill
          className="object-cover"
        />
      ) : (
        <Image
          src="/placeholder.svg?width=56&height=56&text=Logo"
          alt="logo placeholder"
          fill
          className="object-contain"
        />
      )}
    </div>
  )

  const SaveBtn = (
    <button
      type="button"
      aria-label="保存する"
      onClick={e => {
        e.preventDefault() // Link遷移を阻止
        onToggleSave(job.id)
      }}
      className={cn(
        "rounded-full p-1 transition hover:text-red-500",
        saved ? "text-red-500" : "text-gray-400",
      )}
    >
      <Heart
        size={18}
        className={saved ? "fill-red-500" : ""}
        strokeWidth={1.5}
      />
    </button>
  )

  /* ======== GRID レイアウト ======== */
  if (variant === "grid") {
    return (
      <Link
        href={`/jobs/${job.id}`}
        className="group flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-lg focus-visible:outline focus-visible:ring-2"
      >
        {/* カバー画像 */}
        <div className="relative h-40 w-full">
          <Image
            src={
              job.company?.cover_image_url ??
              "/placeholder.svg?width=600&height=200&text=Company+Cover"
            }
            alt={job.company?.name ?? "cover"}
            fill
            className="object-cover transition group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          {job.is_new && (
            <Badge className="absolute right-3 top-3 bg-red-500">NEW</Badge>
          )}
          {job.is_featured && (
            <Badge className="absolute left-3 top-3 bg-yellow-400 text-yellow-900">
              おすすめ
            </Badge>
          )}
          {/* ロゴ */}
          <div className="absolute -bottom-6 left-4">{CompanyLogo}</div>
        </div>

        {/* 本文 */}
        <div className="flex flex-1 flex-col gap-3 px-4 pb-4 pt-8">
          <h3 className="line-clamp-1 text-lg font-semibold">
            {job.title}
          </h3>
          <p className="line-clamp-2 text-sm text-neutral-600">
            {job.description?.slice(0, 60)}
          </p>

          {/* タグ */}
          <div className="flex flex-wrap gap-1">
            {job.tags.slice(0, 4).map(t => (
              <Badge key={t} variant="secondary" className="rounded-full">
                {t}
              </Badge>
            ))}
          </div>

          <div className="mt-auto flex items-center justify-between text-xs text-neutral-500">
            <span>{job.location || "勤務地不問"}</span>
            {SaveBtn}
          </div>
        </div>
      </Link>
    )
  }

  /* ======== LIST レイアウト ======== */
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="group flex overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-lg focus-visible:outline focus-visible:ring-2"
    >
      {/* カバー */}
      <div className="relative hidden w-48 flex-none md:block">
        <Image
          src={
            job.company?.cover_image_url ??
            "/placeholder.svg?width=200&height=200&text=Cover"
          }
          alt="cover"
          fill
          className="object-cover"
        />
      </div>

      {/* 本文 */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {CompanyLogo}
            <div>
              <p className="text-sm font-medium">{job.company?.name}</p>
              <h3 className="line-clamp-1 text-base font-semibold">
                {job.title}
              </h3>
            </div>
          </div>
          {SaveBtn}
        </div>

        <p className="line-clamp-2 text-sm text-neutral-600">
            {job.description?.slice(0, 80)}
        </p>

        <div className="mt-auto flex flex-wrap gap-1 text-xs text-neutral-500">
          <span>{job.location || "勤務地不問"}</span>
          <span>・</span>
          <span>
            年収 {job.salary_min}〜{job.salary_max} 万円
          </span>
          {job.is_new && (
            <>
              <span>・</span>
              <Badge className="bg-red-500">NEW</Badge>
            </>
          )}
        </div>
      </div>
    </Link>
  )
}
