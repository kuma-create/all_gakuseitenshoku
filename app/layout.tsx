/* ------------------------------------------------------------------
   app/layout.tsx – global layout (Server Component)
   ※ このファイルはサーバーコンポーネントにし、React Hooks を
     直接使わないようにします。
-------------------------------------------------------------------*/
import type { ReactNode } from "react";
import type { Metadata }  from "next";
import { Inter }          from "next/font/google";
import "./globals.css";

/* ---------- 共通 UI ---------- */
import Providers            from "./providers";
import Header               from "@/components/header";
import { MobileNavigation } from "@/components/mobile-navigation";
import AuthGuard            from "@/components/AuthGuard";

const inter = Inter({ subsets: ["latin"] });

/* ---------- メタデータ ---------- */
export const metadata: Metadata = {
  title      : "学生就活ダッシュボード",
  description: "学生のための就活支援ダッシュボード",
  openGraph  : { images: ["/ogp.png"] },
};

export const viewport = {
  width         : "device-width",
  initialScale  : 1,
  maximumScale  : 1,
  viewportFit   : "cover",
};

/* ---------- ルートレイアウト ---------- */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja" className="scroll-smooth antialiased">
      <body
        className={`${inter.className} overflow-x-hidden bg-background text-foreground`}
      >
        <Providers>
          {/* クライアント側で認可判定 */}
          <AuthGuard />

          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1 pb-16 md:pb-0">{children}</main>
            <MobileNavigation />
          </div>
        </Providers>
      </body>
    </html>
  );
}
