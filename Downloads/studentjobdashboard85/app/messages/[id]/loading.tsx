import { Skeleton } from "@/components/ui/skeleton"

export default function MessageDetailLoading() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col h-[calc(100vh-12rem)]">
        {/* ヘッダー */}
        <div className="flex items-center gap-4 mb-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div>
            <Skeleton className="h-6 w-40 mb-1" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>

        <Skeleton className="h-px w-full mb-4" />

        {/* メッセージ一覧 */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-4 p-2">
          <Skeleton className="h-20 w-full mb-4" />

          {Array(5)
            .fill(0)
            .map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
                <Skeleton className={`h-16 w-2/3 rounded-lg`} />
              </div>
            ))}
        </div>

        {/* メッセージ入力 */}
        <div className="mt-auto">
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    </div>
  )
}
