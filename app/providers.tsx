/* app/providers.tsx */
"use client"

import type { ReactNode } from "react"
import { AuthProvider }   from "@/lib/auth-context"
import { Toaster }        from "@/components/ui/sonner"

/* ほかに ThemeProvider など追加したい場合はここにネスト */

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <Toaster richColors position="top-center" />
    </AuthProvider>
  )
}

