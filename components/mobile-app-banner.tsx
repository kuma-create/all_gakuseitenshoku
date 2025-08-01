import Image from "next/image"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, X } from "lucide-react"

export default function MobileAppBanner() {
  const [visible, setVisible] = useState(true)
  if (!visible) return null
  return (
    <div className="relative bg-gradient-to-r from-gray-700 to-gray-600 rounded-xl overflow-hidden">
      <button
        onClick={() => setVisible(false)}
        aria-label="閉じる"
        className="absolute top-2 right-2 text-white hover:text-gray-300"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex flex-col md:flex-row items-center">
        <div className="p-2 md:p-4 md:w-2/3">
          <h3 className="text-base md:text-lg font-bold text-white mb-1">
            学生転職GPTアプリで、いつでもどこでもキャリア情報をチェック
          </h3>
          <p className="text-gray-300 mb-2 text-[11px] md:text-xs">
            最新ニュースの通知、AIキャリアアドバイザー、オフライン記事保存など、
            アプリならではの機能をご利用いただけます。
          </p>
          <div className="flex space-x-2">
            <Button className="bg-white text-gray-900 hover:bg-gray-100 text-xs px-3 py-1">
              <Download className="mr-2 h-4 w-4" />
              App Storeからダウンロード
            </Button>
            <Button variant="outline" className="border-white text-white hover:bg-white/10 bg-transparent text-xs px-3 py-1">
              Google Playで入手
            </Button>
          </div>
        </div>
        <div className="md:w-1/3 p-1 md:p-0">
          <Image
            src="/logo4.png"
            alt="GAKUTEN App Icon"
            width={80}
            height={80}
            className="mx-auto rounded-2xl shadow-lg"
            priority
          />
        </div>
      </div>
    </div>
  )
}
