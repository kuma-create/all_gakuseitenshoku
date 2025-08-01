// components/ListingPage.tsx
import React from "react";

import type { Metadata } from "next";

/** -----------------------------------------------------------------
 * SEO / Open Graph metadata
 * ----------------------------------------------------------------- */
export const metadata: Metadata = {
  title: "長期インターン・新卒求人一覧 | 学生転職",
  description:
    "学生転職が厳選した長期インターン・新卒求人を一覧で掲載。職種・勤務地・働き方などで詳しく検索できます。",
  alternates: {
    canonical: "/jobs",
  },
  openGraph: {
    title: "長期インターン・新卒求人一覧 | 学生転職",
    description:
      "学生転職が厳選した長期インターン・新卒求人を一覧で掲載。職種・勤務地・働き方などで詳しく検索できます。",
    url:
      (process.env.NEXT_PUBLIC_SITE_URL ?? "https://gakuten.co.jp") + "/jobs",
    siteName: "学生転職",
    type: "website",
    images: [
      {
        url: "/ogp/jobs.png",
        width: 1200,
        height: 630,
        alt: "学生転職 | 長期インターン・新卒求人一覧",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "長期インターン・新卒求人一覧 | 学生転職",
    description:
      "学生転職が厳選した長期インターン・新卒求人を一覧で掲載。職種・勤務地・働き方などで詳しく検索できます。",
    images: ["/ogp/jobs.png"],
  },
  other: {
    "robots": "index,follow",
  },
};

interface ListingPageProps {
  title: string;
  description: string;
  ogImage: string;
  defaultSelectionType?: string;
}

export default function ListingPage({
  title,
  description,
  ogImage,
  defaultSelectionType = "all",
}: ListingPageProps) {
  // ...rest of the function body remains unchanged
}