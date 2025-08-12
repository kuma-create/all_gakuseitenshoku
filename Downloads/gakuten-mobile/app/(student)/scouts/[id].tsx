

// app/(student)/scouts/[id].tsx — スカウト詳細（モバイル）
import { supabase } from "@/lib/supabase";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

/* ----------------------------- 型 ------------------------------ */
type ScoutDetail = {
  id: string;
  message: string | null;
  created_at: string | null;
  status: "new" | "sent" | "accepted" | "declined";
  offer_position?: string | null;
  offer_amount?: string | null;
  companies?: { id: string; name: string; logo: string | null; industry?: string | null; employee_count?: string | null; location?: string | null; description?: string | null } | null;
  jobs?: { id: string; title: string | null } | null;
  company_id: string;
  student_id: string;
  job_id: string | null;
};

type CompanyInfo = {
  id: string;
  name: string;
  logo: string | null;
  industry: string | null;
  employee_count: string | null;
  location: string | null;
  description: string | null;
};

type JobSummary = {
  id: string;
  title: string | null;
  location: string | null;
  salary_range: string | null;
};

export default function ScoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [data, setData] = useState<ScoutDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [chatRoomId, setChatRoomId] = useState<string | null>(null);

  const badgeStyle = useMemo(() => {
    switch (data?.status) {
      case "new":
        return styles.badgeBlue;
      case "sent":
        return styles.badgeYellow;
      case "accepted":
        return styles.badgeGreen;
      default:
        return styles.badgeGray;
    }
  }, [data?.status]);

  const fetchAll = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const { data: scout, error: scoutErr } = await supabase
        .from("scouts")
        .select(
          `
            id, message, created_at, status,
            offer_position, offer_amount,
            company_id, student_id, job_id,
            companies:companies!scouts_company_id_fkey(
              id, name, logo, industry, employee_count, location, description
            ),
            jobs:jobs!scouts_job_id_fkey(id, title)
          `
        )
        .eq("id", id as string)
        .maybeSingle();

      if (scoutErr || !scout) {
        setError("スカウトが見つかりませんでした。");
        setLoading(false);
        return;
      }

      const casted = scout as unknown as ScoutDetail;
      setData(casted);

      const c = (scout as any).companies as CompanyInfo | null;
      if (c) setCompany(c);

      if (c?.id) {
        const { data: jobList } = await supabase
          .from("jobs")
          .select("id, title, location, salary_range")
          .eq("company_id", c.id)
          .eq("is_active", true);
        if (jobList) setJobs(jobList as unknown as JobSummary[]);
      }

      const { data: room } = await supabase
        .from("chat_rooms")
        .select("id")
        .eq("company_id", (scout as any).company_id)
        .eq("student_id", (scout as any).student_id)
        .eq("job_id", (scout as any).job_id)
        .maybeSingle();
      if (room?.id) setChatRoomId(room.id);
    } catch (e) {
      setError("読み込み中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const patchStatus = useCallback(
    async (next: "accepted" | "declined") => {
      if (!data) return;
      const updates: Record<string, any> = { status: next };
      const now = new Date().toISOString();
      if (next === "accepted") updates.accepted_at = now;
      if (next === "declined") updates.declined_at = now;

      const { error: upErr } = await supabase
        .from("scouts")
        .update(updates)
        .eq("id", data.id);

      if (upErr) {
        Alert.alert("更新に失敗しました");
        return;
      }

      if (next === "accepted") {
        // チャットルームを upsert
        const { data: chat, error: chatErr } = await supabase
          .from("chat_rooms")
          .upsert(
            {
              company_id: data.company_id,
              student_id: data.student_id,
              job_id: data.job_id,
            },
            { onConflict: "company_id,student_id,job_id" }
          )
          .select()
          .single();

        if (chatErr || !chat) {
          console.error("chat upsert error", chatErr);
        } else {
          // 最初のメッセージがなければ作成
          const { count, error: countErr } = await supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("chat_room_id", chat.id);
          if (!countErr && (count ?? 0) === 0) {
            await supabase.from("messages").insert({
              chat_room_id: chat.id,
              sender_id: data.company_id, // 会社からの最初の挨拶として
              content: data.message ?? "",
              is_read: false,
            });
          }
          setChatRoomId(chat.id);
          router.push({ pathname: "/(student)/chats/[id]", params: { id: chat.id } });
        }
      }

      setData({ ...data, status: next });
    },
    [data, router]
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12, color: "#666" }}>読み込み中…</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: "#c00", marginBottom: 16 }}>{error ?? "エラーが発生しました"}</Text>
        <TouchableOpacity style={styles.ghostBtn} onPress={() => router.back()}>
          <Text style={styles.ghostBtnText}>戻る</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "スカウト詳細", headerBackTitle: "戻る" }} />
      <ScrollView style={{ flex: 1, backgroundColor: "#f7f7f7" }} contentContainerStyle={{ padding: 16 }}>
        {/* Header */}
        <View style={styles.card}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Image
              source={{ uri: data.companies?.logo || "https://placehold.co/96x96/png" }}
              style={styles.logo}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.companyName}>{data.companies?.name ?? "企業名未登録"}</Text>
              <Text style={styles.jobTitle}>{data.jobs?.title ?? "—"}</Text>
            </View>
            <View style={[styles.badgeBase, badgeStyle]}>
              <Text style={styles.badgeText}>
                {data.status === "new"
                  ? "新着"
                  : data.status === "sent"
                  ? "未対応"
                  : data.status === "accepted"
                  ? "承諾"
                  : "辞退"}
              </Text>
            </View>
          </View>

          {/* Scout message */}
          {Boolean(data.message) && (
            <Text style={styles.message}>{data.message}</Text>
          )}
          <Text style={styles.metaText}>
            {data.created_at ? new Date(data.created_at).toLocaleDateString() : "--"}
          </Text>

          {/* Offer panel */}
          <View style={styles.offerBox}>
            <Text style={styles.offerTitle}>オファー内容</Text>
            <Text style={styles.offerItem}><Text style={styles.offerLabel}>ポジション: </Text>{data.offer_position ?? "—"}</Text>
            <Text style={styles.offerItem}><Text style={styles.offerLabel}>年収レンジ: </Text>{data.offer_amount ? `${data.offer_amount} 万円` : "未定"}</Text>
          </View>

          {/* Company info */}
          {company && (
            <View style={styles.companyBox}>
              <Image source={{ uri: company.logo ?? "https://placehold.co/160x160/png" }} style={styles.companyLogoLarge} />
              <View style={{ flex: 1 }}>
                <Text style={styles.companyNameLg}>{company.name}</Text>
                <Text style={styles.companyLine}>{company.industry ?? "—"}</Text>
                <Text style={styles.companyLine}>{company.employee_count ?? "—"} 名規模</Text>
                <Text style={styles.companyLine}>{company.location ?? "—"}</Text>
                <Text style={styles.companyDesc}>{company.description ?? "企業説明は未登録です。"}</Text>
              </View>
            </View>
          )}

          {/* Job list */}
          {jobs.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <Text style={styles.sectionTitle}>公開求人</Text>
              {jobs.map((job) => (
                <View key={job.id} style={styles.jobRow}>
                  <Text style={styles.jobTitleRow}>{job.title}</Text>
                  <Text style={styles.jobMeta}>{job.location ?? "—"}  ／  {job.salary_range ?? "—"}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Action footer */}
          {data.status === "sent" && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.outlineBtn, { borderColor: "#f2b2b2" }]}
                onPress={() => {
                  Alert.alert("確認", "本当に辞退しますか？ この操作は取り消せません。", [
                    { text: "キャンセル", style: "cancel" },
                    { text: "辞退する", style: "destructive", onPress: () => patchStatus("declined") },
                  ]);
                }}
              >
                <Text style={[styles.outlineBtnText, { color: "#c0392b" }]}>辞退する</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => patchStatus("accepted")}>
                <Text style={styles.primaryBtnText}>承諾する</Text>
              </TouchableOpacity>
            </View>
          )}

          {data.status === "accepted" && chatRoomId && (
            <TouchableOpacity
              style={[styles.primaryBtn, { marginTop: 12, backgroundColor: "#2563eb" }]}
              onPress={() => router.push({ pathname: "/(student)/chats/[id]", params: { id: chatRoomId } })}
            >
              <Text style={styles.primaryBtnText}>チャットを開く</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fafafa", padding: 16 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, gap: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2 },
  logo: { width: 56, height: 56, borderRadius: 28, marginRight: 12, backgroundColor: "#fff" },
  companyName: { fontSize: 16, fontWeight: "700" },
  jobTitle: { fontSize: 12, color: "#666", marginTop: 2 },
  badgeBase: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  badgeBlue: { backgroundColor: "#3b82f6" },
  badgeYellow: { backgroundColor: "#fde047" },
  badgeGreen: { backgroundColor: "#22c55e" },
  badgeGray: { backgroundColor: "#9ca3af" },
  message: { marginTop: 12, lineHeight: 20, color: "#222" },
  metaText: { marginTop: 6, color: "#6b7280", fontSize: 12 },
  offerBox: { marginTop: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: "#e5e7eb", backgroundColor: "#f9fafb", borderRadius: 8, padding: 12 },
  offerTitle: { fontSize: 13, fontWeight: "700", color: "#6b7280", marginBottom: 6 },
  offerItem: { fontSize: 13, color: "#111", marginTop: 2 },
  offerLabel: { fontWeight: "600" },
  companyBox: { flexDirection: "row", gap: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: "#e5e7eb", borderRadius: 8, padding: 12, backgroundColor: "#fff", marginTop: 12 },
  companyLogoLarge: { width: 72, height: 72, borderRadius: 8, marginRight: 8, backgroundColor: "#fff" },
  companyNameLg: { fontSize: 16, fontWeight: "700" },
  companyLine: { fontSize: 13, color: "#4b5563", marginTop: 2 },
  companyDesc: { fontSize: 13, color: "#374151", marginTop: 8 },
  sectionTitle: { fontSize: 14, fontWeight: "700", marginBottom: 8 },
  jobRow: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: 8, backgroundColor: "#f9fafb", borderWidth: StyleSheet.hairlineWidth, borderColor: "#e5e7eb", marginBottom: 8 },
  jobTitleRow: { fontSize: 14, fontWeight: "600" },
  jobMeta: { fontSize: 12, color: "#6b7280", marginTop: 4 },
  actionRow: { flexDirection: "row", gap: 12, marginTop: 16, justifyContent: "flex-end" },
  outlineBtn: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 8, borderWidth: 1, backgroundColor: "#fff" },
  outlineBtnText: { fontSize: 15, fontWeight: "700" },
  primaryBtn: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 8, backgroundColor: "#16a34a" },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  ghostBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: "#f3f4f6" },
  ghostBtnText: { fontWeight: "700" },
});