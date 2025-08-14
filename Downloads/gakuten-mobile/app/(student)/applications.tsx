// app/(student)/applications.tsx
// Mobile Applications – 応募履歴一覧（検索/フィルタ/並替/タブ/リアルタイム反映）

import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../../src/lib/supabase"; // webと揃えて相対パス

type Application = {
  id: string; // uuid
  companyName: string;
  companyLogo: string | null;
  jobTitle: string;
  jobId: string; // uuid
  appliedDate: string; // ISO or "YYYY年MM月DD日" 想定
  status:
    | "未対応"
    | "書類選考中"
    | "選考中"
    | "書類通過"
    | "最終選考"
    | "内定"
    | "不通過";
  category: "イベント" | "本選考" | "インターン" | null;
  location: string | null;
  workStyle: string | null;
  nextStep?: string | null;
  hasUnreadMessages: boolean;
  messageCount: number;
};

// ---- 色ユーティリティ（RN Style用に直接カラーコード返却）----
const statusStyle = (status: Application["status"]) => {
  switch (status) {
    case "未対応":
    case "選考中":
    case "書類選考中":
      return { bg: "#DBEAFE", fg: "#1E40AF" }; // blue
    case "書類通過":
      return { bg: "#D1FAE5", fg: "#065F46" }; // emerald/green
    case "最終選考":
      return { bg: "#EDE9FE", fg: "#5B21B6" }; // purple
    case "内定":
      return { bg: "#DCFCE7", fg: "#166534" }; // green
    case "不通過":
      return { bg: "#FEE2E2", fg: "#991B1B" }; // red
    default:
      return { bg: "#F3F4F6", fg: "#374151" }; // gray
  }
};

const categoryStyle = (category: Application["category"]) => {
  switch (category) {
    case "イベント":
      return { bg: "#FEF9C3", fg: "#854D0E" }; // yellow
    case "インターン":
      return { bg: "#E0E7FF", fg: "#3730A3" }; // indigo
    case "本選考":
      return { bg: "#CCFBF1", fg: "#115E59" }; // teal
    default:
      return { bg: "#F3F4F6", fg: "#374151" };
  }
};

// ---- 日付フォーマット（両対応：ISO or "YYYY年MM月DD日"）----
const formatJpDate = (input: string) => {
  // まずISOなどを試す
  const d = new Date(input);
  if (!isNaN(d.getTime())) {
    const [y, m, dd] = new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "Asia/Tokyo",
    })
      .format(d)
      .split("/");
    return `${y}年${m}月${dd}日`;
  }
  // "YYYY年MM月DD日" 形式ならそのまま返す
  if (/^\d{4}年\d{1,2}月\d{1,2}日$/.test(input)) return input;
  // どうしても解釈できなければ生値
  return input;
};

// ---- 時期フィルタ判定 ----
const matchesTimeFilter = (appliedDate: string, timeFilter: string) => {
  if (timeFilter === "all") return true;
  const base = new Date();
  const dt = new Date(appliedDate);
  const parsed =
    !isNaN(dt.getTime())
      ? dt
      : new Date(appliedDate.replace(/年|月/g, "/").replace("日", "")); // fallback

  if (isNaN(parsed.getTime())) return true;

  const from = new Date(base);
  if (timeFilter === "1month") from.setMonth(from.getMonth() - 1);
  if (timeFilter === "3months") from.setMonth(from.getMonth() - 3);
  if (timeFilter === "6months") from.setMonth(from.getMonth() - 6);

  return parsed >= from;
};

