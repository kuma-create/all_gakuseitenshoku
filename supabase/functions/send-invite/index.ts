// supabase/functions/send-invite/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.3"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  // Allow headers sent by supabase-js invoke: x-client-info, apikey, etc.
  "Access-Control-Allow-Headers":
    "authorization, content-type, x-client-info, apikey",
  "Content-Type": "application/json",
} as const

function mustEnv(name: string): string {
  const v = Deno.env.get(name)
  if (!v) throw new Error(`Missing environment variable: ${name}`)
  return v
}

const SENDGRID_API_KEY = mustEnv("SENDGRID_API_KEY");
// SendGrid Dynamic Template ID
const SENDGRID_TEMPLATE_ID = "d-604ad50e903d44c0b31b7dc498e95c72";

const FROM_EMAIL = "info@gakuten.co.jp";
const FROM_NAME = "学生転職";

async function sendInviteEmail(
  to: string,
  actionLink: string,
  linkType: "magiclink" | "invite",
) {
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: { email: FROM_EMAIL, name: FROM_NAME },
      personalizations: [
        {
          to: [{ email: to }],
          dynamic_template_data: {
            action_link: actionLink,
            link_type: linkType, // "magiclink" or "invite"
          },
        },
      ],
      template_id: SENDGRID_TEMPLATE_ID,
    }),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`SendGrid error: ${res.status} ${msg}`);
  }
}

