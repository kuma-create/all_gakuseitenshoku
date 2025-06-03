"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export type UserRole = "student" | "company" | "admin";
export type RequiredRole = UserRole | "any";
export type GuardMode = "required" | "optional";

/**
 * 認可ガード
 *
 * @param requiredRole - ページに必要なロール（省略時: "any"）
 * @param mode         - "required": ログイン必須 ／ "optional": ゲスト閲覧可
 * @returns ready      - true ならページコンテンツを描画して OK
 */
export function useAuthGuard(
  requiredRole: RequiredRole = "any",
  mode?: GuardMode,
): boolean {
  const router = useRouter();
  const pathname = usePathname();
  const { ready: authReady, isLoggedIn, user } = useAuth();

  // 「mode」を省略した場合は requiredRole に応じて自動判定
  const effectiveMode: GuardMode =
    mode ?? (requiredRole === "any" ? "optional" : "required");

  const [ready, setReady] = useState(false);

  useEffect(() => {
    /* ① Auth Provider の初期化待ち */
    if (!authReady) return;

    /* ② 未ログイン */
    if (!isLoggedIn || !user) {
      // "required" かつ 特定ロールを要求するページのみリダイレクトさせる
      const loginRequired =
        effectiveMode === "required" && requiredRole !== "any";

      if (loginRequired) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }

      // optional または パブリックページ ("any" ロール) はゲスト閲覧を許可
      setReady(true);
      return;
    }

    /* ③ ロール判定 */
    const currentRole: UserRole = (user.role ?? "student") as UserRole;

    if (requiredRole !== "any" && currentRole !== requiredRole) {
      // 権限違い ⇒ 自身ロールのダッシュボードへリダイレクト
      const dashboard =
        currentRole === "company"
          ? "/company-dashboard"
          : currentRole === "admin"
          ? "/admin-dashboard"
          : "/student-dashboard";

      if (pathname !== dashboard) {
        router.replace(dashboard);
        return;
      }
    }

    /* ④ 通過 */
    setReady(true);
  }, [authReady, isLoggedIn, user, requiredRole, effectiveMode, pathname, router]);

  return ready;
}
