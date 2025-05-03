"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Briefcase, FileText, Mail, MessageSquare, Star, User } from "lucide-react"

export function MobileNavigation() {
  const pathname = usePathname()

  const links = [
    { href: "/", label: "マイページ", icon: User },
    { href: "/resume", label: "職務経歴書", icon: FileText },
    { href: "/jobs", label: "求人一覧", icon: Briefcase },
    { href: "/offers", label: "オファー一覧", icon: Mail },
    { href: "/chat", label: "チャット", icon: MessageSquare },
    { href: "/features", label: "特集", icon: Star },
  ]

  return (
    <div className="fixed bottom-0 left-0 z-50 w-full border-t bg-white md:hidden">
      <div className="mx-auto flex max-w-md justify-between px-2">
        {links.map((link) => {
          const isActive = pathname === link.href
          const Icon = link.icon
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-1 flex-col items-center justify-center py-2 text-[10px] sm:text-xs ${
                isActive ? "text-red-600" : "text-gray-500"
              }`}
            >
              <Icon className="mb-1 h-5 w-5" />
              <span className="line-clamp-1">{link.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
