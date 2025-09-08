
/* --------------------------------------------------------------
   app/(student)/(tabs)/scout.tsx — スカウト一覧 (Mobile / Expo Router)
   - Web版(app/student/scouts/page.tsx)をReact Native向けに移植
   - 依存：expo-router, @supabase/supabase-js, react-native
   - 注意：`@/lib/supabase` のパスはプロジェクトに合わせてください
-------------------------------------------------------------- */
import { supabase } from "src/lib/supabase"; // ← 必要に応じて修正 (@/src/lib/supabase 等)
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

/* ------------------------------- 型 ------------------------------- */
// 必要最小限の型のみ定義（テーブル型は手入力で簡易化）
type ScoutRow = {
  id: string;
  company_id: string;
  student_id: string;
  job_id: string | null;
  message: string;
  status: "pending" | "accepted" | "declined";
  created_at: string | null;
  offer_position?: string | null;
  offer_amount?: string | null;
  accepted_at?: string | null;
  declined_at?: string | null;
};

type ScoutWithRelations = ScoutRow & {
  companies: { name: string; logo: string | null } | null;
  jobs: { title: string | null } | null;
};

export type UIScout = {
  id: string;
  companyName: string;
  position: string;
  offerPosition?: string | null;
  offerRange?: string | null;
  message: string;
  createdAt: string;
  status: "pending" | "accepted" | "declined" | "expired";
  daysLeft?: number;
  companyLogo: string;
  chatRoomId?: string;
};

