// app/(student)/jobs/index.tsx
// モバイル版 学生向け 求人一覧ページ（Expo Router / React Native）
// UI/UX 改善版: デバウンス検索 / プルトゥリフレッシュ / 空・エラー状態 / 軽量スケルトン / 可読性向上
// 2025-08-12

import { Stack, useRouter, useLocalSearchParams, usePathname } from "expo-router";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
    Pressable,
    View,
    ScrollView,
    Modal,
    Platform,
    useWindowDimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

// Supabase クライアントのパスはプロジェクトに合わせて調整
import { supabase } from "src/lib/supabase";

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
  /** 以下はイベント/短期インターン用の任意フィールド（存在しない場合もある） */
  event_date?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  event_format?: "online" | "onsite" | "hybrid" | null;
  /** 任意: 職種名（無い場合は tags/title/description から擬似判定） */
  job_type?: string | null;
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

/* ---------- filter options (UI 側で保持) ---------- */
const INDUSTRY_OPTIONS = [
  "IT・通信","金融","広告・マーケティング","医療・福祉","メーカー","コンサルティング",
  "サービス","教育","商社","マスコミ","小売・流通","公務員",
];

const JOBTYPE_OPTIONS = [
  "エンジニア","研究・開発","品質管理","デザイナー","営業","総務・人事",
  "物流","生産管理","コンサルタント","経理・財務","企画・マーケティング","販売・サービス",
];

const SALARY_OPTIONS = [
  { value: "all", label: "すべての年収" },
  { value: "200", label: "200万以上" },
  { value: "400", label: "400万以上" },
  { value: "600", label: "600万以上" },
  { value: "800", label: "800万以上" },
  { value: "1000", label: "1000万以上" },
] as const;

const isEventLike = (t: string) => ["event", "internship_short"].includes(canon(t));
const canonSel = (v?: string | null) => (v === "intern_long" ? "internship_long" : (v ?? ""));


/* =========================================
 * Screen: JobsIndex (UI/UX 改善)
 * =======================================*/
