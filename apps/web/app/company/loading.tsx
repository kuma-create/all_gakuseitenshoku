export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-6">
      {/* ヘッダーセクション */}
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="h-8 w-48 animate-pulse rounded-md bg-gray-200"></div>
          <div className="mt-2 h-4 w-72 animate-pulse rounded-md bg-gray-200"></div>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="h-10 w-32 animate-pulse rounded-md bg-gray-200"></div>
          <div className="h-10 w-24 animate-pulse rounded-md bg-gray-200"></div>
        </div>
      </div>

      {/* 概要カード */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="h-5 w-24 animate-pulse rounded-md bg-gray-200 mb-2"></div>
            <div className="h-8 w-16 animate-pulse rounded-md bg-gray-200 mb-2"></div>
            <div className="h-4 w-32 animate-pulse rounded-md bg-gray-200 mt-4"></div>
          </div>
        ))}
      </div>

      {/* 採用パイプライン */}
      <div className="mb-8 rounded-lg border bg-card shadow-sm">
        <div className="p-6 border-b">
          <div className="h-6 w-48 animate-pulse rounded-md bg-gray-200 mb-2"></div>
          <div className="h-4 w-64 animate-pulse rounded-md bg-gray-200"></div>
        </div>
        <div className="p-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between mb-4">
              <div className="h-5 w-32 animate-pulse rounded-md bg-gray-200"></div>
              <div className="h-4 w-16 animate-pulse rounded-md bg-gray-200"></div>
            </div>
          ))}
        </div>
      </div>

      {/* 最近のアクティビティと求人概要 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-lg border bg-card shadow-sm">
            <div className="p-6 border-b">
              <div className="h-6 w-48 animate-pulse rounded-md bg-gray-200 mb-2"></div>
              <div className="h-4 w-64 animate-pulse rounded-md bg-gray-200"></div>
            </div>
            <div className="p-6">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="flex items-center justify-between rounded-lg border p-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200"></div>
                    <div>
                      <div className="h-5 w-32 animate-pulse rounded-md bg-gray-200 mb-1"></div>
                      <div className="h-4 w-24 animate-pulse rounded-md bg-gray-200"></div>
                    </div>
                  </div>
                  <div className="h-6 w-20 animate-pulse rounded-md bg-gray-200"></div>
                </div>
              ))}
            </div>
            <div className="p-6 border-t">
              <div className="h-10 w-full animate-pulse rounded-md bg-gray-200"></div>
            </div>
          </div>
        ))}
      </div>

      {/* アクションカード */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border bg-card shadow-sm">
            <div className="p-6 border-b">
              <div className="h-6 w-32 animate-pulse rounded-md bg-gray-200"></div>
            </div>
            <div className="p-6">
              <div className="h-4 w-full animate-pulse rounded-md bg-gray-200"></div>
            </div>
            <div className="p-6 border-t">
              <div className="h-10 w-full animate-pulse rounded-md bg-gray-200"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
