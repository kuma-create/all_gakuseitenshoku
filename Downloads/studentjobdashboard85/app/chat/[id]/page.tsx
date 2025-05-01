import { Calendar, Paperclip, Send, Star, Briefcase, ArrowLeft } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function ChatDetailPage({ params }: { params: { id: string } }) {
  // 実際のアプリケーションではIDに基づいてデータを取得します
  // ここではサンプルデータを使用します
  const company = {
    id: params.id,
    name: "株式会社テクノロジー",
    logo: "/abstract-geometric-logo.png",
    // チャットの種類（scout または self_apply）
    chatType: params.id === "1" ? "scout" : "self_apply",
    position: "フロントエンドエンジニア",
    // 応募またはスカウト日
    date: "2023年5月15日",
    // 選考ステップ（スカウトの場合は「スカウト受信」から始まる）
    step: params.id === "1" ? "スカウト受信" : "書類選考中",
  }

  // チャットタイプに基づいたスタイルとラベルを設定
  const chatTypeStyles = {
    scout: {
      headerBg: "bg-blue-50",
      badge: "bg-blue-100 text-blue-800 hover:bg-blue-100",
      badgeIcon: <Star className="mr-1 h-3 w-3" />,
      badgeText: "スカウト",
      description: "企業からのスカウトメッセージです",
    },
    self_apply: {
      headerBg: "bg-green-50",
      badge: "bg-green-100 text-green-800 hover:bg-green-100",
      badgeIcon: <Briefcase className="mr-1 h-3 w-3" />,
      badgeText: "自己応募",
      description: "あなたが応募した求人です",
    },
  }

  const typeStyle = chatTypeStyles[company.chatType as keyof typeof chatTypeStyles]

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* メインコンテンツ - チャット */}
      <div className="flex flex-1 flex-col">
        {/* チャットヘッダー */}
        <div className={`flex h-auto flex-col border-b border-gray-200 ${typeStyle.headerBg}`}>
          <div className="border-b border-gray-200 px-4 py-2">
            <Link href="/chat">
              <Button variant="ghost" size="sm" className="flex items-center gap-1 text-sm font-medium text-gray-700">
                <ArrowLeft className="h-4 w-4" />
                チャット一覧に戻る
              </Button>
            </Link>
          </div>
          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 overflow-hidden rounded-full">
                  <Image
                    src={company.logo || "/placeholder.svg"}
                    alt={`${company.name}のロゴ`}
                    width={40}
                    height={40}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{company.name}</h3>
                    <Badge variant="outline" className={typeStyle.badge}>
                      {typeStyle.badgeIcon}
                      {typeStyle.badgeText}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600">{typeStyle.description}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1 text-xs">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>面接日程を設定</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>面接日程の設定</DialogTitle>
                    <DialogDescription>{company.name}との面接日程を入力してください。</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="interview-date">面接日</Label>
                      <Input id="interview-date" type="date" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="start-time">開始時間</Label>
                        <Input id="start-time" type="time" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="end-time">終了時間</Label>
                        <Input id="end-time" type="time" />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="interview-type">面接形式</Label>
                      <Select defaultValue="online">
                        <SelectTrigger id="interview-type">
                          <SelectValue placeholder="面接形式を選択" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="online">オンライン</SelectItem>
                          <SelectItem value="inperson">対面</SelectItem>
                          <SelectItem value="phone">電話</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="interview-notes">備考</Label>
                      <Textarea id="interview-notes" placeholder="面接に関する備考や準備すべきことなど" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="bg-red-600 hover:bg-red-700">
                      保存する
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* 求人情報サマリー */}
          <div className="border-t border-gray-200 bg-white/50 p-3">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">ポジション:</span>
                <span>{company.position}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{company.chatType === "scout" ? "スカウト日:" : "応募日:"}</span>
                <span>{company.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">ステータス:</span>
                <Badge variant="outline" className="bg-white">
                  {company.step}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* チャットメッセージエリア */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {/* 日付区切り */}
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="mx-4 flex-shrink text-xs text-gray-500">2023年5月15日</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            {company.chatType === "scout" ? (
              // スカウトの場合のメッセージ
              <>
                {/* 企業からのスカウトメッセージ */}
                <div className="flex gap-3">
                  <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full">
                    <Image
                      src={company.logo || "/placeholder.svg"}
                      alt={`${company.name}のロゴ`}
                      width={32}
                      height={32}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="max-w-[75%]">
                    <div className="rounded-lg rounded-tl-none bg-white p-3 shadow-sm">
                      <p className="text-sm">
                        山田様、初めまして。{company.name}
                        採用担当の佐藤と申します。あなたのプロフィールを拝見し、弊社のフロントエンドエンジニアポジションに最適な候補者だと感じました。
                      </p>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">10:30</div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full">
                    <Image
                      src={company.logo || "/placeholder.svg"}
                      alt={`${company.name}のロゴ`}
                      width={32}
                      height={32}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="max-w-[75%]">
                    <div className="rounded-lg rounded-tl-none bg-white p-3 shadow-sm">
                      <p className="text-sm">
                        特にReactとTypeScriptのスキルが弊社のプロジェクトに非常にマッチしています。��社では現在、新しいWebアプリケーションの開発を進めており、あなたのような才能あるエンジニアを探していました。
                      </p>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">10:32</div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full">
                    <Image
                      src={company.logo || "/placeholder.svg"}
                      alt={`${company.name}のロゴ`}
                      width={32}
                      height={32}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="max-w-[75%]">
                    <div className="rounded-lg rounded-tl-none bg-white p-3 shadow-sm">
                      <p className="text-sm">
                        もしご興味があれば、一度お話しさせていただきたいと思います。下記の日程でカジュアル面談は可能でしょうか？
                      </p>
                      <div className="mt-2 rounded-md bg-gray-50 p-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">面談候補日</span>
                        </div>
                        <ul className="mt-1 space-y-1 text-sm">
                          <li>5月20日（月）14:00〜15:00</li>
                          <li>5月21日（火）10:00〜11:00</li>
                          <li>5月22日（水）16:00〜17:00</li>
                        </ul>
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">10:35</div>
                  </div>
                </div>

                {/* 自分のメッセージ */}
                <div className="flex flex-row-reverse gap-3">
                  <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full">
                    <Image
                      src="/placeholder.svg?height=32&width=32"
                      alt="自分のプロフィール画像"
                      width={32}
                      height={32}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="max-w-[75%]">
                    <div className="rounded-lg rounded-tr-none bg-blue-50 p-3">
                      <p className="text-sm">
                        佐藤様、スカウトメッセージありがとうございます。{company.name}
                        様のプロジェクトに非常に興味があります。
                      </p>
                    </div>
                    <div className="mt-1 text-right text-xs text-gray-500">11:20</div>
                  </div>
                </div>
              </>
            ) : (
              // 自己応募の場合のメッセージ
              <>
                {/* 自分の応募メッセージ */}
                <div className="flex flex-row-reverse gap-3">
                  <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full">
                    <Image
                      src="/placeholder.svg?height=32&width=32"
                      alt="自分のプロフィール画像"
                      width={32}
                      height={32}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="max-w-[75%]">
                    <div className="rounded-lg rounded-tr-none bg-green-50 p-3">
                      <p className="text-sm">
                        {company.name}
                        様、フロントエンドエンジニアポジションに応募させていただきました山田太郎と申します。
                      </p>
                    </div>
                    <div className="mt-1 text-right text-xs text-gray-500">10:30</div>
                  </div>
                </div>

                <div className="flex flex-row-reverse gap-3">
                  <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full">
                    <Image
                      src="/placeholder.svg?height=32&width=32"
                      alt="自分のプロフィール画像"
                      width={32}
                      height={32}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="max-w-[75%]">
                    <div className="rounded-lg rounded-tr-none bg-green-50 p-3">
                      <p className="text-sm">
                        貴社のWebアプリケーション開発に携わりたいと考えております。ReactとTypeScriptを用いた開発経験があり、ユーザー体験を向上させるフロントエンド開発に情熱を持っています。
                      </p>
                    </div>
                    <div className="mt-1 text-right text-xs text-gray-500">10:32</div>
                  </div>
                </div>

                {/* 企業からの返信 */}
                <div className="flex gap-3">
                  <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full">
                    <Image
                      src={company.logo || "/placeholder.svg"}
                      alt={`${company.name}のロゴ`}
                      width={32}
                      height={32}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="max-w-[75%]">
                    <div className="rounded-lg rounded-tl-none bg-white p-3 shadow-sm">
                      <p className="text-sm">
                        山田様、ご応募いただきありがとうございます。{company.name}
                        採用担当の佐藤と申します。
                      </p>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">14:30</div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full">
                    <Image
                      src={company.logo || "/placeholder.svg"}
                      alt={`${company.name}のロゴ`}
                      width={32}
                      height={32}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="max-w-[75%]">
                    <div className="rounded-lg rounded-tl-none bg-white p-3 shadow-sm">
                      <p className="text-sm">
                        現在、書類選考を進めております。選考結果は1週間以内にご連絡いたします。何かご質問がございましたら、このチャットでお気軽にお問い合わせください。
                      </p>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">14:32</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* メッセージ入力エリア */}
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="flex items-end gap-2">
            <Textarea placeholder="メッセージを入力..." className="min-h-[80px] resize-none" />
            <div className="flex flex-col gap-2">
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                <Paperclip className="h-5 w-5 text-gray-500" />
              </Button>
              <Button
                size="icon"
                className={`h-9 w-9 rounded-full ${company.chatType === "scout" ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700"}`}
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
