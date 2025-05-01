import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { formatDate } from "@/lib/utils"
import { Briefcase, MapPin, Calendar, Building, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  // 求人詳細を取得
  const { data: job, error } = await supabase
    .from("job_postings")
    .select(`
      *,
      companies (*)
    `)
    .eq("id", params.id)
    .single()

  if (error || !job) {
    notFound()
  }

  return (
    <div className="container py-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <div className="relative h-16 w-16 overflow-hidden rounded-lg">
            {job.companies?.logo_url ? (
              <Image
                src={job.companies.logo_url || "/placeholder.svg"}
                alt={job.companies.name || "企業ロゴ"}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gray-200 text-2xl font-bold">
                {job.companies?.name?.charAt(0) || "?"}
              </div>
            )}
          </div>

          <div>
            <h1 className="text-3xl font-bold tracking-tight">{job.title}</h1>
            <p className="text-xl text-muted-foreground">{job.companies?.name}</p>

            <div className="mt-2 flex flex-wrap gap-2">
              {job.location && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {job.location}
                </Badge>
              )}
              {job.job_type && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  {job.job_type}
                </Badge>
              )}
              {job.salary_range && <Badge variant="outline">{job.salary_range}</Badge>}
              <Badge variant="outline" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(job.created_at)}に投稿
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Link href={`/jobs/${job.id}/apply`}>
            <Button className="bg-red-600 hover:bg-red-700">応募する</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>職務内容</CardTitle>
            </CardHeader>
            <CardContent className="prose max-w-none">
              <div className="whitespace-pre-wrap">{job.description}</div>
            </CardContent>
          </Card>

          {job.requirements && (
            <Card>
              <CardHeader>
                <CardTitle>応募要件</CardTitle>
              </CardHeader>
              <CardContent className="prose max-w-none">
                <div className="whitespace-pre-wrap">{job.requirements}</div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>企業情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span>{job.companies?.name || "情報なし"}</span>
              </div>

              {job.companies?.industry && (
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span>{job.companies.industry}</span>
                </div>
              )}

              {job.companies?.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{job.companies.location}</span>
                </div>
              )}

              {job.application_deadline && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>応募締切: {formatDate(job.application_deadline)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>応募方法</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm">下記のボタンから応募フォームに進み、必要事項を入力してください。</p>
              <Link href={`/jobs/${job.id}/apply`} className="w-full">
                <Button className="w-full bg-red-600 hover:bg-red-700">この求人に応募する</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
