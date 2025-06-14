// supabase/functions/send-email/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js";

// --- CORS -------------------------------------------------------------
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// global error hooks
addEventListener("unhandledrejection", (evt) => {
  console.error("UNHANDLED REJECTION:", evt.reason ?? "(no reason)");
});
addEventListener("error", (evt) => {
  console.error("UNCAUGHT ERROR:", evt.error ?? evt.message);
});

const FROM_EMAIL       = Deno.env.get("FROM_EMAIL")       ?? "info@gakuten.co.jp";
const FROM_NAME        = Deno.env.get("FROM_NAME")        ?? "学生転職";  // ← 送信者名
const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")     ?? "https://cpinzmlynykyrxdvkshl.supabase.co";
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;
const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY")!;

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

/* ------------------------------------------------------------------ */
/* SendGrid helper                                                    */
/* ------------------------------------------------------------------ */
async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text: string,
) {
  const body = {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject,
    content: [
      { type: "text/plain", value: text },
      { type: "text/html", value: html },
    ],
  };

  const resp = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    throw new Error(
      `SendGrid error: ${resp.status} ${await resp.text()}`,
    );
  }
}

/* ------------------------------------------------------------------ */
/* Edge Function entry                                                */
/* ------------------------------------------------------------------ */
serve(async (req) => {
  // Handle CORS pre‑flight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  // payload が { record: {...} } なら DB トリガ、直接 JSON ならクライアント
  const payload = await req.json();
  const rec = ("record" in payload) ? payload.record : payload;

let {
  id,
  user_id,
  title,
  message,
  from_role,
  notification_type,
  company_name,
} = rec ?? {};

// company_name が空文字や undefined の場合は "企業" にフォールバック
const companyLabel = company_name && company_name.trim() !== ""
  ? company_name.trim()
  : "企業";

  // ------------------------------------------------------------------
  // (B) student_id -> auth_uid マッピング
  // フロントから渡る user_id は student_profiles.id の場合があるため
  // student_profiles テーブルから auth_uid を取得して置き換える
  // ------------------------------------------------------------------
  if (user_id) {
    const { data: mapRow, error: mapErr } = await db
      .from("student_profiles")
      .select("auth_user_id")
      .eq("id", user_id as string)
      .maybeSingle<{ auth_user_id: string | null }>();

    if (mapErr) {
      console.error("map lookup error:", mapErr);
    }

    if (mapRow?.auth_user_id) {
      user_id = mapRow.auth_user_id;
    }
  }

  if (!user_id) {
    console.error("missing user_id in payload", payload);
    return new Response("bad payload", { status: 400, headers: corsHeaders });
  }

  // -------------------------------------------------------------
  // derive flags *before* we possibly insert
  const isFromCompany = from_role === "company";
  const isScout      = notification_type === "scout";

  const fallbackTitle =
    title ??
    (isScout
      ? "スカウト通知"
      : isFromCompany
        ? `${companyLabel}からチャット通知`
        : "チャット通知");

  /* 0. クライアント呼び出しで id が無い場合 → notifications に行を作成 */
  if (!id) {
    const { data: ins, error: insErr } = await db
      .from("notifications")
      .insert({
        user_id,
        title: fallbackTitle,
        message,
        channel: "email",
        notification_type: "chat",
        send_status: "pending",
      })
      .select("id")
      .single();

    if (insErr || !ins?.id) {
      console.error("insert notification error", insErr);
      return new Response("insert error", { status: 500, headers: corsHeaders });
    }
    id = ins.id;           // 以降の更新で使う
  }

  try {
    /* 1. fetch auth user's email */
    const { data, error: adminErr } = await db.auth.admin.getUserById(
      user_id as string,
    );
    if (adminErr || !data?.user?.email) {
      throw new Error(`auth admin error: ${adminErr?.message ?? "no email"}`);
    }

    // ------------------------------------------------------------------
    // Build mail subject / body depending on who sent the chat
    // ------------------------------------------------------------------

    const subject = isScout
      ? "企業からスカウトが届きました"
      : isFromCompany
        ? `${companyLabel}から新しいチャットが届きました`
        : (title ?? "お知らせ");

    const html = isScout
      ? `
        <p style="font-size:15px;">企業からあなたへスカウトメッセージが届きました。</p>
        <p style="font-size:14px;">${message ?? ""}</p>
        <hr/>
        <p style="font-size:12px;color:#888;">
          本メールはシステムより自動送信されています。<br/>
          ご返信にはプラットフォーム上のチャット機能をご利用ください。
        </p>
      `
      : isFromCompany
        ? `
          <p style="font-size:15px;">${companyLabel}からメッセージが届きました。</p>
          <p style="font-size:14px;">${message ?? ""}</p>
          <hr/>np, 
          <p style="font-size:12px;color:#888;">
            本メールはシステムより自動送信されています。<br/>
            ご返信にはチャット画面をご利用ください。
          </p>
        `
        : `<p>${message ?? ""}</p>`;

    const text = isScout
      ? `企業からスカウトメッセージが届きました。\n\n${message ?? ""}`
      : isFromCompany
        ? `${companyLabel}からメッセージが届きました。\n\n${message ?? ""}`
        : (message ?? "");

    /* 2. send mail */
    await sendEmail(
      data.user.email,
      subject,
      html,
      text,
    );

    /* 3. mark as sent */
    await db.from("notifications")
      .update({ send_status: "sent", sent_at: new Date().toISOString() })
      .eq("id", id);

    return new Response("ok", { headers: corsHeaders });
  } catch (err) {
    console.error(
      "send-email error:",
      typeof err === "object" ? JSON.stringify(err, null, 2) : String(err),
    );
    if (err instanceof Error && err.stack) {
      console.error("stack:", err.stack);
    }
    // pessimistically mark as failed
    try {
      await db.from("notifications")
        .update({
          send_status: "failed",
          error_reason: String(err),
        })
        .eq("id", id);
    } catch { /* ignore */ }
    return new Response("internal error", { status: 500, headers: corsHeaders });
  }
});
  
