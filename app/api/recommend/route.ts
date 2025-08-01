import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

interface SimilarJob {
  job_id: string;
  content: string;
  score: number;
}

interface JobSnippet {
  id: string;
  title: string;
  company: string;
  url: string;
  summary: string;
  score: number;
}

type MatchJobParams = {
  query_embedding: number[];
  match_count: number;
  similarity_threshold: number;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
const openai = new OpenAI();

export const runtime = "edge"; // optional

export async function POST(req: NextRequest) {
  const { candidateProfile, topK = 3 } = await req.json();

  // ❶ プロファイルを embedding
  const { data: [{ embedding: queryEmb }] } = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: candidateProfile, // 例: スキル・経験を羅列した文字列
    encoding_format: "float",
  });

  // ❷ 類似求人を取得（cosine 距離）
  let { data: sims } = (await supabase.rpc("match_job_embeddings", {
    query_embedding: queryEmb as number[],
    match_count: topK,
    similarity_threshold: 0.75,
  })) as { data: SimilarJob[] | null };

  // ヒットが無ければ閾値を緩めて再検索
  if (!sims || sims.length === 0) {
    const retry = (await supabase.rpc("match_job_embeddings", {
      query_embedding: queryEmb as number[],
      match_count: topK,
      similarity_threshold: 0.4,
    })) as { data: SimilarJob[] | null };
    sims = retry.data ?? [];

    if (!sims || sims.length === 0) {
      // ③ 閾値なしで再検索（最後の砦）
      const noThresh = (await supabase.rpc("match_job_embeddings", {
        query_embedding: queryEmb as number[],
        match_count: topK,
        similarity_threshold: 0.0, // 0.0 なら必ず上位 K 件返る
      })) as { data: SimilarJob[] | null };
      sims = noThresh.data ?? [];
    }
  }

  // data が null の場合に備えて空配列にする
  const results: SimilarJob[] = sims ?? [];

  // ❸ 関連求人のタイトルを取得し Snippet を生成
  const { data: titleRows } = await supabase
    .from("jobs")
    .select("id, title")
    .in("id", results.map((r) => r.job_id));

  const { data: jobMetaRows } = await supabase
    .from("jobs")
    .select("id, company_id, slug") // slug カラムがない場合は path を返すカラム名に合わせて下さい
    .in("id", results.map((r) => r.job_id));

  const { data: companyRows } = await supabase
    .from("companies")
    .select("id, name")
    .in(
      "id",
      (jobMetaRows ?? []).map((r) => r.company_id)
    );

  const companyMap = new Map((companyRows ?? []).map((r) => [r.id, r.name]));
  const metaMap = new Map(
    (jobMetaRows ?? []).map((r) => [r.id, { slug: r.slug, companyId: r.company_id }])
  );

  const titleMap = new Map((titleRows ?? []).map((r) => [r.id, r.title]));

  const snippets: JobSnippet[] = results.map((r) => {
    const meta = metaMap.get(r.job_id) ?? { slug: "", companyId: "" };
    const company = companyMap.get(meta.companyId) ?? "";
    return {
      id: r.job_id,
      title: titleMap.get(r.job_id) ?? "",
      company,
      url: `/jobs/${meta.slug || r.job_id}`, // slug があれば使う
      summary: r.content.slice(0, 600),
      score: r.score,
    };
  });

  console.log("[/api/recommend] snippets:", snippets.length, "profile len:", candidateProfile.length);

  return NextResponse.json({ jobs: snippets });
}