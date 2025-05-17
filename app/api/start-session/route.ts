// app/api/start-session/route.ts
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/lib/supabase/types";

export const runtime  = "edge";
export const dynamic  = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  /* ---------- Supabase 初期化 ---------- */
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient<Database>({
    cookies: () => cookieStore,
  });

  /* ---------- 認証チェック ---------- */
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
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
    return NextResponse.json(
      { error: "student_profile_not_found" },
      { status: 400 },
    );
  }
  const student_id = profile.id;

  /* ---------- 既存セッション確認 ---------- */
  const { data: existing } = await supabase
    .from("challenge_sessions")
    .select("*")
    .eq("challenge_id", challenge_id)
    .eq("student_id", student_id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ session: existing }, { status: 200 });
  }

  /* ---------- 新規セッション挿入 ---------- */
  const { data: session, error: insertErr } = await supabase
    .from("challenge_sessions")
    .insert({
      challenge_id,
      student_id,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  /* ---------- 問題を取得して session_answers に種まき ---------- */
  const { data: questions, error: quesErr } = await supabase
    .from("question_bank")
    .select("id")
    .eq("challenge_id", challenge_id)
    .order("difficulty", { ascending: true });
  if (!quesErr && questions?.length) {
    const seed = questions.map((q) => ({
      session_id: session.id,
      question_id: q.id,
      answer_raw: null,
    }));
    const { error: seedErr } = await supabase
      .from("session_answers")
      .insert(seed);
    if (seedErr) console.error("[start-session] seed error", seedErr);
  }

  return NextResponse.json({ session }, { status: 201 });
}

/* その他メソッドは 405 */
export function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}