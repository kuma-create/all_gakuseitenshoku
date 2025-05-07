/* --------------------------------------------------------------------------
   app/layout.tsx   – ルートレイアウトを学生向けに再構成
   - 全ページ共通ヘッダー＋デスクトップ用グローバルナビを追加
   - モバイルは既存 <MobileNavigation /> に任せる
   -------------------------------------------------------------------------- */

   import type { ReactNode } from "react"
   import type { Metadata } from "next"
   import Link from "next/link"
   import { Inter } from "next/font/google"
   import { LayoutDashboard, User, Briefcase } from "lucide-react"
   
   import "./globals.css"
   import { Providers } from "./providers"
   import { Header } from "@/components/header"
   import { MobileNavigation } from "@/components/mobile-navigation"
   
   const inter = Inter({ subsets: ["latin"] })
   
   /* ───────────────────────── meta ───────────────────────── */
   export const metadata: Metadata = {
     title:       "学生就活ダッシュボード",
     description: "学生のための就活支援ダッシュボード",
     viewport:    "width=device-width, initial-scale=1, maximum-scale=1",
     generator:   "v0.dev",
   }
   
   /* ────────────────── Desktop ナビゲーション ────────────────── */
   function DesktopNavigation() {
     const items = [
       { href: "/student-dashboard", icon: LayoutDashboard, label: "Dashboard" },
       { href: "/student/profile",    icon: User,            label: "プロフィール" },
       { href: "/student/resume",     icon: Briefcase,       label: "職務経歴" },
     ]
   
     return (
       <nav className="hidden md:flex items-center gap-6 px-8 py-3 bg-gray-800 text-gray-100">
         {items.map(({ href, icon: Icon, label }) => (
           <Link
             key={href}
             href={href}
             className="flex items-center gap-2 font-medium hover:text-white transition-colors"
           >
             <Icon size={16} />
             {label}
           </Link>
         ))}
       </nav>
     )
   }
   
   /* ───────────────────────── layout ───────────────────────── */
   export default function RootLayout({ children }: { children: ReactNode }) {
     return (
       <html lang="ja">
         <body className={`${inter.className} overflow-x-hidden`}>
           <Providers>
             <div className="flex min-h-screen flex-col">
   
               {/* 固定ヘッダー（ロゴ・右上メニューなど） */}
               <Header />
   
               {/* デスクトップ用グローバルナビ */}
               <DesktopNavigation />
   
               {/* ページ本体 */}
               <main className="flex-1 pb-16 md:pb-0">{children}</main>
   
               {/* モバイル固定ナビ（従来コンポーネント） */}
               <MobileNavigation />
             </div>
           </Providers>
         </body>
       </html>
     )
   }
   