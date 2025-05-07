// lib/supabase/server.ts
import { cookies } from "next/headers"
import { createServerClient, type CookieOptions } from "@supabase/ssr"
import type { Database } from "./types"

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function createClient() {
  // cookies() が Promise<ReadonlyRequestCookies> を返すなら await で解決
  const store = await cookies()

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    // CookieMethodsServer に合わせて getAll / setAll を実装
    cookies: {
      getAll: () => {
        // Next.js の store.getAll() は { name, value }[] を返す
        return store.getAll().map((c) => ({
          name:  c.name,
          value: c.value,
        }))
      },
      setAll: (supabaseCookies) => {
        // Supabase が渡してくる配列を store.set に流し込む
        supabaseCookies.forEach(({ name, value, options }) => {
          store.set(name, value, options)
        })
      },
    },
  })
}
