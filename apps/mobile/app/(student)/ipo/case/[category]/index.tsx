"use client";

import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { useLocalSearchParams, Link, router } from "expo-router";
import { ArrowLeft, Clock } from "lucide-react-native";

import { supabase } from "src/lib/supabase";
import type { Database } from "@/lib/supabase/types";

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
  | "deadline"
>;

type SessionRow = Database["public"]["Tables"]["challenge_sessions"]["Row"];

export default function CaseCategoryScreen() {
  const { category: rawCategory } = useLocalSearchParams<{ category: string }>();
  const category = Array.isArray(rawCategory) ? rawCategory[0] : rawCategory;

  // カテゴリーマッピング
  const mapping = { webtest: "webtest", business: "bizscore", case: "case" } as const;

  // UI の URL パラメータ → DB のカテゴリー名へ
  const dbCategory = useMemo(() => (
    mapping[(category ?? "") as keyof typeof mapping] ?? category
  ), [category]);

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"available" | "results">("available");

  // 公開中チャレンジ
  const [availableChallenges, setAvailableChallenges] = useState<ChallengeCard[]>([]);
  // 結果タブでタイトル解決用
  const [titleMap, setTitleMap] = useState<Record<string, string>>({});
  const [results, setResults] = useState<SessionRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* ------------------------------------------------------------ */
  /* データ取得 */
  /* ------------------------------------------------------------ */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        const isoNow = new Date().toISOString();

        // 1) 公開中チャレンジ
        const { data, error } = await supabase
          .from("challenges")
          .select(
            `id, title, description, company, time_limit_min, question_count, deadline`
          )
          .eq("category", dbCategory)
          .lte("start_date", isoNow)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const rows = (data ?? []) as ChallengeCard[];
        const validRows = rows.filter(
          (c) => !c.deadline || new Date(c.deadline) >= new Date()
        );

        if (!cancelled) {
          setAvailableChallenges(validRows);
          setTitleMap(Object.fromEntries(validRows.map((r) => [r.id, r.title])));
        }

        // 2) ログインユーザーの過去結果
        const { data: userRes } = await supabase.auth.getUser();
        const user = userRes?.user;

        if (user) {
          const { data: res, error: resErr } = await supabase
            .from("challenge_sessions")
            .select("id, challenge_id, score, elapsed_sec, started_at")
            .eq("student_id", user.id)
            .order("started_at", { ascending: false })
            .limit(20);

          if (resErr) throw resErr;
          const rows2 = (res ?? []) as SessionRow[];
          if (!cancelled) setResults(rows2);

          // タイトルの不足分だけ追加取得
          const knownIds = new Set(validRows.map((c) => c.id));
          const missingIds = rows2
            .map((r) => r.challenge_id)
            .filter((id): id is string => id !== null && !knownIds.has(id));

          if (missingIds.length) {
            const { data: extra, error: extraErr } = await supabase
              .from("challenges")
              .select("id, title")
              .in("id", missingIds);
            if (extraErr) throw extraErr;
            if (!cancelled && extra?.length) {
              setTitleMap((prev) => ({
                ...prev,
                ...Object.fromEntries(extra.map((c) => [c.id, c.title])),
              }));
            }
          }
        }
      } catch (e: any) {
        if (!cancelled) setErrorMsg(e?.message ?? "読み込みに失敗しました");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dbCategory]);

  /* ------------------------------------------------------------ */
  /* UI */
  /* ------------------------------------------------------------ */
  const heading = useMemo(() => ({
    webtest: "Web テスト",
    business: "ビジネス診断",
    case: "ケース診断",
  } as const)[(category ?? "") as "webtest" | "business" | "case"] ?? (category ?? ""), [category]);

  return (
    <View style={styles.screen}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.push("/ipo/case") }>
          <ArrowLeft size={18} />
          <Text style={styles.backText}>種目一覧に戻る</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{heading}</Text>
        <Text style={styles.subtitle}>挑戦できる大会を選択してください</Text>

        {/* タブ (2分割) */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === "available" && styles.tabBtnActive]}
            onPress={() => setTab("available")}
          >
            <Text style={[styles.tabText, tab === "available" && styles.tabTextActive]}>挑戦可能</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === "results" && styles.tabBtnActive]}
            onPress={() => setTab("results")}
          >
            <Text style={[styles.tabText, tab === "results" && styles.tabTextActive]}>過去の結果</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" />
        </View>
      ) : errorMsg ? (
        <View style={styles.infoBox}><Text style={styles.infoText}>{errorMsg}</Text></View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollBody}>
          {tab === "available" ? (
            availableChallenges.length === 0 ? (
              <Text style={styles.muted}>現在公開中の大会はありません</Text>
            ) : (
              <View style={styles.cardGrid}>
                {availableChallenges.map((c) => {
                  const isCaseOrBiz = dbCategory === "case" || dbCategory === "bizscore";
                  const timeLabel = isCaseOrBiz ? "30分" : `${c.time_limit_min ?? 40}分`;
                  const countLabel = isCaseOrBiz ? "3〜5問" : `${c.question_count ?? 40}問`;

                  return (
                    <View key={c.id} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>{c.title}</Text>
                        {!!c.company && (
                          <Text style={styles.cardCompany}>{c.company}</Text>
                        )}
                      </View>

                      <View style={styles.cardContent}>
                        <View style={styles.badgeRow}>
                          <View style={styles.badge}>
                            <Clock size={14} />
                            <Text style={styles.badgeText}>{timeLabel}</Text>
                          </View>
                          <View style={styles.badgeOutline}>
                            <Text style={styles.badgeOutlineText}>問題数: {countLabel}</Text>
                          </View>
                        </View>
                        <Text style={styles.desc} numberOfLines={3}>
                          {c.description}
                        </Text>
                      </View>

                      <View style={styles.cardFooter}>
                        <Link
                          href={`/ipo/case/${category}/challenge/${c.id}/confirm`}
                          asChild
                        >
                          <TouchableOpacity style={styles.primaryBtn}>
                            <Text style={styles.primaryBtnText}>挑戦する</Text>
                          </TouchableOpacity>
                        </Link>
                      </View>
                    </View>
                  );
                })}
              </View>
            )
          ) : (
            results.length === 0 ? (
              <Text style={styles.muted}>まだ結果がありません</Text>
            ) : (
              <View style={{ gap: 12 }}>
                {results.map((r) => (
                  <View key={r.id} style={styles.resultCard}>
                    <View style={styles.resultLeft}>
                      <Text style={styles.resultTitle} numberOfLines={1}>
                        {r.challenge_id ? titleMap[r.challenge_id] ?? "（タイトル不明）" : "（タイトル不明）"}
                      </Text>
                      <Text style={styles.resultDate}>
                        {r.started_at ? new Date(r.started_at).toLocaleDateString() : "-"}
                      </Text>
                    </View>
                    <View style={styles.resultRight}>
                      <Text style={styles.resultScore}>
                        {typeof r.score === "number" ? r.score.toFixed(1) : "-"}
                      </Text>
                      <Text style={styles.resultTime}>{Math.round((r.elapsed_sec ?? 0) / 60)}分</Text>
                    </View>
                  </View>
                ))}
              </View>
            )
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F9FAFB" },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, backgroundColor: "#F9FAFB" },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  backText: { fontSize: 12, color: "#6B7280" },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 2 },
  subtitle: { fontSize: 12, color: "#6B7280", marginBottom: 12 },
  tabs: { flexDirection: "row", gap: 8 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: "#E5E7EB" },
  tabBtnActive: { backgroundColor: "#10B981" },
  tabText: { textAlign: "center", fontSize: 13, fontWeight: "600", color: "#374151" },
  tabTextActive: { color: "white" },

  loadingBox: { paddingVertical: 40, justifyContent: "center", alignItems: "center" },
  infoBox: { padding: 12, marginHorizontal: 16, backgroundColor: "#FEF2F2", borderRadius: 8 },
  infoText: { color: "#B91C1C", fontSize: 13 },

  scrollBody: { padding: 16, gap: 12 },
  muted: { textAlign: "center", color: "#6B7280", fontSize: 13, paddingVertical: 24 },

  cardGrid: { gap: 12 },
  card: { backgroundColor: "white", borderRadius: 12, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth, borderColor: "#E5E7EB" },
  cardHeader: { padding: 12, paddingBottom: 6 },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  cardCompany: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  cardContent: { paddingHorizontal: 12, paddingBottom: 12, gap: 8 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badge: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999, backgroundColor: "#F3F4F6", alignSelf: "flex-start" },
  badgeText: { fontSize: 12 },
  badgeOutline: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: "#D1D5DB", alignSelf: "flex-start" },
  badgeOutlineText: { fontSize: 12, color: "#111827" },
  desc: { fontSize: 13, color: "#374151" },
  cardFooter: { padding: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#F3F4F6" },
  primaryBtn: { backgroundColor: "#10B981", borderRadius: 8, paddingVertical: 12, alignItems: "center" },
  primaryBtnText: { color: "white", fontWeight: "700" },

  resultCard: { backgroundColor: "white", borderRadius: 12, padding: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: "#E5E7EB", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  resultLeft: { flexShrink: 1 },
  resultTitle: { fontSize: 14, fontWeight: "600" },
  resultDate: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  resultRight: { alignItems: "flex-end" },
  resultScore: { fontSize: 18, fontWeight: "800", color: "#059669" },
  resultTime: { fontSize: 11, color: "#6B7280" },
});