export default function ApplicationsMobilePage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 検索/フィルタ/並替/タブ
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Application["status"]>("all");
  const [timeFilter, setTimeFilter] = useState<"all" | "1month" | "3months" | "6months">(
    "all"
  );
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [tab, setTab] = useState<"all" | "active" | "completed">("all");

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        setApplications([]);
        setLoading(false);
        return;
      }
      const userId = session.user.id;

      const { data, error } = await supabase
        .from("student_applications_view")
        .select("*")
        .eq("student_id", userId)
        .order("applied_date", { ascending: false });

      if (error) throw error;

      const normalized: Application[] = (data || []).map((row: any) => ({
        id: row.id ?? "",
        companyName: row.company_name ?? "",
        companyLogo: row.company_logo ?? null,
        jobTitle: row.title ?? "",
        jobId: row.job_id ?? "",
        appliedDate: row.applied_date ?? "",
        status: (row.status ?? "未対応") as Application["status"],
        category: (row.category ?? row.job_type ?? null) as Application["category"],
        location: row.location ?? null,
        workStyle: row.work_style ?? null,
        nextStep: null, // 列が無いので固定
        hasUnreadMessages: row.has_unread_messages ?? false,
        messageCount: row.unread_count ?? 0,
      }));

      setApplications(normalized);
    } catch (e) {
      console.error("applications fetch error", e);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      await fetchApplications();

      // Realtime
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;
      const userId = session.user.id;

      const ch = supabase
        .channel("student_applications_realtime_mobile")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "applications",
            filter: `student_id=eq.${userId}`,
          },
          () => {
            // 何かしら変化があれば再取得
            fetchApplications();
          }
        )
        .subscribe();

      if (mounted) channelRef.current = ch;
    })();

    return () => {
      mounted = false;
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [fetchApplications]);

  const statusOptions = useMemo(
    () => ["all", ...Array.from(new Set(applications.map((a) => a.status)))],
    [applications]
  );

  // タブに応じた一次フィルタ
  const tabFiltered = useMemo(() => {
    if (tab === "active")
      return applications.filter((a) => !["内定", "不通過"].includes(a.status));
    if (tab === "completed")
      return applications.filter((a) => ["内定", "不通過"].includes(a.status));
    return applications;
  }, [applications, tab]);

  const filteredSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const arr = tabFiltered
      .filter((app) => {
        const matchesQuery =
          q === "" ||
          app.companyName.toLowerCase().includes(q) ||
          app.jobTitle.toLowerCase().includes(q);
        const matchesStatus = statusFilter === "all" || app.status === statusFilter;
        const matchesTime = matchesTimeFilter(app.appliedDate, timeFilter);
        return matchesQuery && matchesStatus && matchesTime;
      })
      .sort((a, b) => {
        const parse = (s: string) => {
          const d = new Date(s);
          if (!isNaN(d.getTime())) return d.getTime();
          const fallback = new Date(s.replace(/年|月/g, "/").replace("日", ""));
          return isNaN(fallback.getTime()) ? 0 : fallback.getTime();
        };
        const da = parse(a.appliedDate);
        const db = parse(b.appliedDate);
        return sortOrder === "newest" ? db - da : da - db;
      });

    return arr;
  }, [tabFiltered, searchQuery, statusFilter, timeFilter, sortOrder]);

  const onOpenJob = useCallback(
    (jobId: string) => router.push(`/jobs/${jobId}` as any),
    [router]
  );
  const onOpenChat = useCallback(
    (applicationId: string) => router.push(`/chat/${applicationId}` as any),
    [router]
  );

  // ---- UI ----
  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 8,
          backgroundColor: "#f8fafc",
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#0f172a" }}>
          応募履歴
        </Text>
        <Text style={{ color: "#64748b", marginTop: 4, fontSize: 12 }}>
          過去に応募した求人一覧です
        </Text>

        {/* タブ */}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
          {(["all", "active", "completed"] as const).map((k) => (
            <Pressable
              key={k}
              onPress={() => setTab(k)}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: tab === k ? "#ef4444" : "#e5e7eb",
                backgroundColor: tab === k ? "#fee2e2" : "#fff",
              }}
            >
              <Text
                style={{ fontSize: 12, color: tab === k ? "#991b1b" : "#334155" }}
              >
                {k === "all" ? "すべて" : k === "active" ? "選考中" : "完了"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* コントロール群 */}
      <View style={{ padding: 16, gap: 12 }}>
        {/* 検索 */}
        <View
          style={{
            borderWidth: 1,
            borderColor: "#e5e7eb",
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: "#fff",
          }}
        >
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="企業名・求人名で検索"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            autoCorrect={false}
            style={{ fontSize: 14 }}
          />
        </View>

        {/* ステータス フィルタ（横スクロールチップ） */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 12, color: "#475569" }}>ステータス</Text>
          <FlatList
            data={statusOptions}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(s) => String(s)}
            contentContainerStyle={{ gap: 8 }}
            renderItem={({ item }) => {
              const active = statusFilter === item;
              return (
                <Pressable
                  onPress={() =>
                    setStatusFilter(
                      (prev) => (prev === item ? "all" : (item as any))
                    )
                  }
                  style={{
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: active ? "#0ea5e9" : "#e5e7eb",
                    backgroundColor: active ? "#e0f2fe" : "#fff",
                  }}
                >
                  <Text
                    style={{ fontSize: 12, color: active ? "#0369a1" : "#334155" }}
                  >
                    {item === "all" ? "すべて" : item}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>

        {/* 期間・並び替え */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          {[
            { key: "all", label: "全期間" },
            { key: "1month", label: "1ヶ月" },
            { key: "3months", label: "3ヶ月" },
            { key: "6months", label: "6ヶ月" },
          ].map((opt) => {
            const active = timeFilter === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => setTimeFilter(opt.key as any)}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: active ? "#0ea5e9" : "#e5e7eb",
                  backgroundColor: active ? "#e0f2fe" : "#fff",
                }}
              >
                <Text
                  style={{ fontSize: 12, color: active ? "#0369a1" : "#334155" }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}

          <Pressable
            onPress={() =>
              setSortOrder((p) => (p === "newest" ? "oldest" : "newest"))
            }
            style={{
              marginLeft: "auto",
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: "#e5e7eb",
              backgroundColor: "#fff",
            }}
          >
            <Text style={{ fontSize: 12, color: "#334155" }}>
              並び: {sortOrder === "newest" ? "新→古" : "古→新"}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* コンテンツ */}
      {loading ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          <ActivityIndicator />
          <Text style={{ color: "#64748b", fontSize: 12 }}>読み込み中…</Text>
        </View>
      ) : filteredSorted.length === 0 ? (
        <EmptyState
          onPressExplore={() => router.push("/jobs" as any)}
        />
      ) : (
        <FlatList
          data={filteredSorted}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 12 }}
          renderItem={({ item }) => (
            <ApplicationCard
              application={item}
              onOpenJob={onOpenJob}
              onOpenChat={onOpenChat}
            />
          )}
        />
      )}
    </View>
  );
}

