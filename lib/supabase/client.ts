// lib/supabase/clients.ts
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"  // ← 型定義を使っている場合

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/** 👇 これを “唯一の” Supabase インスタンスとする */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
