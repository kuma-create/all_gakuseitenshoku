import { NextResponse } from 'next/server';

// 必要に応じて Edge/Node ランタイムを選択
// export const runtime = 'edge';

type Event = {
  id: string;
  title: string;
  description?: string;
  date: string;
  age: number;
  category: string;
  emotionalLevel?: number;
  impactLevel?: number;
  skills?: string[];
  learnings?: string[];
  values?: string[];
  jobHuntRelevance?: {
    relevant: boolean;
    industries: string[];
    jobTypes: string[];
    keywords: string[];
  };
};

type Insight = {
  type: 'pattern' | 'strength' | 'value' | 'growth';
  title: string;
  description: string;
  evidence: string[];
  jobHuntApplication: string;
};

export async function POST(req: Request) {
  try {
    const { userId, events } = (await req.json()) as {
      userId: string;
      events: Event[];
    };

    // --- ここに本来のAI呼び出しを実装（OpenAI 等） ---
    // ひとまず簡易ロジックでインサイトを返すモック

    const evs = Array.isArray(events) ? events : [];

    // skills 上位を抽出
    const skillFreq = new Map<string, number>();
    evs.forEach(e => (e.skills || []).forEach(s => skillFreq.set(s, (skillFreq.get(s) || 0) + 1)));
    const topSkills = [...skillFreq.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k])=>k);

    // values 上位を抽出
    const valueFreq = new Map<string, number>();
    evs.forEach(e => (e.values || []).forEach(v => valueFreq.set(v, (valueFreq.get(v) || 0) + 1)));
    const topValues = [...valueFreq.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k])=>k);

    // growth: 感情レベルの前半後半差分
    const half = Math.ceil(evs.length/2);
    const avg = (arr: Event[]) =>
      arr.reduce((a,e)=>a+(e.emotionalLevel ?? 0),0) / Math.max(1, arr.length);
    const delta = Math.round((avg(evs.slice(half)) - avg(evs.slice(0,half))) * 10) / 10;

    const insights: Insight[] = [];

    if (topSkills.length) {
      insights.push({
        type: 'strength',
        title: '強みの傾向（AI）',
        description: `繰り返し現れるスキルは ${topSkills.join('・')} です。自己PRの主軸候補です。`,
        evidence: evs.filter(e => (e.skills||[]).some(s => topSkills.includes(s))).slice(0,5).map(e => e.title),
        jobHuntApplication: '強みを 1〜2 に絞り、STAR で一貫性を持って語りましょう。'
      });
    }

    if (topValues.length) {
      insights.push({
        type: 'value',
        title: '価値観の傾向（AI）',
        description: `重視している価値観は ${topValues.join('・')} の可能性があります。`,
        evidence: evs.filter(e => (e.values||[]).some(v => topValues.includes(v))).slice(0,5).map(e => e.title),
        jobHuntApplication: '企業カルチャーとの適合性を比較検討する指標に使えます。'
      });
    }

    insights.push({
      type: 'growth',
      title: '感情トレンド（AI）',
      description: `前半→後半の平均感情差は ${delta >= 0 ? '+' : ''}${delta} です。変化の要因を言語化しましょう。`,
      evidence: evs.slice(-3).map(e => `${e.date} ${e.title}`),
      jobHuntApplication: '行動や工夫（STARのA）を具体化し、面接で再現性を示しましょう。'
    });

    return NextResponse.json({ userId, insights });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Unexpected error' },
      { status: 500 }
    );
  }
}