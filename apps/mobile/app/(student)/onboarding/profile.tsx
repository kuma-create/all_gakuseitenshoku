/* ------------------------------------------------------------------
   app/(student)/onboarding/profile.tsx  (Expo Router / React Native)
   - 4 ステップ・プロフィール登録（ドラフト保存対応版・モバイル）
   - 2025‑08‑15 作成
     * ZipCloud 住所検索対応
     * ステップごとに部分 upsert（ドラフト保存）
     * 画像アップロード（expo-image-picker + blob 経由で Supabase Storage）
------------------------------------------------------------------ */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, Image, Platform, Modal, Pressable, FlatList } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";

import { supabase } from "src/lib/supabase";
const gradYearOptions = Array.from({ length: 7 }, (_, i) => new Date().getFullYear() + i);
// Wheel constants (module scope so styles can reference them)
const ITEM_HEIGHT = 42;
const WHEEL_SHIFT_ROWS = 0; // ハイライトを中央（0行オフセット）

/* ---------------- マスタ ---------------- */
const genderOptions = ["男性", "女性", "回答しない"] as const;
const prefectures = [
  "北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県",
  "茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県",
  "新潟県","富山県","石川県","福井県","山梨県","長野県",
  "岐阜県","静岡県","愛知県","三重県",
  "滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県",
  "鳥取県","島根県","岡山県","広島県","山口県",
  "徳島県","香川県","愛媛県","高知県",
  "福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県",
];

/* ---------------- 型定義 ---------------- */
type Step1 = {
  last_name: string;
  first_name: string;
  last_name_kana: string;
  first_name_kana: string;
  phone: string;
  gender: string;
  birth_date: string; // yyyy-mm-dd
};

type Step2 = {
  postal_code: string;
  prefecture: string;
  city: string;
  address_line: string;
};

type Step3 = {
  university: string;
  faculty: string;
  department: string;
  graduation_month: string | null; // yyyy‑mm
  join_ipo: boolean;
};

type Step4 = {
  work_summary: string;
  company1: string;
  company2: string;
  company3: string;
  skill_text: string;
  qualification_text: string;
};

type FormState = Step1 & Step2 & Step3 & Step4;

/* ----- 職歴入力用（モバイル簡易版） ----- */
interface WorkExperience {
  id: number;
  isOpen: boolean;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
  technologies: string;
  achievements: string;
}

/* ---------------- 初期値 ---------------- */
const initialState: FormState = {
  last_name: "", first_name: "",
  last_name_kana: "", first_name_kana: "",
  phone: "", gender: genderOptions[0], birth_date: "",
  postal_code: "", prefecture: "", city: "", address_line: "",
  university: "", faculty: "", department: "", graduation_month: null, join_ipo: false,
  work_summary: "", company1: "", company2: "", company3: "",
  skill_text: "", qualification_text: "",
};

/* ------------------------------------------------------------
   util: 画像アップロード（ImagePicker → blob → Storage）
------------------------------------------------------------ */
async function uploadAvatar(userId: string, uri: string, fileName?: string, mimeType: string = "image/jpeg"): Promise<string> {
  const resp = await fetch(uri);
  const blob = await resp.blob();

  const extFromName = (fileName?.split(".").pop() || "jpg").toLowerCase();
  const ext = extFromName.includes("?") ? "jpg" : extFromName;
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, blob, {
      upsert: true,
      cacheControl: "3600",
      contentType: mimeType,
    });
  if (error) throw error;

  return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
}

/* ------------------------------------------------------------
   部分 upsert ヘルパー  (ドラフト保存用)
------------------------------------------------------------ */
async function savePartial(data: Partial<FormState>) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("認証が失効しました");

  const { error: upErr } = await supabase
    .from("student_profiles")
    .upsert({ user_id: user.id, ...data }, { onConflict: "user_id" });
  if (upErr) throw upErr;
}

