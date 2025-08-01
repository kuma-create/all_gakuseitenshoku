// supabase/functions/handle-signup/index.ts
import { serve } from "https://deno.land/std/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Edge Function エントリポイント
serve(async (req: Request) => {
  // Webhook から送られてくる JSON を取得
  const { event, session } = await req.json()

  // サインアップ以外は無視
  if (event !== "SIGNED_UP" || !session?.user) {
    return new Response("ignored", { status: 200 })
  }

  // Signup 時に metadata.referral_code に載せたコードを取得
  const referralCode = session.user.user_metadata?.referral_code
  if (!referralCode) {
    return new Response("no referral", { status: 200 })
  }

  // Admin Client (Service Role) で DB にアクセス
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  )

  /* ---------- referral_codes 取得 ---------- */
  const { data: codeObj, error: codeErr } = await supabase
    .from("referral_codes")
    .select("id")
    .eq("code", referralCode)
    .single()

  if (codeErr || !codeObj) {
    console.error("referral code not found:", referralCode)
    return new Response("referral code not found", { status: 200 })
  }

  /* ---------- referral_uses へ INSERT ---------- */
  const { error: insertErr } = await supabase.from("referral_uses").insert({
    referral_code_id: codeObj.id,
    referred_user_id: session.user.id,
  })

  if (insertErr) {
    console.error("insert error:", insertErr)
    return new Response("insert error", { status: 500 })
  }

  return new Response("ok", { status: 200 })
})