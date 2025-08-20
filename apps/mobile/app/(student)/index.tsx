// app/(student)/index.tsx
import { Link, router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";

// NOTE: プロジェクトのエイリアス事情があるため、相対 import を推奨
// 既存クライアントのパスに合わせて変更してください。
// 例) "../../src/lib/supabase" など。今は安全のため相対にしています。
import { supabase } from "../../src/lib/supabase";

// ---- Storage helpers (RN AsyncStorage / Web localStorage fallback)
async function getItem(key: string): Promise<string | null> {
  try {
    // Try AsyncStorage (RN)
    return await AsyncStorage.getItem(key);
  } catch {
    try {
      // Fallback for web
      // @ts-ignore
      return globalThis?.localStorage?.getItem?.(key) ?? null;
    } catch {
      return null;
    }
  }
}

async function setItem(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    try {
      // @ts-ignore
      globalThis?.localStorage?.setItem?.(key, value);
    } catch {
      // ignore
    }
  }
}

// ------------------------------
// 型
// ------------------------------
 type Stats = { scouts: number; applications: number; chatRooms: number };
// type GrandPrix = { id: string; title: string; banner_url?: string | null };
 type Scout = {
  id: string;
  company_id: string;
  company_name: string | null;
  company_logo: string | null;
  position: string | null;
  message: string | null;
  created_at: string;
  is_read: boolean;
 };

