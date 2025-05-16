/* ───────────────────────────────────────────────
   lib/use-auth-guard.tsx – admin 対応 & 型安全版
────────────────────────────────────────────── */
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export type RequiredRole = "student" | "company" | "admin" | "any";

export function useAuthGuard(requiredRole: RequiredRole = "any") {
  const router   = useRouter();
  const pathname = usePathname();
  const { ready: authReady, isLoggedIn, user } = useAuth();

  /* true になればページ側で描画開始 */
  const [ready, setReady] = useState(false);

  useEffect(() => {
    /* ① Provider の初期判定が終わるまで待つ */
    if (!authReady) return;

    /* ② 未ログイン → /login */
    if (!isLoggedIn) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    /* ③ ロール判定 */
    const currentRole = (user?.role ?? "student") as RequiredRole;

    if (requiredRole !== "any" && currentRole !== requiredRole) {
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
  }, [
    authReady,
    isLoggedIn,
    user?.role,
    requiredRole,
    pathname,
    router,
  ]);

  return ready;
}
