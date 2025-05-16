/* ────────────────────────────────────────────────
   lib/use-auth-guard.tsx  –  optional モード追加
──────────────────────────────────────────────── */
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export type RequiredRole = "student" | "company" | "admin" | "any";
export type GuardMode    = "required" | "optional";   // ★追加

export function useAuthGuard(
  requiredRole: RequiredRole = "any",
  mode: GuardMode = "required",                      // ★追加
) {
  const router   = useRouter();
  const pathname = usePathname();
  const { ready: authReady, isLoggedIn, user } = useAuth();

  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!authReady) return;               // ① Provider 初期化待ち

    /* ② 未ログイン */
    if (!isLoggedIn) {
      if (mode === "required") {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }
      /* optional ⇒ ゲスト閲覧を許可 */
      setReady(true);
      return;
    }

    /* ③ ロール判定 */
    const currentRole = (user?.role ?? "student") as RequiredRole;
    if (requiredRole !== "any" && currentRole !== requiredRole) {
      /* 権限違い ⇒ 自分のダッシュボードへ */
      const dest =
        currentRole === "company"
          ? "/company-dashboard"
          : currentRole === "admin"
          ? "/admin-dashboard"
          : "/student-dashboard";

      if (pathname !== dest) router.replace(dest);
      return;
    }

    /* ④ 通過 */
    setReady(true);
  }, [authReady, isLoggedIn, user?.role, requiredRole, mode, pathname, router]);

  return ready;
}
