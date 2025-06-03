"use client";
/* ------------------------------------------------------------------
   app/admin/(protected)/layout.tsx – Client‑side auth guard for /admin
------------------------------------------------------------------ */
import { useAuthGuard } from "@/lib/use-auth-guard";

export default function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // admin ロールのみ許可。ログイン必須。
  const ready = useAuthGuard("admin", "required");

  // 認証判定が終わるまで描画しない
  if (!ready) return null;

  return <>{children}</>;
}