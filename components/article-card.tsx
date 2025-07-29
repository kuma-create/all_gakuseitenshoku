import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface ArticleCardProps {
  title: string
  excerpt: string
  imageUrl: string
  category: string
  date: string
  link?: string
  featured?: boolean
  onClick?: () => void;
}

export default function ArticleCard({
  title,
  excerpt,
  imageUrl,
  category,
  date,
  link,
  featured = false,
  onClick,
}: ArticleCardProps) {
  // 適切なプレースホルダー画像を補完
  const safeImageUrl =
    imageUrl && imageUrl.trim() !== "" ? imageUrl : "/logo3.png";

  // Choose wrapper element based on whether a link is provided.
  const Wrapper: any = link ? Link : "div";
  const wrapperProps = link ? { href: link } : {};

  if (featured) {
    return (
      <Wrapper
        {...wrapperProps}
        className="block group cursor-pointer"
        onClick={onClick}
      >
        <Card className="overflow-hidden border-0 shadow-lg">
          <div className="relative">
            <Image
              src={safeImageUrl}
              alt={title}
              width={800}
              height={450}
              className="w-full h-64 object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/logo3.png";
              }}
            />
            <Badge className="absolute top-4 left-4 bg-red-600">{category}</Badge>
          </div>
          <CardContent className="p-6">
            <div className="text-sm text-gray-500 mb-2">{date}</div>
            <h2 className="text-2xl font-bold mb-3 line-clamp-2">{title}</h2>
            <p className="text-gray-600 line-clamp-3">{excerpt}</p>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                  <Image
                    src="/images/author-avatar.png"
                    alt="Author"
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-sm font-medium">編集部</span>
              </div>
              <span className="text-sm text-red-600 font-medium cursor-pointer hover:underline">続きを読む</span>
            </div>
          </CardContent>
        </Card>
      </Wrapper>
    )
  }

  return (
    <Wrapper
      {...wrapperProps}
      className="block group cursor-pointer"
      onClick={onClick}
    >
      <Card className="overflow-hidden h-full border-0 shadow-md hover:shadow-lg transition-shadow">
        <div className="relative">
          <Image
            src={safeImageUrl}
            alt={title}
            width={400}
            height={225}
            className="w-full h-48 object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "/logo3.png";
            }}
          />
          <Badge className="absolute top-3 left-3 bg-red-600">{category}</Badge>
        </div>
        <CardContent className="p-4">
          <div className="text-xs text-gray-500 mb-1">{date}</div>
          <h3 className="text-lg font-bold mb-2 line-clamp-2">{title}</h3>
          <p className="text-sm text-gray-600 line-clamp-2">{excerpt}</p>
        </CardContent>
      </Card>
    </Wrapper>
  )
}
