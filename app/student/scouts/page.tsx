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
import { Search, Mail, Check, X, Clock, Briefcase, Calendar } from "lucide-react";
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
        // DB の status を UI 用に正規化
        status:
          row.status === "accepted"
            ? "accepted"
            : row.status === "declined"
            ? "declined"
            : "pending",
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

    // 一部のステータスはタイムスタンプ必須のチェック制約が入っているため、
    // 状態に応じて追加カラムも同時に更新する
    const now = new Date().toISOString();
    const updates: any = { status: next };

    if (next === "accepted") {
      updates.accepted_at = now;   // ★ Supabase 側に accepted_at 列がある前提
    } else if (next === "declined") {
      updates.declined_at = now;   // ★ Supabase 側に declined_at 列がある前提
    }

    const { error } = await supabase.from("scouts").update(updates).eq("id", id);

    if (error) {
      console.error(`Error updating scout status to ${next}:`, error);
    } else {
      // 楽観的 UI 更新
      setScouts((prev) => prev.map((s) => (s.id === id ? { ...s, status: next } : s)));
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

        <div className="flex flex-col gap-6">
          {displayedScouts.map((s) => (
            <Card
              key={s.id}
              className={`relative flex flex-col rounded-2xl border p-6 shadow-sm transition bg-white ${
                s.status === "declined"
                  ? "opacity-60 cursor-not-allowed"
                  : "hover:shadow-md"
              }`}
              onClick={() => {
                if (s.status !== "declined") {
                  router.push(`/student/scouts/${s.id}`);
                }
              }}
            >
              {/* --- Offer card begins --- */}
              <Badge
                variant="outline"
                className={`absolute top-6 right-6 text-xs px-3 py-1 rounded-full ${
                  s.status === "pending"
                    ? "bg-yellow-50 text-yellow-700 border-yellow-300"
                    : s.status === "accepted"
                    ? "bg-green-50 text-green-700 border-green-300"
                    : "bg-red-50 text-red-600 border-red-300"
                }`}
              >
                {s.status === "pending" ? "検討中" : s.status === "accepted" ? "承諾" : "辞退"}
              </Badge>

              <div className="flex gap-4">
                {/* logo */}
                <div className="relative h-14 w-14 rounded-full overflow-hidden bg-gray-100 shrink-0">
                  <Image
                    src={s.companyLogo || "/placeholder.svg"}
                    alt={`${s.companyName} logo`}
                    fill
                    className="object-cover"
                  />
                </div>

                {/* company & meta */}
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900">{s.companyName}</h3>

                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                    <Briefcase className="h-4 w-4" />
                    <span>{s.offerPosition ?? s.position}</span>
                  </div>

                  <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(s.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* message */}
              <p className="mt-6 text-gray-700 text-sm leading-relaxed">
                {s.message}
              </p>

              {/* action buttons */}
              <div className="mt-8 flex justify-end gap-4">
                {s.status === "pending" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-300 text-red-600 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDecline(s.id);
                      }}
                    >
                      辞退する
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAccept(s.id);
                      }}
                    >
                      承諾する
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/student/scouts/${s.id}`);
                  }}
                >
                  詳細を見る
                </Button>
              </div>
              {/* --- Offer card ends --- */}
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
