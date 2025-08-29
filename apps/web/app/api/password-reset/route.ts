import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import sgMail from "@sendgrid/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -------------------------  環境変数  ------------------------- */
const SITE_URL = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_KEY;
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM = process.env.SENDGRID_FROM || "admin@gakuten.co.jp"; // 既定From
const SENDGRID_REPLY_TO = process.env.SENDGRID_REPLY_TO; // 任意

/* -------------------------  SendGrid 初期化  ------------------------- */
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

/* -------------------------  Helpers  ------------------------- */
function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status });
}

function normEmail(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const e = input.trim().toLowerCase();
  // 最低限のバリデーション
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return null;
  return e;
}

/* -------------------------  POST /api/password-reset  ------------------------- */
export async function POST(req: Request) {
  if (!SITE_URL) return json(500, { error: "SITE_URL env is missing" });
  if (!SUPABASE_URL || !SERVICE_ROLE) return json(500, { error: "Supabase env is missing" });

  let emailRaw: unknown;
  try {
    const body = await req.json();
    emailRaw = body?.email;
  } catch {
    return json(400, { error: "invalid json" });
  }

  const email = normEmail(emailRaw);
  if (!email) return json(400, { error: "email required" });

  const supabase = createClient<Database>(SUPABASE_URL, SERVICE_ROLE);

  // 1) リセット用 MagicLink 生成（type: "recovery"）
  const { data: linkData, error } = await supabase.auth.admin.generateLink({
    email,
    type: "recovery",
    options: {
      // モバイル＆Webで統一: /password-reset-callback に着地
      redirectTo: `${SITE_URL.replace(/\/$/, "")}/password-reset-callback`,
    },
  });

  // ユーザー存在の有無を隠すため、失敗しても 200 を返す（ログには残す）
  if (error || !linkData) {
    console.error("[password-reset] generateLink error", error);
    return json(200, { ok: true });
  }

  const resetUrl = (linkData as any).action_link || (linkData as any).properties?.action_link;

  // 2) メール送信（SendGrid APIキーが無ければ開発用途としてURLのみ返す）
  if (!SENDGRID_API_KEY) {
    const isDev = process.env.NODE_ENV !== "production";
    if (isDev) {
      return json(200, { ok: true, devResetUrl: resetUrl });
    }
    // 本番でキーが無い場合はエラー
    return json(500, { error: "SendGrid API key missing" });
  }

  try {
    await sgMail.send({
      to: email,
      from: SENDGRID_FROM,
      ...(SENDGRID_REPLY_TO ? { replyTo: SENDGRID_REPLY_TO } : {}),
      subject: "【学生転職】パスワード再設定のご案内",
      text: `以下のリンクからパスワードを再設定してください。\n\n${resetUrl}\n\nリンクの有効期限は60分です。`,
      html: `
        <p>以下のリンクから新しいパスワードを設定してください。</p>
        <p><a href="${resetUrl}" target="_blank" rel="noopener noreferrer">${resetUrl}</a></p>
        <p>※ このリンクの有効期限は 60 分です。</p>
      `,
    });
  } catch (mailErr: any) {
    console.error("[password-reset] sendgrid error", mailErr?.response?.body || mailErr);
    // メール失敗でもユーザー列挙を避けるため 200 を返す
    return json(200, { ok: true });
  }

  return json(200, { ok: true });
}