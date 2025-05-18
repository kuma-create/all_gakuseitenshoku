import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { cookies } from "next/headers";

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,     // ← service キーを .env / Vercel に追加
);

export async function POST(req: Request) {
  const { email, password, first_name, last_name, referral } = await req.json();

  /* ❶ サインアップ（メール確認付き） */
  const supabase = createRouteHandlerClient<Database>({ cookies });
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/email-callback`,
      data: {
        full_name: `${last_name} ${first_name}`,
        referral_source: referral,
      },
    },
  });
  if (error || !data.user) {
    return NextResponse.json({ error: error?.message }, { status: 400 });
  }

  /* ❷ role を上書き（今回は "student"） */
  // @ts-ignore – cross‑schema table string is not in generated types
  await supabaseAdmin
    .from("auth.users")
    .update({ role: "student" })   // 企業なら "company"
    .eq("id", data.user.id);

  return NextResponse.json({ ok: true });
}