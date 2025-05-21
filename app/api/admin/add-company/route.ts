// app/api/admin/add-company/route.ts
import { randomBytes } from "crypto";
import sgMail from "@sendgrid/mail";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export const runtime = "nodejs";

/* ---------- 必須 ENV が揃っているか確認 ---------- */
const {
  SENDGRID_API_KEY,
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  NEXT_PUBLIC_SITE_URL,
} = process.env;

if (!SENDGRID_API_KEY) {
  console.error("[add-company] SENDGRID_API_KEY missing");
}
if (!NEXT_PUBLIC_SUPABASE_URL) {
  console.error("[add-company] NEXT_PUBLIC_SUPABASE_URL missing");
}
if (!SUPABASE_SERVICE_KEY) {
  console.error("[add-company] SUPABASE_SERVICE_KEY missing");
}
if (!NEXT_PUBLIC_SITE_URL) {
  console.error("[add-company] NEXT_PUBLIC_SITE_URL missing");
}

/* これらのどれかが欠けている場合は 500 を即返す */
if (!SENDGRID_API_KEY || !NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_KEY || !NEXT_PUBLIC_SITE_URL) {
  throw new Error("env missing");
}

/* ──────────────── SendGrid ───────────────── */
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

/** 動的テンプレート ID（パスワード通知用に内容を更新しておいてください） */
const SENDGRID_TEMPLATE_ID = "d-918aa719ed544ee6a3c3e2ad783c9670";
const FROM_EMAIL           = "admin@gakuten.co.jp";

/** 社内で統一しているログインページのパス */
const LOGIN_PATH = "/login";

/** 12 文字程度の一時パスワードを生成 */
function generateTempPassword(): string {
  return randomBytes(9).toString("base64"); // 12 〜 13 文字
}

export async function POST(req: Request) {
  const {
    NEXT_PUBLIC_SUPABASE_URL: url,
    SUPABASE_SERVICE_KEY:    sk,
    NEXT_PUBLIC_SITE_URL,
  } = process.env;

  /* パラメータ取得 */
  const { name, email } = (await req.json()) as {
    name?: string;
    email?: string;
  };
  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "invalid param" }, { status: 400 });
  }

  const supabase = createClient<Database>(url, sk);
  const tempPassword = generateTempPassword();

  try {
    /* ── 1. 既存ユーザー確認 ─────────────────── */
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
      /* ── 既存ユーザー：パスワードとロール更新 ───────────────── */
      uid = existing.id;
      const { error: updErr } = await supabase.auth.admin.updateUserById(uid, {
        password:      tempPassword,
        email_confirm: true, // 管理者発行のため確認済みとみなす
        user_metadata: {
          ...(existing.user_metadata ?? {}),
          full_name: name,
          role:      "company_admin",
        },
      });
      if (updErr) throw updErr;
    } else {
      /* ── 新規ユーザー作成 ─────────────────────────── */
      const { data: userRes, error: userErr } =
        await supabase.auth.admin.createUser({
          email,
          password:      tempPassword,
          email_confirm: true,
          user_metadata: { full_name: name, role: "company_admin" },
        });
      if (userErr || !userRes?.user) throw userErr ?? new Error("createUser failed");
      uid = userRes.user.id;
    }

    /* ── 2. user_roles upsert ──────────────────────── */
    const { error: roleErr } = await supabase
      .from("user_roles")
      .upsert({ user_id: uid, role: "company_admin" }, { onConflict: "user_id" });
    if (roleErr) throw roleErr;

    /* ── 3. companies upsert ───────────────────────── */
    const { error: cmpErr } = await supabase
      .from("companies")
      .upsert(
        { user_id: uid, name, status: "承認待ち" },
        { onConflict: "user_id" },
      );
    if (cmpErr) throw cmpErr;

    /* ── 4. メール送信 ───────────────────────────── */
    await sgMail.send({
      to: email,
      from: FROM_EMAIL,
      templateId: SENDGRID_TEMPLATE_ID,
      dynamicTemplateData: {
        full_name: name,
        email,
        password:  tempPassword,
        login_url: `${NEXT_PUBLIC_SITE_URL}${LOGIN_PATH}`,
        year:      new Date().getFullYear(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("[add-company] error", e);
    return NextResponse.json(
      { error: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}