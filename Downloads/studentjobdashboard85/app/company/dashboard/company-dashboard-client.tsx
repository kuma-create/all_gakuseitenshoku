"use client"

import type { User } from "@supabase/supabase-js"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlusCircle, FileText, Users, Building, Mail } from "lucide-react"

interface CompanyDashboardClientProps {
  user: User
  company: any
  jobPostings: any[]
  applications: any[]
}

export default function CompanyDashboardClient({
  user,
  company,
  jobPostings,
  applications,
}: CompanyDashboardClientProps) {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">企業ダッシュボード</h1>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">求人数</CardTitle>
            <CardDescription>公開中の求人数</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{jobPostings.length}</p>
          </CardContent>
          <CardFooter>
            <Link href="/company/jobs/create" passHref>
              <Button variant="outline" size="sm" className="w-full">
                <PlusCircle className="h-4 w-4 mr-2" />
                新規求人作成
              </Button>
            </Link>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">応募者数</CardTitle>
            <CardDescription>全ての応募者数</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{applications.length}</p>
          </CardContent>
          <CardFooter>
            <Link href="/company/applications" passHref>
              <Button variant="outline" size="sm" className="w-full">
                <Users className="h-4 w-4 mr-2" />
                応募者一覧
              </Button>
            </Link>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">企業情報</CardTitle>
            <CardDescription>企業プロフィール</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-medium truncate">{company.name}</p>
          </CardContent>
          <CardFooter>
            <Link href="/company/profile" passHref>
              <Button variant="outline" size="sm" className="w-full">
                <Building className="h-4 w-4 mr-2" />
                企業情報編集
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>

      <Tabs defaultValue="jobs" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="jobs">求人管理</TabsTrigger>
          <TabsTrigger value="applications">最近の応募</TabsTrigger>
        </TabsList>
        <TabsContent value="jobs">
          <Card>
            <CardHeader>
              <CardTitle>求人一覧</CardTitle>
              <CardDescription>公開中の求人情報</CardDescription>
            </CardHeader>
            <CardContent>
              {jobPostings.length > 0 ? (
                <div className="space-y-4">
                  {jobPostings.slice(0, 5).map((job) => (
                    <div key={job.id} className="border rounded-lg p-4">
                      <h3 className="font-medium">{job.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">{job.location}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm">
                          応募数: {applications.filter((app) => app.job_id === job.id).length}
                        </span>
                        <Link href={`/company/jobs/${job.id}`} passHref>
                          <Button variant="outline" size="sm">
                            詳細
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">求人がありません</h3>
                  <p className="text-gray-500 mb-4">新しい求人を作成して、優秀な人材を募集しましょう。</p>
                  <Link href="/company/jobs/create" passHref>
                    <Button>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      求人を作成する
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
            {jobPostings.length > 5 && (
              <CardFooter>
                <Link href="/company/jobs" passHref>
                  <Button variant="outline" className="w-full">
                    すべての求人を表示
                  </Button>
                </Link>
              </CardFooter>
            )}
          </Card>
        </TabsContent>
        <TabsContent value="applications">
          <Card>
            <CardHeader>
              <CardTitle>最近の応募</CardTitle>
              <CardDescription>最近の応募者一覧</CardDescription>
            </CardHeader>
            <CardContent>
              {applications.length > 0 ? (
                <div className="space-y-4">
                  {applications.slice(0, 5).map((application) => (
                    <div key={application.id} className="border rounded-lg p-4">
                      <div className="flex justify-between">
                        <h3 className="font-medium">{application.profiles?.full_name || "応募者"}</h3>
                        <span className="text-sm text-gray-500">
                          {new Date(application.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{application.job_postings?.title || "求人タイトル"}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            application.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : application.status === "accepted"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {application.status === "pending"
                            ? "検討中"
                            : application.status === "accepted"
                              ? "採用"
                              : "不採用"}
                        </span>
                        <Link href={`/company/applications/${application.id}`} passHref>
                          <Button variant="outline" size="sm">
                            詳細
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">応募がありません</h3>
                  <p className="text-gray-500">まだ応募者がいません。求人を公開して応募を待ちましょう。</p>
                </div>
              )}
            </CardContent>
            {applications.length > 5 && (
              <CardFooter>
                <Link href="/company/applications" passHref>
                  <Button variant="outline" className="w-full">
                    すべての応募を表示
                  </Button>
                </Link>
              </CardFooter>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>クイックアクション</CardTitle>
            <CardDescription>よく使う機能へのショートカット</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/company/jobs/create" passHref>
                <Button variant="outline" className="w-full h-full py-6 flex flex-col items-center justify-center">
                  <PlusCircle className="h-6 w-6 mb-2" />
                  <span>新規求人作成</span>
                </Button>
              </Link>
              <Link href="/company/applications" passHref>
                <Button variant="outline" className="w-full h-full py-6 flex flex-col items-center justify-center">
                  <Users className="h-6 w-6 mb-2" />
                  <span>応募者管理</span>
                </Button>
              </Link>
              <Link href="/company/messages" passHref>
                <Button variant="outline" className="w-full h-full py-6 flex flex-col items-center justify-center">
                  <Mail className="h-6 w-6 mb-2" />
                  <span>メッセージ</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
