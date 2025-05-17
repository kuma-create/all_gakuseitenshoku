import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/types";

export const runtime = "edge"; // (任意) edge で動かす場合

export async function POST(req: Request) {
  try {
    // 受信 JSON を型アサートで取得 (json() は型引数を取らない)
    const { challengeId } = (await req.json()) as { challengeId: string };

    if (!challengeId)
      return NextResponse.json({ error: "challengeId required" }, { status: 400 });

    /* ---------- Supabase サーバークライアント ---------- */
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => [],
          setAll: () => {},
        },
      }
    );

    /* ---------- 認証チェック ---------- */
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const studentId = session.user.id;

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