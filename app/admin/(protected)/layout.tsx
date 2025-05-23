/* ------------------------------------------------------------------
   app/admin/(protected)/layout.tsx  –  Protect /admin with JWT role
------------------------------------------------------------------ */
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerComponentClient<Database>({ cookies });

  /* ❶ セッション取得 */
  const {
    data: { session },
  } = await supabase.auth.getSession();

  /* ❷ 未ログイン → /admin/login へ */
  if (!session) {
    redirect("/admin/login?next=/admin");
  }

  /* ❸ JWT / app_metadata から role を取得（DB アクセス不要） */
  const role =
    session.user.user_metadata?.role ??
    (session.user.app_metadata as any)?.role ??
    (session.user as any).role;

  /* ❹ 管理者以外は強制ログアウト → /login */
  if (role !== "admin") {
    await supabase.auth.signOut();
    redirect("/login");
  }

  return <>{children}</>;
}