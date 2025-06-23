import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import sgMail from "@sendgrid/mail";

export const runtime  = "nodejs";
export const dynamic  = "force-dynamic";

/* -------------------------  環境変数  ------------------------- */
// SITE_URL を優先し、無ければ NEXT_PUBLIC_SITE_URL を利用
const SITE_URL = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL;

/* -------------------------  SendGrid 初期化  ------------------------- */
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function POST(req: Request) {
  const { email } = await req.json();

  if (!SITE_URL) {
    return NextResponse.json(
      { error: "SITE_URL env is missing" },
      { status: 500 }
    );
  }

  if (!email?.trim()) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  /* 1) リセット用 MagicLink 生成（type: "recovery"） */
  const { data: linkData, error } = await supabase.auth.admin.generateLink({
    email,
    type: "recovery",
    options: {
      redirectTo: `${SITE_URL}/password-reset-callback`,
    },
  });

  if (error || !linkData) {
    return NextResponse.json(
      { error: error?.message ?? "failed to generate link" },
      { status: 500 }
    );
  }

  const resetUrl =
    (linkData as any).action_link ||
    (linkData as any).properties?.action_link;

  /* 2) メール送信 */
  try {
    await sgMail.send({
      to: email,
      from: "admin@gakuten.co.jp",
      subject: "【学生転職】パスワード再設定のご案内",
      text: `以下のリンクからパスワードを再設定してください。\n\n${resetUrl}\n\nリンクの有効期限は60分です。`,
      html: `
        <p>以下のリンクから新しいパスワードを設定してください。</p>
        <p><a href="${resetUrl}" target="_blank">${resetUrl}</a></p>
        <p>※ このリンクの有効期限は 60 分です。</p>
      `
    });
  } catch (mailErr: any) {
    const detail =
      mailErr?.response?.body?.errors?.[0]?.message ??
      mailErr?.message ??
      "SendGrid failed";
    return NextResponse.json({ error: detail }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}