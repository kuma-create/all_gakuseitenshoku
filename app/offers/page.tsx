// app/offers/page.tsx
"use client"

import { Calendar, Filter, Loader2, MessageSquare, Search as SearchIcon } from "lucide-react"
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
  status: "sent" | "accepted" | "declined"
  company_id: string
  room_id?: string  // optional, returned from RPC after accept
  isUnread: boolean
}

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchKeyword, setSearchKeyword] = useState("")
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchOffers() {
      setLoading(true)
      const { data, error } = await supabase
        .from("scouts")
        .select(`
          id,
          status,
          company_id,
          message,
          created_at,
          companies!fk_scouts_company (
            name,
            logo
          ),
          jobs!scouts_job_id_fkey (
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
          company_id: s.company_id,
          company:    s.companies?.name ?? "",
          logo:       s.companies?.logo ?? "/placeholder.svg",
          position:   s.jobs?.title ?? "",
          message:    s.message,
          status:     (s.status as "sent" | "accepted" | "declined") ?? "sent",
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

  const acceptOffer = async (offer: Offer) => {
    if (offer.status !== "sent") return
    setProcessingId(offer.id)
    // Supabase types already know the return shape of accept_offer.
    // If your generated types are up‑to‑date this will be strongly typed.
    const { data, error } = await supabase.rpc("accept_offer", {
      p_scout_id: offer.id,
    })
    setProcessingId(null)

    if (error) {
      alert(`承諾に失敗しました: ${error.message}`)
      return
    }

    // data は [{ room_id: uuid }] 形式を想定
    const roomId = (data as { room_id: string }[] | null)?.[0]?.room_id

    setOffers((prev) =>
      prev.map((o) =>
        o.id === offer.id ? { ...o, status: "accepted", isUnread: false } : o
      )
    )
    if (roomId) {
      window.location.href = `/chat/${roomId}`
    } else {
      console.warn("room_id が取得できませんでした")
    }
  }

  const declineOffer = async (offer: Offer) => {
    if (offer.status !== "sent") return
    if (!confirm("このオファーを辞退します。よろしいですか？")) return

    setProcessingId(offer.id)
    const { error } = await supabase
      .from("scouts")
      .update({ status: "declined" })
      .eq("id", offer.id)
    setProcessingId(null)

    if (error) {
      alert(`辞退に失敗しました: ${error.message}`)
      return
    }

    setOffers((prev) =>
      prev.map((o) =>
        o.id === offer.id ? { ...o, status: "declined", isUnread: false } : o
      )
    )
  }

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

  const unreadOffers = filteredOffers.filter((o) => o.status === "sent")
  const readOffers   = filteredOffers.filter((o) => o.status !== "sent")

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
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                    onAccept={acceptOffer}
                    onDecline={declineOffer}
                    processingId={processingId}
                  />
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
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                    onAccept={acceptOffer}
                    onDecline={declineOffer}
                    processingId={processingId}
                  />
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
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                    onAccept={acceptOffer}
                    onDecline={declineOffer}
                    processingId={processingId}
                  />
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

interface OfferCardProps {
  offer: Offer
  onAccept: (offer: Offer) => void
  onDecline: (offer: Offer) => void
  processingId: string | null
}
function OfferCard({ offer, onAccept, onDecline, processingId }: OfferCardProps) {
  return (
    <Card
      className={`overflow-hidden transition-all hover:shadow-md ${
        offer.isUnread && offer.status === "sent" ? "border-l-4 border-l-blue-500" : ""
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
              {offer.status === "sent" && (
                <Badge className="bg-blue-500 text-xs font-medium">新着</Badge>
              )}
              <Badge
                variant="outline"
                className={
                  offer.status === "sent"
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : offer.status === "accepted"
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-gray-200 bg-gray-50 text-gray-600"
                }
              >
                {offer.status === "sent"
                  ? "未読"
                  : offer.status === "accepted"
                  ? "承諾済み"
                  : "辞退済み"}
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

          {offer.status === "sent" && (
            <div className="mt-4 flex gap-2">
              <Button
                disabled={processingId === offer.id}
                className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                onClick={() => onAccept(offer)}
              >
                {processingId === offer.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                承諾する
              </Button>
              <Button
                disabled={processingId === offer.id}
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => onDecline(offer)}
              >
                辞退する
              </Button>
            </div>
          )}
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
