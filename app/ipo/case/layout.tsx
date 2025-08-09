import type { ReactNode } from "react"

interface GrandPrixLayoutProps {
  children: ReactNode
}

export default function GrandPrixLayout({ children }: GrandPrixLayoutProps) {
  return <>{children}</>
}
