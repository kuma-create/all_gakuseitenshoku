/* ─── lib/supabase/models.ts ───────────────────────────────────────── */
import type { Database } from "./types"

/* 汎用ユーティリティ */
export type Nullable<T> = T | null

/* CompanyPreview を DB のカラム名に合わせる */
export interface CompanyPreview {
  id: string
  name: string
  logo: Nullable<string>               // ← logo_url → logo に
  cover_image_url?: Nullable<string>   // ← そのまま
}

/* jobs テーブルのオリジナル行 */
export type JobRow = Database["public"]["Tables"]["jobs"]["Row"]

/* フロント用：JobRow + メタ情報 */
export interface JobWithTags extends JobRow {
  company?: CompanyPreview | null
  tags: string[]
  is_new: boolean
  is_hot: boolean
  is_recommended: boolean
  is_featured: boolean
  employment_type?: string | null
  // salary_min / salary_max は元の Row にすでに含まれている想定
}

/* job_tags テーブルの行 */
export type TagRow = Database["public"]["Tables"]["job_tags"]["Row"]