/* ----------------------------- 画面本体 ---------------------------- */
export default function ScoutTabScreen() {
  const router = useRouter();

  const [authUid, setAuthUid] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [scouts, setScouts] = useState<UIScout[]>([]);

  const [statusTab, setStatusTab] = useState<"all" | "pending" | "accepted">("all");
  const [query, setQuery] = useState<string>("");

  // メッセージの折りたたみ管理（一覧では3行で省略、タップで全文表示）
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // 認証ユーザー取得
  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getUser();
      setAuthUid(data.user?.id ?? null);
    };
    run();
  }, []);

  // スカウト取得
  const fetchScouts = useCallback(async () => {
    setLoading(true);
    try {
      // 先にチャットルームを取得し、キー(company-student-job)→roomIdのMap化
      const { data: rooms } = await supabase
        .from("chat_rooms")
        .select("id, company_id, student_id, job_id");

      const roomMap = new Map<string, string>();
      if (rooms && authUid) {
        rooms.forEach((r: any) => {
          const key = `${r.company_id}-${authUid}-${r.job_id}`;
          roomMap.set(key, r.id);
        });
      }

      const { data, error } = await supabase
        .from("scouts")
        .select(`
  *,
  companies:companies!scouts_company_id_fkey(name, logo),
  jobs:jobs!scouts_job_id_fkey(title)
`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const ui: UIScout[] = (data ?? []).map((row: ScoutWithRelations) => {
        const createdAt = row.created_at ?? new Date().toISOString();
        const baseStatus = row.status === "accepted" ? "accepted" : row.status === "declined" ? "declined" : "pending";

        let uiStatus: UIScout["status"] = baseStatus;
        if (baseStatus === "pending" && row.created_at) {
          const created = new Date(row.created_at);
          const diffMs = Date.now() - created.getTime();
          if (diffMs > 14 * 24 * 60 * 60 * 1000) {
            uiStatus = "expired";
          }
        }

        let daysLeft: number | undefined = undefined;
        if (row.created_at) {
          const created = new Date(row.created_at);
          const left = 14 - Math.floor((Date.now() - created.getTime()) / 86_400_000);
          if (left >= 0) daysLeft = left;
        }

        const chatKey = authUid ? `${row.company_id}-${authUid}-${row.job_id}` : "";
        const chatRoomId = chatKey ? roomMap.get(chatKey) : undefined;

        return {
          id: row.id,
          companyName: row.companies?.name ?? "Unknown Company",
          position: row.jobs?.title ?? "Unknown Position",
          offerPosition: row.offer_position ?? null,
          offerRange: row.offer_amount ?? null,
          message: row.message,
          createdAt,
          status: uiStatus,
          daysLeft,
          companyLogo: row.companies?.logo ?? "",
          chatRoomId,
        };
      });

      setScouts(ui);
    } catch (e) {
      console.error("Failed to fetch scouts:", e);
    } finally {
      setLoading(false);
    }
  }, [authUid]);

  useEffect(() => {
    if (authUid !== null) {
      fetchScouts();
    }
  }, [authUid, fetchScouts]);

  /* ------------------------- アクション ---------------------------- */
  const patchStatus = useCallback(
    async (id: string, next: UIScout["status"]) => {
      if (!authUid) {
        Alert.alert("未ログイン", "ログイン情報を取得できませんでした");
        return;
      }

      setLoading(true);
      const now = new Date().toISOString();

      try {
        if (next === "accepted") {
          // スカウト行から必要なIDを取得
          const { data: sRow, error: sErr } = await supabase
            .from("scouts")
            .select("company_id, student_id, job_id, message")
            .eq("id", id)
            .single();
          if (sErr || !sRow) throw sErr;

          // 1) チャットルーム upsert
          const { data: chat, error: chatError } = await supabase
            .from("chat_rooms")
            .upsert(
              {
                company_id: sRow.company_id,
                student_id: authUid,
                job_id: sRow.job_id,
              },
              { onConflict: "company_id,student_id,job_id" }
            )
            .select()
            .single();
          if (chatError || !chat) throw chatError;

          // 2) 最初のメッセージが無ければ挿入
          const { count, error: cntErr } = await supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("chat_room_id", chat.id);
          if (cntErr) throw cntErr;

          if ((count ?? 0) === 0) {
            const { error: insErr } = await supabase.from("messages").insert({
              chat_room_id: chat.id,
              sender_id: sRow.company_id,
              content: sRow.message ?? "",
              is_read: false,
            });
            if (insErr) throw insErr;
          }

          // 3) ステータス更新
          const { error: updErr } = await supabase
            .from("scouts")
            .update({ status: "accepted", accepted_at: now })
            .eq("id", id);
          if (updErr) throw updErr;

          // 楽観的更新 + チャットへ
          setScouts(prev => prev.map(s => (s.id === id ? { ...s, status: "accepted", chatRoomId: chat.id } : s)));
          router.push({ pathname: "/(student)/chat/[id]", params: { id: String(chat.id) } });
        } else if (next === "declined") {
          const { error } = await supabase
            .from("scouts")
            .update({ status: "declined", declined_at: now })
            .eq("id", id);
          if (error) throw error;
          setScouts(prev => prev.map(s => (s.id === id ? { ...s, status: "declined" } : s)));
        }
      } catch (e: any) {
        console.error("Failed to patch status:", e);
        Alert.alert("更新に失敗しました", e?.message ?? "不明なエラー");
      } finally {
        setLoading(false);
      }
    },
    [authUid, router]
  );

  const handleAccept = (id: string) => patchStatus(id, "accepted");
  const handleDecline = (id: string) => patchStatus(id, "declined");

  /* --------------------------- フィルタ ---------------------------- */
  const displayedScouts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scouts.filter(s => {
      if (s.status === "declined") return false; // 学生には辞退済み非表示
      const matchesTab = statusTab === "all" || s.status === statusTab;
      const matchesQ =
        q === "" ||
        s.companyName.toLowerCase().includes(q) ||
        s.position.toLowerCase().includes(q) ||
        s.message.toLowerCase().includes(q) ||
        (s.offerPosition ?? "").toLowerCase().includes(q) ||
        (s.offerRange ?? "").toLowerCase().includes(q);
      return matchesTab && matchesQ;
    });
  }, [scouts, statusTab, query]);

  /* --------------------------- レンダリング ------------------------ */
  const renderItem = ({ item }: { item: UIScout }) => {
    const isExpanded = expandedIds.has(item.id);
    const isLong = (item.message || "").length > 120; // 120文字以上を長文とみなす
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          if (item.status !== "declined" && item.status !== "expired") {
            router.push({ pathname: "/(student)/scouts/[id]", params: { id: String(item.id) } });
          }
        }}
        style={[styles.card, (item.status === "declined" || item.status === "expired") && { opacity: 0.6 }]}
      >
        {/* Status badge */}
        <View style={[styles.badge, getBadgeStyle(item.status)]}>
          <Text style={styles.badgeText}>
            {item.status === "pending" ? "検討中" : item.status === "accepted" ? "承諾" : item.status === "declined" ? "辞退" : "期限切れ"}
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          {/* Company logo */}
          <View style={styles.logoWrap}>
            {item.companyLogo ? (
              <Image source={{ uri: item.companyLogo }} style={styles.logo} resizeMode="cover" />
            ) : (
              <View style={[styles.logo, { backgroundColor: "#eee" }]} />
            )}
          </View>

          {/* Meta */}
          <View style={{ flex: 1 }}>
            <Text style={styles.company}>{item.companyName}</Text>
            <Text style={styles.meta}>{item.offerPosition ?? item.position}</Text>
            <Text style={styles.meta}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            {item.status === "pending" && (
              <Text style={[styles.meta, item.daysLeft !== undefined && item.daysLeft <= 3 ? { color: "#dc2626", fontWeight: "600" } : undefined]}>
                期限まで残り{item.daysLeft}日
              </Text>
            )}
          </View>
        </View>

        {/* message */}
        <View style={styles.messageBox}>
          <Text style={styles.message} numberOfLines={isExpanded ? undefined : 3}>
            {item.message}
          </Text>
          {isLong && (
            <TouchableOpacity style={styles.expandBtn} onPress={() => toggleExpand(item.id)}>
              <Text style={styles.expandText}>{isExpanded ? "閉じる" : "全文を表示"}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* actions */}
        <View style={styles.actions}>
          {item.status === "pending" && (
            <>
              <TouchableOpacity
                style={[styles.button, styles.outlineDanger]}
                onPress={() => {
                  Alert.alert("確認", "本当に辞退しますか？ この操作は取り消せません。", [
                    { text: "キャンセル", style: "cancel" },
                    { text: "辞退する", style: "destructive", onPress: () => handleDecline(item.id) },
                  ]);
                }}
              >
                <Text style={[styles.buttonText, { color: "#b91c1c" }]}>辞退する</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.primaryGreen]} onPress={() => handleAccept(item.id)}>
                <Text style={[styles.buttonText, { color: "#fff" }]}>承諾する</Text>
              </TouchableOpacity>
            </>
          )}
          {item.status === "accepted" && item.chatRoomId && (
            <TouchableOpacity style={[styles.button, styles.primaryBlue]} onPress={() => router.push({ pathname: "/(student)/chat/[id]", params: { id: String(item.chatRoomId) } })}>
              <Text style={[styles.buttonText, { color: "#fff" }]}>チャットを開く</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.button, styles.solid]} onPress={() => router.push({ pathname: "/(student)/scouts/[id]", params: { id: String(item.id) } })}>
            <Text style={styles.buttonText}>詳細を見る</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      {/* Header / Search & Tabs */}
      <LinearGradient
        colors={["#DC2626", "#9333EA"]}
        start={{ x: -0.1, y: 0 }}
        end={{ x: 1, y: 1.2 }}
        style={styles.headerWrap}
      >
        <Text style={styles.headerTitle}>スカウト一覧</Text>
        <Text style={styles.headerSub}>企業から届いたスカウトを確認しましょう</Text>

        {/* Search */}
        <View style={styles.searchWrap}>
          <TextInput
            placeholder="企業名やポジションで検索"
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Simple Tabs */}
        <View style={styles.tabsWrap}>
          {(
            [
              { key: "all", label: "すべて" },
              { key: "pending", label: "未対応" },
              { key: "accepted", label: "承諾" },
            ] as const
          ).map(t => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setStatusTab(t.key)}
              style={[styles.tabBtn, statusTab === t.key && styles.tabBtnActive]}
            >
              <Text style={[styles.tabText, statusTab === t.key && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {loading && (
        <View style={{ paddingTop: 24 }}>
          <ActivityIndicator />
        </View>
      )}

      {!loading && displayedScouts.length === 0 && (
        <View style={styles.emptyBox}>
          <Text style={{ color: "#4b5563" }}>現在表示できるスカウトはありません</Text>
        </View>
      )}

      <FlatList
        data={displayedScouts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 16 }}
      />
    </View>
  );
}

