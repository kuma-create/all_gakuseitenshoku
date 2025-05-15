"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  Button,
  Input,
  Label,
  Checkbox,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Alert,
  AlertDescription,
  Textarea,
} from "@/components/ui"; // shadcn/ui を barrels している想定


 /* --------------- 共通イベント型 --------------- */
type InputChange =
    React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;

/* ─────── マスタデータ ─────── */
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


/* ステップごとのフォーム型 ------------------------------------------------ */
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

const [avatarFile, setAvatarFile] = useState<File | null>(null);  // ←ここ！
const [avatarUploading, setAvatarUploading] = useState(false);
const [avatarError, setAvatarError] = useState<string | null>(null);


const initialState: FormState = {
  /* step1 */
  last_name: "",
  first_name: "",
  last_name_kana: "",
  first_name_kana: "",
  phone: "",
  gender: genderOptions[0],
  birth_date: "",
  /* step2 */
  postal_code: "",
  prefecture: "",
  city: "",
  address_line: "",
  /* step3 */
  university: "",
  faculty: "",
  department: "",
  join_ipo: false,
  /* step4 */
  work_summary: "",
  company1: "",
  company2: "",
  company3: "",
  skill_text: "",
  qualification_text: "",
};

export default function OnboardingProfile() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [form, setForm] = useState<FormState>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


  // onboarding/profile/page.tsx
    const [zipLoading, setZipLoading] = useState(false);
    const [zipError  , setZipError]   = useState<string | null>(null);

  const fetchAddress = async (zipcode: string) => {
    setZipLoading(true);
    setZipError(null);
  
    try {
      const res = await fetch(
        `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zipcode}`
      );
      const json = await res.json();
  
      if (json.status !== 200 || !json.results?.length) {
        throw new Error(json.message || "住所が見つかりませんでした");
      }
  
      const { address1, address2, address3 } = json.results[0];
  
      setForm((p) => ({
        ...p,
        prefecture : address1,          // 東京都など
        city       : `${address2}${address3}`, // 千代田区千代田 など
        // address_line は番地以降を手入力してもらう
      }));
    } catch (err: any) {
      console.error(err);
      setZipError(err.message);
    } finally {
      setZipLoading(false);
    }
  };
  

  const handleChange = (e: InputChange) => {
    const target = e.target;
    const { id, value } = target;
  
    /* checkbox / radio だけ checked を見る */
    if (target instanceof HTMLInputElement && target.type === "checkbox") {
           setForm((p) => ({ ...p, [id]: target.checked }));
         } else {
           // radio / text / select などは value をそのまま入れる
           setForm((p) => ({ ...p, [id]: value }));
         }

    /* ② 郵便番号が 7 桁揃ったら自動検索 */
    if (id === "postal_code") {
        const digits = value.replace(/\D/g, "");   // 数字だけ
        if (digits.length === 7) fetchAddress(digits);
    }

  };

    useEffect(() => {
         (async () => {
           const { data: { user } } = await supabase.auth.getUser();
           if (!user) return;
    
           const meta = user.user_metadata as {
             last_name?: string;
             first_name?: string;
             full_name?: string;
           };
    
           /* ① 個別キー優先 */
           let ln = meta.last_name  ?? "";
           let fn = meta.first_name ?? "";
    
           /* ② 無ければ full_name を全角/半角スペースで分割 */
           if (!ln && !fn && meta.full_name) {
             [ln = "", fn = ""] = meta.full_name.split(/\s+/);
           }
    
           setForm((p) => ({ ...p, last_name: ln, first_name: fn }));
         })();
       }, []);

  /* ---------------- 送信 ---------------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 4) {
      setStep((s) => (s + 1) as typeof step);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    let avatarUrl: string | null = null;
    if (avatarFile) {
    setAvatarUploading(true);
    const ext = avatarFile.name.split(".").pop();
    const filePath = `${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(filePath, avatarFile, { upsert: false });

    if (upErr) {
        setAvatarError("画像をアップロードできませんでした");
        setAvatarUploading(false);
        return;
    }
    avatarUrl = supabase.storage.from("avatars").getPublicUrl(filePath).data.publicUrl;
    setAvatarUploading(false);
    }


    // 最終ステップ → DB へ保存
    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
        error: uErr,
      } = await supabase.auth.getUser();
      if (uErr || !user) throw new Error("認証が失効しました。再度ログインしてください。");

      const { error: insErr } = await supabase.from("student_profiles").upsert({
        user_id: user.id,
        last_name: form.last_name,
        first_name: form.first_name,
        last_name_kana: form.last_name_kana,
        first_name_kana: form.first_name_kana,
        phone: form.phone,
        gender: form.gender,
        birth_date: form.birth_date || null,
        postal_code: form.postal_code,
        address: `${form.prefecture}${form.city}${form.address_line}`,
        university: form.university,
        faculty: form.faculty,
        department: form.department,
        join_ipo: form.join_ipo,
        pr_text: form.work_summary,
        qualification_text: form.qualification_text,
        skill_text: form.skill_text,
        avatar_url: avatarUrl,
        /* 任意: company1～3 は experience JSON に格納する例 */
        experience: [
          { order: 1, text: form.company1 },
          { order: 2, text: form.company2 },
          { order: 3, text: form.company3 },
        ],
      });
      if (insErr) throw insErr;

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
          <CardTitle className="text-center text-2xl font-bold">ユーザー登録</CardTitle>
          <p className="mt-2 text-center text-blue-700 font-semibold">
            {step < 5 ? `残り${5 - step}ステップで完了` : "入力内容を確認して登録"}
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {step === 1 && <Step1Inputs form={form} onChange={handleChange} />}
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
              <Button type="submit" disabled={loading} className="ml-auto">
                {loading ? "保存中..." : step < 5 ? "保存して次へ" : "登録する"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

/* ────── ステップ別入力コンポーネント ────── */
function Step1Inputs({
  form,
  onChange,
}: {
  form: FormState;
  onChange: (e: InputChange) => void;
}) {
  return (
    <div className="space-y-6">
      {/* 氏名 */}
      <TwoCol>
        <Field id="last_name" label="苗字" value={form.last_name} onChange={onChange} required />
        <Field id="first_name" label="名前" value={form.first_name} onChange={onChange} required />
      </TwoCol>
      {/* ふりがな */}
      <TwoCol>
        <Field id="last_name_kana" label="みょうじ" value={form.last_name_kana} onChange={onChange} required />
        <Field id="first_name_kana" label="なまえ" value={form.first_name_kana} onChange={onChange} required />
      </TwoCol>
      {/* 電話 */}
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
                onChange={(e) => onChange({ ...e, target: { ...e.target, id: "gender" } } as InputChange)
            }
              />
              {g}
            </label>
          ))}
        </div>
      </div>

      {/* 生年月日 */}
      <Field id="birth_date" label="生年月日" type="date" value={form.birth_date} onChange={onChange} required />

      {/* 顔写真（任意） */}
    <div className="grid gap-2">
    <Label htmlFor="avatar">顔写真</Label>
    <Input
        id="avatar"
        type="file"
        accept="image/*"
        onChange={(e) => {
        const f = e.target.files?.[0] ?? null;
        setAvatarFile(f);          // ← state に保持
        setAvatarError(null);
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
    form,
    onChange,
    zipLoading,
    zipError,
  }: {
    form: FormState;
    onChange: (e: InputChange) => void;
    zipLoading: boolean;
    zipError: string | null;
  }) {
    return (
      /* ←── ルートはこの 1 つだけ */
      <div className="space-y-6">
        {/* ① 郵便番号 */}
        <div className="grid gap-2">
          <Label htmlFor="postal_code">郵便番号</Label>
          <Input
            id="postal_code"
            value={form.postal_code}
            onChange={onChange}
            placeholder="例）1000001"
            pattern="\d{3}-?\d{4}"
            maxLength={8}          /* 7 桁＋ハイフン許容 */
            required
          />
          {zipLoading && (
            <p className="text-xs text-gray-500">住所検索中…</p>
          )}
          {zipError && (
            <p className="text-xs text-red-600">{zipError}</p>
          )}
        </div>
  
        {/* ② 都道府県 / 市区町村 / 番地 */}
        <SelectField
          id="prefecture"
          label="都道府県"
          value={form.prefecture}
          onChange={onChange}
          options={prefectures}
          required
        />
        <Field
          id="city"
          label="市区町村"
          value={form.city}
          onChange={onChange}
          required
        />
        <Field
          id="address_line"
          label="それ以降の住所"
          value={form.address_line}
          onChange={onChange}
          placeholder="番地・建物名など"
        />
      </div>
    );
  }
  

function Step3Inputs({
  form,
  onChange,
}: { form: FormState; onChange: (e: InputChange) => void }) {
  return (
    <div className="space-y-6">
      <Field id="university" label="大学名" value={form.university} onChange={onChange} required />
      <Field id="faculty" label="学部名" value={form.faculty} onChange={onChange} required />
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

function Step4Inputs({
  form,
  onChange,
}: { form: FormState; onChange: (e: InputChange) => void }) {
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

      <TextField id="skill_text" label="スキル" value={form.skill_text} onChange={onChange} />
      <TextField id="qualification_text" label="資格" value={form.qualification_text} onChange={onChange} />
    </div>
  );
}

/* ───────── 汎用小コンポーネント ───────── */
function Field(
  { id, label, ...rest }:
  React.InputHTMLAttributes<HTMLInputElement> & { id: string; label: string }
) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} {...rest} />
    </div>
  );
}

function TextField(
  { id, label, ...rest }:
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { id: string; label: string }
) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea id={id} rows={4} {...rest} />
    </div>
  );
}

function SelectField({
  id,
  label,
  options,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  id: string;
  label: string;
  options: readonly string[];
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
