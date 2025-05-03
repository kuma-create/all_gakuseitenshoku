import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Hero Section Skeleton */}
      <section className="bg-gradient-to-r from-red-600 to-red-700 py-16 md:py-24">
        <div className="container px-4 md:px-6">
          <div className="mx-auto max-w-4xl text-center">
            <Skeleton className="mx-auto mb-6 h-6 w-24" />
            <Skeleton className="mx-auto mb-6 h-16 w-3/4" />
            <Skeleton className="mx-auto mb-10 h-8 w-2/3" />
            <Skeleton className="mx-auto h-12 w-48" />
          </div>
        </div>
      </section>

      {/* Current Challenge Section Skeleton */}
      <section className="py-16">
        <div className="container px-4 md:px-6">
          <div className="mx-auto max-w-3xl">
            <Skeleton className="mx-auto mb-8 h-10 w-48" />

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-24" />
                </div>
                <Skeleton className="mt-2 h-8 w-full" />
                <Skeleton className="mt-2 h-4 w-3/4" />
              </CardHeader>
              <CardContent className="pt-6">
                <div className="mb-4 flex flex-wrap gap-4">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-5 w-40" />
                </div>

                <Skeleton className="h-[200px] w-full" />
                <div className="mt-2 flex justify-end">
                  <Skeleton className="h-4 w-20" />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t px-6 py-4">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-10 w-32" />
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      {/* Past Challenges Section Skeleton */}
      <section className="bg-gray-50 py-16">
        <div className="container px-4 md:px-6">
          <div className="mx-auto max-w-3xl">
            <Skeleton className="mx-auto mb-8 h-10 w-48" />

            <div className="rounded-lg border bg-white shadow">
              <div className="hidden border-b px-6 py-4 md:grid md:grid-cols-12">
                <Skeleton className="col-span-2 h-6 w-16" />
                <Skeleton className="col-span-6 h-6 w-24" />
                <Skeleton className="col-span-2 h-6 w-16" />
                <Skeleton className="col-span-2 h-6 w-16" />
              </div>

              <div className="hidden md:block">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="grid grid-cols-12 items-center border-b px-6 py-4 last:border-0">
                    <Skeleton className="col-span-2 h-6 w-20" />
                    <Skeleton className="col-span-6 h-6 w-full" />
                    <Skeleton className="col-span-2 h-6 w-16" />
                    <Skeleton className="col-span-2 h-6 w-24" />
                  </div>
                ))}
              </div>

              <div className="md:hidden">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="border-b px-4 py-3 last:border-0">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-6 w-24" />
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-6 w-12" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
