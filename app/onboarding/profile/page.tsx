/* ------------------------------------------------------------------
   app/(onboarding)/onboarding-profile/page.tsx
   - 4 ステップ・プロフィール登録（ドラフト保存対応版）
   - 2025‑05‑16 修正版
     * Storage 400 対応（/ を含むパス & contentType）
     * ステップごとに部分 upsert（ドラフト保存）
------------------------------------------------------------------ */
"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

/* shadcn/ui を barrel export している想定 */
import {
  Button, Input, Label, Checkbox,
  Card, CardHeader, CardTitle, CardContent, CardDescription,
  Alert, AlertDescription, AlertTitle,
  Textarea, Badge,
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui";


import {
  PlusCircle, Trash2, ChevronDown, ChevronUp,
  Briefcase, Building, Info,
} from "lucide-react";

/* ------------------------------------------------------------
   util: 画像アップロード
------------------------------------------------------------ */
async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext  = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, file, {
      upsert: true,
      cacheControl: "3600",
      contentType: file.type,
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

/* ---------------- 共通イベント型 ---------------- */
type InputChange =
  React.ChangeEvent<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >;

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

/* ----- 職歴入力用 ----- */
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

/* ******************************************************************* */
export default function OnboardingProfile() {
/* ******************************************************************* */
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [form, setForm] = useState<FormState>(initialState);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  /* 住所検索 */
  const [zipLoading, setZipLoading] = useState(false);
  const [zipError,   setZipError]   = useState<string | null>(null);
  /* ---------------- 職歴 (Step4) ---------------- */
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

  /* アバター */
  const [avatarFile,      setAvatarFile]      = useState<File | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError,     setAvatarError]     = useState<string | null>(null);

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

  /* ---------------- フォーム入力 --------------- */
  const handleChange = (e: InputChange) => {
    const tgt = e.target as HTMLInputElement;

    /* ----------- フィールドキー決定 ----------- */
    // 通常は id。ラジオボタン (gender‑○○) は "gender" に正規化
    let key = tgt.id || tgt.name;
    if (tgt.type === "radio" && key.startsWith("gender")) key = "gender";

    /* ----------- 値のセット ----------- */
    if (tgt.type === "checkbox") {
      setForm((p) => ({ ...p, [key]: tgt.checked }));
    } else {
      setForm((p) => ({ ...p, [key]: tgt.value }));
    }

    /* 郵便番号なら住所検索をトリガ */
    if (key === "postal_code") {
      const digits = tgt.value.replace(/\D/g, "");
      if (digits.length === 7) fetchAddress(digits);
    }
  };

  /* ---------------- ユーザーメタ → 氏名補完 --------------- */
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const meta = user.user_metadata as { last_name?: string; first_name?: string; full_name?: string };
      let ln = meta.last_name ?? "", fn = meta.first_name ?? "";
      if (!ln && !fn && meta.full_name) [ln="", fn=""] = meta.full_name.split(/\s+/);
      setForm((p) => ({ ...p, last_name: ln, first_name: fn }));
    })();
  }, []);

  /* ---------------- 次へ（途中保存） --------------- */
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
          birth_date: form.birth_date,
        });
      }
      if (step === 2) {
        await savePartial({
          postal_code: form.postal_code,
          prefecture: form.prefecture,
          city: form.city,
          address_line: form.address_line,
        });
      }
      if (step === 3) {
        const partial: Partial<FormState> = {
          university: form.university,
          faculty: form.faculty,
          department: form.department,
          join_ipo: form.join_ipo,
          ...(form.graduation_month
            ? { graduation_month: `${form.graduation_month}-01` }
            : {}),
        };
        await savePartial(partial);
        /* --- システム監視用メール送信 -------------------- */
        if (form.join_ipo) {
          const studentName = `${form.last_name}${form.first_name}`;
          try {
            // 現在の認証ユーザー ID を related_id として付与
            const { data: { user: authUser } } = await supabase.auth.getUser();
            const res = await supabase.functions.invoke("send-email", {
              body: {
                user_id:           "e567ebe5-55d3-408a-b591-d567cdd3470a", // システム監視用ユーザー ID
                from_role:         "system",
                notification_type: "join_ipo",
                related_id:        authUser?.id ?? null,
                title:             `【学生転職】 学生がIPOに参加希望です`,
                message:           `学生名：${studentName}`,
              },
            });
            console.log("send-email response:", res);
          } catch (sysEmailErr) {
            console.error("send-email (system) error", sysEmailErr);
          }
        }
      }
      setStep((s) => (s + 1) as typeof step);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setError(err.message ?? "一時保存に失敗しました");
    }
  };

  /* ---------------- 完全送信 ---------------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    /* 途中ステップならドラフト保存して次へ */
    if (step < 4) {
      handleNextStep();
      return;
    }

    /* === 最終ステップ：保存 + 完了フラグ === */
    setLoading(true); setError(null);

    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) throw new Error("認証が失効しました。ログインし直してください。");
      // --- student_profiles の PK を取得 ---
      const { data: profRow, error: profErr } = await supabase
        .from("student_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (profErr) throw profErr;
      const profileId = profRow.id;

      /* 1. アバターがあればアップロード */
      let avatarUrl: string | null = null;
      if (avatarFile) {
        try {
          setAvatarUploading(true);
          avatarUrl = await uploadAvatar(user.id, avatarFile);
        } finally {
          setAvatarUploading(false);
        }
      }

      /* YYYY‑MM → YYYY‑MM‑01 に補正 */
      const normalizedGrad =
        form.graduation_month ? `${form.graduation_month}-01` : null;

      /* 2‑A. student_profiles を upsert (会社名・補足情報は除外) */
      const {
        company1, company2, company3,               // experiences へ
        work_summary, skill_text, qualification_text, // profile_details or metaRows
        ...profileRest                               // student_profiles へ送るもの
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
      // 1) 既存行を全削除
      await supabase.from("experiences").delete().eq("profile_id", profileId);

      // 2) 会社名 (kind='company')
      const companyRows = [
        { order: 1, company_name: form.company1?.trim() },
        { order: 2, company_name: form.company2?.trim() },
        { order: 3, company_name: form.company3?.trim() },
      ].filter((c) => c.company_name);

      // 3) プロフィール補足情報を kind 別に行で保存
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

      router.replace("/student-dashboard");
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "保存できませんでした。");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="flex min-h-screen justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">
            ユーザー登録
          </CardTitle>
          <p className="mt-2 text-center font-semibold text-blue-700">
            {step < 4 ? `残り${4 - step}ステップで完了` : "入力内容を確認して登録"}
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* ---- ステップ入力 ---- */}
            {step === 1 && (
              <Step1Inputs
                form={form}
                onChange={handleChange}
                setAvatarFile={setAvatarFile}
                avatarError={avatarError}
              />
            )}
            {step === 2 && (
              <Step2Inputs
                form={form}
                onChange={handleChange}
                zipLoading={zipLoading}
                zipError={zipError}
              />
            )}
            {step === 3 && <Step3Inputs form={form} onChange={handleChange} />}
            {step === 4 && (
              <Step4Inputs
                form={form}
                onChange={handleChange}
                workExperiences={workExperiences}
                addWorkExperience={addWorkExperience}
                removeWorkExperience={removeWorkExperience}
                toggleCollapsible={toggleCollapsible}
                handleWorkExperienceChange={handleWorkExperienceChange}
              />
            )}

            {/* エラー表示 */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-between">
              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep((s) => (s - 1) as typeof step)}
                >
                  戻る
                </Button>
              )}
              <Button
                type="submit"
                disabled={loading || avatarUploading}
                className="ml-auto"
              >
                {loading
                  ? "保存中..."
                  : step < 4
                  ? "保存して次へ"
                  : "登録する"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

/* ================= ステップ別コンポーネント ================= */
function Step1Inputs({
  form, onChange, setAvatarFile, avatarError,
}: {
  form: FormState;
  onChange: (e: InputChange) => void;
  setAvatarFile: React.Dispatch<React.SetStateAction<File | null>>;
  avatarError: string | null;
}) {
  return (
    <div className="space-y-6">
      <TwoCol>
        <Field id="last_name"  label="苗字"   value={form.last_name}  onChange={onChange} required />
        <Field id="first_name" label="名前"   value={form.first_name} onChange={onChange} required />
      </TwoCol>
      <TwoCol>
        <Field id="last_name_kana"  label="みょうじ" value={form.last_name_kana}  onChange={onChange} required />
        <Field id="first_name_kana" label="なまえ"   value={form.first_name_kana} onChange={onChange} required />
      </TwoCol>
      <Field id="phone" label="電話番号" value={form.phone} onChange={onChange} required />

      {/* 性別 */}
      <div className="grid gap-2">
        <Label>性別</Label>
        <div className="flex gap-6">
          {genderOptions.map((g) => (
            <div key={g} className="flex items-center gap-1 text-sm">
              <input
                id={`gender-${g}`}
                type="radio"
                name="gender"
                value={g}
                checked={form.gender === g}
                onChange={(e) => onChange(e as InputChange)}
                className="cursor-pointer accent-red-600 focus-visible:ring-red-600"
              />
              <Label htmlFor={`gender-${g}`} className="cursor-pointer">
                {g}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <Field
        id="birth_date"
        label="生年月日"
        type="date"
        value={form.birth_date}
        onChange={onChange}
        required
      />

      {/* 顔写真 */}
      <div className="grid gap-2">
        <Label htmlFor="avatar">自分らしい写真</Label>
        <Input
          id="avatar"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setAvatarFile(f);
          }}
        />
        {avatarError && (
          <p className="text-xs text-red-600">{avatarError}</p>
        )}
      </div>
    </div>
  );
}

function Step2Inputs({
  form, onChange, zipLoading, zipError,
}: {
  form: FormState; onChange: (e: InputChange) => void;
  zipLoading: boolean; zipError: string | null;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-2">
        <Label htmlFor="postal_code">郵便番号</Label>
        <Input
          id="postal_code"
          value={form.postal_code}
          onChange={onChange}
          placeholder="例）1000001"
          pattern="\d{3}-?\d{4}"
          maxLength={8}
          required
        />
        {zipLoading && <p className="text-xs text-gray-500">住所検索中…</p>}
        {zipError   && <p className="text-xs text-red-600">{zipError}</p>}
      </div>

      <SelectField
        id="prefecture" label="都道府県"
        value={form.prefecture} onChange={onChange}
        options={prefectures} required
      />
      <Field id="city"         label="市区町村" value={form.city} onChange={onChange} required />
      <Field id="address_line" label="それ以降の住所" value={form.address_line} onChange={onChange} placeholder="番地・建物名など" />
    </div>
  );
}

function Step3Inputs({ form, onChange }: { form: FormState; onChange: (e: InputChange) => void }) {
  return (
    <div className="space-y-6">
      <Field id="university" label="大学名" value={form.university} onChange={onChange} required />
      <Field id="faculty"    label="学部名" value={form.faculty}    onChange={onChange} required />
      <Field id="department" label="学科名" value={form.department} onChange={onChange} required />
      <Field
        id="graduation_month"
        label="卒業予定年月"
        type="month"
        value={form.graduation_month ?? ""}  // null → ""
        onChange={onChange}
        required
      />
      <div className="flex items-center gap-2">
        <input
          id="join_ipo"
          type="checkbox"
          checked={form.join_ipo}
          onChange={onChange}
        />
        <Label htmlFor="join_ipo">選抜コミュニティ IPO への参加を希望する</Label>
      </div>
    </div>
  );
}

function Step4Inputs({
  form,
  onChange,
  workExperiences,
  addWorkExperience,
  removeWorkExperience,
  toggleCollapsible,
  handleWorkExperienceChange,
}: {
  form: FormState;
  onChange: (e: InputChange) => void;
  workExperiences: WorkExperience[];
  addWorkExperience: () => void;
  removeWorkExperience: (id: number) => void;
  toggleCollapsible: (id: number) => void;
  handleWorkExperienceChange: (
    id: number,
    field: keyof WorkExperience,
    value: string | boolean
  ) => void;
}) {
  return (

    <Card className="mb-6 border-2 border-primary/20 bg-primary/5 sm:mb-8">
    <CardHeader className="bg-primary/10 p-3 sm:p-6">
      <div className="flex items-center gap-2">
        <Briefcase className="h-5 w-5 text-primary" />
        <CardTitle className="text-base text-primary sm:text-xl">職歴</CardTitle>
      </div>
      <CardDescription className="text-xs sm:text-sm">
        アルバイトやインターンシップの経験を入力してください
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4 p-3 sm:space-y-6 sm:p-6">
      {workExperiences.length === 0 ? (
        <Alert className="bg-amber-50">
          <Info className="h-4 w-4 text-amber-500" />
          <AlertTitle className="text-sm font-medium text-amber-800">職歴情報がありません</AlertTitle>
          <AlertDescription className="text-xs text-amber-700">
            アルバイトやインターンシップなど、これまでの経験を追加しましょう。
          </AlertDescription>
        </Alert>
      ) : (
        workExperiences.map((exp) => (
          <Collapsible key={exp.id} open={exp.isOpen} onOpenChange={() => toggleCollapsible(exp.id)}>
            <div className="rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-gray-500" />
                  <h3 className="text-sm font-medium sm:text-base">
                    {exp.company ? exp.company : `職歴 #${exp.id}`}
                    {exp.position && <span className="ml-2 text-xs text-gray-500">（{exp.position}）</span>}
                  </h3>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 sm:h-8 sm:w-8">
                      {exp.isOpen ? (
                        <ChevronUp size={14} className="sm:h-4 sm:w-4" />
                      ) : (
                        <ChevronDown size={14} className="sm:h-4 sm:w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  {workExperiences.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-red-500 hover:text-red-600 sm:h-8 sm:w-8"
                      onClick={() => removeWorkExperience(exp.id)}
                    >
                      <Trash2 size={14} className="sm:h-4 sm:w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <CollapsibleContent className="mt-3 space-y-3 sm:mt-4 sm:space-y-4">
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor={`company-${exp.id}`} className="text-xs sm:text-sm">
                    企業・組織名
                  </Label>
                  <Input
                    id={`company-${exp.id}`}
                    placeholder="〇〇株式会社"
                    className="h-8 text-xs sm:h-10 sm:text-sm"
                    value={exp.company}
                    onChange={(e) => handleWorkExperienceChange(exp.id, "company", e.target.value)}
                  />
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor={`position-${exp.id}`} className="text-xs sm:text-sm">
                    役職・ポジション
                  </Label>
                  <Input
                    id={`position-${exp.id}`}
                    placeholder="インターン、アルバイトなど"
                    className="h-8 text-xs sm:h-10 sm:text-sm"
                    value={exp.position}
                    onChange={(e) => handleWorkExperienceChange(exp.id, "position", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor={`startDate-${exp.id}`} className="text-xs sm:text-sm">
                      開始年月
                    </Label>
                    <Input
                      id={`startDate-${exp.id}`}
                      type="month"
                      className="h-8 text-xs sm:h-10 sm:text-sm"
                      value={exp.startDate}
                      onChange={(e) => handleWorkExperienceChange(exp.id, "startDate", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor={`endDate-${exp.id}`} className="text-xs sm:text-sm">
                      終了年月
                    </Label>
                    <Input
                      id={`endDate-${exp.id}`}
                      type="month"
                      className="h-8 text-xs sm:h-10 sm:text-sm"
                      value={exp.endDate}
                      onChange={(e) => handleWorkExperienceChange(exp.id, "endDate", e.target.value)}
                      disabled={exp.isCurrent}
                    />
                  </div>
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`current-${exp.id}`}
                      className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                      checked={exp.isCurrent}
                      onCheckedChange={(checked) => handleWorkExperienceChange(exp.id, "isCurrent", checked)}
                    />
                    <Label htmlFor={`current-${exp.id}`} className="text-xs sm:text-sm">
                      現在も在籍中
                    </Label>
                  </div>
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`jobDescription-${exp.id}`} className="text-xs sm:text-sm">
                      業務内容
                    </Label>
                    <span className="text-xs text-gray-500">{exp.description.length}/500文字</span>
                  </div>
                  <Textarea
                    id={`jobDescription-${exp.id}`}
                    placeholder="担当した業務内容や成果について記入してください"
                    className="min-h-[100px] text-xs sm:min-h-[120px] sm:text-sm"
                    value={exp.description}
                    onChange={(e) => handleWorkExperienceChange(exp.id, "description", e.target.value)}
                    maxLength={500}
                  />
                  <p className="text-xs italic text-gray-500">
                    例:
                    「Webアプリケーションの開発チームに参加し、フロントエンド実装を担当。React.jsを用いたUI開発を行い、チームの納期目標を達成した。」
                  </p>
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor={`technologies-${exp.id}`} className="text-xs sm:text-sm">
                    使用技術・ツール
                  </Label>
                  <Input
                    id={`technologies-${exp.id}`}
                    placeholder="Java, Python, AWS, Figmaなど"
                    className="h-8 text-xs sm:h-10 sm:text-sm"
                    value={exp.technologies}
                    onChange={(e) => handleWorkExperienceChange(exp.id, "technologies", e.target.value)}
                  />
                  {exp.technologies && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {exp.technologies.split(",").map((tech, i) => (
                        <Badge key={i} variant="outline" className="bg-blue-50 text-xs">
                          {tech.trim()}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor={`achievements-${exp.id}`} className="text-xs sm:text-sm">
                    成果・実績
                  </Label>
                  <Textarea
                    id={`achievements-${exp.id}`}
                    placeholder="具体的な成果や数値、評価されたポイントなどを記入してください"
                    className="min-h-[80px] text-xs sm:min-h-[100px] sm:text-sm"
                    value={exp.achievements}
                    onChange={(e) => handleWorkExperienceChange(exp.id, "achievements", e.target.value)}
                  />
                  <p className="text-xs italic text-gray-500">
                    例: 「顧客満足度調査で平均4.8/5.0の評価を獲得。前年比20%の売上向上に貢献した。」
                  </p>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))
      )}
      <Button
        variant="outline"
        className="w-full gap-1 border-dashed text-xs sm:gap-2 sm:text-sm"
        onClick={addWorkExperience}
      >
        <PlusCircle size={14} className="sm:h-4 sm:w-4" />
        職歴を追加
      </Button>
    </CardContent>
  </Card>
  );
}

/* ================= 汎用パーツ ================= */
function Field({
  id, label, ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { id: string; label: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} {...rest} />
    </div>
  );
}

function TextField({
  id, label, ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { id: string; label: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea id={id} rows={4} {...rest} />
    </div>
  );
}

function SelectField({
  id, label, options, ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  id: string; label: string; options: readonly string[];
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        className="flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-red-600"
        {...rest}
      >
        <option value="">選択してください</option>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function TwoCol({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}
