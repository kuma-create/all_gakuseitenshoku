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
  const {
    email,
    password,
    first_name,
    last_name,
    referral,
    graduation_month,
  } = await req.json();

  /* 1) バリデーション -------------------------------------------------- */
  if (!email?.trim()) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  /* 2) Supabase 管理クライアント（service_role） ---------------------- */
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY! // service_role key
  );

  /* 3) ユーザー作成（既存なら取得して流用） --------------------------- */
  let userId: string | null = null;

  const { data: created, error: createErr } =
    await supabase.auth.admin.createUser({
      email,
      password: password || crypto.randomUUID(),
      user_metadata: {
        full_name: `${last_name ?? ""} ${first_name ?? ""}`.trim(),
        first_name,
        last_name,
        graduation_month,
        referral_source: referral ?? "",
      },
    });

  if (createErr) {
    /* ------------------------------------------------------------
       createUser が失敗した場合は「既存アカウントかどうか」を問わず
       一度 signInWithPassword を試す。
       ─────────────────────────────────────────────── */
    const { data: signIn, error: signInErr } =
      await supabase.auth.signInWithPassword({ email, password });

    if (signInErr || !signIn?.user) {
      // サインインも失敗 → createErr をそのまま返す
      return NextResponse.json(
        { error: createErr.message ?? "signup_failed" },
        { status: 400 }
      );
    }

    // サインイン成功 → 既存ユーザーとして処理続行
    userId = signIn.user.id;
  } else {
    // 新規作成成功
    userId = created.user!.id;
  }

  /* 4) user_roles に student を UPSERT ------------------------------ */
  const { error: roleErr } = await supabase
    .from("user_roles")
    .upsert(
      [{ user_id: userId, role: "student" }],
      { onConflict: "user_id" } // ← PK/UNIQUE 列名
    );

  if (roleErr) {
    return NextResponse.json({ error: roleErr.message }, { status: 500 });
  }

  /* 4.5) student_profiles にも UPSERT ------------------------------- */
  const { error: profileErr } = await supabase
    .from("student_profiles")
    .upsert(
      [
        {
          id: userId,             // PK
          user_id: userId,        // FK to auth.users.id  ←★追加
          auth_user_id: userId,   // 兼用フィールド
          first_name,
          last_name,
          full_name: `${last_name ?? ""} ${first_name ?? ""}`.trim(),
          graduation_month,
          referral_source: referral ?? "",
        },
      ],
      { onConflict: "id" }          // PK/UNIQUE 列名
    );

  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
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
    // --- 管理者通知 ---
    await sgMail.send({
      to: "system@gakuten.co.jp",
      from: "admin@gakuten.co.jp",
      subject: "【学生転職】新規学生登録通知",
      text: `新しい学生が登録しました。\n\n氏名: ${last_name ?? ""} ${first_name ?? ""}\nメール: ${email}`,
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

