import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/lib/supabase/types";

export const runtime  = "edge";
export const dynamic  = "force-dynamic";

export async function POST(req: Request) {
  const { challengeId } = (await req.json()) as { challengeId: string };
  if (!challengeId)
    return NextResponse.json({ error: "challengeId required" }, { status: 400 });

  const supabase = createRouteHandlerClient<Database>({
    cookies: () => cookies(),
  });

  /* ---------- 認証ユーザー ---------- */
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user)
    return NextResponse.json({ error: "not signed in" }, { status: 401 });

  /* ---------- プロフィール行を確保（FK 対策） ---------- */
  // student_profiles 側に行が無いと FK で insert が失敗するため、
  // 存在しなければ空レコードを upsert しておく
  await supabase
    .from("student_profiles")
    .upsert({ id: user.id }, { onConflict: "id", ignoreDuplicates: true });

  /* ---------- セッション作成 ---------- */
  const { data: session, error } = await supabase
    .from("challenge_sessions")
    .insert({
      challenge_id: challengeId,
      student_id:   user.id,   // ← テーブル列名に合わせて修正
      started_at:   new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    // Vercel / Supabase Logs 用デバッグ
    console.error("start-session insert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  /* ---------- 空の回答行を準備 ---------- */
  // ↑ Supabase 側に `prepare_session_answers(p_session_id uuid)` RPC を
  //    置いている前提。なければ insert 文をループで書いても OK
  // 型定義にまだ RPC が反映されていないため一時的に無視
  const { error: rpcErr } =
    // @ts-expect-error prepare_session_answers は手動 RPC
    await supabase.rpc("prepare_session_answers", { p_session_id: session.id });

  if (rpcErr) {
    // ログだけ残して先に進む（セッション生成は成功しているため）
    console.error("prepare_session_answers error:", rpcErr);
  }

  return NextResponse.json({ sessionId: session.id });
}