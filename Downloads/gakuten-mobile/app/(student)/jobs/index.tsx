// app/(student)/jobs/index.tsx
// モバイル版 学生向け 求人一覧ページ（Expo Router / React Native）
// UI/UX 改善版: デバウンス検索 / プルトゥリフレッシュ / 空・エラー状態 / 軽量スケルトン / 可読性向上
// 2025-08-12

import { Stack, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

// Supabase クライアントのパスはプロジェクトに合わせて調整
import { supabase } from "@/lib/supabase";

/* ---------- types ---------- */

type Company = {
  name: string | null;
  logo: string | null;
  industry?: string | null;
};

type JobRow = {
  id: string;
  title: string | null;
  description: string | null;
  created_at: string;
  work_type?: string | null;
  selection_type?:
    | "fulltime"
    | "internship_short"
    | "internship_long"
    | "intern_long"
    | "event"
    | null;
  is_recommended?: boolean | null;
  salary_range?: string | null;
  application_deadline?: string | null;
  location?: string | null;
  cover_image_url?: string | null;
  companies: Company | null;
  job_tags?: { tag: string }[] | null;
  salary_min?: number | null;
  salary_max?: number | null;
  tags?: string[] | null;
};

/* ---------- helpers ---------- */
function selectionLabel(type?: JobRow["selection_type"]) {
  switch (type) {
    case "event":
      return "イベント";
    case "internship_short":
      return "短期インターン";
    case "internship_long":
    case "intern_long":
      return "長期インターン";
    case "fulltime":
    default:
      return "本選考";
  }
}

function formatDeadline(v?: string | null) {
  if (!v) return "";
  // 期待フォーマット: YYYY-MM-DD or ISO string
  try {
    const d = new Date(v);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}/${m}/${day}`;
  } catch {
    return String(v);
  }
}

function initialsFromName(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts[1]?.[0] ?? "";
  return (first + last).toUpperCase() || name.slice(0, 2).toUpperCase();
}

function canon(v: string) {
  return v === "intern_long" ? "internship_long" : v;
}

/* =========================================
 * Screen: JobsIndex (UI/UX 改善)
 * =======================================*/
export default function JobsIndexScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobRow[]>([]);

  // UI states
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectionType, setSelectionType] = useState<
    NonNullable<JobRow["selection_type"]> | "all"
  >("all");
  const [refreshing, setRefreshing] = useState(false);

  // --- Debounce query to reduce re-renders
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const onChangeQuery = (text: string) => {
    setQuery(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedQuery(text), 250);
  };

  // fetch jobs
  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("jobs")
        .select(
          `
          id,
          title,
          description,
          created_at,
          work_type,
          selection_type,
          is_recommended,
          salary_range,
          application_deadline,
          location,
          cover_image_url,
          companies:companies!jobs_company_id_fkey(name, industry, logo),
          job_tags:job_tags!job_tags_job_id_fkey(tag)
        `
        )
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      const normalized = (data ?? []).map((row: any): JobRow => {
        // 年収の数値抽出（例: "400万〜600万" → 400/600）
        const rgx = /(\d+)[^\d]+(\d+)?/;
        const m = (row.salary_range ?? "").match(rgx);
        const min = m ? Number(m[1]) : null;
        const max = m && m[2] ? Number(m[2]) : null;
        return {
          ...row,
          selection_type: (row.selection_type ?? "fulltime") as JobRow["selection_type"],
          salary_min: min,
          salary_max: max,
          tags: (row.job_tags ?? []).map((t: any) => t.tag),
        } as JobRow;
      });

      setJobs(normalized);
    } catch (e: any) {
      console.error("[jobs/index] fetch error", e);
      setError(e.message ?? "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchJobs();
    setRefreshing(false);
  }, [fetchJobs]);

  const displayed = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return jobs.filter((j) => {
      const matchesQ =
        q === "" ||
        j.title?.toLowerCase().includes(q) ||
        j.description?.toLowerCase().includes(q) ||
        j.companies?.name?.toLowerCase().includes(q);

      const matchesSel =
        selectionType === "all" ||
        canon(selectionType) === canon(j.selection_type ?? "fulltime");

      return matchesQ && matchesSel;
    });
  }, [jobs, debouncedQuery, selectionType]);

  const onPressJob = (id: string) =>
    router.push({ pathname: "/jobs/[id]", params: { id } });

  /* ---------- render ---------- */
  return (
    <>
      <Stack.Screen options={{ title: "選考一覧", headerBackTitle: "戻る" }} />
      <View style={styles.container}>
        {/* search */}
        <View style={styles.searchRow}>
          <TextInput
            value={query}
            onChangeText={onChangeQuery}
            placeholder="職種・会社名・キーワード"
            style={styles.searchInput}
            returnKeyType="search"
            accessibilityLabel="求人検索"
            clearButtonMode="while-editing"
          />
        </View>

        {/* simple selection-type tabs */}
        <View style={styles.tabs}>
          {[
            { key: "all", label: "すべて" },
            { key: "fulltime", label: "本選考" },
            { key: "internship_long", label: "長期" },
            { key: "internship_short", label: "短期" },
            { key: "event", label: "イベント" },
          ].map((t) => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setSelectionType(t.key as any)}
              style={[styles.tab, selectionType === (t.key as any) && styles.tabActive]}
              accessibilityRole="button"
              accessibilityLabel={`フィルター: ${t.label}`}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Text style={[styles.tabText, selectionType === (t.key as any) && styles.tabTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* states */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" />
            <Text style={styles.muted}>読み込み中…</Text>
            {/* 軽量スケルトン */}
            <View style={styles.skeletonList}>
              {Array.from({ length: 3 }).map((_, i) => (
                <View key={i} style={styles.skeletonCard} />
              ))}
            </View>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.error}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchJobs}>
              <Text style={styles.retryText}>再読み込み</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={displayed}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 24, gap: 12, paddingTop: 4 }}
            renderItem={({ item }) => <MemoJobCard item={item} onPress={onPressJob} />}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyTitle}>条件に合う求人が見つかりません</Text>
                <Text style={styles.emptyText}>キーワードやフィルターを変えてお試しください。</Text>
                <View style={{ height: 8 }} />
                <TouchableOpacity style={styles.clearBtn} onPress={() => { setSelectionType("all"); setQuery(""); setDebouncedQuery(""); }}>
                  <Text style={styles.clearBtnText}>検索条件をクリア</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </View>
    </>
  );
}

/* ---------- components ---------- */
function Chip({ text }: { text: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{text}</Text>
    </View>
  );
}

function JobCard({ item, onPress }: { item: JobRow; onPress: (id: string) => void }) {
  const hasLogo = !!item.companies?.logo;
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(item.id)}
      accessibilityRole="button"
      accessibilityLabel={`${item.companies?.name ?? "企業名不明"}の求人：${item.title ?? "タイトル不明"}`}
    >
      {/* header */}
      <View style={styles.cardHeader}>
        <View style={styles.logoWrap}>
          {hasLogo ? (
            <Image source={{ uri: item.companies!.logo! }} style={styles.logo} resizeMode="contain" />
          ) : (
            <View style={[styles.logo, styles.logoFallback]}>
              <Text style={styles.logoFallbackText}>{initialsFromName(item.companies?.name ?? "?")}</Text>
            </View>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.company} numberOfLines={1}>
            {item.companies?.name ?? "企業名未登録"}
          </Text>
          <Text style={styles.title} numberOfLines={2}>
            {item.title ?? "募集タイトル未登録"}
          </Text>
          <View style={styles.chipsRow}>
            <Chip text={selectionLabel(item.selection_type ?? undefined)} />
            {!!item.location && <Chip text={item.location} />}
            {!!item.salary_range && <Chip text={String(item.salary_range)} />}
          </View>
        </View>
      </View>

      {/* tags */}
      {item.tags && item.tags.length > 0 ? (
        <View style={styles.tagsRow}>
          {item.tags.slice(0, 3).map((t, i) => (
            <Chip key={`${t}-${i}`} text={t} />
          ))}
        </View>
      ) : null}

      {/* footer */}
      {item.salary_min || item.salary_max || item.application_deadline ? (
        <View style={styles.footerRow}>
          {item.salary_min || item.salary_max ? (
            <Text style={styles.meta} numberOfLines={1}>
              {item.salary_min && item.salary_max
                ? `${item.salary_min}万 – ${item.salary_max}万`
                : item.salary_min
                ? `${item.salary_min}万〜`
                : `${item.salary_max}万以下`}
            </Text>
          ) : null}
          {item.application_deadline ? (
            <Text style={styles.meta}>締切 {formatDeadline(item.application_deadline)}</Text>
          ) : null}
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const MemoJobCard = React.memo(JobCard);

/* ---------- styles ---------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  center: { paddingTop: 48, alignItems: "center", gap: 10, paddingHorizontal: 16 },
  muted: { color: "#6b7280" },
  error: { color: "#b91c1c", fontWeight: "600", textAlign: "center" },

  searchRow: { padding: 16 },
  searchInput: {
    backgroundColor: "white",
    borderRadius: 9999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    fontSize: 16,
  },

  tabs: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  tab: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 14,
    paddingVertical: 8, // 大きめタップ領域
    borderRadius: 9999,
  },
  tabActive: { backgroundColor: "#ef4444" },
  tabText: { color: "#374151", fontWeight: "700", fontSize: 12 },
  tabTextActive: { color: "white" },

  card: {
    backgroundColor: "white",
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 8,
  },
  cardHeader: { flexDirection: "row", gap: 12, alignItems: "center" },
  logoWrap: {
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: { width: 56, height: 56 },
  logoFallback: { backgroundColor: "#e5e7eb", alignItems: "center", justifyContent: "center" },
  logoFallbackText: { color: "#6b7280", fontWeight: "700" },
  company: { fontSize: 13, color: "#6b7280" },
  title: { fontSize: 18, fontWeight: "800", color: "#111827", marginTop: 2 },
  chipsRow: { flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap" },
  chip: {
    backgroundColor: "#f3f4f6",
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: { fontSize: 12, color: "#374151" },
  tagsRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  footerRow: { flexDirection: "row", gap: 8, marginTop: 6, alignItems: "center" },
  meta: { color: "#6b7280", fontSize: 12 },
  retryBtn: {
    marginTop: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ef4444",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  retryText: { color: "#ef4444", fontWeight: "700" },

  skeletonList: { width: "100%", paddingHorizontal: 16, gap: 12, marginTop: 8 },
  skeletonCard: {
    height: 92,
    backgroundColor: "#eee",
    borderRadius: 12,
  },

  emptyWrap: {
    paddingTop: 48,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  emptyTitle: { fontWeight: "800", fontSize: 16, color: "#111827" },
  emptyText: { marginTop: 6, color: "#6b7280", textAlign: "center" },
  clearBtn: {
    marginTop: 6,
    backgroundColor: "#111827",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 9999,
  },
  clearBtnText: { color: "white", fontWeight: "700" },
});