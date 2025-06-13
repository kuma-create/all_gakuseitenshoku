// supabase/functions/send-email/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js";

const FROM_EMAIL       = Deno.env.get("FROM_EMAIL")       ?? "info@gakuten.co.jp";
const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")     ?? "https://cpinzmlynykyrxdvkshl.supabase.co";
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwaW56bWx5bnlreXJ4ZHZrc2hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyNTIyNTIsImV4cCI6MjA2MTgyODI1Mn0.Z4oByCP-Vi8iaiCRsKsh9JQVOSOLcRRiyWJt47xSm0s";
const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY") ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwaW56bWx5bnlreXJ4ZHZrc2hsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjI1MjI1MiwiZXhwIjoyMDYxODI4MjUyfQ.OHu3boXsjqeo7UFgI0o05N0oB9kplIbHHyT3zsfp3gg";

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
    from: { email: FROM_EMAIL },
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
  /* 1. parse payload – works for both direct invoke & Postgres‑changes */
  const payload = await req.json();
  const rec = ("record" in payload) ? payload.record : payload;

  const { id, user_id, title, message } = rec ?? {};

  if (!user_id || !id) {
    console.error("Missing user_id or id in payload:", payload);
    return new Response("bad payload", { status: 400 });
  }

  try {
    /* 2. fetch auth user's email */
    const { data, error: adminErr } = await db.auth.admin.getUserById(
      user_id as string,
    );

    if (adminErr || !data?.user?.email) {
      throw new Error(`auth admin error: ${adminErr?.message ?? "no email"}`);
    }

    /* 3. send mail */
    await sendEmail(
      data.user.email,
      title ?? "お知らせ",
      `<p>${message ?? ""}</p>`,
      message ?? "",
    );

    /* 4. mark as sent */
    await db.from("notifications")
      .update({ send_status: "sent", sent_at: new Date().toISOString() })
      .eq("id", id);

    return new Response("ok");
  } catch (err) {
    console.error("send-email error:", err);

    /* pessimistically mark as failed (ignore secondary errors) */
    try {
      await db.from("notifications")
        .update({
          send_status: "failed",
          error_reason: String(err),
        })
        .eq("id", id);
    } catch { /* no‑op */ }

    return new Response("internal error", { status: 500 });
  }
});