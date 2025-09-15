/* ────────────────────────────────────────────────
   app/student/profile/page.tsx – v3.2 (hook順完全修正版)
─────────────────────────────────────────────── */
"use client"

import { useState, useEffect, useRef, HTMLInputTypeAttribute } from "react"
import { flushSync } from "react-dom";
// Detect Safari so we can gracefully degrade unsupported input types
const isSafari =
  typeof navigator !== "undefined" &&
  /Safari/.test(navigator.userAgent) &&
  !/Chrome/.test(navigator.userAgent);
import {
  User, FileText, Target, Edit, Save, X, CheckCircle2, AlertCircle,
  GraduationCap, Code, ChevronUp, Info, Loader2, ChevronsUpDown, Check,
} from "lucide-react"
import { z } from "zod"
import { toast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase/client";

/* ---------- hooks ---------- */
import { useAuthGuard }        from "@/lib/use-auth-guard"
import { useStudentProfile }   from "@/lib/hooks/use-student-profile"
import { useProfileCompletion } from "@/lib/hooks/useProfileCompletion"

/* ---------- UI ---------- */
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card"
import { Tabs, TabsList, TabsContent } from "@/components/ui/tabs"
import {
  Collapsible, CollapsibleTrigger, CollapsibleContent,
} from "@/components/ui/collapsible"
import { Button }   from "@/components/ui/button"
import { Badge }    from "@/components/ui/badge"
import { Input }    from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label }    from "@/components/ui/label"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import SkillPicker from "@/components/SkillPicker"
import QualificationPicker from "@/components/QualificationPicker"
import type { Database } from "@/lib/supabase/types"


/* ---------- type patch: extend generated row ---------- */
type StudentProfileRow = Database["public"]["Tables"]["student_profiles"]["Row"] & {
  /** 新カラム: 配列型で追加 */
  skills?: string[] | null
  qualifications?: string[] | null
}

/* ── zod Schema ─────────────────────────────── */
const schema = z.object({
  last_name : z.string().min(1, "姓は必須です"),
  first_name: z.string().min(1, "名は必須です"),
  university: z.string().min(1, "大学名は必須です"),
  faculty   : z.string().min(1, "学部は必須です"),
  pr_text   : z.string().max(800, "自己PRは800文字以内"),
  preferred_industries : z.array(z.string()).default([]).optional(),
  desired_positions    : z.array(z.string()).default([]).optional(),
  desired_locations    : z.array(z.string()).default([]).optional(),
  work_style_options   : z.array(z.string()).default([]).optional(),
  admission_month  : z.string().regex(/^\d{4}-\d{2}$/).optional(),
  graduation_month : z.string().regex(/^\d{4}-\d{2}$/).optional(),
  gender             : z.enum(["male","female","other"]).optional(),
  desired_industries : z.array(z.string()).default([]).optional(),
})


/* ── checkbox master data ───────────────────────────── */
const INDUSTRY_OPTIONS = [
  "IT・通信","メーカー","商社","金融","コンサルティング","マスコミ",
  "広告・マーケティング","サービス","小売・流通","医療・福祉",
  "教育","公務員",
] as const;

const JOB_TYPE_OPTIONS = [
  "エンジニア","営業","経営","経営企画","企画","マーケティング","広報","コンサルタント","研究・開発",
  "デザイナー","総務・人事","経理・財務","生産管理","品質管理","物流","販売・サービス","その他"
] as const;

const LOCATION_OPTIONS = [
  "東京","神奈川","千葉","埼玉","大阪","京都","兵庫","奈良",
  "愛知","福岡","北海道","宮城","広島","沖縄","海外","リモート可",
] as const;

const WORK_PREF_OPTIONS = [
  "フレックスタイム制","リモートワーク可","副業可","残業少なめ",
  "土日祝休み","有給取得しやすい","育児支援制度あり","研修制度充実",
] as const;

const WORK_STYLE_CHOICES = [
  "正社員",
  "インターン",
  "アルバイト",
  "契約社員",
] as const;

const EMPLOYMENT_TYPE_CHOICES = [
  "フルタイム",
  "パートタイム",
  "契約",
  "業務委託",
  "インターン",
] as const;

