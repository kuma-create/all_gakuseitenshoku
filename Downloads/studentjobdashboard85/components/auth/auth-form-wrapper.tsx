"use client"

import { useSearchParams } from "next/navigation"
import AuthForm from "./auth-form"

interface AuthFormWrapperProps {
  mode: "signin" | "signup"
}

export default function AuthFormWrapper({ mode }: AuthFormWrapperProps) {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")
  const message = searchParams.get("message")

  return <AuthForm mode={mode} error={error} message={message} />
}
