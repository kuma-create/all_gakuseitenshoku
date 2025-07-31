import { NextResponse } from "next/server";

// /app/api/admin/exit-impersonate/route.ts
export async function POST() {
  // Supabase v2 cookie names are sb-<projectRef>-auth-token / refresh-token
  const projectRef =
    process.env.NEXT_PUBLIC_SUPABASE_URL!.match(/^https?:\/\/([^.]+)\./)?.[1] ??
    "local";
  const AUTH_COOKIE = `sb-${projectRef}-auth-token`;
  const REFRESH_COOKIE = `sb-${projectRef}-refresh-token`;

  // 成功レスポンスを作成
  const res = NextResponse.json({ success: true });

  // Cookie を削除（有効期限 0 に設定される）
  res.cookies.delete(AUTH_COOKIE);
  res.cookies.delete(REFRESH_COOKIE);

  // 必要なら管理画面へリダイレクト
  // return NextResponse.redirect(new URL("/admin/students", req.url), { status: 302 });

  return res;
}