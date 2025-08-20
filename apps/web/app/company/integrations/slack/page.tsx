"use client"

import { useState } from "react"
import { Check, Info, Loader2, MessageSquare, SlackIcon, UserPlus, Video } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

export default function SlackIntegrationPage() {
  const [isConnected, setIsConnected] = useState(false)
  const [workspaceName, setWorkspaceName] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showError, setShowError] = useState(false)
  const [notifications, setNotifications] = useState({
    newApplications: true,
    newMessages: true,
    scheduledInterviews: false,
  })

  const handleConnect = () => {
    setIsConnecting(true)
    // Mock API connection
    setTimeout(() => {
      setIsConnecting(false)
      setIsConnected(true)
      setWorkspaceName("テック採用チーム")
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    }, 1500)
  }

  const handleDisconnect = () => {
    setIsConnected(false)
    setWorkspaceName("")
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 3000)
  }

  const handleSavePreferences = () => {
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 3000)
  }

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Slack連携設定</h1>
      <p className="text-muted-foreground mb-8">Slackと連携して、応募やチャットの通知を受け取れます</p>

      {showSuccess && (
        <Alert className="mb-6 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900">
          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertTitle className="text-green-800 dark:text-green-400">設定が保存されました</AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-500">
            変更内容が正常に保存されました。
          </AlertDescription>
        </Alert>
      )}

      {showError && (
        <Alert className="mb-6 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-900">
          <Info className="h-4 w-4 text-red-600 dark:text-red-400" />
          <AlertTitle className="text-red-800 dark:text-red-400">エラーが発生しました</AlertTitle>
          <AlertDescription className="text-red-700 dark:text-red-500">
            接続中にエラーが発生しました。しばらくしてからもう一度お試しください。
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle>Slackワークスペース</CardTitle>
            <CardDescription>通知を受け取るSlackワークスペースを連携します</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-[#4A154B] p-3 rounded-md">
                  <SlackIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  {isConnected ? (
                    <div>
                      <p className="font-medium">{workspaceName}</p>
                      <p className="text-sm text-muted-foreground">接続済み</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium">Slackワークスペース</p>
                      <p className="text-sm text-muted-foreground">未接続</p>
                    </div>
                  )}
                </div>
              </div>
              {isConnected ? (
                <Button variant="outline" onClick={handleDisconnect}>
                  連携解除
                </Button>
              ) : (
                <Button className="bg-[#4A154B] hover:bg-[#3a1039]" onClick={handleConnect} disabled={isConnecting}>
                  {isConnecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      接続中...
                    </>
                  ) : (
                    <>
                      <SlackIcon className="mr-2 h-4 w-4" />
                      Slackに接続する
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle>通知設定</CardTitle>
            <CardDescription>Slackで受け取る通知の種類を選択します</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-md">
                    <UserPlus className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <Label htmlFor="new-applications" className="font-medium">
                      応募があったとき
                    </Label>
                    <p className="text-sm text-muted-foreground">新しい応募者があった場合に通知します</p>
                  </div>
                </div>
                <Switch
                  id="new-applications"
                  checked={notifications.newApplications}
                  onCheckedChange={() => toggleNotification("newApplications")}
                  disabled={!isConnected}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-md">
                    <MessageSquare className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <Label htmlFor="new-messages" className="font-medium">
                      チャットメッセージが届いたとき
                    </Label>
                    <p className="text-sm text-muted-foreground">新しいメッセージを受信した場合に通知します</p>
                  </div>
                </div>
                <Switch
                  id="new-messages"
                  checked={notifications.newMessages}
                  onCheckedChange={() => toggleNotification("newMessages")}
                  disabled={!isConnected}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-md">
                    <Video className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <Label htmlFor="scheduled-interviews" className="font-medium">
                      面談がスケジュールされたとき
                    </Label>
                    <p className="text-sm text-muted-foreground">面談予定が確定した場合に通知します</p>
                  </div>
                </div>
                <Switch
                  id="scheduled-interviews"
                  checked={notifications.scheduledInterviews}
                  onCheckedChange={() => toggleNotification("scheduledInterviews")}
                  disabled={!isConnected}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end border-t pt-4">
            <Button onClick={handleSavePreferences} disabled={!isConnected}>
              設定を保存
            </Button>
          </CardFooter>
        </Card>

        {!isConnected && (
          <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-900">
            <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="text-amber-800 dark:text-amber-400">Slackが未接続です</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-500">
              通知を受け取るには、Slackワークスペースを連携してください。
            </AlertDescription>
          </Alert>
        )}

        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 text-sm">
          <h3 className="font-medium mb-2">Slack連携について</h3>
          <p className="text-muted-foreground mb-2">
            Slack連携により、採用活動の重要な通知をリアルタイムで受け取ることができます。
            チームメンバーと情報を共有し、迅速に対応することで採用プロセスを効率化します。
          </p>
          <p className="text-muted-foreground">
            連携を解除しても、保存されたデータは削除されません。 いつでも再接続して通知の受信を再開できます。
          </p>
        </div>
      </div>
    </div>
  )
}
