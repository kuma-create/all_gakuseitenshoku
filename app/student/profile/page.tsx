/* ────────────────────────────────────────────────
   app/student/profile/page.tsx  – 完成度ウィジェット統合版 (Hook 順序修正版)
─────────────────────────────────────────────── */
"use client";

import { useState, useEffect } from "react";
import {
  User, FileText, Target, Edit, Save, X, CheckCircle2, AlertCircle,
  ChevronUp, Info, Loader2,
} from "lucide-react";
import { z } from "zod";
import { toast } from "@/components/ui/use-toast";

/* ---------- hooks ---------- */
import { useAuthGuard }      from "@/lib/use-auth-guard";
import { useStudentProfile } from "@/lib/hooks/use-student-profile";
import { useCompletion }     from "@/lib/use-completion";

/* ---------- UI ---------- */
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button }   from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge }    from "@/components/ui/badge";
import { Input }    from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label }    from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

/* ── zod Schema ────────────────────────────────────────────────────────── */
const schema = z.object({
  last_name : z.string().min(1, "姓は必須です"),
  first_name: z.string().min(1, "名は必須です"),
  university: z.string().min(1, "大学名は必須です"),
  faculty   : z.string().min(1, "学部は必須です"),
  pr_text   : z.string().max(800, "自己PRは800文字以内"),
});

