// app/api/admin/add-company/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_KEY: srk } =
    process.env;
  if (!url || !srk)
    return NextResponse.json({ error: "env missing" }, { status: 500 });

  const { name, email } = await req.json();
  if (!name || !email)
    return NextResponse.json({ error: "invalid param" }, { status: 400 });

  const supabase = createClient<Database>(url, srk);

  try {
    /* ── 1. 既存ユーザー確認 ─────────────────── */
    const {
      data: { users },
      error: listErr,
    } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 });
    if (listErr) throw listErr;

    const existing = users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );
    let uid: string;

    if (existing) {
      uid = existing.id;

      /* 招待メールは送ったが未確認 → 再送 */
      if (existing.email_confirmed_at === null) {
        await supabase.auth.admin.inviteUserByEmail(email);
      }
    } else {
      /* ── 2. 新規作成 (createUser) ──────────────── */
      const { data, error: crtErr } = await supabase.auth.admin.createUser({
        email,
        password: crypto.randomUUID().slice(0, 10) + "Aa?",
        email_confirm: false,
        user_metadata: { full_name: name },
      });

      if (crtErr) {
        /* createUser が "User already registered" で落ちた → 招待メール再送 */
        await supabase.auth.admin.inviteUserByEmail(email);

        // 改めて uid を取得
        const {
          data: { users: reUsers },
          error: reErr,
        } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 });
        if (reErr) throw reErr;

        const found = reUsers.find(
          (u) => u.email?.toLowerCase() === email.toLowerCase()
        );
        if (!found) throw new Error("cannot fetch existing user after invite");
        uid = found.id;
      } else {
        if (!data.user) throw new Error("create failed – no user returned");
        uid = data.user.id;
      }
    }

    /* ── 3. user_roles upsert ───────────────────── */
    await supabase
      .from("user_roles")
      .upsert({ user_id: uid, role: "company" }, { onConflict: "user_id" });

    /* ── 4. companies upsert ────────────────────── */
    await supabase
      .from("companies")
      .upsert(
        { user_id: uid, name, status: "承認待ち" },
        { onConflict: "user_id" }
      );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[add-company] error", e);
    return NextResponse.json(
      { error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}