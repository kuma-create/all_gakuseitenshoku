import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import sgMail from "@sendgrid/mail";

/* この API は毎回動的に実行（ビルド時に読み込まれない） */
export const dynamic = "force-dynamic";
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function POST(req: Request) {
  const { email, password, first_name, last_name, referral } = await req.json();
  if (!email?.trim()) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!  /* ← service_role */
  );

  /* ------------------------------------------------------------
     1. ユーザーを作成 (email confirmed = false)
        ※ password が空ならランダム文字列を設定
  ------------------------------------------------------------ */
  const { data: created, error: createErr } =
    await supabase.auth.admin.createUser({
      email,
      password: password || crypto.randomUUID(),
      user_metadata: {
        full_name: `${last_name} ${first_name}`.trim(),
        referral_source: referral ?? "",
      },
    });
  if (createErr) {
    return NextResponse.json({ error: createErr.message }, { status: 400 });
  }

  /* auth.users には public 型が無いので @ts-ignore で role を書き換え */
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  await supabase.from("auth.users").update({ role: "student" }).eq("id", created.user?.id);

  /* ------------------------------------------------------------
     2. 招待リンク (implicit flow) を生成
        → #access_token=...&refresh_token=... が付く
  ------------------------------------------------------------ */
  const { data: linkData, error: linkErr } =
    await supabase.auth.admin.generateLink({
      email,
      type: "invite",
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/email-callback`,
      },
    });
  const inviteUrl = linkData?.properties?.action_link;
  if (linkErr || !inviteUrl) {
    return NextResponse.json(
      { error: linkErr?.message ?? "failed to generate link" },
      { status: 500 }
    );
  }

  /* ------------------------------------------------------------
     3. メール送信 (SendGrid)
  ------------------------------------------------------------ */
  try {
    await sgMail.send({
      to: email,
      from: "admin@gakuten.co.jp",  // 認証済みドメイン
      subject: "【学生転職】メールアドレス確認のお願い", // ← 追加
      templateId: "d-9c05d8fba26d4d14b0dbafc25076caf4",
      dynamicTemplateData: {
        ConfirmationURL: inviteUrl,
        full_name: `${last_name} ${first_name}`.trim(),
      },
    });
  } catch (mailErr: any) {
    // SendGrid は errors 配列で詳細を返すことがある
    const sgDetail =
      mailErr?.response?.body?.errors?.[0]?.message ??
      mailErr?.response?.body ??
      mailErr?.message ??
      "SendGrid failed";

    console.error("SendGrid error:", sgDetail);

    return NextResponse.json(
      { error: "mail_error", detail: sgDetail },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}