/* ------------------------------------------------------------------
   app/layout.tsx – global layout (Server Component)
   ※ このファイルはサーバーコンポーネントにし、React Hooks を
     直接使わないようにします。
-------------------------------------------------------------------*/
import { type ReactNode, Suspense } from "react";
import type { Metadata }  from "next";
import { Inter }          from "next/font/google";
import Script from "next/script";
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
  icons: {
    icon : "/学生転職 (13).png",
    apple: "/学生転職 (13).png",
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
      <head>
        <link rel="icon" href="/学生転職 (13).png" sizes="any" />
        <link rel="apple-touch-icon" href="/学生転職 (13).png" />
        <meta name="theme-color" content="#ffffff" />
        {/* Google tag (gtag.js) */}
        <Script
          id="ga4"
          src="https://www.googletagmanager.com/gtag/js?id=G-FNPBR7XJT6"
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-FNPBR7XJT6', { send_page_view: false });
          `}
        </Script>
        {/* Meta Pixel (Facebook) */}
        <Script id="fb-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '9933035836808765');
            fbq('track', 'PageView');
          `}
        </Script>
        {/* Google Tag Manager */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-PVJG4K6S');`
          }}
        />
        {/* End Google Tag Manager */}
      </head>
      <body
        className={`${inter.className} bg-background text-foreground`}
        suppressHydrationWarning
      >
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-PVJG4K6S"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        {/* End Google Tag Manager (noscript) */}
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=9933035836808765&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        <Suspense fallback={null}>
          <Providers>
            {/* クライアント側で認可判定 */}
            <AuthGuard />

            <div className="flex min-h-screen flex-col">
              <Header />
              <main className="flex-1 pb-16 md:pb-0">{children}</main>
              <MobileNavigation />
            </div>
          </Providers>
        </Suspense>
      </body>
    </html>
  );
}
