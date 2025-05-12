import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import type { Database } from "@/lib/supabase/types"

/**
 * POST /api/submit-session
 * body: { sessionId: string }
 *
 * 1. 認証ユーザーがセッションの所有者か確認
 * 2. RPC `grade_session` を呼び出して採点＆challenge_sessions 更新
 * 3. 合計スコアを返却
 */
export async function POST(req: NextRequest) {
  try {
    const { sessionId } = (await req.json()) as { sessionId: string }
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 })
    }

    const supabase = createRouteHandlerClient<Database>({ cookies })

    /* -------------- auth check -------------- */
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    /** 所有者確認 */
    const { count, error: cntErr } = await supabase
      .from("challenge_sessions")
      .select("id", { count: "exact", head: true })
      .eq("id", sessionId)
      .eq("student_id", user.id)
    if (cntErr) throw cntErr
    if (!count || count === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    /* -------------- grade RPC -------------- */
    const { data: score, error } = await supabase.rpc("grade_session", {
      p_session_id: sessionId,
    })
    if (error) throw error

    return NextResponse.json({ score })
  } catch (err: any) {
    console.error("submit-session error", err)
    return NextResponse.json({ error: err.message || "unknown" }, { status: 500 })
  }
}
