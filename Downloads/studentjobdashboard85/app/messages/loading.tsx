import { Skeleton } from "@/components/ui/skeleton"

export default function MessagesLoading() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">メッセージ</h1>

      <div className="relative mb-4">
        <Skeleton className="h-10 w-full" />
      </div>

      <div className="space-y-2">
        {Array(5)
          .fill(0)
          .map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
      </div>
    </div>
  )
}