serve(async (req: Request) => {
  // ── CORS pre‑flight
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: CORS_HEADERS })
  }
  try {
    const { email, company_id, role } = await req.json()
    // Normalise input email once at the top
    const normalizedEmail = (email ?? "").trim().toLowerCase();
    // 現在発行しているリンク種別を保持する
    let linkType: "magiclink" | "invite" = "invite";

    // --- Supabase Admin client
    const supabaseUrl = mustEnv("SUPABASE_URL")
    const serviceRoleKey = mustEnv("SUPABASE_SERVICE_ROLE_KEY")
    const appUrl = mustEnv("APP_URL")

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    // -----------------------------------------------------------------
    // Polyfill: Edge runtime build of supabase-js (jsr) currently lacks
    // admin.getUserByEmail(). Re‑implement it through the GoTrue Admin
    // REST API so that downstream logic continues to work unchanged.
    // -----------------------------------------------------------------
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const adminAny: any = supabase.auth.admin;
      if (typeof adminAny.getUserByEmail !== "function") {
        adminAny.getUserByEmail = async (email: string) => {
          const res = await fetch(
            `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(
              email,
            )}`,
            {
              headers: {
                apikey: serviceRoleKey,
                Authorization: `Bearer ${serviceRoleKey}`,
              },
            },
          );

          if (!res.ok) {
            return { user: null, error: new Error(`Admin API error: ${res.status}`) };
          }

          // GoTrue returns `{ users: [...] }`.
          const { users } = await res.json();
          const user = Array.isArray(users) && users.length > 0 ? users[0] : null;
          return { user, error: null };
        };
      }
    }

    // --- UID は generateLink から取得する。getUserByEmail は使わない（誤 UID 混入防止）
    let userId: string | null = null;
    console.log("invite‑target email =", normalizedEmail);
    // 2) 招待リンクを発行（generateLink のみで UID 解決）
    let linkData, linkErr;
    ({ data: linkData, error: linkErr } =
      await supabase.auth.admin.generateLink({
        type: "invite",
        email: normalizedEmail,
        options: { redirectTo: `${appUrl}/login` },
      }));
    // 既存ユーザーの場合 Supabase は自動で invite→magiclink に置き換えず 400 を返すので fallback
    if (
      linkErr &&
      String((linkErr as { message?: string }).message || linkErr).includes(
        "email address has already been registered"
      )
    ) {
      linkType = "magiclink";
      ({ data: linkData, error: linkErr } =
        await supabase.auth.admin.generateLink({
          type: "magiclink",
          email: normalizedEmail,
          options: { redirectTo: `${appUrl}/login` },
        }));
    } else {
      linkType = "invite";
    }

    // DEBUG: generateLink が返した user 情報を記録
    console.log("generateLink result", {
      linkType,
      linkUserId: linkData?.user?.id,
      linkUserEmail: linkData?.user?.email,
    });

    /* ---------------------------------------------------------
     *  Safety guard ②: generateLink が意図しないユーザーを返すケース
     *  稀に別メールの UID が返る報告があるため、email を厳密に照合。
     * --------------------------------------------------------- */
    if (
      linkData?.user?.email &&
      linkData.user.email.toLowerCase() !== normalizedEmail
    ) {
      console.warn(
        "⚠️ generateLink returned mismatched user. expected",
        normalizedEmail,
        "got",
        linkData.user.email,
        "→ retrying getUserByEmail()"
      );
      const { data: retry2, error: retry2Err } =
        await supabase.auth.admin.getUserByEmail(normalizedEmail);
      if (retry2Err && retry2Err.message !== "User not found") throw retry2Err;

      if (retry2?.user) {
        linkData.user = retry2.user;       // overwrite with correct user
      } else {
        throw new Error(
          "generateLink returned wrong user and getUserByEmail() could not recover."
        );
      }
    }
    // --- generateLink の結果は信用せず、必ず email で再取得して UID を確定させる
    // Retry getUserByEmail up to 3 times (500‑ms backoff) to tolerate eventual consistency
    let exactUser: { id: string } | null = null
    for (let attempt = 0; attempt < 3 && !exactUser; attempt++) {
      const { data: exact, error: exactErr } =
        await supabase.auth.admin.getUserByEmail(normalizedEmail)
      if (exactErr && exactErr.message !== "User not found") throw exactErr
      if (exact?.user) {
        exactUser = exact.user as { id: string }
        break
      }
      // Edge case: replication lag – wait 500 ms before retrying
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    if (!exactUser) {
      // 最後の手段: generateLink が返した user を再利用 (email が一致する場合のみ)
      if (
        linkData?.user?.email &&
        linkData.user.email.toLowerCase() === normalizedEmail &&
        linkData.user.id
      ) {
        console.warn(
          "⚠️ getUserByEmail could not find the user after 3 attempts – falling back to linkData.user.id",
        )
        exactUser = { id: linkData.user.id }
      } else {
        throw new Error(
          "Failed to locate user by email after generateLink (after 3 attempts).",
        )
      }
    }

    userId = exactUser.id

    // --- まだ失敗している場合のハンドリング
    let actionLink: string | null = linkData?.properties?.action_link ?? null;

    if (!actionLink) {
      // 招待 / MagicLink が発行できなくてもアカウントは既に存在するケース
      // (confirmed & already registered)。その場合は通常のログイン URL を採用。
      if (
        linkErr &&
        String((linkErr as { message?: string }).message || linkErr).includes(
          "email address has already been registered"
        )
      ) {
        actionLink = `${appUrl}/login`;
        linkErr = null;
      }
    }

    // 依然として問題があればエラーを返す
    if (linkErr || !actionLink) throw linkErr;

    /* ---------------------------------------------------------
     *  確認 ①: 生成直後のユーザーが正しく取得できているか再チェック
     *  Supabase 側のレプリケーション遅延で getUserByEmail → null
     *  → generateLink の `linkData.user` が別ユーザーを返すケースを防ぐ。
     * --------------------------------------------------------- */
    if (!userId) throw new Error("userId should have been set by generateLink");

    // DEBUG: company_members に書き込む内容を記録
    console.log("UPSERT payload", {
      company_id,
      user_id: userId,
      role: role ?? "recruiter",
    });

    // 4) company_members へ UPSERT
    await supabase.from("company_members")
      .upsert({
        company_id,
        user_id: userId,
        role: role ?? "recruiter",
      }, { onConflict: "company_id,user_id" });

    // 5) SendGrid でメール送信
    await sendInviteEmail(normalizedEmail, actionLink, linkType);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: CORS_HEADERS,
    })
  } catch (e) {
    console.error(e)
    const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: CORS_HEADERS,
    })
  }
})