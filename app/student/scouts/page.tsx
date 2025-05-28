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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Separator,
} from "@/components/ui";
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
};

/** UI 用フラット型 */
export type UIScout = {
  id: string;
  companyName: string;
  position: string;
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

  const [open, setOpen] = useState(false);
  const [selectedScout, setSelectedScout] = useState<UIScout | null>(null);
  const openDetails = (s: UIScout) => { setSelectedScout(s); setOpen(true); };

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
        s.message.toLowerCase().includes(q);
      return matchesTab && matchesQ;
    });
  }, [scouts, statusTab, query]);

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="bg-gradient-to-r from-red-500 to-red-700 py-6 sm:py-10">
        <div className="container mx-auto px-4">
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

      <main className="container mx-auto px-4 py-8">
        {loading && (
          <p className="text-center text-muted-foreground">読み込み中...</p>
        )}

        {!loading && displayedScouts.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
            <Mail className="mx-auto mb-4 h-10 w-10 text-gray-400" />
            <p className="text-gray-600">現在表示できるスカウトはありません</p>
          </div>
        )}

        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {displayedScouts.map((s)=>(
            <SheetTrigger asChild key={s.id} onClick={()=>openDetails(s)}>
              <Card className="group overflow-hidden rounded-xl shadow hover:shadow-lg transition">
                <div className="flex items-center gap-3 p-4">
                  <div className="relative h-12 w-12 overflow-hidden rounded-full bg-white border">
                    <Image
                      src={s.companyLogo || "/placeholder.svg"}
                      alt={`${s.companyName} logo`}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold line-clamp-1">{s.companyName}</h3>
                    <p className="text-xs text-gray-500 line-clamp-1">{s.position}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      s.status === "pending"
                        ? "border-yellow-400 text-yellow-600"
                        : s.status === "accepted"
                        ? "border-green-400 text-green-600"
                        : "border-gray-400 text-gray-500"
                    }
                  >
                    {s.status === "pending" ? "未対応" : s.status === "accepted" ? "承諾" : "辞退"}
                  </Badge>
                </div>

                <div className="px-4 pb-4 text-sm text-gray-600 line-clamp-3">{s.message}</div>

                <div className="mt-auto border-t px-4 py-3 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock size={12} /> {new Date(s.createdAt).toLocaleDateString()}
                  </span>
                  {s.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="icon" variant="ghost" onClick={() => handleDecline(s.id)}>
                        <X size={16} className="text-gray-400" />
                      </Button>
                      <Button size="icon" onClick={() => handleAccept(s.id)}>
                        <Check size={16} />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            </SheetTrigger>
          ))}
        </div>
      </main>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full max-w-lg overflow-y-auto">
          {selectedScout && (
            <>
              <SheetHeader>
                <SheetTitle className="flex flex-col">
                  {selectedScout.student.lastName} {selectedScout.student.firstName}
                  <span className="text-xs font-normal text-muted-foreground">
                    {selectedScout.student.university} {selectedScout.student.faculty}
                  </span>
                </SheetTitle>
              </SheetHeader>

              <section className="mt-6 space-y-2">
                <h3 className="text-sm font-semibold">基本情報</h3>
                <dl className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm">
                  <dt className="font-medium">氏名</dt>
                  <dd className="col-span-2">
                    {selectedScout.student.lastName} {selectedScout.student.firstName}
                    {selectedScout.student.lastNameKana && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({selectedScout.student.lastNameKana} {selectedScout.student.firstNameKana})
                      </span>
                    )}
                  </dd>
                  <dt className="font-medium">生年月日</dt>
                  <dd className="col-span-2">{selectedScout.student.birthDate || "--"}</dd>
                  <dt className="font-medium">電話</dt>
                  <dd className="col-span-2">{selectedScout.student.phone || "--"}</dd>
                  <dt className="font-medium">メール</dt>
                  <dd className="col-span-2">{selectedScout.student.email || "--"}</dd>
                  <dt className="font-medium">卒業予定</dt>
                  <dd className="col-span-2">{selectedScout.student.graduationMonth || "--"}</dd>
                </dl>
              </section>

              <Separator className="my-4"/>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-1"><Briefcase className="h-4 w-4"/>職務経歴</h3>
                {selectedScout.student.workExperiences?.length ? selectedScout.student.workExperiences.map((w,i)=>(
                  <div key={i} className="rounded-md border p-3 mb-2">
                    <p className="font-medium">{w.company||"--"}</p>
                    <p className="text-xs text-muted-foreground">{w.startMonth||"--"} 〜 {w.isCurrent?"現在":w.endMonth||"--"}</p>
                    {w.position && <p className="text-sm">{w.position}</p>}
                    {w.description && <p className="mt-1 text-xs">{w.description}</p>}
                    {w.technologies && <div className="mt-1 flex flex-wrap gap-1">
                      {w.technologies.split(",").map((t,j)=><Badge key={j} variant="outline" className="bg-blue-50 text-xs">{t.trim()}</Badge>)}
                    </div>}
                  </div>
                )):<p className="text-sm text-muted-foreground">登録なし</p>}
              </section>

              <Separator className="my-4"/>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">自己PR</h3>
                {selectedScout.student.prTitle && <p className="font-medium">{selectedScout.student.prTitle}</p>}
                <p className="whitespace-pre-wrap text-sm">{selectedScout.student.prText || "--"}</p>
                {selectedScout.student.strengths?.length && <div className="flex flex-wrap gap-1">
                  {selectedScout.student.strengths.map((st,i)=><Badge key={i} variant="outline" className="bg-green-50 text-xs">{st}</Badge>)}
                </div>}
              </section>

              <Separator className="my-4"/>

              <section className="space-y-2 mb-8">
                <h3 className="text-sm font-semibold">希望条件</h3>
                <dl className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm">
                  <dt className="font-medium">職種</dt>
                  <dd className="col-span-2">{(selectedScout.student.desiredPositions??[]).join(", ")||"--"}</dd>
                  <dt className="font-medium">勤務地</dt>
                  <dd className="col-span-2">{(selectedScout.student.desiredLocations??[]).join(", ")||"--"}</dd>
                  <dt className="font-medium">希望年収</dt>
                  <dd className="col-span-2">{selectedScout.student.salaryRange||"--"}</dd>
                </dl>
              </section>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
