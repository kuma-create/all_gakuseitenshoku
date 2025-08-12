// app/(student)/jobs/index.tsx
// モバイル版 学生向け 求人一覧ページ（Expo Router / React Native）
// Webの JobsPage を簡略移植: 検索・フィルタ最小構成＋カード一覧
// 2025-08-12

import { Stack, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// Supabase クライアントのパスはプロジェクトに合わせて調整
// import { supabase } from "@/src/lib/supabase";
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

/* =========================================
 * Screen: JobsIndex
 * =======================================*/
export default function JobsIndexScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobRow[]>([]);

  // UI states
  const [query, setQuery] = useState("");
  const [selectionType, setSelectionType] = useState<
    NonNullable<JobRow["selection_type"]> | "all"
  >("all");

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

  const displayed = useMemo(() => {
    const q = query.trim().toLowerCase();
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
  }, [jobs, query, selectionType]);

  function canon(v: string) {
    return v === "intern_long" ? "internship_long" : v;
  }

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
            onChangeText={setQuery}
            placeholder="職種・会社名・キーワード"
            style={styles.searchInput}
            returnKeyType="search"
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
            >
              <Text style={[styles.tabText, selectionType === (t.key as any) && styles.tabTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.center}> 
            <ActivityIndicator size="large" />
            <Text style={styles.muted}>読み込み中…</Text>
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
            contentContainerStyle={{ paddingBottom: 24, gap: 12 }}
            renderItem={({ item }) => <JobCard item={item} onPress={onPressJob} />}
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
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(item.id)}>
      {/* header */}
      <View style={styles.cardHeader}>
        <View style={styles.logoWrap}>
          {item.companies?.logo ? (
            <Image source={{ uri: item.companies.logo }} style={styles.logo} resizeMode="contain" />
          ) : (
            <View style={[styles.logo, styles.logoFallback]} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.company}>{item.companies?.name ?? ""}</Text>
          <Text style={styles.title} numberOfLines={1}>
            {item.title ?? ""}
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
      {(item.salary_min || item.salary_max || item.application_deadline) ? (
        <View style={styles.footerRow}>
          {(item.salary_min || item.salary_max) && (
            <Text style={styles.meta}>
              {item.salary_min && item.salary_max
                ? `${item.salary_min}万 – ${item.salary_max}万`
                : item.salary_min
                ? `${item.salary_min}万〜`
                : `${item.salary_max}万以下`}
            </Text>
          )}
          {item.application_deadline && (
            <Text style={styles.meta}>締切 {item.application_deadline}</Text>
          )}
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

/* ---------- styles ---------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  center: { paddingTop: 48, alignItems: "center", gap: 8 },
  muted: { color: "#6b7280" },
  error: { color: "#b91c1c", fontWeight: "600" },

  searchRow: { padding: 16 },
  searchInput: {
    backgroundColor: "white",
    borderRadius: 9999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  tabs: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  tab: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  tabActive: { backgroundColor: "#ef4444" },
  tabText: { color: "#374151", fontWeight: "600", fontSize: 12 },
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
  logoFallback: { backgroundColor: "#e5e7eb" },
  company: { fontSize: 14, color: "#6b7280" },
  title: { fontSize: 18, fontWeight: "700", color: "#111827", marginTop: 2 },
  chipsRow: { flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap" },
  chip: {
    backgroundColor: "#f3f4f6",
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: { fontSize: 12, color: "#374151" },
  tagsRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  footerRow: { flexDirection: "row", gap: 8, marginTop: 6 },
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
});