// app/_actions/scoutActions.ts
"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type ScoutRow = Database["public"]["Tables"]["scouts"]["Row"] & {
  companies: Pick<
    Database["public"]["Tables"]["companies"]["Row"],
    "name" | "logo"
  >;
  jobs: Pick<Database["public"]["Tables"]["jobs"]["Row"], "title">;
};

/** 学生 ID でスカウトを取得 */
export async function getScoutsByStudent(
  studentId: string
): Promise<ScoutRow[]> {
  // サーバー用クライアントを生成
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from("scouts")
    .select("*, companies(name, logo), jobs(title)")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`getScoutsByStudent failed: ${error.message}`);
  }

  return data as ScoutRow[];
}

/** スカウトのステータスを更新 */
export async function updateScoutStatus(
  scoutId: string,
  status: "pending" | "accepted" | "declined"
): Promise<void> {
  const supabase = await createServerSupabase();

  const { error } = await supabase
    .from("scouts")
    .update({ status })
    .eq("id", scoutId);

  if (error) {
    throw new Error(`updateScoutStatus failed: ${error.message}`);
  }
}
