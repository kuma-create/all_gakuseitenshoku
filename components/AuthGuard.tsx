"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"

export default function AuthGuard() {
  const router = useRouter()

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        await supabase.auth.signOut({ scope: "local" })  // Cookieも削除
        router.replace("/auth/signin")
      }
    }
    check()
  }, [router])

  return null            // 画面に何も描画しない
}