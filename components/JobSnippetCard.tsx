// components/JobSnippetCard.tsx
"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type JobSnippet = {
  id: string;
  title: string;
  company: string;
  url: string;
  summary: string;
  score: number;
  imageUrl?: string; // 追加: カード用のサムネイル画像
};

export default function JobSnippetCard({ job }: { job: JobSnippet }) {
  return (
    <a
      href={job.url}
      target="_blank"
      className="block border rounded-lg p-4 hover:shadow-md transition"
    >
      {job.imageUrl && (
        <img
          src={job.imageUrl}
          alt={job.title}
          className="w-full h-40 object-cover rounded-md mb-3"
        />
      )}
      <h3 className="font-semibold text-lg md:text-xl mb-1">{job.title}</h3>
      <p className="text-xs md:text-sm text-gray-500 mb-2">{job.company}</p>

      <div className="text-sm md:text-base leading-relaxed line-clamp-3 prose prose-slate prose-sm md:prose">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {job.summary}
        </ReactMarkdown>
      </div>

      <div className="text-[10px] md:text-xs text-gray-400 mt-2">
        Match Score: {job.score.toFixed(2)}
      </div>
    </a>
  );
}