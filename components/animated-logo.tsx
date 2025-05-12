"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"

export function AnimatedLogo() {
  const birdRef = useRef<SVGPathElement>(null)

  useEffect(() => {
    const bird = birdRef.current
    if (!bird) return

    const animate = () => {
      // Simple floating animation
      let t = 0
      const interval = setInterval(() => {
        t += 0.05
        const y = Math.sin(t) * 3
        bird.style.transform = `translateY(${y}px)`
      }, 50)

      return () => clearInterval(interval)
    }

    const cleanup = animate()
    return cleanup
  }, [])

  return (
    <Link href="/" className="flex items-center">
      <svg width="240" height="60" viewBox="0 0 240 60" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text x="10" y="40" fontFamily="serif" fontSize="32" fontWeight="bold" fill="white">
          学生転職
        </text>
        <g>
          <path
            ref={birdRef}
            d="M230 25c-3-5-8-8-13-8-7 0-12 5-15 10-2 3-3 6-4 9 0 0-5-3-5-8 0-3 2-6 2-6s-4 2-6 7c-1 3-1 7 1 10 1 2 3 4 6 4 4 1 7-1 9-3 1-1 2-3 3-4 0 0 1 4 5 6 3 1 7 0 9-2 3-2 4-5 5-8 0-3-1-5-2-7z"
            fill="white"
          />
        </g>
      </svg>
    </Link>
  )
}
