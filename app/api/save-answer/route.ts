import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import type { Database } from "@/lib/supabase/types"

/**
 * POST /api/save-answer
 * body: {
 *   sessionId: string,
 *   questionId: string,
 *   answer:    { choice?: number; text?: string; elapsedSec?: number }
 * }
 *
 * - 認証ユーザーが該当 session の student であることをチェック
 * - `session_answers` に UPSERT (answer_raw, elapsed_sec)
 */
export async function POST(req: NextRequest) {
  try {
    const { sessionId, questionId, answer } = (await req.json()) as {
      sessionId: string
      questionId: string
      answer: {
        choice?: number
        text?: string
        elapsedSec?: number
      }
    }

    if (!sessionId || !questionId) {
      return NextResponse.json({ error: "sessionId & questionId required" }, { status: 400 })
    }

    const supabase = createRouteHandlerClient<Database>({ cookies })

    /* 認証ユーザー取得 */
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    /* ① session が本人のものか確認 */
    const { count, error: cntErr } = await supabase
      .from("challenge_sessions")
      .select("id", { count: "exact", head: true })
      .eq("id", sessionId)
      .eq("student_id", user.id)
    if (cntErr) throw cntErr
    if (!count || count === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    /* ② UPSERT */
    const { error } = await supabase.from("session_answers").upsert(
      {
        session_id: sessionId,
        question_id: questionId,
        answer_raw: answer as any,
        elapsed_sec: answer.elapsedSec ?? null,
      },
      { onConflict: "session_id,question_id" },
    )
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("save-answer error", err)
    return NextResponse.json({ error: err.message || "unknown" }, { status: 500 })
  }
}