/* ------------------------------- Styles ------------------------------ */
const styles = StyleSheet.create({
  headerWrap: {
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "700" },
  headerSub: { color: "#fff", opacity: 0.9, marginTop: 4 },
  searchWrap: { marginTop: 16, backgroundColor: "#fff", borderRadius: 12, padding: 8 },
  searchInput: { height: 40, paddingHorizontal: 8, color: "#111827" },
  tabsWrap: {
    marginTop: 12,
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderRadius: 999,
    padding: 4,
    gap: 6,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: "center",
  },
  tabBtnActive: { backgroundColor: "#fff" },
  tabText: { color: "#6b7280", fontSize: 12, fontWeight: "600" },
  tabTextActive: { color: "#111827" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  badge: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badgeText: { fontSize: 12, fontWeight: "600" },
  logoWrap: { width: 56, height: 56, borderRadius: 28, overflow: "hidden", backgroundColor: "#f3f4f6" },
  logo: { width: 56, height: 56 },
  company: { fontSize: 16, fontWeight: "700", color: "#111827" },
  meta: { marginTop: 4, color: "#6b7280", fontSize: 12 },
  message: { color: "#374151", lineHeight: 20, fontSize: 14 },
  messageBox: { marginTop: 12, backgroundColor: "#f9fafb", borderRadius: 10, padding: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: "#e5e7eb" },
  expandBtn: { marginTop: 8, alignSelf: "flex-start", paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, backgroundColor: "#eef2ff" },
  expandText: { fontSize: 12, fontWeight: "700", color: "#3730a3" },
  actions: { marginTop: 16, flexDirection: "row", justifyContent: "flex-end", flexWrap: "wrap", gap: 8 },
  button: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: "#e5e7eb" },
  buttonText: { color: "#111827", fontWeight: "600" },
  solid: { backgroundColor: "#f3f4f6" },
  primaryGreen: { backgroundColor: "#16a34a", borderColor: "#16a34a" },
  primaryBlue: { backgroundColor: "#7c3aed", borderColor: "#7c3aed" },
  outlineDanger: { backgroundColor: "#fff", borderColor: "#fecaca" },
  emptyBox: { marginTop: 24, marginHorizontal: 16, borderWidth: 1, borderStyle: "dashed", borderColor: "#d1d5db", backgroundColor: "#f9fafb", borderRadius: 12, padding: 24, alignItems: "center" },
});

function getBadgeStyle(status: UIScout["status"]) {
  switch (status) {
    case "pending":
      return { backgroundColor: "#fef9c3", borderColor: "#fde68a" };
    case "accepted":
      return { backgroundColor: "#dcfce7", borderColor: "#bbf7d0" };
    case "declined":
      return { backgroundColor: "#fee2e2", borderColor: "#fecaca" };
    case "expired":
    default:
      return { backgroundColor: "#e5e7eb", borderColor: "#d1d5db" };
  }
}