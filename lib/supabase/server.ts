// lib/supabase/server.ts

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "./types";

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * サーバーサイド専用の Supabase クライアントを返します。
 * next/headers は動的インポートすることでクライアントバンドルを汚染しません。
 */
export async function createServerSupabase() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();

  return createServerClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      // クッキーの型定義が緩いため @ts-expect-error で無視
      // 実行時には Next.js の cookies() が返すものが正しく使われます
      // 型: CookieOptions["cookies"]
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      cookies: cookieStore,
    }
  );
}
