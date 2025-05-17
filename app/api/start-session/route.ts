// app/api/start-session/route.ts
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/lib/supabase/types";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * POST /api/start-session
 * Body: { challenge_id: uuid } もしくは { challengeId: uuid }
 *
 * 1. 認証必須（Cookie ベース）
 * 2. 該当 (challenge_id, student_id) が既にあれば再利用
 * 3. 無ければ insert → 生成した行を返す
 */
export async function POST(req: NextRequest) {
  /* ---------- Supabase 初期化 ---------- */
  const cookieStore = cookies(); // エッジ環境でメモ化
  const supabase = createRouteHandlerClient<Database>({
    cookies: () => cookieStore,
  });

  /* ---------- 認証チェック ---------- */
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    console.warn("[start-session] unauthenticated", authErr?.message);
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  /* ---------- Body 取得 ---------- */
  const body = await req.json();
  const challenge_id: string | undefined =
    body.challenge_id ?? body.challengeId;

  if (!challenge_id) {
    return NextResponse.json(
      { error: "challenge_id required" },
      { status: 400 },
    );
  }

  /* ---------- 学生プロフィール取得 ---------- */
  const { data: profile, error: profErr } = await supabase
    .from("student_profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (profErr || !profile) {
    console.error("[start-session] profile not found", profErr);
    return NextResponse.json(
      { error: "student_profile_not_found" },
      { status: 400 },
    );
  }
  const student_id = profile.id;

  /* ---------- 既存セッション確認 ---------- */
  const { data: existing, error: selErr } = await supabase
    .from("challenge_sessions")
    .select("*")
    .eq("challenge_id", challenge_id)
    .eq("student_id", student_id)
    .maybeSingle();

  if (selErr) {
    console.error("[start-session] select error", selErr);
    return NextResponse.json({ error: "db_select_error" }, { status: 500 });
  }
  if (existing) {
    return NextResponse.json({ session: existing }, { status: 200 });
  }

  /* ---------- 新規セッション挿入 ---------- */
  const { data, error } = await supabase
    .from("challenge_sessions")
    .insert({
      challenge_id,
      student_id,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("[start-session] insert error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ session: data }, { status: 201 });
}

/* その他メソッドは 405 */
export function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}