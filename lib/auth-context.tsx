/* ───────────────────────────────────────────────
   lib/auth-context.tsx  – 最小限の修正版
   2025-05-16
────────────────────────────────────────────── */
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
export type UserRole = "student" | "company" | "admin" | null;
export type RoleOption = Exclude<UserRole, null>;

export type User = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
} | null;

export type StudentProfile =
  Database["public"]["Tables"]["student_profiles"]["Row"];
export type CompanyProfile =
  Database["public"]["Tables"]["companies"]["Row"];
export type UserProfile = StudentProfile | CompanyProfile | null;

export interface AuthContextValue {
  /** 未判定＝undefined／未ログイン＝null／ログイン済み＝Session */
  session: Session | null | undefined;
  isLoggedIn: boolean | null; // true/false、判定前 null
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

/* ---------- 公開ルート (未ログインでも見られる) ---------- */
const PUBLIC_ROUTES = new Set([
  "/",
  "/login",
  "/signup",
  "/email-callback",
]);

/* ---------- Provider ---------- */
export function AuthProvider({ children }: { children: ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();

  /* 状態 */
  const [session,    setSession]    = useState<Session | null | undefined>(undefined);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [userType,   setUserType]   = useState<UserRole>(null);
  const [user,       setUser]       = useState<User>(null);
  const [profile,    setProfile]    = useState<UserProfile>(null);
  const [error,      setError]      = useState<string | null>(null);

  const clearError = () => setError(null);

  /* ---- session を反映 ---- */
  const applySession = useCallback(
    async (sess: Session | null) => {
      setSession(sess);

      /* 未ログイン ------------------------------------------------ */
      if (!sess) {
        setIsLoggedIn(false);
        setUser(null);
        setProfile(null);
        setUserType(null);

        /* ルートガードをここで一元化 */
        if (!PUBLIC_ROUTES.has(pathname)) router.replace("/login");
        return;
      }

      /* ログイン済み -------------------------------------------- */
      setIsLoggedIn(true);

      /* ロール取得 */
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", sess.user.id)
        .maybeSingle();
      const role = (roleRow?.role ?? "student") as UserRole;
      setUserType(role);

      /* user オブジェクト */
      setUser({
        id   : sess.user.id,
        email: sess.user.email ?? "",
        name :
          sess.user.user_metadata?.full_name ??
          sess.user.email?.split("@")[0] ??
          "ユーザー",
        role,
      });

      /* profile 取得 */
      if (role === "company") {
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

      /* ログインページに居るならロール別ダッシュボードへ */
      if (pathname === "/login" || pathname === "/") {
        router.replace(
          role === "company"
            ? "/company-dashboard"
            : role === "admin"
            ? "/admin-dashboard"
            : "/student-dashboard",
        );
      }
    },
    [pathname, router],
  );

  /* ---- 初回セッション取得＆リスナー ---- */
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      await applySession(session);
    })();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_: AuthChangeEvent, sess) => applySession(sess),
    );
    return () => listener.subscription.unsubscribe();
  }, [applySession]);

  /* ---- 認証 API (login / signup / logout) ---- */
  const signup = async (
    email: string, password: string, role: RoleOption, fullName: string,
  ) => {
    clearError();
    try {
      const { data, error } = await supabase.auth.signUp({
        email, password, options: { data: { full_name: fullName } },
      });
      if (error) throw error;
      if (!data.user) return false;

      await supabase.from("user_roles").insert({
        user_id: data.user.id, role,
      });

      if (role === "student") {
        await supabase.from("student_profiles").insert({
          user_id: data.user.id, full_name: fullName,
        });
      } else if (role === "company") {
        await supabase.from("companies").insert({
          user_id: data.user.id, name: fullName, full_name: fullName,
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
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (error) throw error;
      /* applySession は onAuthStateChange が呼んでくれるので何も返さない */
      return true;
    } catch (e: any) {
      setError(e.message ?? "ログインに失敗しました");
      return false;
    }
  };

  const logout = async () => {
    clearError();
    try {
      await supabase.auth.signOut();
      /* applySession が走るまで待たずに即遷移 */
      router.replace("/login");
    } catch (e: any) {
      setError(e.message ?? "ログアウトに失敗しました");
    }
  };

  /* ---- Provider ---- */
  const value: AuthContextValue = {
    session, isLoggedIn, userType, user, profile, error,
    login, signup, logout, clearError,
  };

  /** session === undefined の間だけ “認証確認中” 用の UI を出す */
  return (
    <AuthContext.Provider value={value}>
      {session === undefined ? null : children}
    </AuthContext.Provider>
  );
}
