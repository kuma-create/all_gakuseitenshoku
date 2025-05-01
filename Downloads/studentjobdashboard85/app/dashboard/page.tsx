import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import DashboardClient from "./dashboard-client"
import CompanyDashboardClient from "./company-dashboard-client"
import { cookies } from "next/headers"

export const revalidate = 0
export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  // サーバーサイドのSupabaseクライアントを作成
  const supabase = createClient()


  try {
    // ユーザー認証チェック
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // セッションがない場合はログインページにリダイレクト
    if (!session) {
      redirect("/auth/signin?redirect=/dashboard")
    }

    const user = session.user

    // ユーザーロールを取得
    const { data: userRole, error: roleError } = await supabase
      .from("user_roles")
      .select("role, is_approved")
      .eq("id", user.id)
      .single()

    if (roleError && roleError.code !== "PGRST116") {
      console.error("Error fetching user role:", roleError)
    }

    // 企業アカウントの場合
    if (userRole?.role === "company") {
      // 承認されていない場合は保留ページにリダイレクト
      if (userRole.is_approved === false) {
        redirect("/company/pending")
      }

      // 求人情報を取得
      const { data: jobs, error: jobsError } = await supabase
        .from("job_postings")
        .select("*")
        .eq("company_id", user.id)
        .order("created_at", { ascending: false })

      if (jobsError) {
        console.error("Error fetching jobs:", jobsError)
      }

      // 応募情報を取得
      const { data: applications, error: applicationsError } = await supabase
        .from("applications")
        .select(`
          id,
          status,
          created_at,
          student_id,
          student_profiles (
            id,
            first_name,
            last_name,
            university,
            graduation_year,
            avatar_url
          ),
          job_id,
          job_postings:job_id ( 
            id,
            title
          )
        `)
        .in("job_id", jobs?.map((job) => job.id) || [])
        .order("created_at", { ascending: false })

      if (applicationsError) {
        console.error("Error fetching applications:", applicationsError)
      }

      // アプリケーションデータを変換
      const transformedApplications =
        applications?.map((app) => ({
          ...app,
          jobs: {
            id: app.job_postings?.id,
            job_title: app.job_postings?.title,
          },
        })) || []

      // 企業情報を設定
      const company = {
        id: user.id,
        company_name: user.email?.split("@")[0] || "企業名未設定",
        email: user.email,
        is_approved: userRole?.is_approved,
        industry: null,
        company_size: null,
        founded_year: null,
        location: null,
        description: null,
        website_url: null,
        logo_url: null,
      }

      return (
        <CompanyDashboardClient
          user={user}
          company={company}
          jobs={jobs || []}
          applications={transformedApplications}
        />
      )
    }

    // 学生ダッシュボードの処理
    // 学生プロフィールを取得
    const { data: profile, error: profileError } = await supabase
      .from("student_profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (profileError && profileError.code !== "PGRST116") {
      console.error("Error fetching profile:", profileError)
    }

    // 応募履歴を取得
    const { data: applications, error: applicationsError } = await supabase
      .from("applications")
      .select(`
        id,
        status,
        created_at,
        job_id,
        job_postings:job_id (
          id,
          title,
          company_id,
          companies:company_id (
            id,
            name,
            logo_url
          )
        )
      `)
      .eq("student_id", user.id)
      .order("created_at", { ascending: false })

    if (applicationsError) {
      console.error("Error fetching applications:", applicationsError)
    }

    // アプリケーションデータを変換
    const transformedApplications =
      applications?.map((app) => ({
        ...app,
        jobs: {
          id: app.job_postings?.id,
          job_title: app.job_postings?.title,
          companies: {
            id: app.job_postings?.companies?.id,
            company_name: app.job_postings?.companies?.name,
            logo_url: app.job_postings?.companies?.logo_url,
          },
        },
      })) || []

    // 保存済み求人を取得
    const { data: savedJobs, error: savedJobsError } = await supabase
      .from("saved_jobs")
      .select(`
        id,
        created_at,
        job_id,
        job_postings:job_id (
          id,
          title,
          location,
          salary_range,
          company_id,
          companies:company_id (
            id,
            name,
            logo_url
          )
        )
      `)
      .eq("student_id", user.id)
      .order("created_at", { ascending: false })

    if (savedJobsError) {
      console.error("Error fetching saved jobs:", savedJobsError)
    }

    // 保存済み求人データを変換
    const transformedSavedJobs =
      savedJobs?.map((job) => ({
        ...job,
        jobs: {
          id: job.job_postings?.id,
          job_title: job.job_postings?.title,
          location: job.job_postings?.location,
          salary_min: job.job_postings?.salary_range?.split("〜")[0] || 0,
          salary_max: job.job_postings?.salary_range?.split("〜")[1] || 0,
          companies: {
            id: job.job_postings?.companies?.id,
            company_name: job.job_postings?.companies?.name,
            logo_url: job.job_postings?.companies?.logo_url,
          },
        },
      })) || []

    // おすすめ求人を取得
    const { data: recommendedJobs, error: recommendedJobsError } = await supabase
      .from("job_postings")
      .select(`
        id,
        title,
        location,
        salary_range,
        company_id,
        companies:company_id (
          id,
          name,
          logo_url
        )
      `)
      .eq("is_active", true)
      .limit(5)

    if (recommendedJobsError) {
      console.error("Error fetching recommended jobs:", recommendedJobsError)
    }

    // おすすめ求人データを変換
    const transformedRecommendedJobs =
      recommendedJobs?.map((job) => ({
        id: job.id,
        job_title: job.title,
        location: job.location,
        salary_min: job.salary_range?.split("〜")[0] || 0,
        salary_max: job.salary_range?.split("〜")[1] || 0,
        companies: {
          id: job.companies?.id,
          company_name: job.companies?.name,
          logo_url: job.companies?.logo_url,
        },
      })) || []

    return (
      <DashboardClient
        user={user}
        userRole={userRole?.role || "student"}
        profile={profile || null}
        applications={transformedApplications}
        savedJobs={transformedSavedJobs}
        recommendedJobs={transformedRecommendedJobs}
      />
    )
  } catch (error) {
    console.error("Dashboard error:", error)
    // エラーページを表示
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">エラーが発生しました</h1>
        <p className="mb-6">ダッシュボードの読み込み中にエラーが発生しました。</p>
        <a
          href="/auth/signin?redirect=/dashboard"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          ログインページに戻る
        </a>
      </div>
    )
  }
}