function CheckboxGroup({
  idPrefix,
  options,
  values,
  onChange,
  onSave,
}: {
  idPrefix: string;
  options: readonly string[];
  values: string[];
  onChange: (v: string[]) => void;
  onSave?: () => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 sm:gap-2">
      {options.map((opt) => {
        const checked = values.includes(opt);
        return (
          <div key={opt} className="flex items-center space-x-1 sm:space-x-2">
            <input
              id={`${idPrefix}-${opt}`}
              type="checkbox"
              className="h-3.5 w-3.5 sm:h-4 sm:w-4"
              checked={checked}
              onChange={(e) => {
                let nv: string[];
                if (e.target.checked) {
                  // ➕ 追加: 重複を避けるため一度 Set に通す
                  nv = Array.from(new Set([...values, opt]));
                } else {
                  nv = values.filter((v) => v !== opt);
                }

                /* 1️⃣ まずローカル state を同期的に反映させる */
                flushSync(() => {
                  onChange(nv);
                });
              }}
            />
            <Label
              htmlFor={`${idPrefix}-${opt}`}
              className="text-xs sm:text-sm"
            >
              {opt}
            </Label>
          </div>
        );
      })}
    </div>
  );
}

/* ── reusable field components ─────────────── */
type FieldInputProps = {
  id: string
  label: string
  value: string | number
  disabled?: boolean
  onChange: (v: string) => void
  onBlur?: () => void
  type?: HTMLInputTypeAttribute
  placeholder?: string
  required?: boolean
  error?: string
  min?: string
  max?: string
}
const FieldInput = ({
  id, label, value, disabled = false, onChange, onBlur,
  type = "text", placeholder, required, error, min, max,
}: FieldInputProps) => (
  <div className="space-y-1">
    <Label htmlFor={id} className="text-xs sm:text-sm">
      {label}{required && <span className="text-red-500">*</span>}
    </Label>
    <Input
      id={id} type={type} disabled={disabled}
      placeholder={placeholder} min={min} max={max} value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      className={`h-8 text-xs sm:h-10 sm:text-sm ${error ? "border-red-500" : ""} ${
        value ? "text-gray-900 font-medium" : ""
      } placeholder:text-gray-400`}
    />
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
)

type FieldTextareaProps = {
  id: string; label: string; value: string
  disabled?: boolean; onChange: (v: string) => void
  onBlur?: () => void
  rows?: number; max?: number; placeholder?: string; error?: string
}
const FieldTextarea = ({
  id, label, value, disabled = false, onChange, onBlur,
  rows = 4, max, placeholder, error,
}: FieldTextareaProps) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between">
      <Label htmlFor={id} className="text-xs sm:text-sm">{label}</Label>
      {max && <span className="text-xs text-gray-500">{value.length}/{max}文字</span>}
    </div>
    <Textarea
      id={id} rows={rows} maxLength={max} disabled={disabled}
      placeholder={placeholder} value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      className={`text-xs sm:text-sm ${error ? "border-red-500" : ""} ${
        value ? "text-gray-900 font-medium" : ""
      } placeholder:text-gray-400`}
    />
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
)

/* ---------- 型 ---------- */
type FormValues = z.infer<typeof schema>

