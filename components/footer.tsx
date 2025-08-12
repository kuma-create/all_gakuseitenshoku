"use client";

import Link from "next/link";
import Image from "next/image";
import { Separator } from "@/components/ui/separator";

import { usePathname } from "next/navigation";

/**
 * Site–wide footer component.
 * Uses Tailwind’s responsive utilities:
 * - single‑column on mobile
 * - two columns ≥ md
 * - four columns ≥ lg
 */
export default function Footer() {
    const pathname = usePathname();
    if (
      pathname.startsWith("/admin") ||
      pathname.startsWith("/company") ||
      pathname.startsWith("/ipo")
    ) {
      return null; // Hide footer on admin, company, and IPO pages
    }
  return (
    <footer className="bg-white py-8 md:py-12">          
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-4">         
          {/* ── Brand ─────────────────────── */}
          <div>
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="学生転職 ロゴ"
                width={120}
                height={32}
                className="h-10 w-auto select-none object-contain md:h-12"
                priority
              />
            </Link>
            <p className="mt-4 text-sm text-gray-600">
              学生転職は、最新のAI技術を活用した就活支援メディアプラットフォームです。
              キャリア形成から企業研究、面接対策まで、あなたの就活をサポートします。
            </p>
          </div>

          {/* ── Links ─────────────────────── */}
          <div className="flex flex-col gap-8 md:col-span-3 md:flex-row md:flex-nowrap md:justify-end md:gap-12 md:pr-24">
          <div>
            <h3 className="font-medium mb-3">コンテンツ</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <a href="/grandprix" className="hover:text-red-600">
                  就活GP
                </a>
              </li>
              <li>
                <a href="/media" className="hover:text-red-600">
                  学転メディア
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-red-600">
                  学転AIアドバイザー
                </a>
              </li>
              <li>
                <a href="/jobs" className="hover:text-red-600">
                  求人を探す
                </a>
              </li>
            </ul>
          </div>
          {/* ── about Us ─────────────────── */}
          <div>
            <h3 className="font-medium mb-3">会社情報</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <Link href="https://www.makeculture.jp/" className="text-gray-600 transition-colors hover:text-red-600">
                  運営会社
                </Link>
              </li>
              <li>
                <Link href="https://gakuten.co.jp/privacy-policy" className="text-gray-600 transition-colors hover:text-red-600">
                  プライバシーポリシー
                </Link>
              </li>
              <li>
                <Link href="https://gakuten.co.jp/terms" className="text-gray-600 transition-colors hover:text-red-600">
                  利用規約
                </Link>
              </li>
              <li>
                <Link href="/legal" className="text-gray-600 transition-colors hover:text-red-600">
                  特定商取引法に基づく表示
                </Link>
              </li>              
              <li>
                <Link href="/support" className="text-gray-600 transition-colors hover:text-red-600">
                  お問い合わせ
                </Link>
              </li>
            </ul>
          </div>
          {/* ── Follow Us ─────────────────── */}
          <div>
            <h3 className="mb-4 text-sm font-bold uppercase text-gray-900">フォローする</h3>
            <div className="flex space-x-4 md:justify-end">
              <Link href="https://x.com/gakuten_shukatu" className="text-gray-600 transition-colors hover:text-red-600">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </Link>
              <Link href="https://www.instagram.com/gakuseitenshoku?igsh=Z2wwMmQyNjR6cmFp&utm_source=qr" className="text-gray-600 transition-colors hover:text-red-600">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.048-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
                    clipRule="evenodd"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>{/* end Links flex wrapper */}
        </div>{/* end grid */}
      </div>{/* end container */}
      <Separator className="my-6 border-t" />
      <p className="text-center text-sm text-gray-500 mb-4">
        © 2025 学生転職 All Rights Reserved.
      </p>
    </footer>
  );
}