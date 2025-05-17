// app/api/start-session/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/lib/supabase/types";

export const runtime   = "edge";
export const dynamic   = "force-dynamic";
export const revalidate = 0; // no ISR

export async function POST(req: NextRequest) {
  // Supabase client using the same-domain auth cookie
  const supabase = createRouteHandlerClient<Database>({ cookies });

  // Get current user
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  // Insert new challenge session
  const { challenge_id } = (await req.json()) as { challenge_id: string };

  const { data, error } = await supabase
    .from("challenge_sessions")
    .insert({
      challenge_id,
      student_id: user.id,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ session: data }, { status: 201 });
}

export function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}