export default function JobsIndexScreen() {
  const params = useLocalSearchParams<{ type?: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();

  const { width } = useWindowDimensions();
  const isCompact = width < 380;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobRow[]>([]);

  // UI states
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectionType, setSelectionType] = useState<
    NonNullable<JobRow["selection_type"]> | "all"
  >("all");

  // initialize selectionType from URL (e.g., /jobs?type=fulltime | internship_long | internship_short | event)
  useEffect(() => {
    const tRaw = params?.type ? String(params.type) : "";
    const t = (tRaw || "all") as string;
    const allowed = ["all", "fulltime", "internship_long", "internship_short", "event"] as const;
    if (allowed.includes(t as any) && t !== selectionType) {
      setSelectionType(t as any);
    }
    // run only on initial mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // sync URL query with selectionType (use shallow param update on all platforms to avoid remounts)
  useEffect(() => {
    const currentType = params?.type ? String(params.type) : undefined;
    const nextType = selectionType === "all" ? undefined : selectionType;
    const same = (currentType || undefined) === (nextType || undefined);
    if (same) return; // already in sync

    router.setParams(nextType ? { type: nextType } : {});
  }, [selectionType, router, params]);
  const [refreshing, setRefreshing] = useState(false);

  // --- Favorite jobs state ---
  const [studentId, setStudentId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const savingRef = useRef<Record<string, boolean>>({});
  // load favorites (job_interests) or local fallback
  useEffect(() => {
    (async () => {
      const { data: sessionRes } = await supabase.auth.getSession();
      const session = sessionRes?.session ?? null;
      if (session) {
        const { data: sp, error: spErr } = await supabase
          .from("student_profiles")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (!spErr && sp?.id) {
          setStudentId(sp.id);
          const { data: ji, error: jiErr } = await supabase
            .from("job_interests")
            .select("job_id")
            .eq("student_id", sp.id);
          if (!jiErr && ji) {
            setSavedIds(new Set(ji.map((r: any) => r.job_id as string)));
          }
        } else {
          setStudentId(null);
        }
      } else {
        setStudentId(null);
        // local fallback: array stored as JSON under key 'savedJobsMobile:list'
        try {
          const raw = await AsyncStorage.getItem('savedJobsMobile:list');
          const arr: string[] = raw ? JSON.parse(raw) : [];
          setSavedIds(new Set(arr));
        } catch {
          setSavedIds(new Set());
        }
      }
    })();
  }, []);

  // ---- Filter UI states (WEB版互換) ----
  const [industriesSelected, setIndustriesSelected] = useState<string[]>([]);
  const [jobTypesSelected, setJobTypesSelected] = useState<string[]>([]);
  const [salaryMin, setSalaryMin] = useState<string>("all"); // 本選考のみ
  const [eventFrom, setEventFrom] = useState<string>("");   // YYYY-MM
  const [eventTo, setEventTo] = useState<string>("");       // YYYY-MM (短期のみ)
  const [eventFormat, setEventFormat] = useState<string>("all"); // online | onsite | hybrid | all
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortKey, setSortKey] = useState<"new" | "deadline" | "salary_high" | "salary_low" | "recommended">("new");

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
          // 任意フィールド（存在しない場合は undefined のまま）
          event_date: (row as any).event_date ?? null,
          start_date: (row as any).start_date ?? null,
          end_date: (row as any).end_date ?? null,
          event_format: (row as any).event_format ?? null,
          job_type: (row as any).job_type ?? null,
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

  // 本選考以外では年収フィルターはリセット
  useEffect(() => {
    if (selectionType !== "fulltime" && salaryMin !== "all") setSalaryMin("all");
  }, [selectionType, salaryMin]);

  // イベント系フィルターは event / internship_short のみ有効
  useEffect(() => {
    if (!isEventLike(selectionType)) {
      if (eventFrom !== "") setEventFrom("");
      if (eventTo !== "") setEventTo("");
      if (eventFormat !== "all") setEventFormat("all");
    }
  }, [selectionType, eventFrom, eventTo, eventFormat]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchJobs();
    setRefreshing(false);
  }, [fetchJobs]);

  const persistLocalList = async (set: Set<string>) => {
    const arr = Array.from(set);
    try { await AsyncStorage.setItem('savedJobsMobile:list', JSON.stringify(arr)); } catch {}
    // keep per-job keys for compatibility with detail page implementation
    try {
      await Promise.all(arr.map(id => AsyncStorage.setItem(`savedJobsMobile:${id}`, '1')));
    } catch {}
  };

  const addInterest = async (jobId: string) => {
    if (!studentId) return;
    const { error } = await supabase
      .from('job_interests')
      .insert({ student_id: studentId, job_id: jobId });
    if (error) throw error;
  };

  const removeInterest = async (jobId: string) => {
    if (!studentId) return;
    const { error } = await supabase
      .from('job_interests')
      .delete()
      .eq('student_id', studentId)
      .eq('job_id', jobId);
    if (error) throw error;
  };

  const toggleSaved = useCallback(async (jobId: string) => {
    if (savingRef.current[jobId]) return; // prevent double taps
    savingRef.current[jobId] = true;
    // optimistic update
    setSavedIds(prev => {
      const next = new Set(prev);
      next.has(jobId) ? next.delete(jobId) : next.add(jobId);
      return next;
    });

    try {
      if (studentId) {
        if (savedIds.has(jobId)) {
          await removeInterest(jobId);
        } else {
          await addInterest(jobId);
        }
      } else {
        // local
        setSavedIds(prev => {
          const next = new Set(prev);
          // already toggled above; just persist
          persistLocalList(next);
          return next;
        });
      }
    } catch (e) {
      // rollback on failure
      setSavedIds(prev => {
        const next = new Set(prev);
        next.has(jobId) ? next.delete(jobId) : next.add(jobId);
        return next;
      });
      Platform.OS !== 'web' && console.warn('Failed to toggle favorite', e);
    } finally {
      savingRef.current[jobId] = false;
    }
  }, [studentId, savedIds]);

  const displayed = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();

    const toMonth = (v?: string | null) => (v ? String(v).slice(0, 7) : "");
    const rangesOverlap = (aStart: string, aEnd: string, bStart: string, bEnd: string) => {
      if (!aStart && !aEnd) return true; // ユーザー未指定
      if (!bStart && !bEnd) return false; // 求人側未設定
      const effAStart = aStart || "0000-00";
      const effAEnd   = aEnd   || "9999-99";
      const effBStart = bStart || "0000-00";
      const effBEnd   = bEnd   || "9999-99";
      return !(effBEnd < effAStart || effBStart > effAEnd);
    };

    return jobs.filter((j) => {
      // キーワード
      const matchesQ =
        q === "" ||
        j.title?.toLowerCase().includes(q) ||
        j.description?.toLowerCase().includes(q) ||
        j.companies?.name?.toLowerCase().includes(q);

      // 業種（OR）
      const jobIndustry = (j.companies?.industry ?? "").toLowerCase();
      const matchesInd =
        industriesSelected.length === 0 ||
        industriesSelected.some((opt) => jobIndustry.includes(opt.toLowerCase()));

      // 職種（OR）: job_type が無ければ title/description/tags を代用
      const baseJobTypeText = (
        (j.job_type ?? "") + " " + (j.title ?? "") + " " + (j.description ?? "") + " " + (j.tags ?? []).join(" ")
      ).toLowerCase();
      const matchesJob =
        jobTypesSelected.length === 0 ||
        jobTypesSelected.some((opt) => baseJobTypeText.includes(opt.toLowerCase()));

      // selectionType
      const matchesCategory =
        selectionType === "all" || canonSel(selectionType) === canonSel(j.selection_type ?? "fulltime");

      // 年収（本選考のみ）
      const matchesSalary =
        selectionType === "fulltime"
          ? (salaryMin === "all" || (j.salary_max ?? j.salary_min ?? 0) >= Number(salaryMin))
          : true;

      // イベント/短期
      const eventLike = isEventLike(selectionType);
      const matchesFormat = eventLike
        ? (eventFormat === "all" || (j.event_format ?? "") === eventFormat)
        : true;

      const eventMonth   = selectionType === "event" ? toMonth(j.event_date) : "";
      const internStartM = selectionType === "internship_short" ? toMonth(j.start_date) : "";
      const internEndM   = selectionType === "internship_short" ? toMonth(j.end_date ?? j.start_date ?? null) : "";
      const effectiveTo  = selectionType === "internship_short" ? eventTo : "";

      const matchesEventDate = eventLike
        ? (
            selectionType === "event"
              ? (!eventFrom ? true : (!!eventMonth && eventMonth === eventFrom))
              : rangesOverlap(eventFrom || "", effectiveTo || "", internStartM, internEndM)
          )
        : true;

      return (
        matchesQ &&
        matchesInd &&
        matchesJob &&
        matchesCategory &&
        matchesSalary &&
        matchesFormat &&
        matchesEventDate
      );
    }).sort((a, b) => {
      switch (sortKey) {
        case "recommended":
          // 推薦（is_recommended=trueを先頭、その後は新着）
          if ((b.is_recommended ? 1 : 0) !== (a.is_recommended ? 1 : 0)) {
            return (b.is_recommended ? 1 : 0) - (a.is_recommended ? 1 : 0);
          }
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "deadline":
          // 期日が近い順（未設定は最後）
          const ad = a.application_deadline ? new Date(a.application_deadline).getTime() : Number.MAX_SAFE_INTEGER;
          const bd = b.application_deadline ? new Date(b.application_deadline).getTime() : Number.MAX_SAFE_INTEGER;
          return ad - bd;
        case "salary_high":
          // 高い順（max→minの存在を考慮）
          const aPayH = (a.salary_max ?? a.salary_min ?? 0);
          const bPayH = (b.salary_max ?? b.salary_min ?? 0);
          return bPayH - aPayH;
        case "salary_low":
          const aPayL = (a.salary_min ?? a.salary_max ?? 0);
          const bPayL = (b.salary_min ?? b.salary_max ?? 0);
          return aPayL - bPayL;
        case "new":
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
  }, [jobs, debouncedQuery, industriesSelected, jobTypesSelected, selectionType, salaryMin, eventFrom, eventTo, eventFormat, sortKey]);

  const activeFiltersCount =
    (industriesSelected.length ? 1 : 0) +
    (jobTypesSelected.length ? 1 : 0) +
    (selectionType !== "all" ? 1 : 0) +
    (selectionType === "fulltime" && salaryMin !== "all" ? 1 : 0) +
    (isEventLike(selectionType) && (eventFrom || (selectionType === "internship_short" && eventTo) || eventFormat !== "all") ? 1 : 0);

  const clearAllFilters = () => {
    setIndustriesSelected([]);
    setJobTypesSelected([]);
    setSelectionType("all" as any);
    setSalaryMin("all");
    setEventFrom("");
    setEventTo("");
    setEventFormat("all");
  };

  const onPressJob = (id: string) =>
    router.push({ pathname: "/jobs/[id]", params: { id } });

  /* ---------- render ---------- */
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { paddingTop: (insets.top || 0) + 4 }]}>
        <Text accessibilityRole="header" style={styles.pageTitle}>募集を探す</Text>
        {/* search */}
        <View style={styles.searchRow}>
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={18} color="#6b7280" accessibilityLabel="検索" />
            <TextInput
              value={query}
              onChangeText={onChangeQuery}
              placeholder="キーワードで検索"
              style={styles.searchInputInline}
              returnKeyType="search"
              accessibilityLabel="求人検索"
              clearButtonMode="while-editing"
            />
          </View>
          {!isCompact && (
            <TouchableOpacity style={styles.filterPill} onPress={() => setFilterOpen(true)} accessibilityRole="button">
              <Ionicons name="filter" size={16} color="#111827" />
              <Text style={styles.filterPillText}>フィルター</Text>
              {activeFiltersCount > 0 && (
                <View style={styles.filterCount}><Text style={styles.filterCountText}>{activeFiltersCount}</Text></View>
              )}
            </TouchableOpacity>
          )}
        </View>
        {isCompact && (
          <View style={styles.filterPillRow}>
            <TouchableOpacity style={styles.filterPill} onPress={() => setFilterOpen(true)} accessibilityRole="button">
              <Ionicons name="filter" size={16} color="#111827" />
              <Text style={styles.filterPillText}>フィルター</Text>
              {activeFiltersCount > 0 && (
                <View style={styles.filterCount}><Text style={styles.filterCountText}>{activeFiltersCount}</Text></View>
              )}
            </TouchableOpacity>
          </View>
        )}


        {/* active filters (chips) */}
        {activeFiltersCount > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activeFilters} contentContainerStyle={{ gap: 8 }}>
            {industriesSelected.length > 0 && (
              <BadgePill label={`業界: ${industriesSelected.join(" / ")}`} onClose={() => setIndustriesSelected([])} />
            )}
            {jobTypesSelected.length > 0 && (
              <BadgePill label={`職種: ${jobTypesSelected.join(" / ")}`} onClose={() => setJobTypesSelected([])} />
            )}
            {selectionType !== "all" && (
              <BadgePill label={`選考: ${selectionLabel(selectionType as any)}`} onClose={() => setSelectionType("all" as any)} />
            )}
            {selectionType === "fulltime" && salaryMin !== "all" && (
              <BadgePill label={`年収: ${(SALARY_OPTIONS as any).find((s: any) => s.value === salaryMin)?.label}`} onClose={() => setSalaryMin("all")} />
            )}
            {isEventLike(selectionType) && (
              <>
                {eventFrom ? <BadgePill label={`開始: ${eventFrom}`} onClose={() => setEventFrom("")} /> : null}
                {selectionType === "internship_short" && eventTo ? (
                  <BadgePill label={`終了: ${eventTo}`} onClose={() => setEventTo("")} />
                ) : null}
                {eventFormat !== "all" ? (
                  <BadgePill label={`形式: {{ online: "オンライン", onsite: "対面", hybrid: "ハイブリッド" }[eventFormat as "online" | "onsite" | "hybrid"]}`} onClose={() => setEventFormat("all")} />
                ) : null}
              </>
            )}
          </ScrollView>
        )}

        <FilterSheet
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          industriesSelected={industriesSelected}
          setIndustriesSelected={setIndustriesSelected}
          jobTypesSelected={jobTypesSelected}
          setJobTypesSelected={setJobTypesSelected}
          selectionType={selectionType}
          setSelectionType={setSelectionType}
          salaryMin={salaryMin}
          setSalaryMin={setSalaryMin}
          eventFrom={eventFrom}
          setEventFrom={setEventFrom}
          eventTo={eventTo}
          setEventTo={setEventTo}
          eventFormat={eventFormat}
          setEventFormat={setEventFormat}
          sortKey={sortKey}
          setSortKey={setSortKey}
        />

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
            extraData={{ selectionType, industriesSelected, jobTypesSelected, salaryMin, eventFrom, eventTo, eventFormat, sortKey, debouncedQuery }}
            contentContainerStyle={{ paddingBottom: 24, gap: 12, paddingTop: 4 }}
            renderItem={({ item }) => (
              <MemoJobCard
                item={item}
                onPress={onPressJob}
                saved={savedIds.has(item.id)}
                onToggle={() => toggleSaved(item.id)}
              />
            )}
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

