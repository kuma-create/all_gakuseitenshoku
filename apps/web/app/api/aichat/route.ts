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
import { createClient } from '@supabase/supabase-js';

// --- CORS helpers ---
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

function pickOrigin(originHeader?: string | null) {
  const origin = originHeader || '';
  if (!origin) return '*';
  if (ALLOWED_ORIGINS.length === 0) return origin; // allow any during local if not set
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
}

function corsHeaders(originHeader?: string | null) {
  const allowOrigin = pickOrigin(originHeader);
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Vary': 'Origin',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
  } as Record<string, string>;
}

export async function OPTIONS(req: NextRequest) {
  const headers = corsHeaders(req.headers.get('origin'));
  return new NextResponse(null, { status: 204, headers });
}

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

// ---- Generic safe fetchers for other ipo_* tables (schema-agnostic) ----
type Jsonish = Record<string, any>;
const COMMON_TEXT_CANDIDATES = [
  'title','name','company','company_name','stage','stage_name','category','type',
  'overview','summary','description','content','text','note','notes','memo','vision','goal'
];
const COMMON_META_CANDIDATES = ['id','user_id','updated_at','created_at','tags','score','status','start_date','end_date','scheduled_at','happened_at','date'];

function buildProjection(candidates: string[]) {
  // unique, comma-joined
  const uniq = Array.from(new Set(candidates.filter(Boolean)));
  return uniq.join(',');
}

async function trySelect(
  supabase: any,
  table: string,
  uid: string,
  projections: string[]
) {
  for (const proj of projections) {
    const q = supabase
      .from(table)
      .select(proj)
      .eq('user_id', uid)
      .limit(5);
    const { data, error } = await q;
    if (!error) return data as Jsonish[] | null;
  }
  return null;
}

async function safeReadTable(
  supabase: any,
  table: string,
  uid: string,
  extraTextCandidates: string[] = []
) {
  const textCandidates = COMMON_TEXT_CANDIDATES.concat(extraTextCandidates);
  const projections = [
    buildProjection([...COMMON_META_CANDIDATES, ...textCandidates]),
    buildProjection(['id','updated_at']),
    '*', // last resort; will be sanitized below
  ];
  return await trySelect(supabase, table, uid, projections);
}

function sanitizeRows(rows: Jsonish[] | null) {
  if (!rows) return null;
  return rows.map((row) => {
    const out: Jsonish = {};
    for (const [k, v] of Object.entries(row)) {
      if (v == null) continue;
      if (typeof v === 'string') {
        // Keep short texts only
        if (v.length > 0 && v.length <= 1200) out[k] = v;
        else out[k] = v.slice(0, 1200);
      } else if (typeof v === 'number' || typeof v === 'boolean') {
        out[k] = v;
      } else if (Array.isArray(v)) {
        // Keep up to 10 primitive items, truncate strings
        out[k] = v.slice(0,10).map((it) => (typeof it === 'string' ? it.slice(0,100) : it));
      } else if (typeof v === 'object') {
        // Shallow sanitize nested objects
        const o: Jsonish = {};
        for (const [kk, vv] of Object.entries(v)) {
          if (vv == null) continue;
          if (typeof vv === 'string') o[kk] = vv.slice(0, 400);
          else if (typeof vv === 'number' || typeof vv === 'boolean') o[kk] = vv;
        }
        if (Object.keys(o).length) out[k] = o;
      }
    }
    return out;
  });
}

function getSupabaseForRequest(req: NextRequest) {
  // Prefer Authorization header from mobile/native clients; fall back to cookie-based auth.
  const authz = req.headers.get('authorization') || req.headers.get('Authorization');
  if (authz && authz.toLowerCase().startsWith('bearer ')) {
    const token = authz.slice(7).trim();
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false, detectSessionInUrl: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      }
    );
  }
  // Cookie-based (web) fallback
  return createRouteHandlerClient({ cookies });
}

