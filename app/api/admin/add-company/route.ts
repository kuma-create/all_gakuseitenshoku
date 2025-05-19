// app/api/admin/add-company/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_KEY: srk } =
    process.env;
  if (!url || !srk)
    return NextResponse.json(
      { error: "Supabase URL / SERVICE KEY is missing" },
      { status: 500 }
    );

  const { name, email } = await req.json();
  if (!name || !email)
    return NextResponse.json({ error: "invalid param" }, { status: 400 });

  const supabase = createClient<Database>(url, srk);

  try {
    /* ---------- 既存ユーザー確認 (listUsers) ---------- */
// 既存ユーザー確認
    const {
        data: { users },
        error: listErr,
    } = await supabase.auth.admin.listUsers();   // ← 引数なし
    
    if (listErr) throw listErr;
    
    const existing = users.find(
        u => u.email?.toLowerCase() === email.toLowerCase()
    );
    let uid: string;

    /* ---------- 既存ならその uid、無ければ招待 ---------- */
    if (existing) {
      uid = existing.id;
    } else {
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(
        email,
        {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/email-callback`,
          data: { full_name: name },
        }
      );
      if (error || !data.user) throw error ?? new Error("invite failed");
      uid = data.user.id;
    }

    /* ---------- user_roles upsert ---------- */
    await supabase
      .from("user_roles")
      .upsert({ user_id: uid, role: "company" }, { onConflict: "user_id" });

    /* ---------- companies upsert ---------- */
    await supabase.from("companies").upsert(
      { user_id: uid, name, status: "承認待ち" },
      { onConflict: "user_id" }
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
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