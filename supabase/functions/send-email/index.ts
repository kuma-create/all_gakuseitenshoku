// supabase/functions/send-email/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js";

// --- CORS -------------------------------------------------------------
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// global error hooks
addEventListener("unhandledrejection", (evt) => {
  console.error("UNHANDLED REJECTION:", evt.reason ?? "(no reason)");
});
addEventListener("error", (evt) => {
  console.error("UNCAUGHT ERROR:", evt.error ?? evt.message);
});

const FROM_EMAIL       = Deno.env.get("FROM_EMAIL")       ?? "info@gakuten.co.jp";
const FROM_NAME        = Deno.env.get("FROM_NAME")        ?? "学生転職";  // ← 送信者名
const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")     ?? "https://cpinzmlynykyrxdvkshl.supabase.co";
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;
const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY")!;
const APP_BASE_URL     = Deno.env.get("APP_BASE_URL")     ?? "https://gakuten.co.jp";

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

/* ------------------------------------------------------------------ */
/* SendGrid helper                                                    */
/* ------------------------------------------------------------------ */
async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text: string,
) {
  const body = {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject,
    content: [
      { type: "text/plain", value: text },
      { type: "text/html", value: html },
    ],
  };

  const resp = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    throw new Error(
      `SendGrid error: ${resp.status} ${await resp.text()}`,
    );
  }
}

