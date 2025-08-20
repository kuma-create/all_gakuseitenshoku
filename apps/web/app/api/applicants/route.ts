// app/api/applicants/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

// 内定・不採用の通知先（必要に応じて .env に移してもOK）
const SYSTEM_MAIL_TO = process.env.SYSTEM_MAIL_TO ?? "system@gakuten.co.jp";
const FROM_EMAIL = process.env.FROM_EMAIL!;

/**
 * 期待する入力:
 * {
 *   application_id: string,
 *   new_status: "内定" | "不採用"
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { application_id, new_status } = body ?? {};

    if (!application_id || !new_status) {
      return NextResponse.json(
        { error: "Missing application_id or new_status", body },
        { status: 400 }
      );
    }
    if (new_status !== "内定" && new_status !== "不採用") {
      return NextResponse.json(
        { error: "new_status must be 内定 or 不採用" },
        { status: 400 }
      );
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      // サービスロールで参照（RLSを越えて安全に集約情報を取る）
      process.env.SUPABASE_SERVICE_KEY!
    );

    // applications から job_id, student_id, company_id を取得
    const { data: appRow, error: appErr } = await supabase
      .from("applications")
      .select("id, job_id, student_id, company_id")
      .eq("id", application_id)
      .maybeSingle();

    if (appErr || !appRow) {
      return NextResponse.json(
        { error: "Application not found", details: appErr },
        { status: 404 }
      );
    }

    // 関連情報（求人名・会社名）
    let jobTitle = "";
    if (appRow.job_id) {
      const { data: jobRec } = await supabase
        .from("jobs")
        .select("title")
        .eq("id", appRow.job_id)
        .maybeSingle();
      jobTitle = jobRec?.title ?? "";
    }

    let companyName = "";
    if (appRow.company_id) {
      const { data: compRec } = await supabase
        .from("companies")
        .select("name")
        .eq("id", appRow.company_id)
        .maybeSingle();
      companyName = compRec?.name ?? "";
    }

    // 学生表示名（authメタ or プロフィールビュー優先で取る）
    let studentName = "";
    if (appRow.student_id) {
      const { data: userRes } = await supabase.auth.admin.getUserById(
        appRow.student_id
      );
      const meta = (userRes?.user?.user_metadata ?? {}) as any;
      studentName =
        meta.full_name ??
        [meta.last_name, meta.first_name].filter(Boolean).join(" ") ??
        "";
    }

    // 送信内容
    const url =
      `${process.env.NEXT_PUBLIC_SITE_URL}/company/applicants/${application_id}`;
    const subject =
      new_status === "内定"
        ? "【学生転職】 応募ステータスが「内定」になりました"
        : "【学生転職】 応募ステータスが「不採用」になりました";

    const text = [
      `応募ID：${application_id}`,
      `会社名：${companyName}`,
      `求人名：${jobTitle}`,
      `学生名：${studentName}`,
      `ステータス：${new_status}`,
      `更新日時：${new Date().toLocaleString("ja-JP")}`,
      `リンク：${url}`,
    ]
      .filter(Boolean)
      .join("\n");

    const html = `
      <p>応募ステータスが更新されました。</p>
      <p><b>ステータス：</b>${new_status}</p>
      <p><b>会社名：</b>${companyName || "-"}<br/>
         <b>求人名：</b>${jobTitle || "-"}<br/>
         <b>学生名：</b>${studentName || "-"}</p>
      <p><a href="${url}">応募詳細を開く</a></p>
    `;

    // システム管理者へ通知メール
    const [resSys] = await sgMail.send({
      to: SYSTEM_MAIL_TO,
      from: FROM_EMAIL,
      subject,
      text,
      html,
    });

    console.log("SendGrid status (system):", resSys.statusCode);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("status-notify API error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}