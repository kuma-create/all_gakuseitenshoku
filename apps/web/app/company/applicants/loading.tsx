import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Filter, Download, Search, ChevronDown } from "lucide-react"

export default function Loading() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <Button variant="outline" disabled className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            戻る
          </Button>
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-5 w-72" />
        </div>
        <div className="mt-4 md:mt-0 flex gap-2">
          <Button variant="outline" disabled>
            <Filter className="mr-2 h-4 w-4" />
            詳細フィルター
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="outline" disabled>
            <Download className="mr-2 h-4 w-4" />
            エクスポート
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-full md:w-64" />
        </div>

        <div className="mb-6">
          <Skeleton className="h-10 w-full md:w-96 mb-4" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">
                  <Skeleton className="h-5 w-20" />
                </th>
                <th className="text-left py-3 px-4 hidden md:table-cell">
                  <Skeleton className="h-5 w-24" />
                </th>
                <th className="text-left py-3 px-4 hidden md:table-cell">
                  <Skeleton className="h-5 w-16" />
                </th>
                <th className="text-left py-3 px-4 hidden md:table-cell">
                  <Skeleton className="h-5 w-20" />
                </th>
                <th className="text-left py-3 px-4">
                  <Skeleton className="h-5 w-24" />
                </th>
                <th className="text-right py-3 px-4">
                  <Skeleton className="h-5 w-20 ml-auto" />
                </th>
              </tr>
            </thead>
            <tbody>
              {Array(5)
                .fill(0)
                .map((_, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-4 px-4">
                      <div className="flex items-center">
                        <Skeleton className="h-8 w-8 rounded-full mr-3" />
                        <Skeleton className="h-5 w-24" />
                      </div>
                    </td>
                    <td className="py-4 px-4 hidden md:table-cell">
                      <Skeleton className="h-5 w-32 mb-1" />
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="py-4 px-4 hidden md:table-cell">
                      <Skeleton className="h-5 w-24" />
                    </td>
                    <td className="py-4 px-4 hidden md:table-cell">
                      <Skeleton className="h-5 w-32" />
                    </td>
                    <td className="py-4 px-4">
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Skeleton className="h-8 w-16 rounded-md" />
                        <Skeleton className="h-8 w-16 rounded-md" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
