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
  // 動的インポートで next/headers を読み込む
  const { cookies } = await /* @next-codemod-error The APIs under 'next/headers' are async now, need to be manually awaited. */
  import("next/headers");
  const cookieStore = await cookies();

  return createServerClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      // 型が緩いため ignore（実行時には Next.js の cookies() が返すものが使われます）
      // @ts-expect-error
      cookies: cookieStore as CookieOptions["cookies"],
    }
  );
}

// ─── ここでエイリアスを作成 ───────────────────────────────────────
/**
 * 通常の呼び出し名 `createClient` としても使えるようにするエイリアス
 */
export const createClient = createServerSupabase;
