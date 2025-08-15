

/* ────────────────────────────────────────────────────────────────
   app/(student)/jobs/[id].tsx – モバイル版：求人/インターン/イベント 詳細
   Expo Router / React Native 版（Shadcn 依存なし）
   2025-08-12
──────────────────────────────────────────────────────────────── */

import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PostgrestError } from "@supabase/supabase-js";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    PanResponder,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { supabase } from "src/lib/supabase"; // <- プロジェクトの実体に合わせてあります（@/src/lib/supabase）

/* ============================================================
 * 基本型（最小限）
 * ============================================================ */
type Company = {
  id: string;
  name?: string | null;
  logo?: string | null;
  industry?: string | null;
  founded_year?: number | null;
  employee_count?: number | null;
  location?: string | null;
  description?: string | null;
};

type Job = {
  id: string;
  title?: string | null;
  description?: string | null;
  location?: string | null;
  status?: string | null;
  selection_type?: "fulltime" | "intern" | "intern_long" | "event" | string | null;
  created_at?: string | null;
  deadline?: string | null;
  work_style?: string | null;
  salary_range?: string | null;
  working_days?: string | null;
  working_hours?: string | null;
  event_date?: string | null;
  event_time?: string | null;
  format?: string | null;

  // 旧スキーマ互換フィールド（存在する場合のみ使用）
  benefits?: string | null;
  requirements?: string | null;
  qualifications?: string | null;
  preferred_skills?: string | null;
  skills?: string | null;
  schedule?: string | null;

  // リレーション（select の結果が array または object で返る可能性あり）
  companies?: Company | Company[] | null;
  company?: Company | Company[] | null;

  // 詳細テーブル
  fulltime_details?: any[] | any | null;
  intern_long_details?: any[] | any | null;
  internship?: any | null;

  // サーバー側で生成済みの補助フィールド想定
  workHoursList?: string[] | null;
  requirementsList?: string[] | null;
  qualificationsList?: string[] | null;
  skillsList?: string[] | null;

  // タグ（存在すれば）
  tags?: string[] | null;
};

type RelatedJob = {
  id: string;
  title?: string | null;
  location?: string | null;
  salary_range?: string | null;
  status?: string | null;
  company?: { name?: string | null; logo?: string | null } | null;
};

type FetchState =
  | { kind: "loading" }
  | { kind: "error"; error: string }
  | {
      kind: "ready";
      job: Job;
      company: Company;
      tags: string[];
      related: RelatedJob[];
      hasApplied: boolean;
    };

/* ============================================================
 * 画面本体
 * ============================================================ */
