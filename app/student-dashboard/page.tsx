/* ------------------------------------------------------------------
   app/student-dashboard/page.tsx  – 完成度ウィジェット統合版
------------------------------------------------------------------ */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image       from "next/image";
import Link        from "next/link";
import { useRouter } from "next/navigation";
import { format }  from "date-fns";
import { ja }      from "date-fns/locale";

import { supabase }      from "@/lib/supabase/client";
import { useAuth }       from "@/lib/auth-context";
import { useAuthGuard }  from "@/lib/use-auth-guard";
import type { Database } from "@/lib/supabase/types";

import {
  Card, CardContent, CardDescription, CardFooter,
  CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button }   from "@/components/ui/button";
import { Badge }    from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";



import {
  Briefcase, Mail, MessageSquare, ChevronRight,
  Edit, Camera, BellDot, Menu,
} from "lucide-react";

/* ---------- 型 ---------- */
type Stats = { scouts: number; applications: number; chatRooms: number };

type ChallengeRow = Database["public"]["Tables"]["challenges"]["Row"];
type GrandPrix = { id: string; title: string; banner_url?: string | null };

type Scout = {
  id: string;
  company_id: string;
  company_name: string | null;
  company_logo: string | null;
  position: string | null;
  message: string | null;
  created_at: string;
  is_read: boolean;
};

