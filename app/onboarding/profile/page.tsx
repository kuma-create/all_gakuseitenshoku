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
  Card, CardHeader, CardTitle, CardContent,
  Alert, AlertDescription, Textarea,
} from "@/components/ui";

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
    .upsert({ user_id: user.id, ...data });
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

/* ---------------- 初期値 ---------------- */
const initialState: FormState = {
  last_name: "", first_name: "",
  last_name_kana: "", first_name_kana: "",
  phone: "", gender: genderOptions[0], birth_date: "",
  postal_code: "", prefecture: "", city: "", address_line: "",
  university: "", faculty: "", department: "", join_ipo: false,
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
    const tgt = e.target;
    const { id, value } = tgt as HTMLInputElement;
    if (tgt instanceof HTMLInputElement && tgt.type === "checkbox") {
      setForm((p) => ({ ...p, [id]: tgt.checked }));
    } else {
      setForm((p) => ({ ...p, [id]: value }));
    }
    if (id === "postal_code") {
      const digits = value.replace(/\D/g, "");
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
        await savePartial({
          university: form.university,
          faculty: form.faculty,
          department: form.department,
          join_ipo: form.join_ipo,
        });
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

      /* 2. 最終 upsert (行が無い場合は作成／ある場合は上書き) */
      const { error: dbErr } = await supabase.from("student_profiles").upsert({
        user_id: user.id,
        ...form,
        address: `${form.prefecture}${form.city}${form.address_line}`,
        avatar_url: avatarUrl,
        is_completed: true,
        experience: [
          { order: 1, text: form.company1 },
          { order: 2, text: form.company2 },
          { order: 3, text: form.company3 },
        ],
      });
      if (dbErr) throw dbErr;

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
            {step === 4 && <Step4Inputs form={form} onChange={handleChange} />}

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
            <label key={g} className="flex items-center gap-1 text-sm">
              <input
                type="radio"
                name="gender"
                value={g}
                checked={form.gender === g}
                onChange={(e) =>
                  onChange({ ...e, target: { ...e.target, id: "gender" } } as InputChange)
                }
              />
              {g}
            </label>
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
        <Label htmlFor="avatar">顔写真</Label>
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
      <div className="flex items-center gap-2">
        <input
          id="join_ipo"
          type="checkbox"
          checked={form.join_ipo}
          onChange={(e) => onChange({ ...e, target: { ...e.target, id: "join_ipo" } })}
        />
        <Label htmlFor="join_ipo">選抜コミュニティ IPO への参加を希望する</Label>
      </div>
    </div>
  );
}

function Step4Inputs({ form, onChange }: { form: FormState; onChange: (e: InputChange) => void }) {
  return (
    <div className="space-y-6">
      <TextField id="work_summary" label="職務経歴概要" value={form.work_summary} onChange={onChange} required />

      {[1, 2, 3].map((n) => (
        <Field
          key={n}
          id={`company${n}` as const}
          label={`${n}社目`}
          value={form[`company${n}` as keyof FormState] as string}
          onChange={onChange}
          required={n === 1}
        />
      ))}

      <TextField id="skill_text"        label="スキル" value={form.skill_text}        onChange={onChange} />
      <TextField id="qualification_text" label="資格" value={form.qualification_text} onChange={onChange} />
    </div>
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
