// lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "./types"

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
/* 既存の createClient() が必要なら↓も残す */
export const createClient = () => supabase
