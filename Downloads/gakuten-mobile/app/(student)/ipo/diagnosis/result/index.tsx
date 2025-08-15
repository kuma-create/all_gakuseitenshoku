/* ------------------------------------------------------------------
   app/(student)/ipo/diagnosis/result/index.tsx (Mobile)
   - 過去の診断結果一覧（モバイル最適化）
------------------------------------------------------------------- */
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useRouter } from "expo-router";
import { supabase } from "src/lib/supabase";

import { ArrowLeft, Clock, Brain, Heart, Target, Award, ChevronRight } from "lucide-react-native";
// Workaround for type mismatch when multiple @types/react versions are present
// Cast lucide icon to a generic React component type to avoid TS2786
type SvgIconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;
const ArrowLeftIcon = ArrowLeft as unknown as SvgIconComponent;
const ChevronRightIcon = ChevronRight as unknown as SvgIconComponent;
const ClockIcon = Clock as unknown as SvgIconComponent;

// --- Local minimal UI components (self-contained) ---
type DivProps = React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode };
type ButtonVariant = "default" | "ghost" | "outline";
type ButtonSize = "default" | "icon";
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
};
type SpanProps = React.HTMLAttributes<HTMLSpanElement> & { children?: React.ReactNode };

const cx = (...c: (string | undefined | false)[]) => c.filter(Boolean).join(" ");

