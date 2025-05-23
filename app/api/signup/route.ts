import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import sgMail from "@sendgrid/mail";

/** ランタイム: Edge ではなく Node を強制（crypto.randomUUID など利用） */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -------------------------  SendGrid 初期化  ------------------------- */
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function POST(req: Request) {
  const { email, password, first_name, last_name, referral } = await req.json();

  /* 1) バリデーション -------------------------------------------------- */
  if (!email?.trim()) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  /* 2) Supabase 管理クライアント（service_role） ---------------------- */
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY! // service_role key
  );

  /* 3) ユーザー作成 ---------------------------------------------------- */
  const { data: created, error: createErr } =
    await supabase.auth.admin.createUser({
      email,
      password: password || crypto.randomUUID(),
      user_metadata: {
        full_name: `${last_name ?? ""} ${first_name ?? ""}`.trim(),
        referral_source: referral ?? "",
      },
    });
  if (createErr || !created.user) {
    return NextResponse.json({ error: createErr?.message }, { status: 400 });
  }

  /* 4) user_roles に student を INSERT ----------------------------- */
  const { error: roleErr } = await supabase
    .from("user_roles")
    .insert({ user_id: created.user.id, role: "student" });

  if (roleErr) {
    return NextResponse.json({ error: roleErr.message }, { status: 500 });
  }

  /* 5) Magic Link 生成 (#access_token & refresh_token 付き) ----------- */
  const { data: linkData, error: linkErr } =
    await supabase.auth.admin.generateLink({
      email,
      type: "magiclink",
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/email-callback`,
      },
    });

  // linkData の形は v2.36 以降で action_link に変わったので両対応
  const inviteUrl =
    (linkData as any)?.action_link || (linkData as any)?.properties?.action_link;

  if (linkErr || !inviteUrl) {
    return NextResponse.json(
      { error: linkErr?.message ?? "failed to generate link" },
      { status: 500 }
    );
  }

  /* 6) メール送信 (SendGrid) ------------------------------------------ */
  try {
    await sgMail.send({
      to: email,
      from: "admin@gakuten.co.jp", // 認証済み送信元
      subject: "【学生転職】メールアドレス確認のお願い",
      templateId: "d-9c05d8fba26d4d14b0dbafc25076caf4",
      dynamicTemplateData: {
        ConfirmationURL: inviteUrl,
        full_name: `${last_name ?? ""} ${first_name ?? ""}`.trim(),
      },
    });
  } catch (mailErr: any) {
    const sgDetail =
      mailErr?.response?.body?.errors?.[0]?.message ??
      mailErr?.response?.body ??
      mailErr?.message ??
      "SendGrid failed";
    console.error("SendGrid error:", sgDetail);
    return NextResponse.json({ error: "mail_error", detail: sgDetail }, { status: 500 });
  }

  /* 7) 成功レスポンス -------------------------------------------------- */
  return NextResponse.json({ ok: true });
}