import { Skeleton } from "@/components/ui/skeleton"

export default function ApplicantProfileLoading() {
  return (
    <div className="container mx-auto py-8 px-4">
      {/* Breadcrumb skeleton */}
      <div className="flex items-center mb-6">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 mx-2 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card skeleton */}
          <div className="rounded-lg border bg-card p-6">
            <div className="flex justify-between items-start">
              <div>
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-4 w-64" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <div className="mt-4 flex justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>

          {/* Tabs skeleton */}
          <div>
            <div className="flex space-x-2 mb-6">
              <Skeleton className="h-10 w-24 rounded-md" />
              <Skeleton className="h-10 w-24 rounded-md" />
              <Skeleton className="h-10 w-24 rounded-md" />
            </div>

            <div className="rounded-lg border bg-card p-6">
              <Skeleton className="h-6 w-32 mb-4" />
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Action Card skeleton */}
          <div className="rounded-lg border bg-card p-6">
            <Skeleton className="h-6 w-24 mb-4" />
            <Skeleton className="h-10 w-full mb-4 rounded-md" />
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-10 w-full mb-4 rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>

          {/* Timeline skeleton */}
          <div className="rounded-lg border bg-card p-6">
            <Skeleton className="h-6 w-40 mb-4" />
            <div className="space-y-4">
              <div className="flex">
                <Skeleton className="h-3 w-3 rounded-full mr-3" />
                <div className="w-full">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="flex">
                <Skeleton className="h-3 w-3 rounded-full mr-3" />
                <div className="w-full">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="flex">
                <Skeleton className="h-3 w-3 rounded-full mr-3" />
                <div className="w-full">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </div>
          </div>

          {/* Notes skeleton */}
          <div className="rounded-lg border bg-card p-6">
            <Skeleton className="h-6 w-16 mb-4" />
            <Skeleton className="h-32 w-full mb-2 rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </div>
      </div>
    </div>
  )
}
