import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/lib/supabase/types";

export const runtime = "edge"; // (任意) edge で動かす場合

export async function POST(req: Request) {
    console.log("Cookie:", req.headers.get("cookie")?.slice(0, 120));

    // 共通の supabase クライアント（後段でも再利用）
    const supabase = createRouteHandlerClient<Database>({ cookies });

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    console.log("Supabase user:", user, "error:", userErr);
  try {
    // 受信 JSON を型アサートで取得 (json() は型引数を取らない)
    const { challengeId } = (await req.json()) as { challengeId: string };

    if (!challengeId)
      return NextResponse.json({ error: "challengeId required" }, { status: 400 });

    // 認証チェックは POST ハンドラ冒頭で取得した user を使う
    if (!user)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const studentId = user.id;

    /* ---------- challenge_sessions に INSERT ---------- */
    const { data, error } = await supabase
      .from("challenge_sessions")
      .insert({
        id: crypto.randomUUID(),
        challenge_id: challengeId,
        student_id: studentId,
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({ sessionId: data.id }, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/* 他メソッドは 405 を返す */
export function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}