import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Play, Clock, Eye } from "lucide-react"

export default function VideoContentSection() {
  const videos = [
    {
      id: 1,
      title: "【2025年卒必見】AI時代の就活戦略セミナー",
      thumbnail: "/images/video-1.png",
      duration: "45:32",
      views: "12,543",
      category: "セミナー",
      date: "2025.07.20",
    },
    {
      id: 2,
      title: "大手IT企業人事が語る「求める人材像」",
      thumbnail: "/images/video-2.png",
      duration: "28:15",
      views: "8,921",
      category: "インタビュー",
      date: "2025.07.18",
    },
    {
      id: 3,
      title: "ES添削ライブ配信 - リアルタイム添削",
      thumbnail: "/images/video-3.png",
      duration: "1:12:45",
      views: "15,678",
      category: "ライブ",
      date: "2025.07.17",
    },
  ]

  return (
    <section className="bg-gray-50 py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">動画コンテンツ</h2>
          <p className="text-gray-600 text-lg">最新の就活情報を動画でお届け</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {videos.map((video) => (
            <Card
              key={video.id}
              className="overflow-hidden group cursor-pointer hover:shadow-lg transition-all duration-300 border-0 shadow-sm"
            >
              <div className="relative">
                <Image
                  src={video.thumbnail || "/placeholder.svg"}
                  alt={video.title}
                  width={400}
                  height={225}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-white/90 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                    <Play className="h-6 w-6 text-gray-800 ml-1" />
                  </div>
                </div>
                <div className="absolute top-3 left-3">
                  <Badge className="bg-red-600 text-white">{video.category}</Badge>
                </div>
                <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {video.duration}
                </div>
              </div>
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-3 line-clamp-2 text-gray-900">{video.title}</h3>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center">
                    <Eye className="w-4 h-4 mr-1" />
                    {video.views} 回視聴
                  </div>
                  <span>{video.date}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
