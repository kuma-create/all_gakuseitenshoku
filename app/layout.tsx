/* --------------------------------------------------------------------------
   app/layout.tsx
   - グローバル共通レイアウト（ヘッダー / モバイルナビ）
-------------------------------------------------------------------------- */
import type { ReactNode } from "react";
import type { Metadata }  from "next";
import { Inter }          from "next/font/google";
import "./globals.css";

import { Providers }        from "./providers";
import Header               from "@/components/header";          // ★ default import に変更
import { MobileNavigation } from "@/components/mobile-navigation";

const inter = Inter({ subsets: ["latin"] });

/* ---- metadata: viewport は除外する ---- */
export const metadata: Metadata = {
  title      : "学生就活ダッシュボード",
  description: "学生のための就活支援ダッシュボード",
};

/* ---- viewport は専用エクスポートで宣言 ---- */
export const viewport = {
  width        : "device-width",
  initialScale : 1,
  maximumScale : 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body className={`${inter.className} overflow-x-hidden`}>
        <Providers>
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
