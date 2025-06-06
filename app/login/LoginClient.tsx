"use client";

import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Mail,
  Lock,
  User,
  Building2,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase/client";

/* ---------- 共通小物 ---------- */
const IconInput = ({
  id,
  type,
  placeholder,
  value,
  onChange,
  icon,
  autoComplete,
}: {
  id: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  icon: React.ReactNode;
  autoComplete: string;
}) => (
  <div className="relative">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
      {icon}
    </span>
    <Input
      id={id}
      type={type}
      placeholder={placeholder}
      className="pl-10 focus-visible:ring-red-500 dark:bg-zinc-900"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required
      autoComplete={autoComplete}
    />
  </div>
);

/* ---------- 専用フォーム ---------- */
type Role = "student" | "company" | "company_admin" | "admin";

// --- helper ---------------------------------------------------------------
// DB から本物の role を取得（見つからなければ "student" 扱い）
const fetchUserRole = async (userId: string): Promise<Role> => {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .single();
  if (error || !data) {
    console.error("[fetchUserRole] failed", error);
    return "student";
  }
  return data.role as Role;
};

const LoginForm = ({
  role,
  email,
  password,
  showPW,
  loading,
  error,
  setEmail,
  setPassword,
  togglePW,
  onSubmit,
}: {
  role: Role;
  email: string;
  password: string;
  showPW: boolean;
  loading: boolean;
  error: string | null;
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
  togglePW: () => void;
  onSubmit: (e: FormEvent) => void;
}) => {
  const idPref = role === "student" ? "stu" : "com";
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error && (
        <Alert
          variant="destructive"
          className="border-red-200 bg-red-50 dark:border-red-400/40 dark:bg-red-950/40"
        >
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* email */}
      <div className="space-y-2">
        <Label htmlFor={`${idPref}-email`} className="text-sm">
          メールアドレス
        </Label>
        <IconInput
          id={`${idPref}-email`}
          type="email"
          placeholder="your@mail.com"
          value={email}
          onChange={setEmail}
          icon={<Mail size={18} />}
          autoComplete="username"
        />
      </div>

      {/* password */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={`${idPref}-pw`} className="text-sm">
            パスワード
          </Label>
          <Link
            href="/forgot-password"
            prefetch={false}
            className="text-xs text-red-600 hover:underline"
          >
            パスワードをお忘れ？
          </Link>
        </div>
        <div className="relative">
          <IconInput
            id={`${idPref}-pw`}
            type={showPW ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={setPassword}
            icon={<Lock size={18} />}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={togglePW}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPW ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full bg-red-600 py-6 text-base font-semibold tracking-wide hover:bg-red-700"
        disabled={loading}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        ログイン
      </Button>
    </form>
  );
};

/* ---------- LoginClient ---------- */
export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");

  const {
    session,
    isLoggedIn,
    user,
    login,
    error: ctxError,
    clearError,
  } = useAuth();
  const ready = session !== undefined;

  const [tab, setTab] = useState<Role>("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPW, setShowPW] = useState(false);
  const [loading, setLoading] = useState(false);

  /* ----- 既ログインなら role を取得してリダイレクト ----- */
  useEffect(() => {
    const redirectIfLoggedIn = async () => {
      if (!ready || !isLoggedIn || !user) return;

      // DB から本当のロールを取得 (metadata に無い場合も考慮)
      const realRole = await fetchUserRole(user.id);

      const dest = nextPath
        ? nextPath
        : realRole === "company" || realRole === "company_admin"
        ? "/company-dashboard"
        : realRole === "admin"
        ? "/admin-dashboard"
        : "/student-dashboard";

      router.replace(dest);
    };

    redirectIfLoggedIn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, isLoggedIn, user, nextPath]);

  /* ----- submit ----- */
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    setLoading(true);
    console.log("[handleLogin] called");

    const ok = await login(email, password,)
      .then((v) => {
        console.log("[handleLogin] resolved", v);
        return v;
      })
      .catch((e) => {
        console.error("[handleLogin] rejected", e);
        return false;
      });
    setLoading(false);

    if (ok) {
      await supabase.auth.refreshSession();

      // --- ★ App Router でサーバー Cookie を発行 -------------------------
      // ブラウザ側で signIn しただけでは HttpOnly Cookie が付かないため、
      // access_token を持って /api/auth/callback へ POST し Cookie を生成する
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();
      if (authSession?.access_token && authSession.refresh_token) {
        await fetch("/api/auth/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_token: authSession.access_token,
            refresh_token: authSession.refresh_token,
          }),
          credentials: "same-origin",
        });
      }

      // 認証ユーザーを取得し、user_roles テーブルから正しいロールを読む
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      const realRole: Role = authUser
        ? await fetchUserRole(authUser.id)
        : "student";

      router.replace(
        nextPath
          ? nextPath
          : realRole === "company"
          ? "/company-dashboard"
          : realRole === "admin"
          ? "/admin-dashboard"
          : "/student-dashboard"
      );
    }
  };

  /* ----- JSX ----- */
  return (
    <div
      className="relative flex min-h-screen items-center justify-center
                    overflow-hidden bg-gradient-to-br from-red-100 via-white to-white
                    dark:from-zinc-900 dark:via-zinc-900/60"
    >
      {/* 背景ぼかし */}
      <motion.div
        className="absolute -left-32 -top-32 h-96 w-96 rounded-full
                             bg-red-500/30 blur-3xl"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1 }}
      />
      <motion.div
        className="absolute bottom-0 right-0 h-72 w-72 rounded-full
                             bg-pink-300/20 blur-3xl"
        initial={{ scale: 0 }}
        animate={{ scale: 1.2 }}
        transition={{ duration: 1.2 }}
      />

      {/* カード */}
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 130, damping: 18 }}
        className="relative z-10 m-4 w-full max-w-md rounded-3xl bg-white/70 p-8
                   shadow-xl backdrop-blur-sm dark:bg-zinc-800/70"
      >
        <div className="text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            ログイン
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            あなたのキャリアを切り拓こう
          </p>
        </div>

        {/* ロールタブ */}
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as Role)}
          className="mt-6"
        >
          <TabsList className="grid grid-cols-2 rounded-xl bg-gray-100 p-1 dark:bg-zinc-700">
            <TabsTrigger
              value="student"
              className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800"
            >
              <User size={16} className="mr-1" /> 学生
            </TabsTrigger>
            <TabsTrigger
              value="company"
              className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800"
            >
              <Building2 size={16} className="mr-1" /> 企業
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <LoginForm
          role={tab}
          email={email}
          password={password}
          showPW={showPW}
          loading={loading}
          error={ctxError}
          setEmail={setEmail}
          setPassword={setPassword}
          togglePW={() => setShowPW((p) => !p)}
          onSubmit={handleLogin}
        />

        {/* signup link */}
        <div className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
          アカウントをお持ちでない方は
          <Link
            href={`/signup${
              nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""
            }`}
            prefetch={false}
            className="ml-1 font-medium text-red-600 hover:underline"
          >
            新規登録
          </Link>
        </div>
      </motion.div>
    </div>
  );
}