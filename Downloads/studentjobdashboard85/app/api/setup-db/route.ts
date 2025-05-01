import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // 管理者権限チェック
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: userRole } = await supabase.from("user_roles").select("role").eq("id", user.id).single()

    if (!userRole || userRole.role !== "admin") {
      return NextResponse.json({ error: "Admin privileges required" }, { status: 403 })
    }

    // applicationsテーブルの作成
    const { error: createTableError } = await supabase.rpc("create_applications_table")

    if (createTableError) {
      console.error("Error creating applications table:", createTableError)
      return NextResponse.json({ error: createTableError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Database setup completed successfully" })
  } catch (error) {
    console.error("Error setting up database:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
