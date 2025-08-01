"use client";
import { useState } from "react";
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import JobSnippetCard from "@/components/JobSnippetCard"
import { Loader2 } from "lucide-react"

type JobSnippet = {
  id: string;
  title: string;
  company: string;
  url: string;
  summary: string;
  score: number;
};

export default function JobsAdvisorInline() {
  const [profile, setProfile] = useState("");
  const [result, setResult] = useState<{
    aiReply: string;
    jobs: JobSnippet[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    if (!profile.trim()) return;
    setLoading(true);

    try {
      // ① 類似求人を取得
      const { jobs } = await fetch("/api/recommend", {
        method: "POST",
        body: JSON.stringify({ candidateProfile: profile }),
      }).then((r) => r.json() as Promise<{ jobs: JobSnippet[] }>);

      // ② GPT で提案文生成
      const aiReply = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [], // 履歴があればここに入れる
          candidate: { profile }, // name フィールドが必要なら追加
          jobs,
        }),
      }).then((r) => r.json() as Promise<string>);

      setResult({ aiReply, jobs });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <textarea
        className="w-full border p-3 rounded-lg"
        rows={6}
        placeholder="あなたのスキル・経験・希望条件を入力してください"
        value={profile}
        onChange={(e) => setProfile(e.target.value)}
      />
      <button
        onClick={run}
        disabled={loading}
        className="px-8 py-2 rounded-full text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? "生成中…" : "AI におすすめを聞く"}
      </button>

      {result && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">AI 提案</h2>
          <div className="prose prose-neutral whitespace-pre-wrap">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {result.aiReply}
            </ReactMarkdown>
          </div>

          <h3 className="text-lg font-medium mt-6">類似求人</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {result.jobs.map((job) => (
              <JobSnippetCard key={job.id} job={job} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}