// ------------------------------
// メイン
// ------------------------------
export default function StudentHome() {
  const [authChecked, setAuthChecked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("学生");

  const [stats, setStats] = useState<Stats>({ scouts: 0, applications: 0, chatRooms: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  // const [grandPrix, setGrandPrix] = useState<GrandPrix[]>([]);
  const [offers, setOffers] = useState<Scout[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);

  const [phaseOpen, setPhaseOpen] = useState(false);
  const [registeredAt, setRegisteredAt] = useState<Date | null>(null);

  // ---- 認証チェック
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      setUserId(uid);

      // 登録日（ユーザー作成日）を保存
      const created = data.user?.created_at ? new Date(data.user.created_at) : null;
      setRegisteredAt(created);

      setAuthChecked(true);
      if (!uid) {
        router.replace("/auth/login");
      }
    })();
  }, []);

  // ---- データ取得
  useEffect(() => {
    if (!userId) return;

    (async () => {
      // student_profiles 取得
      const { data: sp } = await supabase
        .from("student_profiles")
        .select(
          "id, full_name, first_name, last_name, last_name_kana, first_name_kana"
        )
        .eq("user_id", userId)
        .maybeSingle();

      const sid = sp?.id ?? userId; // 一部のテーブル参照が profile.id の場合がある

      // フリガナ未入力ならオンボーディングへ
      if (sp && (!sp.last_name_kana || !sp.first_name_kana)) {
        router.replace("/(student)/onboarding/profile");
        return;
      }

      // 表示名
      const dname = sp?.full_name || `${sp?.last_name ?? ""} ${sp?.first_name ?? ""}`.trim() || "学生";
      setDisplayName(dname);

      // ---- stats: scouts / applications / chat_rooms ----
      setStatsLoading(true);
      const [scoutCntRes, appCntRes, roomCntRes] = await Promise.all([
        supabase.from("scouts").select("id", { head: true, count: "exact" }).eq("student_id", sid),
        supabase.from("applications").select("id", { head: true, count: "exact" }).eq("student_id", userId),
        supabase.from("chat_rooms").select("id", { head: true, count: "exact" }).eq("student_id", userId),
      ]);
      setStats({
        scouts: scoutCntRes.count ?? 0,
        applications: appCntRes.count ?? 0,
        chatRooms: roomCntRes.count ?? 0,
      });
      setStatsLoading(false);

      // ---- 最新オファー (最大10件) ----
      const { data: offersData } = await supabase
        .from("scouts")
        .select(
          `id, company_id, message, is_read, created_at,
           company:companies!scouts_company_id_fkey(id,name,logo),
           job:jobs!scouts_job_id_fkey(id,title)`
        )
        .eq("student_id", sid)
        .order("created_at", { ascending: false })
        .limit(10);

      setOffers(
        (offersData ?? []).map((r: any) => ({
          id: r.id,
          company_id: r.company_id,
          company_name: r.company?.name ?? null,
          company_logo: r.company?.logo ?? null,
          position: r.job?.title ?? null,
          message: r.message ?? null,
          created_at: r.created_at,
          is_read: r.is_read,
        }))
      );
      // setGrandPrix(...) // Grand Prixの取得は現在無効化

      setCardsLoading(false);
    })();
  }, [userId]);

  // ---- フェーズモーダル：登録日から1ヶ月ごとに表示 ----
  useEffect(() => {
    if (!registeredAt) return;

    (async () => {
      try {
        const last = await getItem("phaseLastRespondedAt");
        const now = new Date();

        // 登録日から直近の「月次アニバーサリー（日付基準）」を求める
        const anniv = new Date(registeredAt);
        anniv.setHours(0, 0, 0, 0);

        while (true) {
          const next = new Date(anniv);
          next.setMonth(next.getMonth() + 1);
          if (next > now) break; // nextが未来になったタイミングで直近のannivが確定
          anniv.setMonth(anniv.getMonth() + 1);
        }

        // まだ回答履歴がなければ開く
        if (!last) {
          setPhaseOpen(true);
          return;
        }

        const lastDate = new Date(last);
        // 直近のアニバーサリー以降に回答していなければ開く（= 今月分が未回答）
        if (lastDate < anniv) {
          setPhaseOpen(true);
        } else {
          setPhaseOpen(false);
        }
      } catch {
        // 何かあれば念のため表示
        setPhaseOpen(true);
      }
    })();
  }, [registeredAt]);

  const handlePhaseSelect = useCallback(async (choice: string) => {
    if (!userId) return;
    await supabase.from("student_profiles").update({ phase_status: choice }).eq("user_id", userId);
    try {
      await setItem("phaseStatus", choice);
      await setItem("phaseLastRespondedAt", new Date().toISOString());
    } catch {}
    setPhaseOpen(false);
  }, [userId]);

  if (!authChecked) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>認証確認中…</Text>
      </View>
    );
  }

  if (!userId) {
    return null; // すでに /auth/login に遷移
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        ListHeaderComponent={
          <View style={{ padding: 16 }}>
            <Greeting userName={displayName} />

            <View style={{ marginTop: 16, gap: 12 }}>
              <ProfileCard userId={userId} />
              <StatCards stats={stats} loading={statsLoading} />
              {cardsLoading ? (
                <View style={{ height: 120, backgroundColor: "#f3f4f6", borderRadius: 12 }} />
              ) : (
                <>
                  {/* <GrandPrixCard events={grandPrix} /> */}
                  <OffersCard offers={offers} />
                </>
              )}
            </View>
          </View>
        }
        data={[]}
        renderItem={null as any}
        keyExtractor={() => "_"}
      />

      <PhaseModal
        open={phaseOpen}
        onClose={() => setPhaseOpen(false)}
        onSelect={handlePhaseSelect}
      />
    </View>
  );
}

// ------------------------------
// Greeting
// ------------------------------
function Greeting({ userName }: { userName: string }) {
  return (
    <View style={{ padding: 16, borderRadius: 12, backgroundColor: "#fff1f2" }}>
      <Text style={{ fontSize: 20, fontWeight: "700" }}>こんにちは、{userName} さん！</Text>
      <Text style={{ marginTop: 4, color: "#4b5563" }}>今日もいい1日になりますように。</Text>
    </View>
  );
}

