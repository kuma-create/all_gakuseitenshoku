"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Briefcase, Calendar, ChevronRight, Clock, MapPin, User } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDate, formatCurrency } from "@/lib/utils"

type DashboardClientProps = {
  user: any
  userRole: string
  profile: any
  applications: any[]
  savedJobs: any[]
  recommendedJobs: any[]
}

export default function DashboardClient({
  user,
  userRole,
  profile,
  applications,
  savedJobs,
  recommendedJobs,
}: DashboardClientProps) {
  const [activeTab, setActiveTab] = useState("overview")

  // プロフィール完成度を計算
  const calculateProfileCompletion = () => {
    if (!profile) return 0

    const fields = [
      profile.first_name,
      profile.last_name,
      profile.university,
      profile.major,
      profile.graduation_year,
      profile.skills,
      profile.bio,
      profile.avatar_url,
      profile.resume_url,
    ]

    const filledFields = fields.filter((field) => field !== null && field !== undefined && field !== "").length
    return Math.round((filledFields / fields.length) * 100)
  }

  const profileCompletion = calculateProfileCompletion()

  return (
    <div className="container py-8">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ダッシュボード</h1>
          <p className="text-muted-foreground">
            こんにちは、
            {profile?.first_name
              ? `${profile.first_name} ${profile.last_name || ""}さん`
              : user?.email?.split("@")[0] || "ゲスト"}
            。今日も就活を頑張りましょう！
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/jobs">
            <Button className="bg-red-600 hover:bg-red-700">求人を探す</Button>
          </Link>
          <Link href="/profile">
            <Button variant="outline">プロフィール編集</Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">概要</TabsTrigger>
          <TabsTrigger value="applications">応募履歴</TabsTrigger>
          <TabsTrigger value="saved">保存した求人</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">プロフィール完成度</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{profileCompletion}%</div>
                <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                  <div className="h-2 rounded-full bg-red-600" style={{ width: `${profileCompletion}%` }}></div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  プロフィールを完成させて、企業からのスカウトを受け取りましょう
                </p>
              </CardContent>
              <CardFooter>
                <Link href="/profile" className="w-full">
                  <Button variant="outline" className="w-full">
                    プロフィールを編集
                  </Button>
                </Link>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">応募状況</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{applications.length}</div>
                <p className="text-xs text-muted-foreground">応募中の求人</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-muted p-2 text-center">
                    <div className="text-lg font-medium">
                      {applications.filter((app) => app.status === "pending").length}
                    </div>
                    <p className="text-xs text-muted-foreground">選考中</p>
                  </div>
                  <div className="rounded-lg bg-muted p-2 text-center">
                    <div className="text-lg font-medium">
                      {applications.filter((app) => app.status === "interview").length}
                    </div>
                    <p className="text-xs text-muted-foreground">面接確定</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Link href="/applications" className="w-full">
                  <Button variant="outline" className="w-full">
                    応募履歴を見る
                  </Button>
                </Link>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">保存した求人</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{savedJobs.length}</div>
                <p className="text-xs text-muted-foreground">後で確認する求人</p>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" onClick={() => setActiveTab("saved")}>
                  保存した求人を見る
                </Button>
              </CardFooter>
            </Card>
          </div>

          <h2 className="mt-8 text-xl font-semibold">おすすめ求人</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recommendedJobs.length > 0 ? (
              recommendedJobs.slice(0, 3).map((job) => (
                <Link href={`/jobs/${job.id}`} key={job.id}>
                  <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <div className="relative h-10 w-10 overflow-hidden rounded-md">
                          {job.companies?.logo_url ? (
                            <Image
                              src={job.companies.logo_url || "/placeholder.svg"}
                              alt={job.companies.company_name || "企業ロゴ"}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gray-200 text-lg font-bold">
                              {job.companies?.company_name?.charAt(0) || "?"}
                            </div>
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-base">{job.job_title}</CardTitle>
                          <CardDescription className="text-xs">{job.companies?.company_name}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="flex flex-wrap gap-1">
                        {job.location && (
                          <Badge variant="outline" className="flex items-center gap-1 text-xs">
                            <MapPin className="h-3 w-3" />
                            {job.location}
                          </Badge>
                        )}
                        {job.salary_min && job.salary_max && (
                          <Badge variant="outline" className="text-xs">
                            {formatCurrency(job.salary_min)}〜{formatCurrency(job.salary_max)}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <div className="flex w-full items-center justify-between">
                        <span className="text-xs text-muted-foreground">詳細を見る</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardFooter>
                  </Card>
                </Link>
              ))
            ) : (
              <div className="col-span-full rounded-lg border border-dashed p-8 text-center">
                <h3 className="mb-2 text-lg font-medium">おすすめ求人がありません</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  プロフィールを完成させると、あなたに合った求人をおすすめします
                </p>
                <Link href="/jobs">
                  <Button className="bg-red-600 hover:bg-red-700">求人を探す</Button>
                </Link>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="applications" className="space-y-4">
          <h2 className="text-xl font-semibold">応募履歴</h2>
          {applications.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {applications.map((application) => (
                <Link href={`/applications/${application.id}`} key={application.id}>
                  <Card className="cursor-pointer transition-shadow hover:shadow-md">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <div className="relative h-10 w-10 overflow-hidden rounded-md">
                          {application.jobs?.companies?.logo_url ? (
                            <Image
                              src={application.jobs.companies.logo_url || "/placeholder.svg"}
                              alt={application.jobs.companies.company_name || "企業ロゴ"}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gray-200 text-lg font-bold">
                              {application.jobs?.companies?.company_name?.charAt(0) || "?"}
                            </div>
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-base">{application.jobs?.job_title}</CardTitle>
                          <CardDescription className="text-xs">
                            {application.jobs?.companies?.company_name}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="flex flex-wrap gap-2">
                        <Badge
                          className={`${
                            application.status === "accepted"
                              ? "bg-green-100 text-green-800"
                              : application.status === "rejected"
                                ? "bg-red-100 text-red-800"
                                : application.status === "interview"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {application.status === "pending"
                            ? "選考中"
                            : application.status === "interview"
                              ? "面接確定"
                              : application.status === "accepted"
                                ? "内定"
                                : application.status === "rejected"
                                  ? "不採用"
                                  : application.status}
                        </Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(application.created_at)}
                        </Badge>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <div className="flex w-full items-center justify-between">
                        <span className="text-xs text-muted-foreground">詳細を見る</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <h3 className="mb-2 text-lg font-medium">応募履歴がありません</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                興味のある求人に応募して、キャリアの第一歩を踏み出しましょう
              </p>
              <Link href="/jobs">
                <Button className="bg-red-600 hover:bg-red-700">求人を探す</Button>
              </Link>
            </div>
          )}
          {applications.length > 0 && (
            <div className="mt-4 flex justify-center">
              <Link href="/applications">
                <Button variant="outline">すべての応募履歴を見る</Button>
              </Link>
            </div>
          )}
        </TabsContent>

        <TabsContent value="saved" className="space-y-4">
          <h2 className="text-xl font-semibold">保存した求人</h2>
          {savedJobs.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {savedJobs.map((saved) => (
                <Link href={`/jobs/${saved.job_id}`} key={saved.id}>
                  <Card className="cursor-pointer transition-shadow hover:shadow-md">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <div className="relative h-10 w-10 overflow-hidden rounded-md">
                          {saved.jobs?.companies?.logo_url ? (
                            <Image
                              src={saved.jobs.companies.logo_url || "/placeholder.svg"}
                              alt={saved.jobs.companies.company_name || "企業ロゴ"}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gray-200 text-lg font-bold">
                              {saved.jobs?.companies?.company_name?.charAt(0) || "?"}
                            </div>
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-base">{saved.jobs?.job_title}</CardTitle>
                          <CardDescription className="text-xs">{saved.jobs?.companies?.company_name}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="flex flex-wrap gap-1">
                        {saved.jobs?.location && (
                          <Badge variant="outline" className="flex items-center gap-1 text-xs">
                            <MapPin className="h-3 w-3" />
                            {saved.jobs.location}
                          </Badge>
                        )}
                        {saved.jobs?.salary_min && saved.jobs?.salary_max && (
                          <Badge variant="outline" className="text-xs">
                            {formatCurrency(saved.jobs.salary_min)}〜{formatCurrency(saved.jobs.salary_max)}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <div className="flex w-full items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          <Clock className="mr-1 inline-block h-3 w-3" />
                          {formatDate(saved.created_at)}に保存
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <h3 className="mb-2 text-lg font-medium">保存した求人がありません</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                興味のある求人を保存して、後で確認できるようにしましょう
              </p>
              <Link href="/jobs">
                <Button className="bg-red-600 hover:bg-red-700">求人を探す</Button>
              </Link>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
