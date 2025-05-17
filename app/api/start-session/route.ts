// app/api/start-session/route.ts
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/lib/supabase/types";

/**
 * POST /api/start-session
 * Body: { challenge_id: uuid }
 *
 * 必須: 認証済みユーザー (学生)
 *  1. challenge_sessions に 1 行 insert
 *  2. その行を返す
 */
export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  /* ---------- Supabase client (Edge) ---------- */
  const supabase = createRouteHandlerClient<Database>({ cookies });

  /* ---------- 認証ユーザーを取得 ---------- */
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  /* ---------- リクエスト Body ---------- */
  const { challenge_id } = (await req.json()) as { challenge_id?: string };

  if (!challenge_id) {
    return NextResponse.json({ error: "challenge_id required" }, { status: 400 });
  }

  /* ---------- challenge_sessions へ insert ---------- */
  const { data, error } = await supabase
    .from("challenge_sessions")
    .insert({
      challenge_id,
      student_id: user.id,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ session: data });
}

/* 他メソッドは 405 */
export function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}