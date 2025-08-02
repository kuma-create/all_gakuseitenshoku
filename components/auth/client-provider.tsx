// /components/auth/client-provider.tsx
"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { createClient, Session } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
const AuthCtx = createContext<Session | null>(null);
export const useSession = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // ★ onAuthStateChange はマウント時に 1 回だけ設定
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setSession(currentSession);

      // SIGNED_IN / TOKEN_REFRESHED のときだけ cookie を更新
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        await fetch("/auth/set", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event, session: currentSession }),
        });
      }
    });

    // ★ SSR → CSR で session が undefined になるのを防ぐ
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    return () => subscription.unsubscribe();
  }, []);

  return <AuthCtx.Provider value={session}>{children}</AuthCtx.Provider>;
}