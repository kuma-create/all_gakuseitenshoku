

import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import dayjs from 'dayjs';
import Link from 'next/link';

// 価格は全ページで「¥500/月」に統一（表示のみ）
const PRICE_LABEL = '¥500/月';

export default async function UpgradePage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  // 未ログイン → ログイン誘導（/login?next=/ipo）
  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <Header />
        <div className="mt-8 rounded-xl border bg-white p-6 shadow-sm">
          <p className="text-lg">先にログインしてください。14日間は全機能を無料でお試しいただけます。</p>
          <div className="mt-6 flex gap-3">
            <Link href={{ pathname: '/login', query: { next: '/ipo' } }} className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50">
              ログインして続ける
            </Link>
            <Link href="/" className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50">
              トップへ戻る
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const { data: sp } = await supabase
    .from('student_profiles')
    .select('plan, trial_start')
    .eq('user_id', user.id)
    .single();

  const diffDays = sp?.trial_start ? dayjs().diff(dayjs(sp.trial_start), 'day') : null;
  const inTrial = diffDays !== null ? diffDays <= 14 : false;
  const remaining = inTrial ? Math.max(0, 14 - (diffDays ?? 0)) : 0;
  const isPremium = sp?.plan === 'premium';

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Header />

      {/* 状態に応じた表示 */}
      {isPremium ? (
        <div className="mt-8 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">すでにPremiumです</h2>
          <p className="mt-2 text-gray-600">ありがとうございます。/ipo へお進みください。</p>
          <div className="mt-6">
            <Link href="/ipo" className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90">
              /ipo を開く
            </Link>
          </div>
        </div>
      ) : inTrial ? (
        <div className="mt-8 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">14日間の無料お試し中</h2>
          <p className="mt-2 text-gray-600">残り <span className="font-semibold">{remaining}</span> 日は全機能を無料で利用できます。</p>
          <div className="mt-6 flex gap-3">
            <Link href="/ipo" className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90">
              /ipo を使い始める
            </Link>
            <Link href="/" className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50">
              トップへ戻る
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-8 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Premium にアップグレード</h2>
          <p className="mt-2 text-gray-600">14日間の無料期間が終了しました。すべての機能をご利用いただくにはアップグレードが必要です。</p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-5">
              <div className="text-sm font-medium text-gray-500">Free</div>
              <div className="mt-2 text-2xl font-bold">¥0</div>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-600">
                <li>基本機能のみ</li>
                <li>AI自己分析などの一部制限</li>
              </ul>
            </div>
            <div className="rounded-lg border p-5">
              <div className="text-sm font-medium text-gray-500">Premium</div>
              <div className="mt-2 text-2xl font-bold">{PRICE_LABEL}</div>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-600">
                <li>全機能アンロック</li>
                <li>自己分析/ES支援/週次スプリント</li>
                <li>Career Score 詳細ダッシュボード</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {/* 決済エンドポイントは実装済みのものに差し替えてください */}
            <form action="/api/stripe/checkout" method="POST">
              <input type="hidden" name="next" value="/ipo" />
              <button type="submit" className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90">
                {PRICE_LABEL}でアップグレード
              </button>
            </form>
            <Link href="/ipo" className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50">
              機能を確認する（閲覧のみ）
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}

function Header() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">IPO大学 Premium</h1>
      <p className="mt-2 text-sm text-gray-600">就活を科学する“就活OS”。{PRICE_LABEL}で全機能が使えます。</p>
    </div>
  );
}