// ------------------------------
// ProfileCard (簡易: 完成度はサーバーデータを基に概算)
// ------------------------------
function ProfileCard({ userId }: { userId: string }) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [name, setName] = useState("学生");
  const [completion, setCompletion] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase
        .from("student_profiles")
        .select(
          "full_name, first_name, last_name, avatar_url, pr_title, pr_text, about, desired_positions, preferred_industries, desired_locations"
        )
        .eq("user_id", userId)
        .maybeSingle();

      const d = p as any;
      const display = d?.full_name || `${d?.last_name ?? ""} ${d?.first_name ?? ""}`.trim() || "学生";
      setName(display);
      setAvatarUrl(d?.avatar_url ?? null);

      // 超簡易スコア: 主要項目の埋まり具合で算出
      const filled = (v: any) => (Array.isArray(v) ? v.length > 0 : v != null && v !== "");
      const arr = [d?.pr_title, d?.pr_text, d?.about, d?.desired_positions, d?.preferred_industries, d?.desired_locations];
      const pct = Math.round(((arr.filter(filled).length || 0) / arr.length) * 100);
      setCompletion(pct);
    })();
  }, [userId]);

  const onPick = useCallback(async () => {
    if (!userId) return;
    try {
      setSaving(true);

      // 1) Permission
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert("権限が必要です", "写真ライブラリへのアクセスを許可してください。");
        setSaving(false);
        return;
      }

      // 2) Launch picker
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (picked.canceled || !picked.assets?.length) {
        setSaving(false);
        return;
      }

      const asset = picked.assets[0];
      const uri = asset.uri;

      // 3) Read file data as blob
      const res = await fetch(uri);
      const blob = await res.blob();
      const contentType = blob.type || "image/jpeg";

      // Decide extension from mimetype
      const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
      const filePath = `${userId}/${Date.now()}.${ext}`;

      // 4) Upload to Supabase Storage (bucket: avatars)
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(filePath, blob, { contentType, upsert: true });

      if (upErr) {
        throw upErr;
      }

      // 5) Get public URL (ensure the bucket is public or use signed URLs instead)
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = pub.publicUrl;

      // 6) Save to profile and update UI
      const { error: dbErr } = await supabase
        .from("student_profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", userId);

      if (dbErr) {
        throw dbErr;
      }

      setAvatarUrl(publicUrl);
      Alert.alert("更新しました", "プロフィール画像を変更しました。");
    } catch (e: any) {
      console.error(e);
      Alert.alert("アップロードに失敗しました", e?.message ?? "不明なエラーです");
    } finally {
      setSaving(false);
    }
  }, [userId]);

  return (
    <View style={{ borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#fff", borderRadius: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16 }}>
        <View style={{ width: 64, height: 64, borderRadius: 9999, overflow: "hidden", backgroundColor: "#f3f4f6" }}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          ) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <Text>🙂</Text>
            </View>
          )}
          {saving && (
            <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.2)" }}>
              <ActivityIndicator />
            </View>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "700" }}>{name}</Text>
          <Text style={{ marginTop: 4, color: "#6b7280" }}>プロフィール完成度 {completion}%</Text>
          <View style={{ marginTop: 6, height: 8, width: "100%", backgroundColor: "#e5e7eb", borderRadius: 8 }}>
            <View
              style={{
                height: 8,
                width: `${Math.max(2, completion)}%`,
                backgroundColor: completion < 50 ? "#ef4444" : completion < 80 ? "#f59e0b" : completion < 95 ? "#34d399" : "#059669",
                borderRadius: 8,
              }}
            />
          </View>
        </View>
        <TouchableOpacity onPress={onPick} disabled={saving} style={{ padding: 8, opacity: saving ? 0.6 : 1 }}>
          <Text style={{ color: "#ef4444", fontWeight: "600" }}>{saving ? "変更中…" : "変更"}</Text>
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: "row", gap: 8, padding: 16, paddingTop: 0 }}>
        <Link href="/(student)/profile" asChild>
          <Pressable style={btnOutline}>
            <Text style={btnOutlineText}>プロフィール編集</Text>
          </Pressable>
        </Link>
        <Link href="/(student)/resume" asChild>
          <Pressable style={btnOutline}>
            <Text style={btnOutlineText}>職務経歴書を編集</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

