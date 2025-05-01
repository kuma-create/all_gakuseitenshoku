import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  // CORS対応
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { email, password, fullName, companyId, companyName, userRole } = await req.json()

    // 必須パラメータのチェック
    if (!email || !password || !fullName || !companyId || !companyName) {
      return new Response(JSON.stringify({ error: "必須パラメータが不足しています" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      })
    }

    // Supabaseクライアントの初期化
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    )

    // 1. ユーザーを作成
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        company_name: companyName,
      },
    })

    if (userError) {
      throw new Error(`ユーザーの作成に失敗しました: ${userError.message}`)
    }

    // 2. ユーザーロールを設定
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert([
      {
        id: userData.user.id,
        role: "company",
        is_approved: true,
      },
    ])

    if (roleError) {
      throw new Error(`ユーザーロールの設定に失敗しました: ${roleError.message}`)
    }

    // 3. 企業とユーザーを関連付け
    const { error: linkError } = await supabaseAdmin.from("company_users").insert([
      {
        user_id: userData.user.id,
        company_id: companyId,
        role: userRole || "member",
      },
    ])

    if (linkError) {
      throw new Error(`企業とユーザーの関連付けに失敗しました: ${linkError.message}`)
    }

    return new Response(JSON.stringify({ success: true, userId: userData.user.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }
})
