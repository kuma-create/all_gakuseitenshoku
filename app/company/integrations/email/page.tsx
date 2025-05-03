"use client"

import { useState } from "react"
import { Mail, Save, Send, Bell, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"

export default function EmailNotificationSettings() {
  const [email, setEmail] = useState("recruit@example.co.jp")
  const [isEditing, setIsEditing] = useState(false)
  const [notifications, setNotifications] = useState({
    application: true,
    message: false,
    interview: true,
  })
  const [showSuccess, setShowSuccess] = useState(false)
  const [showTestSuccess, setShowTestSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [testLoading, setTestLoading] = useState(false)

  const handleSave = () => {
    setLoading(true)
    // モック保存処理
    setTimeout(() => {
      setLoading(false)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    }, 1000)
  }

  const handleTestEmail = () => {
    setTestLoading(true)
    // モックテストメール送信処理
    setTimeout(() => {
      setTestLoading(false)
      setShowTestSuccess(true)
      setTimeout(() => setShowTestSuccess(false), 3000)
    }, 1500)
  }

  const toggleNotification = (key) => {
    setNotifications({
      ...notifications,
      [key]: !notifications[key],
    })
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">メール通知設定</h1>
        <p className="text-muted-foreground">重要なイベントについてメールで通知を受け取る設定ができます</p>
      </div>

      {showSuccess && (
        <Alert className="bg-green-50 text-green-800 border-green-200">
          <Mail className="h-4 w-4" />
          <AlertTitle>設定を保存しました</AlertTitle>
          <AlertDescription>メール通知設定が正常に更新されました。</AlertDescription>
        </Alert>
      )}

      {showTestSuccess && (
        <Alert className="bg-blue-50 text-blue-800 border-blue-200">
          <Send className="h-4 w-4" />
          <AlertTitle>テストメールを送信しました</AlertTitle>
          <AlertDescription>{email} 宛にテストメールを送信しました。受信トレイを確認してください。</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" /> 通知メールアドレス
          </CardTitle>
          <CardDescription>通知を受け取るメールアドレスを設定します</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!isEditing}
                  className="flex-1"
                />
                <Button variant={isEditing ? "default" : "outline"} onClick={() => setIsEditing(!isEditing)}>
                  {isEditing ? "完了" : "変更"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" /> 通知設定
          </CardTitle>
          <CardDescription>どのイベントでメール通知を受け取るか設定します</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">応募があったとき</Label>
                <p className="text-sm text-muted-foreground">新しい応募者がいた場合にメール通知を受け取ります</p>
              </div>
              <Switch checked={notifications.application} onCheckedChange={() => toggleNotification("application")} />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">チャットメッセージが届いたとき</Label>
                <p className="text-sm text-muted-foreground">応募者からのメッセージがあった場合に通知を受け取ります</p>
              </div>
              <Switch checked={notifications.message} onCheckedChange={() => toggleNotification("message")} />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">面談リマインド通知（前日）</Label>
                <p className="text-sm text-muted-foreground">
                  予定されている面談の前日にリマインドメールを受け取ります
                </p>
              </div>
              <Switch checked={notifications.interview} onCheckedChange={() => toggleNotification("interview")} />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={handleTestEmail} disabled={testLoading}>
            {testLoading ? (
              <>
                <Skeleton className="h-4 w-4 mr-2 rounded-full" />
                送信中...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                テストメールを送信
              </>
            )}
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <Skeleton className="h-4 w-4 mr-2 rounded-full" />
                保存中...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                設定を保存
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" /> メール通知について
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p>
              メール通知は、重要なイベントをリアルタイムで把握するのに役立ちます。
              通知頻度が高すぎる場合は、必要な通知のみを有効にしてください。
            </p>
            <p>
              メールの受信が確認できない場合は、迷惑メールフォルダを確認するか、
              ドメイン「jobhub.example.com」を許可リストに追加してください。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