/* 
// ------------------------------
// GrandPrixCard
// ------------------------------
function GrandPrixCard({ events }: { events: GrandPrix[] }) {
  if (!events?.length) {
    return (
      <View style={{ padding: 16, borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#fff", borderRadius: 12 }}>
        <Text style={{ color: "#6b7280", textAlign: "center" }}>現在開催中の就活グランプリはありません</Text>
      </View>
    );
  }

  const initial = (t?: string) => (t?.trim()?.[0] ?? "?");
  const chipBg = (t?: string) => {
    const k = (t || "").length;
    const palette = ["#fee2e2", "#ffedd5", "#fef3c7", "#dcfce7", "#e0e7ff", "#fae8ff"]; // soft
    return palette[k % palette.length];
  };

  return (
    <View style={{ borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#fff", borderRadius: 12 }}>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: "700", marginBottom: 12 }}>開催中の就活グランプリ</Text>
        {events.map((e) => (
          <Link key={e.id} href="/(student)/grandprix" asChild>
            <Pressable style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, overflow: "hidden", backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb" }}>
                {e.banner_url ? (
                  <Image source={{ uri: e.banner_url }} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
                ) : (
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: chipBg(e.title) }}>
                    <Text style={{ fontWeight: "700" }}>{initial(e.title)}</Text>
                  </View>
                )}
              </View>
              <Text style={{ flex: 1, fontWeight: "600" }} numberOfLines={2}>{e.title}</Text>
            </Pressable>
          </Link>
        ))}
        <View style={{ alignItems: "flex-end", marginTop: 4 }}>
          <Link href="/(student)/grandprix" asChild>
            <Pressable style={btnPrimary}><Text style={btnPrimaryText}>一覧を見る ＞</Text></Pressable>
          </Link>
        </View>
      </View>
    </View>
  );
}
*/

