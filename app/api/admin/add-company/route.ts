// app/api/admin/add-company/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/** App Router を Node.js ランタイムで実行させる */
export const runtime = "nodejs";

export async function POST(req: Request) {
  /* ---------- 環境変数チェック ---------- */
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_SUPABASE_URL is missing" },
      { status: 500 }
    );
  }
  if (!process.env.SUPABASE_SERVICE_KEY) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_KEY is missing" },
      { status: 500 }
    );
  }

  /* ---------- パラメータ ---------- */
  const { name, email } = await req.json();
  if (!name || !email) {
    return NextResponse.json({ error: "invalid param" }, { status: 400 });
  }

  /* ---------- Supabase Admin Client ---------- */
  const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    /* ① 招待メール送信 */
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/email-callback`,
        data: { full_name: name },
      }
    );
    if (error || !data.user) throw error ?? new Error("invite failed");

    const uid = data.user.id;

    /* ② user_roles 挿入 */
    const { error: errRoles } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: uid, role: "company" });
    if (errRoles) throw errRoles;

    /* ③ companies 挿入 */
    const { error: errComps } = await supabaseAdmin.from("companies").insert({
      user_id: uid,
      name,
      status: "承認待ち",
    });
    if (errComps) throw errComps;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    /* ---------- 失敗時詳細ログ ---------- */
    console.error("[add-company] error", {
      message: e?.message,
      details: e?.details,
      hint: e?.hint,
      code: e?.code,
    });

    return NextResponse.json(
      { error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}