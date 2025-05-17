import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/lib/supabase/types";

export const runtime  = "edge";
export const dynamic  = "force-dynamic";   // ★ cookies() を同期で使う宣言

export async function POST(req: Request) {
  const cookieStore = cookies();           // 1回だけ取得
  const supabase    = createRouteHandlerClient<Database>({
    cookies: () => cookieStore,            // ★ createRouteHandlerClient v0 系
  });

  const { session } = await req.json();    // { access_token, ... } | null

  /* セッションが null = ログアウト扱い */
  if (session) {
    await supabase.auth.setSession(session);
  } else {
    await supabase.auth.signOut();
  }

  return NextResponse.json({ success: true });
}

/* 他メソッドは 405 */
export function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}