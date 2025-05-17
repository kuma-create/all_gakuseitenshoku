import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/lib/supabase/types";

export const runtime = "edge";

export async function GET(req: Request) {
  const requestUrl  = new URL(req.url);
  const search      = requestUrl.searchParams;
  const code        = search.get("code");   // ← 文字列で取得
  const nextPath    = search.get("next") ?? "/student-dashboard";

  // Supabase クライアント
  const supabase = createRouteHandlerClient<Database>({ cookies });

  if (code) {
    // ① code -> session 交換
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error(error);
      return NextResponse.redirect(new URL("/login?error=callback", requestUrl));
    }
  }

  // ② next へリダイレクト
  return NextResponse.redirect(new URL(nextPath, requestUrl));
}