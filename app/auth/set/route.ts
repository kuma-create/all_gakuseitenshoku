import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/lib/supabase/types";

export const runtime = "edge";
export const dynamic = "force-dynamic";

/**
 * POST /auth/set
 * Body: Supabase session object | null
 *
 * - session が null   → signOut()
 * - session が有効    → setSession() して auth クッキーを発行
 */
export async function POST(req: Request) {
  // Next.js 15 以降は cookies() が async なので await する
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient<Database>({
    cookies: () => cookieStore,
  });

  const session = (await req.json()) as
    | { access_token: string; refresh_token: string; expires_at: number }
    | null;

  if (session) {
    // セッションがある → サインイン扱い
    await supabase.auth.setSession(session);
  } else {
    // セッションが null → サインアウト
    await supabase.auth.signOut();
  }

  return NextResponse.json({ success: true });
}

/* 他メソッドは 405 */
export function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}