import Link from "next/link"
import { CheckCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function CompanyPricingPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-12 text-center">
        <h1 className="mb-2 text-3xl font-bold md:text-4xl">料金プラン</h1>
        <p className="mx-auto max-w-[600px] text-gray-600">
          企業規模や採用ニーズに合わせた柔軟なプランをご用意しています
        </p>
      </div>

      <div className="mx-auto max-w-6xl">
        {/* 料金プラン比較表 */}
        <div className="mb-12 overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse rounded-lg">
            <thead>
              <tr>
                <th className="border bg-gray-50 p-4 text-left"></th>
                <th className="border bg-gray-50 p-4 text-center">
                  <div className="text-lg font-bold">スタンダード</div>
                  <div className="mt-1 text-sm text-gray-600">中小企業向け</div>
                  <div className="mt-2 text-xl font-bold">
                    ¥50,000<span className="text-sm font-normal">/月</span>
                  </div>
                </th>
                <th className="border bg-blue-50 p-4 text-center">
                  <div className="text-lg font-bold text-blue-700">プロフェッショナル</div>
                  <div className="mt-1 text-sm text-blue-600">積極採用企業向け</div>
                  <div className="mt-2 text-xl font-bold text-blue-700">
                    ¥100,000<span className="text-sm font-normal">/月</span>
                  </div>
                </th>
                <th className="border bg-gray-50 p-4 text-center">
                  <div className="text-lg font-bold">エンタープライズ</div>
                  <div className="mt-1 text-sm text-gray-600">大企業向け</div>
                  <div className="mt-2 text-xl font-bold">要問合せ</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                { feature: "求人掲載数", standard: "5件", pro: "無制限", enterprise: "無制限" },
                { feature: "同時アクティブ求人", standard: "3件", pro: "10件", enterprise: "無制限" },
                { feature: "メッセージ機能", standard: true, pro: true, enterprise: true },
                { feature: "応募者管理", standard: true, pro: true, enterprise: true },
                { feature: "基本検索フィルター", standard: true, pro: true, enterprise: true },
                { feature: "高度な検索フィルター", standard: false, pro: true, enterprise: true },
                { feature: "学生へのスカウト機能", standard: false, pro: true, enterprise: true },
                { feature: "採用分析ダッシュボード", standard: false, pro: true, enterprise: true },
                { feature: "API連携", standard: false, pro: false, enterprise: true },
                { feature: "カスタム機能開発", standard: false, pro: false, enterprise: true },
                { feature: "専任サポート担当者", standard: false, pro: false, enterprise: true },
                { feature: "採用戦略コンサルティング", standard: false, pro: false, enterprise: true },
              ].map((row, index) => (
                <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="border p-4 font-medium">{row.feature}</td>
                  <td className="border p-4 text-center">
                    {typeof row.standard === "boolean" ? (
                      row.standard ? (
                        <CheckCircle className="mx-auto h-5 w-5 text-green-500" />
                      ) : (
                        <X className="mx-auto h-5 w-5 text-gray-300" />
                      )
                    ) : (
                      row.standard
                    )}
                  </td>
                  <td className="border bg-blue-50 p-4 text-center">
                    {typeof row.pro === "boolean" ? (
                      row.pro ? (
                        <CheckCircle className="mx-auto h-5 w-5 text-green-500" />
                      ) : (
                        <X className="mx-auto h-5 w-5 text-gray-300" />
                      )
                    ) : (
                      row.pro
                    )}
                  </td>
                  <td className="border p-4 text-center">
                    {typeof row.enterprise === "boolean" ? (
                      row.enterprise ? (
                        <CheckCircle className="mx-auto h-5 w-5 text-green-500" />
                      ) : (
                        <X className="mx-auto h-5 w-5 text-gray-300" />
                      )
                    ) : (
                      row.enterprise
                    )}
                  </td>
                </tr>
              ))}
              <tr>
                <td className="border p-4"></td>
                <td className="border p-4 text-center">
                  <Button asChild className="w-full">
                    <Link href="/auth/signup?type=company&plan=standard">選択する</Link>
                  </Button>
                </td>
                <td className="border bg-blue-50 p-4 text-center">
                  <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                    <Link href="/auth/signup?type=company&plan=pro">選択する</Link>
                  </Button>
                </td>
                <td className="border p-4 text-center">
                  <Button asChild variant="outline">
                    <Link href="/company/contact">お問い合わせ</Link>
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* よくある質問 */}
        <div className="mb-12">
          <h2 className="mb-6 text-2xl font-bold">よくある質問</h2>
          <div className="space-y-4">
            {[
              {
                question: "契約期間はどのくらいですか？",
                answer:
                  "最低契約期間は3ヶ月となっています。3ヶ月以降は月単位でのご契約が可能です。年間契約の場合は、20%の割引が適用されます。",
              },
              {
                question: "無料トライアルはありますか？",
                answer:
                  "はい、2週間の無料トライアル期間をご用意しています。トライアル期間中は、プロフェッショナルプランの全機能をお試しいただけます。",
              },
              {
                question: "プランの変更はいつでも可能ですか？",
                answer:
                  "はい、いつでもプランの変更が可能です。アップグレードの場合は即時反映され、ダウングレードの場合は次の請求サイクルから適用されます。",
              },
              {
                question: "採用が決まった場合、追加料金は発生しますか？",
                answer:
                  "いいえ、採用が決まった場合の成功報酬は発生しません。月額料金のみでサービスをご利用いただけます。",
              },
            ].map((faq, index) => (
              <div key={index} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="mb-2 text-lg font-bold">{faq.question}</h3>
                <p className="text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-lg bg-blue-50 p-8 text-center">
          <h2 className="mb-4 text-2xl font-bold">まずは無料でお試しください</h2>
          <p className="mb-6 text-gray-600">
            2週間の無料トライアル期間中に、プロフェッショナルプランの全機能をお試しいただけます。
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <Link href="/auth/signup?type=company">無料トライアルを始める</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/company/contact">詳細を問い合わせる</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
