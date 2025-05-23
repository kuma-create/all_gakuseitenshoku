/* ────────────────────────────────────────────────
   app/jobs/page.tsx  ― 公開中求人一覧 (Client Component)
   2025-05-23 dropdown & link fix
──────────────────────────────────────────────── */
"use client";

import {
  Briefcase,
  Building,
  Calendar,
  Filter,
  Heart,
  MapPin,
  Search,
  Star,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

/** Supabase 型を拡張 */
type JobRow = Database["public"]["Tables"]["jobs"]["Row"] & {
  companies: { name: string; logo: string | null; industry?: string | null } | null;
  industry?: string | null;
  job_type?: string | null;
  is_featured?: boolean | null;
  tags?: string[] | null;
  cover_image_url?: string | null;
  job_tags?: { tag: string }[] | null;
};

const SALARY_MAX = 1200;
/* 年収フィルターの選択肢 */
const SALARY_OPTIONS = [
  { value: "all",  label: "すべての年収" },
  { value: "200",  label: "200万以上" },
  { value: "400",  label: "400万以上" },
  { value: "600",  label: "600万以上" },
  { value: "800",  label: "800万以上" },
  { value: "1000", label: "1000万以上" },
] as const;

/* ────────────────────────────────────────── */
export default function JobsPage() {
  /* ---------------- state ---------------- */
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  /* UI filter states */
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("all");
  const [jobType, setJobType] = useState("all");
  const [salaryMin, setSalaryMin] = useState<string>("all");
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filterOpen, setFilterOpen] = useState(false);

  /* ---------------- fetch ----------------- */
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select(
          `
id,
title,
description,
created_at,
work_type,
is_recommended,
salary_min,
salary_max,
location,
cover_image_url,
companies!jobs_company_id_fkey (
  name,
  industry,
  logo
),
job_tags!job_tags_job_id_fkey (
  tag
)
`
        )
        .eq("published", true)
        .order("created_at", { ascending: false })
        .returns<JobRow[]>();

      if (error) {
        console.error("jobs fetch error", error);
        setError("選考情報取得に失敗しました");
      } else {
        const normalized = (data ?? []).map((row) => ({
          ...row,
          industry: row.companies?.industry ?? null,
          tags: (row.job_tags ?? []).map((t) => t.tag),
        }));
        setJobs(normalized);
      }
      setLoading(false);
    })();
  }, []);

  /* ------------- derived options ---------- */
  const industries = useMemo(() => {
    const set = new Set(jobs.map((j) => j.industry ?? "").filter(Boolean));
    return ["all", ...Array.from(set)] as string[];
  }, [jobs]);

  const jobTypes = useMemo(() => {
    const set = new Set(jobs.map((j) => j.job_type ?? "").filter(Boolean));
    return ["all", ...Array.from(set)] as string[];
  }, [jobs]);

  /* ------------- filter logic ------------- */
  const displayed = useMemo(() => {
    return jobs.filter((j) => {
      const q = search.toLowerCase();
      const matchesQ =
        q === "" ||
        j.title?.toLowerCase().includes(q) ||
        j.companies?.name?.toLowerCase().includes(q) ||
        j.description?.toLowerCase().includes(q);

      const matchesInd =
        industry === "all" ||
        (j.industry ?? "").toLowerCase().includes(industry.toLowerCase());

      const matchesJob =
        jobType === "all" ||
        (j.job_type ?? "").toLowerCase().includes(jobType.toLowerCase());

      const matchesSalary =
        salaryMin === "all" ||
        (j.salary_max ?? SALARY_MAX) >= Number(salaryMin);

      return matchesQ && matchesInd && matchesJob && matchesSalary;
    });
  }, [jobs, search, industry, jobType, salaryMin]);

  /* ------------- helpers ------------------ */
  const toggleSave = (id: string) =>
    setSaved((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const tagColor = () => "bg-gray-100 text-gray-800";

  /* ------------- UI ----------------------- */
  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <svg className="h-6 w-6 animate-spin text-primary" viewBox="0 0 24 24">
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            strokeDasharray="60"
          />
        </svg>
        読み込み中…
      </div>
    );
  }
  if (error) {
    return (
      <main className="container py-8">
        <p className="text-destructive">{error}</p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* hero */}
      <header className="bg-gradient-to-r from-red-500 to-red-700 py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold text-white">選考一覧</h1>
          <p className="text-white/90">あなたにぴったりの会社を探しましょう</p>

          {/* search & toggles */}
          <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="企業名、職種などで検索"
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* filter toggle (mobile) */}
            <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 md:hidden">
                  <Filter size={16} />
                  フィルター
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
                <FilterPanel
                  industries={industries}
                  jobTypes={jobTypes}
                  industry={industry}
                  setIndustry={setIndustry}
                  jobType={jobType}
                  setJobType={setJobType}
                  salaryMin={salaryMin}
                  setSalaryMin={setSalaryMin}
                />
              </SheetContent>
            </Sheet>

            {/* grid/list toggle */}
            <div className="flex gap-2">
              <Button
                variant={view === "grid" ? "default" : "outline"}
                size="icon"
                onClick={() => setView("grid")}
              >
                <svg width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                  <rect x="1" y="1" width="6" height="6" />
                  <rect x="9" y="1" width="6" height="6" />
                  <rect x="1" y="9" width="6" height="6" />
                  <rect x="9" y="9" width="6" height="6" />
                </svg>
              </Button>
              <Button
                variant={view === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => setView("list")}
              >
                <svg width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                  <line x1="4" y1="4" x2="15" y2="4" />
                  <line x1="4" y1="8" x2="15" y2="8" />
                  <line x1="4" y1="12" x2="15" y2="12" />
                  <circle cx="2" cy="4" r="1" />
                  <circle cx="2" cy="8" r="1" />
                  <circle cx="2" cy="12" r="1" />
                </svg>
              </Button>
            </div>
          </div>

          {/* desktop inline filters */}
          <div className="mt-4 hidden flex-wrap gap-3 md:flex">
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="業界" />
              </SelectTrigger>
              <SelectContent>
                {industries.map((i) => (
                  <SelectItem key={i} value={i}>
                    {i === "all" ? "すべての業界" : i}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={jobType} onValueChange={setJobType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="職種" />
              </SelectTrigger>
              <SelectContent>
                {jobTypes.map((j) => (
                  <SelectItem key={j} value={j}>
                    {j === "all" ? "すべての職種" : j}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={salaryMin} onValueChange={setSalaryMin}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="年収" />
              </SelectTrigger>
              <SelectContent>
                {SALARY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      {/* content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="all">
          <TabsList className="mb-6 grid max-w-md grid-cols-3">
            <TabsTrigger value="all">すべて</TabsTrigger>
            <TabsTrigger value="saved">保存済み</TabsTrigger>
            <TabsTrigger value="new">新着</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <JobGrid jobs={displayed} view={view} saved={saved} toggleSave={toggleSave} tagColor={tagColor} />
          </TabsContent>

          <TabsContent value="saved">
            <JobGrid
              jobs={displayed.filter((j) => saved.has(j.id))}
              view={view}
              saved={saved}
              toggleSave={toggleSave}
              tagColor={tagColor}
            />
          </TabsContent>

          <TabsContent value="new">
            <JobGrid
              jobs={displayed.filter((j) => {
                const diff = (Date.now() - new Date(j.created_at!).getTime()) / 86400000;
                return diff < 7;
              })}
              view={view}
              saved={saved}
              toggleSave={toggleSave}
              tagColor={tagColor}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

/* =============== components ================ */
function FilterPanel({
  industries,
  jobTypes,
  industry,
  setIndustry,
  jobType,
  setJobType,
  salaryMin,
  setSalaryMin,
}: {
  industries: string[];
  jobTypes: string[];
  industry: string;
  setIndustry: (v: string) => void;
  jobType: string;
  setJobType: (v: string) => void;
  salaryMin: string;
  setSalaryMin: (v: string) => void;
}) {
  return (
    <div className="space-y-4 py-4">
      <Select value={industry} onValueChange={setIndustry}>
        <SelectTrigger>
          <SelectValue placeholder="業界" />
        </SelectTrigger>
        <SelectContent>
          {industries.map((i) => (
            <SelectItem key={i} value={i}>
              {i === "all" ? "すべての業界" : i}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={jobType} onValueChange={setJobType}>
        <SelectTrigger>
          <SelectValue placeholder="職種" />
        </SelectTrigger>
        <SelectContent>
          {jobTypes.map((j) => (
            <SelectItem key={j} value={j}>
              {j === "all" ? "すべての職種" : j}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={salaryMin} onValueChange={setSalaryMin}>
        <SelectTrigger>
          <SelectValue placeholder="年収" />
        </SelectTrigger>
        <SelectContent>
          {SALARY_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function JobGrid({
  jobs,
  view,
  saved,
  toggleSave,
  tagColor,
}: {
  jobs: JobRow[];
  view: "grid" | "list";
  saved: Set<string>;
  toggleSave: (id: string) => void;
  tagColor: (t: string) => string;
}) {
  if (!jobs.length) return <p className="text-center text-gray-500">該当する選考情報がありません</p>;

  if (view === "list") {
    return (
      <div className="flex flex-col gap-4">
        {jobs.map((j) => (
          <Card key={j.id} className="flex overflow-hidden">
            <Link href={`/jobs/${j.id}`} className="flex flex-1 hover:bg-gray-50">
              {j.cover_image_url && (
                <Image
                  src={j.cover_image_url}
                  alt="cover"
                  width={160}
                  height={120}
                  className="h-auto w-40 object-cover"
                />
              )}
              <div className="flex flex-1 flex-col gap-2 p-4">
                <h3 className="text-lg font-bold">{j.title}</h3>
                <p className="text-sm text-gray-600">
                  {j.companies?.name ?? "-"} / {j.location}
                </p>
                <div className="flex gap-1 text-xs text-gray-500">
                  <MapPin size={12} />
                  <span>{j.location}</span>
                  <Briefcase size={12} />
                  <span>
                    {j.salary_min}万 – {j.salary_max ?? "応相談"}万
                  </span>
                </div>
              </div>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                toggleSave(j.id);
              }}
            >
              <Heart className={saved.has(j.id) ? "fill-red-500 text-red-500" : ""} />
            </Button>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {jobs.map((j) => (
        <Card key={j.id} className="group relative overflow-hidden">
          <Link href={`/jobs/${j.id}`} className="block">
            {j.cover_image_url && (
              <div className="relative h-32 w-full overflow-hidden">
                <Image
                  src={j.cover_image_url}
                  alt="cover"
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                {j.is_featured && (
                  <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-yellow-400 px-2 py-1 text-xs font-medium text-yellow-900">
                    <Star size={12} />
                    おすすめ
                  </div>
                )}
              </div>
            )}
            <div className="p-4">
              <h3 className="mb-1 line-clamp-1 font-bold">{j.title}</h3>
              <p className="line-clamp-1 text-sm text-gray-600">{j.companies?.name ?? "-"}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {(j.tags ?? []).slice(0, 3).map((t) => (
                  <Badge key={t} className={tagColor(t)}>
                    {t}
                  </Badge>
                ))}
              </div>
              <div className="mt-3 text-xs text-gray-500">
                {j.salary_min}万 – {j.salary_max ?? "応相談"}万
              </div>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2"
            onClick={(e) => {
              e.stopPropagation();
              toggleSave(j.id);
            }}
          >
            <Heart size={18} className={saved.has(j.id) ? "fill-red-500 text-red-500" : ""} />
          </Button>
        </Card>
      ))}
    </div>
  );
}