import type { Session } from "@supabase/supabase-js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ROLE_DEST } from "../src/constants/routes";
import { useUserRole } from "../src/hooks/useUserRole";
import { supabase } from "../src/lib/supabase";

/**
 * 認証ガード（Step 1+ ロール別遷移）
 * - 未ログイン: /auth/login へ
 * - ログイン済みで auth 画面: / へ（必要に応じて既定ダッシュボードに変更）
 */
export default function RootLayout() {
  const [qc] = useState(() => new QueryClient());

  const router = useRouter();
  const segments = useSegments();

  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const { role, loading: roleLoading } = useUserRole(session?.user?.id);

  // 初期セッション取得 + 変更購読
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session ?? null);
      setReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return;
      setSession(s ?? null);
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  // ルーティング制御
  useEffect(() => {
    if (!ready) return;

    // 最上位セグメント（例: ["auth", "login"] や ["(auth)", "login"]）
    const first = segments[0];
    const inAuth = first === "auth" || first === "(auth)";

    // 未ログインで auth 以外にいる → ログインへ
    if (!session && !inAuth) {
      router.replace("/auth/login");
      return;
    }

    // ログイン済みで auth 配下にいる → ロール別の既定画面へ
    if (session && inAuth && !roleLoading) {
      const dest = ROLE_DEST[role] ?? "/";
      router.replace(dest);
      return;
    }
  }, [ready, session, segments, role, roleLoading, router]);

  return (
    <QueryClientProvider client={qc}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: true }} />
    </QueryClientProvider>
  );
}