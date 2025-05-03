import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <main className="container mx-auto px-4 py-8">
        {/* パンくずリスト */}
        <div className="mb-6">
          <Skeleton className="h-5 w-32" />
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* 左側：求人詳細 */}
          <div className="md:col-span-2">
            {/* ヘッダー情報 */}
            <Card className="mb-6">
              <CardContent className="p-4 sm:p-6">
                <div className="mb-4 flex flex-col items-start gap-3 border-b border-gray-100 pb-4 sm:mb-6 sm:flex-row sm:items-center sm:gap-4 sm:pb-6">
                  <Skeleton className="h-14 w-14 rounded-md sm:h-24 sm:w-24" />
                  <div className="w-full">
                    <Skeleton className="mb-2 h-7 w-3/4 sm:h-8" />
                    <Skeleton className="mb-2 h-5 w-1/2" />
                    <div className="flex flex-wrap gap-1">
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  </div>
                </div>

                <div className="mb-4 grid grid-cols-1 gap-3 sm:mb-6 sm:grid-cols-2 sm:gap-4">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                </div>

                {/* タブ部分 */}
                <div className="space-y-4">
                  <div className="flex gap-2 border-b">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右側：応募セクション */}
          <div className="space-y-4">
            {/* 応募ボタンカード */}
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col gap-3 sm:gap-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </CardContent>
            </Card>

            {/* 企業情報カード */}
            <Card>
              <CardContent className="p-4 sm:p-6">
                <Skeleton className="mb-4 h-6 w-1/3" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-md" />
                  <div className="w-full">
                    <Skeleton className="mb-1 h-5 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>

                <div className="mt-4 flex justify-center">
                  <Skeleton className="h-9 w-32" />
                </div>
              </CardContent>
            </Card>

            {/* 関連求人カード */}
            <Card>
              <CardContent className="p-4 sm:p-6">
                <Skeleton className="mb-4 h-6 w-1/3" />
                <div className="space-y-3">
                  {[1, 2, 3].map((id) => (
                    <div key={id} className="flex gap-3 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                      <Skeleton className="h-10 w-10 rounded-md" />
                      <div className="w-full">
                        <Skeleton className="mb-1 h-4 w-3/4" />
                        <Skeleton className="mb-1 h-3 w-1/2" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
