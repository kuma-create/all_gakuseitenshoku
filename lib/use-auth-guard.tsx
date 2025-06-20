"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
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
  // Auth ユーザーに role 情報が無い場合、user_roles テーブルから取得
  const [dbRole, setDbRole] = useState<UserRole | null>(null);

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

    /* ②-0 metadata からロール取得（あれば最優先で使う） */
    const rawUser: any = user;
    const metaRole: UserRole | null = (
      rawUser?.user_metadata?.user_role ??
      rawUser?.user_metadata?.role ??
      rawUser?.app_metadata?.user_role ??
      rawUser?.app_metadata?.role ??
      rawUser?.role ??
      null
    ) as UserRole | null;

    /* ②-1 Auth ユーザーに role が無ければ DB から取得して state に保存 */
    if (isLoggedIn && user && !metaRole && !dbRole) {
      (async () => {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (!error && data?.role) {
          setDbRole(data.role as UserRole);
        }
      })();
      // DB フェッチが終わるまで待機
      return;
    }

    /* ③ ロール判定 */
    const currentRole: UserRole = (
      metaRole ??                 // metadata / app_metadata 優先
      dbRole   ??                 // user_roles テーブル
      "student"                   // フォールバック
    ) as UserRole;

    if (requiredRole !== "any" && currentRole !== requiredRole) {
      // 権限違い ⇒ 自身ロールのダッシュボードへリダイレクト
      const dashboard =
        currentRole === "company"
          ? "/company-dashboard"
          : currentRole === "admin"
          ? "/admin"
          : "/student-dashboard";

      if (pathname !== dashboard) {
        router.replace(dashboard);
        return;
      }
    }

    /* ④ 通過 */
    setReady(true);
  }, [authReady, isLoggedIn, user, dbRole, requiredRole, effectiveMode, pathname, router]);

  return ready;
}
