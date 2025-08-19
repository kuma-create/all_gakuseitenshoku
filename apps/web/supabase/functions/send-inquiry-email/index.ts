import { serve } from "https://deno.land/std@0.207.0/http/server.ts";
import "https://deno.land/std@0.207.0/dotenv/load.ts";

const ADMIN = Deno.env.get("ADMIN_EMAIL") ?? "info@gakuten.co.jp";
const SENDGRID_KEY = Deno.env.get("SENDGRID_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // or restrict to specific domain
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface InquiryBody {
  name: string;
  email: string;
  company: string;
  inquiry: string;
}

const sendMail = async (payload: unknown) =>
  fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

serve(async (req) => {
  // ----- CORS pre‑flight (OPTIONS) -----
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // ----- Supabase gateway sometimes proxies OPTIONS as POST without body -----
  const hasJson =
    req.headers.get("content-type")?.includes("application/json") &&
    (await req.clone().text()).trim().length > 0;

  if (!hasJson) {
    // treat as pre‑flight (or bad request) but still return CORS headers
    return new Response("ok", { headers: corsHeaders });
  }

  // re‑parse body now that we know there is JSON
  const body: InquiryBody = JSON.parse(await req.text());

  const { name, email, company, inquiry } = body;

  // --- 1) Notify Admin ----------------------------------------------------
  const adminPayload = {
    personalizations: [
      {
        to: [{ email: ADMIN }],
        subject: "【学生転職】お問い合わせがありました",
      },
    ],
    from: { email: ADMIN, name: "学生転職" },
    content: [
      {
        type: "text/plain",
        value: `以下の内容でお問い合わせがありました。

名前: ${name}
メール: ${email}
会社: ${company}
種別: ${inquiry}

----------------------------------------
このメールは自動送信です。`,
      },
    ],
  };

  const adminRes = await sendMail(adminPayload);
  if (!adminRes.ok) {
    return new Response("admin mail error", { status: 500, headers: corsHeaders });
  }

  // --- 2) Thank-you mail to inquirer --------------------------------------
  const userPayload = {
    personalizations: [
      {
        to: [{ email }],
        subject: "【学生転職】お問い合わせありがとうございます",
      },
    ],
    from: { email: ADMIN, name: "学生転職" },
    content: [
      {
        type: "text/plain",
        value: `${name} 様

この度は学生転職へお問い合わせいただきありがとうございます。
担当より改めてご連絡いたしますので、しばらくお待ちください。

▼ お問い合わせ内容
種別: ${inquiry}
会社名: ${company}

----------------------------------------
このメールは送信専用です。ご返信いただいても回答できませんのでご了承ください。`,
      },
    ],
  };

  const userRes = await sendMail(userPayload);
  if (!userRes.ok) {
    return new Response("user mail error", { status: 500, headers: corsHeaders });
  }

  return new Response("sent", { status: 200, headers: corsHeaders });
});