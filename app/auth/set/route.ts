// app/auth/set/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/lib/supabase/types";

export const runtime  = "edge";
export const dynamic  = "force-dynamic";

export async function POST(req: Request) {
  const cookieStore = cookies(); // 1度だけ同期取得
  const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });

  const session = (await req.json()) as
    | { access_token: string; refresh_token: string; expires_at: number }
    | null;

  /* セッションが null ⇒ ログアウト扱い */
  if (session) {
    await supabase.auth.setSession(session);
  } else {
    await supabase.auth.signOut();
  }

  return NextResponse.json({ success: true });
}

export function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}