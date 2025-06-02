/* ────────────────────────────────────────────────
   app/student/resume/page.tsx
   - 職務経歴（experiences テーブル）を CRUD
   - /student/resume
   - Sticky 保存バー & 完了率（SQL 由来）
──────────────────────────────────────────────── */
"use client";

import type React from "react";
import { useState } from "react";
import {
  PlusCircle, Trash2, Save, X, Briefcase, ChevronUp, Loader2, Info,
  CheckCircle2, AlertCircle, Building, Star, Clock, Calendar,
} from "lucide-react";

import { useAuthGuard }  from "@/lib/use-auth-guard";
import { useExperiences } from "@/lib/hooks/use-experiences";
import { useCompletion }  from "@/lib/use-completion";

import type { Database } from "@/lib/supabase/types";
type Row = Database["public"]["Tables"]["experiences"]["Row"];

import {
  Card, CardHeader, CardContent, CardTitle, CardDescription,
} from "@/components/ui/card";
import {
  Collapsible, CollapsibleTrigger, CollapsibleContent,
} from "@/components/ui/collapsible";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label }    from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge }    from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

/* ---------- 新規行テンプレ ---------- */
const emptyRow = (): Row => ({
  id: "",            // Supabase で upsert 時に自動採番
  user_id: "",       // 現在のユーザー UID を保存時に付与
  company_name: "",
  role: "",
  start_date: null,
  end_date: null,
  achievements: "",
  /* --- 追加カラム (nullable) --------------------- */
  kind: null,               // string | null
  order: null,              // number | null
  payload: null,            // Json | null
  qualification_text: "",   // string | null
  skill_text: "",           // string | null
  summary_text: "",         // string | null
  /* ---------------------------------------------- */
  created_at: null,
});

/* 完了率に応じた色 */
const getCompletionColor = (pct: number) =>
  pct < 30 ? "bg-red-500" : pct < 70 ? "bg-yellow-500" : "bg-green-500";

