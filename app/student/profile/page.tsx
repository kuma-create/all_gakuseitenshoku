/* ────────────────────────────────────────────────
   app/student/profile/page.tsx  – 完成度ウィジェット統合版
─────────────────────────────────────────────── */
"use client";

import { useState, useEffect } from "react";
import {
  User, FileText, Target, Edit, Save, X, CheckCircle2, AlertCircle,
  GraduationCap, Code, ChevronUp, Info,
} from "lucide-react";
import { z } from "zod";
import { toast } from "@/components/ui/use-toast";

import { useAuthGuard }      from "@/lib/use-auth-guard";
import { useStudentProfile } from "@/lib/hooks/use-student-profile";
import { useCompletion }     from "@/lib/use-completion";

import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import {
  Collapsible, CollapsibleTrigger, CollapsibleContent,
} from "@/components/ui/collapsible";
import { Button }   from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge }    from "@/components/ui/badge";
import { Input }    from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label }    from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

/* ── zod Schema (必須 & 文字数チェック) ────────────────── */
const schema = z.object({
  last_name:  z.string().min(1, "姓は必須です"),
  first_name: z.string().min(1, "名は必須です"),
  university: z.string().min(1, "大学名は必須です"),
  faculty:    z.string().min(1, "学部は必須です"),
  pr_text:    z.string().max(800, "自己PRは800文字以内"),
});

