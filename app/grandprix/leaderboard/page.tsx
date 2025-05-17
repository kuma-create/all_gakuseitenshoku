// app/api/start-session/route.ts
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/lib/supabase/types";

/**
 * POST /api/start-session
 * Body: { challenge_id: uuid }
 *
 * 1. 認証済みユーザーか確認
 * 2. 同じ challenge_id で既にセッションがあればそれを返し、
 *    無ければ insert して返す
 */
export const runtime = "edge";
export const dynamic = "force-dynamic";
export const revalidate = 0; // disable ISR

export async function POST(req: NextRequest) {
  /* ---------- Supabase client (Edge) ---------- */
  const supabase = createRouteHandlerClient<Database>({ cookies });

  /* ---------- 認証ユーザー取得 ---------- */
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  /* ---------- request body ---------- */
  const { challenge_id } = (await req.json()) as { challenge_id?: string };

  if (!challenge_id) {
    return NextResponse.json({ error: "challenge_id required" }, { status: 400 });
  }

  /* ---------- 既存セッションがあるか確認 ---------- */
  const { data: existing, error: existsErr } = await supabase
    .from("challenge_sessions")
    .select("*")
    .eq("challenge_id", challenge_id)
    .eq("student_id", user.id)
    .maybeSingle();

  if (existsErr) {
    return NextResponse.json({ error: existsErr.message }, { status: 500 });
  }
  if (existing) {
    return NextResponse.json({ session: existing }, { status: 200 });
  }

  /* ---------- 新規 insert ---------- */
  const { data, error } = await supabase
    .from("challenge_sessions")
    .insert(
      {
        challenge_id,
        student_id: user.id,
        started_at: new Date().toISOString(),
      },
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ session: data }, { status: 201 });
}

/* Allow only POST */
export function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}