// ---- Card ----
function ApplicationCard({
  application,
  onOpenJob,
  onOpenChat,
}: {
  application: Application;
  onOpenJob: (jobId: string) => void;
  onOpenChat: (applicationId: string) => void;
}) {
  const displayStatus =
    application.status === "未対応" ? "選考中" : application.status;
  const s = statusStyle(displayStatus as Application["status"]);
  const c = categoryStyle(application.category);

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: "#fff",
      }}
    >
      {/* 上段（会社ロゴ/会社名/場所/働き方） */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          padding: 12,
          backgroundColor: "#f8fafc",
          borderBottomWidth: 1,
          borderBottomColor: "#e5e7eb",
        }}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 8,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: "#e5e7eb",
            backgroundColor: "#fff",
          }}
        >
          {application.companyLogo ? (
            <Image
              source={{ uri: application.companyLogo }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#fff",
              }}
            >
              <Text style={{ fontSize: 10, color: "#94a3b8" }}>No Logo</Text>
            </View>
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            style={{ fontSize: 14, fontWeight: "700", color: "#0f172a" }}
          >
            {application.companyName}
          </Text>
          {!!application.location && (
            <Text
              numberOfLines={1}
              style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}
            >
              {application.location}
            </Text>
          )}
          {!!application.workStyle && (
            <Text
              numberOfLines={1}
              style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}
            >
              {application.workStyle}
            </Text>
          )}
        </View>
      </View>

      {/* 本文 */}
      <View style={{ padding: 12, gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text
            numberOfLines={2}
            style={{ flex: 1, fontSize: 16, fontWeight: "700", color: "#111827" }}
          >
            {application.jobTitle}
          </Text>

          <View
            style={{
              paddingVertical: 4,
              paddingHorizontal: 8,
              borderRadius: 999,
              backgroundColor: s.bg,
              marginLeft: 8,
            }}
          >
            <Text style={{ fontSize: 12, color: s.fg }}>{displayStatus}</Text>
          </View>
        </View>

        {!!application.category && (
          <View
            style={{
              alignSelf: "flex-start",
              paddingVertical: 3,
              paddingHorizontal: 8,
              borderRadius: 999,
              backgroundColor: c.bg,
            }}
          >
            <Text style={{ fontSize: 11, color: c.fg }}>{application.category}</Text>
          </View>
        )}

        <Text style={{ fontSize: 12, color: "#6b7280" }}>
          応募日: {formatJpDate(application.appliedDate)}
        </Text>

        {!!application.nextStep && (
          <View
            style={{
              marginTop: 4,
              backgroundColor: "#f9fafb",
              borderRadius: 8,
              padding: 8,
            }}
          >
            <Text style={{ fontSize: 12, color: "#374151", fontWeight: "600" }}>
              次のステップ
            </Text>
            <Text style={{ fontSize: 12, color: "#4b5563", marginTop: 2 }}>
              {application.nextStep}
            </Text>
          </View>
        )}

        {/* 未読バッジ */}
        {application.hasUnreadMessages && (
          <View
            style={{
              alignSelf: "flex-start",
              borderWidth: 1,
              borderColor: "#fecaca",
              backgroundColor: "#fef2f2",
              paddingVertical: 4,
              paddingHorizontal: 8,
              borderRadius: 999,
              marginTop: 2,
            }}
          >
            <Text style={{ fontSize: 12, color: "#b91c1c" }}>
              未読メッセージ {application.messageCount}件
            </Text>
          </View>
        )}

        {/* アクション */}
        <View
          style={{
            marginTop: 8,
            flexDirection: "row",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <ButtonOutline label="求人を見る" onPress={() => onOpenJob(application.jobId)} />
          <ButtonOutline label="チャット" onPress={() => onOpenChat(application.id)} />
          <ButtonPrimary label="詳細を見る" onPress={() => onOpenJob(application.jobId)} />
        </View>
      </View>
    </View>
  );
}

// ---- Buttons ----
function ButtonOutline({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        backgroundColor: "#fff",
      }}
    >
      <Text style={{ fontSize: 12, color: "#334155" }}>{label}</Text>
    </Pressable>
  );
}
function ButtonPrimary({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: "#dc2626",
      }}
    >
      <Text style={{ fontSize: 12, color: "#fff", fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

// ---- 空状態 ----
function EmptyState({ onPressExplore }: { onPressExplore: () => void }) {
  return (
    <View
      style={{
        flex: 1,
        paddingHorizontal: 24,
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
      }}
    >
      <View
        style={{
          padding: 12,
          borderRadius: 999,
          backgroundColor: "#f3f4f6",
        }}
      >
        <Text style={{ fontSize: 14, color: "#9ca3af" }}>📄</Text>
      </View>
      <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827" }}>
        まだ応募履歴がありません
      </Text>
      <Text
        style={{
          fontSize: 12,
          color: "#6b7280",
          textAlign: "center",
          lineHeight: 18,
          marginTop: 2,
        }}
      >
        新しい求人に応募して、あなたのキャリアをスタートさせましょう。
      </Text>
      <ButtonPrimary label="求人を探す" onPress={onPressExplore} />
    </View>
  );
}