// lib/supabase/models.ts
import type { Database } from "@/lib/supabase/types"

/* ---------- Supabase の行型 ---------- */
type JobRow = Database["public"]["Tables"]["jobs"]["Row"]
type TagRow = Database["public"]["Tables"]["job_tags"]["Row"]

/* ---------- アプリ用の拡張型 ---------- */
/* ---------- アプリ用の拡張型 ---------- */
export type Job = JobRow & {
  salary_min?: number | null
  salary_max?: number | null

  /** DB から取得する列 */
  cover_image_url?: string | null
  is_recommended : boolean | null          // ★ 追加

  /** 会社サブクエリ結果 */
  company?: {
    name?: string | null
    logo_url?: string | null
    cover_image_url?: string | null
  } | null
}

export type JobWithTags = Job & {
  tags          : string[]
  is_new        : boolean
  is_featured   : boolean
  employment_type?: string | null
}

export type JobTag      = TagRow
export type CompanyPreview = {
  name: string | null
  logo_url: string | null
  cover_image_url: string | null
}

