// app/auth/set/route.ts
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/lib/supabase/types";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * POST /auth/set
 * Body  : Supabase session object | null
 *
 * - session が null   → signOut()
 * - session が有効    → setSession() して Cookie を発行
 */
export async function POST(req: NextRequest) {
  /* ---------- Supabase client (Edge) ---------- */
  const supabase = createRouteHandlerClient<Database>({ cookies });

  /* ---------- Body ---------- */
  const session = (await req.json()) as
    | { access_token: string; refresh_token: string; expires_at: number }
    | null;

  /* ---------- set / clear ---------- */
  const { error } = session
    ? await supabase.auth.setSession(session)
    : await supabase.auth.signOut();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}

/* 他メソッドは 405 */
export function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}