"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle } from "lucide-react"

export function CompanyContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    // ここで実際のフォーム送信処理を行う
    // 例: APIエンドポイントにPOSTリクエストを送信

    // 送信完了を模擬（実際の実装では非同期処理の完了後に設定）
    setTimeout(() => {
      setIsSubmitting(false)
      setIsSubmitted(true)
    }, 1500)
  }

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="mb-4 rounded-full bg-green-100 p-3">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <h3 className="mb-2 text-xl font-bold">お問い合わせを受け付けました</h3>
        <p className="mb-6 text-gray-600">
          お問い合わせありがとうございます。担当者が内容を確認し、2営業日以内にご連絡いたします。
        </p>
        <Button onClick={() => setIsSubmitted(false)}>新しいお問い合わせ</Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="company">
            会社名 <span className="text-red-500">*</span>
          </Label>
          <Input id="company" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">
            担当者名 <span className="text-red-500">*</span>
          </Label>
          <Input id="name" required />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">
            メールアドレス <span className="text-red-500">*</span>
          </Label>
          <Input id="email" type="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">電話番号</Label>
          <Input id="phone" type="tel" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>
          お問い合わせ種別 <span className="text-red-500">*</span>
        </Label>
        <RadioGroup defaultValue="service" className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="service" id="service" />
            <Label htmlFor="service" className="cursor-pointer">
              サービスについて
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="pricing" id="pricing" />
            <Label htmlFor="pricing" className="cursor-pointer">
              料金プランについて
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="demo" id="demo" />
            <Label htmlFor="demo" className="cursor-pointer">
              デモ依頼
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="other" id="other" />
            <Label htmlFor="other" className="cursor-pointer">
              その他
            </Label>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label htmlFor="employees">従業員数</Label>
        <Select>
          <SelectTrigger id="employees">
            <SelectValue placeholder="選択してください" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1-10">1-10人</SelectItem>
            <SelectItem value="11-50">11-50人</SelectItem>
            <SelectItem value="51-200">51-200人</SelectItem>
            <SelectItem value="201-500">201-500人</SelectItem>
            <SelectItem value="501+">501人以上</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">
          お問い合わせ内容 <span className="text-red-500">*</span>
        </Label>
        <Textarea id="message" rows={5} required />
      </div>

      <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
        {isSubmitting ? "送信中..." : "送信する"}
      </Button>
    </form>
  )
}
