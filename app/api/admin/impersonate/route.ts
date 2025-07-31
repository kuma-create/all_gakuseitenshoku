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
  /* ---------------------------------------------------
     Accept ?userId=... OR ?companyId=... OR ?companyAdminId=...
     companyId が来た場合は companies テーブルから
     auth_uid / user_id / manager_user_id の順で
     対応する Auth UID を取得して userId に代入
  --------------------------------------------------- */
  const url = new URL(req.url);
  let userId: string | undefined = url.searchParams.get("userId") ?? undefined;
  const companyId = url.searchParams.get("companyId") ?? undefined;
  // Optional: ?companyAdminId=...  (points to company_admins.id)
  const companyAdminId = url.searchParams.get("companyAdminId") ?? undefined;

  // --------------------------------------------------------------
  // Service‑role client (must be defined before we first use it)
  // --------------------------------------------------------------
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,   // service_role key
  );

  // -----------------------------------------------------------------------
  // [Compat] もし ?userId= に渡された値が auth.users に存在しなければ
  //          「実は companyId かも知れない」とみなして owner を取得する。
  //          (フロントがまだ userId param を使っているケースに対応)
  // -----------------------------------------------------------------------
  if (userId) {
    const { data: testUser } = await supabase.auth.admin.getUserById(userId);
    if (!testUser?.user) {
      // user が存在しない ⇒ companyId と解釈
      const maybeCompanyId = userId;
      userId = undefined; // リセットして通常の companyId ルートを使用
      // owner look‑up
      const { data: ownerRow, error: ownerErr } = await supabase
        .from("company_members")
        .select("user_id")
        .eq("company_id", maybeCompanyId)
        .eq("role", "owner")
        .maybeSingle();

      if (ownerErr) {
        return NextResponse.json({ error: ownerErr.message }, { status: 500 });
      }
      if (!ownerRow?.user_id) {
        return NextResponse.json(
          { error: "Owner user not found for company" },
          { status: 404 },
        );
      }
      userId = ownerRow.user_id;
    }
  }
  // -----------------------------------------------------------------------


  if (!userId && companyId) {
    // company_members から role='owner' の user_id を取得
    const { data: ownerRow, error: ownerErr } = await supabase
      .from("company_members")
      .select("user_id")
      .eq("company_id", companyId)
      .eq("role", "owner")
      .maybeSingle();

    if (ownerErr) {
      return NextResponse.json({ error: ownerErr.message }, { status: 500 });
    }
    if (!ownerRow?.user_id) {
      // owner が存在しない場合はエラーを返す（companies テーブルには一切フォールバックしない）
      return NextResponse.json(
        { error: "Owner user not found for company" },
        { status: 404 },
      );
    }

    userId = ownerRow.user_id;
  }
  // -----------------------------------------------------------------------
  // companyAdminId が来た場合は company_admins テーブルから
  // auth_uid / user_id の順で対応する Auth UID を取得して userId に代入
  // -----------------------------------------------------------------------
  if (!userId && companyAdminId) {
    const { data: adminRow, error: adminErr } = await supabase
      .from("company_admins")          // ★テーブル名を合わせてください
      .select("auth_uid, user_id")
      .eq("id", companyAdminId)
      .maybeSingle();

    if (adminErr) {
      return NextResponse.json({ error: adminErr.message }, { status: 500 });
    }
    if (!adminRow) {
      return NextResponse.json({ error: "Company admin not found" }, { status: 404 });
    }

    userId =
      (adminRow as any).auth_uid ??
      (adminRow as any).user_id ??
      undefined;

    if (!userId) {
      return NextResponse.json(
        { error: "Linked user_id not found for company admin" },
        { status: 404 },
      );
    }
  }
  // -----------------------------------------------------------------------

  if (!userId) {
    return NextResponse.json(
      { error: "userId or companyId required" },
      { status: 400 },
    );
  }


  // ---- 管理者チェック（user_roles テーブル） ------------------------
  const cookieStore = await cookies();
  let currentAccessToken: string | undefined;
  const cookieRaw = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (cookieRaw) {
    try {
      // Supabase v2 (<2025‑02) stored JSON; later versions store the raw JWT.
      const decoded = decodeURIComponent(cookieRaw);
      const maybeParsed = JSON.parse(decoded);
      if (Array.isArray(maybeParsed) && typeof maybeParsed[0] === "string") {
        // Supabase sometimes stores ["<jwt>", "<refresh>"] array
        currentAccessToken = maybeParsed[0];
      } else if (typeof maybeParsed === "object" && maybeParsed !== null) {
        // Legacy JSON object { access_token, refresh_token }
        currentAccessToken = (maybeParsed as { access_token?: string }).access_token;
      }
      // If still undefined fall back to treating decoded as raw JWT
      currentAccessToken = currentAccessToken ?? decoded;
    } catch {
      // Not JSON – assume it's already the JWT
      currentAccessToken = decodeURIComponent(cookieRaw);
    }
  }
  if (!currentAccessToken) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // 認証クライアント（リクエスト元の JWT を使用）
  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // anon_key
    {
      global: { headers: { Authorization: `Bearer ${currentAccessToken}` } },
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

  let accessToken: string | undefined;
  // -------------------------------------------------------------------
  // ① Try Admin API createAccessToken (Supabase JS v2.43+)
  // -------------------------------------------------------------------
  if ((supabase.auth.admin as any).createAccessToken) {
    const { data: tokenData, error: tokenErr } =
      await (supabase.auth.admin as any).createAccessToken(userId);

    if (tokenErr) {
      return NextResponse.json(
        { error: tokenErr.message },
        { status: 500 },
      );
    }
    accessToken = tokenData?.access_token;
  }

  // -------------------------------------------------------------------
  // ② Fallback: generateLink(type: "magiclink")  (older SDKs)
  // -------------------------------------------------------------------
  if (!accessToken) {
    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: targetUser.user.email,
      options: { redirectTo: REDIRECT_TO },
    });

    if (linkErr || !linkData?.properties || !(linkData.properties as any).action_link) {
      return NextResponse.json(
        { error: linkErr?.message ?? "generateLink failed" },
        { status: 500 },
      );
    }

    // action_link 形式: https://<project>.supabase.co/auth/v1/verify?token=<jwt>&type=signInToken
    const actionLink = (linkData.properties as { action_link: string }).action_link;
    const tokenParam  = new URL(actionLink).searchParams.get("token");
    if (!tokenParam) {
      return NextResponse.json(
        { error: "token missing in action_link" },
        { status: 500 },
      );
    }
    accessToken = tokenParam;
  }

  if (!accessToken) {
    return NextResponse.json(
      { error: "failed to create access token" },
      { status: 500 },
    );
  }

  // Supabase v2 cookie expects JSON array [access_token, refresh_token]
  const cookieValue = encodeURIComponent(JSON.stringify([accessToken, ""]));

  // Decide cookie properties based on environment (localhost vs production)
  const cookieDomain = new URL(SITE_URL).hostname;          // e.g. gakuten.co.jp or localhost
  const cookieSecure = !SITE_URL.startsWith("http://localhost");

  // -------------------------------------------------------------------
  // ② Cookie をセットして所定の画面へリダイレクト
  // -------------------------------------------------------------------
  const res = NextResponse.redirect(REDIRECT_TO, { status: 302 });
  res.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: cookieValue,
    domain: cookieDomain,
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    secure: cookieSecure,     // secure=true when SITE_URL is https
    maxAge: 60 * 60,          // 1 hour
  });
  return res;
}
