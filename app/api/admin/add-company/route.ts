// app/api/admin/add-company/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const {
    NEXT_PUBLIC_SUPABASE_URL: url,
    SUPABASE_SERVICE_KEY: sk,
    NEXT_PUBLIC_SITE_URL,
  } = process.env;
  if (!url || !sk) {
    return NextResponse.json({ error: "env missing" }, { status: 500 });
  }

  const { name, email } = (await req.json()) as {
    name?: string;
    email?: string;
  };
  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "invalid param" }, { status: 400 });
  }

  const supabase = createClient<Database>(url, sk);

  try {
    /* ---------- 1. 既存ユーザー確認 ---------- */
    // ※ supabase-js v2.37 以前には getUserByEmail が無いので listUsers で代替
    const {
      data: { users },
      error: listErr,
    } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listErr) throw listErr;

    const existing = users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    let uid: string;

    if (existing) {
      uid = existing.id;

      /* 既に招待済みで未確認の場合は招待メールを再送 */
      if (existing.email_confirmed_at === null) {
        const { error: resendErr } =
          await supabase.auth.admin.inviteUserByEmail(email, {
            redirectTo: `${NEXT_PUBLIC_SITE_URL}/company/onboarding/profile`,
            data: { full_name: name }, // pass metadata for email template
          });
        if (resendErr) throw resendErr;
      }
    } else {
      /* ---------- 2. 新規招待 ---------- */
      const { data: invite, error: inviteErr } =
        await supabase.auth.admin.inviteUserByEmail(email, {
          redirectTo: `${NEXT_PUBLIC_SITE_URL}/company/onboarding/profile`,
          data: { full_name: name },
        });
      if (inviteErr) throw inviteErr;
      if (!invite?.user) {
        throw new Error("inviteUserByEmail returned no user");
      }
      uid = invite.user.id;
    }

    /* ---------- 3. user_roles upsert ---------- */
    const { error: roleErr } = await supabase
      .from("user_roles")
      .upsert({ user_id: uid, role: "company_admin" }, { onConflict: "user_id" });
    if (roleErr) throw roleErr;

    /* ---------- 4. companies upsert ---------- */
    const { error: cmpErr } = await supabase
      .from("companies")
      .upsert(
        { user_id: uid, name, status: "承認待ち" },
        { onConflict: "user_id" }
      );
    if (cmpErr) throw cmpErr;

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("[add-company] error", e);
    return NextResponse.json(
      { error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}