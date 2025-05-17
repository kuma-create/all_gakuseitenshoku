import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/lib/supabase/types";

export const runtime = "edge";

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient<Database>({ cookies });
  const { session } = await req.json();
  // セッションが null のときは signOut と同じ扱い
  await supabase.auth.setSession(session);
  return NextResponse.json({ success: true });
}