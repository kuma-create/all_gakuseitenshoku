/* ------------------------------------------------------------------
   app/admin/layout.tsx  –  管理エリア共通レイアウト & ガード
------------------------------------------------------------------ */
import { redirect } from "next/navigation";
import { cookies }  from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: { children: React.ReactNode }) {
  /* ---- Supabase (Server Component) ---- */
  const supabase = createServerComponentClient<Database>({
    cookies: () => cookies(),   // ✅ headers は不要
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  /* 未ログイン → /admin/login */
  if (!session) {
    redirect("/admin/login?next=/admin");
  }

  /* role = admin 必須 */
  const { data: roleRow } = await supabase
    .from("users")
    .select("role")
    .eq("id" as never, session.user.id)   // 型エラー回避
    .maybeSingle();

  const role = (roleRow as any)?.role;    // 型エラー回避

  if (role !== "admin") {
    await supabase.auth.signOut();
    redirect("/login");
  }

  return <>{children}</>;
}