/* ---------- mini-components (FieldInput / FieldTextarea) 省略せず記載 ---------- */
type FieldInputProps = {
  id: string; label: string; value: string | number;
  type?: React.HTMLInputTypeAttribute;
  disabled: boolean; placeholder?: string;
  onChange: (v: string) => void;
  required?: boolean; error?: string;
};
const FieldInput = ({
  id, label, value, disabled, onChange,
  type = "text", placeholder, required, error,
}: FieldInputProps) => (
  <div className="space-y-1">
    <Label htmlFor={id} className="text-xs sm:text-sm">
      {label}{required && <span className="text-red-500">*</span>}
    </Label>
    <Input
      id={id} type={type} disabled={disabled}
      placeholder={placeholder} value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-8 text-xs sm:h-10 sm:text-sm ${error && "border-red-500"}`}
    />
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);

type FieldTextareaProps = {
  id: string; label: string; value: string;
  rows?: number; disabled: boolean; max?: number;
  placeholder?: string; onChange: (v: string) => void; error?: string;
};
const FieldTextarea = ({
  id, label, value, disabled, onChange,
  rows = 4, max, placeholder, error,
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
      id={id} rows={rows} disabled={disabled} maxLength={max}
      placeholder={placeholder} value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`text-xs sm:text-sm ${error && "border-red-500"}`}
    />
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);

/* ---------- 型 ---------- */
type FormValues = z.infer<typeof schema>;

/* ====================================================================== */
export default function StudentProfilePage() {
  /* ----- ① すべてのフックを無条件に呼び出す ---------- */
  const ready = useAuthGuard("student");               // 認証ガード
  const {
    data: profile, loading, error, saving,
    editing, updateLocal, resetLocal, save,
  } = useStudentProfile();                             // プロフィール
  const { score } = useCompletion("profile");          // 完成度

  /* ----- ② 以降は通常のロジック ---------- */
  const [tab, setTab]     = useState<"basic" | "pr" | "pref">("basic");
  const [errors, setFieldErrs] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [savedToast, setSavedToast] = useState(false);

  /* toast timer */
  useEffect(() => {
    if (savedToast) {
      const t = setTimeout(() => setSavedToast(false), 2500);
      return () => clearTimeout(t);
    }
  }, [savedToast]);

  const getBarColor = (pct: number) =>
    pct < 30 ? "bg-red-500" : pct < 70 ? "bg-yellow-500" : "bg-green-500";

  const Status = ({ pct }: { pct: number }) =>
    pct === 100
      ? <CheckCircle2 size={14} className="text-green-600" />
      : <AlertCircle size={14} className={pct ? "text-yellow-600" : "text-red-600"} />;

  /* ---------- save ---------- */
  const handleSave = async () => {
    const parsed = schema.safeParse(profile);
    if (!parsed.success) {
      const errs: typeof errors = {};
      parsed.error.errors.forEach((e) => {
        const k = e.path[0] as keyof FormValues;
        errs[k] = e.message;
      });
      setFieldErrs(errs);
      toast({ title: "入力エラーがあります", variant: "destructive" });
      return;
    }
    setFieldErrs({});
    await save();
    setSavedToast(true);
  };

  /* ---------- 条件付きレンダー ---------- */
  if (!ready || loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        読み込み中…
      </div>
    );
  }
  if (error) {
    return <div className="p-4 text-center text-red-600">{error.message}</div>;
  }

  /* ---------- 完成度 & セクション状態 ---------- */
  const completion = score ?? 0;
  const isFilled = (v: unknown) =>
    Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && v !== "";

  const sectionDone = {
    basic: isFilled(profile.last_name) && isFilled(profile.first_name),
    pr   : isFilled(profile.pr_text),
    pref : isFilled(profile.desired_industries) && isFilled(profile.work_style),
  };

  /* ================= RENDER (本体) ===================================== */
  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      {/* --- header ----------------------------------------------------- */}
      <div className="mb-6 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 p-4 shadow-sm sm:mb-8 sm:p-6">
        <div className="mb-4 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">マイプロフィール</h1>
            <p className="text-xs text-gray-500 sm:text-sm">
              学生情報を入力・更新してスカウト率を高めましょう
            </p>
          </div>

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
                  {pct}% <Status pct={pct} />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* --- tabs --------------------------------------------------------- */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="hidden" />

        {/* ---------- 基本情報 ---------- */}
        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">基本情報</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FieldInput
                id="last_name" label="姓" required error={errors.last_name}
                value={profile.last_name ?? ""} disabled={!editing}
                onChange={(v) => updateLocal({ last_name: v })}
              />
              <FieldInput
                id="first_name" label="名" required error={errors.first_name}
                value={profile.first_name ?? ""} disabled={!editing}
                onChange={(v) => updateLocal({ first_name: v })}
              />
              <FieldInput
                id="university" label="大学名" required error={errors.university}
                value={profile.university ?? ""} disabled={!editing}
                onChange={(v) => updateLocal({ university: v })}
              />
              <FieldInput
                id="faculty" label="学部" required error={errors.faculty}
                value={profile.faculty ?? ""} disabled={!editing}
                onChange={(v) => updateLocal({ faculty: v })}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------- 自己PR ---------- */}
        <TabsContent value="pr" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">自己PR</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FieldTextarea
                id="pr_text" label="自己PR" max={800}
                value={profile.pr_text ?? ""} disabled={!editing}
                onChange={(v) => updateLocal({ pr_text: v })}
                error={errors.pr_text}
              />
              <TipBox />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------- 希望条件 ---------- */}
        <TabsContent value="pref" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">希望条件</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FieldInput
                id="work_style" label="希望する働き方" placeholder="例）リモート可 / フレックス"
                value={profile.work_style ?? ""} disabled={!editing}
                onChange={(v) => updateLocal({ work_style: v })}
              />
              <FieldInput
                id="desired_industries" label="興味のある業界 (カンマ区切り)"
                placeholder="例）IT,コンサル,メーカー"
                value={(profile.desired_industries ?? []).join(",")}
                disabled={!editing}
                onChange={(v) =>
                  updateLocal({ desired_industries: v.split(",").map((s) => s.trim()) })
                }
              />
              {Array.isArray(profile.desired_industries) &&
                <TagPreview items={profile.desired_industries} color="blue" />
              }
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* --- sticky save -------------------------------------------------- */}
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

      {/* --- toast -------------------------------------------------------- */}
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