// ------------------------------
// OffersCard
// ------------------------------
function OffersCard({ offers }: { offers: Scout[] }) {
  return (
    <View style={{ borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#fff", borderRadius: 12 }}>
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
        <Text style={{ fontSize: 18, fontWeight: "700" }}>最新のオファー</Text>
        <Text style={{ marginTop: 4, color: "#6b7280" }}>企業からのオファーが届いています</Text>
      </View>

      <View style={{ padding: 12 }}>
        {!offers.length && (
          <Text style={{ color: "#6b7280" }}>まだオファーは届いていません</Text>
        )}
        {offers.map((offer) => (
          <Link key={offer.id} href={`/scouts/${offer.id}`} asChild>
            <Pressable style={{ position: "relative", flexDirection: "row", gap: 12, padding: 12, borderWidth: 1, borderColor: "#f3f4f6", borderRadius: 12, backgroundColor: "#fff", marginBottom: 8, overflow: "hidden" }}>
              {!offer.is_read && (
                <View style={{ position: "absolute", right: 12, top: 12, width: 8, height: 8, backgroundColor: "#ef4444", borderRadius: 9999 }} />
              )}
              <View style={{ width: 48, height: 48, borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: "#e5e7eb" }}>
                {offer.company_logo ? (
                  <Image source={{ uri: offer.company_logo }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                ) : (
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <Text>🏢</Text>
                  </View>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <Text style={{ fontWeight: "700", flexShrink: 1 }} numberOfLines={1} ellipsizeMode="tail">
                    {offer.company_name ?? "名称未設定の企業"}
                  </Text>
                  {!!offer.position && (
                    <Text
                      style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999, backgroundColor: "#f3f4f6", color: "#6b7280", fontSize: 12, flexShrink: 0 }}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {offer.position}
                    </Text>
                  )}
                </View>
                {!!offer.message && (
                  <Text numberOfLines={2} style={{ marginTop: 4, fontWeight: "600", color: "#374151" }}>
                    {offer.message}
                  </Text>
                )}
                <View style={{ marginTop: 6, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ color: "#6b7280", fontSize: 12 }}>{new Date(offer.created_at).toLocaleDateString("ja-JP")}</Text>
                  <Text style={{ color: "#ef4444", fontWeight: "600" }}>詳細を見る</Text>
                </View>
              </View>
            </Pressable>
          </Link>
        ))}
      </View>

      <Link href="/(student)/scouts" asChild>
        <Pressable style={{ padding: 14, borderTopWidth: 1, borderTopColor: "#f3f4f6", alignItems: "center" }}>
          <Text style={{ color: "#ef4444", fontWeight: "700" }}>全てのオファーを見る</Text>
        </Pressable>
      </Link>
    </View>
  );
}

// ------------------------------
// StatCards
// ------------------------------
function StatCards({ stats, loading }: { stats: Stats; loading: boolean }) {
  return (
    <View style={{ flexDirection: "row", gap: 12 }}>
      <StatCard title="スカウト状況" desc="企業からのオファー" value={stats.scouts} loading={loading} href="/(student)/scouts" />
      <StatCard title="応募履歴" desc="エントリーした求人" value={stats.applications} loading={loading} href="/(student)/applications" />
    </View>
  );
}

function StatCard({ title, desc, value, loading, href }: { title: string; desc: string; value: number; loading: boolean; href: string }) {
  return (
    <Link href={href} asChild>
      <Pressable style={{ flex: 1 }}>
        <View style={{ height: 108, borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#fff", borderRadius: 12, overflow: "hidden" }}>
          <View style={{ padding: 12, backgroundColor: "#fff1f2" }}>
            <Text style={{ fontWeight: "700" }}>{title}</Text>
            <Text style={{ marginTop: 2, color: "#6b7280" }}>{desc}</Text>
          </View>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            {loading ? <ActivityIndicator /> : (
              <View style={{ minWidth: 48, paddingHorizontal: 10, height: 28, borderRadius: 9999, alignItems: "center", justifyContent: "center", backgroundColor: "#ef4444" }}>
                <Text style={{ color: "#fff", fontWeight: "800" }}>{value}</Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

// ------------------------------
// PhaseModal
// ------------------------------
function PhaseModal({ open, onClose, onSelect }: { open: boolean; onClose: () => void; onSelect: (choice: string) => void }) {
  const options = [
    "絶賛就活頑張ってます！",
    "インターンをやりたい！",
    "就活もやりつつインターンもやりたい！",
    "就活は終わって良いインターンを探している！",
  ];

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <View style={{ width: "100%", maxWidth: 480, borderRadius: 12, backgroundColor: "#fff", padding: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", marginBottom: 12 }}>今あなたはどのフェーズにいますか？</Text>
          {options.map((opt) => (
            <TouchableOpacity key={opt} onPress={() => onSelect(opt)} style={{ paddingVertical: 10, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, marginBottom: 8, alignItems: "center" }}>
              <Text>{opt}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={onClose} style={{ marginTop: 4, alignSelf: "center" }}>
            <Text style={{ color: "#6b7280" }}>閉じる</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ------------------------------
// Styles (簡易)
// ------------------------------
const btnOutline = {
  paddingVertical: 10,
  paddingHorizontal: 12,
  borderWidth: 1,
  borderColor: "#e5e7eb",
  borderRadius: 10,
  backgroundColor: "#fff",
} as const;
const btnOutlineText = { fontWeight: "600", color: "#111827" } as const;
const btnPrimary = { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9999, backgroundColor: "#ef4444" } as const;
const btnPrimaryText = { color: "#fff", fontWeight: "700" } as const;
