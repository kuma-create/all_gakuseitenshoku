"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { LazyImage } from "@/components/ui/lazy-image"
import { Trophy, Clock, Gift, Users, ExternalLink, List } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const grandprixEvents = [
  {
    id: 1,
    title: "ビジネス戦闘力診断 2025春",
    description: "あなたのビジネススキルを診断し、強みと弱みを可視化します",
    period: "2025年4月15日〜5月15日",
    participants: "3,240名参加中",
    prize: "Amazonギフト券 5,000円分",
    color: "from-purple-500 to-indigo-600",
    textColor: "text-purple-50",
    primaryButtonColor: "bg-purple-50 text-purple-700 hover:bg-white",
    secondaryButtonColor: "bg-white/25 text-white hover:bg-white/40",
    icon: Trophy,
    link: "/grandprix/business",
    image: "/green-circuitry.png",
  },
  {
    id: 2,
    title: "Webテストグランプリ 2025",
    description: "SPI・玉手箱・TG-Webなど主要Webテスト対策ができます",
    period: "2025年4月1日〜5月31日",
    participants: "5,120名参加中",
    prize: "成績上位者は大手企業へ推薦",
    color: "from-emerald-500 to-teal-600",
    textColor: "text-emerald-50",
    primaryButtonColor: "bg-emerald-50 text-emerald-700 hover:bg-white",
    secondaryButtonColor: "bg-white/25 text-white hover:bg-white/40",
    icon: Users,
    link: "/grandprix/webtest",
    image: "/abstract-fs.png",
  },
  {
    id: 3,
    title: "ケーススタディグランプリ 2025",
    description: "実際の企業課題に挑戦し、あなたの問題解決力をアピール",
    period: "2025年4月20日〜5月20日",
    participants: "2,780名参加中",
    prize: "優秀者は最終選考免除",
    color: "from-amber-500 to-orange-600",
    textColor: "text-amber-50",
    primaryButtonColor: "bg-amber-50 text-amber-700 hover:bg-white",
    secondaryButtonColor: "bg-white/25 text-white hover:bg-white/40",
    icon: Gift,
    link: "/grandprix/case",
    image: "/collaborative-strategy-session.png",
  },
]

export function GrandprixBanner() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev === grandprixEvents.length - 1 ? 0 : prev + 1))
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? grandprixEvents.length - 1 : prev - 1))
  }

  const resetTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    if (!isPaused) {
      timerRef.current = setInterval(() => {
        nextSlide()
      }, 5000)
    }
  }

  useEffect(() => {
    resetTimer()

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [currentSlide, isPaused])

  const handleMouseEnter = () => {
    setIsPaused(true)
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
  }

  const handleMouseLeave = () => {
    setIsPaused(false)
    resetTimer()
  }

  const currentEvent = grandprixEvents[currentSlide]

  return (
    <div
      className="relative w-full overflow-hidden rounded-lg shadow-md"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative h-24 w-full sm:h-28">
        {grandprixEvents.map((event, index) => (
          <div
            key={event.id}
            className={cn(
              "absolute inset-0 flex h-full w-full items-center transition-opacity duration-500",
              index === currentSlide ? "opacity-100" : "opacity-0 pointer-events-none",
            )}
          >
            <div className={`absolute inset-0 bg-gradient-to-r ${event.color} opacity-90`}></div>

            <div className="relative z-10 flex w-full items-center px-4 sm:px-6">
              <div className="mr-4 hidden rounded-full bg-white/20 p-2 sm:block">
                <Trophy className="h-8 w-8 text-white" />
              </div>

              <div className="flex-1">
                <h3 className={`text-lg font-bold ${event.textColor} sm:text-xl`}>{event.title}</h3>
                <p className="text-xs text-white/90 sm:text-sm">{event.description}</p>

                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/80">
                  <span className="flex items-center">
                    <Clock className="mr-1 h-3 w-3" />
                    {event.period}
                  </span>
                  <span className="flex items-center">
                    <Users className="mr-1 h-3 w-3" />
                    {event.participants}
                  </span>
                  <span className="flex items-center">
                    <Gift className="mr-1 h-3 w-3" />
                    {event.prize}
                  </span>
                </div>
              </div>

              <div className="ml-2 flex shrink-0 flex-col gap-2 sm:flex-row sm:gap-3">
                <Link href={event.link}>
                  <Button
                    size="sm"
                    className={`w-full min-w-[100px] font-medium shadow-sm ${event.primaryButtonColor}`}
                  >
                    <span className="mr-1">参加する</span>
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </Link>

                <Link href={event.link}>
                  <Button
                    size="sm"
                    className={`w-full min-w-[100px] font-medium shadow-sm ${event.secondaryButtonColor}`}
                  >
                    <span className="mr-1">一覧を見る</span>
                    <List className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation dots */}
      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 transform space-x-1">
        {grandprixEvents.map((_, index) => (
          <button
            key={index}
            className={`h-1.5 w-6 rounded-full transition-all ${index === currentSlide ? "bg-white" : "bg-white/40"}`}
            onClick={() => setCurrentSlide(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
