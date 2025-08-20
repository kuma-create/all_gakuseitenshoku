import { supabase } from "./supabase/client";
import type { Database } from "./supabase/types";
// ------------------------------------------------------------
// 補助的なクエリオプション。
// 必要に応じてプロパティを追加して拡張してください。
interface OtherOpts {
  /** 公開フラグ */
  published?: boolean;
  /** 任意の追加フィルタ */
  [key: string]: any;
}
// ------------------------------------------------------------
// lib/queries.ts
export async function getListings({
    selectionType,
    ...opts
  }: { selectionType?: Database["public"]["Enums"]["selection_type"] } & OtherOpts) {
    let q = supabase.from("jobs").select("*")
    if (selectionType) q = q.eq("selection_type", selectionType)
    // ほかフィルタ（published etc.）
    return await q
  }