const Card = ({ className, children, ...props }: DivProps) => (
  <div className={cx("rounded-lg border bg-background text-foreground shadow-sm", className)} {...props}>
    {children}
  </div>
);
const CardContent = ({ className, children, ...props }: DivProps) => (
  <div className={cx(className)} {...props}>{children}</div>
);
const Button = ({ className, children, variant = "default", size = "default", ...props }: ButtonProps) => {
  const base =
    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 px-3";
  const byVariant: Record<ButtonVariant, string> = {
    default: "border bg-background hover:bg-accent hover:text-accent-foreground",
    ghost: "bg-transparent border-transparent hover:bg-accent",
    outline: "border bg-background",
  };
  const bySize: Record<ButtonSize, string> = {
    default: "",
    icon: "h-9 w-9 p-0",
  };
  return (
    <button
      className={[base, byVariant[variant], bySize[size], className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </button>
  );
};
type BadgeVariant = "default" | "secondary";
type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  children?: React.ReactNode;
  variant?: BadgeVariant;
};
const Badge = ({ className, children, variant = "default", ...props }: BadgeProps) => (
  <span
    className={cx(
      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
      variant === "secondary" ? "bg-accent text-accent-foreground" : "",
      className
    )}
    {...props}
  >
    {children}
  </span>
);

type DiagnosisType = "personality" | "values" | "career" | "skills";

interface DiagnosisResultRow {
  id: string;
  session_id: string;
  type: DiagnosisType;
  scores: Record<string, number>;
  strengths: string[];
  growth_areas: string[];
  recommendations: any[];
  insights: string[];
  created_at: string;
}

const TYPE_LABELS: Record<
  DiagnosisType,
  { title: string; icon: any; color: string }
> = {
  personality: { title: "性格診断", icon: Brain, color: "from-purple-400 to-purple-600" },
  values: { title: "価値観診断", icon: Heart, color: "from-pink-400 to-pink-600" },
  career: { title: "キャリア適性診断", icon: Target, color: "from-blue-400 to-blue-600" },
  skills: { title: "スキル診断", icon: Award, color: "from-green-400 to-green-600" },
};

const PAGE_SIZE = 20;

const TABS: { key: "all" | DiagnosisType; label: string }[] = [
  { key: "all", label: "すべて" },
  { key: "personality", label: "性格" },
  { key: "values", label: "価値観" },
  { key: "career", label: "キャリア適性" },
  { key: "skills", label: "スキル" },
];

function toJSTString(iso: string) {
  try {
    return new Date(iso).toLocaleString("ja-JP");
  } catch {
    return iso;
  }
}

export default function DiagnosisResultsListMobilePage() {
  const router = useRouter();
  const [rows, setRows] = useState<DiagnosisResultRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [activeType, setActiveType] = useState<"all" | DiagnosisType>("all");

  const load = useCallback(
    async (opts?: { reset?: boolean; type?: "all" | DiagnosisType }) => {
      const reset = !!opts?.reset;
      const type = opts?.type ?? activeType;

      setLoading(true);
      setError(null);

      try {
        const from = reset ? 0 : page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        let query = supabase
          .from("diagnosis_results")
          .select(
            "id, session_id, type, scores, strengths, growth_areas, recommendations, insights, created_at"
          )
          .order("created_at", { ascending: false })
          .range(from, to);

        if (type !== "all") {
          query = query.eq("type", type);
        }

        const { data, error } = await query.returns<DiagnosisResultRow[]>();
        if (error) throw error;

        const newRows = data ?? [];
        setRows((prev) => (reset ? newRows : [...prev, ...newRows]));
        setHasMore(newRows.length === PAGE_SIZE);
        setPage((prev) => (reset ? 1 : prev + 1));
      } catch (e: any) {
        setError("一覧の取得に失敗しました。権限・接続をご確認ください。");
      } finally {
        setLoading(false);
      }
    },
    [page, activeType]
  );

  // 初回ロード
  useEffect(() => {
    load({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChangeType = (next: "all" | DiagnosisType) => {
    setActiveType(next);
    setPage(0);
    setHasMore(true);
    load({ reset: true, type: next });
  };

  const list = useMemo(() => rows, [rows]);

  return (
    <div className="min-h-[100dvh] bg-background w-full overflow-x-hidden">
      {/* Top App Bar */}
      <div className="sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-background/80 bg-background/95 border-b">
        <div className="mx-auto max-w-screen-sm px-3 py-2 flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="戻る">
            <ArrowLeftIcon className="w-5 h-5" />
          </Button>
          <h1 className="text-base font-semibold">診断結果一覧</h1>
          <div className="ml-auto text-xs text-muted-foreground">最新順</div>
        </div>
        {/* Filter Tabs (local implementation) */}
        <div className="w-full">
          <div className="w-full overflow-x-auto no-scrollbar px-3 pb-2">
            <div className="inline-flex gap-2" role="tablist" aria-label="診断種別フィルタ">
              {TABS.map((t) => (
                <Button
                  key={t.key}
                  role="tab"
                  aria-selected={activeType === t.key}
                  className={cx(
                    "shrink-0 rounded-full border px-4 py-1 h-auto",
                    activeType === t.key ? "bg-foreground text-background" : "bg-background text-foreground"
                  )}
                  onClick={() => onChangeType(t.key)}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-screen-sm px-3 pb-24 pt-3 space-y-3">
        {error && (
          <Card>
            <CardContent className="p-3 text-sm text-red-600">{error}</CardContent>
          </Card>
        )}

        {list.length === 0 && !loading && !error && (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">
              過去の診断結果はまだありません。
            </CardContent>
          </Card>
        )}

        {list.map((row) => {
          const label = TYPE_LABELS[row.type];
          const topScores = Object.entries(row.scores || {})
            .map(([k, v]) => [k, Number(v)] as [string, number])
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);

          const Icon = label.icon;

          return (
            <Link key={row.id} href={`/ipo/diagnosis/result/${row.id}`} className="block">
              <Card className="transition active:scale-[0.99]">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full bg-gradient-to-r ${label.color} shrink-0`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-muted-foreground">
                        <ClockIcon className="inline-block w-3.5 h-3.5 mr-1 align-[-2px]" />
                        {toJSTString(row.created_at)}
                      </div>
                      <div className="mt-0.5 text-base font-semibold truncate">{label.title}</div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {topScores.map(([k, v]) => (
                          <Badge key={k} variant="secondary" className="text-[11px]">
                            {k}: {Math.round(v)}%
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <ChevronRightIcon className="w-5 h-5 text-muted-foreground shrink-0 mt-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}

        {/* Load more */}
        <div className="pt-2 pb-8 flex justify-center">
          <Button
            className="w-full max-w-xs"
            variant="outline"
            onClick={() => load()}
            disabled={loading || !hasMore}
          >
            {loading ? "読み込み中…" : hasMore ? "もっと見る" : "これ以上はありません"}
          </Button>
        </div>
      </div>

      {/* iOS Safe Area */}
      <div className="h-6 sm:h-8" />
    </div>
  );
}

/* ---------- Utility: hide scrollbar on tabs ---------- */
// tailwind.css 等に以下のユーティリティを追加済みでない場合は、
// .no-scrollbar{ -ms-overflow-style: none; scrollbar-width: none; } 
// .no-scrollbar::-webkit-scrollbar{ display:none; }
