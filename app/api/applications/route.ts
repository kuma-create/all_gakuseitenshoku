export const runtime = 'nodejs';
// app/api/applications/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function POST(req: Request) {
  try {
    // Debug: log parsed JSON body
    const body = await req.json();
    console.log('Applications POST body:', body);
    const { job_id, student_id } = body;
    if (!job_id || !student_id) {
      return NextResponse.json(
        { error: "Missing job_id or student_id", body },
        { status: 400 }
      );
    }
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // 0) job の company_id を取得
    const { data: jobRec, error: jobErr } = await supabase
      .from("jobs")
      .select("company_id, title")
      .eq("id", job_id)
      .single();
    if (jobErr || !jobRec?.company_id) {
      console.error("Job fetch error or missing company_id:", jobErr);
    }
    const companyIdFromJob = jobRec?.company_id;
    const jobTitle = jobRec?.title ?? "";

    // 学生ユーザー情報を取得して氏名を取得
    const { data: studentUserRec, error: studentUserErr } = await supabase.auth.admin.getUserById(student_id);
    const studentName = (studentUserRec?.user?.user_metadata as any)?.full_name ?? "";
    if (studentUserErr) {
      console.error("Student user fetch error:", studentUserErr);
    }

    // 1) applications テーブルに挿入
    const { data: newApp, error } = await supabase
      .from("applications")
      .insert([{ job_id, student_id, company_id: companyIdFromJob }])
      .select()
      .single();
    if (error) {
      const detailsJson = JSON.stringify(error, null, 2);
      console.error("Supabase insert error details:", detailsJson);
      return NextResponse.json(
        { error: error.message, details: detailsJson },
        { status: 500 }
      );
    }

    // 2) 企業メール取得 + 送信
    const companyId = newApp.company_id;
    if (companyId) {
      // 1) companies テーブルから user_id, name を取得
      const { data: compRec, error: compErr } = await supabase
        .from('companies')
        .select('user_id, name')
        .eq('id', companyId)
        .single();

      // Company name for system‑monitoring email
      const companyName = compRec?.name ?? "";
      if (!compRec?.user_id || compErr) {
        console.error('Company record error or missing user_id:', compErr);
      } else {
        // 2) Auth Admin API でユーザー情報を取得
        const { data: userRec, error: userErr } = await supabase.auth.admin.getUserById(compRec.user_id);
        const email = userRec?.user?.email;
        if (userErr || !email) {
          console.error('Auth user fetch error or missing email:', userErr);
        } else {
          const url = `${process.env.NEXT_PUBLIC_SITE_URL}/company/applicants`;
          try {
            // 企業担当者へ通知
            const [resCorp] = await sgMail.send({
              to: email,
              from: process.env.FROM_EMAIL!,
              subject: "【学生転職】 新規応募が届きました！！",
              text: `新規応募が届きました。\n求人名：${jobTitle}\n学生名：${studentName}\nリンク：${url}`,
              html: `
                <p>新規応募が届きました。</p>
                <p>求人名：${jobTitle}</p>
                <p>学生名：${studentName}</p>
                <p><a href="${url}">応募者を確認する</a></p>
              `,
            });
            console.log('SendGrid corp status:', resCorp.statusCode);

            // システム監視用アドレスへ通知
            const [resSys] = await sgMail.send({
              to: 'system@gakuten.co.jp',
              from: process.env.FROM_EMAIL!,
              subject: "【学生転職】 新規応募が届きました！！",
              text: `新規応募が届きました。\n会社名：${companyName}\n求人名：${jobTitle}\n学生名：${studentName}`,
              html: `
                <p>新規応募が届きました。</p>
                <p>会社名：${companyName}</p>
                <p>求人名：${jobTitle}</p>
                <p>学生名：${studentName}</p>
              `,
            });
            console.log('SendGrid system status:', resSys.statusCode);
          } catch (err: any) {
            console.error('SendGrid send error:', err);
          }
        }
      }
    }

    return NextResponse.json({ data: newApp });
  } catch (error: any) {
    console.error('Applications API error:', error);
    return NextResponse.json(
      { error: error?.message ?? 'Internal Server Error' },
      { status: 500 }
    );
  }
}