/* ===============================================================
   メインページ
================================================================ */
export default function StudentDashboard() {
  /* ---- ① 認証関連 & 基本フック ------------------------------ */
  const router       = useRouter();
  const { user }     = useAuth();
  const authChecked  = useAuthGuard("student");

  /* ---- ② state ------------------------------------------------ */
  const [stats,  setStats]  = useState<Stats>({ scouts: 0, applications: 0, chatRooms: 0 });
  const [statsLoad, setSL]  = useState(true);

  const [grandPrix, setGP]  = useState<GrandPrix[]>([]);
  const [offers,    setOffers] = useState<Scout[]>([]);
  const [cardsLoad, setCL]     = useState(true);
  const [displayName, setDisplayName] = useState<string>("学生");

  /* ---- ③ 未ログインならリダイレクト -------------------------- */
  useEffect(() => {
    if (authChecked && !user) router.replace("/login");
  }, [authChecked, user, router]);

  /* ---- ④ Supabase fetch -------------------------------------- */
  useEffect(() => {
    if (!user?.id) return;
    const studentId = user.id;

    (async () => {
      // fetch student_profiles.id (some tables reference this instead of auth.users.id)
      const { data: sp } = await supabase
        .from("student_profiles")
        .select("id,full_name,first_name,last_name,last_name_kana,first_name_kana")
        .eq("user_id", studentId)
        .maybeSingle();

      const sid = sp?.id ?? studentId;   // use profile.id if exists, otherwise fallback to auth.uid

      /* ----- 名前フリガナ未入力ならオンボーディングへ ---------------- */
      if (sp && (!sp.last_name_kana || !sp.first_name_kana)) {
        router.replace("/onboarding/profile");
        return;  // 以降の処理を止める
      }

      // decide display name for greeting
      const dname =
        sp?.full_name ||
        `${sp?.last_name ?? ""} ${sp?.first_name ?? ""}`.trim() ||
        "学生";
      setDisplayName(dname);

      /* ---- stats ---- */
      setSL(true);
      const [
        { count: scoutsCnt },
        { count: appsCnt },
        { count: roomsCnt },
      ] = await Promise.all([
        supabase.from("scouts")
          .select("id", { head: true, count: "exact" })
          .eq("student_id", sid),
        supabase.from("applications")
          .select("id", { head: true, count: "exact" })
          .eq("student_id", studentId),
        supabase.from("chat_rooms")
          .select("id", { head: true, count: "exact" })
          .eq("student_id", studentId),
      ]);
      setStats({ scouts: scoutsCnt ?? 0, applications: appsCnt ?? 0, chatRooms: roomsCnt ?? 0 });
      setSL(false);

      /* ---- grand prix & offers ---- */
      const [{ data: gpRaw }, { data: offersRaw, error: offersErr }] = await Promise.all([
        supabase.from("challenges")
          .select("id,title")
          .order("created_at", { ascending: false }),

        supabase.from("scouts")
          .select(`
    id,
    company_id,
    message,
    is_read,
    created_at,
    company:companies!scouts_company_id_fkey ( id, name, logo ),
    job:jobs!scouts_job_id_fkey            ( id, title )
  `)
          .eq("student_id", sid)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      if (offersErr) console.error("scouts fetch error →", offersErr);  // ← 失敗してもツリーを壊さない

      setGP(
        (gpRaw as ChallengeRow[] | null)?.map(c => ({
          id: c.id,
          title: c.title,
          banner_url: null,
        })) ?? [],
      );

      setOffers(
        (offersRaw as any[] | null)?.map(r => ({
          id: r.id,
          company_id    : r.company_id,
          company_name  : r.company?.name ?? null,
          company_logo  : r.company?.logo ?? null,
          position      : r.job?.title ?? null,
          message       : r.message ?? null,
          created_at    : r.created_at,
          is_read       : r.is_read,
        })) ?? [],
      );
      setCL(false);
    })();
  }, [user?.id]);

  /* ---- ⑤ 戻ったら再フェッチ ---------------------------------- */
  useEffect(() => router.refresh(), [router]);

  /* ---- ⑥ 認証判定中／未ログイン ------------------------------ */
  if (!authChecked || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full
                          border-4 border-red-600 border-t-transparent" />
          <p>認証確認中…</p>
        </div>
      </div>
    );
  }

  /* ---- ⑦ 画面 ------------------------------------------------ */
  return (
    <>
      <main className="container mx-auto space-y-10 px-4 py-8">
        {/* ---- Greeting ---- */}
        <GreetingHero userName={displayName} />
        <PhaseModal />


        {/* ---- 1:2 レイアウト ---- */}
        <section className="grid gap-8 sm:grid-cols-2 md:grid-cols-3">
          {/* ---------- 左 1/3 ---------- */}
          <div className="space-y-6">
            <ProfileCard userId={user.id} />
            {cardsLoad
              ? <SkeletonCard height={260} />
              : <GrandPrixCard events={grandPrix} />}
          </div>

          {/* ---------- 右 2/3 ---------- */}
          <div className="md:col-span-2 space-y-6">
            <StatCards stats={stats} loading={statsLoad} className="mb-2" />
            {cardsLoad
              ? <SkeletonCard height={420} />
              : <OffersCard offers={offers} />}
          </div>
        </section>
      </main>
    </>
  );
}

/* ================================================================
   Greeting Hero
================================================================ */
function GreetingHero({ userName }: { userName: string }) {
  return (
    <section className="rounded-xl bg-gradient-to-r from-red-50 to-white p-6 shadow-sm">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl md:text-3xl">
            こんにちは、{userName} さん！
          </h1>
          <p className="mt-1 text-gray-600">今日もいい1日になりますように。</p>
        </div>
      </header>
    </section>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="block rounded-md px-3 py-2 text-gray-700 hover:bg-gray-100">
      {children}
    </Link>
  );
}

/* ================================================================
   ProfileCard – student_profiles を 1 クエリで取得
================================================================ */
function ProfileCard({ userId }: { userId: string }) {
  const [avatarUrl, setAvatar] = useState<string | null>(null);
  const [name,      setName]   = useState<string>("学生");
  const [completion, setCompletion] = useState<number>(0);   // front‑side calc value
  const [saving, setSaving] = useState(false);

  /* 初回 fetch：名前 & アイコン */
  useEffect(() => {
    (async () => {
      const { data: p } = await supabase
        .from("student_profiles")
        .select("full_name, first_name, last_name, avatar_url")
        .eq("user_id", userId)
        .maybeSingle();

      const display =
        p?.full_name ||
        `${p?.last_name ?? ""} ${p?.first_name ?? ""}`.trim() ||
        "学生";
      setName(display);
      setAvatar(p?.avatar_url ?? null);
    })();
  }, [userId]);

  /* アイコンアップロード */
  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // ── allowlist: JPEG / PNG / WebP ──
      const okTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!okTypes.includes(file.type)) {
        alert("対応していない画像形式です。JPEG / PNG / WebP のいずれかを選択してください。");
        return;       // cancel save
      }
      setSaving(true);

      const path = `avatars/${userId}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (error) {
        alert("アップロードに失敗しました");
        setSaving(false);
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      await supabase
        .from("student_profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", userId);
      setAvatar(publicUrl);
      setSaving(false);
    },
    [userId],
  );

  /* ── Front‑side completion
        overall = profilePct * 0.7 + (resumeForm *0.7 + work *0.3) * 0.3 ── */
  useEffect(() => {
    (async () => {
      if (!userId) return;

      /* fetch profile & resume in parallel */
      const [{ data: sp }, { data: resume }] = await Promise.all([
        supabase
          .from("student_profiles")
          .select(`
            last_name, first_name, last_name_kana, first_name_kana,
            birth_date, gender,
            postal_code, prefecture, city, address_line,
            pr_title, pr_text, about,
            desired_positions, work_style_options,
            preferred_industries, desired_locations
          `)
          .eq("user_id", userId)
          .maybeSingle(),

        supabase
          .from("resumes")
          .select("form_data, work_experiences")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const spi = sp as any;   /* loose object for optional props */

      /* helper */
      const filled = (v: any) =>
        Array.isArray(v) ? v.length > 0 : v != null && v !== "";

      /* ==== profilePct (basic / pr / pref) =================================== */
      const basicArr = [
        spi?.last_name, spi?.first_name,
        spi?.last_name_kana, spi?.first_name_kana,
        spi?.birth_date, spi?.gender,
        spi?.postal_code, spi?.prefecture,
        spi?.city, spi?.address_line,
      ];
      const prArr    = [spi?.pr_title, spi?.pr_text, spi?.about];
      const prefArr  = [
        spi?.desired_positions,
        spi?.work_style_options,
        spi?.preferred_industries,
        spi?.desired_locations,
      ];

      const pct = (arr: any[]) =>
        Math.round((arr.filter(filled).length / arr.length) * 100);

      const profilePct =
        Math.round((pct(basicArr) + pct(prArr) + pct(prefArr)) / 3);

      /* form_data は JSON 型なので any キャストで型エラーを回避 */
      const form  = (resume?.form_data as any) ?? {};
      /* work_experiences も JSON 配列なので any[] キャスト */
      const works = Array.isArray(resume?.work_experiences)
        ? (resume!.work_experiences as any[])
        : [];

      const b  = form.basic ?? {};
      const pr = form.pr ?? {};
      const cd = form.conditions ?? {};

      const resumeBasic = [
        b.lastName, b.firstName, b.lastNameKana, b.firstNameKana,
        b.birthdate, b.gender, b.address,
      ];
      const resumePR   = [pr.title, pr.content, pr.motivation];
      const cArrKeys   = ["jobTypes","locations","industries","workPreferences"];
      const condArr    = cArrKeys.map((k) => (cd[k] ?? []).length > 0);
      const condScalar = filled(cd.workStyle);

      const resumeFormPct =
        Math.round((pct(resumeBasic) + pct(resumePR) +
                    Math.round(((condArr.filter(Boolean).length + (condScalar?1:0)) / 5) * 100)
                   ) / 3);

      /* workPct */
      let t = 0, f = 0;
      (works as any[]).forEach((w) => {
        t += 6;
        if (filled(w.company))      f++;
        if (filled(w.position))     f++;
        if (filled(w.startDate))    f++;
        if (filled(w.description))  f++;
        if (filled(w.achievements)) f++;
        if (w.isCurrent || filled(w.endDate)) f++;
      });
      const workPct = works.length
        ? Math.round((f / t) * 100)
        : 0;

      /* resumeOverall = 職務経歴書ページのロジックに合わせ
         Work 完了率のみで評価する  */
      const resumeOverall = workPct;

      /* Final overall = profile 70% + resumeOverall 30% */
      const overall = Math.round(profilePct * 0.7 + resumeOverall * 0.3);

      setCompletion(overall);
    })();
  }, [userId]);

  return (
    <Card className="lg:sticky lg:top-20">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <AvatarBlock url={avatarUrl} onUpload={handleUpload} saving={saving} />
          <span className="text-lg font-bold">{name}</span>
        </CardTitle>
        <CardDescription>
          プロフィール完成度
          <span className="ml-1 font-medium text-gray-800">{completion}%</span>
        </CardDescription>
        <div className="mt-2 h-2 w-full overflow-hidden rounded bg-gray-200">
          <div
            className={`h-full rounded transition-all ${
              completion < 50
                ? "bg-red-500"
                : completion < 80
                ? "bg-yellow-400"
                : completion < 95
                ? "bg-green-400"
                : "bg-green-600"
            }`}
            style={{ width: `${completion || 2}%` }}   /* 0% → 2px 視認用 */
          />
        </div>
      </CardHeader>

      <CardFooter className="flex flex-col gap-2">
        <Button asChild variant="outline" className="w-full">
          <Link href="/student/profile">
            <Edit className="mr-1 h-4 w-4" />
            プロフィール編集
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href="/resume">職務経歴書を編集</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function AvatarBlock({
  url, saving, onUpload,
}: {
  url: string | null;
  saving: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="relative h-16 w-16">
      <Image
        src={url ?? "/placeholder-avatar.png"}
        alt="Avatar"
        fill
        className="rounded-full object-cover"
      />
      <label className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-white p-1 shadow">
        <Camera className="h-4 w-4" />
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onUpload}
          disabled={saving}
        />
      </label>
    </div>
  );
}

/* ================================================================
   GrandPrixCard – 左カラム用シンプルカード
================================================================ */
function GrandPrixCard({ events }: { events: GrandPrix[] }) {
  // --- helper: choose banner --- //
  const bannerFor = (e: GrandPrix) => {
    if (e.banner_url) return e.banner_url;
    const title = (e.title ?? "").toLowerCase();

    if (title.includes("マーケ") || title.includes("market")) {
      return "/icons/gp_marketing.svg";
    }
    if (title.includes("エンジニア") || title.includes("engineer") || title.includes("開発")) {
      return "/icons/gp_engineer.svg";
    }
    if (title.includes("デザイン") || title.includes("design")) {
      return "/icons/gp_design.svg";
    }
    // default
    return "/gp_default.jpg";
  };
  return events.length === 0 ? (
    <Card className="lg:sticky lg:top-[12rem]">
      <CardContent className="p-6 text-center text-gray-600">
        現在開催中の就活グランプリはありません
      </CardContent>
    </Card>
  ) : (
    <Card className="lg:sticky lg:top-[12rem]">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">開催中の就活グランプリ</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {events.map((e) => (
          <Link
            key={e.id}
            href={`/grandprix`}
            className="flex items-center gap-3 rounded-md p-2 hover:bg-gray-50"
          >
            <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-white p-1 ring-1 ring-gray-200">
              <Image
                src={bannerFor(e)}
                alt={e.title}
                fill
                className="object-contain"
              />
            </div>
            <span className="line-clamp-2 text-sm font-medium">{e.title}</span>
          </Link>
        ))}
      </CardContent>
      <CardFooter className="justify-end bg-gray-50">
        <LinkButton href="/grandprix">一覧を見る</LinkButton>
      </CardFooter>
    </Card>
  );
}

/* ================================================================
   OffersCard – 右 2/3 カラムのメインカード
================================================================ */
function OffersCard({ offers }: { offers: Scout[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-xl font-bold">最新のオファー</CardTitle>
          <CardDescription>企業からのオファーが届いています</CardDescription>
        </div>
        {offers.filter(o => !o.is_read).length > 0 && (
          <div className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-600">
            {offers.filter(o => !o.is_read).length}件の新着
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {offers.length === 0 && (
          <p className="text-sm text-gray-600">まだオファーは届いていません</p>
        )}

        {offers.map((offer) => (
          <Link
            key={offer.id}
            href={`/offers/${offer.id}`}
            className="relative flex flex-col sm:flex-row gap-3 sm:gap-4 rounded-lg border border-gray-100 bg-white p-3 sm:p-4 shadow-sm transition-all hover:shadow-md"
          >
            {!offer.is_read && (
              <div className="absolute right-3 top-3 h-2 w-2 rounded-full bg-red-500" />
            )}

            <div className="h-14 w-14 sm:h-12 sm:w-12 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
              <Image
                src={offer.company_logo ?? "/placeholder.svg"}
                alt={`${offer.company_name ?? "企業"}のロゴ`}
                width={48}
                height={48}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="flex-1 pt-1 sm:pt-0">
              <div className="mb-1 flex items-center gap-2">
                <h3 className="font-bold text-gray-900">
                  {offer.company_name ?? "名称未設定の企業"}
                </h3>
                {offer.position && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    {offer.position}
                  </span>
                )}
              </div>

              {offer.message && (
                <p className="text-sm font-medium text-gray-700 line-clamp-2">
                  {offer.message}
                </p>
              )}

              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {format(new Date(offer.created_at), "yyyy年M月d日", { locale: ja })}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  詳細を見る
                </Button>
              </div>
            </div>
          </Link>
        ))}
      </CardContent>

      <CardFooter>
        <Link href="/offers" className="w-full">
          <Button
            variant="outline"
            className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            全てのオファーを見る
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

/* ================================================================
   StatCards – スカウト / 応募 / チャット
================================================================ */
function StatCards({ stats, loading, className = "" }: { stats: Stats; loading: boolean; className?: string }) {
  return (
    <div className={`grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-2 ${className}`}>
      <StatCard
        title="スカウト状況"
        desc="企業からのオファー"
        icon={<Mail className="h-5 w-5 text-red-600" />}
        loading={loading}
        stats={[{ label: "累計", value: stats.scouts, badge: true }]}
        href="/offers"
      />
      <StatCard
        title="応募履歴"
        desc="エントリーした求人"
        icon={<Briefcase className="h-5 w-5 text-red-600" />}
        loading={loading}
        stats={[{ label: "累計", value: stats.applications, badge: true }]}
        href="/student/applications"
      />
    </div>
  );
}

/* ---------------- 共通小物 ---------------- */
function StatCard(props: {
  title: string;
  desc: string;
  icon: React.ReactNode;
  loading: boolean;
  stats: { label: string; value: number; badge?: boolean }[];
  href: string;
}) {
  const { title, desc, icon, loading, stats, href } = props;
  return (
    <Link href={href} className="group block focus:outline-none">
      <Card className="group flex h-full flex-col overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm transition-transform duration-150 ease-out hover:-translate-y-0.5 hover:shadow-lg cursor-pointer">
        <CardHeader className="flex flex-col items-center bg-gradient-to-r from-red-50 to-white pb-1 sm:items-start">
          <CardTitle className="flex items-center gap-2 text-sm font-medium sm:text-base">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-50 sm:h-6 sm:w-6">
              {icon}
            </span>
            <span>{title}</span>
          </CardTitle>
          <CardDescription className="mt-1 text-xs text-gray-600 sm:text-sm">{desc}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 items-center justify-center pt-3">
          {loading ? (
            <p>読み込み中…</p>
          ) : (
            <div className="flex items-center justify-center">
              {stats.map((s) => (
                <Stat key={s.label} {...s} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function Stat({
  label, value, badge = false,
}: { label: string; value: number; badge?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-sm text-gray-500">{label}</span>
      {badge ? (
        <Badge className="min-w-[48px] h-7 justify-center rounded-full bg-red-600 text-sm font-bold text-white">
          {value}
        </Badge>
      ) : (
        <p className="text-xl font-bold">{value}</p>
      )}
    </div>
  );
}

function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Button asChild variant="default" className="bg-red-600 hover:bg-red-700">
      <Link href={href} className="flex items-center">
        {children}
        <ChevronRight className="ml-1 h-4 w-4" />
      </Link>
    </Button>
  );
}

function SkeletonCard({ height = 200 }: { height?: number }) {
  return (
    <div style={{ height }} className="w-full animate-pulse rounded-lg bg-gray-100" />
  );
}


/* ================================================================
   PhaseModal – 登録後フェーズ確認用ポップアップ
================================================================= */
function PhaseModal() {
  const [open, setOpen] = React.useState(false);
  const { user } = useAuth();

  // ▶︎ 表示条件：未回答 もしくは 前回回答から 30 日以上経過
  React.useEffect(() => {
    const last = localStorage.getItem("phaseLastRespondedAt");
    if (!last) {
      setOpen(true);
      return;
    }
    const lastDate = new Date(last);
    const THIRTY_DAYS = 1000 * 60 * 60 * 24 * 30;
    if (Date.now() - lastDate.getTime() > THIRTY_DAYS) {
      setOpen(true);
    }
  }, []);

  const handleSelect = async (choice: string) => {
    if (!user) return;                       // 念のためガード

    // ── Supabase に保存：student_profiles.phase_status を更新 ──
    await supabase
      .from("student_profiles")
      .update({ phase_status: choice })
      .eq("user_id", user.id);

    // ── ローカルにも保存して 30 日ルールを維持 ──
    localStorage.setItem("phaseStatus", choice);
    localStorage.setItem("phaseLastRespondedAt", new Date().toISOString());

    setOpen(false);
  };

  const options = [
    "絶賛就活頑張ってます！",
    "インターンをやりたい！",
    "就活もやりつつインターンもやりたい！",
    "就活は終わって良いインターンを探している！",
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md space-y-4">
        <DialogHeader>
          <DialogTitle>今あなたはどのフェーズにいますか？</DialogTitle>
        </DialogHeader>

        {options.map((opt) => (
          <Button
            key={opt}
            variant="outline"
            className="w-full"
            onClick={() => handleSelect(opt)}
          >
            {opt}
          </Button>
        ))}
      </DialogContent>
    </Dialog>
  );
}
