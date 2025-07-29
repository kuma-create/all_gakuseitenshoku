// app/jobs/page.tsx
import ListingPage from "@/components/ListingPage"

export default function Jobs() {
  return (
    <ListingPage
      title="学生転職 | 本選考・インターン求人一覧"
      description="学生向け本選考・インターン求人を多数掲載。あなたにぴったりのキャリアを探すなら学生転職。"
      ogImage="/ogp/jobs.png"
      defaultSelectionType="all"
    />
  )
}