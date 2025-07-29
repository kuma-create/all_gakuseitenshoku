// app/internships/page.tsx
import ListingPage from "@/components/ListingPage"

export default function Internships() {
  return (
    <ListingPage
      title="学生転職 | 長期インターン求人一覧"
      description="長期インターンシップを探すなら学生転職。スタートアップから大手まで最新募集を掲載中。"
      ogImage="/ogp/internships.png"
      defaultSelectionType="intern_long"
    />
  )
}