export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [state, setState] = useState<FetchState>({ kind: "loading" });
  const [showConfirm, setShowConfirm] = useState(false);

  // Gesture handler for swipe back navigation
  const EDGE_WIDTH = 24; // px from the left edge to recognize swipe
  const startXRef = useRef(0);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt, _gs) => {
        // record where the touch started, only care about left edge
        startXRef.current = evt.nativeEvent.pageX || 0;
        return false; // don't capture yet
      },
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        // Disable on web; allow iOS/Android only
        if (Platform.OS === "web") return false;
        // Only if started near the left edge
        if (startXRef.current > EDGE_WIDTH) return false;
        // Mostly horizontal move to the right
        const horizontal = Math.abs(gestureState.dx) > 12 && Math.abs(gestureState.dy) < 10;
        const rightward = gestureState.dx > 0;
        return horizontal && rightward;
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (gestureState.dx > 50 && Math.abs(gestureState.dy) < 30) {
          router.back();
        }
      },
    })
  ).current;

  const fetchData = useCallback(async () => {
    if (!id) return;

    setState({ kind: "loading" });

    // 1) ジョブ本体＋会社＋詳細
    const { data: jobData, error: jobErr } = await supabase
      .from("jobs")
      .select(`
        *,
        companies(*),
        fulltime_details(*),
        intern_long_details:intern_long_details!job_id(*)
      `)
      .eq("id", id)
      .maybeSingle();

    if (jobErr || !jobData) {
      return setState({
        kind: "error",
        error: jobErr?.message || "求人が見つかりませんでした。",
      });
    }

    // company 正規化 + relation が無い場合 jobs.company_id を fallback
    const companyRel =
      (Array.isArray(jobData.companies) ? jobData.companies[0] : jobData.companies) ||
      (Array.isArray(jobData.company) ? jobData.company[0] : jobData.company) ||
      {};
    const companyIdFromJob = (jobData as any)?.company_id ?? null;
    const company = {
      ...companyRel,
      // 会社IDが relation で取れない場合、jobs.company_id を採用
      id: (companyRel as any)?.id ?? companyIdFromJob ?? null,
    } as Company;

    // 2) タグ（存在すれば）
    let tags: string[] = [];
    {
      const { data: tagRows } = await supabase
        .from("job_tags")
        .select("tag")
        .eq("job_id", id);
      if (tagRows && Array.isArray(tagRows)) {
        tags = tagRows.map((t: any) => String(t.tag)).filter(Boolean);
      }
    }

    // 3) 関連求人（同一会社＆公開中のみ）
    let related: RelatedJob[] = [];
    if (company?.id) {
      const { data: relRows } = await supabase
        .from("jobs")
        .select(
          `
          id, title, location, status, salary_range,
          companies(name, logo)
        `
        )
        .eq("company_id", company.id)
        .neq("id", id)
        .limit(10);
      related = (relRows as any[]) || [];
    }

    // 4) 既に応募したかどうか
    let hasApplied = false;
    const { data: sessionRes } = await supabase.auth.getSession();
    const userId = sessionRes?.session?.user?.id;
    if (userId) {
      const { data: prof } = await supabase
        .from("student_profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      if (prof?.id) {
        const { data: appRows } = await supabase
          .from("applications")
          .select("id")
          .eq("job_id", id)
          .eq("student_id", prof.id)
          .limit(1);
        hasApplied = !!(appRows && appRows.length);
      }
    }

    setState({
      kind: "ready",
      job: jobData as Job,
      company: company as Company,
      tags,
      related,
      hasApplied,
    });
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const apply = useCallback(async () => {
    // applications へ insert（既に応募済みならスルー）
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/auth/login");
      return;
    }

    const { data: profile, error: profErr } = await supabase
      .from("student_profiles")
      .select("id")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (profErr || !profile?.id) {
      router.push("/auth/signup");
      return;
    }

    // 1) 応募登録
    let alreadyApplied = false;
    try {
      const { error: appErr } = await supabase.from("applications").insert({
        job_id: id,
        student_id: profile.id,
      });
      if (appErr) {
        // 一意制約違反（すでに応募済み）なら継続。それ以外は throw
        // PostgREST 経由では details に 23505 が入ることが多い
        const code = (appErr as any)?.code || (appErr as any)?.details;
        if (code && String(code).includes("23505")) {
          alreadyApplied = true;
        } else {
          throw appErr;
        }
      }
      // 楽観的に UI 更新
      setState((prev) => (prev.kind === "ready" ? { ...prev, hasApplied: true } : prev));
    } catch (e) {
      const msg = (e as PostgrestError)?.message ?? "応募に失敗しました";
      Alert.alert("エラー", msg);
      return;
    }

    // 2) チャットルーム upsert（必ず company_id を付与する）
    try {
      // company_id を安全に取得
      let companyId: string | null = null;
      if (state.kind === "ready") {
        companyId = (state.company?.id as string | null) ?? null;
        // 最終手段: ジョブの生フィールドから
        if (!companyId) companyId = (state.job as any)?.company_id ?? null;
      }

      if (!companyId) {
        throw new Error("company_id を特定できませんでした");
      }

      const { data: room, error: roomErr } = await supabase
        .from("chat_rooms")
        .upsert(
          {
            company_id: companyId,
            student_id: profile.id,
            job_id: id,
          },
          {
            // テーブル側のユニークインデックス (company_id,student_id,job_id) に合わせる
            onConflict: "company_id,student_id,job_id",
          }
        )
        .select()
        .single();

      if (roomErr) throw roomErr as any;

      // 3) 自動メッセージ（失敗しても致命的ではないので握りつぶす）
      try {
        await supabase.from("messages").insert({
          chat_room_id: (room as any).id,
          sender_id: profile.id,
          content: alreadyApplied ? "（再表示）応募済みです" : "求人に応募しました！！",
        });
      } catch {}

      // チャットへ遷移
      router.push(`/chat/${(room as any).id}`);
    } catch (e) {
      // チャット作成に失敗しても応募自体は完了させる
      const maybePg = e as any;
      const detail = maybePg?.message || maybePg?.hint || maybePg?.details || String(e);
      Alert.alert("注意", `応募は完了しましたが、チャット作成に失敗しました\n${detail}`);
    }
  }, [id, router, state]);

  // 共通ヘッダー
  const headerTitle = useMemo(() => {
    if (state.kind !== "ready") return "求人詳細";
    const t = state.job.selection_type;
    if (t === "event") return "イベント詳細";
    if (t === "intern" || t === "intern_long") return "インターン詳細";
    return "求人詳細";
  }, [state]);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#fff" }}
      {...panResponder.panHandlers}
    >
      <Stack.Screen
        options={{
          title: headerTitle,
          headerBackTitle: "戻る",
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              style={{ marginLeft: 8, padding: 6 }}
              hitSlop={8}
              accessibilityLabel="戻る"
              accessibilityRole="button"
            >
              <Feather name="chevron-left" size={24} color="#111827" />
            </Pressable>
          ),
          headerTitleAlign: "center",
        }}
      />
      {state.kind === "loading" && (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.muted}>読み込み中...</Text>
        </View>
      )}
      {state.kind === "error" && (
        <View style={styles.center}>
          <Text style={styles.errorText}>{state.error}</Text>
          <Pressable style={styles.primaryBtn} onPress={fetchData}>
            <Text style={styles.primaryBtnText}>再読み込み</Text>
          </Pressable>
        </View>
      )}
      {state.kind === "ready" && (
        <ScrollView contentContainerStyle={{ paddingBottom: 88 }}>
          <HeaderBlock job={state.job} company={state.company} tags={state.tags} />

          {/* 種別ごとの詳細 */}
          {state.job.selection_type === "event" ? (
            <EventSection job={state.job} />
          ) : state.job.selection_type === "intern" ||
            state.job.selection_type === "intern_long" ? (
            <InternSection job={state.job} />
          ) : (
            <FulltimeSection job={state.job} />
          )}

          {/* 右カラム相当：応募 / 保存 / 企業情報 / 関連 */}
          <ApplyCard
            hasApplied={state.hasApplied}
            onApplyPress={async () => {
              try {
                await ensureCanApply(router);
                setShowConfirm(true);
              } catch (e: any) {
                // ensureCanApply が遷移するためここには来ない想定
              }
            }}
          />

          <CompanyCard company={state.company} />

          <RelatedCard related={state.related} />
        </ScrollView>
      )}

      {/* 応募確認ダイアログ（簡易版） */}
      {showConfirm && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>応募を確定しますか？</Text>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowConfirm(false)}
                style={[styles.outlineBtn, { flex: 1, marginRight: 8 }]}
              >
                <Text style={styles.outlineBtnText}>キャンセル</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  try {
                    await apply();
                  } catch (e: any) {
                    Alert.alert("エラー", (e as PostgrestError)?.message ?? "応募に失敗しました");
                  } finally {
                    setShowConfirm(false);
                  }
                }}
                style={[styles.primaryBtn, { flex: 1, marginLeft: 8 }]}
              >
                <Text style={styles.primaryBtnText}>応募を確定</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

