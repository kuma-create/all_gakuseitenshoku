import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Users, MessageSquare, Heart } from "lucide-react"

export default function UserActivitySidebar() {
  const activities = [
    {
      id: 1,
      user: {
        name: "田中 太郎",
        avatar: "/images/user-1.png",
        role: "東京大学 3年",
      },
      action: "記事にコメント",
      target: "2025年卒の就活トレンド：AIスキルが求められる業界とは",
      time: "2時間前",
      type: "comment",
    },
    {
      id: 2,
      user: {
        name: "佐藤 花子",
        avatar: "/images/user-2.png",
        role: "早稲田大学 4年",
      },
      action: "記事をシェア",
      target: "インターンシップ体験談：大手IT企業での3ヶ月",
      time: "4時間前",
      type: "share",
    },
    {
      id: 3,
      user: {
        name: "山田 次郎",
        avatar: "/images/user-3.png",
        role: "慶應義塾大学 3年",
      },
      action: "記事にいいね",
      target: "自己PR作成のコツ：AIを活用した効果的なアピール方法",
      time: "6時間前",
      type: "like",
    },
  ]

  const topUsers = [
    {
      name: "鈴木 一郎",
      avatar: "/images/top-user-1.png",
      university: "東京大学",
      followers: 1234,
      posts: 45,
    },
    {
      name: "高橋 美咲",
      avatar: "/images/top-user-2.png",
      university: "京都大学",
      followers: 987,
      posts: 38,
    },
    {
      name: "伊藤 健太",
      avatar: "/images/top-user-3.png",
      university: "大阪大学",
      followers: 756,
      posts: 29,
    },
  ]

  return (
    <div className="space-y-6">
      {/* User Activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <Users className="mr-2 h-5 w-5 text-red-600" />
            ユーザーアクティビティ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={activity.user.avatar || "/placeholder.svg"} />
                  <AvatarFallback>{activity.user.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-sm">{activity.user.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {activity.user.role}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-1 text-xs text-gray-600 mb-1">
                    {activity.type === "comment" && <MessageSquare className="w-3 h-3" />}
                    {activity.type === "like" && <Heart className="w-3 h-3" />}
                    <span>{activity.action}</span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">{activity.target}</p>
                  <span className="text-xs text-gray-400">{activity.time}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Users */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">注目ユーザー</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topUsers.map((user, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="w-6 text-center">
                  <span className="text-sm font-bold text-gray-400">{index + 1}</span>
                </div>
                <Avatar className="w-10 h-10">
                  <AvatarImage src={user.avatar || "/placeholder.svg"} />
                  <AvatarFallback>{user.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium text-sm">{user.name}</div>
                  <div className="text-xs text-gray-500">{user.university}</div>
                  <div className="flex space-x-3 text-xs text-gray-400 mt-1">
                    <span>{user.followers} フォロワー</span>
                    <span>{user.posts} 投稿</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
