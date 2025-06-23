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
  title:
    "学生転職 | 長期インターン・アルバイト経験を活かす逆求人型就活サービス",
  description:
    "学生転職は学生時代の職歴を評価し、企業からスカウトが届く逆求人型就活サービスです。職務経歴書テンプレートや就活グランプリで市場価値を高め、ハイキャリアのスタートを切りましょう。",
  metadataBase: new URL("https://culture.gakuten.co.jp"),
  alternates: {
    canonical: "https://culture.gakuten.co.jp/",
  },
  openGraph: {
    title:
      "学生転職 | 長期インターン・アルバイト経験を活かす逆求人型就活サービス",
    description:
      "職歴を活かしてハイレベルな就活を。学生転職は学生向けのスカウト型オファーサービスです。",
    url: "https://culture.gakuten.co.jp/",
    siteName: "学生転職",
    locale: "ja_JP",
    type: "website",
    images: [
      {
        url: "/ogp.png",
        width: 1200,
        height: 630,
        alt: "学生転職のサービスイメージ",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "学生転職 | 長期インターン・アルバイト経験を活かす逆求人型就活サービス",
    description:
      "学生時代の職歴を活かしてハイキャリア就活を実現。プロフィール登録で企業から直接スカウト。",
    images: ["/ogp.png"],
    site: "@syukatsu25kk",
  },
  robots: {
    index: true,
    follow: true,
  },
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
    <html lang="ja" className="scroll-smooth antialiased" suppressHydrationWarning>
      <body
        className={`${inter.className} overflow-x-hidden bg-background text-foreground`}
        suppressHydrationWarning
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
