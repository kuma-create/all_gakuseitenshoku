// supabase/functions/send-invite/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.3"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  // Allow headers sent by supabase-js invoke: x-client-info, apikey, etc.
  "Access-Control-Allow-Headers":
    "authorization, content-type, x-client-info, apikey",
  "Content-Type": "application/json",
} as const

function mustEnv(name: string): string {
  const v = Deno.env.get(name)
  if (!v) throw new Error(`Missing environment variable: ${name}`)
  return v
}

const SENDGRID_API_KEY = mustEnv("SENDGRID_API_KEY");

const FROM_EMAIL = "info@gakuten.co.jp";
const FROM_NAME = "学生転職";

async function sendInviteEmail(to: string, actionLink: string) {
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: to }],
          subject: "【Make Culture】メンバー招待のお知らせ",
        },
      ],
      from: { email: FROM_EMAIL, name: FROM_NAME },
      content: [
        {
          type: "text/html",
          value: `
            <p>こんにちは！Make Culture へのご招待です。</p>
            <p>以下のリンクから24時間以内にログインしてください。</p>
            <p><a href="${actionLink}">ログインして参加する</a></p>
            <hr />
            <p>※本メールに心当たりがない場合は破棄してください。</p>
          `,
        },
      ],
    }),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`SendGrid error: ${res.status} ${msg}`);
  }
}

serve(async (req: Request) => {
  // ── CORS pre‑flight
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: CORS_HEADERS })
  }
  try {
    const { email, company_id, role } = await req.json()
    // Normalise input email once at the top
    const normalizedEmail = (email ?? "").trim().toLowerCase();

    // --- Supabase Admin client
    const supabaseUrl = mustEnv("SUPABASE_URL")
    const serviceRoleKey = mustEnv("SUPABASE_SERVICE_ROLE_KEY")
    const appUrl = mustEnv("APP_URL")

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    // --- ユーザー確認とリンク発行 ---------------------------------------------
    // 1) getUserByEmail で確実に対象ユーザーを特定
    const { data: userData, error: getErr } =
      await supabase.auth.admin.getUserByEmail(normalizedEmail);

    if (getErr && getErr.message !== "User not found") throw getErr;

    // userData?.user が null の場合は存在しない
    const existingUser = userData?.user ?? null;

    // 2) 既存ユーザーなら MAGIC LINK、新規なら INVITE
    const linkType: "magiclink" | "invite" = existingUser ? "magiclink" : "invite";

    const { data: linkData, error: linkErr } =
      await supabase.auth.admin.generateLink({
        type: linkType as "magiclink" | "invite",
        email: normalizedEmail,
        options: { redirectTo: `${appUrl}/login` },
      });

    if (linkErr) throw linkErr;

    const actionLink: string =
      linkData?.properties?.action_link ?? `${appUrl}/login`;
    const userId: string = linkData.user.id;
    console.log("invite‑target userId =", userId, "email =", normalizedEmail);

    // 4) company_members へ UPSERT
    await supabase.from("company_members")
      .upsert({
        company_id,
        user_id: userId,
        role: role ?? "recruiter",
      }, { onConflict: "company_id,user_id" })

    // 5) SendGrid でメール送信
    await sendInviteEmail(normalizedEmail, actionLink);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: CORS_HEADERS,
    })
  } catch (e) {
    console.error(e)
    const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: CORS_HEADERS,
    })
  }
})