/* ============================================================
 * 共通ブロック
 * ============================================================ */
function HeaderBlock({ job, company, tags }: { job: Job; company: Company; tags: string[] }) {
  const isNew =
    job?.created_at &&
    new Date(job.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000;

  return (
    <View style={styles.headerCard}>
      <View style={{ height: 96, backgroundColor: "#dc2626", opacity: 0.9 }} />
      <View style={{ marginTop: -24, padding: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Image
            source={
              company?.logo ? { uri: company.logo } : require("../../../assets/images/placeholder-avatar.png")
            }
            style={styles.logo}
            resizeMode="cover"
          />
          <View style={{ flex: 1, paddingTop: 8 }}>
            <Text style={styles.jobTitle} numberOfLines={3}>
              {normalizeTitle(job?.title)}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center" }}>
              <Text style={styles.companyLink}>{(company?.name || "企業名").trim()}</Text>
              {isNew && <View style={styles.badgeNew}><Text style={styles.badgeNewText}>新着</Text></View>}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 6 }}>
              {tags.map((t, i) => (
                <View key={`${t}_${i}`} style={styles.tag}>
                  <Text style={styles.tagText}>{t}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* summary */}
      <View style={styles.summaryGrid}>
        {/* 左2枠は種別ごとに出し分けるので、各セクション内で追加表示 */}
        <SummaryItem label="勤務地" value={job?.location ?? (job?.selection_type === "event" ? "オンライン" : "—")} />
        {job?.selection_type === "event" ? (
          <>
            <SummaryItem
              label="開催日"
              value={job?.event_date ? new Date(job.event_date).toLocaleDateString("ja-JP") : "調整中"}
            />
            <SummaryItem label="時間" value={job?.event_time ?? "—"} />
            <SummaryItem label="形式" value={job?.format ?? "未定"} />
          </>
        ) : (
          <>
            <SummaryItem label="勤務形態" value={job?.work_style ?? "ハイブリッド"} />
            <SummaryItem
              label="応募締切"
              value={
                job?.deadline ? new Date(job.deadline).toLocaleDateString("ja-JP") : "期限なし"
              }
            />
          </>
        )}
      </View>
    </View>
  );
}

function ApplyCard({ hasApplied, onApplyPress }: { hasApplied: boolean; onApplyPress: () => void }) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem("savedJobsMobile");
      setSaved(raw === "1");
    })();
  }, []);

  return (
    <View style={styles.card}>
      <View style={styles.noticeBox}>
        <Text style={styles.noticeTitle}>
          {hasApplied ? "応募済みです" : "この求人に興味がありますか？"}
        </Text>
        {!hasApplied && <Text style={styles.mutedSmall}>応募はカンタン1分で完了します</Text>}
      </View>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Pressable
          style={[styles.primaryBtn, { flex: 1, opacity: hasApplied ? 0.6 : 1 }]}
          disabled={hasApplied}
          onPress={onApplyPress}
        >
          <Text style={styles.primaryBtnText}>{hasApplied ? "応募済み" : "この求人に応募する"}</Text>
        </Pressable>
        <Pressable
          style={[saved ? styles.savedBtn : styles.outlineBtn, { flex: 1 }]}
          onPress={async () => {
            const next = !saved;
            setSaved(next);
            await AsyncStorage.setItem("savedJobsMobile", next ? "1" : "0");
          }}
        >
          <Text style={saved ? styles.savedBtnText : styles.outlineBtnText}>
            {saved ? "興味ありに登録済み" : "興味ありに登録"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function CompanyCard({ company }: { company: Company }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>企業情報</Text>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <Image
          source={
            company?.logo ? { uri: company.logo } : require("../../../assets/images/placeholder-avatar.png")
          }
          style={styles.companyLogo}
          resizeMode="cover"
        />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={styles.companyName}>{company?.name ?? "企業名"}</Text>
          {!!company?.industry && <Text style={styles.mutedSmall}>{company.industry}</Text>}
        </View>
      </View>
      <InfoLine label="所在地" value={company?.location} />
      <InfoLine label="社員数" value={company?.employee_count ? `${company.employee_count}名` : undefined} />
      <InfoLine label="設立" value={company?.founded_year ? `${company.founded_year}年` : undefined} />
      {!!company?.description && <Text style={[styles.body, { marginTop: 8 }]}>{company.description}</Text>}
    </View>
  );
}

function RelatedCard({ related }: { related: RelatedJob[] }) {
  const router = useRouter();
  const openRelated = related.filter((r) => (r.status ?? "open") === "open");
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>関連求人</Text>
      {openRelated.length ? (
        openRelated.map((rel) => (
          <Pressable
            key={rel.id}
            onPress={() => router.push(`/jobs/${rel.id}`)}
            style={styles.relatedItem}
          >
            <Image
              source={
                rel.company?.logo
                  ? { uri: rel.company.logo }
                  : require("../../../assets/images/placeholder-avatar.png")
              }
              style={styles.relatedLogo}
              resizeMode="cover"
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.relatedTitle}>{rel.title ?? "—"}</Text>
              <Text style={styles.mutedSmall}>{rel.company?.name ?? "—"}</Text>
              <Text style={styles.mutedSmall}>
                {(rel.location ?? "—") + (rel.salary_range ? ` ・ ${rel.salary_range}` : "")}
              </Text>
            </View>
          </Pressable>
        ))
      ) : (
        <Text style={styles.muted}>関連する求人はありません</Text>
      )}
    </View>
  );
}

