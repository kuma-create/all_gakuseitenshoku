import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const SITE_URL    = process.env.NEXT_PUBLIC_SITE_URL!;   // 例: https://gakuten.co.jp
const REDIRECT_TO = `${SITE_URL}/impersonated`;          // ユーザー画面の着地点

// Supabase v2 cookie name prefix (sb-<projectRef>-auth-token)
const projectRef =
  process.env.NEXT_PUBLIC_SUPABASE_URL!.match(/^https?:\/\/([^.]+)\./)?.[1] ??
  "local";
const AUTH_COOKIE_NAME = `sb-${projectRef}-auth-token`;

export async function GET(req: Request) {
  const inputId = new URL(req.url).searchParams.get("userId");
  if (!inputId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!   // ← service_role
  );

  // ------------------------------------------------------------------
  // If the supplied ID is a company.id, translate it to the company
  // admin's user_id so we can impersonate that human account.
  // Priority:
  //   1) companies.user_id (owner column)
  //   2) company_members role IN ('owner','admin')
  // ------------------------------------------------------------------
  let targetUserId: string | null = inputId;

  // Attempt 1: companies table owner column
  const { data: companyRow } = await supabase
    .from("companies")
    .select("user_id")
    .eq("id", inputId)
    .maybeSingle();

  if (companyRow?.user_id) {
    targetUserId = companyRow.user_id;
  } else {
    // Attempt 2: company_members table (owner / admin)
    const { data: memberRow } = await supabase
      .from("company_members")
      .select("user_id")
      .eq("company_id", inputId)
      .in("role", ["owner", "admin"])
      .maybeSingle();

    if (memberRow?.user_id) {
      targetUserId = memberRow.user_id;
    }
  }

  // ---- 管理者チェック（user_roles テーブル） ------------------------
  const cookieStore = await cookies();
  let accessToken: string | undefined;
  const cookieRaw = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (cookieRaw) {
    try {
      // Supabase v2 (<2025‑02) stored JSON; later versions store the raw JWT.
      const decoded = decodeURIComponent(cookieRaw);
      const maybeParsed = JSON.parse(decoded);
      if (Array.isArray(maybeParsed) && typeof maybeParsed[0] === "string") {
        // Supabase sometimes stores ["<jwt>", "<refresh>"] array
        accessToken = maybeParsed[0];
      } else if (typeof maybeParsed === "object" && maybeParsed !== null) {
        // Legacy JSON object { access_token, refresh_token }
        accessToken = (maybeParsed as { access_token?: string }).access_token;
      }
      // If still undefined fall back to treating decoded as raw JWT
      accessToken = accessToken ?? decoded;
    } catch {
      // Not JSON – assume it's already the JWT
      accessToken = decodeURIComponent(cookieRaw);
    }
  }
  if (!accessToken) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // 認証クライアント（リクエスト元の JWT を使用）
  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // anon_key
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    }
  );

  const {
    data: { user: currentUser },
  } = await supabaseAuth.auth.getUser();
  if (!currentUser) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // user_roles テーブルで admin 判定
  const { data: roleRow, error: roleErr } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", currentUser.id)
    .eq("role", "admin")
    .maybeSingle();

  if (roleErr || !roleRow) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  // ---- 管理者チェックここまで ---------------------------------------

  // --- 現在の管理者セッションを取得し、refresh_token を退避 -----------------
  const {
    data: { session: adminSession },
  } = await supabaseAuth.auth.getSession();

  // refresh_token を HttpOnly Cookie "impersonator_refresh" として 30 分保存
  const IMPERSONATOR_COOKIE = "impersonator_refresh";
  const COOKIE_MAX_AGE_SEC  = 60 * 30; // 30 minutes

  // 対象ユーザーのメールアドレスを取得
  const { data: targetUser, error: fetchErr } = await supabase.auth.admin.getUserById(targetUserId!);
  if (fetchErr || !targetUser?.user?.email) {
    return NextResponse.json({ error: fetchErr?.message ?? "user not found" }, { status: 404 });
  }
  const targetEmail = targetUser.user.email;

  // 対象ユーザーの token 生成（email を指定）
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: targetEmail,
    options: { redirectTo: REDIRECT_TO },
  });
  if (error || !data?.properties) {
    return NextResponse.json({ error: error?.message ?? "generateLink failed" }, { status: 500 });
  }

  // ここで Supabase が用意したログインリンクへリダイレクト
  const actionLink = (data.properties as { action_link: string }).action_link;
  if (!actionLink) {
    return NextResponse.json({ error: "action_link missing" }, { status: 500 });
  }
  // magic link の redirect_to クエリが既に設定されていればそのまま使用
  const res = NextResponse.redirect(actionLink, { status: 307 });

  // 管理者 refresh_token を退避（存在すれば）
  if (adminSession?.refresh_token) {
    res.cookies.set(IMPERSONATOR_COOKIE, adminSession.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",           // どのパスでも読めるように
      maxAge: COOKIE_MAX_AGE_SEC,
    });
  }
  return res;
}
