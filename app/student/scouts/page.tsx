/* ────────────────────────────────────────────────
   app/student/scouts/page.tsx  ― スカウト一覧 (Client)
──────────────────────────────────────────────── */
"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import {
  Badge,
  Button,
  Card,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Separator,
} from "@/components/ui";
import { useRouter } from "next/navigation";
import { Search, Mail, Check, X, Clock, Briefcase } from "lucide-react";
import Image from "next/image";
import { useMemo } from "react";

/* ------------------------------------------------------------------ */
/*                               型定義                                */
/* ------------------------------------------------------------------ */

/** 生の Row 型 */
type ScoutRow = Database["public"]["Tables"]["scouts"]["Row"];

/** JOIN したい列だけ明示した中間型 */
type ScoutWithRelations = ScoutRow & {
  companies: { name: string; logo: string | null } | null;
  jobs: { title: string | null } | null;
  student_profiles: {
    last_name: string;
    first_name: string;
    last_name_kana?: string;
    first_name_kana?: string;
    birth_date?: string;
    phone?: string;
    email?: string;
    university?: string;
    faculty?: string;
    graduation_month?: string;
    pr_title?: string;
    pr_text?: string;
    strength_1?: string | null;
    strength_2?: string | null;
    strength_3?: string | null;
    desired_positions?: string[] | null;
    desired_locations?: string[] | null;
    salary_range?: string | null;
    experience?: any | null
  } | null;
  offer_position?: string | null;
  offer_amount?: string | null;
};

/** UI 用フラット型 */
export type UIScout = {
  id: string;
  companyName: string;
  position: string;
  offerPosition?: string | null;
  offerRange?: string | null;
  message: string;
  createdAt: string;
  status: "pending" | "accepted" | "declined";
  companyLogo: string;
  student: UIStudent;
};

export type UIStudent = {
  lastName: string;
  firstName: string;
  lastNameKana?: string;
  firstNameKana?: string;
  birthDate?: string;
  phone?: string;
  email?: string;
  university?: string;
  faculty?: string;
  graduationMonth?: string;
  prTitle?: string;
  prText?: string;
  strengths?: string[];
  workExperiences?: {
    company?: string;
    position?: string;
    startMonth?: string;
    endMonth?: string;
    isCurrent?: boolean;
    description?: string;
    technologies?: string;
  }[];
  desiredPositions?: string[];
  desiredLocations?: string[];
  salaryRange?: string;
};

