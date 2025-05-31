import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/lib/supabase/types";

/* ------------------------------------------------------------------
   /app/api/start-session/route.ts
   - チャレンジ受験セッションを作成し、回答行を自動生成する
   - 2025‑05‑18 修正版
     * cookieStore を 1 度だけ取得して渡す（Edge Runtime 対応）
     * prepare_session_answers RPC のパラメータ名を p_session_uuid に統一
------------------------------------------------------------------ */

export const runtime  = "edge";
export const dynamic  = "force-dynamic";

export async function POST(req: Request) {
  /* ---------- パラメータ取得 ---------- */
  const {
    challengeId,
    challenge_id,
    category,
  } = (await req.json()) as {
    challengeId?: string;
    challenge_id?: string;
    category?: string;
  };

  const cid = challengeId ?? challenge_id ?? null;
  if (!cid) {
    return NextResponse.json(
      { error: "challengeId (camelCase or snake_case) is required" },
      { status: 400 },
    );
  }

  /* ---------- Supabase Client 初期化 ---------- */
  const cookieStore = cookies();                                     // ← 1度だけ同期取得
  const supabase = createRouteHandlerClient<Database>({
    cookies: () => cookieStore,
  });

  /* ---------- 認証ユーザー ---------- */
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  /* ---------- プロフィール行を確保（FK 対策） ---------- */
  const { error: profileErr } = await supabase
    .from("student_profiles")
    .upsert(
      {
        id:                        user.id,
        updated_at:                new Date().toISOString(),
        status:                    "incomplete",
        has_internship_experience: false,
        interests:                 [],
      },
      { onConflict: "id", ignoreDuplicates: true },
    );

  if (profileErr) {
    console.error("student_profiles upsert error:", profileErr);
    return NextResponse.json(
      { error: profileErr.message },
      { status: 500 },
    );
  }

  /* =============================================================
     セッション作成 — uniq_once_per_chall 制約で重複を許さない
     -------------------------------------------------------------
     1. INSERT が成功        → その id を利用
     2. 23505 duplicate key → 既存セッションを取得して再利用
  ============================================================= */
  let sessionId: string;

  const { data: inserted, error: insErr } = await supabase
    .from("challenge_sessions")
    .insert({
      challenge_id: cid,
      student_id:   user.id,
      started_at:   new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insErr) {
    if (insErr.code === "23505") {
      /* ---------- 既存セッションを取得 ---------- */
      const { data: existing, error: selErr } = await supabase
        .from("challenge_sessions")
        .select("id")
        .eq("challenge_id", cid)
        .eq("student_id", user.id)
        .order("started_at", { ascending: false })
        .limit(1)
        .single();

      if (selErr || !existing) {
        console.error("select existing session error:", selErr);
        return NextResponse.json(
          { error: selErr?.message ?? "session select failed" },
          { status: 500 },
        );
      }
      sessionId = existing.id;
    } else {
      console.error("start-session insert error:", insErr);
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
  } else {
    sessionId = inserted.id;
  }

  /* ---------- 空の回答行を準備（question_bank → session_answers） ---------- */
  const { data: questions, error: qErr } = await supabase
    .from("question_bank")
    .select("id")
    .eq("challenge_id", cid);

  if (qErr) {
    console.error("fetch questions error:", qErr);
  } else if (questions && questions.length) {
    const answerRows = questions.map((q) => ({
      session_id:  sessionId,
      question_id: q.id,
      answer_raw:  null,          // 未回答
    }));

    const { error: aErr } = await supabase
      .from("session_answers")
      .upsert(
        answerRows as Database["public"]["Tables"]["session_answers"]["Insert"][],
        {
          onConflict: "session_id,question_id", // 重複時は無視
        },
      );

    if (aErr) {
      console.error("insert session_answers error:", aErr);
    }
  }

  /* ---------- レスポンス ---------- */
  return NextResponse.json({ sessionId });
}