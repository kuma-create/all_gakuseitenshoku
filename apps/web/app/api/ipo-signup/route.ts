import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import sgMail from "@sendgrid/mail";

/** ------------ IPO大学用ブランド設定（必要に応じて変更可） ------------ */
const BRAND = {
  serviceKey: "ipo", // コールバック等で判定に使う
  displayName: "IPO大学",
  userMail: {
    from: "admin@gakuten.co.jp", // 認証済み送信元（流用）
    subject: "【IPO大学】メールアドレス確認のお願い",
    templateId: "d-9c05d8fba26d4d14b0dbafc25076caf4", // 既存テンプレートを流用
  },
  adminMail: {
    to: "system@gakuten.co.jp",
    from: "admin@gakuten.co.jp",
    subject: "【IPO大学】新規会員登録通知",
  },
  callback: {
    // 既存の共通 email-callback を使い、サービス判定クエリを付与（/ipo/email-callback が無い環境でも安全）
    path: "/email-callback",
    query: "service=ipo",
  },
} as const;

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
    referral_source,
    referral_code,
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
        referral_source: referral_source ?? "",
        referral_code: referral_code ?? "",
        service: BRAND.serviceKey,
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
          referral_source: referral_source ?? "",
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
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}${BRAND.callback.path}?${BRAND.callback.query}`,
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
      from: BRAND.userMail.from,
      subject: BRAND.userMail.subject,
      templateId: BRAND.userMail.templateId,
      dynamicTemplateData: {
        ConfirmationURL: inviteUrl,
        full_name: `${last_name ?? ""} ${first_name ?? ""}`.trim(),
        service_name: BRAND.displayName,
      },
    });
    // --- 管理者通知 ---
    await sgMail.send({
      to: BRAND.adminMail.to,
      from: BRAND.adminMail.from,
      subject: BRAND.adminMail.subject,
      text: `新しい${BRAND.displayName}の会員が登録しました。\n\n氏名: ${last_name ?? ""} ${first_name ?? ""}\nメール: ${email}`,
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
  return NextResponse.json({ ok: true, id: userId });
}
