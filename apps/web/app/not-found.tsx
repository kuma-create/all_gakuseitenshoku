/* ------------------------------------------------------------------
   app/not-found.tsx – 404 ページ（Client Component）
-------------------------------------------------------------------*/
"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-[70vh] place-content-center gap-6 text-center">
      <h1 className="text-3xl font-bold">404 – ページが見つかりません</h1>
      <p className="text-lg">
        お探しのページは移動したか、削除された可能性があります。
      </p>
      <Link
        href="/"
        className="inline-block rounded bg-primary px-6 py-3 font-medium
                   text-white transition hover:opacity-90"
      >
        ホームに戻る
      </Link>
    </div>
  );
}