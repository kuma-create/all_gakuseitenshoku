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
const COMPANY_ROLES = new Set<UserRole>(["company", "company_admin"]);

export type User =
  | {
      id: string;
      email: string;
      name: string;
      role: Exclude<UserRole, null>;
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
  /* ★ login から role 引数削除 */
  login: (email: string, password: string) => Promise<boolean>;
  signup: (
    email: string,
    password: string,
    role: Exclude<UserRole, null>,
    fullName: string,
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
  "/jobs",
  "/onboarding/profile",
  "/grandprix",
  "/lp",
  "/search",
  "/terms",  
  "/lp/students/fee",
  "/media",
  "/companies",
  "/forgot-password",          // 利用規約
  "/password-reset-callback",    // パスワード再設定コールバック
  "/auth",                    // Supabase auth-helper routes (/auth/set, /auth/logout)
  "/privacy-policy",   // プライバシーポリシー
]);

/* ====================================================================== */
export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  /* 状態 ---------------------------------------------------------------- */
  const [session, setSession] = useState<Session | null | undefined>(undefined);
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
      setSession(sess);

      /* ① 未ログイン ---------------------------------------------------- */
      if (!sess) {
        setIsLoggedIn(false);
        setUser(null);
        setProfile(null);
        setUserType(null);
        setReady(true);
        // `/media` とそのサブパスは誰でも閲覧可能
        const isPublic =
          PUBLIC_ROUTES.has(pathname) ||
          pathname === "/media" ||
          pathname.startsWith("/media/") ||
          pathname === "/lp" ||
          pathname.startsWith("/lp/") ||
          pathname === "/jobs" ||
          pathname.startsWith("/jobs/") ||
          pathname === "/search" ||
          pathname.startsWith("/search/") ||
          pathname === "/companies" ||
          pathname.startsWith("/companies/");
        if (!isPublic) router.replace("/login");
        return;
      }

      /* ② ログイン済み -------------------------------------------------- */
      setIsLoggedIn(true);

      /* ★ user_roles からロール取得 */
      const { data: roleRow, error: roleErr } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", sess.user.id)
        .maybeSingle();

      if (roleErr) console.error("[Auth] role fetch error", roleErr);

      const role: UserRole = (roleRow?.role ?? "student") as UserRole;
      setUserType(role);

      /* user オブジェクト */
      setUser({
        id: sess.user.id,
        email: sess.user.email ?? "",
        name:
          sess.user.user_metadata?.full_name ??
          sess.user.email?.split("@")[0] ??
          "ユーザー",
        role: role ?? "student",
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

      /* ダッシュボード自動リダイレクト */
      if (pathname === "/login" || pathname === "/") {
        const redirect =
          COMPANY_ROLES.has(role)
            ? "/company-dashboard"
            : role === "admin"
            ? "/admin"
            : "/student-dashboard";
        router.replace(redirect);
      }
    },
    [pathname, router],
  );

  /* ---- 初回セッション取得 & リスナー --------------------------------- */
  useEffect(() => {
    (async () => {
      let {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        const { data: ref } = await supabase.auth.refreshSession();
        session = ref.session ?? null;
      }
      await applySession(session);
    })();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, sess) => {
        if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN")
          applySession(sess);
        if (event === "SIGNED_OUT") applySession(null);
      },
    );
    return () => listener.subscription.unsubscribe();
  }, [applySession]);

  /* ---- 自動リフレッシュ ---------------------------------------------- */
  useEffect(() => {
    if (!session) return;
    const ttl = session.expires_at! * 1000 - Date.now();
    const timer = setTimeout(
      () => supabase.auth.refreshSession(),
      Math.max(ttl - 5 * 60 * 1000, 0),
    );
    return () => clearTimeout(timer);
  }, [session]);

  /* ---- 認証 API ------------------------------------------------------- */
  const signup = async (
    email: string,
    password: string,
    role: Exclude<UserRole, null>,
    fullName: string,
  ) => {
    clearError();
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error || !data.user) throw error ?? new Error("no user");

      /* user_roles へ 1回だけ insert */
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

  /* ★ login から role 引数削除 */
  const login = async (email: string, password: string) => {
    clearError();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
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
    await supabase.auth.signOut({ scope: "global" });
    await supabase.auth.signOut({ scope: "local" });

    /* sb-xxxx Cookie も削除 */
    document.cookie
      .split(";")
      .map((c) => c.trim().split("=")[0])
      .filter((n) => n.startsWith("sb-"))
      .forEach((n) => {
        document.cookie = `${n}=; Max-Age=0; path=/; SameSite=Lax`;
      });

    localStorage.removeItem("userType");
    setSession(null);
    setProfile(null);
    setUser(null);
    setIsLoggedIn(false);
    setUserType(null);

    await router.replace("/login");
    router.refresh();
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
