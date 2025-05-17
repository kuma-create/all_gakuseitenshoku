// app/api/start-session/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/types";

export const dynamic  = "force-dynamic";   // ← cookies() を同期取得するため
export const revalidate = 0;               // ISR 無効

export async function POST(req: NextRequest) {
  /* ------------------------------------------------------------
   * 1) Supabase クライアントを “リクエストに紐づいた Cookie” で生成
   * ---------------------------------------------------------- */
  const res = NextResponse.next();         // ← ここに Cookie を付与して返す
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () =>
          req.cookies.getAll().map(({ name, value }) => ({ name, value })),
        setAll: (cs) => cs.forEach((c) => res.cookies.set(c)),
      },
    },
  );

  /* ------------------------------------------------------------
   * 2) 認証チェック
   * ---------------------------------------------------------- */
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  /* ------------------------------------------------------------
   * 3) challenge_sessions へ開始レコードを挿入
   * ---------------------------------------------------------- */
  const { challenge_id } = await req.json() as { challenge_id: string };

  const { data, error } = await supabase
    .from("challenge_sessions")
    .insert({
      challenge_id,
      student_id: user.id,
      started_at: new Date().toISOString(), // ← 開始時刻を残す
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  /* ------------------------------------------------------------
   * 4) フロントにセッション ID を返す
   * ---------------------------------------------------------- */
  return NextResponse.json({ session: data }, { status: 201, headers: res.headers });
}

/* 他メソッドは 405 */
export function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}