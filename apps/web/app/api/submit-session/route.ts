export const runtime = "edge";
export const dynamic = "force-dynamic";
export const revalidate = 0;
// app/api/submit-session/route.ts
import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient }   from "@supabase/auth-helpers-nextjs"
import { cookies }                    from "next/headers"
import type { Database }              from "@/lib/supabase/types"

/**
 * POST /api/submit-session
 * body: { sessionId: string }
 *
 * 1. 認証ユーザーがセッションの所有者か確認
 * 2. RPC `grade_session` を呼び出して採点＆ challenge_sessions 更新
 * 3. 合計スコアを返却
 */
export async function POST(req: NextRequest) {
  /* ---------- ① 受取パラメータ ---------- */
  const { sessionId } = (await req.json()) as { sessionId?: string }

  if (!sessionId) {
    return NextResponse.json(
      { error: "sessionId required" },
      { status: 400 },
    )
  }

  /* ---------- ② Supabase 初期化 ---------- */
  const supabase = createRouteHandlerClient<Database>({ cookies })

  /* ---------- ③ 認証ユーザー取得 ---------- */
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()

  if (authErr || !user) {
    // 未ログインなら即終了（★早期リターン）
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  /* ---------- ④ 所有者チェック ---------- */
  const { count, error: cntErr } = await supabase
    .from("challenge_sessions")
    .select("id", { count: "exact", head: true })
    .eq("id", sessionId)
    .eq("student_id", user.id)

  if (cntErr) {
    console.error("count error", cntErr)
    return NextResponse.json({ error: "DB error" }, { status: 500 })
  }

  if (!count) {
    // 別ユーザーのセッション → 禁止
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  /* ---------- ⑤ 採点 RPC 呼び出し ---------- */
  const { data: score, error: rpcErr } = await supabase.rpc("grade_session", {
    p_session_id: sessionId,
  })

  if (rpcErr) {
    console.error("grade_session error", rpcErr)
    return NextResponse.json({ error: "RPC error" }, { status: 500 })
  }

  /* ---------- ⑥ 正常レスポンス ---------- */
  return NextResponse.json({ score })
}
