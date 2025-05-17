"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Loader2,
} from "lucide-react";

import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

/* 型 ------------------------------------------------------------------ */
type ChallengeRow = Database["public"]["Tables"]["challenges"]["Row"];
type ChallengeCard = Pick<
  ChallengeRow,
  | "id"
  | "title"
  | "description"
  | "company"
  | "time_limit_min"
  | "question_count"
>;

export default function GrandPrixCategoryPage() {
  const router = useRouter();
  const { category } = useParams<{ category: string }>();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState<ChallengeCard[]>([]);
  const [results, setResults] = useState<any[]>([]);

  /* ------------------------------------------------------------ */
  /* データ取得 */
  /* ------------------------------------------------------------ */
  useEffect(() => {
    (async () => {
      setLoading(true);

      const isoNow = new Date().toISOString();

      /* 1. 公開中チャレンジ */
      const { data, error } = await supabase
        .from("challenges")
        .select(
          `
          id, title, description, company,
          time_limit_min, question_count
        `
        )
        .eq("category", category)
        .lte("start_date", isoNow)
        .or(`deadline.is.null,deadline.gte.${isoNow}`)
        .order("created_at", { ascending: false })

      if (error) {
        toast({ description: error.message });
      } else {
        setChallenges(data as ChallengeCard[]);
      }

      /* 2. 過去結果（ログインユーザーのみ） */
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user && data?.length) {
        const challengeIds = data.map((c) => c.id);
        const { data: res, error: resErr } = await supabase
          .from("challenge_sessions")
          .select(
            "id, challenge_id, score, elapsed_sec, created_at"
          )
          .eq("student_id", user.id)
          .in(
            "challenge_id",
            challengeIds.length
              ? challengeIds
              : ["00000000-0000-0000-0000-000000000000"]
          )
          .order("created_at", { ascending: false })
          .limit(20);

        if (!resErr) setResults(res ?? []);
      }

      setLoading(false);
    })();
  }, [category, toast]);

  /* ------------------------------------------------------------ */
  /* 画面 */
  /* ------------------------------------------------------------ */
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <main className="container mx-auto px-4 py-8">
        {/* 戻る */}
        <div className="mb-6 flex items-center gap-2">
          <Link
            href="/grandprix"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            種目一覧に戻る
          </Link>
        </div>

        {/* 見出し */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">
            {{
              webtest: "Web テスト",
              business: "ビジネス診断",
              case: "ケース診断",
            }[category] ?? category}
          </h1>
          <p className="text-sm text-gray-500">
            挑戦できる大会を選択してください
          </p>
        </div>

        {/* タブ */}
        <Tabs defaultValue="available" className="w-full">
          <TabsList className="mb-6 grid w-full grid-cols-2">
            <TabsTrigger value="available">挑戦可能</TabsTrigger>
            <TabsTrigger value="results">過去の結果</TabsTrigger>
          </TabsList>

          {/* ---- 挑戦可能 ---- */}
          <TabsContent value="available">
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : challenges.length === 0 ? (
              <p className="text-center text-sm text-gray-500">
                現在公開中の大会はありません
              </p>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {challenges.map((c) => (
                  <Card key={c.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{c.title}</CardTitle>
                      {c.company && (
                        <CardDescription>{c.company}</CardDescription>
                      )}
                    </CardHeader>

                    <CardContent>
                      <div className="mb-4 flex flex-wrap gap-2">
                        <Badge variant="outline" className="bg-gray-100">
                          <Clock className="mr-1 h-3 w-3" />
                          {c.time_limit_min ?? 40}分
                        </Badge>
                        <Badge variant="outline" className="bg-gray-100">
                          問題数: {c.question_count ?? 40}問
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-3">
                        {c.description}
                      </p>
                    </CardContent>

                    <CardFooter>
                      <Link
                        href={`/grandprix/${category}/challenge/${c.id}/confirm`}
                        className="w-full"
                      >
                        <Button className="w-full bg-emerald-500 hover:bg-emerald-600">
                          挑戦する
                        </Button>
                      </Link>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ---- 過去の結果 ---- */}
          <TabsContent value="results">
            {results.length === 0 ? (
              <p className="text-center text-sm text-gray-500">
                まだ結果がありません
              </p>
            ) : (
              <div className="space-y-4">
                {results.map((r) => (
                  <Card key={r.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-medium">
                          {
                            challenges.find(
                              (c) => c.id === r.challenge_id
                            )?.title ?? "（タイトル不明）"
                          }
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(r.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-lg font-bold text-emerald-600">
                          {r.score?.toFixed(1)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {Math.round((r.elapsed_sec ?? 0) / 60)}分
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}