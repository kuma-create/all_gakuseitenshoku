import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { cookies } from "next/headers";

/* この API は動的実行に固定（ビルド時に読み込まれない） */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { email, password, first_name, last_name, referral } = await req.json();

  /* ① 認証付きサインアップ -------------- */
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

  /* ② role を上書き (student) ----------- */
  /* createClient を “ここで” 生成するのでビルド時は呼ばれない */
  const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,   // ← Vercel にセット必須
  );

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore – cross‑schema table ("auth.users") is not in generated types
  await supabaseAdmin
    .from("auth.users")
    .update({ role: "student" })   // 企業なら "company"
    .eq("id", data.user.id);

  return NextResponse.json({ ok: true });
}