/* app/providers.tsx */
"use client"

import { useEffect, type ReactNode } from "react"
import { AuthProvider }               from "@/lib/auth-context"
import { Toaster }                    from "@/components/ui/sonner"
import { supabase }                   from "@/lib/supabase/client"

/* ほかに ThemeProvider など追加したい場合はここにネスト */

export function Providers({ children }: { children: ReactNode }) {
  /* -------- Supabase token → HttpOnly cookie 同期 -------- */
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        fetch("/auth/set", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",   // Cookie を受け取る
          body: JSON.stringify({ session }),
        });
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthProvider>
      {children}
      <Toaster richColors position="top-center" />
    </AuthProvider>
  )
}