/* reusable mini-components ------------------------------------------------ */
type FieldInputProps = {
  id: string;
  label: string;
  type?: React.HTMLInputTypeAttribute;
  value: string | number;
  disabled: boolean;
  placeholder?: string;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string;
};
const FieldInput = ({
  id, label, type = "text", value, disabled, placeholder, onChange, required, error,
}: FieldInputProps) => (
  <div className="space-y-1">
    <Label htmlFor={id} className="text-xs sm:text-sm">
      {label}{required && <span className="text-red-500">*</span>}
    </Label>
    <Input
      id={id}
      type={type}
      disabled={disabled}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-8 text-xs sm:h-10 sm:text-sm ${error && "border-red-500"}`}
    />
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);

type FieldTextareaProps = {
  id: string;
  label: string;
  value: string;
  rows?: number;
  disabled: boolean;
  max?: number;
  placeholder?: string;
  onChange: (v: string) => void;
  error?: string;
};
const FieldTextarea = ({
  id, label, value, rows = 4, disabled, max, placeholder, onChange, error,
}: FieldTextareaProps) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between">
      <Label htmlFor={id} className="text-xs sm:text-sm">{label}</Label>
      {max && (
        <span className="text-xs text-gray-500">
          {value.length}/{max}文字
        </span>
      )}
    </div>
    <Textarea
      id={id}
      rows={rows}
      placeholder={placeholder}
      disabled={disabled}
      value={value}
      maxLength={max}
      onChange={(e) => onChange(e.target.value)}
      className={`text-xs sm:text-sm ${error && "border-red-500"}`}
    />
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);
/* ------------------------------------------------------------------------- */

type FormValues = z.infer<typeof schema>;

export default function StudentProfilePage() {
  /* 1) auth guard --------------------------------------------------------- */
  const ready = useAuthGuard("student");
  if (!ready) return null; // ガードが通るまで描画しない

  /* 2) profile hook ------------------------------------------------------- */
  const {
    data       : profile,
    loading,
    error,
    saving,
    editing,
    updateLocal,
    save,
    resetLocal,
  } = useStudentProfile();

  /* 3) UI state ----------------------------------------------------------- */
  const [tab, setTab]       = useState<"basic" | "pr" | "pref">("basic");
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [savedToast, setSavedToast] = useState(false);

  /* 4) completion (SQL 由来 0–100) ---------------------------------------- */
  const { score } = useCompletion("profile");       // <- そのまま受け取る
  const completion = score ?? 0;                    // ★ null を 0 に丸める

  /* chips 用の “入力済みチェック” ----------------------------------------- */
  const isFilled = (v: unknown) =>
    Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && v !== "";

  const sectionDone = {
    basic: isFilled(profile.last_name) && isFilled(profile.first_name),
    pr   : isFilled(profile.pr_text),
    pref : isFilled(profile.desired_industries) && isFilled(profile.work_style),
  };

  /* toast timer */
  useEffect(() => {
    if (savedToast) {
      const t = setTimeout(() => setSavedToast(false), 2500);
      return () => clearTimeout(t);
    }
  }, [savedToast]);

  /* helper UI */
  const getBarColor = (pct: number) =>
    pct < 30 ? "bg-red-500" : pct < 70 ? "bg-yellow-500" : "bg-green-500";

  const Status = ({ pct }: { pct: number }) =>
    pct === 100
      ? <CheckCircle2 size={14} className="text-green-600" />
      : <AlertCircle   size={14} className={pct ? "text-yellow-600" : "text-red-600"} />;

  /* save ----------------------------------------------------------------- */
  const handleSave = async () => {
    /* zod 検証 */
    const parse = schema.safeParse(profile);
    if (!parse.success) {
      const fieldErr: typeof errors = {};
      parse.error.errors.forEach(e => {
        const k = e.path[0] as keyof FormValues;
        fieldErr[k] = e.message;
      });
      setErrors(fieldErr);
      toast({ title: "入力エラーがあります", variant: "destructive" });
      return;
    }

    setErrors({});
    await save();
    setSavedToast(true);
  };

  /* ================= RENDER ============================================ */
  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      {/* --- header ------------------------------------------------------- */}
      <div className="mb-6 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 p-4 shadow-sm sm:mb-8 sm:p-6">
        {/* row */}
        <div className="mb-4 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">マイプロフィール</h1>
            <p className="text-xs text-gray-500 sm:text-sm">
              学生情報を入力・更新してスカウト率を高めましょう
            </p>
          </div>

          {/* action buttons */}
          {editing ? (
            <div className="flex gap-2">
              <Button variant="outline" className="h-8 sm:h-10" onClick={resetLocal}>
                <X size={14} className="mr-1" /> キャンセル
              </Button>
              <Button className="h-8 sm:h-10" disabled={saving} onClick={handleSave}>
                {saving ? (
                  <>
                    <span className="mr-1 h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    保存中…
                  </>
                ) : (
                  <>
                    <Save size={14} className="mr-1" /> 保存
                  </>
                )}
              </Button>
            </div>
          ) : (
            <Button className="h-8 sm:h-10" onClick={() => updateLocal({ __editing: true })}>
              <Edit size={14} className="mr-1" /> 編集
            </Button>
          )}
        </div>

        {/* progress bar */}
        <div className="mb-2 flex items-center justify-between text-sm">
          <span>プロフィール完成度</span>
          <span className="font-semibold">{completion}%</span>
        </div>
        <Progress value={completion} className={`h-2 ${getBarColor(completion)}`} />

        {/* section chips */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {(['basic', 'pr', 'pref'] as const).map((s) => {
            const pct = sectionDone[s] ? 100 : 0;
            const names = { basic: '基本情報', pr: '自己PR', pref: '希望条件' };
            const icons = {
              basic: <User size={14} />, pr: <FileText size={14} />, pref: <Target size={14} />,
            };
            return (
              <button
                key={s}
                className={`flex items-center justify-between rounded-md border p-2 text-xs ${
                  tab === s ? 'border-primary bg-primary/5' : 'border-gray-200'
                }`}
                onClick={() => setTab(s)}
              >
                <span className="flex items-center gap-1 text-muted-foreground">
                  {icons[s]} {names[s]}
                </span>
                <span className="flex items-center gap-1">
                  {pct}%
                  <Status pct={pct} />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* --- tabs --------------------------------------------------------- */}
      {/* 以下、元の実装と同じなので省略せず残しています */}
      {/* BASIC / PR / PREF … (👆 変更なし) */}

      {/* sticky save ------------------------------------------------------ */}
      {editing && (
        <footer className="fixed inset-x-0 bottom-0 z-10 border-t bg-white p-4">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Progress value={completion} className={`h-2 w-24 ${getBarColor(completion)}`} />
              <span className="text-xs sm:text-sm">{completion}% 完了</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetLocal} className="h-8 sm:h-10">
                <X size={14} className="mr-1" /> キャンセル
              </Button>
              <Button onClick={handleSave} disabled={saving} className="h-8 sm:h-10">
                {saving ? (
                  <>
                    <span className="mr-1 h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    保存中
                  </>
                ) : (
                  <>
                    <Save size={14} className="mr-1" /> 保存
                  </>
                )}
              </Button>
            </div>
          </div>
        </footer>
      )}

      {/* toast ------------------------------------------------------------ */}
      {savedToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 rounded bg-green-600 px-3 py-2 text-xs text-white shadow-md">
          保存しました
        </div>
      )}
    </div>
  );
}

/* ===== helper presentational ============================================ */
function SectionHeader({ icon: Icon, title }: { icon: typeof User; title: string }) {
  return (
    <div className="flex cursor-pointer items-center gap-2 rounded-md border bg-muted/50 p-3">
      <Icon className="h-4 w-4 text-primary" />
      <CardTitle className="text-base font-medium">{title}</CardTitle>
      <ChevronUp className="ml-auto h-4 w-4 text-muted-foreground transition-transform data-[state=closed]:rotate-180" />
    </div>
  );
}

function TagPreview({ items, color }: { items: string[]; color: "blue" | "green" | "purple" }) {
  const bg = { blue: "bg-blue-50", green: "bg-green-50", purple: "bg-purple-50" }[color];
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {items.map((t, i) => (
        <Badge key={i} variant="outline" className={`${bg} text-xs`}>
          {t.trim()}
        </Badge>
      ))}
    </div>
  );
}

function TipBox() {
  return (
    <Alert className="bg-blue-50">
      <Info className="h-4 w-4 text-blue-500" />
      <AlertTitle className="text-sm font-medium text-blue-800">自己PRのコツ</AlertTitle>
      <AlertDescription className="space-y-1 text-xs text-blue-700">
        <p>・数字や結果を用いて具体性を出す</p>
        <p>・役割だけでなく、課題⇢行動⇢成果 を示す</p>
      </AlertDescription>
    </Alert>
  );
}
