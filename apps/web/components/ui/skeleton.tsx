"use client"

import type React from "react"
import { cn } from "@/lib/utils"

/* ───────────────── Skeleton 基本 ────────────────── */
export function Skeleton(
  { className, ...props }: React.HTMLAttributes<HTMLDivElement>,
) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

/* 円形プレースホルダ（アバター等） */
export function SkeletonCircle({ size = 48 }: { size?: number }) {
  return (
    <Skeleton
      style={{ width: size, height: size }}
      className="rounded-full"
    />
  )
}

/* 1 行テキスト用 */
export function SkeletonText({ w = "w-full" }: { w?: string }) {
  return <Skeleton className={cn("h-4", w)} />
}

/* 任意の高さブロック（表・グラフのダミーなど） */
export function SkeletonBlock({ h = 180 }: { h?: number }) {
  return <Skeleton style={{ height: h }} />
}

/* カード用（求人などのタイル） */
export function SkeletonCard() {
  return (
    <div className="rounded-lg border p-4">
      <SkeletonBlock h={120} />
      <div className="mt-4 space-y-2">
        <SkeletonText />
        <SkeletonText w="w-1/2" />
      </div>
    </div>
  )
}

/* ─────────────── SkeletonList (通知一覧ローディング) ─────────────── */
export function SkeletonList({ length = 4 }: { length?: number }) {
  return (
    <ul className="space-y-4">
      {Array.from({ length }).map((_, i) => (
        <li key={i} className="rounded border p-4">
          <SkeletonText />
          <SkeletonText w="w-5/6" />
          <SkeletonText w="w-1/2" />
        </li>
      ))}
    </ul>
  )
}
