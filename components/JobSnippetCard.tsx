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
};

export default function JobSnippetCard({ job }: { job: JobSnippet }) {
  return (
    <a
      href={job.url}
      target="_blank"
      className="block border rounded-lg p-4 hover:shadow-md transition"
    >
      <h3 className="font-semibold">{job.title}</h3>
      <p className="text-sm text-gray-500 mb-1">{job.company}</p>

      <div className="text-sm leading-relaxed line-clamp-3 prose prose-slate prose-sm">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {job.summary}
        </ReactMarkdown>
      </div>

      <div className="text-xs text-gray-400 mt-2">Match Score: {job.score.toFixed(2)}</div>
    </a>
  );
}