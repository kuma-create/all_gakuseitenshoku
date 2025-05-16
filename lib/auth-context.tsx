/* ───────────────────────────────────────────────
   lib/auth-context.tsx
   - 認証コンテキスト（login は “状態更新だけ” に純化）
────────────────────────────────────────────── */
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { AuthChangeEvent, Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

/* ------------------------------------------------------------------ */
/*                               型定義                                */
/* ------------------------------------------------------------------ */
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
  /* 状態 */
  ready: boolean;
  isLoggedIn: boolean;
  userType: UserRole;
  session: Session | null;
  user: User;
  profile: UserProfile;
  error: string | null;
  /* アクション */
  login: (email: string, pw: string, role: RoleOption) => Promise<boolean>;
  signup: (
    email: string,
    pw: string,
    role: RoleOption,
    fullName: string,
  ) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

/* ------------------------------------------------------------------ */
/*                              Context                                */
/* ------------------------------------------------------------------ */
const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
};

/* ------------------------------------------------------------------ */
/*                             Provider                                */
/* ------------------------------------------------------------------ */
export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  /* ---------------- state ---------------- */
  const [ready, setReady]           = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userType, setUserType]     = useState<UserRole>(null);
  const [session, setSession]       = useState<Session | null>(null);
  const [user, setUser]             = useState<User>(null);
  const [profile, setProfile]       = useState<UserProfile>(null);
  const [error, setError]           = useState<string | null>(null);

  const clearError = () => setError(null);

  /* ----------------------------------------------------------------
     共通: セッション適用（リダイレクトは行わない）
  ---------------------------------------------------------------- */
  const applySession = async (sess: Session | null) => {
    setSession(sess);

    if (!sess) {
      /* ログアウト状態にリセット */
      setIsLoggedIn(false);
      setUser(null);
      setProfile(null);
      setUserType(null);
      return;
    }

    setIsLoggedIn(true);

    /* ----- role 取得（無ければ student） ----- */
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", sess.user.id)
      .maybeSingle();
    const role = (roleRow?.role ?? "student") as UserRole;
    setUserType(role);

    /* ----- user オブジェクト ----- */
    setUser({
      id   : sess.user.id,
      email: sess.user.email ?? "",
      name :
        sess.user.user_metadata?.full_name ??
        sess.user.email?.split("@")[0] ??
        "ユーザー",
      role,
    });

    /* ----- profile 取得 ----- */
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
      setProfile(null); // admin は profile 無し
    }
  };

  /* ----------------------------------------------------------------
     初回セッション取得 & 認証イベント購読
  ---------------------------------------------------------------- */
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      await applySession(session);
      setReady(true);
    })();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_e: AuthChangeEvent, sess) => applySession(sess),
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  /* ----------------------------------------------------------------
     signup
  ---------------------------------------------------------------- */
  const signup = async (
    email: string,
    password: string,
    role: RoleOption,
    fullName: string,
  ): Promise<boolean> => {
    clearError();
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) throw error;
      if (!data.user) return true; // メール認証フローのみ

      /* user_roles 挿入 */
      await supabase
        .from("user_roles")
        .upsert([{ user_id: data.user.id, role }], { onConflict: "user_id" });
      setUserType(role);

      /* profile 初期化（admin は profile 無し） */
      if (role === "company") {
        await supabase.from("companies").insert({
          user_id: data.user.id,
          name   : fullName,
        });
      } else if (role === "student") {
        await supabase.from("student_profiles").insert({
          user_id  : data.user.id,
          full_name: fullName,
        });
      }
      return true;
    } catch (e: any) {
      setError(e.message ?? "サインアップに失敗しました");
      return false;
    }
  };

  /* ----------------------------------------------------------------
     login  – 状態更新のみ（リダイレクトしない）
  ---------------------------------------------------------------- */
  const login = async (
    email: string,
    password: string,
    roleInput: RoleOption,
  ): Promise<boolean> => {
    clearError();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email, password,
      });
      if (error || !data.session) throw error ?? new Error("login failed");

      const uid = data.user.id;

      /* user_roles upsert（roleInput は fallback）*/
      await supabase
        .from("user_roles")
        .upsert([{ user_id: uid, role: roleInput }], { onConflict: "user_id" });

      /* 最終 role 決定 */
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .maybeSingle();
      const roleFinal = (roleRow?.role ?? roleInput) as UserRole;

      /* Context 状態更新 */
      setSession(data.session);
      setIsLoggedIn(true);
      setUser({
        id   : uid,
        email: data.user.email ?? "",
        name : data.user.user_metadata?.full_name ?? "ユーザー",
        role : roleFinal,
      });
      setUserType(roleFinal);

      return true;
    } catch (e: any) {
      console.error("Login error:", e);
      setError(e.message ?? "ログインに失敗しました");
      return false;
    }
  };

  /* ----------------------------------------------------------------
     logout
  ---------------------------------------------------------------- */
  const logout = async () => {
    clearError();
    try {
      await supabase.auth.signOut();
      router.replace("/login");
    } catch (e: any) {
      setError(e.message ?? "ログアウトに失敗しました");
    }
  };

  /* ----------------------------------------------------------------
     Provider
  ---------------------------------------------------------------- */
  const value: AuthContextValue = {
    ready,
    isLoggedIn,
    userType,
    session,
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
      {children}
    </AuthContext.Provider>
  );
}
