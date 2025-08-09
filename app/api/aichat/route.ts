// --- Row type helpers (最小限) ---
type StudentProfileRow = {
  pr_title?: string | null;
  about?: string | null;
  pr_text?: string | null;
  strength1?: string | null;
  strength2?: string | null;
  strength3?: string | null;
  updated_at?: string | null;
  [key: string]: any;
};

type AnalysisProgressRow = {
  ai_chat?: any;
  life_chart?: any;
  future_vision?: any;
  strength_analysis?: any;
  experience_reflection?: any;
  updated_at?: string | null;
  [key: string]: any;
};

type ResumeRow = {
  form_data?: any;
  updated_at?: string | null;
  [key: string]: any;
};
// app/api/aichat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export const runtime = 'nodejs'; // DBアクセス&認証のため Node 実行

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

function buildSystemPrompt(mode: string, userContext?: string) {
  const base = `あなたは日本語で対話するキャリア/自己分析アシスタントです。相手の言葉を尊重し、具体例と短い問いかけを1つ添えて、200〜300字程度で簡潔に答えてください。危険・医療・法律の助言は避け、専門家相談を促してください。ユーザーの文脈(下記 user_context)を活用して、経験の整理/強み弱み/将来ビジョン/ライフチャート/自己分析ノートの更新提案をしてください。
--- user_context ---
${userContext ?? '(なし)'}
--- /user_context ---`;
  switch (mode) {
    case 'empathetic':   return base + '\nトーン: 共感的。相手の感情を言い換え、安心感を与える。';
    case 'analytical':   return base + '\nトーン: 分析的。構造化(現状→要因→次の一手)で整理する。';
    case 'questioning':  return base + '\nトーン: 探究。短い深掘り質問を2つまで提示する。';
    case 'coaching':     return base + '\nトーン: コーチング。SMARTな次の一歩を1つ示す。';
    default:             return base;
  }
}

// 会話に使ってよい列のホワイトリスト（機微/PIIは含めない）
const ALLOWED = {
  student_profiles: ['pr_title','about','pr_text','strength1','strength2','strength3','updated_at'],
  ipo_analysis_progress: ['ai_chat','life_chart','future_vision','strength_analysis','experience_reflection','updated_at'],
  resumes: ['form_data','updated_at'], // JSONB
} as const;

export async function POST(req: NextRequest) {
  try {
    const { messages, mode, threadId } = await req.json();

    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid payload: messages must be an array' }, { status: 400 });
    }

    // 認証ユーザーを取得（RLS 前提）
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ error: 'auth_error', detail: String(authErr.message || authErr) }, { status: 401 });
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const uid = user.id;

    // 1) student_profiles
    const { data: prof } = await supabase
      .from('student_profiles')
      .select(ALLOWED.student_profiles.join(','))
      .or(`user_id.eq.${uid},id.eq.${uid}`)
      .maybeSingle();

    // 2) 進捗
    const { data: prog } = await supabase
      .from('ipo_analysis_progress')
      .select(ALLOWED.ipo_analysis_progress.join(','))
      .eq('user_id', uid)
      .maybeSingle();

    // 3) レジュメ
    const { data: resm } = await supabase
      .from('resumes')
      .select(ALLOWED.resumes.join(','))
      .eq('user_id', uid)
      .maybeSingle();

    // --- Explicit local casts ---
    const p = (prof as StudentProfileRow | null);
    const g = (prog as AnalysisProgressRow | null);
    const r = (resm as ResumeRow | null);

    // ---- 安全な要約に変換（トークン節約 & 機微排除） ----
    const safeContext = {
      profile: p ? {
        pr_title: String(p?.pr_title ?? ''),
        about: String(p?.about ?? '').slice(0, 400),
        pr_text: String(p?.pr_text ?? '').slice(0, 1200),
        strengths: [p?.strength1, p?.strength2, p?.strength3].filter(Boolean),
        updated_at: p?.updated_at ?? null,
      } : null,
      progress: g ? {
        ai_chat: g?.ai_chat ?? null,
        life_chart: g?.life_chart ?? null,
        future_vision: g?.future_vision ?? null,
        strength_analysis: g?.strength_analysis ?? null,
        experience_reflection: g?.experience_reflection ?? null,
        updated_at: g?.updated_at ?? null,
      } : null,
      resume_pr: (() => {
        try {
          const pr = (r?.form_data as any)?.pr;
          return pr ? {
            title: String(pr.title ?? '').slice(0, 80),
            content: String(pr.content ?? '').slice(0, 1200),
          } : null;
        } catch { return null; }
      })(),
    };

    const system = { role: 'system', content: buildSystemPrompt(mode || 'empathetic', JSON.stringify(safeContext)) } as const;

    const chatMessages = [system, ...messages.map((m: any) => ({
      role: m.role === 'assistant' || m.role === 'system' ? m.role : 'user',
      content: typeof m.content === 'string' ? m.content.slice(0, 4000) : ''
    }))];

    const resp = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: chatMessages,
        temperature: 0.5,
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text();
      return NextResponse.json({ error: 'OpenAI error', detail }, { status: 502 });
    }

    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content?.trim() || '';

    // 簡易カテゴリ判定
    const category = (() => {
      const pairs: [RegExp, string][] = [
        [/価値|大切|信条|判断軸/, '価値観'],
        [/将来|目標|キャリア|5年|10年/, '将来設計'],
        [/不安|悩み|迷い|辛い|心配/, '感情整理'],
        [/経験|失敗|成功|学び|振り返り/, '経験分析'],
      ];
      for (const [re, name] of pairs) if (re.test(content)) return name;
      return '自己理解';
    })();

    const insights: string[] = [];
    if (/学び|気づき|発見|振り返り/.test(content)) insights.push('気づきが具体化されています');
    if (/次(の|に)|行動|ステップ|試す/.test(content)) insights.push('次の行動が明確になりました');

    const outThreadId = threadId || `thr_${uid}`; // ユーザー単位でスレッドIDを安定化

    return NextResponse.json({ content, category, insights, questions: undefined, threadId: outThreadId });
  } catch (e: any) {
    return NextResponse.json({ error: 'Unexpected server error', detail: String(e?.message || e) }, { status: 500 });
  }
}