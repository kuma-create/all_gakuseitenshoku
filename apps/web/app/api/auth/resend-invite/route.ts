// app/api/auth/resend-invite/route.ts
import sgMail from "@sendgrid/mail";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
const SENDGRID_TEMPLATE_ID = "d-918aa719ed544ee6a3c3e2ad783c9670";
const FROM_EMAIL = "admin@gakuten.co.jp";

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  /* ユーザー検索 → メール未確認なら再招待 */
  // Supabase JS v2 does not yet expose getUserByEmail in typings, fallback:
  const { data: listRes, error: listErr } =
    await supabase.auth.admin.listUsers({ email } as any);
  if (listErr || !listRes.users.length)
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });

  const user = listRes.users[0];
  const name = (user.user_metadata as any)?.full_name ?? "";

  const { data: link, error: linkErr } = await supabase.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/company/onboarding/profile`,
      data: { full_name: name },
    },
  });
  if (linkErr) throw linkErr;

  const { action_link, email_otp } = link.properties as unknown as {
    action_link: string;
    email_otp: string;
  };

  await sgMail.send({
    to: email,
    from: FROM_EMAIL,
    templateId: SENDGRID_TEMPLATE_ID,
    dynamicTemplateData: {
      full_name: name,
      confirmation_url: action_link,
      token: email_otp,
      year: new Date().getFullYear(),
    },
  });

  return NextResponse.json({ success: true });
}