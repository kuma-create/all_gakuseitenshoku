"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Briefcase, Building, Calendar, ChevronRight, Clock, MapPin, User, Plus } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDate } from "@/lib/utils"

type CompanyDashboardClientProps = {
  user: any
  company: any
  jobs: any[]
  applications: any[]
}

export default function CompanyDashboardClient({ user, company, jobs, applications }: CompanyDashboardClientProps) {
  const [activeTab, setActiveTab] = useState("overview")

  return (
    <div className="container py-8">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">企業ダッシュボード</h1>
          <p className="text-muted-foreground">
            こんにちは、{company?.company_name || user?.email?.split("@")[0] || "ゲスト"}様。
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/company/jobs/create">
            <Button className="bg-red-600 hover:bg-red-700">
              <Plus className="mr-2 h-4 w-4" />
              新規求人作成
            </Button>
          </Link>
          <Link href="/company/profile">
            <Button variant="outline">企業情報編集</Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">概要</TabsTrigger>
          <TabsTrigger value="jobs">求人管理</TabsTrigger>
          <TabsTrigger value="applications">応募者管理</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">公開中の求人</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{jobs.filter((job) => job.is_active).length}</div>
                <p className="text-xs text-muted-foreground">全{jobs.length}件の求人</p>
              </CardContent>
              <CardFooter>
                <Link href="/company/jobs" className="w-full">
                  <Button variant="outline" className="w-full">
                    求人を管理
                  </Button>
                </Link>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">応募者数</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{applications.length}</div>
                <p className="text-xs text-muted-foreground">全ての応募</p>
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
                <Link href="/company/applications" className="w-full">
                  <Button variant="outline" className="w-full">
                    応募者を管理
                  </Button>
                </Link>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">企業情報</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-medium">{company?.company_name || "企業名未設定"}</div>
                <p className="text-xs text-muted-foreground">{company?.industry || "業種未設定"}</p>
              </CardContent>
              <CardFooter>
                <Link href="/company/profile" className="w-full">
                  <Button variant="outline" className="w-full">
                    企業情報を編集
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </div>

          <h2 className="mt-8 text-xl font-semibold">最近の応募者</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {applications.length > 0 ? (
              applications.slice(0, 4).map((application) => (
                <Link href={`/company/applications/${application.id}`} key={application.id}>
                  <Card className="cursor-pointer transition-shadow hover:shadow-md">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <div className="relative h-10 w-10 overflow-hidden rounded-md">
                          {application.student_profiles?.avatar_url ? (
                            <Image
                              src={application.student_profiles.avatar_url || "/placeholder.svg"}
                              alt={`${application.student_profiles.first_name || ""} ${
                                application.student_profiles.last_name || ""
                              }`}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gray-200 text-lg font-bold">
                              {application.student_profiles?.first_name?.charAt(0) || "?"}
                            </div>
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            {application.student_profiles?.first_name || ""}{" "}
                            {application.student_profiles?.last_name || ""}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {application.student_profiles?.university || "大学名未設定"}
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
                          <Briefcase className="h-3 w-3" />
                          {application.jobs?.job_title || "求人タイトル"}
                        </Badge>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <div className="flex w-full items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          <Clock className="mr-1 inline-block h-3 w-3" />
                          {formatDate(application.created_at)}に応募
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardFooter>
                  </Card>
                </Link>
              ))
            ) : (
              <div className="col-span-full rounded-lg border border-dashed p-8 text-center">
                <h3 className="mb-2 text-lg font-medium">応募者がいません</h3>
                <p className="mb-4 text-sm text-muted-foreground">求人を公開して、学生からの応募を待ちましょう</p>
                <Link href="/company/jobs/create">
                  <Button className="bg-red-600 hover:bg-red-700">
                    <Plus className="mr-2 h-4 w-4" />
                    新規求人作成
                  </Button>
                </Link>
              </div>
            )}
          </div>
          {applications.length > 0 && (
            <div className="mt-4 flex justify-center">
              <Link href="/company/applications">
                <Button variant="outline">すべての応募者を見る</Button>
              </Link>
            </div>
          )}
        </TabsContent>

        <TabsContent value="jobs" className="space-y-4">
          <div className="flex justify-between">
            <h2 className="text-xl font-semibold">求人管理</h2>
            <Link href="/company/jobs/create">
              <Button className="bg-red-600 hover:bg-red-700">
                <Plus className="mr-2 h-4 w-4" />
                新規求人作成
              </Button>
            </Link>
          </div>
          {jobs.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job) => (
                <Link href={`/company/jobs/${job.id}`} key={job.id}>
                  <Card className="cursor-pointer transition-shadow hover:shadow-md">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{job.title}</CardTitle>
                        <Badge variant={job.is_active ? "default" : "secondary"}>
                          {job.is_active ? "公開中" : "非公開"}
                        </Badge>
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
                        {job.job_type && (
                          <Badge variant="outline" className="text-xs">
                            {job.job_type}
                          </Badge>
                        )}
                        {job.salary_range && (
                          <Badge variant="outline" className="text-xs">
                            {job.salary_range}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-2">
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {job.description?.substring(0, 100)}...
                        </p>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <div className="flex w-full items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          <Calendar className="mr-1 inline-block h-3 w-3" />
                          {formatDate(job.created_at)}に作成
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
              <h3 className="mb-2 text-lg font-medium">求人がありません</h3>
              <p className="mb-4 text-sm text-muted-foreground">新しい求人を作成して、優秀な学生を募集しましょう</p>
              <Link href="/company/jobs/create">
                <Button className="bg-red-600 hover:bg-red-700">
                  <Plus className="mr-2 h-4 w-4" />
                  新規求人作成
                </Button>
              </Link>
            </div>
          )}
          {jobs.length > 0 && (
            <div className="mt-4 flex justify-center">
              <Link href="/company/jobs">
                <Button variant="outline">すべての求人を管理</Button>
              </Link>
            </div>
          )}
        </TabsContent>

        <TabsContent value="applications" className="space-y-4">
          <h2 className="text-xl font-semibold">応募者管理</h2>
          {applications.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {applications.map((application) => (
                <Link href={`/company/applications/${application.id}`} key={application.id}>
                  <Card className="cursor-pointer transition-shadow hover:shadow-md">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <div className="relative h-10 w-10 overflow-hidden rounded-md">
                          {application.student_profiles?.avatar_url ? (
                            <Image
                              src={application.student_profiles.avatar_url || "/placeholder.svg"}
                              alt={`${application.student_profiles.first_name || ""} ${
                                application.student_profiles.last_name || ""
                              }`}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gray-200 text-lg font-bold">
                              {application.student_profiles?.first_name?.charAt(0) || "?"}
                            </div>
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            {application.student_profiles?.first_name || ""}{" "}
                            {application.student_profiles?.last_name || ""}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {application.student_profiles?.university || "大学名未設定"}
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
                          <Briefcase className="h-3 w-3" />
                          {application.jobs?.job_title || "求人タイトル"}
                        </Badge>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <div className="flex w-full items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          <Clock className="mr-1 inline-block h-3 w-3" />
                          {formatDate(application.created_at)}に応募
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
              <h3 className="mb-2 text-lg font-medium">応募者がいません</h3>
              <p className="mb-4 text-sm text-muted-foreground">求人を公開して、学生からの応募を待ちましょう</p>
              <Link href="/company/jobs/create">
                <Button className="bg-red-600 hover:bg-red-700">
                  <Plus className="mr-2 h-4 w-4" />
                  新規求人作成
                </Button>
              </Link>
            </div>
          )}
          {applications.length > 0 && (
            <div className="mt-4 flex justify-center">
              <Link href="/company/applications">
                <Button variant="outline">すべての応募者を見る</Button>
              </Link>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
