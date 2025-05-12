// app/offers/page.tsx
"use client"

import { Calendar, Filter, MessageSquare, Search as SearchIcon } from "lucide-react"
import { LazyImage } from "@/components/ui/lazy-image"
import Link from "next/link"
import { useEffect, useState, ChangeEvent } from "react"

import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

interface Offer {
  id: string
  company: string
  logo: string
  position: string
  message: string
  created_at: string
  date: string
  isUnread: boolean
}

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchKeyword, setSearchKeyword] = useState("")

  useEffect(() => {
    async function fetchOffers() {
      setLoading(true)
      const { data, error } = await supabase
        .from("scouts")
        .select(`
          id,
          message,
          status,
          created_at,
          companies (
            name,
            logo
          ),
          jobs (
            title
          )
        `)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching scouts:", error)
        setError(error.message)
      } else {
        const mapped: Offer[] = (data ?? []).map((s) => ({
          id:         s.id,
          company:    s.companies.name,
          logo:       s.companies.logo ?? "/placeholder.svg",
          position:   s.jobs?.title ?? "",
          message:    s.message,
          created_at: s.created_at ?? "",
          date:       s.created_at
                        ? new Date(s.created_at).toLocaleDateString("ja-JP")
                        : "",
          isUnread:   s.status === "sent",
        }))
        setOffers(mapped)
      }
      setLoading(false)
    }

    fetchOffers()
  }, [])

  // フィルタリング
  const filteredOffers = offers.filter((o) => {
    const kw = searchKeyword.trim().toLowerCase()
    if (!kw) return true
    return (
      o.company.toLowerCase().includes(kw) ||
      o.position.toLowerCase().includes(kw) ||
      o.message.toLowerCase().includes(kw)
    )
  })

  const unreadOffers = filteredOffers.filter((o) => o.isUnread)
  const readOffers   = filteredOffers.filter((o) => !o.isUnread)

  if (loading) return <p className="p-6 text-center">読み込み中…</p>
  if (error)   return <p className="p-6 text-center text-red-600">エラー: {error}</p>

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <main className="container mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl font-bold sm:text-2xl">オファー一覧</h1>
          <p className="text-sm text-gray-500">
            企業からのスカウトを確認・管理できます
          </p>
        </div>

        {/* Controls */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchKeyword}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchKeyword(e.target.value)}
              placeholder="企業名やキーワードで検索"
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Filter size={16} />
            <span>絞り込み</span>
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-6 grid w-full grid-cols-3">
            <TabsTrigger value="unread" className="text-sm">
              未読 ({unreadOffers.length})
            </TabsTrigger>
            <TabsTrigger value="read" className="text-sm">
              既読 ({readOffers.length})
            </TabsTrigger>
            <TabsTrigger value="all" className="text-sm">
              すべて ({filteredOffers.length})
            </TabsTrigger>
          </TabsList>

          {/* All Offers */}
          <TabsContent value="all">
            {filteredOffers.length > 0 ? (
              <div className="grid gap-4">
                {filteredOffers.map((offer) => (
                  <OfferCard key={offer.id} offer={offer} />
                ))}
              </div>
            ) : (
              <EmptyState message="条件に合うオファーがありません" />
            )}
          </TabsContent>

          {/* Unread Offers */}
          <TabsContent value="unread">
            {unreadOffers.length > 0 ? (
              <div className="grid gap-4">
                {unreadOffers.map((offer) => (
                  <OfferCard key={offer.id} offer={offer} />
                ))}
              </div>
            ) : (
              <EmptyState message="未読のオファーはありません" />
            )}
          </TabsContent>

          {/* Read Offers */}
          <TabsContent value="read">
            {readOffers.length > 0 ? (
              <div className="grid gap-4">
                {readOffers.map((offer) => (
                  <OfferCard key={offer.id} offer={offer} />
                ))}
              </div>
            ) : (
              <EmptyState message="既読のオファーはありません" />
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

interface OfferCardProps { offer: Offer }
function OfferCard({ offer }: OfferCardProps) {
  return (
    <Card
      className={`overflow-hidden transition-all hover:shadow-md ${
        offer.isUnread ? "border-l-4 border-l-blue-500" : ""
      }`}
    >
      <div className="flex flex-col md:flex-row">
        {/* Company Info */}
        <div className="flex items-center gap-4 border-b border-gray-100 bg-white p-4 md:w-64 md:flex-col md:items-start md:border-b-0 md:border-r">
          <div className="relative h-12 w-12 overflow-hidden rounded-md border border-gray-200 md:h-16 md:w-16">
            <LazyImage
              src={offer.logo}
              alt={`${offer.company} のロゴ`}
              width={64}
              height={64}
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 md:mt-2 md:text-lg">
              {offer.company}
            </h3>
            <Badge variant="outline" className="mt-1 bg-gray-50">
              {offer.position}
            </Badge>
          </div>
        </div>

        {/* Offer Content */}
        <div className="flex-1 p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {offer.isUnread && (
                <Badge className="bg-blue-500 text-xs font-medium">新着</Badge>
              )}
              <Badge
                variant={offer.isUnread ? "outline" : "secondary"}
                className={
                  offer.isUnread
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "bg-gray-100 text-gray-700"
                }
              >
                {offer.isUnread ? "未読" : "既読"}
              </Badge>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Calendar size={14} />
              <span>{offer.date}</span>
            </div>
          </div>

          <p className="mb-4 text-sm text-gray-600">
            {offer.message.length > 100
              ? `${offer.message.slice(0, 100)}...`
              : offer.message}
          </p>

          <div className="flex flex-wrap gap-2 sm:flex-nowrap">
            <Link href={`/offers/${offer.id}`} className="w-full sm:w-auto">
              <Button variant="outline" className="w-full">
                詳細を見る
              </Button>
            </Link>
            <Link href={`/chat/${offer.id}`} className="w-full sm:w-auto">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                <MessageSquare size={16} className="mr-2" />
                チャットを開始
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Card>
  )
}

interface EmptyStateProps { message?: string }
function EmptyState({ message = "まだオファーはありません" }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white p-8 py-12 text-center">
      <div className="mb-4 rounded-full bg-gray-100 p-3">
        <MessageSquare size={24} className="text-gray-400" />
      </div>
      <h3 className="mb-2 text-lg font-medium text-gray-700">{message}</h3>
      <p className="mb-6 text-sm text-gray-500">キーワードを変えて再検索してみましょう</p>
      <Link href="/student/profile">
        <Button>プロフィールを編集する</Button>
      </Link>
    </div>
  )
}