export async function POST(req: NextRequest) {
  try {
    const { messages, mode, threadId } = await req.json();
    const headers = corsHeaders(req.headers.get('origin'));

    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid payload: messages must be an array' }, { status: 400, headers });
    }

    // 認証（Bearer 優先 → Cookie フォールバック）
    let uid: string | null = null;
    let supabase: any;

    const authz = req.headers.get('authorization') || req.headers.get('Authorization') || '';
    const m = authz.match(/^Bearer\s+(.+)$/i);
    const bearer = m ? m[1].trim() : '';

    if (bearer) {
      // 1) Bearer トークンでユーザーを検証（Cookie 不要）
      const supabaseForVerify = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false, detectSessionInUrl: false } }
      );
      const { data: userRes, error: authErr } = await supabaseForVerify.auth.getUser(bearer);
      if (authErr) return NextResponse.json({ error: 'auth_error', detail: String(authErr.message || authErr) }, { status: 401, headers });
      if (!userRes?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers });
      uid = userRes.user.id;

      // RLS 付きの DB アクセスのため、Authorization ヘッダを付けたクライアントを用意
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: { persistSession: false, detectSessionInUrl: false },
          global: { headers: { Authorization: `Bearer ${bearer}` } },
        }
      );
    } else {
      // 2) Cookie ベース（同一オリジン Web 用）
      supabase = getSupabaseForRequest(req);
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr) return NextResponse.json({ error: 'auth_error', detail: String(authErr.message || authErr) }, { status: 401, headers });
      if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers });
      uid = user.id;
    }

    if (!uid) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers });
    }
    const userId: string = uid as string;

    // 1) student_profiles
    const { data: prof } = await supabase
      .from('student_profiles')
      .select(ALLOWED.student_profiles.join(','))
      .or(`user_id.eq.${userId},id.eq.${userId}`)
      .maybeSingle();

    // 2) 進捗
    const { data: prog } = await supabase
      .from('ipo_analysis_progress')
      .select(ALLOWED.ipo_analysis_progress.join(','))
      .eq('user_id', userId)
      .maybeSingle();

    // 3) レジュメ
    const { data: resm } = await supabase
      .from('resumes')
      .select(ALLOWED.resumes.join(','))
      .eq('user_id', userId)
      .maybeSingle();

    // --- Explicit local casts ---
    const p = (prof as StudentProfileRow | null);
    const g = (prog as AnalysisProgressRow | null);
    const r = (resm as ResumeRow | null);

    // ---- Read additional ipo_* tables (best-effort; respects RLS) ----
    const [
      tExperiences,
      tFutureVision,
      tLifeChartEvents,
      tStrengths,
      tWeaknesses,
      tLibraryItems,
      tLibraryUserData,
      tSelectionCompanies,
      tSelectionContacts,
      tSelectionStages,
      tCalendarEvents,
    ] = await Promise.all([
      safeReadTable(supabase, 'ipo_experiences', userId, ['role','context','impact','result']),
      safeReadTable(supabase, 'ipo_future_vision', userId, ['vision','goal','why','how']),
      safeReadTable(supabase, 'ipo_life_chart_events', userId, ['event','emotion']),
      safeReadTable(supabase, 'ipo_strengths', userId, ['trait','evidence']),
      safeReadTable(supabase, 'ipo_weaknesses', userId, ['trait','risk','improvement']),
      safeReadTable(supabase, 'ipo_library_items', userId, ['industry','job','skills']),
      safeReadTable(supabase, 'ipo_library_user_data', userId, ['favorites','searchHistory']),
      safeReadTable(supabase, 'ipo_selection_companies', userId, ['company_name','priority','reason']),
      safeReadTable(supabase, 'ipo_selection_contacts', userId, ['contact','channel','note']),
      safeReadTable(supabase, 'ipo_selection_stages', userId, ['stage','status','next_action']),
      safeReadTable(supabase, 'ipo_calendar_events', userId, ['title','location']),
    ]);

    const extra = {
      experiences: sanitizeRows(tExperiences),
      future_vision: sanitizeRows(tFutureVision),
      life_chart_events: sanitizeRows(tLifeChartEvents),
      strengths: sanitizeRows(tStrengths),
      weaknesses: sanitizeRows(tWeaknesses),
      library_items: sanitizeRows(tLibraryItems),
      library_user_data: sanitizeRows(tLibraryUserData),
      selection_companies: sanitizeRows(tSelectionCompanies),
      selection_contacts: sanitizeRows(tSelectionContacts),
      selection_stages: sanitizeRows(tSelectionStages),
      calendar_events: sanitizeRows(tCalendarEvents),
    };

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
      ipo: extra, // <-- NEW: all ipo_* tables (sanitized)
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
      return NextResponse.json({ error: 'OpenAI error', detail }, { status: 502, headers });
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

    const outThreadId = threadId || `thr_${userId}`; // ユーザー単位でスレッドIDを安定化

    return NextResponse.json({ content, category, insights, questions: undefined, threadId: outThreadId }, { headers });
  } catch (e: any) {
    const headers = corsHeaders(null);
    return NextResponse.json({ error: 'Unexpected server error', detail: String(e?.message || e) }, { status: 500, headers });
  }
}