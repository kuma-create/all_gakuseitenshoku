/* ───────────────────────────────────────────────
   lib/auth-context.tsx – セッション維持 & 完全ログアウト対応版
──────────────────────────────────────────────── */
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

/* ---------- 型 ---------- */
export type UserRole = "student" | "company" | "company_admin" | "admin" | null;

/** company サイドのロールをまとめる */
const COMPANY_ROLES = new Set<UserRole>(["company", "company_admin"]);

export type RoleOption = Exclude<UserRole, null>;

export type User =
  | {
      id: string;
      email: string;
      name: string;
      role: UserRole;
    }
  | null;

export type StudentProfile =
  Database["public"]["Tables"]["student_profiles"]["Row"];
export type CompanyProfile =
  Database["public"]["Tables"]["companies"]["Row"];
export type UserProfile = StudentProfile | CompanyProfile | null;

export interface AuthContextValue {
  session: Session | null | undefined;
  isLoggedIn: boolean | null;
  ready: boolean;
  userType: UserRole;
  user: User;
  profile: UserProfile;
  error: string | null;
  login: (e: string, p: string, r: RoleOption) => Promise<boolean>;
  signup: (
    e: string,
    p: string,
    r: RoleOption,
    n: string,
  ) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

/* ---------- Context ---------- */
const AuthContext = createContext<AuthContextValue | null>(null);
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
};

/* ---------- 公開ルート ---------- */
const PUBLIC_ROUTES = new Set([
  "/",
  "/login",
  "/signup",
  "/email-callback",
  "/admin/login",
]);

