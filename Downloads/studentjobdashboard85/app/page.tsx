import Link from "next/link"
import Image from "next/image"
import { ArrowRight, CheckCircle, Briefcase, GraduationCap, Building } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* ヒーローセクション */}
      <section className="relative bg-gradient-to-r from-red-50 to-red-100 py-20">
        <div className="container mx-auto grid items-center gap-12 px-4 md:grid-cols-2">
          <div className="space-y-6">
            <h1 className="text-4xl font-bold leading-tight tracking-tighter md:text-5xl lg:text-6xl">
              新卒学生と企業を<span className="text-red-600">最適に</span>マッチング
            </h1>
            <p className="max-w-[600px] text-lg text-gray-700 md:text-xl">
              あなたの可能性を最大限に引き出す就職活動をサポート。スキルや適性を活かせる企業との出会いをお手伝いします。
            </p>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link href="/auth/signup?type=student">
                <Button size="lg" className="bg-red-600 hover:bg-red-700">
                  学生登録はこちら
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/auth/signup?type=company">
                <Button size="lg" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
                  企業登録はこちら
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
          <div className="relative hidden h-[400px] md:block">
            <Image
              src="/modern-tech-workspace.png"
              alt="学生と企業のマッチング"
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
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">プラットフォームの特徴</h2>
            <p className="mx-auto max-w-[800px] text-lg text-gray-600">
              従来の就職活動とは一線を画す、新しい形の就職マッチングプラットフォームです
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: <GraduationCap className="h-10 w-10 text-red-600" />,
                title: "実力主義のマッチング",
                description: "学歴や大学名だけでなく、あなたの実力や適性を正確に評価し、最適な企業とマッチングします。",
              },
              {
                icon: <Briefcase className="h-10 w-10 text-red-600" />,
                title: "スキル診断テスト",
                description: "ビジネススキルやテクニカルスキルを客観的に測定し、あなたの強みを企業にアピールできます。",
              },
              {
                icon: <Building className="h-10 w-10 text-red-600" />,
                title: "厳選された企業",
                description: "登録企業は審査を通過した優良企業のみ。安心して就職活動に取り組めます。",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-md"
              >
                <div className="mb-4 rounded-full bg-red-50 p-3 inline-flex">{feature.icon}</div>
                <h3 className="mb-3 text-xl font-bold">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* グランプリセクション */}
      <section className="bg-gray-50 py-20">
        <div className="container mx-auto px-4">
          <div className="grid gap-12 md:grid-cols-2">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold md:text-4xl">
                就活グランプリで
                <br />
                あなたの実力を証明
              </h2>
              <p className="text-lg text-gray-600">
                ケーススタディ、Webテスト、ビジネス戦闘力診断など、様々な角度からあなたのポテンシャルを測定します。
                結果は企業にも共有され、あなたの強みをアピールする強力な武器になります。
              </p>
              <ul className="space-y-3">
                {[
                  "学歴や大学名に依存しない実力主義の評価",
                  "客観的なスキル測定でアピール",
                  "企業からのスカウトにつながる可能性",
                ].map((item, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/grandprix">
                <Button className="bg-red-600 hover:bg-red-700">
                  グランプリについて詳しく
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="relative hidden h-[400px] md:block">
              <Image
                src="/strategic-growth-meeting.png"
                alt="就活グランプリ"
                fill
                className="rounded-lg object-cover shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 企業向けセクション */}
      <section className="bg-white py-20">
        <div className="container mx-auto px-4">
          <div className="grid gap-12 md:grid-cols-2">
            <div className="relative hidden h-[400px] md:block">
              <Image
                src="/modern-startup-team.png"
                alt="企業向けサービス"
                fill
                className="rounded-lg object-cover shadow-lg"
              />
            </div>
            <div className="space-y-6">
              <h2 className="text-3xl font-bold md:text-4xl">企業の採用担当者様へ</h2>
              <p className="text-lg text-gray-600">
                従来の新卒採用の枠を超えた、実力のある学生との出会いをサポートします。
                グランプリの結果や客観的な指標を基に、貴社に最適な人材を見つけることができます。
              </p>
              <ul className="space-y-3">
                {[
                  "実力主義の採用で優秀な人材を確保",
                  "客観的な指標による効率的な採用活動",
                  "学生とのミスマッチを減らし、定着率向上",
                ].map((item, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/auth/signup?type=company">
                <Button className="bg-red-600 hover:bg-red-700">
                  企業登録はこちら
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTAセクション */}
      <section className="bg-gradient-to-r from-red-600 to-red-700 py-16 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-6 text-3xl font-bold md:text-4xl">あなたのキャリアの第一歩を踏み出そう</h2>
          <p className="mx-auto mb-8 max-w-[800px] text-lg">
            実力を正当に評価され、あなたの可能性を最大限に引き出せる企業との出会いがここにあります。
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/auth/signup?type=student">
              <Button size="lg" variant="secondary">
                学生登録はこちら
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/auth/signin">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                ログインはこちら
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* フッター */}
      <footer className="bg-gray-900 py-12 text-gray-300">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <h3 className="mb-4 text-lg font-bold text-white">学生転職 GAKUTEN</h3>
              <p className="mb-4 text-sm">新卒学生と企業をつなぐ、新しい形の就職マッチングプラットフォーム</p>
            </div>
            <div>
              <h4 className="mb-4 font-bold text-white">学生の方へ</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/features" className="hover:text-white">
                    サービス紹介
                  </Link>
                </li>
                <li>
                  <Link href="/grandprix" className="hover:text-white">
                    就活グランプリ
                  </Link>
                </li>
                <li>
                  <Link href="/jobs" className="hover:text-white">
                    求人を探す
                  </Link>
                </li>
                <li>
                  <Link href="/auth/signup?type=student" className="hover:text-white">
                    新規登録
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-bold text-white">企業の方へ</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/company/features" className="hover:text-white">
                    サービス紹介
                  </Link>
                </li>
                <li>
                  <Link href="/company/pricing" className="hover:text-white">
                    料金プラン
                  </Link>
                </li>
                <li>
                  <Link href="/company/case-studies" className="hover:text-white">
                    導入事例
                  </Link>
                </li>
                <li>
                  <Link href="/auth/signup?type=company" className="hover:text-white">
                    新規登録
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-bold text-white">会社情報</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/about" className="hover:text-white">
                    会社概要
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-white">
                    プライバシーポリシー
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-white">
                    利用規約
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-white">
                    お問い合わせ
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} 学生転職 GAKUTEN. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
