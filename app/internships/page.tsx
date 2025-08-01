import ListingPage from "@/components/ListingPage";

/** ページ固有のメタデータ（SSR で <head> に埋め込む） */
export const metadata = {
  title: "学生転職 | 長期インターン求人一覧",
  description:
    "長期インターンシップを探すなら学生転職。スタートアップから大手まで最新募集を掲載中。",
  keywords: [
    "長期インターン",
    "インターンシップ",
    "学生転職",
    "スタートアップインターン",
    "求人",
    "キャリア",
    "新卒採用",
  ],
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/internships",
  },
  openGraph: {
    type: "website",
    url: "https://gakuten.co.jp/internships",
    title: "学生転職 | 長期インターン求人一覧",
    description:
      "長期インターンシップを探すなら学生転職。スタートアップから大手まで最新募集を掲載中。",
    images: [
      {
        url: "/ogp/internships.png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "学生転職 | 長期インターン求人一覧",
    description:
      "長期インターンシップを探すなら学生転職。スタートアップから大手まで最新募集を掲載中。",
    images: ["/ogp/internships.png"],
  },
};

/** 長期インターン一覧ページ */
export default function InternshipsPage() {
  return <ListingPage defaultSelectionType="intern_long" />;
}