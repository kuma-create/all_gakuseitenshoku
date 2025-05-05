"use client"

import { AvatarImage } from "@/components/ui/avatar"

import { Avatar } from "@/components/ui/avatar"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useRecoilState } from "recoil"
import { userState } from "@/recoil/userAtom"
import { userProfileState } from "@/recoil/userProfileAtom"
import { fetchUserProfile as fetchUserProfileAction } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle, ArrowRight, Briefcase, MessageSquare, Trophy, ChevronRight } from "lucide-react"

export default function Home() {
  const { data: session } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useRecoilState(userState)
  const userType = user?.userType
  const isLoggedIn = user?.isLoggedIn
  const [userProfile, setUserProfile] = useRecoilState(userProfileState)

  const fetchUserProfile = async () => {
    if (session?.user?.email) {
      const profile = await fetchUserProfileAction(session.user.email)
      setUserProfile(profile)
    }
  }

  // 認証チェック - 学生ユーザーでない場合はリダイレクト
  useEffect(() => {
    // クライアントサイドでのみ実行
    if (typeof window !== "undefined") {
      if (isLoggedIn === false) {
        // 未ログインの場合はリダイレクトしない（ランディングページを表示）
        setIsLoading(false)
      } else if (isLoggedIn === true && userType !== "student") {
        // ログイン済みで学生でない場合
        console.log("Not a student, redirecting to company dashboard")
        router.push("/company-dashboard")
      } else if (isLoggedIn === true && userType === "student") {
        // 学生としてログイン済み
        console.log("Student authenticated, redirecting to student dashboard")
        router.push("/student-dashboard")
        // プロフィール情報がない場合は取得
        if (!userProfile) {
          fetchUserProfile()
        }
      }
      // isLoggedInがnullの場合は何もしない（認証状態確認中）
    }
  }, [isLoggedIn, userType, router, session, userProfile])

  // ローディング状態の管理を改善
  useEffect(() => {
    // 認証状態が確定したらローディングを解除
    if (isLoggedIn !== null) {
      setIsLoading(false)
    }
  }, [isLoggedIn])

  // ローディング中または認証チェック中は読み込み表示
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent"></div>
          <p>読み込み中...</p>
        </div>
      </div>
    )
  }

  // ログイン済みの場合は何も表示しない（リダイレクト中）
  if (isLoggedIn === true) {
    return null
  }

  // ランディングページのコンテンツ
  return (
    <div className="flex flex-col">
      {/* ヒーローセクション */}
      <section className="relative bg-gradient-to-b from-white to-gray-50 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-8 md:flex-row md:justify-between">
            <div className="max-w-xl text-center md:text-left">
              <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900 md:text-5xl lg:text-6xl">
                あなたの<span className="text-red-600">理想の就職先</span>を見つけよう
              </h1>
              <p className="mb-8 text-lg text-gray-600">
                学生転職は、学生と企業をつなぐ就活プラットフォーム。
                あなたのスキルや経験に合った企業からスカウトを受け取り、理想のキャリアをスタートさせましょう。
              </p>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Link href="/signup">
                  <Button size="lg" className="bg-red-600 hover:bg-red-700">
                    無料で会員登録
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" size="lg">
                    ログイン
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative h-64 w-full max-w-md md:h-80 lg:h-96">
              <Image
                src="/placeholder.svg?key=7wff4"
                alt="学生のキャリア"
                fill
                className="rounded-lg object-cover shadow-lg"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* 特徴セクション */}
      <section id="features" className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">学生転職の特徴</h2>
            <p className="mx-auto max-w-2xl text-gray-600">
              学生転職は、あなたの就活をより効率的に、より効果的にするための機能を提供します。
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardContent className="flex flex-col items-center p-6 text-center">
                <div className="mb-4 rounded-full bg-red-100 p-3">
                  <Briefcase className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="mb-2 text-xl font-medium">厳選された求人</h3>
                <p className="text-gray-600">
                  学生に特化した厳選求人を多数掲載。インターンシップから正社員まで、あなたに合った仕事が見つかります。
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex flex-col items-center p-6 text-center">
                <div className="mb-4 rounded-full bg-red-100 p-3">
                  <MessageSquare className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="mb-2 text-xl font-medium">企業とのダイレクトコミュニケーション</h3>
                <p className="text-gray-600">
                  気になる企業と直接チャットで質問や相談ができます。採用担当者と効率的にコミュニケーションを取れます。
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex flex-col items-center p-6 text-center">
                <div className="mb-4 rounded-full bg-red-100 p-3">
                  <Trophy className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="mb-2 text-xl font-medium">就活グランプリ</h3>
                <p className="text-gray-600">
                  ビジネスケースやウェブテストなどのチャレンジに参加して、スキルをアピールし、企業からのスカウトチャンスを増やせます。
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 利用の流れ */}
      <section id="how-it-works" className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">利用の流れ</h2>
            <p className="mx-auto max-w-2xl text-gray-600">
              学生転職を使って理想の就職先を見つけるまでの簡単な流れをご紹介します。
            </p>
          </div>

          <div className="relative">
            <div className="absolute left-1/2 top-0 h-full w-1 -translate-x-1/2 bg-red-200 md:block"></div>
            <div className="space-y-12">
              <div className="relative">
                <div className="flex flex-col md:flex-row">
                  <div className="mb-8 md:mb-0 md:w-1/2 md:pr-8 md:text-right">
                    <div className="mb-2 text-xl font-bold text-red-600">STEP 1</div>
                    <h3 className="mb-2 text-2xl font-bold">プロフィール登録</h3>
                    <p className="text-gray-600">
                      あなたのスキル、学歴、希望条件などを登録して、企業にアピールできるプロフィールを作成します。
                    </p>
                  </div>
                  <div className="absolute left-1/2 top-0 -ml-4 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-red-600 text-white md:top-4">
                    1
                  </div>
                  <div className="md:w-1/2 md:pl-8">
                    <div className="relative h-48 w-full overflow-hidden rounded-lg shadow-lg md:h-64">
                      <Image src="/placeholder.svg?key=xkcjv" alt="プロフィール登録" fill className="object-cover" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="flex flex-col md:flex-row">
                  <div className="mb-8 order-last md:order-first md:mb-0 md:w-1/2 md:pr-8">
                    <div className="relative h-48 w-full overflow-hidden rounded-lg shadow-lg md:h-64">
                      <Image src="/placeholder.svg?key=68pvo" alt="求人検索" fill className="object-cover" />
                    </div>
                  </div>
                  <div className="absolute left-1/2 top-0 -ml-4 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-red-600 text-white md:top-4">
                    2
                  </div>
                  <div className="md:w-1/2 md:pl-8 md:text-left">
                    <div className="mb-2 text-xl font-bold text-red-600">STEP 2</div>
                    <h3 className="mb-2 text-2xl font-bold">求人検索とスカウト受信</h3>
                    <p className="text-gray-600">
                      あなたの条件に合った求人を検索したり、企業からのスカウトを受け取ったりできます。
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="flex flex-col md:flex-row">
                  <div className="mb-8 md:mb-0 md:w-1/2 md:pr-8 md:text-right">
                    <div className="mb-2 text-xl font-bold text-red-600">STEP 3</div>
                    <h3 className="mb-2 text-2xl font-bold">企業とのコミュニケーション</h3>
                    <p className="text-gray-600">
                      気になる企業とチャットで直接コミュニケーションを取り、質問や面接の調整を行います。
                    </p>
                  </div>
                  <div className="absolute left-1/2 top-0 -ml-4 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-red-600 text-white md:top-4">
                    3
                  </div>
                  <div className="md:w-1/2 md:pl-8">
                    <div className="relative h-48 w-full overflow-hidden rounded-lg shadow-lg md:h-64">
                      <Image
                        src="/placeholder.svg?key=62nym"
                        alt="企業とのコミュニケーション"
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="flex flex-col md:flex-row">
                  <div className="mb-8 order-last md:order-first md:mb-0 md:w-1/2 md:pr-8">
                    <div className="relative h-48 w-full overflow-hidden rounded-lg shadow-lg md:h-64">
                      <Image src="/placeholder.svg?key=uoeti" alt="内定獲得" fill className="object-cover" />
                    </div>
                  </div>
                  <div className="absolute left-1/2 top-0 -ml-4 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-red-600 text-white md:top-4">
                    4
                  </div>
                  <div className="md:w-1/2 md:pl-8 md:text-left">
                    <div className="mb-2 text-xl font-bold text-red-600">STEP 4</div>
                    <h3 className="mb-2 text-2xl font-bold">選考と内定</h3>
                    <p className="text-gray-600">選考プロセスを経て、あなたに合った企業から内定を獲得しましょう。</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 就活グランプリ */}
      <section id="grandprix" className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-start">
            <div className="lg:w-1/2">
              <h2 className="mb-4 text-3xl font-bold text-gray-900">就活グランプリに挑戦しよう</h2>
              <p className="mb-6 text-gray-600">
                就活グランプリは、あなたのスキルや能力を企業にアピールする絶好の機会です。ビジネスケース、ウェブテスト、月間チャレンジなど様々な課題に挑戦して、上位入賞を目指しましょう。
              </p>
              <div className="mb-8 space-y-4">
                <div className="flex items-start">
                  <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                  <div>
                    <h3 className="font-medium">企業からの注目度アップ</h3>
                    <p className="text-sm text-gray-600">
                      優秀な成績を収めると、多くの企業からスカウトを受ける可能性が高まります。
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                  <div>
                    <h3 className="font-medium">実践的なスキル向上</h3>
                    <p className="text-sm text-gray-600">
                      実際のビジネス課題に取り組むことで、就職後に役立つスキルを身につけられます。
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                  <div>
                    <h3 className="font-medium">豪華賞品</h3>
                    <p className="text-sm text-gray-600">
                      上位入賞者には、豪華賞品や特別なキャリア機会が用意されています。
                    </p>
                  </div>
                </div>
              </div>
              <Link href="/grandprix">
                <Button className="bg-red-600 hover:bg-red-700">
                  グランプリに参加する
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="relative h-64 w-full max-w-md lg:h-80 lg:w-1/2">
              <Image
                src="/placeholder.svg?height=320&width=480&query=students in business competition"
                alt="就活グランプリ"
                fill
                className="rounded-lg object-cover shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 利用者の声 */}
      <section id="testimonials" className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">利用者の声</h2>
            <p className="mx-auto max-w-2xl text-gray-600">
              学生転職を利用して就職活動に成功した先輩たちの声をご紹介します。
            </p>
          </div>

          <Tabs defaultValue="students" className="w-full">
            <TabsList className="mx-auto mb-8 grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="students">学生の声</TabsTrigger>
              <TabsTrigger value="companies">企業の声</TabsTrigger>
            </TabsList>
            <TabsContent value="students">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardContent className="p-6">
                    <div className="mb-4 flex items-center gap-4">
                      <Avatar>
                        <AvatarImage
                          src="/placeholder.svg?height=40&width=40&query=young male student"
                          alt="田中さん"
                        />
                      </Avatar>
                      <div>
                        <p className="font-medium">田中 健太</p>
                        <p className="text-sm text-gray-500">東京大学 工学部</p>
                      </div>
                    </div>
                    <p className="text-gray-600">
                      「就活グランプリに参加したことで、自分のスキルに自信がつきました。その結果、志望していたIT企業からスカウトを受け、内定をいただくことができました。」
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="mb-4 flex items-center gap-4">
                      <Avatar>
                        <AvatarImage
                          src="/placeholder.svg?height=40&width=40&query=young female student"
                          alt="佐藤さん"
                        />
                      </Avatar>
                      <div>
                        <p className="font-medium">佐藤 美咲</p>
                        <p className="text-sm text-gray-500">慶應義塾大学 経済学部</p>
                      </div>
                    </div>
                    <p className="text-gray-600">
                      「企業とのチャット機能が非常に便利でした。気になる点を直接質問できたので、ミスマッチを防ぎながら自分に合った企業を見つけることができました。」
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="mb-4 flex items-center gap-4">
                      <Avatar>
                        <AvatarImage
                          src="/placeholder.svg?height=40&width=40&query=young asian student"
                          alt="鈴木さん"
                        />
                      </Avatar>
                      <div>
                        <p className="font-medium">鈴木 大輔</p>
                        <p className="text-sm text-gray-500">早稲田大学 商学部</p>
                      </div>
                    </div>
                    <p className="text-gray-600">
                      「プロフィールを充実させたところ、自分では考えていなかった業界からもスカウトをいただき、視野が広がりました。今は憧れていた企業で働いています。」
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            <TabsContent value="companies">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardContent className="p-6">
                    <div className="mb-4 flex items-center gap-4">
                      <Avatar>
                        <AvatarImage src="/placeholder.svg?height=40&width=40&query=business person" alt="山田さん" />
                      </Avatar>
                      <div>
                        <p className="font-medium">山田 誠</p>
                        <p className="text-sm text-gray-500">テックイノベーション株式会社 人事部長</p>
                      </div>
                    </div>
                    <p className="text-gray-600">
                      「学生転職のスカウト機能を使うことで、当社が求める高いポテンシャルを持った学生と効率的に出会うことができました。採用コストの削減にもつながっています。」
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="mb-4 flex items-center gap-4">
                      <Avatar>
                        <AvatarImage
                          src="/placeholder.svg?height=40&width=40&query=female business person"
                          alt="伊藤さん"
                        />
                      </Avatar>
                      <div>
                        <p className="font-medium">伊藤 由美</p>
                        <p className="text-sm text-gray-500">グローバルマーケティング株式会社 採用担当</p>
                      </div>
                    </div>
                    <p className="text-gray-600">
                      「就活グランプリの結果を参考にすることで、実践的なスキルを持った学生を見つけることができました。入社後の活躍度も高く、採用の質が向上しています。」
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="mb-4 flex items-center gap-4">
                      <Avatar>
                        <AvatarImage
                          src="/placeholder.svg?height=40&width=40&query=senior business man"
                          alt="高橋さん"
                        />
                      </Avatar>
                      <div>
                        <p className="font-medium">高橋 健一</p>
                        <p className="text-sm text-gray-500">フューチャーフィナンス株式会社 代表取締役</p>
                      </div>
                    </div>
                    <p className="text-gray-600">
                      「チャット機能を通じて学生と直接コミュニケーションを取ることで、お互いの理解が深まり、入社後のミスマッチが大幅に減少しました。」
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* よくある質問 */}
      <section id="faq" className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">よくある質問</h2>
            <p className="mx-auto max-w-2xl text-gray-600">学生転職についてよくある質問とその回答をご紹介します。</p>
          </div>

          <div className="mx-auto max-w-3xl divide-y">
            <div className="py-6">
              <details className="group">
                <summary className="flex cursor-pointer items-center justify-between">
                  <h3 className="text-lg font-medium">利用は無料ですか？</h3>
                  <ChevronRight className="h-5 w-5 transition-transform group-open:rotate-90" />
                </summary>
                <p className="mt-3 text-gray-600">
                  はい、学生の方は完全無料でご利用いただけます。求人検索、企業とのチャット、就活グランプリへの参加など、すべての機能を無料でご利用いただけます。
                </p>
              </details>
            </div>

            <div className="py-6">
              <details className="group">
                <summary className="flex cursor-pointer items-center justify-between">
                  <h3 className="text-lg font-medium">どのような学生が利用できますか？</h3>
                  <ChevronRight className="h-5 w-5 transition-transform group-open:rotate-90" />
                </summary>
                <p className="mt-3 text-gray-600">
                  大学生、大学院生、専門学校生など、すべての学生の方にご利用いただけます。卒業予定年度に制限はありませんので、1年生から利用可能です。
                </p>
              </details>
            </div>

            <div className="py-6">
              <details className="group">
                <summary className="flex cursor-pointer items-center justify-between">
                  <h3 className="text-lg font-medium">就活グランプリとは何ですか？</h3>
                  <ChevronRight className="h-5 w-5 transition-transform group-open:rotate-90" />
                </summary>
                <p className="mt-3 text-gray-600">
                  就活グランプリは、ビジネスケースやウェブテストなどの課題に挑戦し、あなたのスキルや能力を企業にアピールできるイベントです。上位入賞者は多くの企業からスカウトを受ける可能性が高まります。
                </p>
              </details>
            </div>

            <div className="py-6">
              <details className="group">
                <summary className="flex cursor-pointer items-center justify-between">
                  <h3 className="text-lg font-medium">スカウトはどのように届きますか？</h3>
                  <ChevronRight className="h-5 w-5 transition-transform group-open:rotate-90" />
                </summary>
                <p className="mt-3 text-gray-600">
                  企業があなたのプロフィールに興味を持つと、アプリ内のメッセージとメールでスカウト通知が届きます。スカウトには求人情報や企業からのメッセージが含まれており、興味があれば返信することができます。
                </p>
              </details>
            </div>

            <div className="py-6">
              <details className="group">
                <summary className="flex cursor-pointer items-center justify-between">
                  <h3 className="text-lg font-medium">どのような企業が参加していますか？</h3>
                  <ChevronRight className="h-5 w-5 transition-transform group-open:rotate-90" />
                </summary>
                <p className="mt-3 text-gray-600">
                  IT、金融、コンサルティング、メーカーなど、様々な業界の企業が参加しています。大手企業からベンチャー企業まで幅広く、あなたに合った企業が見つかるでしょう。
                </p>
              </details>
            </div>
          </div>
        </div>
      </section>

      {/* CTA セクション */}
      <section className="bg-red-600 py-16 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold">今すぐ無料で始めよう</h2>
          <p className="mx-auto mb-8 max-w-2xl">
            あなたの理想のキャリアへの第一歩を踏み出しましょう。会員登録は無料で、たった1分で完了します。
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/signup">
              <Button size="lg" variant="secondary" className="bg-white text-red-600 hover:bg-gray-100">
                無料で会員登録
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/grandprix">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-red-700">
                就活グランプリを見る
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
