"use client"

import { useEffect } from "react"

import { useState } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface MessageTemplatesProps {
  onSelect: (template: string) => void
}

// テンプレートのカテゴリとメッセージ
const templateCategories = {
  greeting: [
    {
      title: "初回挨拶",
      content: "はじめまして。弊社の求人にご興味をお持ちいただきありがとうございます。",
    },
    {
      title: "フォローアップ",
      content: "先日はお問い合わせいただきありがとうございました。追加情報がございましたらお知らせください。",
    },
    {
      title: "返信お礼",
      content: "ご返信ありがとうございます。",
    },
  ],
  interview: [
    {
      title: "面接日程調整",
      content: "面接の日程調整をさせていただきたいと思います。ご都合の良い日時を教えていただけますか？",
    },
    {
      title: "面接確認",
      content: "面接の日程を確認させていただきます。○月○日○時からでよろしいでしょうか？",
    },
    {
      title: "面接リマインド",
      content: "明日の面接のリマインドです。○時に弊社オフィスにてお待ちしております。",
    },
    {
      title: "オンライン面接案内",
      content:
        "オンライン面接のURLをお送りします。当日は5分前にログインしていただけますようお願いいたします。\nURL: https://meet.example.com/interview",
    },
  ],
  feedback: [
    {
      title: "書類選考通過",
      content: "書類選考を通過されましたことをお知らせいたします。次のステップとして面接を実施したいと思います。",
    },
    {
      title: "面接通過",
      content: "先日の面接、ありがとうございました。面接の結果、次のステップに進んでいただきたいと思います。",
    },
    {
      title: "最終選考結果",
      content:
        "選考過程にご参加いただき、誠にありがとうございました。慎重に検討した結果、今回は採用を見送らせていただくことになりました。",
    },
    {
      title: "内定連絡",
      content:
        "この度は弊社の選考にご参加いただき、誠にありがとうございました。選考の結果、あなたに内定を差し上げたいと思います。",
    },
  ],
  information: [
    {
      title: "会社情報",
      content: "弊社についての詳細情報です。\n設立: 20XX年\n従業員数: XX名\n事業内容: XXXの開発・販売",
    },
    {
      title: "職務内容",
      content:
        "この職位では主に以下の業務を担当していただきます。\n・Webアプリケーションの開発\n・ユーザーインターフェースの設計\n・既存システムの保守・運用",
    },
    {
      title: "福利厚生",
      content:
        "弊社の福利厚生についてご案内します。\n・各種社会保険完備\n・交通費支給\n・フレックスタイム制\n・リモートワーク可\n・書籍購入補助",
    },
  ],
}

export function MessageTemplates({ onSelect }: MessageTemplatesProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("greeting")

  // 検索フィルター
  const filteredTemplates = Object.entries(templateCategories).reduce(
    (acc, [category, templates]) => {
      const filtered = templates.filter(
        (template) =>
          template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          template.content.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      if (filtered.length > 0) {
        acc[category] = filtered
      }
      return acc
    },
    {} as Record<string, (typeof templateCategories)[keyof typeof templateCategories]>,
  )

  // 検索結果があるカテゴリのみ表示
  const availableTabs = Object.keys(filteredTemplates)

  // 検索時に選択中のタブが検索結果に含まれない場合、最初のタブを選択
  useEffect(() => {
    if (searchTerm && availableTabs.length > 0 && !availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0])
    }
  }, [searchTerm, availableTabs, activeTab])

  return (
    <div className="p-4">
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
          <Input
            type="search"
            placeholder="テンプレートを検索..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {availableTabs.length > 0 ? (
        <Tabs defaultValue="greeting" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            {Object.entries(templateCategories).map(([key, _]) => {
              // 検索結果に含まれるカテゴリのみタブを表示
              if (!filteredTemplates[key]) return null

              const tabLabels: Record<string, string> = {
                greeting: "挨拶",
                interview: "面接",
                feedback: "フィードバック",
                information: "情報提供",
              }

              return (
                <TabsTrigger key={key} value={key} className="flex-1">
                  {tabLabels[key] || key}
                </TabsTrigger>
              )
            })}
          </TabsList>

          {Object.entries(templateCategories).map(([key, _]) => {
            // 検索結果に含まれるカテゴリのみコンテンツを表示
            if (!filteredTemplates[key]) return null

            return (
              <TabsContent key={key} value={key} className="mt-2">
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {filteredTemplates[key].map((template, index) => (
                      <div
                        key={index}
                        className="rounded-md border p-3 hover:bg-gray-50 dark:hover:bg-gray-800 dark:border-gray-700"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-sm">{template.title}</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onSelect(template.content)}
                            className="h-7 px-2 text-xs"
                          >
                            使用
                          </Button>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">
                          {template.content.length > 100
                            ? `${template.content.substring(0, 100)}...`
                            : template.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            )
          })}
        </Tabs>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">検索結果がありません</p>
        </div>
      )}
    </div>
  )
}
