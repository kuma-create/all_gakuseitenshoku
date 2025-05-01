import { createClient } from "@supabase/supabase-js"

// ====================
// Supabase設定
// ====================
const supabaseUrl = "https://uqozoogfuyjtkhmtmxdj.supabase.co" // あなたのSupabase URL
const serviceRoleKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxb3pvb2dmdXlqdGtobXRteGRqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTgyNzcwOSwiZXhwIjoyMDYxNDAzNzA5fQ.FaX6b0wyElvpgyyLlxF-S52IB79i5mRU63uS8F5lkOY" // あなたのService Roleキー

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// ====================
// ダミー作成設定
// ====================

const numberOfUsers = 10
const dummyPassword = "password1234"

const positions = ["採用担当", "人事部", "リクルーター", "HRスペシャリスト", "採用マネージャー"]

async function createDummyCompanyUsers() {
  console.log("✅ ダミー企業ユーザー作成を開始します...")

  const { data: companies, error: companyError } = await supabase.from("companies").select("id")

  if (companyError || !companies || companies.length === 0) {
    console.error("❌ companiesテーブルからデータ取得失敗", companyError)
    return
  }

  console.log(`✅ 取得した企業数: ${companies.length}`)

  for (let i = 0; i < numberOfUsers; i++) {
    const uniqueSuffix = Math.random().toString(36).substring(2, 8) // ⭐ ランダムな文字列を追加
    const email = `dummy-company-${i + 1}-${uniqueSuffix}@example.com`
    const password = dummyPassword

    const randomCompany = companies[Math.floor(Math.random() * companies.length)]

    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError || !authUser.user) {
      console.error(`❌ ${email} 登録失敗:`, authError)
      continue
    }

    const userId = authUser.user.id
    const companyId = randomCompany.id
    const position = positions[Math.floor(Math.random() * positions.length)]

    console.log(`✅ 登録成功: ${email} (user_id: ${userId})`)

    // user_rolesに存在チェックして登録
    const { data: existingRole, error: selectRoleError } = await supabase
      .from("user_roles")
      .select("id")
      .eq("id", userId)
      .maybeSingle()

    if (selectRoleError) {
      console.error(`❌ user_roles検索失敗: ${email}`, selectRoleError)
      continue
    }

    if (!existingRole) {
      const { error: roleInsertError } = await supabase.from("user_roles").insert([
        {
          id: userId,
          role: "company",
          is_approved: true,
        },
      ])
      if (roleInsertError) {
        console.error(`❌ user_roles登録失敗: ${email}`, roleInsertError)
      } else {
        console.log(`✅ user_roles登録成功: ${email}`)
      }
    } else {
      console.log(`ℹ️ user_rolesは既に存在: ${email}`)
    }

    // company_usersに登録
    const { error: companyUserError } = await supabase.from("company_users").insert([
      {
        id: crypto.randomUUID(),
        user_id: userId,
        company_id: companyId,
        position: position,
      },
    ])

    if (companyUserError) {
      console.error(`❌ company_users登録失敗: ${email}`, companyUserError)
    } else {
      console.log(`✅ company_users登録成功: ${email}`)
    }
  }

  console.log("✅ ダミー企業ユーザー作成がすべて完了しました！")
}

createDummyCompanyUsers()
