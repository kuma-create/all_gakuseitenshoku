/* ─── lib/supabase/models.ts ───────────────────────────────────────── */

import type { Database } from "./types"

/* 汎用ユーティリティ */
export type Nullable<T> = T | null

/* プロファイル型（1 回だけ定義） */
export interface CompanyPreview {
  id: string
  name: string
  logo_url: Nullable<string>
  cover_image_url?: Nullable<string>   // ← ★ 追加済みフィールドはここ
}

/* jobs テーブルの行 */
export type JobRow =
  Database["public"]["Tables"]["jobs"]["Row"] & {
    company?: CompanyPreview | null
  }

/* フロント用：JobRow + メタ情報 */
export interface JobWithTags extends JobRow {
  /** Supabase には無い、フロント専用フィールド */
  tags: string[]
  is_new: boolean
  is_hot: boolean
  is_recommended: boolean
  is_featured: boolean
  employment_type?: string | null  // ← テーブルに無いのでここで追加

  /* ✅ salary_min / salary_max は **JobRow に既にある** ため
        ここで再宣言しない！！ */
}