/* ------------------------------------------------------------------ */
/* Edge Function entry                                                */
/* ------------------------------------------------------------------ */
serve(async (req) => {
  // Handle CORS pre‑flight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  // payload が { record: {...} } なら DB トリガ、直接 JSON ならクライアント
  const payload = await req.json();

  const rec = ("record" in payload) ? payload.record : payload;

  // -------------------------------------------------------------
  // shared helper vars
  // -------------------------------------------------------------
  let studentName = ""; // 学生の氏名（未取得時は空文字）
  const disclaimer =
    "※本メールは配信専用のため、ご返信いただきましても企業へメッセージは届きません。";

let {
  id,
  user_id,
  title,
  message,
  from_role,
  notification_type,
  related_id,   // ★ 関連レコードID
  company_name,
  job_title,    // ★ 追記: ポジション名
  offer_range,  // ★ 追記: オファー額レンジ (万円)
  job_name,     // ★ 追記: 求人名
} = rec ?? {};

// company_name が空文字や undefined の場合は "企業" にフォールバック
const companyLabel = company_name && company_name.trim() !== ""
  ? company_name.trim()
  : "企業";

  // -------------------------------------------------------------
  // URL for student to view the specific scout / offer
  // -------------------------------------------------------------
  const offerLink = related_id
    ? `${APP_BASE_URL}/scouts/${related_id}`
    : APP_BASE_URL;

  // ------------------------------------------------------------------
  // (B) student_id -> auth_uid マッピング
  // フロントから渡る user_id は student_profiles.id の場合があるため
  // student_profiles テーブルから auth_uid を取得して置き換える
  // ------------------------------------------------------------------
  if (user_id) {
    const { data: mapRow, error: mapErr } = await db
      .from("student_profiles")
      .select("auth_user_id, full_name")
      .eq("id", user_id as string)
      .maybeSingle<{ auth_user_id: string | null; full_name: string | null }>();

    studentName = mapRow?.full_name?.trim() ?? "";

    if (mapErr) {
      console.error("map lookup error:", mapErr);
    }

    if (mapRow?.auth_user_id) {
      user_id = mapRow.auth_user_id;
    }
  }

  if (!user_id) {
    console.error("missing user_id in payload", payload);
    return new Response("bad payload", { status: 400, headers: corsHeaders });
  }

  if (!related_id) {
    console.error("missing related_id in payload", payload);
    return new Response("related_id required", { status: 400, headers: corsHeaders });
  }

  // -------------------------------------------------------------
  // derive flags *before* we possibly insert
  const isFromCompany = from_role === "company";
  const isScout      = notification_type === "scout";

  const fallbackTitle =
    title ??
    (isScout
      ? "スカウト通知"
      : isFromCompany
        ? `${companyLabel}からチャット通知`
        : "チャット通知");

  try {
    /* 1. fetch auth user's email */
    const { data, error: adminErr } = await db.auth.admin.getUserById(
      user_id as string,
    );
    if (adminErr || !data?.user?.email) {
      throw new Error(`auth admin error: ${adminErr?.message ?? "no email"}`);
    }

    // ------------------------------------------------------------------
    // Build mail subject / body depending on who sent the chat
    // ------------------------------------------------------------------

    const subject = isScout
      ? `${companyLabel} からスカウトが届きました`
      : isFromCompany
        ? `${companyLabel}から新しいチャットが届きました`
        : (title ?? "お知らせ");

    const html = isScout
      ? `
        <p style="font-size:12px;color:#555;border-top:1px solid #ccc;border-bottom:1px solid #ccc;padding:8px 0;text-align:center;">${disclaimer}</p>

        <p style="font-size:16px;font-weight:bold;">${studentName || "あなた"} さん</p>

        <p style="font-size:15px;">${studentName || "あなた"} さんに企業からオファーが届いています。</p>

        ${job_name
          ? `<p style="font-size:15px;margin:6px 0;"><strong>求人名:</strong> <span style="color:#d97706;font-weight:bold;">${job_name}</span></p>`
          : ""}

        ${job_title
          ? `<p style="font-size:15px;margin:6px 0;"><strong>ポジション:</strong> <span style="color:#d97706;font-weight:bold;">${job_title}</span></p>`
          : ""}

        ${offer_range
          ? `<p style="font-size:14px;margin:6px 0;"><strong>オファー額レンジ:</strong> ${offer_range}万円</p>`
          : ""}

        <p style="font-size:14px;">ログインして、オファーを確認しましょう。</p>

        <p style="text-align:center;margin:24px 0;">
          <a href="${offerLink}" style="background:#2563eb;color:#ffffff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">
            ▶︎ オファーを確認する
          </a>
        </p>

        <p style="font-size:14px;">今後LINEでオファー見逃し通知を受け取りたい方は、以下のリンクから「学生転職公式」を友だち登録</p>

        <p style="word-break:break-all;">https://pdts.offerbox.jp/l/974763/2024-11-20/67s9t</p>

        <p style="font-size:14px;">
          学生転職利用企業はオファーの送信数に上限があり、一斉に送信するのではなく一人ひとりのプロフィールに目を通してオファーを送っています。<br/>
          オファーをきっかけに始まる企業との出会いを大切にし、少しでも興味があるならばオファーを承認してみましょう。<br/>
          また、遠方（地方や留学中などで参加が難しい場合）はWEB（Zoom など）や電話での対応が可能か相談してみましょう。<br/>
          オファーを辞退する場合は「辞退」を選択してください。
        </p>

        <p style="font-size:14px;"><strong>
          ※「承認」または「辞退」を選択しなかった場合、受信日から3日後に自動で取り消されます。<br/>
          「保留」を選択した場合は7日後に自動で取り消されます。<br/>
          ※辞退・自動取り消しの場合は、ご自身でオファーの復活はできませんので、ご注意ください。
        </strong></p>

        <hr/>

        <h3 style="font-size:15px;">◆よくある質問◆</h3>

        <p style="font-size:14px;"><strong>Q.オファーを承認したら、何が起きるのですか？</strong><br/>
        A.個別面談や複数人数での説明会など、企業によってオファー承認後のフローは異なります。また、オファー承認後もオファーの取り消しを企業・学生共に行うことができます。</p>

        <p style="font-size:14px;"><strong>Q.日程や開催場所の都合がつかない場合は、オファーを辞退したほうがいいですか？</strong><br/>
        オファーを辞退する必要はありません。まずはオファーを承認し、その他日程や開催場所で面談等を実施することが可能か、企業担当者に確認してみましょう。</p>

        <hr/>

        <p style="font-size:12px;color:#888;">オファー型就活サイト 学生転職<br/>https://gakuten.co.jp<br/>※このメールアドレスは送信専用です。</p>
      `
      : isFromCompany
        ? `
          <p style="font-size:15px;">${companyLabel}からメッセージが届きました。</p>
          <p style="font-size:14px;">${message ?? ""}</p>
          <hr/>
          <p style="font-size:12px;color:#888;">
            本メールはシステムより自動送信されています。<br/>
            ご返信にはチャット画面をご利用ください。
          </p>
        `
        : `<p>${message ?? ""}</p>`;

    const text = isScout
      ? `${disclaimer}\n\n${studentName || "あなた"} さんに企業からオファーが届いています。\n\n${job_name ? `【求人名】${job_name}\n` : ""}${job_title ? `【ポジション】${job_title}\n` : ""}${offer_range ? `【オファー額レンジ】${offer_range}万円\n` : ""}▼オファーを確認する\n${offerLink}\n\n今後LINEでオファー見逃し通知を受け取りたい方はこちら\nhttps://pdts.offerbox.jp/l/974763/2024-11-20/67s9t\n\n◆よくある質問◆\nQ.オファーを承認したら、何が起きるのですか？\nA.承認後のフローは企業により異なります。個別面談や説明会などがあります。\n\nQ.日程や開催場所の都合がつかない場合は、オファーを辞退したほうがいいですか？\nA.辞退する必要はありません。まずは承認し、企業担当者へ相談してみましょう。\n`
      : isFromCompany
        ? `${companyLabel}からメッセージが届きました。\n\n${message ?? ""}`
        : (message ?? "");

    /* 2. send mail */
    await sendEmail(
      data.user.email,
      subject,
      html,
      text,
    );

    /* 3. mark as sent (only when id is present) */
    if (id) {
      await db.from("notifications")
        .update({ send_status: "sent", sent_at: new Date().toISOString() })
        .eq("id", id);
    }

    return new Response("ok", { headers: corsHeaders });
  } catch (err) {
    console.error(
      "send-email error:",
      typeof err === "object" ? JSON.stringify(err, null, 2) : String(err),
    );
    if (err instanceof Error && err.stack) {
      console.error("stack:", err.stack);
    }
    // pessimistically mark as failed
    try {
      if (id) {
        await db.from("notifications")
          .update({
            send_status: "failed",
            error_reason: String(err),
          })
          .eq("id", id);
      }
    } catch { /* ignore */ }
    return new Response("internal error", { status: 500, headers: corsHeaders });
  }
});
  
