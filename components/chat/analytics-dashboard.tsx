"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Mock data for analytics
const analyticsData = {
  responseTime: {
    average: "2時間15分",
    improvement: "+15%",
    chart: [
      { date: "4/1", value: 180 },
      { date: "4/8", value: 150 },
      { date: "4/15", value: 165 },
      { date: "4/22", value: 135 },
      { date: "4/29", value: 120 },
    ],
  },
  conversionRate: {
    rate: "28%",
    change: "+5%",
    stages: [
      { name: "スカウト送信", value: 100 },
      { name: "メッセージ開封", value: 85 },
      { name: "返信", value: 62 },
      { name: "面接設定", value: 45 },
      { name: "内定", value: 28 },
    ],
  },
  engagementMetrics: {
    messagesPerConversation: 12.5,
    averageConversationLength: "5日",
    responseRate: "78%",
  },
}

export function AnalyticsDashboard() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">チャット分析</h2>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">概要</TabsTrigger>
          <TabsTrigger value="response">応答時間</TabsTrigger>
          <TabsTrigger value="conversion">コンバージョン</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">平均応答時間</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.responseTime.average}</div>
                <p className="text-xs text-muted-foreground">前月比 {analyticsData.responseTime.improvement}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">内定率</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.conversionRate.rate}</div>
                <p className="text-xs text-muted-foreground">前月比 {analyticsData.conversionRate.change}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">会話あたりのメッセージ数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.engagementMetrics.messagesPerConversation}</div>
                <p className="text-xs text-muted-foreground">
                  平均会話期間: {analyticsData.engagementMetrics.averageConversationLength}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>応募者対応効率</CardTitle>
              <CardDescription>メッセージの応答時間と質に関する分析</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] flex items-center justify-center border-2 border-dashed rounded-md">
                <p className="text-muted-foreground">応答時間グラフ（実装時にはグラフを表示）</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="response" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>応答時間の推移</CardTitle>
              <CardDescription>過去30日間の平均応答時間の推移</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center border-2 border-dashed rounded-md">
                <p className="text-muted-foreground">応答時間の推移グラフ（実装時にはグラフを表示）</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>時間帯別応答率</CardTitle>
              <CardDescription>時間帯別の応答率と平均応答時間</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] flex items-center justify-center border-2 border-dashed rounded-md">
                <p className="text-muted-foreground">時間帯別応答率グラフ（実装時にはグラフを表示）</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>採用プロセスのコンバージョン</CardTitle>
              <CardDescription>各ステージでのコンバージョン率</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center border-2 border-dashed rounded-md">
                <p className="text-muted-foreground">コンバージョンファネルグラフ（実装時にはグラフを表示）</p>
              </div>
              <div className="mt-4 space-y-2">
                {analyticsData.conversionRate.stages.map((stage, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span>{stage.name}</span>
                    <span className="font-medium">{stage.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