/* ====================================================================== */
export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  /* 状態 ---------------------------------------------------------------- */
  const [session, setSession] = useState<Session | null | undefined>(
    undefined,
  );
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [ready, setReady] = useState(false);
  const [userType, setUserType] = useState<UserRole>(null);
  const [user, setUser] = useState<User>(null);
  const [profile, setProfile] = useState<UserProfile>(null);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  /* ---- session を反映 ------------------------------------------------- */
  const applySession = useCallback(
    async (sess: Session | null) => {
    // eslint-disable-next-line no-console
    console.log("[DEBUG] applySession – raw session =", sess);
    setSession(sess);

      /* 未ログイン ------------------------------------------------------ */
      if (!sess) {
        setIsLoggedIn(false);
        setUser(null);
        setProfile(null);
        setUserType(null);
        setReady(true);
        if (!PUBLIC_ROUTES.has(pathname)) router.replace("/login");
        return;
      }

      /* ログイン済み ---------------------------------------------------- */
      setIsLoggedIn(true);

      /* ---------- ロール取得 (JWT → app_metadata → user_roles) ---------- */
      const jwtRole =
        // ① user_metadata にあれば最優先
        (sess.user.user_metadata as any)?.role ??
        // ② app_metadata
        (sess.user.app_metadata as any)?.role ??
        // ③ JWT top‑level（Hook で注入された場合）
        (sess.user as any).role ??
        null;

      // rawRole は JWT そのままの文字列を保持（"authenticated" など）
      const rawRole = jwtRole as string | null;
      let role: UserRole = (jwtRole as any) as UserRole;

      /* ---------- role 補正 --------------------------------------------------
         JWT が "authenticated" でも企業レコードがあれば company_admin とみなす。
         逆にどちらのレコードも無ければ student 扱いに落とす。
      ---------------------------------------------------------------------- */
      if (rawRole === "authenticated") {
        const { data: compRow } = await supabase
          .from("companies")
          .select("id")
          .eq("user_id", sess.user.id)
          .maybeSingle();

        if (compRow) {
          role = "company_admin";
        } else {
          role = "student";
        }
      }

      /* JWT に無い場合のみ user_roles でフォールバック */
      if (!role) {
        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", sess.user.id)
          .maybeSingle();
        role = (roleRow?.role ?? "student") as UserRole;
      }

      setUserType(role);

      /* user オブジェクト */
      setUser({
        id: sess.user.id,
        email: sess.user.email ?? "",
        name:
          sess.user.user_metadata?.full_name ??
          sess.user.email?.split("@")[0] ??
          "ユーザー",
        role,
      });

      /* profile 取得 */
      if (COMPANY_ROLES.has(role)) {
        const { data: comp } = await supabase
          .from("companies")
          .select("*")
          .eq("user_id", sess.user.id)
          .maybeSingle();
        setProfile(comp ?? null);
      } else if (role === "student") {
        const { data: stu } = await supabase
          .from("student_profiles")
          .select("*")
          .eq("user_id", sess.user.id)
          .maybeSingle();
        setProfile(stu ?? null);
      } else {
        setProfile(null);
      }

      setReady(true);
      console.log("[DEBUG role]", role, "[path]", pathname);

      /* ダッシュボードリダイレクト */
      if (pathname === "/login" || pathname === "/") {
        const redirectPath =
          COMPANY_ROLES.has(role)
            ? "/company-dashboard"
            : role === "admin"
              ? "/admin"
              : "/student-dashboard";

        router.replace(redirectPath);
      }
    },
    [pathname, router],
  );

  /* ---- 初回セッション取得 & リスナー --------------------------------- */
  useEffect(() => {
    (async () => {
      /* ❶ ローカルセッション取得 */
      let {
        data: { session },
      } = await supabase.auth.getSession();

      /* ❷ 失効していたら手動リフレッシュ */
      if (!session) {
        const { data: ref } = await supabase.auth.refreshSession();
        session = ref.session ?? null;
      }

      await applySession(session);
    })();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, sess) => {
        if (event === "TOKEN_REFRESHED") {
          console.log("[Auth] TOKEN_REFRESHED");
          applySession(sess);
        }
        if (event === "SIGNED_OUT") {
          console.log("[Auth] SIGNED_OUT");
          applySession(null);
        }
        if (event === "SIGNED_IN") {
          // eslint-disable-next-line no-console
          console.log("[DEBUG] onAuthStateChange SIGNED_IN", sess);
          applySession(sess);
        }
      },
    );
    return () => listener.subscription.unsubscribe();
  }, [applySession]);

  /* ---- アイドル時自動リフレッシュ (失効 5 分前) ---------------------- */
  useEffect(() => {
    if (!session) return;
    const ttl = session.expires_at! * 1000 - Date.now();
    const timer = setTimeout(async () => {
      console.log("[Auth] auto refresh");
      await supabase.auth.refreshSession();
    }, Math.max(ttl - 5 * 60 * 1000, 0));
    return () => clearTimeout(timer);
  }, [session]);

  /* ---- 認証 API ------------------------------------------------------- */
  const signup = async (
    email: string,
    password: string,
    role: RoleOption,
    fullName: string,
  ) => {
    clearError();
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) throw error;
      if (!data.user) return false;

      await supabase.from("user_roles").insert({
        user_id: data.user.id,
        role,
      });

      if (role === "student") {
        await supabase.from("student_profiles").insert({
          user_id: data.user.id,
          full_name: fullName,
        });
      } else if (role === "company") {
        await supabase.from("companies").insert({
          user_id: data.user.id,
          name: fullName,
          full_name: fullName,
        });
      }
      return true;
    } catch (e: any) {
      setError(e.message ?? "サインアップに失敗しました");
      return false;
    }
  };

  const login = async (email: string, pw: string, role: RoleOption) => {
    clearError();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pw,
      });

      console.log("[login result]", { data, error });
      if (error) throw error;

      /* session が null → メール未確認 or 設定異常 */
      if (!data.session) {
        setError("メール確認が完了していません。リンクを確認してください。");
        return false;
      }
      return true;
    } catch (e: any) {
      setError(e.message ?? "ログインに失敗しました");
      return false;
    }
  };

  const logout = async () => {
    clearError();
    try {
      const { error } = await supabase.auth.signOut();
      if (error) console.error("[logout error]", error);
    } finally {
      await applySession(null); // 状態リセットを保証
      router.replace("/login");
    }
  };

  /* ---- Provider ------------------------------------------------------- */
  const value: AuthContextValue = {
    session,
    isLoggedIn,
    ready,
    userType,
    user,
    profile,
    error,
    login,
    signup,
    logout,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {session === undefined ? null : children}
    </AuthContext.Provider>
  );
}