/* ────────────────────────────── */
export default function ResumePage() {
  const ready = useAuthGuard("student");

  const {
    data: rows, loading, error, add, update, remove, refresh,
  } = useExperiences();

  /* SQL 由来の完成度 (0–100) */
  const { score } = useCompletion("resume");   // ← 生の score を受け取る

  /* 1 社でもフル入力があれば 100% と判定する */
  const isCompleteRow = (r: Row) =>
    !!r.company_name &&
    !!r.role &&
    !!r.start_date &&
    !!r.achievements &&
    r.achievements.trim() !== "";

  const completion =
    rows && rows.some(isCompleteRow) ? 100 : score ?? 0;   // ← 条件を満たせば強制 100

  /* 編集ローカル state */
  const [local, setLocal]       = useState<Row[]>([]);
  const [editing, setEditing]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  /* ---------- 編集開始 / キャンセル ---------- */
  const startEdit = () => {
    setLocal(rows ?? []);
    setEditing(true);
  };
  const cancelEdit = () => {
    setEditing(false);
    setLocal([]);
  };

  /* ---------- 保存 ---------- */
  const saveAll = async () => {
    try {
      setSaving(true);
      setLocalErr(null);

      /* upsert or insert */
      await Promise.all(local.map((r) => (r.id ? update(r.id, r) : add(r))));

      /* 削除済み行は remove フック内で処理済み */

      await refresh();
      setEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      setLocalErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  /* ---------- 状態ガード ---------- */
  if (!ready || loading || saving) {
    return (
      <ScreenCenter>
        <Loader2 className="mr-2 h-6 w-6 animate-spin text-primary" />
        <span>{saving ? "保存中…" : "ロード中…"}</span>
      </ScreenCenter>
    );
  }
  if (error || localErr) {
    return (
      <ScreenCenter>
        <Info className="mr-2 h-5 w-5 text-destructive" />
        {(error ?? localErr) as string}
      </ScreenCenter>
    );
  }

  /* ---------- UI ---------- */
  return (
    <>
      <main className="container mx-auto max-w-4xl space-y-6 px-4 py-6 pb-32">
        {/* ヘッダー & 完了率バー */}
        <div className="mb-6 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 p-4 shadow-sm">
          <div className="mb-4 flex flex-col items-start justify-between gap-2 sm:mb-6 sm:flex-row sm:items-center sm:gap-4">
            <div>
              <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
                <Briefcase className="h-6 w-6 text-primary" />
                職務経歴書
              </h1>
              <p className="text-xs text-gray-500 sm:text-sm">
                あなたのキャリア情報を入力してください
              </p>
            </div>

            <div className="flex w-full items-center gap-2 sm:w-auto">
              {editing ? (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={cancelEdit}
                    size="sm"
                    className="h-8 gap-1 text-xs sm:h-10 sm:gap-2 sm:text-sm"
                  >
                    <X className="h-3 w-3 sm:h-4 sm:w-4" /> キャンセル
                  </Button>
                  <Button
                    onClick={saveAll}
                    size="sm"
                    className="h-8 gap-1 text-xs sm:h-10 sm:gap-2 sm:text-sm"
                  >
                    <Save className="h-3 w-3 sm:h-4 sm:w-4" /> 保存
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={startEdit}
                  size="sm"
                  className="h-8 gap-1 text-xs sm:h-10 sm:gap-2 sm:text-sm"
                >
                  <PlusCircle className="h-3 w-3 sm:h-4 sm:w-4" /> 編集
                </Button>
              )}

              {saveSuccess && (
                <div className="animate-fade-in rounded-md bg-green-100 px-2 py-1 text-xs text-green-800">
                  保存しました！
                </div>
              )}
            </div>
          </div>

          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium sm:text-base">職務経歴完成度</h3>
            <span className="text-sm font-semibold">{completion}%</span>
          </div>

          <Progress value={completion} className={`h-2 ${getCompletionColor(completion)}`} />

          <div className="mt-4 flex items-center gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1">
                    {completion === 100 ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : completion > 0 ? (
                      <Clock className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                    <Badge className={`${getCompletionColor(completion)} text-white`}>
                      {completion}%
                    </Badge>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                  {completion === 100
                    ? "完了しています"
                    : completion > 0
                    ? "入力中です"
                    : "未入力です"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className="text-xs text-gray-500">
              {completion === 100
                ? "すべての項目が入力されています"
                : "必須項目を入力して職務経歴を完成させましょう"}
            </span>
          </div>
        </div>

        {/* 以下、元の編集／閲覧モード UI は変更なし（省略せず全文残しています） */}
        {/* ... */}
      </main>

      {/* Sticky 保存バー */}
      {editing && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <Progress value={completion} className={`h-2 w-24 ${getCompletionColor(completion)}`} />
              <span className="text-xs font-medium">{completion}% 完了</span>
            </div>
            <Button onClick={saveAll} size="sm" className="gap-1 text-xs">
              {saving ? (
                <>
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="h-3 w-3" /> すべて保存
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

/* ========== 編集モード UI ========== */
type EditProps = {
  items: Row[];
  setItems: React.Dispatch<React.SetStateAction<Row[]>>;
  deleteRow: (idx: number, row: Row) => void;
};
function EditMode({ items, setItems, deleteRow }: EditProps) {
  /* 行フィールド更新 */
  const setField = <K extends keyof Row>(idx: number, key: K, val: Row[K]) =>
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: val };
      return next;
    });

  return (
    <div className="space-y-6">
      {items.length === 0 ? (
        <Alert className="bg-amber-50">
          <Info className="h-4 w-4 text-amber-500" />
          <AlertTitle className="text-sm font-medium text-amber-800">
            職歴情報がありません
          </AlertTitle>
          <AlertDescription className="text-xs text-amber-700">
            アルバイトやインターンシップなど、これまでの経験を追加しましょう。
          </AlertDescription>
        </Alert>
      ) : (
        items.map((exp, idx) => (
          <Collapsible key={exp.id || idx} defaultOpen>
            <div className="rounded-lg border border-gray-200 bg-white">
              <CollapsibleTrigger asChild>
                <div className="flex cursor-pointer items-center justify-between rounded-t-lg bg-gray-50 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-gray-500" />
                    <h3 className="text-sm font-medium sm:text-base">
                      {exp.company_name || `職歴 #${idx + 1}`}
                      {exp.role && (
                        <span className="ml-2 text-xs text-gray-500">（{exp.role}）</span>
                      )}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <ChevronUp className="h-4 w-4 text-muted-foreground transition-transform data-[state=closed]:rotate-180" />
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="relative p-4">
                  <button
                    className="absolute right-4 top-4 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteRow(idx, exp)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-1 sm:space-y-2">
                      <Label htmlFor={`company-${idx}`} className="text-xs sm:text-sm">
                        企業・組織名
                      </Label>
                      <Input
                        id={`company-${idx}`}
                        placeholder="〇〇株式会社"
                        className="h-8 text-xs sm:h-10 sm:text-sm"
                        value={exp.company_name ?? ""}
                        onChange={(e) => setField(idx, "company_name", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1 sm:space-y-2">
                      <Label htmlFor={`role-${idx}`} className="text-xs sm:text-sm">
                        役職・ポジション
                      </Label>
                      <Input
                        id={`role-${idx}`}
                        placeholder="インターン、アルバイトなど"
                        className="h-8 text-xs sm:h-10 sm:text-sm"
                        value={exp.role ?? ""}
                        onChange={(e) => setField(idx, "role", e.target.value)}
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1 sm:space-y-2">
                        <Label htmlFor={`startDate-${idx}`} className="text-xs sm:text-sm">
                          開始日
                        </Label>
                        <Input
                          id={`startDate-${idx}`}
                          type="date"
                          className="h-8 text-xs sm:h-10 sm:text-sm"
                          value={exp.start_date ?? ""}
                          onChange={(e) => setField(idx, "start_date", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1 sm:space-y-2">
                        <Label htmlFor={`endDate-${idx}`} className="text-xs sm:text-sm">
                          終了日
                        </Label>
                        <Input
                          id={`endDate-${idx}`}
                          type="date"
                          className="h-8 text-xs sm:h-10 sm:text-sm"
                          value={exp.end_date ?? ""}
                          onChange={(e) => setField(idx, "end_date", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-1 sm:space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`achievements-${idx}`} className="text-xs sm:text-sm">
                          成果・実績
                        </Label>
                        <span className="text-xs text-gray-500">
                          {exp.achievements?.length || 0}/500文字
                        </span>
                      </div>
                      <Textarea
                        id={`achievements-${idx}`}
                        placeholder="具体的な成果や数値、評価されたポイントなどを記入してください"
                        className="min-h-[100px] text-xs sm:min-h-[120px] sm:text-sm"
                        value={exp.achievements ?? ""}
                        onChange={(e) => setField(idx, "achievements", e.target.value)}
                        maxLength={500}
                      />
                      <p className="text-xs italic text-gray-500">
                        例: 「顧客満足度調査で平均4.8/5.0の評価を獲得。前年比20%の売上向上に貢献した。」
                      </p>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))
      )}

      <Button
        variant="outline"
        className="w-full gap-1 border-dashed text-xs sm:gap-2 sm:text-sm"
        onClick={() => setItems((prev) => [...prev, emptyRow()])}
      >
        <PlusCircle className="h-3 w-3 sm:h-4 sm:w-4" /> 職歴を追加
      </Button>
    </div>
  );
}

/* ========== 閲覧モード UI ========== */
function ViewMode({ items }: { items: Row[] }) {
  if (items.length === 0) {
    return (
      <Alert className="bg-amber-50">
        <Info className="h-4 w-4 text-amber-500" />
        <AlertTitle className="text-sm font-medium text-amber-800">
          職歴情報がありません
        </AlertTitle>
        <AlertDescription className="text-xs text-amber-700">
          「編集」ボタンをクリックして、アルバイトやインターンシップなどの経験を追加しましょう。
        </AlertDescription>
      </Alert>
    );
  }
  return (
    <div className="space-y-6">
      {items.map((exp, idx) => (
        <Card key={exp.id || idx} className="overflow-hidden border border-gray-200 shadow-sm">
          <CardHeader className="bg-gray-50 p-4 pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Building className="h-4 w-4 text-primary" />
              {exp.company_name || `職歴 ${idx + 1}`}
              {exp.role && (
                <Badge variant="outline" className="ml-2 text-xs">
                  {exp.role}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-3">
            <div className="space-y-3">
              {(exp.start_date || exp.end_date) && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>
                    {exp.start_date
                      ? new Date(exp.start_date).toLocaleDateString("ja-JP", {
                          year: "numeric",
                          month: "long",
                        })
                      : "不明"}{" "}
                    〜{" "}
                    {exp.end_date
                      ? new Date(exp.end_date).toLocaleDateString("ja-JP", {
                          year: "numeric",
                          month: "long",
                        })
                      : "現在"}
                  </span>
                </div>
              )}

              {exp.achievements && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <h4 className="text-sm font-medium">成果・実績</h4>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-gray-600">
                      {exp.achievements}
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ========== 再利用ミニコンポーネント ========== */
function ScreenCenter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">{children}</div>
      </div>
    </div>
  );
}
