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
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session }),   // null も送る
        });
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
