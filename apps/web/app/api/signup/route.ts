import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import sgMail from "@sendgrid/mail";

// ===== CORS helpers =====
const ALLOWED_ORIGINS = [
  "http://localhost:8081",
  "http://127.0.0.1:8081",
  process.env.NEXT_PUBLIC_SITE_URL || "https://gakuten.co.jp",
  "https://gakuten.co.jp",
  "https://culture.gakuten.co.jp",
];

function corsHeadersFor(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.includes(origin)
    ? origin
    : (process.env.NEXT_PUBLIC_SITE_URL || "https://gakuten.co.jp");
  return {
    "Access-Control-Allow-Origin": allow,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client, X-Client-Platform",    
    "Access-Control-Max-Age": "86400",
  } as Record<string, string>;
}

function jsonWithCors(req: Request, body: any, init?: number | ResponseInit) {
  const cors = corsHeadersFor(req.headers.get("origin"));
  const status = typeof init === "number" ? init : (init as ResponseInit)?.status ?? 200;
  const baseHeaders = (typeof init === "object" && (init as ResponseInit)?.headers) || {};
  const headers = { "Content-Type": "application/json", ...baseHeaders, ...cors } as Record<string, string>;
  return new Response(JSON.stringify(body), { status, headers });
}

export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin");
  return new Response(null, { status: 204, headers: corsHeadersFor(origin) });
}
// ========================

/** ランタイム: Edge ではなく Node を強制（crypto.randomUUID など利用） */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -------------------------  SendGrid 初期化  ------------------------- */
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function POST(req: Request) {
  try {
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
      return jsonWithCors(req, { error: "email required" }, 400);
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
        return jsonWithCors(
          req,
          { error: createErr.message ?? "signup_failed" },
          400
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
      return jsonWithCors(req, { error: roleErr.message }, 500);
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
      return jsonWithCors(req, { error: profileErr.message }, 500);
    }

    /* 5) リンク生成（Web=magiclinkのまま / Mobile=signup+DeepLink） ---- */
    // モバイル/WEB判定: referral_source が無い環境でもヘッダで推定
    const hdr = req.headers;
    const ua = (hdr.get("user-agent") || "");
    const xClient = (hdr.get("x-client") || hdr.get("x-client-platform") || "").toLowerCase();

    // Expo/React Native 由来の UA や独自ヘッダでモバイルを検知
    const uaLooksMobileRN = /Expo|React\s*Native|okhttp/i.test(ua);

    const isMobileSignup =
      (xClient === "mobile") ||
      uaLooksMobileRN;

    // DeepLink の既定値（必要に応じて環境変数で上書き可）
    const APP_DEEP_LINK = process.env.APP_DEEP_LINK_REDIRECT || "gakuten://confirm"; // 例: myapp://confirm

    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      email,
      // モバイルは verifyOtp 用の `signup` を使う（token_hash が付与され、redirectTo に遷移）
      // Web は従来通り magiclink（access_token 付与）
      type: (isMobileSignup ? "signup" : "magiclink") as any,
      options: {
        redirectTo: isMobileSignup
          ? APP_DEEP_LINK // 例: gakuten://confirm?type=signup&token_hash=...
          : `${process.env.NEXT_PUBLIC_SITE_URL}/email-callback`,
      },
    });

    // v2.36 以降で action_link に統一。互換のため両対応
    const inviteUrl = (linkData as any)?.action_link || (linkData as any)?.properties?.action_link;

    if (linkErr || !inviteUrl) {
      return jsonWithCors(
        req,
        { error: linkErr?.message ?? "failed to generate link" },
        500
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
      return jsonWithCors(req, { error: "mail_error", detail: sgDetail }, 500);
    }

    /* 7) 成功レスポンス -------------------------------------------------- */
    return jsonWithCors(req, { ok: true, id: userId });
  } catch (e: any) {
    console.error("/api/signup unexpected error:", e?.message || e);
    return jsonWithCors(req, { error: "internal_error" }, 500);
  }
}