/* ------------------------------------------------------------------ */
/*                               画面                                  */
/* ------------------------------------------------------------------ */
export default function ScoutsPage() {
  const [scouts, setScouts] = useState<UIScout[]>([]);
  const [loading, setLoading] = useState(false);

  const [statusTab, setStatusTab] = useState<"all" | "pending" | "accepted" | "declined">("all");
  const [query, setQuery] = useState("");

  const router = useRouter();

  /* -------------------- Supabase → UIScout 変換 -------------------- */
  const fetchScouts = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("scouts")
      .select(
        `
          *,
          companies:companies!scouts_company_id_fkey(name, logo),
          jobs:jobs!scouts_job_id_fkey(title),
          student_profiles:student_profiles!scouts_student_id_fkey(
            last_name, first_name, last_name_kana, first_name_kana, birth_date,
            phone, university, faculty, graduation_month,
            pr_title, pr_text, strength1, strength2, strength3,
            desired_positions, desired_locations, salary_range,
            experience
          )
        `,
      )
      .order("created_at", { ascending: false })
      .returns<ScoutWithRelations[]>(); // ★ 型を明示

    if (error) {
      console.error("Failed to fetch scouts:", error);
      setScouts([]);
      setLoading(false);
      return;
    }

    const uiScouts: UIScout[] = (data ?? []).map((row) => {
      const stu = (row as any).student_profiles;
      const student: UIStudent = {
        lastName: stu?.last_name ?? "",
        firstName: stu?.first_name ?? "",
        lastNameKana: stu?.last_name_kana ?? "",
        firstNameKana: stu?.first_name_kana ?? "",
        birthDate: stu?.birth_date ?? "",
        phone: stu?.phone ?? "",
        email: stu?.email ?? "",
        university: stu?.university ?? "",
        faculty: stu?.faculty ?? "",
        graduationMonth: stu?.graduation_month ?? "",
        prTitle: stu?.pr_title ?? "",
        prText: stu?.pr_text ?? "",
        strengths: [stu?.strength1, stu?.strength2, stu?.strength3].filter(Boolean) as string[],
        workExperiences: (stu?.experience as any) ?? [],
        desiredPositions: stu?.desired_positions ?? [],
        desiredLocations: stu?.desired_locations ?? [],
        salaryRange: stu?.salary_range ?? ""
      };

      return {
        id: row.id,
        companyName: row.companies?.name ?? "Unknown Company",
        position: row.jobs?.title ?? "Unknown Position",
        offerPosition: row.offer_position ?? null,
        offerRange: row.offer_amount ?? null,
        message: row.message,
        createdAt: row.created_at ?? "",
        status: (row.status as UIScout["status"]) ?? "pending",
        companyLogo: row.companies?.logo ?? "/placeholder.svg",
        student,
      };
    });

    setScouts(uiScouts);
    setLoading(false);
  };

  useEffect(() => {
    fetchScouts();
  }, []);

  /* ------------------------- アクション ---------------------------- */
  const patchStatus = async (id: string, next: UIScout["status"]) => {
    setLoading(true);
    const { error } = await supabase
      .from("scouts")
      .update({ status: next })
      .eq("id", id);

    if (error) {
      console.error(`Error updating scout status to ${next}:`, error);
    } else {
      setScouts((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: next } : s)),
      );
    }
    setLoading(false);
  };

  const handleAccept = (id: string) => patchStatus(id, "accepted");
  const handleDecline = (id: string) => patchStatus(id, "declined");

  const displayedScouts = useMemo(() => {
    const q = query.toLowerCase();
    return scouts.filter((s) => {
      const matchesTab = statusTab === "all" || s.status === statusTab;
      const matchesQ =
        q === "" ||
        s.companyName.toLowerCase().includes(q) ||
        s.position.toLowerCase().includes(q) ||
        s.message.toLowerCase().includes(q)
        || (s.offerPosition ?? "").toLowerCase().includes(q)
        || (s.offerRange ?? "").toLowerCase().includes(q)
      ;
      return matchesTab && matchesQ;
    });
  }, [scouts, statusTab, query]);

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="bg-gradient-to-r from-red-500 to-red-700 py-6 sm:py-10">
        <div className="mx-auto max-w-[1600px] px-4">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">スカウト一覧</h1>
          <p className="text-white/90 sm:text-lg">企業から届いたスカウトを確認しましょう</p>

          <div className="mt-6 flex flex-col gap-4 rounded-xl bg-white p-4 shadow-lg sm:mt-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="企業名やポジションで検索"
                className="border-2 pl-10 focus:border-red-500 focus:ring-red-500"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Tabs value={statusTab} onValueChange={(v)=>setStatusTab(v as any)} className="w-full sm:w-auto">
              <TabsList className="grid w-full grid-cols-4 rounded-xl bg-gray-100 p-1 sm:w-72">
                <TabsTrigger value="all"       className="rounded-lg text-xs sm:text-sm">すべて</TabsTrigger>
                <TabsTrigger value="pending"   className="rounded-lg text-xs sm:text-sm">未対応</TabsTrigger>
                <TabsTrigger value="accepted"  className="rounded-lg text-xs sm:text-sm">承諾</TabsTrigger>
                <TabsTrigger value="declined"  className="rounded-lg text-xs sm:text-sm">辞退</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1600px] px-4 py-8">
        {loading && (
          <p className="text-center text-muted-foreground">読み込み中...</p>
        )}

        {!loading && displayedScouts.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
            <Mail className="mx-auto mb-4 h-10 w-10 text-gray-400" />
            <p className="text-gray-600">現在表示できるスカウトはありません</p>
          </div>
        )}

        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {displayedScouts.map((s) => (
            <Card
              key={s.id}
              className="group overflow-hidden rounded-xl border shadow-sm hover:shadow-lg transition flex flex-col"
              onClick={() => router.push(`/student/scouts/${s.id}`)}
            >
              /* ---------- modern Card body begins ---------- */
              <div className="relative flex-1 rounded-xl overflow-hidden group">
                {/* --- Banner & header --- */}
                <div className="relative h-24 w-full bg-gradient-to-r from-red-500 to-pink-600">
                  <Image
                    src={s.companyLogo || "/placeholder.svg"}
                    alt={`${s.companyName} logo`}
                    fill
                    className="object-cover mix-blend-overlay opacity-70 group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/30" />
                  <div className="absolute bottom-2 left-3 flex items-center gap-2">
                    <div className="relative h-10 w-10 rounded-full overflow-hidden border-2 border-white">
                      <Image
                        src={s.companyLogo || "/placeholder.svg"}
                        alt={`${s.companyName} logo mini`}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <h3 className="text-white font-semibold truncate max-w-[140px]">
                      {s.companyName}
                    </h3>
                  </div>
                  <Badge
                    variant="outline"
                    className={`absolute top-2 right-2 backdrop-blur-sm bg-white/20 text-white ${
                      s.status === "pending"
                        ? "border-yellow-300"
                        : s.status === "accepted"
                        ? "border-green-300"
                        : "border-gray-300"
                    }`}
                  >
                    {s.status === "pending" ? "未対応" : s.status === "accepted" ? "承諾" : "辞退"}
                  </Badge>
                </div>

                {/* --- Body --- */}
                <div className="p-4 space-y-2 flex flex-col flex-1">
                  <p className="text-sm text-gray-700 line-clamp-3 flex-1">{s.message}</p>

                  <Separator />

                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium">
                        {s.offerPosition ?? s.position}
                      </span>
                      <span className="ml-2 text-primary">
                        {s.offerRange ? `${s.offerRange} 万円` : "年収 未定"}
                      </span>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
                      <Clock size={12} /> {new Date(s.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* --- Action bar (only for pending) --- */}
                {s.status === "pending" && (
                  <div className="absolute bottom-2 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDecline(s.id);
                      }}
                    >
                      <X size={16} />
                    </Button>
                    <Button
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAccept(s.id);
                      }}
                    >
                      <Check size={16} />
                    </Button>
                  </div>
                )}
              </div>
              /* ---------- modern Card body ends ---------- */
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
