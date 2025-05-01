"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

interface SignoutButtonProps {
  onSignOutSuccess?: () => void
  className?: string
}

export function SignoutButton({ onSignOutSuccess, className }: SignoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleSignOut = async () => {
    try {
      setIsLoading(true)
      const supabase = createClient()
      await supabase.auth.signOut()

      if (onSignOutSuccess) {
        onSignOutSuccess()
      } else {
        window.location.href = "/"
      }
    } catch (error) {
      console.error("ログアウトエラー:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      onClick={handleSignOut}
      disabled={isLoading}
      className={`text-sm font-medium text-gray-700 hover:text-red-600 transition-colors ${className || ""}`}
    >
      {isLoading ? "ログアウト中..." : "ログアウト"}
    </Button>
  )
}

export default SignoutButton
