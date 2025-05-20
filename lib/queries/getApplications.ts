import { supabaseAdmin } from "@/lib/supabase/admin";

/** applications + jobs + companies をまとめて取得 (昇順:新→旧) */
export async function getApplications() {
  const { data, error } = await supabaseAdmin
    .from("applications")
    .select(`
      id,
      status,
      created_at,
      jobs:job_id (
        id,
        title,
        companies:company_id ( name )
      )
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as {
    id: string;
    status: string;
    created_at: string;
    jobs: {
      id: string;
      title: string | null;
      companies: { name: string | null } | null;
    } | null;
  }[];
}