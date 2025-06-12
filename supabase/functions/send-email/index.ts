// supabase/functions/send-email/index.ts
import { serve } from "std/server"
import { createClient } from "@supabase/supabase-js"

// Helper function to send mail via SendGrid REST API
async function sendEmail(to: string, subject: string, html: string, text: string) {
  const apiKey = Deno.env.get("SENDGRID_API_KEY")!;
  const body = {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: "no-reply@notify.gakuten.co.jp" },
    subject,
    content: [
      { type: "text/plain", value: text },
      { type: "text/html",  value: html }
    ]
  };

  const resp = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    throw new Error(`SendGrid error: ${resp.status} ${await resp.text()}`);
  }
}

serve(async (req) => {
  try {
    const { id, user_id, title, message } = await req.json();
    if (!user_id) return new Response("no user_id", { status: 400 });

    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY")!
    );

    const { data: profile } = await db
      .from("profiles")
      .select("email, full_name")
      .eq("id", user_id)
      .single();

    if (!profile?.email) return new Response("email not found", { status: 404 });

    await sendEmail(
      profile.email,
      title,
      `<p>${message}</p>`,
      message
    );

    await db.from("notifications")
      .update({ send_status: "sent" })
      .eq("id", id);

    return new Response("ok");
  } catch (err) {
    console.error("send-email error:", err);
    return new Response("internal error", { status: 500 });
  }
});