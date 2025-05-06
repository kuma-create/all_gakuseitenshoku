import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "./types"            // ← supabase gen で生成した型

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// ---------------------------------------------
// Singleton パターン:
//   - ブラウザでは globalThis にキャッシュ
//   - SSR (イベントハンドラ) でも new は一度だけ
// ---------------------------------------------
export const supabase =
  (globalThis as any).supabase ??
  createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)

// 開発時 (HMR) だけ globalThis に突っ込んで再利用
if (process.env.NODE_ENV !== "production") {
  ;(globalThis as any).supabase = supabase
}
