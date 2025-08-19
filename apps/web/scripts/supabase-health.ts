// scripts/supabase-health.ts
import { createClient } from "@supabase/supabase-js"

/* ---------- 1) .env から読み込む ---------- */
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("環境変数が足りません")
  process.exit(1)
}
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
)

/* ---------- 2) 便利 assert ---------- */
function assert(cond: unknown, msg: string) {
  if (!cond) {
    console.error("❌", msg)
    process.exit(1)
  }
}

/* ---------- 3) 実際のチェック ---------- */
async function main() {
  // ◆ 公開求人が 1 件以上ある？
  const { count: jobsCnt, error: jobsErr } = await supabase
    .from("jobs")
    .select("id", { head: true, count: "exact" })
    .eq("published", true)
  assert(!jobsErr, jobsErr?.message ?? "")
  assert((jobsCnt ?? 0) > 0, "公開中の求人が 0 件です")

  // ◆ applications に job_id = NULL が無い？
  const { count: orphanCnt, error: oErr } = await supabase
    .from("applications")
    .select("id", { head: true, count: "exact" })
    .is("job_id", null)
  assert(!oErr, oErr?.message ?? "")
  assert((orphanCnt ?? 0) === 0, "applications に job_id NULL 行があります")

  // ◆ RPC がエラーなく呼べる？
  const { error: rpcErr } = await supabase.rpc("increment_job_view", {
    _job_id: "00000000-0000-0000-0000-000000000000",
  })
  assert(!rpcErr, `increment_job_view RPC 失敗: ${rpcErr?.message}`)

  console.log("✅ Supabase health-check OK!")
}
main()