function JobCard({ item, onPress, saved, onToggle }: { item: JobRow; onPress: (id: string) => void; saved: boolean; onToggle: () => void }) {
  return (
    <Pressable
      style={styles.card}
      onPress={() => onPress(item.id)}
      accessibilityLabel={`${item.companies?.name ?? "企業名不明"}の求人：${item.title ?? "タイトル不明"}`}
    >
      {/* cover image (optional) */}
      {item.cover_image_url ? (
        <Image source={{ uri: item.cover_image_url }} style={styles.cardCover} resizeMode="cover" />
      ) : null}

      {/* header with logo & company/title */}
      <View style={styles.cardHeader}>
        <View style={styles.logoWrap}>
          {item.companies?.logo ? (
            <Image source={{ uri: item.companies.logo }} style={styles.logo} resizeMode="contain" />
          ) : (
            <View style={[styles.logo, styles.logoFallback]}>
              <Text style={styles.logoFallbackText}>{initialsFromName(item.companies?.name ?? "?")}</Text>
            </View>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.company} numberOfLines={1} ellipsizeMode="tail">{item.companies?.name ?? "企業名未登録"}</Text>
          <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">{item.title ?? "募集タイトル未登録"}</Text>
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

      {/* footer meta & actions */}
      <View style={styles.footerRowBetween}>
        <Text style={styles.meta} numberOfLines={1} ellipsizeMode="tail">
          {item.application_deadline ? `締切 ${formatDeadline(item.application_deadline)}` : /* (item.created_at ? new Date(item.created_at).toLocaleDateString() : "") */ ""}
        </Text>
        <View style={{ flexDirection: "row", gap: 14 }}>
          <TouchableOpacity onPress={onToggle} accessibilityRole="button" accessibilityLabel={saved ? "お気に入り解除" : "お気に入りに保存"}>
            <Ionicons name={saved ? "bookmark" : "bookmark-outline"} size={20} color={saved ? "#ef4444" : "#6b7280"} />
          </TouchableOpacity>
        </View>
      </View>
    </Pressable>
  );
}

const MemoJobCard = React.memo(JobCard);

/* ---------- small UI components for filters ---------- */
function BadgePill({ label, onClose }: { label: string; onClose: () => void }) {
  return (
    <View style={styles.badgePill}>
      <Text style={styles.badgePillText}>{label}</Text>
      <TouchableOpacity onPress={onClose} accessibilityRole="button" hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
        <Text style={styles.badgePillClose}>×</Text>
      </TouchableOpacity>
    </View>
  );
}

function TogglePill({ text, active, onPress }: { text: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.togglePill, active && styles.togglePillActive]}>
      <Text style={[styles.togglePillText, active && styles.togglePillTextActive]}>{text}</Text>
    </TouchableOpacity>
  );
}

