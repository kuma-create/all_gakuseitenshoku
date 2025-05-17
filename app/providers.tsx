'use client';

import { ReactNode, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/sonner";

/**
 * Global React providers (Supabase auth listener + Sonner toaster UI)
 */
export default function Providers({ children }: { children: ReactNode }) {
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