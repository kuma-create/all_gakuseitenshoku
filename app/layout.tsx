/* --------------------------------------------------------------------------
   app/layout.tsx
   - 全ページ共通ヘッダー（ロゴ＋グローバルナビ）だけを残す
   -------------------------------------------------------------------------- */
   import type { ReactNode } from "react"
   import type { Metadata }   from "next"
   import { Inter }           from "next/font/google"
   import "./globals.css"
   
   import { Providers }         from "./providers"
   import { Header }            from "@/components/header"
   import { MobileNavigation }  from "@/components/mobile-navigation"
   
   const inter = Inter({ subsets: ["latin"] })
   
   export const metadata: Metadata = {
     title      : "学生就活ダッシュボード",
     description: "学生のための就活支援ダッシュボード",
     viewport   : "width=device-width, initial-scale=1, maximum-scale=1",
   }
   
   /* ------------------------------- layout ------------------------------- */
   export default function RootLayout({ children }: { children: ReactNode }) {
     return (
       <html lang="ja">
         <body className={`${inter.className} overflow-x-hidden`}>
           <Providers>
             <div className="flex min-h-screen flex-col">
               <Header />                     {/* ← 上段にナビも含む */}
               <main className="flex-1 pb-16 md:pb-0">{children}</main>
               <MobileNavigation />           {/* モバイル専用フッターナビ */}
             </div>
           </Providers>
         </body>
       </html>
     )
   }
   