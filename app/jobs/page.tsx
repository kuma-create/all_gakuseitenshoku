/* ────────────────────────────────────────────────
   app/jobs/page.tsx  ― 公開中求人一覧 (Client Component)
──────────────────────────────────────────────── */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

type JobRow = Pick<
  Database["public"]["Tables"]["jobs"]["Row"],
  "id" | "title"
>;

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title")
        .eq("published", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("jobs fetch error", error);
        setError("求人取得に失敗しました");
      } else {
        setJobs(data ?? []);
      }
      setLoading(false);
    })();
  }, []);

  /* ------- UI ------- */
  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        読み込み中…
      </div>
    );
  }

  if (error) {
    return (
      <main className="container py-8">
        <p className="text-destructive">{error}</p>
      </main>
    );
  }

  if (!jobs.length) {
    return (
      <main className="container py-8">
        <p>現在公開中の求人はありません。</p>
      </main>
    );
  }

  return (
    <main className="container py-8 space-y-4">
      <h1 className="text-2xl font-bold">求人一覧</h1>
      <ul className="space-y-3">
        {jobs.map((j) => (
          <li key={j.id}>
            <Link
              href={`/jobs/${j.id}`}
              className="block rounded border p-4 hover:bg-muted/50"
            >
              {j.title}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
