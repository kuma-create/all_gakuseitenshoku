import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="mb-6 md:mb-8">
        <Skeleton className="h-8 w-48 md:h-10 md:w-64" />
        <Skeleton className="mt-2 h-4 w-64 md:h-5 md:w-80" />
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-10 w-full sm:max-w-xs" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-[180px]" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>

      <div className="mb-6">
        <Skeleton className="h-10 w-[300px]" />
      </div>

      <div className="grid gap-4 md:gap-6">
        {Array(3)
          .fill(0)
          .map((_, i) => (
            <Card key={i} className="overflow-hidden border-0 shadow-md">
              <div className="flex flex-col sm:flex-row">
                <div className="flex items-center gap-4 border-b bg-gray-50 p-4 sm:w-64 sm:flex-col sm:items-start sm:border-b-0 sm:border-r">
                  <Skeleton className="h-12 w-12 rounded-full sm:h-16 sm:w-16" />
                  <div className="w-full">
                    <Skeleton className="h-5 w-32 sm:w-full" />
                    <Skeleton className="mt-2 h-3 w-24 sm:w-full" />
                  </div>
                </div>

                <div className="flex-1 p-4">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                    <div className="w-full max-w-md">
                      <Skeleton className="h-6 w-full max-w-sm" />
                      <div className="mt-2 flex flex-wrap gap-4">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>

                  <Skeleton className="mb-4 h-20 w-full rounded-md" />

                  <div className="flex flex-wrap justify-end gap-2">
                    <Skeleton className="h-9 w-32" />
                    <Skeleton className="h-9 w-24" />
                  </div>
                </div>
              </div>
            </Card>
          ))}
      </div>
    </div>
  )
}
