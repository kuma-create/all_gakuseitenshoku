import Link from "next/link"
import { Mail, Phone, MapPin } from "lucide-react"
import { CompanyContactForm } from "@/components/company/contact-form"

export default function CompanyContactPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold md:text-4xl">お問い合わせ</h1>
        <p className="mx-auto max-w-[600px] text-gray-600">
          サービスに関するご質問や導入のご相談���ど、お気軽にお問い合わせください。
        </p>
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
        <div className="col-span-1 space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-bold">お問い合わせ方法</h2>
            <div className="space-y-4">
              <div className="flex items-start">
                <Mail className="mr-3 h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">メール</p>
                  <p className="text-gray-600">company@gakuten.jp</p>
                </div>
              </div>
              <div className="flex items-start">
                <Phone className="mr-3 h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">電話</p>
                  <p className="text-gray-600">03-1234-5678</p>
                  <p className="text-sm text-gray-500">平日 9:00〜18:00</p>
                </div>
              </div>
              <div className="flex items-start">
                <MapPin className="mr-3 h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">所在地</p>
                  <p className="text-gray-600">〒100-0001</p>
                  <p className="text-gray-600">東京都千代田区1-1-1</p>
                  <p className="text-gray-600">GAKUTENビル 5F</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-bold">よくあるお問い合わせ</h2>
            <ul className="space-y-2">
              <li>
                <Link href="/company/faq#pricing" className="text-blue-600 hover:underline">
                  料金プランについて
                </Link>
              </li>
              <li>
                <Link href="/company/faq#students" className="text-blue-600 hover:underline">
                  登録学生の属性について
                </Link>
              </li>
              <li>
                <Link href="/company/faq#contract" className="text-blue-600 hover:underline">
                  契約期間と解約について
                </Link>
              </li>
              <li>
                <Link href="/company/faq#integration" className="text-blue-600 hover:underline">
                  他システムとの連携について
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="col-span-2 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-xl font-bold">お問い合わせフォーム</h2>
          <CompanyContactForm />
        </div>
      </div>
    </div>
  )
}