/* ******************************************************************* */
export default function OnboardingProfileMobile() {
/* ******************************************************************* */
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [form, setForm] = useState<FormState>(initialState);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  /* 住所検索 */
  const [zipLoading, setZipLoading] = useState(false);
  const [zipError,   setZipError]   = useState<string | null>(null);

  /* 職歴 */
  const [workExperiences, setWorkExperiences] = useState<WorkExperience[]>([
    {
      id: 1,
      isOpen: true,
      company: "",
      position: "",
      startDate: "",
      endDate: "",
      isCurrent: false,
      description: "",
      technologies: "",
      achievements: "",
    },
  ]);

  /* アバター（ImagePicker） */
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [yearPickerOpen, setYearPickerOpen] = useState(false);

  // 大学名ピッカー用
  const [uniPickerOpen, setUniPickerOpen] = useState(false);
  const [uniQuery, setUniQuery] = useState("");
  const [universities, setUniversities] = useState<string[]>([
    "北海道大学","東北大学","東京大学","名古屋大学","京都大学","大阪大学","九州大学",
    "早稲田大学","慶應義塾大学","上智大学","東京工業大学","一橋大学","筑波大学",
    "神戸大学","広島大学","岡山大学","立命館大学","同志社大学","関西学院大学",
    "明治大学","法政大学","中央大学","青山学院大学","学習院大学",
  ]);

  // 生年月日ピッカー
  const [birthPickerOpen, setBirthPickerOpen] = useState(false);
  const [birthYear, setBirthYear] = useState<number | null>(null);
  const [birthMonth, setBirthMonth] = useState<number | null>(null);
  const [birthDay, setBirthDay] = useState<number | null>(null);
  // DateTimePicker用一時日付
  const [birthTempDate, setBirthTempDate] = useState<Date>(new Date(2000, 0, 1));

  const birthYears = useMemo(() => Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - i), []);
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
  const daysInMonth = useCallback((y: number, m: number) => new Date(y, m, 0).getDate(), []);
  const days = useMemo(() => {
    const y = birthYear ?? new Date().getFullYear();
    const m = birthMonth ?? 1;
    return Array.from({ length: daysInMonth(y, m) }, (_, i) => i + 1);
  }, [birthYear, birthMonth, daysInMonth]);

  // 月変更時に日数を超えていたら末日に丸める
  useEffect(() => {
    if (birthYear && birthMonth) {
      const max = daysInMonth(birthYear, birthMonth);
      if (birthDay && birthDay > max) setBirthDay(max);
    }
  }, [birthYear, birthMonth]);


  const openBirthPicker = () => {
    if (form.birth_date && /\d{4}-\d{2}-\d{2}/.test(form.birth_date)) {
      const [y, m, d] = form.birth_date.split("-").map((v) => parseInt(v, 10));
      setBirthYear(y); setBirthMonth(m); setBirthDay(d);
      setBirthTempDate(new Date(y, m - 1, d));
    } else {
      setBirthYear(2000); setBirthMonth(1); setBirthDay(1);
      setBirthTempDate(new Date(2000, 0, 1));
    }
    setBirthPickerOpen(true);
  };

  const confirmBirth = () => {
    if (birthYear && birthMonth && birthDay) {
      const pad = (n: number) => String(n).padStart(2, "0");
      onChange("birth_date", `${birthYear}-${pad(birthMonth)}-${pad(birthDay)}`);
    }
    setBirthPickerOpen(false);
  };

  // ===== Wheel-like picker helpers =====
  const WheelColumn = ({ data, selectedIndex, onChange }: { data: string[]; selectedIndex: number; onChange: (idx: number) => void }) => {
    const headerFooter = ITEM_HEIGHT * 2; // two-item spacer top/bottom
    const initialOffset = ITEM_HEIGHT * (selectedIndex + 2);
    const listRef = React.useRef<FlatList<string>>(null);
    const [activeIndex, setActiveIndex] = React.useState<number>(selectedIndex);
    const didInit = React.useRef(false);
    React.useEffect(() => {
      setActiveIndex(selectedIndex);
      // 既に初期化済み（モーダルを開いた直後に birthYear などが遅れて入るケース）でも
      // props 変更に追従してスクロール位置を合わせる
      if (didInit.current && listRef.current) {
        const newOffset = ITEM_HEIGHT * (selectedIndex + 2);
        requestAnimationFrame(() => {
          listRef.current?.scrollToOffset({ offset: newOffset, animated: false });
        });
      }
    }, [selectedIndex]);

    const renderItem = ({ item, index }: { item: string; index: number }) => (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          setActiveIndex(index);
          onChange(index);
        }}
      >
        <View style={[styles.wheelItem, { height: ITEM_HEIGHT }]}>
          <Text style={[styles.modalItemText, index === activeIndex && styles.wheelItemActive]}>{item}</Text>
          {index === activeIndex ? (
            <Text style={styles.wheelCheck}>✓</Text>
          ) : (
            <View style={{ width: 18 }} />
          )}
        </View>
      </TouchableOpacity>
    );

    // 修正: 中央行基準で idx を計算し、中央の行が activeIndex になる
    const handleMomentumEnd = (e: any) => {
      const off = e.nativeEvent.contentOffset.y as number;
      const centerOffset = headerFooter;
      const idx = Math.round((off - centerOffset) / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(idx, data.length - 1));
      setActiveIndex(clamped);
      onChange(clamped);
    };

    const handleDragEnd = (e: any) => {
      handleMomentumEnd(e);
    };

    const handleScroll = (e: any) => {
      const off = e.nativeEvent.contentOffset.y as number;
      const centerOffset = headerFooter;
      const idx = Math.round((off - centerOffset) / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(idx, data.length - 1));
      setActiveIndex(clamped);
      // NOTE: onChange はスクロール確定時にのみ呼ぶ
    };

    return (
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(it, idx) => `${it}-${idx}`}
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
        onScrollEndDrag={handleDragEnd}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        snapToInterval={ITEM_HEIGHT}
        snapToAlignment="center"
        decelerationRate="fast"
        bounces={false}
        ListHeaderComponent={<View style={{ height: headerFooter }} />}
        ListFooterComponent={<View style={{ height: headerFooter }} />}
        style={[styles.pickerCol, { maxHeight: ITEM_HEIGHT * 5 }]}
        renderItem={renderItem}
        onLayout={() => {
          if (didInit.current) return;
          requestAnimationFrame(() => {
            listRef.current?.scrollToOffset({ offset: initialOffset, animated: false });
            setActiveIndex(selectedIndex);
            // 初期レイアウトでは onChange を呼ばず、ユーザー操作を優先
            didInit.current = true;
          });
        }}
      />
    );
  };

  const addWorkExperience = () => {
    const newId = workExperiences.length
      ? Math.max(...workExperiences.map((e) => e.id)) + 1
      : 1;
    setWorkExperiences([
      ...workExperiences,
      {
        id: newId,
        isOpen: true,
        company: "",
        position: "",
        startDate: "",
        endDate: "",
        isCurrent: false,
        description: "",
        technologies: "",
        achievements: "",
      },
    ]);
  };
  const removeWorkExperience = (id: number) => {
    setWorkExperiences(workExperiences.filter((e) => e.id !== id));
  };
  const toggleCollapsible = (id: number) => {
    setWorkExperiences(
      workExperiences.map((e) =>
        e.id === id ? { ...e, isOpen: !e.isOpen } : e,
      ),
    );
  };
  const handleWorkExperienceChange = (
    id: number,
    field: keyof WorkExperience,
    value: string | boolean,
  ) => {
    setWorkExperiences(
      workExperiences.map((e) =>
        e.id === id ? { ...e, [field]: value } : e,
      ),
    );
  };

  /* ---------------- 郵便番号 → 住所検索 --------------- */
  const fetchAddress = async (zipcode: string) => {
    setZipLoading(true); setZipError(null);
    try {
      const res  = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zipcode}`);
      const json = await res.json();
      if (json.status !== 200 || !json.results?.length) {
        throw new Error(json.message || "住所が見つかりませんでした");
      }
      const { address1, address2, address3 } = json.results[0];
      setForm((p) => ({
        ...p,
        prefecture: address1,
        city: `${address2}${address3}`,
      }));
      // 住所だけ即保存（失敗は無視）
      savePartial({ prefecture: address1, city: `${address2}${address3}` }).catch(() => {});
    } catch (err: any) {
      console.error(err); setZipError(err.message);
    } finally {
      setZipLoading(false);
    }
  };

  /* ---------------- ユーザーメタ → 氏名補完 --------------- */
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const meta = user.user_metadata as { last_name?: string; first_name?: string; full_name?: string };
      let ln = meta?.last_name ?? "", fn = meta?.first_name ?? "";
      if (!ln && !fn && meta?.full_name) {
        const parts = meta.full_name.split(/\s+/);
        ln = parts[0] ?? ""; fn = parts[1] ?? "";
      }
      setForm((p) => ({ ...p, last_name: ln, first_name: fn }));
    })();
  }, []);

  // 大学名マスタの取得（Webの実装を参考に、4つのJSONを統合）
  useEffect(() => {
    const sources = [
      "https://gakuten.co.jp/universities_graduate.json",
      "https://gakuten.co.jp/universities_national.json",
      "https://gakuten.co.jp/universities_private.json",
      "https://gakuten.co.jp/universities_public.json",
    ] as const;
    (async () => {
      try {
        const all = await Promise.all(
          sources.map((url) => fetch(url).then((r) => (r.ok ? r.json() : [])).catch(() => []))
        );
        const merged = all.flatMap((raw: any) => {
          const arr = Array.isArray(raw) ? raw : raw?.universities ?? raw?.data ?? [];
          return Array.isArray(arr) ? arr : [];
        });
        const cleaned = Array.from(new Set(
          merged.map((v: any) => (typeof v === "string" ? v.trim() : "")).filter((v: string) => v.length > 0)
        )).sort((a: string, b: string) => a.localeCompare(b, "ja"));
        if (cleaned.length) setUniversities(cleaned);
      } catch (e) {
        console.warn("universities fetch failed", e);
      }
    })();
  }, []);

  /* ---------------- 入力フォーマッタ --------------- */
  const formatZip = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 7);
    if (digits.length <= 3) return digits;
    return `${digits.slice(0,3)}-${digits.slice(3)}`;
  };
  const formatDateYMD = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 8);
    if (d.length <= 4) return d;
    if (d.length <= 6) return `${d.slice(0,4)}-${d.slice(4)}`;
    return `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6)}`;
  };

  /* ---------------- 共通ハンドラ --------------- */
  const onChange = (key: keyof FormState, value: string | boolean) => {
    setForm((p) => {
      let next: any = { ...p };
      if (key === "postal_code") {
        const formatted = formatZip(String(value));
        next.postal_code = formatted;
        const digits = formatted.replace(/\D/g, "");
        if (digits.length === 7) fetchAddress(digits);
        return next;
      }
      if (key === "birth_date") {
        next.birth_date = formatDateYMD(String(value));
        return next;
      }
      (next as any)[key] = value as any;
      return next;
    });
  };

  // 現在のステップをスキップ（保存せずに次へ）
  const handleSkipStep = () => {
    setStep((s) => (s + 1) as typeof step);
  };

  /* ---------------- ステップ保存（次へ） --------------- */
  const handleNextStep = async () => {
    try {
      if (step === 1) {
        await savePartial({
          last_name: form.last_name,
          first_name: form.first_name,
          last_name_kana: form.last_name_kana,
          first_name_kana: form.first_name_kana,
          phone: form.phone,
          gender: form.gender,
          birth_date: form.birth_date ? form.birth_date : undefined,
          university: form.university,
          faculty: form.faculty,
          department: form.department,
          ...(form.graduation_month ? { graduation_month: `${form.graduation_month}-01` } : {}),
        });
      }
      if (step === 2) {
        await savePartial({
          postal_code: form.postal_code,
          prefecture: form.prefecture,
          city: form.city,
          address_line: form.address_line,
          join_ipo: form.join_ipo,
        });

        // 監視通知（join_ipo）
        if (form.join_ipo) {
          const studentName = `${form.last_name}${form.first_name}`;
          try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            await supabase.functions.invoke("send-email", {
              body: {
                user_id:           "e567ebe5-55d3-408a-b591-d567cdd3470a",
                from_role:         "system",
                notification_type: "join_ipo",
                related_id:        authUser?.id ?? null,
                title:             `【学生転職】 学生がIPOに参加希望です`,
                message:           `学生名：${studentName}`,
              },
            });
          } catch (sysEmailErr) {
            console.error("send-email (system) error", sysEmailErr);
          }
        }

        // Step3 はスキップし、Step4（職歴）へ
        setStep(4);
        return;
      }
      setStep((s) => (s + 1) as typeof step);
    } catch (err: any) {
      setError(err.message ?? "一時保存に失敗しました");
    }
  };

  /* ---------------- 完全送信 ---------------- */
  const handleSubmit = async () => {
    if (step < 4) {
      handleNextStep();
      return;
    }

    setLoading(true); setError(null);
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) throw new Error("認証が失効しました。ログインし直してください。");

      const { data: profRow, error: profErr } = await supabase
        .from("student_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (profErr) throw profErr;
      const profileId = profRow.id;

      /* 1. アバターがあればアップロード */
      let avatarUrl: string | null = null;
      if (avatarUri) {
        try {
          setAvatarUploading(true);
          // iOS の場合は拡張子が付かないことがあるため jpeg として扱う
          avatarUrl = await uploadAvatar(user.id, avatarUri, "avatar.jpg", "image/jpeg");
        } finally {
          setAvatarUploading(false);
        }
      }

      /* YYYY‑MM → YYYY‑MM‑01 に補正 */
      const normalizedGrad =
        form.graduation_month ? `${form.graduation_month}-01` : null;

      // student_profiles 用の整形
      const {
        company1, company2, company3,
        work_summary, skill_text, qualification_text,
        ...profileRest
      } = form;

      const { error: profileErr } = await supabase
        .from("student_profiles")
        .upsert(
          {
            user_id: user.id,
            ...profileRest,
            graduation_month: normalizedGrad,
            address: `${form.prefecture}${form.city}${form.address_line}`,
            avatar_url: avatarUrl,
            is_completed: true,
          },
          { onConflict: "user_id" }
        );
      if (profileErr) throw profileErr;

      /* ---------- experiences テーブルを再構築 ---------- */
      await supabase.from("experiences").delete().eq("profile_id", profileId);

      const companyRows = [
        { order: 1, company_name: form.company1?.trim() },
        { order: 2, company_name: form.company2?.trim() },
        { order: 3, company_name: form.company3?.trim() },
      ].filter((c) => c.company_name);

      const metaRows = [
        form.work_summary?.trim()
          ? { kind: "summary", summary_text: form.work_summary.trim() }
          : null,
        form.skill_text?.trim()
          ? { kind: "skill", skill_text: form.skill_text.trim() }
          : null,
        form.qualification_text?.trim()
          ? { kind: "qualification", qualification_text: form.qualification_text.trim() }
          : null,
      ].filter(Boolean) as Record<string, any>[];

      const rows = [
        ...companyRows.map((c) => ({ profile_id: profileId, kind: "company", ...c })),
        ...metaRows.map((m)   => ({ profile_id: profileId, ...m })),
      ];

      if (rows.length) {
        const { error: expErr } = await supabase.from("experiences").insert(rows);
        if (expErr) throw expErr;
      }

      router.replace("/(student)");
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "保存できませんでした。");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- UI ---------------- */
  const Header = (
    <View style={styles.header}>
      <Text style={styles.title}>ユーザー登録</Text>
      <Text style={styles.subTitle}>
        簡単3分で完了
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {Header}

        {/* Step2: 上部にスキップボタンを配置 */}
        {step === 2 && (
          <View style={{ alignItems: 'flex-end', marginBottom: 8 }}>
            <TouchableOpacity style={[styles.button, styles.ghost]} onPress={handleSkipStep}>
              <Text style={[styles.buttonText, { color: '#111827' }]}>スキップ</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step4: 上部にスキップボタンを配置（職歴は後から入力可） */}
        {step === 4 && (
          <View style={{ alignItems: 'flex-end', marginBottom: 8 }}>
            <TouchableOpacity style={[styles.button, styles.ghost]} onPress={handleSubmit}>
              <Text style={[styles.buttonText, { color: '#111827' }]}>スキップ</Text>
            </TouchableOpacity>
          </View>
        )}

        {error ? (
          <View style={styles.alert}>
            <Text style={styles.alertText}>{error}</Text>
          </View>
        ) : null}

        {/* ---- ステップ入力 ---- */}
        {step === 1 && (
          <View style={styles.card}>
            <TwoCol>
              <Field label="苗字" value={form.last_name} onChangeText={(v) => onChange("last_name", v)} />
              <Field label="名前" value={form.first_name} onChangeText={(v) => onChange("first_name", v)} />
            </TwoCol>
            <TwoCol>
              <Field label="みょうじ" value={form.last_name_kana} onChangeText={(v) => onChange("last_name_kana", v)} />
              <Field label="なまえ" value={form.first_name_kana} onChangeText={(v) => onChange("first_name_kana", v)} />
            </TwoCol>
            <Field label="電話番号" keyboardType="phone-pad" value={form.phone} onChangeText={(v) => onChange("phone", v)} />

            {/* 性別（チップ選択） */}
            <Text style={styles.label}>性別</Text>
            <View style={styles.genderRow}>
              {genderOptions.map((g) => {
                const active = form.gender === g;
                return (
                  <TouchableOpacity key={g} onPress={() => onChange("gender", g)} style={[styles.chip, active && styles.chipActive]}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{g}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 大学名（検索付きプルダウン） */}
            <Text style={styles.label}>大学名</Text>
            <Pressable onPress={() => { setUniPickerOpen(true); setUniQuery(""); }} style={[styles.input, { justifyContent: "center" }]}>
              <Text style={{ color: form.university ? "#111827" : "#9ca3af", fontSize: 16 }}>
                {form.university || "大学名を入力 / 選択"}
              </Text>
            </Pressable>

            <Modal visible={uniPickerOpen} animationType="slide" transparent>
              <View style={styles.modalOverlay}>
                <View style={styles.modalBody}>
                  <Text style={styles.modalTitle}>大学名を検索</Text>
                  <TextInput
                    value={uniQuery}
                    onChangeText={setUniQuery}
                    placeholder="大学名を入力"
                    placeholderTextColor="#9ca3af"
                    style={[styles.input, { marginBottom: 8 }]}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <ScrollView style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
                    {universities
                      .filter((u) => (uniQuery ? u.toLowerCase().includes(uniQuery.toLowerCase()) : true))
                      .slice(0, 150)
                      .map((u) => (
                        <TouchableOpacity
                          key={u}
                          style={styles.modalItem}
                          onPress={() => { onChange("university", u); setUniPickerOpen(false); }}
                        >
                          <Text style={styles.modalItemText}>{u}</Text>
                        </TouchableOpacity>
                      ))}
                    {uniQuery && (
                      <TouchableOpacity
                        style={[styles.modalItem, { backgroundColor: "#f9fafb" }]}
                        onPress={() => { onChange("university", uniQuery); setUniPickerOpen(false); }}
                      >
                        <Text style={[styles.modalItemText, { color: "#2563eb" }]}>「{uniQuery}」をそのまま使用</Text>
                      </TouchableOpacity>
                    )}
                  </ScrollView>
                  <TouchableOpacity style={[styles.outlineBtn, { marginTop: 12 }]} onPress={() => setUniPickerOpen(false)}>
                    <Text style={styles.outlineBtnText}>閉じる</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            <TwoCol>
              <Field label="学部名" value={form.faculty} onChangeText={(v) => onChange("faculty", v)} />
              <Field label="学科名" value={form.department} onChangeText={(v) => onChange("department", v)} />
            </TwoCol>

            {/* 何年度卒（プルダウン） */}
            <Text style={styles.label}>何年度卒</Text>
            <Pressable onPress={() => setYearPickerOpen(true)} style={[styles.input, { justifyContent: "center" }]}>
              <Text style={{ color: (form.graduation_month ? "#111827" : "#9ca3af"), fontSize: 16 }}>
                {form.graduation_month ? `${(form.graduation_month).slice(0,4)}年卒` : "選択してください"}
              </Text>
            </Pressable>

            <Modal visible={yearPickerOpen} animationType="slide" transparent>
              <View style={styles.modalOverlay}>
                <View style={styles.modalBody}>
                  <Text style={styles.modalTitle}>何年度卒を選択</Text>
                  <ScrollView style={{ maxHeight: 320 }}>
                    {gradYearOptions.map((y) => (
                      <TouchableOpacity
                        key={y}
                        style={styles.modalItem}
                        onPress={() => {
                          onChange("graduation_month", `${y}-03`);
                          setYearPickerOpen(false);
                        }}
                      >
                        <Text style={styles.modalItemText}>{y}年卒</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <TouchableOpacity style={[styles.outlineBtn, { marginTop: 12 }]} onPress={() => setYearPickerOpen(false)}>
                    <Text style={styles.outlineBtnText}>閉じる</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            <Text style={styles.label}>生年月日</Text>
            <Pressable onPress={openBirthPicker} style={[styles.input, { justifyContent: "center" }]}>
              <Text style={{ color: form.birth_date ? "#111827" : "#9ca3af", fontSize: 16 }}>
                {form.birth_date || "選択してください"}
              </Text>
            </Pressable>

            <Modal visible={birthPickerOpen} animationType="slide" transparent>
              <View style={styles.modalOverlay}>
                <View style={styles.modalBody}>
                  <Text style={styles.modalTitle}>生年月日を選択</Text>

                  {Platform.OS === 'ios' ? (
                    (
                      <View>
                        {/* iOS toolbar (キャンセル / 生年月日 / 完了) */}
                        <View style={styles.iosToolbar}>
                          <TouchableOpacity onPress={() => setBirthPickerOpen(false)}>
                            <Text style={styles.iosToolbarBtn}>キャンセル</Text>
                          </TouchableOpacity>
                          <Text style={styles.iosToolbarTitle}>生年月日</Text>
                          <TouchableOpacity
                            onPress={() => {
                              const y = birthTempDate.getFullYear();
                              const m = birthTempDate.getMonth() + 1;
                              const d = birthTempDate.getDate();
                              const pad = (n: number) => String(n).padStart(2, '0');
                              onChange('birth_date', `${y}-${pad(m)}-${pad(d)}`);
                              setBirthYear(y); setBirthMonth(m); setBirthDay(d);
                              setBirthPickerOpen(false);
                            }}
                          >
                            <Text style={[styles.iosToolbarBtn, { fontWeight: '700' }]}>完了</Text>
                          </TouchableOpacity>
                        </View>

                        {/* iOS wheel picker */}
                        <View style={{ alignItems: 'center' }}>
                          <DateTimePicker
                            value={birthTempDate}
                            mode="date"
                            display="spinner"
                            onChange={(_e: DateTimePickerEvent, d?: Date) => { if (d) setBirthTempDate(d); }}
                            maximumDate={new Date()}
                            minimumDate={new Date(1940, 0, 1)}
                            locale="ja-JP"
                            themeVariant="light"
                          />
                        </View>
                      </View>
                    )
                  ) : Platform.OS === 'android' ? (
                    <View style={{ alignItems: 'center' }}>
                      <DateTimePicker
                        value={birthTempDate}
                        mode="date"
                        display="calendar"
                        onChange={(_e: DateTimePickerEvent, d?: Date) => { if (d) setBirthTempDate(d); }}
                        maximumDate={new Date()}
                        minimumDate={new Date(1940, 0, 1)}
                      />
                    </View>
                  ) : (
                    <View>
                      <View style={styles.pickerRow}>
                        <View style={styles.wheelOverlay} pointerEvents="none" />
                        <WheelColumn
                          data={["--", ...birthYears.map(String)]}
                          selectedIndex={(birthYear ? birthYears.indexOf(birthYear) + 1 : 0)}
                          onChange={(idx) => setBirthYear(idx === 0 ? null : birthYears[idx - 1])}
                        />
                        <WheelColumn
                          data={["--", ...months.map(String)]}
                          selectedIndex={(birthMonth ? months.indexOf(birthMonth) + 1 : 0)}
                          onChange={(idx) => setBirthMonth(idx === 0 ? null : months[idx - 1])}
                        />
                        <WheelColumn
                          data={["--", ...days.map(String)]}
                          selectedIndex={(birthDay ? days.indexOf(birthDay) + 1 : 0)}
                          onChange={(idx) => setBirthDay(idx === 0 ? null : days[idx - 1])}
                        />
                      </View>
                      <Text style={[styles.helpText, { marginTop: 6 }]}>中央の行が選択中です</Text>
                    </View>
                  )}

                  {Platform.OS !== 'ios' && (
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                      <TouchableOpacity style={[styles.outlineBtn, { flex: 1 }]} onPress={() => setBirthPickerOpen(false)}>
                        <Text style={styles.outlineBtnText}>キャンセル</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.button, { flex: 1 }]}
                        onPress={() => {
                          if (Platform.OS === 'web') {
                            // Wheel 値は state に即時反映済み
                            confirmBirth();
                            return;
                          }
                          // Android 用（calendar）
                          const y = birthTempDate.getFullYear();
                          const m = birthTempDate.getMonth() + 1;
                          const d = birthTempDate.getDate();
                          const pad = (n: number) => String(n).padStart(2, '0');
                          onChange('birth_date', `${y}-${pad(m)}-${pad(d)}`);
                          setBirthYear(y); setBirthMonth(m); setBirthDay(d);
                          setBirthPickerOpen(false);
                        }}
                      >
                        <Text style={styles.buttonText}>決定</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            </Modal>

            {/* プロフィール写真 */}
            <Text style={styles.label}>自分らしい写真</Text>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : null}
            <TouchableOpacity
              style={styles.outlineBtn}
              onPress={async () => {
                const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (perm.status !== "granted") {
                  Alert.alert("写真ライブラリの権限が必要です");
                  return;
                }
                const res = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  allowsEditing: true,
                  quality: 0.8,
                });
                if (!res.canceled && res.assets?.length) {
                  setAvatarUri(res.assets[0].uri);
                }
              }}
            >
              <Text style={styles.outlineBtnText}>写真を選ぶ</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View style={styles.card}>
            <Field
              label="郵便番号"
              placeholder="123-4567"
              keyboardType="number-pad"
              value={form.postal_code}
              onChangeText={(v) => onChange("postal_code", v)}
            />
            {zipLoading ? <Text style={styles.helpText}>住所検索中…</Text> : null}
            {zipError ? <Text style={styles.errText}>{zipError}</Text> : null}

            <Field
              label="都道府県"
              placeholder="例）東京都"
              value={form.prefecture}
              onChangeText={(v) => onChange("prefecture", v)}
            />
            <Field label="市区町村" value={form.city} onChangeText={(v) => onChange("city", v)} />
            <Field label="それ以降の住所" value={form.address_line} onChangeText={(v) => onChange("address_line", v)} />

            <Text style={[styles.helpText, { marginTop: 6 }]}>※ 後からマイページで入力できます（スキップ可）</Text>

            {/* IPO 参加希望（住所入力の下） */}
            <View style={{ marginTop: 12 }}>
              <ToggleRow
                label="選抜コミュニティ IPO への参加を希望する"
                value={form.join_ipo}
                onChange={(v) => onChange("join_ipo", v)}
              />
            </View>

            <View style={[styles.btnRow, { marginTop: 12 }]}>
              <TouchableOpacity style={[styles.button, styles.secondary]} onPress={() => setStep((s) => (s - 1) as typeof step)}>
                <Text style={[styles.buttonText, { color: '#111827' }]}>戻る</Text>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={[styles.button]} onPress={handleNextStep}>
                  <Text style={styles.buttonText}>保存して次へ</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}



        {step === 4 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>職歴</Text>
            {workExperiences.map((exp) => (
              <View key={exp.id} style={styles.expBox}>
                <View style={styles.expHeader}>
                  <Text style={styles.expTitle}>
                    {exp.company ? exp.company : `職歴 #${exp.id}`} {exp.position ? `（${exp.position}）` : ""}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity onPress={() => toggleCollapsible(exp.id)}>
                      <Text style={styles.link}>{exp.isOpen ? "閉じる" : "開く"}</Text>
                    </TouchableOpacity>
                    {workExperiences.length > 1 && (
                      <TouchableOpacity onPress={() => removeWorkExperience(exp.id)}>
                        <Text style={[styles.link, { color: "#ef4444" }]}>削除</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                {exp.isOpen && (
                  <View style={{ gap: 12 }}>
                    <Field label="企業・組織名" value={exp.company} onChangeText={(v) => handleWorkExperienceChange(exp.id, "company", v)} />
                    <Field label="役職・ポジション" value={exp.position} onChangeText={(v) => handleWorkExperienceChange(exp.id, "position", v)} />
                    <TwoCol>
                      <Field label="開始年月（YYYY-MM）" placeholder="2024-04" value={exp.startDate} onChangeText={(v) => handleWorkExperienceChange(exp.id, "startDate", v)} />
                      <Field label="終了年月（YYYY-MM）" placeholder="2024-09" value={exp.endDate} onChangeText={(v) => handleWorkExperienceChange(exp.id, "endDate", v)} />
                    </TwoCol>
                    <ToggleRow label="現在も在籍中" value={exp.isCurrent} onChange={(v) => handleWorkExperienceChange(exp.id, "isCurrent", v)} />
                    <Area label="業務内容（最大500文字）" value={exp.description} onChangeText={(v) => handleWorkExperienceChange(exp.id, "description", v)} maxLength={500} />
                    <Field label="使用技術・ツール（,区切り）" value={exp.technologies} onChangeText={(v) => handleWorkExperienceChange(exp.id, "technologies", v)} />
                    <Area label="成果・実績" value={exp.achievements} onChangeText={(v) => handleWorkExperienceChange(exp.id, "achievements", v)} />
                  </View>
                )}
              </View>
            ))}

            <TouchableOpacity style={styles.outlineBtn} onPress={addWorkExperience}>
              <Text style={styles.outlineBtnText}>職歴を追加</Text>
            </TouchableOpacity>

            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>プロフィール補足</Text>
            <Area label="自己紹介 / サマリー" value={form.work_summary} onChangeText={(v) => onChange("work_summary", v)} />
            <Field label="企業名1" value={form.company1} onChangeText={(v) => onChange("company1", v)} />
            <Field label="企業名2" value={form.company2} onChangeText={(v) => onChange("company2", v)} />
            <Field label="企業名3" value={form.company3} onChangeText={(v) => onChange("company3", v)} />
            <Area label="スキル" value={form.skill_text} onChangeText={(v) => onChange("skill_text", v)} />
            <Area label="資格" value={form.qualification_text} onChangeText={(v) => onChange("qualification_text", v)} />
          </View>
        )}

        {/* ボタン行（Step2 はカード内に専用行を表示）*/}
        {step !== 2 && (
          <View style={styles.btnRow}>
            {step > 1 ? (
              <TouchableOpacity style={[styles.button, styles.secondary]} onPress={() => setStep((s) => (s - 1) as typeof step)}>
                <Text style={[styles.buttonText, { color: "#111827" }]}>戻る</Text>
              </TouchableOpacity>
            ) : <View />}
            <TouchableOpacity
              style={[styles.button, (loading || avatarUploading) && styles.buttonDisabled]}
              disabled={loading || avatarUploading}
              onPress={step < 4 ? handleNextStep : handleSubmit}
            >
              {loading || avatarUploading ? (
                <ActivityIndicator />
              ) : (
                <Text style={styles.buttonText}>{step < 4 ? '保存して次へ' : '登録する'}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

/* =================== 汎用 UI パーツ（RN実装） =================== */
function Field(props: { label: string; value?: string; onChangeText?: (t: string) => void; placeholder?: string; keyboardType?: any }) {
  const [focused, setFocused] = React.useState(false);
  return (
    <View style={{ gap: 6, flex: 1 }}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor="#9ca3af"
        keyboardType={props.keyboardType}
        style={[styles.input, focused && styles.inputFocus]}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

function Area(props: { label: string; value?: string; onChangeText?: (t: string) => void; maxLength?: number }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        placeholderTextColor="#9ca3af"
        multiline
        numberOfLines={6}
        maxLength={props.maxLength}
        style={[styles.input, { height: 120, textAlignVertical: "top" }]}
      />
      {props.maxLength ? (
        <Text style={styles.helpText}>
          {(props.value?.length ?? 0)}/{props.maxLength} 文字
        </Text>
      ) : null}
    </View>
  );
}

function TwoCol({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.twoCol}>
      {React.Children.map(children, (child, i) => (
        <View key={i} style={styles.col}>{child}</View>
      ))}
    </View>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <TouchableOpacity style={styles.toggleRow} onPress={() => onChange(!value)}>
      <View style={[styles.checkbox, value && styles.checkboxOn]} />
      <Text style={styles.toggleLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: readonly string[] }) {
  // モバイルでは簡易セレクタ（チップ群）に置換
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {options.map((o) => {
          const active = value === o;
          return (
            <TouchableOpacity key={o} onPress={() => onChange(o)} style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{o}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

/* =================== styles =================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  scroll: { padding: 16 },
  header: { alignItems: "center", marginBottom: 12 },
  title: { fontSize: 22, fontWeight: "700", color: "#111827" },
  subTitle: { marginTop: 6, fontSize: 14, fontWeight: "600", color: "#1d4ed8" },

  alert: { padding: 12, backgroundColor: "#fee2e2", borderRadius: 8, marginBottom: 12 },
  alertText: { color: "#991b1b", fontSize: 14 },

  card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#e5e7eb" },

  label: { fontSize: 13, color: "#374151" },
  input: { borderWidth: 1.5, borderColor: "#e2e8f0", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, backgroundColor: "#fff", minHeight: 44 },
  inputFocus: { borderColor: "#111827", shadowColor: "#111827", shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },

  genderRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 999 },
  chipActive: { backgroundColor: "#1f2937", borderColor: "#1f2937" },
  chipText: { color: "#374151", fontSize: 13 },
  chipTextActive: { color: "#fff" },

  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10, color: "#111827" },
  expBox: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 12, marginBottom: 12 },
  expHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  expTitle: { fontSize: 14, fontWeight: "600", color: "#111827" },

  outlineBtn: { borderWidth: 1, borderStyle: "dashed", borderColor: "#d1d5db", borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 6 },
  outlineBtnText: { color: "#111827", fontSize: 14 },

  btnRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  button: { backgroundColor: "#ef4444", paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, minWidth: 140, alignItems: "center" },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  secondary: { backgroundColor: "#f3f4f6" },
  ghost: { backgroundColor: '#f3f4f6' },

  helpText: { fontSize: 12, color: "#6b7280" },
  errText: { fontSize: 12, color: "#b91c1c" },

  toggleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: "#9ca3af", backgroundColor: "#fff" },
  checkboxOn: { backgroundColor: "#111827", borderColor: "#111827" },
  toggleLabel: { fontSize: 13, color: "#374151" },

  avatar: { width: 96, height: 96, borderRadius: 48, alignSelf: "center", marginVertical: 8, backgroundColor: "#e5e7eb" },

  link: { color: "#2563eb", textDecorationLine: "underline", fontSize: 13 },
  twoCol: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  col: { flexBasis: "48%", flexGrow: 1 },


  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  modalBody: { backgroundColor: "#fff", padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  modalTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8, color: "#111827" },
  modalItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  modalItemText: { fontSize: 16, color: "#111827" },
  pickerRow: { flexDirection: "row", gap: 8 },
  pickerCol: { maxHeight: 260, minWidth: 100 },
  wheelItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 12 },
  wheelItemActive: { fontWeight: "700" },
  wheelOverlay: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    marginTop: -(ITEM_HEIGHT / 2) + (ITEM_HEIGHT * WHEEL_SHIFT_ROWS),
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
    zIndex: 1,
  },
  wheelCheck: { fontSize: 16, color: "#2563eb", fontWeight: "700" },
  iosToolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 8 },
  iosToolbarBtn: { fontSize: 16, color: '#2563eb' },
  iosToolbarTitle: { fontSize: 16, color: '#111827', fontWeight: '600' },
  });