function MultiSelectPillGroup({ options, selected, onChange }: { options: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  const toggle = (opt: string) => {
    if (selected.includes(opt)) onChange(selected.filter((v) => v !== opt));
    else onChange([...selected, opt]);
  };
  return (
    <View style={{ gap: 8, flexWrap: "wrap", flexDirection: "row" }}>
      {options.map((opt) => (
        <TogglePill key={opt} text={opt} active={selected.includes(opt)} onPress={() => toggle(opt)} />
      ))}
    </View>
  );
}

function DateMonthInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      style={styles.dateInput}
      keyboardType="numbers-and-punctuation"
      accessibilityLabel={placeholder}
    />
  );
}

function FilterSheet(props: {
  open: boolean;
  onClose: () => void;
  industriesSelected: string[];
  setIndustriesSelected: (v: string[]) => void;
  jobTypesSelected: string[];
  setJobTypesSelected: (v: string[]) => void;
  selectionType: string;
  setSelectionType: (v: any) => void;
  salaryMin: string;
  setSalaryMin: (v: string) => void;
  eventFrom: string;
  setEventFrom: (v: string) => void;
  eventTo: string;
  setEventTo: (v: string) => void;
  eventFormat: string;
  setEventFormat: (v: string) => void;
  sortKey: "new" | "deadline" | "salary_high" | "salary_low" | "recommended";
  setSortKey: (v: "new" | "deadline" | "salary_high" | "salary_low" | "recommended") => void;
}) {
  const {
    open, onClose,
    industriesSelected, setIndustriesSelected,
    jobTypesSelected, setJobTypesSelected,
    selectionType, setSelectionType,
    salaryMin, setSalaryMin,
    eventFrom, setEventFrom,
    eventTo, setEventTo,
    eventFormat, setEventFormat,
    sortKey, setSortKey,
  } = props;

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <View style={styles.sheetContent}>
          <View style={styles.sheetHandle} />
          <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
            <Text style={styles.sheetTitle}>フィルター</Text>

            <View style={{ gap: 8 }}>
              <Text style={styles.sheetLabel}>業種（複数選択可）</Text>
              <MultiSelectPillGroup options={INDUSTRY_OPTIONS} selected={industriesSelected} onChange={setIndustriesSelected} />
            </View>

            <View style={{ gap: 8 }}>
              <Text style={styles.sheetLabel}>職種（複数選択可）</Text>
              <MultiSelectPillGroup options={JOBTYPE_OPTIONS} selected={jobTypesSelected} onChange={setJobTypesSelected} />
            </View>

            <View style={{ gap: 8 }}>
              <Text style={styles.sheetLabel}>選考種類</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {[
                  { key: "all", label: "すべて" },
                  { key: "fulltime", label: "本選考" },
                  { key: "internship_long", label: "長期" },
                  { key: "internship_short", label: "短期" },
                  { key: "event", label: "イベント" },
                ].map((t) => (
                  <TogglePill key={t.key} text={t.label} active={selectionType === t.key} onPress={() => setSelectionType(t.key)} />
                ))}
              </View>
            </View>

            {selectionType === "fulltime" && (
              <View style={{ gap: 8 }}>
                <Text style={styles.sheetLabel}>年収</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {SALARY_OPTIONS.map((o) => (
                    <TogglePill key={o.value} text={o.label} active={salaryMin === o.value} onPress={() => setSalaryMin(o.value)} />
                  ))}
                </View>
              </View>
            )}

            {isEventLike(selectionType) && (
              <View style={{ gap: 8 }}>
                <Text style={styles.sheetLabel}>日付</Text>
                <DateMonthInput value={eventFrom} onChange={setEventFrom} placeholder="開始 (YYYY-MM)" />
                {selectionType === "internship_short" && (
                  <DateMonthInput value={eventTo} onChange={setEventTo} placeholder="終了 (YYYY-MM)" />
                )}
                <Text style={styles.sheetLabel}>開催形式</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {[
                    { value: "all", label: "すべて" },
                    { value: "online", label: "オンライン" },
                    { value: "onsite", label: "対面" },
                    { value: "hybrid", label: "ハイブリッド" },
                  ].map((o) => (
                    <TogglePill key={o.value} text={o.label} active={eventFormat === o.value} onPress={() => setEventFormat(o.value)} />
                  ))}
                </View>
              </View>
            )}

            <View style={{ gap: 8 }}>
              <Text style={styles.sheetLabel}>並び替え</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {[
                  { key: "new", label: "新着順" },
                  { key: "deadline", label: "締切が近い順" },
                ].map((t) => (
                  <TogglePill key={t.key} text={t.label} active={sortKey === (t.key as any)} onPress={() => setSortKey(t.key as any)} />
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.sheetFooter}>
            <TouchableOpacity style={[styles.footerBtn, styles.footerBtnGhost]} onPress={onClose}>
              <Text style={styles.footerBtnGhostText}>閉じる</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.footerBtn} onPress={onClose}>
              <Text style={styles.footerBtnText}>この条件で表示</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ---------- styles ---------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  pageTitle: { fontSize: 22, fontWeight: "800", color: "#111827", paddingHorizontal: 16, paddingTop: 0 },
  center: { paddingTop: 48, alignItems: "center", gap: 10, paddingHorizontal: 16 },
  muted: { color: "#6b7280" },
  error: { color: "#b91c1c", fontWeight: "600", textAlign: "center" },

  searchRow: { paddingHorizontal: 16, paddingTop: 10, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  filterPill: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 9999, paddingVertical: 8, paddingHorizontal: 12, position: "relative" },
  filterPillText: { marginLeft: 6, fontWeight: "700", color: "#111827" },
  filterCount: { position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: 9, backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center" },
  filterCountText: { color: "white", fontSize: 11, fontWeight: "800" },


  cardCover: { width: "100%", height: 160, borderRadius: 12, marginBottom: 10 },
  footerRowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  searchInput: {
    backgroundColor: "white",
    borderRadius: 9999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    fontSize: 16,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  searchIcon: { opacity: 0.7 },
  searchInputInline: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
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
    overflow: "hidden",
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
  chipsRow: { flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap", minWidth: 0 },
  chip: {
    backgroundColor: "#f3f4f6",
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: "100%",
  },
  chipText: { fontSize: 12, color: "#374151" },
  tagsRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", minWidth: 0 },
  footerRow: { flexDirection: "row", gap: 8, marginTop: 6, alignItems: "center" },
  meta: { color: "#6b7280", fontSize: 12, flexShrink: 1, minWidth: 0 },
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


  badgePill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#eef2ff", borderRadius: 9999, paddingHorizontal: 10, paddingVertical: 6 },
  badgePillText: { color: "#3730a3", fontSize: 12, fontWeight: "700" },
  badgePillClose: { color: "#6b7280", fontSize: 14, fontWeight: "900" },

  togglePill: { backgroundColor: "#f3f4f6", borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 8 },
  togglePillActive: { backgroundColor: "#ef4444" },
  togglePillText: { color: "#374151", fontWeight: "700", fontSize: 12 },
  togglePillTextActive: { color: "white" },

  dateInput: { backgroundColor: "white", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: "#e5e7eb" },

  sheetBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.25)", justifyContent: "flex-end" },
  sheetContent: { backgroundColor: "white", borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: "80%" },
  sheetHandle: { alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: "#e5e7eb", marginTop: 8 },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  sheetLabel: { fontSize: 13, color: "#6b7280", fontWeight: "700" },
  sheetFooter: { flexDirection: "row", gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  footerBtn: { flex: 1, backgroundColor: "#111827", paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  footerBtnText: { color: "white", fontWeight: "800" },
  footerBtnGhost: { backgroundColor: "#f3f4f6" },
  footerBtnGhostText: { color: "#111827", fontWeight: "800" },
  filterPillRow: { paddingHorizontal: 16, marginTop: 6, marginBottom: 2 },

  activeFilters: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },
});  