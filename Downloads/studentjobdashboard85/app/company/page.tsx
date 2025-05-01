import Link from "next/link"
import Image from "next/image"
import { ArrowRight, CheckCircle, Users, BarChart, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function CompanyLandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* ヒーローセクション */}
      <section className="relative bg-gradient-to-r from-blue-50 to-blue-100 py-20">
        <div className="container mx-auto grid items-center gap-12 px-4 md:grid-cols-2">
          <div className="space-y-6">
            <h1 className="text-4xl font-bold leading-tight tracking-tighter md:text-5xl lg:text-6xl">
              優秀な学生との<span className="text-blue-600">出会い</span>をサポート
            </h1>
            <p className="max-w-[600px] text-lg text-gray-700 md:text-xl">
              学歴や大学名だけでなく、実力や適性を重視した新しい採用の形。貴社に最適な人材との出会いをお手伝いします。
            </p>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link href="/auth/signup?type=company">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                  無料で企業登録
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/company/pricing">
                <Button size="lg" variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50">
                  料金プランを見る
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
          <div className="relative hidden h-[400px] md:block">
            <Image
              src="/modern-startup-team.png"
              alt="企業と学生のマッチング"
              fill
              className="rounded-lg object-cover shadow-lg"
              priority
            />
          </div>
        </div>
      </section>

      {/* 特徴セクション */}
      <section className="bg-white py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">企業向けサービスの特徴</h2>
            <p className="mx-auto max-w-[800px] text-lg text-gray-600">
              従来の新卒採用とは一線を画す、実力主義の採用プラットフォーム
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: <Users className="h-10 w-10 text-blue-600" />,
                title: "実力ある学生との出会い",
                description: "学歴や大学名だけでなく、実力や適性を正確に評価された学生とのマッチングを実現します。",
              },
              {
                icon: <BarChart className="h-10 w-10 text-blue-600" />,
                title: "客観的な評価指標",
                description: "グランプリの結果やスキル診断など、客観的な指標に基づいて学生を評価できます。",
              },
              {
                icon: <Clock className="h-10 w-10 text-blue-600" />,
                title: "採用活動の効率化",
                description: "選考プロセスの自動化や効率的なコミュニケーションツールで、採用担当者の負担を軽減します。",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-md"
              >
                <div className="mb-4 inline-flex rounded-full bg-blue-50 p-3">{feature.icon}</div>
                <h3 className="mb-3 text-xl font-bold">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 料金プランセクション */}
      <section className="bg-gray-50 py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">シンプルな料金プラン</h2>
            <p className="mx-auto max-w-[800px] text-lg text-gray-600">
              企業規模や採用ニーズに合わせた柔軟なプランをご用意しています
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                name: "スタンダード",
                price: "50,000",
                period: "月額",
                description: "中小企業や採用数が少ない企業向け",
                features: ["求人掲載 5件まで", "メッセージ機能", "応募者管理", "基本的な検索フィルター"],
                cta: "今すぐ始める",
                popular: false,
              },
              {
                name: "プロフェッショナル",
                price: "100,000",
                period: "月額",
                description: "積極的に採用活動を行う企業向け",
                features: [
                  "求人掲載 無制限",
                  "メッセージ機能",
                  "応募者管理",
                  "高度な検索フィルター",
                  "学生へのスカウト機能",
                  "採用分析ダッシュボード",
                ],
                cta: "今すぐ始める",
                popular: true,
              },
              {
                name: "エンタープライズ",
                price: "要問合せ",
                period: "",
                description: "大企業や特別なニーズがある企業向け",
                features: [
                  "プロフェッショナルプランの全機能",
                  "API連携",
                  "カスタム機能開発",
                  "専任サポート担当者",
                  "採用戦略コンサルティング",
                ],
                cta: "お問い合わせ",
                popular: false,
              },
            ].map((plan, index) => (
              <div
                key={index}
                className={`relative rounded-lg border ${
                  plan.popular ? "border-blue-200 bg-blue-50" : "border-gray-200 bg-white"
                } p-6 shadow-sm transition-all hover:shadow-md`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                    人気プラン
                  </div>
                )}
                <div className="mb-4 text-center">
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">¥{plan.price}</span>
                    {plan.period && <span className="text-gray-600">/{plan.period}</span>}
                  </div>
                  <p className="mt-2 text-sm text-gray-600">{plan.description}</p>
                </div>
                <ul className="mb-6 space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full justify-center ${
                    plan.popular ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-800 hover:bg-gray-900"
                  }`}
                  asChild
                >
                  <Link href={plan.popular ? "/auth/signup?type=company" : "/company/contact"}>{plan.cta}</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 導入事例セクション */}
      <section className="bg-white py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">導入事例</h2>
            <p className="mx-auto max-w-[800px] text-lg text-gray-600">
              様々な業界の企業が学生転職 GAKUTENを活用して採用活動を行っています
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                company: "テックイノベーション株式会社",
                industry: "IT・テクノロジー",
                logo: "/abstract-geometric-TI.png",
                quote:
                  "従来の採用方法では見つけられなかった優秀なエンジニア志望の学生と出会うことができました。実力主義の評価が私たちの企業文化にもマッチしています。",
                person: "採用担当 田中様",
              },
              {
                company: "フューチャーストラテジー株式会社",
                industry: "コンサルティング",
                logo: "/abstract-fs.png",
                quote:
                  "グランプリの結果を活用することで、論理的思考力や問題解決能力の高い学生を効率的に見つけることができました。採用のミスマッチも減少しています。",
                person: "人事部長 佐藤様",
              },
              {
                company: "テクノソリューションズ株式会社",
                industry: "システム開発",
                logo: "/abstract-geometric-ts.png",
                quote:
                  "スキル診断の結果を参考にすることで、即戦力となる人材を採用できました。採用コストの削減にもつながり、大変満足しています。",
                person: "代表取締役 鈴木様",
              },
            ].map((case_, index) => (
              <div key={index} className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center">
                  <div className="relative h-12 w-12 overflow-hidden rounded-full">
                    <Image src={case_.logo || "/placeholder.svg"} alt={case_.company} fill className="object-cover" />
                  </div>
                  <div className="ml-3">
                    <h3 className="font-bold">{case_.company}</h3>
                    <p className="text-sm text-gray-600">{case_.industry}</p>
                  </div>
                </div>
                <blockquote className="mb-4 border-l-4 border-blue-200 pl-4 italic text-gray-600">
                  "{case_.quote}"
                </blockquote>
                <p className="text-right text-sm font-medium">{case_.person}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* よくある質問セクション */}
      <section className="bg-gray-50 py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">よくある質問</h2>
            <p className="mx-auto max-w-[800px] text-lg text-gray-600">
              企業担当者様からよくいただくご質問にお答えします
            </p>
          </div>

          <div className="mx-auto max-w-3xl space-y-6">
            {[
              {
                question: "無料トライアルはありますか？",
                answer:
                  "はい、2週間の無料トライアル期間をご用意しています。トライアル期間中は、プロフェッショナルプランの全機能をお試しいただけます。",
              },
              {
                question: "契約期間の縛りはありますか？",
                answer:
                  "最低契約期間は3ヶ月となっています。3ヶ月以降は月単位でのご契約が可能です。年間契約の場合は、20%の割引が適用されます。",
              },
              {
                question: "どのような学生が登録していますか？",
                answer:
                  "様々な大学・専門学校の学生が登録しています。特に、IT・エンジニアリング、ビジネス、デザイン分野に強い学生が多く登録しています。全ての学生はスキル診断を受けており、客観的な評価指標に基づいてマッチングを行います。",
              },
              {
                question: "採用が決まった場合、追加料金は発生しますか？",
                answer:
                  "いいえ、採用が決まった場合の成功報酬は発生しません。月額料金のみでサービスをご利用いただけます。",
              },
              {
                question: "自社の採用サイトやATS（採用管理システム）との連携は可能ですか？",
                answer:
                  "エンタープライズプランでは、API連携やカスタム開発により、既存の採用システムとの連携が可能です。詳細については、お問い合わせください。",
              },
            ].map((faq, index) => (
              <div key={index} className="rounded-lg border border-gray-200 bg-white p-6">
                <h3 className="mb-2 text-lg font-bold">{faq.question}</h3>
                <p className="text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTAセクション */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-700 py-16 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-6 text-3xl font-bold md:text-4xl">優秀な人材との出会いを始めましょう</h2>
          <p className="mx-auto mb-8 max-w-[800px] text-lg">
            実力主義の採用で、貴社に最適な人材を見つけることができます。まずは無料で企業登録から。
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/auth/signup?type=company">
              <Button size="lg" variant="secondary">
                無料で企業登録
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/company/contact">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                お問い合わせ
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