/* ============================================================
 * 種別セクション
 * ============================================================ */
function FulltimeSection({ job }: { job: Job }) {
  const details = Array.isArray(job.fulltime_details)
    ? job.fulltime_details[0]
    : job.fulltime_details ?? null;

  // 勤務時間
  const hoursParts: string[] = [];
  if (Array.isArray(job.workHoursList) && job.workHoursList.length) {
    hoursParts.push(...job.workHoursList.map((w) => String(w).trim()).filter(Boolean));
  }
  if (details?.working_days) hoursParts.push(String(details.working_days));
  if (details?.working_hours) hoursParts.push(String(details.working_hours));
  if (job?.working_days) hoursParts.push(String(job.working_days));
  if (job?.working_hours) hoursParts.push(String(job.working_hours));
  if (!hoursParts.length) hoursParts.push("9:00〜18:00（休憩1時間）");
  const workingHours = [...new Set(hoursParts)].join(" / ");

  const salary =
    job?.salary_range && job.salary_range.trim() !== "" ? job.salary_range : "非公開";

  const benefits: string[] = Array.isArray(details?.benefits_list)
    ? details.benefits_list
    : (details?.benefits ?? job?.["benefits"] ?? "")
        .split(/\r?\n|・|,|、|／|\//)
        .map((b: string) => b.trim())
        .filter(Boolean);

  const requirementsRaw =
    job?.requirementsList ??
    job?.qualificationsList ??
    job?.["requirements"] ??
    job?.["qualifications"] ??
    "";

  const skillsRaw = job?.skillsList ?? job?.["preferred_skills"] ?? job?.["skills"] ?? "";

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>業務内容</Text>
      <BodyText html={job?.description} />

      <Text style={[styles.cardTitle, { marginTop: 16 }]}>応募条件・スキル</Text>
      <BulletSection title="応募資格" items={requirementsRaw} />
      <BulletSection title="歓迎スキル" items={skillsRaw} />

      <Text style={[styles.cardTitle, { marginTop: 16 }]}>勤務時間・給与</Text>
      <InfoLine label="勤務時間" value={workingHours} />
      <InfoLine label="給与" value={`${salary}（経験・能力により決定）`} />
      {!!benefits.length && (
        <View style={{ marginTop: 8 }}>
          <Text style={styles.subTitle}>福利厚生</Text>
          {benefits.map((b, i) => (
            <Text key={`${b}_${i}`} style={styles.body}>・{b}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

function InternSection({ job }: { job: Job }) {
  const intern =
    (Array.isArray(job.intern_long_details) ? job.intern_long_details[0] : job.intern_long_details) ??
    job.internship ??
    {};

  const minDuration = intern.min_duration_months
    ? `${intern.min_duration_months}ヶ月〜`
    : "応相談";

  const days =
    typeof intern.work_days_per_week === "number"
      ? `週${intern.work_days_per_week}日`
      : intern.working_days ?? "応相談";

  const remuneration =
    intern.remuneration_type === "commission"
      ? intern.commission_rate
        ? `歩合 ${intern.commission_rate}`
        : "歩合"
      : intern.hourly_wage
      ? `${Number(intern.hourly_wage).toLocaleString()}円／時`
      : "要相談";

  const workingHours =
    intern.working_hours?.trim?.()
      ? intern.working_hours
      : job.working_hours?.trim?.()
      ? job.working_hours
      : "9:00〜18:00（休憩1時間）";

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>インターン内容</Text>
      <BodyText html={job?.description} />

      <View style={{ marginTop: 12 }}>
        <InfoLine label="最低参加期間" value={minDuration} />
        <InfoLine label="週あたりの勤務日数" value={days} />
        <InfoLine label="報酬" value={remuneration} />
        <InfoLine label="勤務地" value={job.location ?? "オンライン可"} />
      </View>

      <Text style={[styles.cardTitle, { marginTop: 16 }]}>応募条件</Text>
      <BulletSection items={job?.["requirements"] ?? ""} />
      <View style={{ marginTop: 12 }}>
        <Text style={styles.subTitle}>備考</Text>
        <InfoLine label="交通費" value={intern?.travel_expense ?? "—"} />
        <InfoLine label="最寄駅" value={intern?.nearest_station ?? "—"} />
        <InfoLine label="福利厚生" value={intern?.benefits ?? "—"} />
        <InfoLine label="勤務時間" value={workingHours} />
      </View>
    </View>
  );
}

function EventSection({ job }: { job: Job }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>イベント概要</Text>
      <BodyText html={job?.description} />
      {!!job?.["schedule"] && (
        <>
          <Text style={[styles.cardTitle, { marginTop: 16 }]}>スケジュール</Text>
          <BodyText html={job["schedule"]} />
        </>
      )}
    </View>
  );
}

/* ============================================================
 * 共有 UI ヘルパー
 * ============================================================ */
function SummaryItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value ?? "—"}</Text>
    </View>
  );
}

function InfoLine({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.infoLine}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function BulletSection({
  title,
  items,
}: {
  title?: string;
  items?: string | string[];
}) {
  const list = Array.isArray(items)
    ? items
    : (items ?? "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
  if (!list.length) return null;
  return (
    <View style={{ marginTop: 8 }}>
      {!!title && <Text style={styles.subTitle}>{title}</Text>}
      {list.map((t, i) => (
        <Text key={`${t}_${i}`} style={styles.body}>
          ・{t}
        </Text>
      ))}
    </View>
  );
}

/** シンプルな改行置換版（危険な HTML は扱わない） */
function BodyText({ html }: { html?: string | null }) {
  if (!html) return <Text style={styles.body}>—</Text>;
  // 改行 → \n
  const text = html.replace(/&lt;br ?\/?&gt;|&lt;br&gt;|<br ?\/?>/gi, "\n");
  return <Text style={styles.body}>{text}</Text>;
}

/** 応募前チェック（未ログイン/未登録時は遷移） */
async function ensureCanApply(router: ReturnType<typeof useRouter>) {
  const { data: sessionRes } = await supabase.auth.getSession();
  if (!sessionRes.session) {
    router.push("/auth/login");
    throw new Error("not logged in");
  }
  const { data: prof } = await supabase
    .from("student_profiles")
    .select("id")
    .eq("user_id", sessionRes.session.user.id)
    .maybeSingle();
  if (!prof?.id) {
    router.push("/auth/signup");
    throw new Error("no profile");
  }
}

/**
 * タイトルの体裁が崩れるケース（改行や連続空白、HTMLエンティティ混入など）に備えて整形
 */
function normalizeTitle(raw?: string | null): string {
  if (!raw) return "—";
  let s = String(raw);
  // よく混入しがちな HTML エンティティを最小限デコード
  s = s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
  // 改行・タブ・連続空白を 1 つの半角スペースへ
  s = s.replace(/[\t\r\n]+/g, " ").replace(/\s{2,}/g, " ");
  // 先頭末尾の空白を削除
  s = s.trim();
  return s.length ? s : "—";
}

/* ============================================================
 * Styles
 * ============================================================ */
const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  errorText: { color: "#b91c1c", fontSize: 16, marginBottom: 12 },
  muted: { color: "#6b7280", fontSize: 14, marginTop: 4 },
  mutedSmall: { color: "#6b7280", fontSize: 12 },
  headerCard: {
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
    marginBottom: 12,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: "#fff",
    marginRight: 12,
    backgroundColor: "#fff",
  },
  jobTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },
  companyLink: { color: "#dc2626", fontWeight: "600", marginRight: 8 },
  badgeNew: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeNewText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  tag: {
    backgroundColor: "#fee2e2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 6,
  },
  tagText: { color: "#b91c1c", fontSize: 12 },
  summaryGrid: {
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 12,
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  summaryLabel: { color: "#6b7280", fontSize: 12 },
  summaryValue: { color: "#111827", fontSize: 14, fontWeight: "600" },
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 12,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 8 },
  subTitle: { fontSize: 14, fontWeight: "600", color: "#111827", marginBottom: 6 },
  body: { color: "#374151", fontSize: 14, lineHeight: 20 },
  infoLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  infoLabel: { color: "#6b7280", fontSize: 12 },
  infoValue: { color: "#111827", fontSize: 14, fontWeight: "500" },
  noticeBox: {
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  noticeTitle: { color: "#b91c1c", fontWeight: "700", fontSize: 16 },
  primaryBtn: {
    backgroundColor: "#dc2626",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
  outlineBtn: {
    borderColor: "#d1d5db",
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  outlineBtnText: { color: "#111827", fontWeight: "700" },
  savedBtn: {
    backgroundColor: "#f59e0b",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  savedBtnText: { color: "#111827", fontWeight: "700" },
  relatedItem: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
    alignItems: "center",
    gap: 12,
  },
  relatedLogo: { width: 40, height: 40, borderRadius: 6, marginRight: 12, backgroundColor: "#fff", borderWidth: StyleSheet.hairlineWidth, borderColor: "#e5e7eb" },
  companyLogo: { width: 56, height: 56, borderRadius: 8, backgroundColor: "#fff", borderWidth: StyleSheet.hairlineWidth, borderColor: "#e5e7eb" },
  companyName: { fontSize: 16, fontWeight: "700", color: "#111827" },
  relatedTitle: { fontSize: 14, fontWeight: "600", color: "#111827" },

  modalOverlay: {
    position: "absolute",
    inset: 0 as any,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    width: "100%",
  },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 12 },
  modalActions: { flexDirection: "row", marginTop: 8 },
});