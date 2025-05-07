// app/_actions/scoutActions.ts
"use server"

import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/supabase/types"

type ScoutRow = Database["public"]["Tables"]["scouts"]["Row"] & {
  company_profiles: Pick<
    Database["public"]["Tables"]["company_profiles"]["Row"],
    "company_name" | "logo_url"
  >
  jobs: Pick<Database["public"]["Tables"]["jobs"]["Row"], "title">
}

/** 学生 ID でスカウトを取得 */
export async function getScoutsByStudent(
  studentId: string
): Promise<ScoutRow[]> {
  // ◀︎ createClient が Promise を返す場合があるので await を付与
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("scouts")
    // companies→company_profiles、name→company_name に合わせる
    .select("*, company_profiles(company_name,logo_url), jobs(title)")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(`getScoutsByStudent failed: ${error.message}`)
  }

  // 明示的に型アサーション
  return (data as unknown) as ScoutRow[]
}

// もし他のアクション（updateScoutStatus など）もある場合は同じく
// const supabase = await createClient()
// を使ってから .from(...).select(...) してください。
