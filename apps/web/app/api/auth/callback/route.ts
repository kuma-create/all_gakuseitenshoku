// app/api/auth/callback/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/lib/supabase/types";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  /* ---------- Supabase Client 初期化 ---------- */
  // NOTE: cookies() now returns a Promise in Next.js 15 (Edge), but the type
  // defs are still ReadonlyRequestCookies. Await it once, then pass the resolved
  // store to Supabase so that internal `cookies().get()` calls don’t trigger the
  // “cookies() should be awaited” runtime error.
  // eslint-disable-next-line @typescript-eslint/await-thenable, @typescript-eslint/no-unsafe-assignment
  const cookieStore = (await cookies()) as any;
  const supabase = createRouteHandlerClient<Database>({
    // return the already‑resolved cookie store
    cookies: () => cookieStore,
  });

  // ------------------------------------------------------------------
  // クライアントから JSON で渡された access_token / refresh_token を受け取る。
  // もし JSON が空、もしくは Content‑Type が違っていた場合は
  // Authorization: Bearer <access_token> ヘッダーから値を取る。
  let access_token = "";
  let refresh_token = "";

  if (req.headers.get("content-type")?.includes("application/json")) {
    try {
      const body = (await req.json()) as {
        access_token?: string;
        refresh_token?: string;
      };
      access_token = body.access_token ?? "";
      refresh_token = body.refresh_token ?? "";
    } catch {
      // ignore JSON parse error and fall back to header
    }
  }

  if (!access_token) {
    const authHeader = req.headers.get("authorization") ?? "";
    access_token = authHeader.replace("Bearer ", "");
    // header には refresh_token が来ないケースが多いので空文字で OK
    refresh_token = refresh_token ?? "";
  }

  if (!access_token) {
    return NextResponse.json(
      { error: "access_token is required" },
      { status: 400 },
    );
  }

  const { error } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });

  if (error) {
    console.error("/auth/callback setSession error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}