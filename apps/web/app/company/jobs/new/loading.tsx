import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"

export default function NewJobLoading() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col space-y-6">
        {/* Header with back button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Button variant="outline" className="w-fit" disabled>
            <ArrowLeft className="mr-2 h-4 w-4" />
            求人一覧に戻る
          </Button>

          <Skeleton className="h-8 w-40" />
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div>
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-10 w-full" />
                </div>

                <div>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-10 w-full" />
                </div>

                <div>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>

              <div>
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-40 w-full" />
              </div>

              <div>
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-10 w-[200px]" />
                <Skeleton className="h-4 w-3/4 mt-1" />
              </div>

              <div className="flex justify-end pt-4">
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
