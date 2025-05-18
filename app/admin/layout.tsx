/* ------------------------------------------------------------------
   app/admin/layout.tsx  –  共通レイアウト & Admin ガード
------------------------------------------------------------------ */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import type { Database }      from "@/lib/supabase/types";

export const dynamic = "force-dynamic";   // ← Edge/Middleware と同じ挙動

export default async function AdminLayout({
  children,
}: { children: React.ReactNode }) {

  const {
    data: { session },
  } = await supabase.auth.getSession();

  /* 未ログイン → /admin/login */
  if (!session) {
    redirect(`/admin/login?next=${encodeURIComponent("/admin")}`);
  }

  /* role = admin か確認 */
  const { data: roleRow } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (roleRow?.role !== "admin") {
    // セッションはあるが admin ではない → 強制ログアウト & /login
    await supabase.auth.signOut();
    redirect("/login");
  }

  /* -------- ここから管理画面 -------- */
  return (
    <div className="flex min-h-screen">
      {/* ここでサイドバー等を表示しても良い */}
      <main className="flex-1">{children}</main>
    </div>
  );
}