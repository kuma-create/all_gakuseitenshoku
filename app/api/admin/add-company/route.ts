// app/api/admin/add-company/route.ts
import sgMail from "@sendgrid/mail";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export const runtime = "nodejs";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
const SENDGRID_TEMPLATE_ID = "d-918aa719ed544ee6a3c3e2ad783c9670"; // Dynamic Template
const FROM_EMAIL = "admin@gakuten.co.jp";                           // 送信元

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

      /* 既存ユーザーの場合 */
      if (existing) {
        uid = existing.id;
        /* user_metadata.role を company_admin に補正（JWT へ確実に載せるため） */
        if ((existing.user_metadata as any)?.role !== "company_admin") {
          await supabase.auth.admin.updateUserById(uid, {
            user_metadata: { ...(existing.user_metadata ?? {}), role: "company_admin" },
          });
        }

        // まだメール確認が済んでいなければ招待リンクを再生成して送信
        if (existing.email_confirmed_at === null) {
          const { data: link, error: linkErr } =
            await supabase.auth.admin.generateLink({
              type: "invite",
              email,
              options: {
                redirectTo: `${NEXT_PUBLIC_SITE_URL}/company/onboarding/profile`,
                data: { full_name: name },
              },
            });
          if (linkErr) throw linkErr;

          // cast because the typings don't expose action_link / email_otp
          const { action_link: actionLink, email_otp: emailOtp } = link
            .properties as unknown as { action_link: string; email_otp: string };

          const [sgRes] = await sgMail.send({
            to: email,
            from: FROM_EMAIL,
            templateId: SENDGRID_TEMPLATE_ID,
            dynamicTemplateData: {
              full_name: name,
              confirmation_url: actionLink,
              token: emailOtp,
              year: new Date().getFullYear(),
            },
          });
          console.log("[sendgrid]", sgRes.statusCode, sgRes.body);
        }
      } else {
        /* ---------- 2. 新規ユーザーを作成し、招待リンクを送信 ---------- */
        const { data: userRes, error: userErr } =
          await supabase.auth.admin.createUser({
            email,
            email_confirm: false,
            user_metadata: { full_name: name, role: "company_admin" },
          });
        if (userErr || !userRes) throw userErr ?? new Error("createUser failed");
        if (!userRes.user) throw new Error("createUser returned no user");
        uid = userRes.user.id;

        const { data: link, error: linkErr } =
          await supabase.auth.admin.generateLink({
            type: "invite",
            email,
            options: {
              redirectTo: `${NEXT_PUBLIC_SITE_URL}/company/onboarding/profile`,
              data: { full_name: name },
            },
          });
        if (linkErr) throw linkErr;

        // cast because the typings don't expose action_link / email_otp
        const { action_link: actionLink, email_otp: emailOtp } = link
          .properties as unknown as { action_link: string; email_otp: string };

        const [sgRes] = await sgMail.send({
          to: email,
          from: FROM_EMAIL,
          templateId: SENDGRID_TEMPLATE_ID,
          dynamicTemplateData: {
            full_name: name,
            confirmation_url: actionLink,
            token: emailOtp,
            year: new Date().getFullYear(),
          },
        });
        console.log("[sendgrid]", sgRes.statusCode, sgRes.body);
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