'use client';

import { ReactNode, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/sonner";

/**
 * Global React providers (Supabase auth listener + Sonner toaster UI)
 */
export default function Providers({ children }: { children: ReactNode }) {
  /* -------------------------------------------------------------
     GA4 page_view 送信 (client-side SPA ルーティング対応)
  ------------------------------------------------------------- */
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // URL（クエリ付き）
    const url = pathname + (searchParams?.toString() ? `?${searchParams}` : "");
    // gtag が読み込まれているかチェック
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "page_view", { page_path: url });
    }
  }, [pathname, searchParams]);

  /* -------------------------------------------------------------
     Supabase token → HttpOnly cookie 同期
  ------------------------------------------------------------- */
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        fetch("/auth/set", {
          method: "POST",
          credentials: "include",              // ← same-origin でも可だが include が確実
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(session),        // ← 直接 session を送る
        }).catch(console.error);
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthProvider>
      {children}
      <Toaster />
    </AuthProvider>
  );
}