import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="container flex h-screen items-center justify-center px-4 py-8">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Skeleton className="h-10 w-10 rounded" />
        </div>
        <Skeleton className="h-8 w-3/4 mx-auto" />
        <Skeleton className="h-4 w-2/3 mx-auto" />

        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>

        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )
}
