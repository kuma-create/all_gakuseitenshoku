import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/lib/supabase/types";

export const runtime = "edge";

// POST /auth/set
export async function POST(req: Request) {
  const supabase = createRouteHandlerClient<Database>({ cookies });
  const { session } = await req.json();

  // session が null の場合は signOut と同義
  await supabase.auth.setSession(session);

  return NextResponse.json({ success: true });
}

// GET など他メソッドは 405
export function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
