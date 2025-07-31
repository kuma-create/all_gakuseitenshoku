import { NextResponse } from "next/server";
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
  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!   // ← service_role
  );

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

  // 対象ユーザーのメールアドレスを取得
  const { data: targetUser, error: fetchErr } = await supabase.auth.admin.getUserById(userId);
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
  return NextResponse.redirect(actionLink, { status: 307 });
}
