/* ------------------------------------------------------------------
   app/admin/(protected)/layout.tsx  –  admin ロールで保護
------------------------------------------------------------------ */
import { redirect } from "next/navigation";
import { cookies }  from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerComponentClient<Database>({ cookies });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/admin/login?next=/admin");
  }

  const { data: roleRow } = await supabase
    .from("users")
    .select("role")
    .eq("id" as any, session.user.id)
    .maybeSingle();

  if (!roleRow || (roleRow as any).role !== "admin") {
    await supabase.auth.signOut();
    redirect("/login");
  }

  return <>{children}</>;
}