import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function AdminGrandPrixLoading() {
  return (
    <div className="container mx-auto px-4 py-6">
      <Skeleton className="h-8 w-64 mb-6" />

      <Tabs defaultValue="challenge" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="challenge" disabled>
            お題の管理
          </TabsTrigger>
          <TabsTrigger value="submissions" disabled>
            提出された回答
          </TabsTrigger>
          <TabsTrigger value="past" disabled>
            過去のお題
          </TabsTrigger>
        </TabsList>

        <TabsContent value="challenge">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48 mb-2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-24 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-10 flex-1" />
                </div>
              </div>
              <Skeleton className="h-10 w-40" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
