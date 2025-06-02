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

import { CompletionWidget }         from "@/components/completion-widget";
import { useCompletion }            from "@/lib/use-completion";

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

  /* ---- ③ 未ログインならリダイレクト -------------------------- */
  useEffect(() => {
    if (authChecked && !user) router.replace("/login");
  }, [authChecked, user, router]);

  /* ---- ④ Supabase fetch -------------------------------------- */
  useEffect(() => {
    if (!user?.id) return;
    const studentId = user.id;

    (async () => {
      /* ---- stats ---- */
      setSL(true);
      const [
        { count: scoutsCnt },
        { count: appsCnt },
        { count: roomsCnt },
      ] = await Promise.all([
        supabase.from("scouts")
          .select("id", { head: true, count: "exact" })
          .eq("student_id", studentId),
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
          .select("id,title,deadline")
          .order("deadline", { ascending: true })
          .limit(3),

        supabase.from("scouts")
          .select(`
            id,
            message,
            is_read,
            created_at,
            company:company_id ( id, name, logo ),
            job:job_id         ( title )
          `)
          .eq("student_id", studentId)
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
          company_name  : r.companies?.name ?? null,
          company_logo  : r.companies?.logo ?? null,
          position      : r.jobs?.title ?? null,
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
    <main className="container mx-auto space-y-10 px-4 py-8">
      {/* ---- Greeting ---- */}
      <GreetingHero userName={user.name ?? "学生"} />

      {/* ---- 統合完成度ウィジェット ---- */}
      <CompletionWidget scope="overall" />

      {/* ---- 1:2 レイアウト ---- */}
      <section className="grid gap-8 md:grid-cols-3">
        {/* ---------- 左 1/3 ---------- */}
        <div className="space-y-6">
          <ProfileCard userId={user.id} />
          {cardsLoad
            ? <SkeletonCard height={260} />
            : <GrandPrixCard events={grandPrix} />}
        </div>

        {/* ---------- 右 2/3 ---------- */}
        <div className="md:col-span-2 space-y-6">
          {cardsLoad
            ? <SkeletonCard height={420} />
            : <OffersCard offers={offers} />}
          <StatCards stats={stats} loading={statsLoad} />
        </div>
      </section>
    </main>
  );
}

/* ================================================================
   Greeting Hero
================================================================ */
function GreetingHero({ userName }: { userName: string }) {
  return (
    <section className="rounded-xl bg-gradient-to-r from-red-50 to-white p-6 shadow-sm">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">
            こんにちは、{userName} さん！
          </h1>
          <p className="mt-1 text-gray-600">今日も就活を頑張りましょう。</p>
        </div>

        {/* モバイル用ドロワーメニュー */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64">
            <nav className="mt-8 space-y-4">
              <NavLink href="/jobs">求人を探す</NavLink>
              <NavLink href="/offers">オファー</NavLink>
              <NavLink href="/chat">チャット</NavLink>
              <NavLink href="/grandprix">就活グランプリ一覧</NavLink>
              <NavLink href="/student/profile">プロフィール編集</NavLink>
              <NavLink href="/resume">職務経歴書</NavLink>
            </nav>
          </SheetContent>
        </Sheet>
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
  const { score: completion = 0 } = useCompletion("profile");
  const [saving,    setSaving] = useState(false);

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

  return (
    <Card className="sticky top-20">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <AvatarBlock url={avatarUrl} onUpload={handleUpload} saving={saving} />
          <span className="text-lg font-bold">{name}</span>
        </CardTitle>
        <CardDescription>
          プロフィール完成度
          <span className="ml-1 font-medium text-gray-800">{completion}%</span>
        </CardDescription>
      </CardHeader>

      <CardContent>
        <CompletionWidget scope="profile" />
      </CardContent>

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
  return events.length === 0 ? (
    <Card>
      <CardContent className="p-6 text-center text-gray-600">
        現在開催中の就活グランプリはありません
      </CardContent>
    </Card>
  ) : (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">開催中の就活グランプリ</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {events.map((e) => (
          <Link
            key={e.id}
            href={`/grandprix/${e.id}`}
            className="flex items-center gap-3 rounded-md p-2 hover:bg-gray-50"
          >
            <div className="relative h-10 w-16 flex-shrink-0 overflow-hidden rounded">
              <Image
                src={e.banner_url ?? "/placeholder-banner.jpg"}
                alt={e.title}
                fill
                className="object-cover"
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
          <div className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-600">
            {offers.filter(o => !o.is_read).length}件の新着
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {offers.length === 0 && (
          <p className="text-sm text-gray-600">まだオファーは届いていません</p>
        )}

        {offers.map((offer) => (
          <Link
            key={offer.id}
            href={`/offers/${offer.company_id}`}
            className="relative flex gap-4 rounded-lg border border-gray-100 bg-white p-4 shadow-sm transition-all hover:shadow-md"
          >
            {!offer.is_read && (
              <div className="absolute right-3 top-3 h-2 w-2 rounded-full bg-red-500" />
            )}

            <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
              <Image
                src={offer.company_logo ?? "/placeholder.svg"}
                alt={`${offer.company_name ?? "企業"}のロゴ`}
                width={48}
                height={48}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="flex-1">
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

              <div className="mt-2 flex items-center justify-between">
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
function StatCards({ stats, loading }: { stats: Stats; loading: boolean }) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
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
        href="/applications"
      />
      <StatCard
        title="チャット"
        desc="企業とのやり取り"
        icon={<MessageSquare className="h-5 w-5 text-red-600" />}
        loading={loading}
        stats={[{ label: "トークルーム", value: stats.chatRooms, badge: true }]}
        href="/chat"
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
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="bg-gradient-to-r from-red-50 to-white pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>{desc}</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {loading ? (
          <p>読み込み中…</p>
        ) : (
          <div className="flex items-center justify-between">
            {stats.map((s) => (
              <Stat key={s.label} {...s} />
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end bg-gray-50 px-6 py-3">
        <LinkButton href={href}>確認する</LinkButton>
      </CardFooter>
    </Card>
  );
}

function Stat({
  label, value, badge = false,
}: { label: string; value: number; badge?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-sm text-gray-500">{label}</span>
      {badge ? (
        <Badge className="min-w-[48px] justify-center bg-red-600 text-base font-bold">
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
