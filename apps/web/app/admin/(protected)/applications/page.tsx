

/* ------------------------------------------------------------------
   /admin/applications  –  Application list for admin users
   サーバーコンポーネントで Supabase (service key) から直接取得して描画
------------------------------------------------------------------- */
import { supabaseAdmin } from "@/lib/supabase/admin";
import dayjs              from "dayjs";

export const runtime   = "nodejs";          // service key を使うため
export const dynamic   = "force-dynamic";   // 毎リクエスト再取得（任意）
export const revalidate = 0;                // 0 = キャッシュしない

type Application = {
  id: string;
  status: string;
  created_at: string;
  jobs: {
    id: string;
    title: string | null;
    companies: { name: string | null } | null;
  } | null;
};

export default async function ApplicationsPage() {
  /* ---------- fetch ------------------------------------------------ */
  const { data, error } = await supabaseAdmin
    .from("applications")
    .select(`
      id,
      status,
      created_at,
      jobs:job_id (
        id,
        title,
        companies:company_id (
          name
        )
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    // Next.js は throw で自動的に error.tsx へフォールバック
    throw new Error(`applications fetch failed: ${error.message}`);
  }

  const apps = (data ?? []) as Application[];

  /* ---------- view ------------------------------------------------- */
  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Applications</h1>

      <div className="overflow-x-auto rounded border">
        <table className="min-w-[640px] w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr className="text-left">
              <th className="px-4 py-2">Company</th>
              <th className="px-4 py-2">Job</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Applied</th>
            </tr>
          </thead>

          <tbody>
            {apps.map((a) => (
              <tr key={a.id} className="border-t last:border-b">
                <td className="px-4 py-2">
                  {a.jobs?.companies?.name ?? <span className="text-gray-400">—</span>}
                </td>
                <td className="px-4 py-2">{a.jobs?.title ?? "—"}</td>
                <td className="px-4 py-2">{a.status}</td>
                <td className="px-4 py-2">
                  {dayjs(a.created_at).format("YYYY/MM/DD")}
                </td>
              </tr>
            ))}

            {apps.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                  No applications found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}