/* ====================================================================== */
export default function StudentProfilePage() {
  /* 🚩 1) すべてのフックを **無条件で先頭** で呼ぶ */
  const ready = useAuthGuard("student")
  const {
    data: rawProfile, loading, error, saving,
    updateLocal, save,
  } = useStudentProfile()
  // Cast to the extended type so skills / qualifications are recognized
  const profile = rawProfile as StudentProfileRow
  // dirtyRef, updateMark, handleBlur
  const dirtyRef = useRef(false)

  // ---- auto‑save after state commit (Pattern A) ----
  const firstRender = useRef(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // hydrate once guard for legacy -> gender
  const hydratedGender = useRef(false);

  /**
   * Guarded save: 確実にセッションが確立され、student_profiles 行が存在してから save() を実行。
   * 初回だけ 401/403 を踏むケースに備えてリトライも行う。
   */
  const ensureProfileRow = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) return { ok: false as const, reason: "no-session" };

      // row がまだ取れていない(初回)場合は upsert で確保
      if (!profile?.id) {
        const { data, error } = await supabase
          .from("student_profiles")
          .upsert({ user_id: uid }, { onConflict: "user_id" })
          .select("id,user_id")
          .maybeSingle();
        if (error) return { ok: false as const, reason: "upsert-error", error };
        if (data && !profile.id) {
          // ローカルにも反映
          updateLocal({ id: data.id, user_id: data.user_id } as Partial<StudentProfileRow>);
        }
      }
      return { ok: true as const };
    } catch (e) {
      return { ok: false as const, reason: "unknown", error: e };
    }
  };

  const guardedSave = async () => {
    const prep = await ensureProfileRow();
    if (!prep.ok) return; // セッション未確立などは黙って無視（次回で保存）

    try {
      await save();
    } catch (e: any) {
      // 初回のセッション遅延や RLS による 401/403 対策でワンショット再試行
      const msg = String(e?.message ?? "");
      if (/\b(401|403)\b/.test(msg)) {
        await new Promise((r) => setTimeout(r, 600));
        await save();
        return;
      }
      throw e;
    }
  };

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (!dirtyRef.current) return;

    // debounce 300 ms to coalesce rapid clicks
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      dirtyRef.current = false;
      try {
        await guardedSave();
      } catch (e: any) {
        toast({
          title: "保存に失敗しました",
          description: e?.message ?? "ネットワークまたはサーバーエラー",
          variant: "destructive",
        });
      }
    }, 300);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [profile]);

  // 値を変更 → ローカルだけ更新し dirty フラグ
  const updateMark = (partial: Partial<StudentProfileRow>) => {
    updateLocal(partial)
    dirtyRef.current = true
  }

  // フォーカスアウトかナビゲーション時に呼び出し
  const handleBlur = async () => {
    if (!dirtyRef.current) return
    dirtyRef.current = false
    try {
      await guardedSave()
    } catch (e: any) {
      toast({
        title: "保存に失敗しました",
        description: e?.message ?? "ネットワークまたはサーバーエラー",
        variant: "destructive",
      })
    }
  }
  // Save before unload / route change
  useEffect(() => {
    const fn = () => {
      if (dirtyRef.current) {
        // fire and forget; cannot await in beforeunload
        guardedSave()
      }
    }
    window.addEventListener("beforeunload", fn)
    return () => window.removeEventListener("beforeunload", fn)
  }, [save])
  const completionObj = useProfileCompletion()               // null | { score: number }

  /* ↓ ローカル UI 用フックも guard の前に置く ↓ */
  const [tab, setTab] = useState<"basic" | "pr" | "pref">("basic")
  const [fieldErrs, setFieldErrs] =
    useState<Partial<Record<keyof FormValues, string>>>({})

  // 4つのマスタを統合して大学名候補を作成
  const [universities, setUniversities] = useState<string[]>([]);
  useEffect(() => {
    // 4つのマスタを統合して大学名候補を作成
    const sources = [
      "/universities_graduate.json",
      "/universities_national.json",
      "/universities_private.json",
      "/universities_public.json",
    ] as const;

    Promise.all(
      sources.map((url) =>
        fetch(url)
          .then((res) => (res.ok ? res.json() : []))
          .catch(() => [])
      )
    )
      .then((all) => {
        const merged = all.flatMap((raw: any) => {
          const arr =
            Array.isArray(raw)
              ? raw
              : raw?.universities ??
                raw?.data ??
                [];
          return Array.isArray(arr) ? arr : [];
        });

        const cleaned = Array.from(
          new Set(
            merged
              .map((v) => (typeof v === "string" ? v.trim() : ""))
              .filter((v) => v.length > 0)
          )
        ).sort((a, b) => a.localeCompare(b, "ja"));

        if (cleaned.length) setUniversities(cleaned);
      })
      .catch((err) => {
        console.warn("universities fetch failed:", err);
      });
  }, []);

  // --- Hydrate gender from existing data (resumes.form_data or legacy fields) ---
  useEffect(() => {
    // run only when profile is loaded, gender is missing, and not already hydrated
    if (!profile || hydratedGender.current) return;
    if (profile.gender != null && profile.gender !== "") return;

    (async () => {
      try {
        const uid = profile.user_id;
        // 1) Try resumes.form_data.basic.gender
        if (uid) {
          const { data } = await supabase
            .from("resumes")
            .select("form_data")
            .eq("user_id", uid)
            .maybeSingle();

          const raw = (data as any)?.form_data?.basic?.gender;
          const norm = (v: any): "male" | "female" | "other" | null => {
            if (!v) return null;
            const s = String(v).toLowerCase();
            if (["male", "m", "man", "男性", "だんせい"].includes(s)) return "male";
            if (["female", "f", "woman", "女性", "じょせい"].includes(s)) return "female";
            if (["other", "その他", "そ の た"].includes(s)) return "other";
            if (["1", "01"].includes(s)) return "male";      // numeric legacy
            if (["2", "02"].includes(s)) return "female";    // numeric legacy
            return null;
          };

          const fromResume = norm(raw);
          if (fromResume) {
            updateMark({ gender: fromResume });
            hydratedGender.current = true;
            await handleBlur();
            return;
          }
        }

        // 2) Try legacy columns on profile (boolean or code)
        const anyProf = profile as any;
        if (typeof anyProf.male === "boolean") {
          const g = anyProf.male ? "male" : "female";
          updateMark({ gender: g });
          hydratedGender.current = true;
          await handleBlur();
          return;
        }
        if (anyProf.sex != null) {
          const g = (() => {
            const s = String(anyProf.sex).toLowerCase();
            if (["male", "m", "1", "01", "男性"].includes(s)) return "male";
            if (["female", "f", "2", "02", "女性"].includes(s)) return "female";
            return "other";
          })();
          updateMark({ gender: g });
          hydratedGender.current = true;
          await handleBlur();
          return;
        }
        if (anyProf.gender_code != null) {
          const code = Number(anyProf.gender_code);
          const g = code === 1 ? "male" : code === 2 ? "female" : "other";
          updateMark({ gender: g });
          hydratedGender.current = true;
          await handleBlur();
          return;
        }
      } catch (e) {
        console.warn("gender hydration skipped:", e);
      }
    })();
  }, [profile?.user_id, profile?.gender]);

  // combobox UI state for university field
  const [uniOpen, setUniOpen] = useState(false);
  const [uniQuery, setUniQuery] = useState("");

  /* ── required keys per tab (saving scope) ─────────────────────────── */
  const TAB_REQUIRED: Record<typeof tab, (keyof FormValues)[]> = {
    basic: ['last_name', 'first_name', 'university', 'faculty'],
    pr   : ['pr_text'],
    pref : [],
  };

  const handleSave = async () => {
    /* 1) フロントバリデーション（現在タブのみ） ----------- */
    const parsed = schema.safeParse(profile);
    if (!parsed.success) {
      const reqKeys   = TAB_REQUIRED[tab];
      const errs: typeof fieldErrs = {};
      parsed.error.errors
        .filter(e => reqKeys.includes(e.path[0] as keyof FormValues))
        .forEach(e => {
          errs[e.path[0] as keyof FormValues] = e.message;
        });

      if (Object.keys(errs).length) {
        setFieldErrs(errs);
        toast({
          title: "入力エラーがあります",
          description: Object.values(errs).join(" / "),
          variant: "destructive",
        });
        return;
      }
    }
    /* エラーなし or 他タブのみ → クリア */
    setFieldErrs({});

    /* 2) 保存実行 ----------------------------------------- */
    try {
      // まず DB にコミット
      await save()

      /* --- resume.form_data を同期 (basic/pr/conditions) --- */
      const uid = profile.user_id;
      if (uid) {
        /* JSON に camelCase で保存する */
        const basic = {
          lastName:        profile.last_name ?? "",
          firstName:       profile.first_name ?? "",
          lastNameKana:    profile.last_name_kana ?? "",
          firstNameKana:   profile.first_name_kana ?? "",
          birthdate:       profile.birth_date ?? "",
          gender:          profile.gender ?? "",
          address:         profile.address_line ?? "",
        };

        const pr = {
          title:      profile.pr_title ?? "",
          content:    profile.pr_text ?? "",
          motivation: profile.motive ?? "",
        };

        const conditions = {
          jobTypes:        profile.desired_positions ?? [],
          locations:       profile.desired_locations ?? [],
          industries:      profile.preferred_industries ?? [],
          workPreferences: profile.work_style_options ?? [],
          workStyle:       profile.work_style ?? "",
        };

        await supabase
          .from("resumes")
          .upsert(
            {
              user_id: uid,
              form_data: { basic, pr, conditions },
            },
            { onConflict: "user_id" }
          )
          .throwOnError();
      }

      // 成功トースト
      toast({
        title: "保存しました",
        variant: "default",
      })
    } catch (err: any) {
      toast({
        title: "保存に失敗しました",
        description: err?.message ?? "ネットワークまたはサーバーエラー",
        variant: "destructive",
      })
      console.error("profile save error:", err)
    }
  }


  /* 🚩 2) guard はフック呼び出しの **後ろ** なので常に同数のフック */
  if (!ready || loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
        読み込み中…
      </div>
    )
  }
  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center text-red-600">
        {error.message}
      </div>
    )
  }

  /* 3) 完成度などの派生値 ---------------------------------------- */

  const isFilled = (v: unknown) =>
    Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && v !== ""

  /* ── section completeness ── */
  const basicList = [
    profile.last_name,
    profile.first_name,
    profile.postal_code,
    profile.prefecture,
    profile.city,
    profile.address_line,
    profile.birth_date,
    profile.gender,
  ]
  const prList = [
    profile.pr_title,
    profile.pr_text,
    profile.about,
  ]
  /* 希望条件タブで完了判定に使う 4 つの配列 */
  const prefList = [
    profile.desired_positions,     // 希望職種
    profile.work_style_options,    // 働き方オプション
    profile.preferred_industries,  // 希望業界
    profile.desired_locations,     // 希望勤務地
  ]

  const pct = (arr: unknown[]) =>
    Math.round((arr.filter(isFilled).length / arr.length) * 100)

  const sectionPct = {
    basic: pct(basicList),
    pr: pct(prList),
    pref: pct(prefList),
  }

  /* ── section error flags ───────────────────────────── */
  const sectionError = {
    basic: ['last_name', 'first_name', 'university', 'faculty']
      .some(k => !!fieldErrs[k as keyof FormValues]),
    pr   : ['pr_text']
      .some(k => !!fieldErrs[k as keyof FormValues]),
    pref : false, // 現状必須チェックなし
  } as const;

  /* overall completion: simple average of three sections */
  const completionScore = Math.round(
    (sectionPct.basic + sectionPct.pr + sectionPct.pref) / 3
  )

  /* 4) helpers */
  const getBarColor = (pct: number) =>
    pct < 30 ? "bg-red-500"
    : pct < 70 ? "bg-yellow-500"
    :            "bg-green-500"

  const Status = ({ pct }: { pct: number }) =>
    pct === 100
      ? <CheckCircle2 size={14} className="text-green-600" />
      : <AlertCircle size={14} className={pct ? "text-yellow-600" : "text-red-600"} />



  /* ================= RENDER ========================================== */
  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 pb-28 md:pb-8">
      {/* ---------- header ---------- */}
      <div className="mb-6 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 p-4 shadow-sm sm:mb-8 sm:p-6">
        <div className="mb-4 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">マイプロフィール</h1>
            <p className="text-xs text-gray-500 sm:text-sm">
              学生情報を入力・更新してスカウト率を高めましょう
            </p>
          </div>

        </div>

        {/* progress */}
        <div className="mb-2 flex items-center justify-between text-sm">
          <span>プロフィール完成度</span>
          <span className="font-semibold">{completionScore}%</span>
        </div>
        <div className="h-2 w-full rounded bg-gray-200">
          <div
            className={`h-full rounded ${getBarColor(completionScore)}`}
            style={{ width: `${completionScore}%` }}
          />
        </div>

        {/* section chips */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {(['basic', 'pr', 'pref'] as const).map((s) => {
            const pct = sectionPct[s];
            const names = { basic: '基本情報', pr: '自己PR', pref: '希望条件' };
            const icons = {
              basic: <User size={14} />, pr: <FileText size={14} />, pref: <Target size={14} />,
            };
            return (
              <button
                key={s}
                className={`flex items-center justify-between rounded-md border p-2 text-xs ${
                  tab === s ? 'border-primary bg-primary/5' : 'border-gray-200'
                } ${sectionError[s] ? 'border-red-500 text-red-600' : ''}`}
                onClick={() => setTab(s)}
              >
                <span className="flex items-center gap-1 text-muted-foreground">
                  {icons[s]} {names[s]}
                </span>
                <span className={`flex items-center gap-1 ${sectionError[s] && 'text-red-600'}`}>
                  {pct}% <Status pct={pct} />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------- tabs ---------- */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="space-y-6">
        <TabsList className="hidden" /> {/* トリガは上で自作したので隠す */}

        {/* BASIC ========================================================= */}
        <TabsContent value="basic" className="space-y-4">
          {/* ============ 基本情報 ============= */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger asChild>
              <SectionHeader icon={User} title="基本情報" />
            </CollapsibleTrigger>
            <CollapsibleContent className="animate-accordion-down">
              <Card className="border-t-0">
                <CardContent className="space-y-4 p-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FieldInput
                      id="last_name"
                      label="姓"
                      required
                      value={profile.last_name ?? ''}
                      onChange={(v) => updateMark({ last_name: v })}
                      onBlur={handleBlur}
                      error={fieldErrs.last_name}
                    />
                    <FieldInput
                      id="first_name"
                      label="名"
                      required
                      value={profile.first_name ?? ''}
                      onChange={(v) => updateMark({ first_name: v })}
                      onBlur={handleBlur}
                      error={fieldErrs.first_name}
                    />
                    <FieldInput
                      id="last_name_kana"
                      label="セイ"
                      value={profile.last_name_kana ?? ''}
                      onChange={(v) => updateMark({ last_name_kana: v })}
                      onBlur={handleBlur}
                    />
                    <FieldInput
                      id="first_name_kana"
                      label="メイ"
                      value={profile.first_name_kana ?? ''}
                      onChange={(v) => updateMark({ first_name_kana: v })}
                      onBlur={handleBlur}
                    />
                  </div>

                  <FieldInput
                    id="phone"
                    label="電話番号"
                    value={profile.phone ?? ''}
                    onChange={(v) => updateMark({ phone: v })}
                    onBlur={handleBlur}
                  />
                  {/* 性別 */}
                  <div className="space-y-1">
                    <Label className="text-xs sm:text-sm">性別</Label>
                    <div className="flex gap-4">
                      {[
                        { key: "male",   label: "男性" },
                        { key: "female", label: "女性" },
                        { key: "other",  label: "その他" },
                      ].map(({ key, label }) => (
                        <label key={key} className="flex items-center gap-1 text-xs sm:text-sm">
                          <input
                            type="radio"
                            name="gender"
                            value={key}
                            checked={profile.gender === key}
                            onChange={() => updateMark({ gender: key })}
                            onBlur={handleBlur}
                            className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                  {/* 住所4項目 */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <FieldInput
                      id="postal_code"
                      label="郵便番号"
                      value={profile.postal_code ?? ''}
                      onChange={(v) => updateMark({ postal_code: v })}
                      onBlur={handleBlur}
                    />
                    <FieldInput
                      id="prefecture"
                      label="都道府県"
                      value={profile.prefecture ?? ''}
                      onChange={(v) => updateMark({ prefecture: v })}
                      onBlur={handleBlur}
                    />
                    <FieldInput
                      id="city"
                      label="市区町村"
                      value={profile.city ?? ''}
                      onChange={(v) => updateMark({ city: v })}
                      onBlur={handleBlur}
                    />
                  </div>
                  <FieldInput
                    id="address_line"
                    label="番地・建物名など"
                    value={profile.address_line ?? ''}
                    onChange={(v) => updateMark({ address_line: v })}
                    onBlur={handleBlur}
                  />
                  <FieldInput
                    id="hometown"
                    label="出身地"
                    value={profile.hometown ?? ''}
                    onChange={(v) => updateMark({ hometown: v })}
                    onBlur={handleBlur}
                  />
                  <FieldInput
                    id="birth_date"
                    type="date"
                    label="生年月日"
                    value={profile.birth_date ?? ''}
                    onChange={(v) => updateMark({ birth_date: v })}
                    onBlur={handleBlur}
                    placeholder="YYYY-MM-DD"
                  />
                <div className="flex items-center gap-2">
              </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          {/* ============ 学歴 =============== */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger asChild>
              <SectionHeader icon={GraduationCap} title="学歴" />
            </CollapsibleTrigger>
            <CollapsibleContent className="animate-accordion-down">
              <Card className="border-t-0">
                <CardContent className="space-y-4 p-4">
                  {/* 大学名（/public/universities_jp.json を参照・入力後に候補表示） */}
                  {/* 大学名（検索コンボボックス） */}
                  <div className="space-y-1">
                    <Label htmlFor="university" className="text-xs sm:text-sm">
                      大学名<span className="text-red-500">*</span>
                    </Label>
                    <Popover open={uniOpen} onOpenChange={setUniOpen}>
                      <PopoverTrigger asChild>
                        <button
                          id="university"
                          type="button"
                          className={`flex h-10 w-full items-center justify-between rounded-md border px-3 text-left text-sm ${
                            fieldErrs.university ? "border-red-500" : "border-input"
                          } ${profile.university ? "text-gray-900 font-medium" : "text-gray-400"}`}
                          aria-expanded={uniOpen}
                        >
                          <span className={`${profile.university ? "" : "text-gray-400"}`}>
                            {profile.university || "大学名を入力して検索"}
                          </span>
                          <ChevronsUpDown className="h-4 w-4 opacity-50" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command shouldFilter={false}>
                          <div className="px-2 py-2">
                            <CommandInput
                              placeholder="大学名を入力"
                              value={uniQuery}
                              onValueChange={(v) => setUniQuery(v)}
                              className="h-9 text-sm"
                              autoFocus
                            />
                          </div>
                          {!uniQuery.trim() ? (
                            <div className="px-3 py-2 text-xs text-muted-foreground">
                              1文字以上入力すると候補が表示されます
                            </div>
                          ) : (
                            <CommandList className="max-h-64 overflow-y-auto">
                              <CommandEmpty className="py-6 text-center text-sm">
                                候補が見つかりません
                              </CommandEmpty>
                              <CommandGroup heading="候補">
                                {universities
                                  .filter((u) => u.toLowerCase().includes(uniQuery.trim().toLowerCase()))
                                  .slice(0, 200)
                                  .map((u) => (
                                    <CommandItem
                                      key={u}
                                      value={u}
                                      onSelect={() => {
                                        updateMark({ university: u });
                                        setUniQuery("");
                                        setUniOpen(false);
                                        // 保存トリガ
                                        handleBlur();
                                      }}
                                      className="text-sm"
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 ${
                                          profile.university === u ? "opacity-100" : "opacity-0"
                                        }`}
                                      />
                                      {u}
                                    </CommandItem>
                                  ))}
                              </CommandGroup>
                              {/* 自由入力の使用 */}
                              {uniQuery.trim() && (
                                <CommandGroup>
                                  <CommandItem
                                    value={`use-${uniQuery.trim()}`}
                                    onSelect={() => {
                                      updateMark({ university: uniQuery.trim() });
                                      setUniQuery("");
                                      setUniOpen(false);
                                      handleBlur();
                                    }}
                                    className="text-sm"
                                  >
                                    「{uniQuery.trim()}」を使用
                                  </CommandItem>
                                </CommandGroup>
                              )}
                            </CommandList>
                          )}
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {fieldErrs.university && (
                      <p className="text-xs text-red-500">{fieldErrs.university}</p>
                    )}
                  </div>
                  <FieldInput
                    id="faculty"
                    label="学部/研究科"
                    value={profile.faculty ?? ''}
                    onChange={(v) => updateMark({ faculty: v })}
                    onBlur={handleBlur}
                    error={fieldErrs.faculty}
                  />
                  <FieldInput
                    id="department"
                    label="学科/専攻"
                    value={profile.department ?? ''}
                    onChange={(v) => updateMark({ department: v })}
                    onBlur={handleBlur}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FieldInput
                      id="admission_month"
                      type={isSafari ? "text" : "month"}
                      label="入学年月"
                      value={profile.admission_month?.slice(0, 7) ?? ''}
                      min="2018-01"
                      max="2030-12"
                      onChange={(v) => updateMark({ admission_month: v })}
                      onBlur={handleBlur}
                      placeholder="YYYY-MM"
                    />
                    <FieldInput
                      id="graduation_month"
                      type={isSafari ? "text" : "month"}
                      label="卒業予定月"
                      value={profile.graduation_month?.slice(0, 7) ?? ''}
                      min="2018-01"
                      max="2030-12"
                      onChange={(v) => updateMark({ graduation_month: v })}
                      onBlur={handleBlur}
                      placeholder="YYYY-MM"
                    />
                  </div>
                  <FieldTextarea
                    id="research_theme"
                    label="研究テーマ"
                    rows={3}
                    value={profile.research_theme ?? ''}
                    max={500}
                    onChange={(v) => updateMark({ research_theme: v })}
                    onBlur={handleBlur}
                  />
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          {/* ============ スキル =============== */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger asChild>
              <SectionHeader icon={Code} title="スキル" />
            </CollapsibleTrigger>
            <CollapsibleContent className="animate-accordion-down">
              <Card className="border-t-0">
                <CardContent className="space-y-4 p-4">
                  <SkillPicker
                    values={profile.skills ?? []}
                    onChange={(vals) => {
                      updateMark({ skills: vals })
                      handleBlur()
                    }}
                  />
                  {(profile.skills?.length ?? 0) > 0 && (
                    <TagPreview items={profile.skills as string[]} color="blue" />
                  )}

                  <QualificationPicker
                    values={profile.qualifications ?? []}
                    onChange={(vals) => {
                      updateMark({ qualifications: vals })
                      handleBlur()
                    }}
                  />
                  {(profile.qualifications?.length ?? 0) > 0 && (
                    <TagPreview items={profile.qualifications as string[]} color="green" />
                  )}
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        </TabsContent>

        {/* PR ============================================================ */}
        <TabsContent value="pr">
          <Card>
            <CardHeader className="flex gap-2 p-4">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>自己PR</CardTitle>
                <CardDescription>あなたの強みをアピールしましょう</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <FieldInput
                id="pr_title"
                label="PR タイトル"
                value={profile.pr_title ?? ''}
                placeholder="あなたを一言で表してみましょう"
                onChange={(v) => updateMark({ pr_title: v })}
                onBlur={handleBlur}
              />
              <FieldTextarea
                id="about"
                label="自己紹介"
                rows={2}
                max={200}
                value={profile.about ?? ''}
                placeholder="200文字以内で自己紹介"
                onChange={(v) => updateMark({ about: v })}
                onBlur={handleBlur}
              />
              <FieldTextarea
                id="pr_text"
                label="自己PR"
                rows={10}
                max={800}
                value={profile.pr_text ?? ''}
                placeholder="課題 → 行動 → 成果 の順でエピソードを具体的に記述しましょう"
                onChange={(v) => updateMark({ pr_text: v })}
                onBlur={handleBlur}
                error={fieldErrs.pr_text}
              />

              {/* 強み 3 つ */}
              <div className="space-y-1">
                <Label className="text-xs sm:text-sm">強み（最大3つ）</Label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <FieldInput
                      key={i}
                      id={`strength${i}`}
                      label={`強み${i}`}
                      value={(profile as any)[`strength${i}`] ?? ''}
                      placeholder="例: 問題解決力"
                      onChange={(v) => updateMark({ [`strength${i}`]: v })}
                      onBlur={handleBlur}
                    />
                  ))}
                </div>
              </div>

              <TipBox />
            </CardContent>
          </Card>
        </TabsContent>

        {/* PREF ========================================================== */}
        <TabsContent value="pref">
          <Card>
            <CardHeader className="flex gap-2 p-4">
              <Target className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>希望条件</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <div className="space-y-1">
                <Label htmlFor="work_style" className="text-xs sm:text-sm">希望勤務形態</Label>
                <Select
                  value={profile.work_style ?? ""}
                  onValueChange={(v) => {
                    updateMark({ work_style: v })
                    handleBlur()
                  }}
                >
                  <SelectTrigger id="work_style" className="w-full h-8 sm:h-10 text-xs sm:text-sm">
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    {WORK_STYLE_CHOICES.map((opt) => (
                      <SelectItem key={opt} value={opt} className="text-xs sm:text-sm">
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <FieldInput
                id="salary_range"
                label="希望年収"
                value={profile.salary_range ?? ''}
                placeholder="400万〜500万"
                onChange={(v) => updateMark({ salary_range: v })}
                onBlur={handleBlur}
              />

              {/* --- 希望職種 --- */}
              <div className="space-y-1 sm:space-y-2">
                <Label className="text-xs sm:text-sm">希望職種</Label>
                <CheckboxGroup
                  idPrefix="job"
                  options={JOB_TYPE_OPTIONS}
                  values={profile.desired_positions ?? []}
                  onChange={(vals) => updateMark({ desired_positions: vals })}
                  onSave={handleBlur}
                />
              </div>

              {/* --- 働き方オプション --- */}
              <div className="space-y-1 sm:space-y-2">
                <Label className="text-xs sm:text-sm">働き方オプション</Label>
                <CheckboxGroup
                  idPrefix="workpref"
                  options={WORK_PREF_OPTIONS}
                  values={profile.work_style_options ?? []}
                  onChange={(vals) => updateMark({ work_style_options: vals })}
                  onSave={handleBlur}
                />
              </div>

              {/* --- 希望業界 --- */}
              <div className="space-y-1 sm:space-y-2">
                <Label className="text-xs sm:text-sm">希望業界</Label>
                <CheckboxGroup
                  idPrefix="desiredindustry"
                  options={INDUSTRY_OPTIONS}
                  values={
                    Array.isArray(profile.preferred_industries)
                      ? profile.preferred_industries.map(String)
                      : []
                  }
                  onChange={(vals) => updateMark({ preferred_industries: vals })}
                  onSave={handleBlur}
                />
              </div>

              {/* locations */}
              {/* --- 希望勤務地 --- */}
              <div className="space-y-1 sm:space-y-2">
                <Label className="text-xs sm:text-sm">希望勤務地</Label>
                <CheckboxGroup
                  idPrefix="loc"
                  options={LOCATION_OPTIONS}
                  values={profile.desired_locations ?? []}
                  onChange={(vals) => updateMark({ desired_locations: vals })}
                  onSave={handleBlur}
                />
              </div>

              <FieldTextarea
                id="preference_note"
                label="備考"
                rows={4}
                max={500}
                value={profile.preference_note ?? ''}
                onChange={(v) => updateMark({ preference_note: v })}
                onBlur={handleBlur}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* sticky footer -------------------------------------------------- */}
      <footer className="fixed inset-x-0 bottom-0 z-10 border-t bg-white p-4 md:static md:border-0 md:p-0">
        <div className="container mx-auto flex items-center gap-2">
          <span className="text-xs sm:text-sm">完成度 {completionScore}%</span>
          <div className="h-1 w-24 rounded bg-gray-200">
            <div
              className={`h-full rounded ${getBarColor(completionScore)}`}
              style={{ width: `${completionScore}%` }}
            />
          </div>
          <span className="ml-auto text-xs text-gray-500">自動保存</span>
        </div>
      </footer>

    </div>
  )
}

/* ===== helper presentational ============================================ */
function SectionHeader({ icon: Icon, title }: { icon: typeof User; title: string }) {
  return (
    <div className="flex cursor-pointer items-center gap-2 rounded-md border bg-muted/50 p-3">
      <Icon className="h-4 w-4 text-primary" />
      <CardTitle className="text-base font-medium">{title}</CardTitle>
      <ChevronUp className="ml-auto h-4 w-4 text-muted-foreground transition-transform data-[state=closed]:rotate-180" />
    </div>
  )
}

function TagPreview({ items, color }: { items: string[]; color: 'blue' | 'green' | 'purple' }) {
  const bg = { blue: 'bg-blue-50', green: 'bg-green-50', purple: 'bg-purple-50' }[color]
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {items.map((t, i) => (
        <Badge key={i} variant="outline" className={`${bg} text-xs`}>
          {t.trim()}
        </Badge>
      ))}
    </div>
  )
}

function TipBox() {
  return (
    <Alert className="bg-blue-50">
      <Info className="h-4 w-4 text-blue-500" />
      <AlertTitle className="text-sm font-medium text-blue-800">自己PRのコツ</AlertTitle>
      <AlertDescription className="text-xs text-blue-700 space-y-1">
        <p>・数字や結果を用いて具体性を出す</p>
        <p>・役割だけでなく、課題⇢行動⇢成果 を示す</p>
      </AlertDescription>
    </Alert>
  )
}
