// app/api/start-session/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/types";

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true });      // ← 先にレスポンス生成
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll().map(c => ({ name: c.name, value: c.value })),
        setAll: cs => cs.forEach(c => res.cookies.set(c)),
      },
    },
  );

  // セッション取得
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  // challenge_sessions へ insert
  const body = await req.json();
  const { data, error } = await supabase.from("challenge_sessions").insert({
    challenge_id: body.challenge_id,
    student_id:   user.id,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ session: data });
}