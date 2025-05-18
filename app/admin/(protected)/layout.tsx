/* ------------------------------------------------------------------
   app/admin/(protected)/layout.tsx
------------------------------------------------------------------ */
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /* ---- Supabase (Server Component) ---- */
  const supabase = createServerComponentClient<Database>({
    cookies, // headers は不要
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  /* 現在のパスを取得（ヘッダから） */
  const pathname =
    ((headers() as unknown) as { get: (k: string) => string | null }).get(
      "next-url",
    ) || "/admin";

  /* 未ログイン → /admin/login */
  if (!session) {
    redirect(`/admin/login?next=${encodeURIComponent(pathname)}`);
  }

  /* admin 以外 → /login */
  const { data: roleRow } = await supabase
    .from("users")
    .select("role")
    .eq("id" as never, session.user.id as any)
    .maybeSingle();

  if (!roleRow || (roleRow as any).role !== "admin") {
    await supabase.auth.signOut();
    redirect("/login");
  }

  return <>{children}</>;
}