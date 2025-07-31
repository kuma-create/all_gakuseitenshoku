import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!;
const IMPERSONATOR_COOKIE = "impersonator_refresh";

export async function GET() {
  const refresh = (await cookies()).get(IMPERSONATOR_COOKIE)?.value;
  if (!refresh) return NextResponse.redirect(`${SITE_URL}/login`);

  // refresh_token だけでセッションを復元
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { error } = await supabase.auth.setSession({
    // access_token は空文字で OK。refresh_token だけで新しいセッションを取得できる
    access_token: "",
    refresh_token: refresh,
  });
  if (error) return NextResponse.redirect(`${SITE_URL}/login`);

  // クッキーを掃除して管理画面へ
  const res = NextResponse.redirect(`${SITE_URL}/admin`);
  res.cookies.delete(IMPERSONATOR_COOKIE);
  return res;
}