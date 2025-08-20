import dotenv from "dotenv";
dotenv.config({ path: ".env.local" }); // .env.local を明示的に読み込む
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
if (!process.env.SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is not set");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
}
if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set");
}
const openai = new OpenAI();

async function run() {
  // ❶ すべての求人を取得（重複は upsert が処理）
  const { data: jobs, error: jobsErr } = await supabase
    .from("jobs")
    .select("id, title, description, requirements");

  if (jobsErr) {
    throw jobsErr;
  }
  console.log("求人レコード数:", jobs?.length ?? 0);
  if (!jobs || jobs.length === 0) {
    console.warn("jobs テーブルにデータが無いか取得失敗の可能性があります。");
    return;
  }

  // ❷ OpenAI Embeddings 一括生成（最大 8192 tok / req）
  const texts = jobs.map(
    (j) =>
      `# ${j.title}\n\n${j.description ?? ""}\n\n## 要件\n${j.requirements ?? ""}`
  );

  const { data: embRes } = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: texts,
    encoding_format: "float",
  });
  console.log("生成した Embeddings 件数:", embRes.length);

  // ❸ Supabase upsert
  const rows = jobs.map((j, i) => ({
    job_id: j.id,
    content: texts[i],
    embedding: embRes[i].embedding,
  }));

  await supabase.from("job_embeddings").upsert(rows);
  console.log("Upsert 完了:", rows.length, "件");
}

run().catch(console.error);