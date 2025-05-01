"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react"

export default function SetupDbPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  const setupDatabase = async () => {
    try {
      setStatus("loading")
      const response = await fetch("/api/setup-db")
      const data = await response.json()

      if (response.ok) {
        setStatus("success")
        setMessage(data.message || "Database setup completed successfully")
      } else {
        setStatus("error")
        setMessage(data.error || "Failed to setup database")
      }
    } catch (error) {
      setStatus("error")
      setMessage("An unexpected error occurred")
      console.error(error)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Database Setup</CardTitle>
          <CardDescription>Setup the applications table and related database structures</CardDescription>
        </CardHeader>
        <CardContent>
          {status === "success" && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Success</AlertTitle>
              <AlertDescription className="text-green-700">{message}</AlertDescription>
            </Alert>
          )}

          {status === "error" && (
            <Alert className="mb-4 bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertTitle className="text-red-800">Error</AlertTitle>
              <AlertDescription className="text-red-700">{message}</AlertDescription>
            </Alert>
          )}

          <p className="text-sm text-gray-500 mb-4">
            This action will create the applications table and set up the necessary Row Level Security policies. This
            should only be run once during initial setup.
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={setupDatabase} disabled={status === "loading"} className="w-full">
            {status === "loading" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {status === "loading" ? "Setting up..." : "Setup Database"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
