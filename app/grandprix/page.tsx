"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function GrandPrixPage() {
  const router = useRouter()

  useEffect(() => {
    // Check if there's a hash in the URL
    if (window.location.hash) {
      // Get the element with the ID matching the hash
      const element = document.getElementById(window.location.hash.substring(1))

      // If the element exists, scroll to it
      if (element) {
        element.scrollIntoView({ behavior: "smooth" })
        return
      }
    }

    // Default redirect if no hash or element not found
    router.push("/grandprix/monthly-challenge")
  }, [router])

  return null
}
