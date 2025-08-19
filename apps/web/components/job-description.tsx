/* ------------------------------------------------------------------
   components/job-description.tsx
   - Markdown 文字列を HTML にレンダリング
   - remark-gfm で GitHub 風 (表・タスクリスト等) をサポート
------------------------------------------------------------------- */
"use client"

import React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
// rehype-highlight を使う場合は ↓ を同時に import
// import rehypeHighlight from "rehype-highlight"
// import "highlight.js/styles/github.css"

type Props = {
  /** Markdown 形式の本文 */
  markdown: string
}

/** 表示用コンポーネント */
export const JobDescription: React.FC<Props> = ({ markdown }) => {
  return (
    <article className="prose max-w-none prose-headings:font-semibold">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        // rehypePlugins={[rehypeHighlight]}
        components={{
          /* 例：リンクを常に _blank で開きたい場合 */
          a: (props) => (
            <a
              {...props}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline"
            />
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </article>
  )
}
