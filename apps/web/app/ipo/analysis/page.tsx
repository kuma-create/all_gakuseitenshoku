"use client";

import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useAIChatCore } from "@/components/analysis/useAIChatCore";
import { BookOpen, Briefcase, TrendingUp, SquareStack, Target, Brain, FileText, Info, PlusCircle, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, usePathname } from "next/navigation";
import { LifeChart } from "@/components/analysis/LifeChart";
import { FutureVision } from "@/components/analysis/FutureVision";
import { SimpleExperienceReflection } from "@/components/analysis/SimpleExperienceReflection";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

// --- Supabase tables (想定スキーマ) ---
// テーブル例: ipo_ai_threads(id uuid PK, user_id uuid, title text, created_at timestamptz)
//            ipo_ai_messages(id uuid PK, thread_id uuid, role text, content text, created_at timestamptz)
// 生成型の列名推論を有効にするため、テーブル名はリテラル型に固定
const TABLE_THREAD = "ipo_ai_threads" as const;
const TABLE_MESSAGE = "ipo_ai_messages" as const;

// ---- Inline helpers (no external ai/chatBridge.ts) ----
type ChatRole = "user" | "assistant" | "system";
type BasicMsg = { role: ChatRole; content: string };

async function ensureThread(titleHint?: string): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id ?? null;
  if (!uid) return null;
  const newId = crypto.randomUUID();
  await supabase.from(TABLE_THREAD).insert({ id: newId, user_id: uid, title: titleHint || "自己分析チャット" });
  return newId;
}

async function saveMessage(threadId: string, role: ChatRole, content: string, id?: string) {
  try {
    await supabase.from(TABLE_MESSAGE).insert({
      id: id || crypto.randomUUID(),
      thread_id: threadId,
      role,
      content,
    });
  } catch (e) {
    console.warn("saveMessage skipped:", e);
  }
}

async function callLLM(params: {
  instruction: string; // kept for compatibility, not used by /api/aichat
  input: string;
  history?: BasicMsg[];
  userId?: string;
  sessionId?: string;
  mode?: string;
}): Promise<string> {
  const { input, history, sessionId, mode } = params;

  // Build OpenAI-like payload: history + latest user message
  const messages = [
    ...(history ?? []),
    { role: "user", content: input },
  ];

  const payload: any = {
    messages,
    mode: typeof mode !== "undefined" ? mode : "analytical",
    threadId: sessionId ?? null,
  };

  const res = await fetch("/api/aichat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`aichat status ${res.status}`);
  const json = await res.json().catch(() => null);
  if (!json) return "";

  // Accept common shapes
  const content =
    json?.content ??
    json?.data?.content ??
    json?.answer ??
    (Array.isArray(json?.choices) && json.choices[0]?.message?.content) ??
    "";

  return String(content ?? "");
}

async function sendAndReceiveInline(opts: {
  userText: string;
  history?: BasicMsg[];
  titleHint?: string;
  threadId?: string | null;
}): Promise<{ assistantText: string; threadId: string | null }>
{
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id ?? undefined;
  const threadId = opts.threadId ?? (await ensureThread(opts.titleHint));
  if (threadId) await saveMessage(threadId, "user", opts.userText);
  let assistantText = "";
  try {
    assistantText = await callLLM({
      instruction: "自己分析向け。PRタイトル/自己紹介/自己PR/希望条件/経験を引き出し、不足情報は質問で返す。",
      input: opts.userText,
      history: opts.history,
      userId: uid,
      sessionId: threadId || undefined,
      mode: "analytical",
    });
  } catch (e) {
    console.error("LLM error:", e);
    assistantText = "うまく処理できませんでした。別の聞き方で教えてください。";
  }
  if (threadId) await saveMessage(threadId, "assistant", assistantText);
  return { assistantText, threadId };
}

// --- おすすめ質問タグ ---
const suggestionTags = [
  "就活の不安や悩みを聞いて解決策を考えて",
  "私の強みをラリー形式で深掘りして",
  "ソフトバンクの企業分析をして",
  "ESの添削・改善をしてほしい",
  "将来のキャリアプランを一緒に設計して",
];

// --- コンテンツカード ---
const contents = [
  {
    title: "自己PR",
    description: "まずは自分の強みを整理して自己PRを作ろう",
    href: "/ipo/analysis/self-pr",
    icon: BookOpen,
    color: "from-sky-500 to-cyan-600",
  },
  {
    title: "ライフチャート",
    description: "自分の人生を振り返り自分をもっとよく知ろう",
    href: "/ipo/analysis/life-chart",
    icon: TrendingUp,
    color: "from-green-500 to-emerald-600",
  },
  {
    title: "将来ビジョン",
    description: "将来の仕事やプライベートの人生観を整理しよう",
    href: "/ipo/analysis/future-vision",
    icon: Target,
    color: "from-pink-500 to-rose-500",
  },
  {
    title: "経験の整理",
    description: "学業やアルバイト、インターン経験を整理しよう",
    href: "/ipo/analysis/experiences",
    icon: SquareStack,
    color: "from-sky-500 to-indigo-600",
  },
  {
    title: "職務経歴書",
    description: "アルバイト・インターン等の職歴を入力・管理",
    href: "/ipo/analysis/resume",
    icon: Briefcase,
    color: "from-indigo-500 to-indigo-600",
  },
  {
    title: "適職診断",
    description: "性格や価値観、希望条件からあなたの適職を診断しよう",
    href: "/ipo/analysis/job-fit",
    icon: Brain,
    color: "from-violet-500 to-indigo-600",
  },
] as const;

// --- ページ本体 ---
export default function AnalysisDemoPage() {
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  // ---- Self PR (manual) state persisted in Supabase ----
  type ManualPR = { prTitle: string; about: string; prText: string; strengths: [string, string, string] };
  const [manual, setManual] = useState<ManualPR>({ prTitle: "", about: "", prText: "", strengths: ["", "", ""] });
  const [profileKey, setProfileKey] = useState<"user_id" | "id">("user_id");
  const [savingPR, setSavingPR] = useState(false);
  const emptyPR: ManualPR = { prTitle: "", about: "", prText: "", strengths: ["", "", ""] };
  const [lastSavedManual, setLastSavedManual] = useState<ManualPR>(emptyPR);
  // Ensure manual is hydrated only once and never overwrites user input
  const manualLoadedRef = useRef(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [showPreview, setShowPreview] = useState(false);
  const [chatOpened, setChatOpened] = useState(false);

  // ---- Resume (職務経歴書) state ----
  type WorkExperience = {
    id: number;
    company: string;
    position: string;
    jobTypes: string[]; // 複数職種
    startDate: string; // YYYY-MM
    endDate: string;   // YYYY-MM
    isCurrent: boolean;
    description: string;
    technologies: string;
    achievements: string;
    isOpen?: boolean; // UI-only
  };
  const [workExperiences, setWorkExperiences] = useState<WorkExperience[]>([
    { id: 1, company: "", position: "", jobTypes: [], startDate: "", endDate: "", isCurrent: false, description: "", technologies: "", achievements: "", isOpen: true },
  ]);
  const [resumeSaving, setResumeSaving] = useState(false);

  const addWorkExperience = useCallback(() => {
    setWorkExperiences((prev) => {
      const nextId = prev.length ? Math.max(...prev.map(r => r.id)) + 1 : 1;
      return [...prev, { id: nextId, company: "", position: "", jobTypes: [], startDate: "", endDate: "", isCurrent: false, description: "", technologies: "", achievements: "", isOpen: true }];
    });
  }, []);
  const removeWorkExperience = useCallback((id: number) => {
    setWorkExperiences((prev) => (prev.length > 1 ? prev.filter(r => r.id !== id) : prev));
  }, []);
  const patchWorkExperience = useCallback((id: number, patch: Partial<WorkExperience>) => {
    setWorkExperiences((prev) => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  // Sidebar visibility (collapsible)
  const [showSidebar, setShowSidebar] = useState(true);
  // Load Resume from `resumes` table
  useEffect(() => {
    if (!userId) return;
    let aborted = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('resumes')
          .select('work_experiences')
          .eq('user_id', userId)
          .maybeSingle();
        if (error && error.code !== 'PGRST116') console.warn('resumes load warn:', error.message);
        const arr = (data?.work_experiences ?? []) as any[];
        if (!aborted && Array.isArray(arr) && arr.length) {
          const rows: WorkExperience[] = arr.map((r: any, i: number) => ({
            id: typeof r.id === 'number' ? r.id : (i + 1),
            company: String(r.company ?? ''),
            position: String(r.position ?? ''),
            jobTypes: Array.isArray(r.jobTypes) ? r.jobTypes.map(String) : (Array.isArray(r.job_types) ? r.job_types.map(String) : []),
            startDate: String(r.startDate ?? ''),
            endDate: String(r.endDate ?? ''),
            isCurrent: Boolean(r.isCurrent ?? false),
            description: String(r.description ?? ''),
            technologies: String(r.technologies ?? ''),
            achievements: String(r.achievements ?? ''),
            isOpen: true,
          }));
          setWorkExperiences(rows);
        }
      } catch (e) {
        console.warn('load resume failed:', e);
      }
    })();
    return () => { aborted = true; };
  }, [userId]);
  const toggleRowOpen = useCallback((id: number) => {
    setWorkExperiences((prev) => prev.map(r => (r.id === id ? { ...r, isOpen: !r.isOpen } : r)));
  }, []);
  const toggleJobType = useCallback((id: number, opt: string, checked: boolean) => {
    setWorkExperiences((prev) => prev.map(r => {
      if (r.id !== id) return r;
      const set = new Set(r.jobTypes || []);
      if (checked) set.add(opt); else set.delete(opt);
      return { ...r, jobTypes: Array.from(set) };
    }));
  }, []);

  const saveResume = useCallback(async () => {
    if (!userId) return;
    setResumeSaving(true);
    try {
      const { data: existing } = await supabase
        .from('resumes')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      const payload: any = { user_id: userId, work_experiences: workExperiences, updated_at: new Date().toISOString() };
      if (existing?.id) {
        const { error: updErr } = await supabase.from('resumes').update(payload).eq('id', existing.id);
        if (updErr) throw updErr;
      } else {
        const { error: insErr } = await supabase.from('resumes').insert(payload);
        if (insErr) throw insErr;
      }
    } catch (e) {
      console.error('saveResume error:', e);
      alert('職務経歴書の保存に失敗しました');
    } finally {
      setResumeSaving(false);
    }
  }, [userId, workExperiences]);

  const aiFillResumeRow = useCallback(async (rowId: number) => {
    const row = workExperiences.find(r => r.id === rowId);
    if (!row) return;
    try {
      const prompt = [
        'あなたは就活用の職務経歴書アシスタントです。',
        '以下のJSONの未入力フィールド（description, achievements, technologies）を日本語で簡潔に補完してください。',
        '必ず次のキーのみでJSON出力: { "description": string, "achievements": string, "technologies": string }',
        '入力:',
        '```json',
        JSON.stringify(row),
        '```',
      ].join('\n');
      const reply = await callLLM({ input: prompt, instruction: 'resume autofill', history: [], sessionId: threadId ?? undefined, mode: 'analytical' });
      const parseJSON = (t: string) => {
        try { return JSON.parse(t); } catch {}
        const m = t.match(/```(?:json)?\s*([\s\S]*?)\s*```/i); if (m) { try { return JSON.parse(m[1]); } catch {} }
        return null;
      };
      const j = parseJSON(reply);
      if (!j) return alert('AIの戻り値を解析できませんでした');
      patchWorkExperience(rowId, {
        description: typeof j.description === 'string' ? j.description.slice(0, 500) : row.description,
        achievements: typeof j.achievements === 'string' ? j.achievements.slice(0, 600) : row.achievements,
        technologies: typeof j.technologies === 'string' ? j.technologies.slice(0, 200) : row.technologies,
      });
    } catch (e) {
      console.error('aiFillResumeRow error:', e);
      alert('AI自動入力に失敗しました');
    }
  }, [workExperiences, patchWorkExperience, threadId]);

  // ---- Threads sidebar (ChatGPT-like) ----
  type AiThread = { id: string; title: string | null; created_at: string };
  const [sessions, setSessions] = useState<AiThread[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [historyMessages, setHistoryMessages] = useState<{ role: ChatRole; content: string; created_at?: string }[]>([]);

  const loadThreads = useCallback(async (uid: string) => {
    try {
      setSessionsLoading(true);
      const { data } = await supabase
        .from(TABLE_THREAD)
        .select("id, title, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });
      setSessions((data as any[])?.map((r) => ({
        id: r.id, title: r.title ?? null, created_at: r.created_at,
      })) ?? []);
    } finally {
      setSessionsLoading(false);
    }
  }, []);
  const loadThreadMessages = useCallback(async (tid: string) => {
    const { data } = await supabase
      .from(TABLE_MESSAGE)
      .select("role, content, created_at")
      .eq("thread_id", tid)
      .order("created_at", { ascending: true });
    setHistoryMessages((data as any[])?.map((m) => ({ role: m.role as ChatRole, content: m.content, created_at: m.created_at })) ?? []);
  }, []);

  const openThread = useCallback(async (tid: string) => {
    setThreadId(tid);
    await loadThreadMessages(tid);
    setChatOpened(true);
  }, [loadThreadMessages]);
  const newThread = useCallback(async () => {
    const tid = await ensureThread("新しい会話");
    if (tid) {
      setThreadId(tid);
      setHistoryMessages([]);
      if (userId) { loadThreads(userId); }
    }
  }, [userId, loadThreads]);

  // ---- Tab routing (activeTab) ----
  type TabId = 'aiChat' | 'manual' | 'lifeChart' | 'experienceReflection' | 'futureVision' | 'resume' | 'overview';
  const [activeTab, setActiveTab] = useState<TabId>('aiChat');
  const pathname = usePathname();
  const router = useRouter();

  // Map tabs to routes (manual path uses provided typo'd route intentionally)
  const tabRouteMap: Record<TabId, string> = {
    aiChat: '/ipo/analysis/aiChat',
    manual: '/ipo/analysis/manual', // 指定通り
    lifeChart: '/ipo/analysis/lifeChart',
    experienceReflection: '/ipo/analysis/experienceReflection',
    futureVision: '/ipo/analysis/futureVision',
    resume: '/ipo/analysis/resume',
    overview: '/ipo/analysis/overview',
  };

  // Pathname -> activeTab
  useEffect(() => {
    const p = (pathname || '').split('?')[0].split('#')[0];
    const parts = p.split('/').filter(Boolean);
    const idx = parts.findIndex(s => s === 'analysis');
    const seg = idx !== -1 && parts[idx + 1] ? parts[idx + 1] : '';
    const mapping: Record<string, TabId> = {
      aiChat: 'aiChat',
      manual: 'manual',
      lifeChart: 'lifeChart',
      experienceReflection: 'experienceReflection',
      futureVision: 'futureVision',
      resume: 'resume',
      overview: 'overview',
      'life-chart': 'lifeChart',               // 互換: 旧スラッグ
      'future-vision': 'futureVision',        // 互換
      'experiences': 'experienceReflection',  // 互換
      'self-pr': 'manual',                    // 互換
    };
    const nextTab = (mapping[seg] || 'aiChat') as TabId;
    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [pathname]);

  // activeTab -> push route + show feature area (chat slides down)
  useEffect(() => {
    const route = tabRouteMap[activeTab] || '/ipo/analysis/aiChat';
    try { router.push(route); } catch {}
    // feature tabs show inline content above chat; aiChat/overview hide feature
    if (activeTab === 'manual' || activeTab === 'lifeChart' || activeTab === 'experienceReflection' || activeTab === 'futureVision' || activeTab === 'resume') {
      setActiveFeature(activeTab);
    } else {
      setActiveFeature(null);
    }
  }, [activeTab]);

  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab((prev) => {
      const isFeature = tab === 'manual' || tab === 'lifeChart' || tab === 'experienceReflection' || tab === 'futureVision' || tab === 'resume';
      // Toggle off if the same feature tab is clicked again
      if (isFeature && prev === tab) {
        try { router.push('/ipo/analysis/aiChat'); } catch {}
        setActiveFeature(null);
        return 'aiChat';
      }
      return tab;
    });
    // scroll to top on desktop to reveal feature area smoothly
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }
  }, [router]);
  type FeatureId = 'manual' | 'lifeChart' | 'experienceReflection' | 'futureVision' | 'resume' | null;
  const [activeFeature, setActiveFeature] = useState<FeatureId>(null);

  const canSend = useMemo(() => input.trim().length > 0, [input]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        const uid = session?.user?.id ?? null;
        if (!mounted) return;
        setUserId(uid);
        if (!uid) { setLoading(false); return; }

        // ログインごとに新規スレッドを作成
        const newId = crypto.randomUUID();
        const { error: insErr } = await supabase
          .from(TABLE_THREAD)
          .insert({ id: newId, user_id: uid, title: "自己分析チャット" });
        const tid = insErr ? null : newId;
        if (!mounted) return;
        setThreadId(tid);
        // Load threads after login established
        await loadThreads(uid);
        // 既存メッセージのロード
        // (Removed per instructions)
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => { mounted = false; };
  }, [loadThreads]);

  useEffect(() => {
    if (!userId) return;
    try {
      localStorage.removeItem(`aichat:${userId}:messages:v2`);
    } catch {}
  }, [userId]);

  const { messages, isTyping, send } = useAIChatCore({
    userId,
    onSend: async (userText, history) => {
      const { assistantText, threadId: usedTid } = await sendAndReceiveInline({
        userText,
        history,
        titleHint: messages.length ? messages[0].content.slice(0, 32) : "自己分析チャット",
        threadId, // reuse selected thread if any
      });
      if (threadId) {
        setHistoryMessages((prev) => [...prev, { role: "user", content: userText }, { role: "assistant", content: assistantText }]);
        if (userId) { loadThreads(userId); }
      } else {
        if (usedTid) {
          setThreadId(usedTid);
          if (userId) { loadThreads(userId); }
        }
      }
      return assistantText;
    },
  });
  // Compute messages to display (sidebar thread vs. default)
  const displayMessages = threadId ? historyMessages : messages;

  useEffect(() => {
    if (!chatOpened) {
      const hasUser = messages.some((m) => m.role === 'user');
      if (hasUser) setChatOpened(true);
    }
  }, [messages, chatOpened]);

  const handleSend = useCallback(async () => {
    if (!canSend || isTyping) return;
    const text = input.trim();
    if (!text) return;
    await send(text);
    if (!chatOpened) setChatOpened(true);
    setInput("");
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    });
  }, [canSend, isTyping, input, send, chatOpened]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // IME変換中はEnterで送信しない（日本語入力など）
      const ne: any = e.nativeEvent as any;
      const isComposing = Boolean((e as any).isComposing) || Boolean(ne?.isComposing) || (ne?.keyCode === 229);
      if (isComposing) {
        return; // 変換確定のEnterは無視
      }

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const featureRouteMap: Record<Exclude<FeatureId, null>, string> = {
    manual: "/ipo/analysis/manual", // NOTE: provided mapping（原文通り）
    lifeChart: "/ipo/analysis/lifeChart",
    experienceReflection: "/ipo/analysis/experienceReflection",
    futureVision: "/ipo/analysis/futureVision",
  };
  const openFeature = (id: Exclude<FeatureId, null>) => {
    setActiveFeature(id);
    // animate in-place AND update URL for deep-link
    try { router.push(featureRouteMap[id]); } catch {}
  };
  // ---- Auto-fill (AI) helpers ----
  const [aiFilling, setAiFilling] = useState(false);
  const safeJsonFromText = (text: string): any | null => {
    if (!text) return null;
    // try direct parse
    try { return JSON.parse(text); } catch {}
    // try to extract fenced code block ```json ... ```
    const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlock && codeBlock[1]) {
      try { return JSON.parse(codeBlock[1]); } catch {}
    }
    // try to find the first {...} json-ish blob
    const braceIdx = text.indexOf("{");
    const lastIdx = text.lastIndexOf("}");
    if (braceIdx !== -1 && lastIdx !== -1 && lastIdx > braceIdx) {
      const blob = text.slice(braceIdx, lastIdx + 1);
      try { return JSON.parse(blob); } catch {}
    }
    return null;
  };
  const buildManualContext = () => {
    return {
      manual,
      strengthItems: manualTags, // light context
      now: new Date().toISOString(),
    };
  };
  const aiAutofillManual = async () => {
    if (aiFilling) return;
    setAiFilling(true);
    try {
      const ctx = buildManualContext();
      const prompt = [
        "あなたは就活の自己PR作成の専門家です。",
        "次のユーザーデータ(JSON)を参考に、以下の形式で日本語の下書きを返してください。",
        "",
        "必ず次のキーのみを含むJSONで出力してください：",
        '{ "prTitle": string, "about": string, "prText": string, "strengths": string[] }',
        "制約：aboutは200文字以内、prTextは800文字以内、strengthsは最大3つ。",
        "",
        "ユーザーデータ:",
        "```json",
        JSON.stringify(ctx),
        "```",
      ].join("\n");
      const reply = await callLLM({
        instruction: "自己PR自動入力",
        input: prompt,
        history: [],
        userId: userId ?? undefined,
        sessionId: threadId ?? undefined,
        mode: "analytical",
      });
      const json = safeJsonFromText(reply);
      if (!json) {
        alert("AIの戻り値を解析できませんでした。もう一度お試しください。");
        return;
      }
      const next = {
        prTitle: typeof json.prTitle === "string" ? json.prTitle.slice(0, 80) : "",
        about: typeof json.about === "string" ? json.about.slice(0, 200) : "",
        prText: typeof json.prText === "string" ? json.prText.slice(0, 800) : "",
        strengths: Array.isArray(json.strengths) && json.strengths.length
          ? json.strengths.slice(0, 3).map((s: any) => String(s || "").slice(0, 40))
          : ["", "", ""],
      };
      setManual((p) => ({
        ...p,
        prTitle: next.prTitle,
        about: next.about,
        prText: next.prText,
        strengths: [
          next.strengths[0] || p.strengths[0] || "",
          next.strengths[1] || p.strengths[1] || "",
          next.strengths[2] || p.strengths[2] || "",
        ] as [string, string, string],
      }));
    } catch (e) {
      console.error("aiAutofillManual error:", e);
      alert("自動入力に失敗しました。時間を置いて再度お試しください。");
    } finally {
      setAiFilling(false);
    }
  };
  // --- Manual PR editor state ---
  // (moved above for persistence)
  // Load PR (student_profiles) once userId is known
  useEffect(() => {
    if (!userId) return;
    let aborted = false;
    (async () => {
      try {
        // Use two-step approach to avoid selecting non-existent analysis_note
        const baseCols = "user_id,id,pr_title,about,pr_text,strength1,strength2,strength3";
        // Try by user_id first
        const { data, error } = await supabase
          .from("student_profiles")
          .select(baseCols)
          .eq("user_id", userId)
          .maybeSingle();
        let row = data as Record<string, any> | null;
        if (error && error.code !== "PGRST116") console.warn("student_profiles load warn:", error.message);
        // Some historical rows used id=auth.uid
        if (!row) {
          const { data: dataById, error: errById } = await supabase
            .from("student_profiles")
            .select(baseCols)
            .eq("id", userId)
            .maybeSingle();
          if (!errById && dataById) {
            row = dataById as Record<string, any>;
            setProfileKey("id");
          }
        } else {
          setProfileKey("user_id");
        }
        if (!row || aborted) return;
        // Best-effort: fetch analysis_note separately if it exists in schema
        let analysisNote: any = null;
        try {
          const { data: noteRow } = await supabase
            .from("student_profiles")
            .select("analysis_note")
            .eq(profileKey, userId)
            .maybeSingle();
          const nr = noteRow as Record<string, any> | null;
          if (nr && typeof nr.analysis_note !== "undefined") {
            analysisNote = nr.analysis_note;
          }
        } catch {}
        // Prefer structured analysis_note JSON if present (use loose typing to avoid TS schema errors)
        const r = row as Record<string, any> | null;
        let prTitle = r?.pr_title ?? "";
        let about = r?.about ?? "";
        let prText = r?.pr_text ?? "";
        try {
          const rawNote = analysisNote;
          const note =
            typeof rawNote === "string" ? JSON.parse(rawNote) :
            (rawNote && typeof rawNote === "object" ? rawNote : null);
          if (note) {
            prTitle = String(note.prTitle ?? prTitle ?? "");
            about   = String(note.about   ?? about   ?? "");
            prText  = String(note.prText  ?? prText  ?? "");
          }
        } catch { /* ignore malformed JSON */ }
        const strengths: [string, string, string] = [
          String(r?.strength1 ?? ""),
          String(r?.strength2 ?? ""),
          String(r?.strength3 ?? ""),
        ];
        const hasContent =
          (prTitle && prTitle.trim().length > 0) ||
          (about && about.trim().length > 0) ||
          (prText && prText.trim().length > 0) ||
          strengths.some((s) => s && String(s).trim().length > 0);
        // Hydrate exactly once and only if there's something to show
        if (!manualLoadedRef.current && hasContent) {
          const next = {
            prTitle: prTitle || "",
            about: about || "",
            prText: prText || "",
            strengths,
          } as ManualPR;
          setManual(next);
          setLastSavedManual(next);
          manualLoadedRef.current = true;
        }
      } catch (e) {
        console.warn("load PR failed:", e);
      }
    })();
    return () => { aborted = true; };
  }, [userId]);

  // Save PR with upsert into student_profiles
  const savePR = useCallback(async (payload: ManualPR) => {
    if (!userId) return;
    setSavingPR(true);
    try {
      const key = profileKey;
      // Ensure row exists or upsert with minimal columns
      const base = {
        pr_title: payload.prTitle || null,
        about: payload.about || null,
        pr_text: payload.prText || null,
        strength1: payload.strengths?.[0] || null,
        strength2: payload.strengths?.[1] || null,
        strength3: payload.strengths?.[2] || null,
        updated_at: new Date().toISOString(),
      };
      // Check existence
      const { data: existing, error: selErr } = await supabase
        .from("student_profiles")
        .select(key)
        .eq(key, userId)
        .maybeSingle();
      if (selErr && selErr.code !== "PGRST116") {
        console.warn("select student_profiles failed:", selErr.message);
      }
      if (existing) {
        const { error: updErr } = await supabase
          .from("student_profiles")
          .update(base)
          .eq(key, userId);
        if (updErr) throw updErr;
      } else {
        const insertObj: Record<string, any> = { ...base, [key]: userId };
        const { error: insErr } = await supabase
          .from("student_profiles")
          .insert([insertObj]);
        if (insErr) throw insErr;
      }
    } catch (e) {
      console.error("save PR error:", e);
    } finally {
      setSavingPR(false);
    }
  }, [userId, profileKey]);

  // Save/Cancel handlers for manual PR
  const handleSavePR = useCallback(async () => {
    await savePR(manual);
    setLastSavedManual(manual);
  }, [manual, savePR]);

  const handleCancelPR = useCallback(() => {
    setManual(lastSavedManual);
  }, [lastSavedManual]);
  // Extract tags from PR fields (simple: split by space, remove empty)
  const manualTags = useMemo(() => {
    const s: string[] = [];
    [manual.prTitle, manual.about, manual.prText, ...manual.strengths].forEach((v) => {
      v.split(/[ 　、,，\n\r]+/).forEach((w) => {
        if (w && w.length > 1 && !s.includes(w)) s.push(w);
      });
    });
    return s.slice(0, 10);
  }, [manual]);

  const renderFeature = () => {
    switch (activeFeature) {
      case "lifeChart":
        return <LifeChart userId={userId ?? ""} onProgressUpdate={() => {}} />;
      case "futureVision":
        return <FutureVision onProgressUpdate={() => {}} />;
      case "experienceReflection":
        return <SimpleExperienceReflection userId={userId ?? ""} onProgressUpdate={() => {}} />;
      case "manual":
        return (
          <div className="space-y-4">
            <div className="rounded-2xl border border-violet-100 bg-violet-50/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-violet-700" />
                <h3 className="text-[15px] font-semibold text-violet-700">自己PR</h3>
              </div>
              <div className="text-[11px] text-zinc-500">{savingPR ? "保存中…" : ""}</div>
              <div className="mb-3 flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleCancelPR} disabled={savingPR}>
                  キャンセル
                </Button>
                <Button size="sm" onClick={handleSavePR} disabled={savingPR}>
                  {savingPR ? "保存中…" : "保存"}
                </Button>
                <Button variant="secondary" size="sm" onClick={aiAutofillManual} disabled={aiFilling}>
                  {aiFilling ? "AIが下書き作成中…" : "AIで自動入力"}
                </Button>
              </div>

              {/* PRタイトル */}
              <div className="space-y-1 mb-3">
                <Label htmlFor="feature_pr_title" className="text-sm">PR タイトル</Label>
                <Input
                  id="feature_pr_title"
                  value={manual.prTitle}
                  onChange={(e) => setManual((p) => ({ ...p, prTitle: e.target.value }))}
                  placeholder="あなたを一言で"
                  className="text-sm"
                />
              </div>

              {/* 自己紹介（〜200文字） */}
              <div className="space-y-1 mb-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="feature_about" className="text-sm">自己紹介（〜200文字）</Label>
                  <span className="text-xs text-gray-500">{manual.about.length}/200</span>
                </div>
                <Textarea
                  id="feature_about"
                  rows={4}
                  value={manual.about}
                  onChange={(e) => setManual((p) => ({ ...p, about: e.target.value.slice(0,200) }))}
                  placeholder="200文字以内で自己紹介"
                  className="text-sm"
                />
              </div>

              {/* 自己PR（〜800文字） */}
              <div className="space-y-1 mb-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="feature_pr_text" className="text-sm">自己PR（〜800文字）</Label>
                  <span className="text-xs text-gray-500">{manual.prText.length}/800</span>
                </div>
                <Textarea
                  id="feature_pr_text"
                  rows={8}
                  value={manual.prText}
                  onChange={(e) => setManual((p) => ({ ...p, prText: e.target.value.slice(0,800) }))}
                  placeholder="課題 → 行動 → 成果 の順でエピソードを具体的に"
                  className="text-sm"
                />
              </div>

              {/* 強み（最大3つ） */}
              <div className="space-y-1">
                <Label className="text-sm">強み（最大3つ）</Label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {manual.strengths.map((v, i) => (
                    <Input
                      key={i}
                      value={v}
                      placeholder={`強み${i+1}`}
                      onChange={(e) =>
                        setManual((p) => {
                          const arr = [...p.strengths] as [string, string, string];
                          arr[i] = e.target.value;
                          return { ...p, strengths: arr };
                        })
                      }
                      className="text-sm"
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* コツ */}
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-600" />
                <div className="text-sm font-medium text-blue-800">自己PRのコツ</div>
              </div>
              <ul className="mt-2 text-xs text-blue-700 space-y-1 list-disc pl-5">
                <li>数字や結果を用いて具体性を出す</li>
                <li>役割だけでなく、課題→行動→成果 を示す</li>
              </ul>
              <div className="mt-2 text-[11px] text-blue-800/80">
                詳細編集は <Link href="/ipo/analysis/manual" className="underline">/ipo/analysis/manual</Link> から。
              </div>
            </div>
          </div>
        );
      case "resume":
        return (
          <div className="space-y-4">
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-indigo-700" />
                  <h3 className="text-[15px] font-semibold text-indigo-700">職務経歴書</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={saveResume} disabled={resumeSaving}>{resumeSaving ? '保存中…' : '保存'}</Button>
                  <Button variant="outline" size="sm" onClick={addWorkExperience}><PlusCircle className="h-4 w-4 mr-1"/>職歴を追加</Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {workExperiences.map((r) => (
                <div key={r.id} className="rounded-xl border bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <button type="button" onClick={() => toggleRowOpen(r.id)} className="flex items-center gap-2 text-left">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border bg-white">
                        {r.isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </span>
                      <span className="font-medium text-sm">{r.company || `職歴 #${r.id}`}</span>
                    </button>
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm" onClick={() => aiFillResumeRow(r.id)}>AIで自動入力</Button>
                      {workExperiences.length > 1 && (
                        <Button variant="ghost" size="sm" className="text-red-500" onClick={() => removeWorkExperience(r.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {r.isOpen && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm">企業・組織名</Label>
                        <Input value={r.company} onChange={(e) => patchWorkExperience(r.id, { company: e.target.value })} className="text-sm" />
                      </div>
                      <div>
                        <Label className="text-sm">職種（複数選択可）</Label>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 md:grid-cols-3 md:gap-2">
                          {['エンジニア','営業','コンサルタント','経営・経営企画','総務・人事','経理・財務','企画','マーケティング','デザイナー','広報','その他'].map(opt => (
                            <label key={opt} className="flex items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                className="h-3.5 w-3.5"
                                checked={(r.jobTypes || []).includes(opt)}
                                onChange={(e) => toggleJobType(r.id, opt, e.currentTarget.checked)}
                              />
                              {opt}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm">役職・ポジション</Label>
                        <Select value={r.position} onValueChange={(v) => patchWorkExperience(r.id, { position: v })}>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="役職を選択" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="メンバー">メンバー</SelectItem>
                            <SelectItem value="リーダー">リーダー</SelectItem>
                            <SelectItem value="マネージャー">マネージャー</SelectItem>
                            <SelectItem value="責任者">責任者</SelectItem>
                            <SelectItem value="役員">役員</SelectItem>
                            <SelectItem value="代表">代表</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm">開始年月</Label>
                        <Input type="month" value={r.startDate} onChange={(e) => patchWorkExperience(r.id, { startDate: e.target.value })} className="text-sm" />
                      </div>
                      <div>
                        <Label className="text-sm">終了年月</Label>
                        <Input type="month" disabled={r.isCurrent} value={r.endDate} onChange={(e) => patchWorkExperience(r.id, { endDate: e.target.value })} className="text-sm" />
                        <div className="mt-1 text-xs">
                          <label className="inline-flex items-center gap-2">
                            <input type="checkbox" checked={r.isCurrent} onChange={(e) => patchWorkExperience(r.id, { isCurrent: e.target.checked })} />
                            現在も在籍中
                          </label>
                        </div>
                      </div>
                      <div className="sm:col-span-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">業務内容</Label>
                          <span className="text-xs text-gray-500">{r.description.length}/500</span>
                        </div>
                        <Textarea rows={4} value={r.description} onChange={(e) => patchWorkExperience(r.id, { description: e.target.value.slice(0, 500) })} className="text-sm" />
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-sm">使用技術・ツール</Label>
                        <Input value={r.technologies} onChange={(e) => patchWorkExperience(r.id, { technologies: e.target.value })} className="text-sm" />
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-sm">成果・実績</Label>
                        <Textarea rows={3} value={r.achievements} onChange={(e) => patchWorkExperience(r.id, { achievements: e.target.value })} className="text-sm" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const onClickSuggestion = (text: string) => {
    setInput(text);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      {/* Sidebar re-open button */}
      {!showSidebar && (
        <div className="mb-3">
          <Button size="sm" variant="outline" onClick={() => setShowSidebar(true)}>過去ログ一覧を表示</Button>
        </div>
      )}
      <div className={showSidebar ? "grid grid-cols-[260px_1fr] gap-6" : "grid grid-cols-[1fr] gap-6"}>
        {/* Sidebar */}
        {showSidebar && (
          <aside className="border-r pr-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold">過去のログ</div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={newThread}>新規</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowSidebar(false)}>非表示</Button>
              </div>
            </div>
            <div className="space-y-1 max-h-[70vh] overflow-auto">
              {sessionsLoading && <div className="text-xs text-gray-500 px-2 py-1">読み込み中...</div>}
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => openThread(s.id)}
                  className={`w-full text-left rounded-lg px-3 py-2 hover:bg-muted ${threadId === s.id ? "bg-muted" : ""}`}
                >
                  <div className="text-sm font-medium truncate">{s.title || "新しい会話"}</div>
                  <div className="text-[11px] text-muted-foreground">{new Date(s.created_at).toLocaleString()}</div>
                </button>
              ))}
              {sessions.length === 0 && !sessionsLoading && (
                <div className="text-xs text-muted-foreground px-2 py-1">過去のログはまだありません。</div>
              )}
            </div>
          </aside>
        )}
        {/* Main panel */}
        <div>
          {/* Brand + Search-like Input */}
          <div className="mb-6 flex flex-col items-center gap-4">
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="align-middle">自己分析プラットフォーム</span>
              <span className="ml-2 rounded bg-indigo-600/10 px-2 py-1 text-sm font-semibold text-indigo-600">AI</span>
            </h1>
          </div>
          {!loading && !userId && (
            <p className="mb-2 text-xs text-amber-600">※ ログインすると会話が自動保存されます。</p>
          )}

          {/* Chat + Side section */}
          <div className="grid grid-cols-1 gap-6">
            {/* Feature area (appears above chat). Animates height/opacity. */}
            <AnimatePresence initial={false} mode="popLayout">
              {activeFeature && (
                <motion.div
                  key={activeFeature}
                  initial={{ height: 0, opacity: 0, y: -8 }}
                  animate={{ height: "auto", opacity: 1, y: 0 }}
                  exit={{ height: 0, opacity: 0, y: -8 }}
                  transition={{ type: "tween", duration: 0.25 }}
                  className="col-span-1"
                >
                  {/* If manual, add Save/Cancel row to header */}
                  {activeFeature === "manual" ? (
                    <div className="flex items-center gap-2 p-4">
                      <div className="flex-1">
                        <span className="font-semibold text-violet-700">自己PR／自己分析ノート</span>
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handleCancelPR} disabled={savingPR}>キャンセル</Button>
                        <Button size="sm" onClick={handleSavePR} disabled={savingPR}>{savingPR ? "保存中…" : "保存"}</Button>
                      </div>
                    </div>
                  ) : null}
                  {renderFeature()}
                </motion.div>
              )}
            </AnimatePresence>
            {/* Chat (slides down when feature opens) */}
            <motion.div layout className="col-span-1">
              {/* Unified Chat Card: assistant messages + input */}
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4 shadow-sm">
                <h3 className="mb-3 text-[15px] font-semibold text-indigo-700">AIに何でも聞いてください</h3>

                {/* Messages (expand after first send) */}
                {chatOpened && (
                  <div className="mb-3 h-[360px] w-full overflow-y-auto rounded-xl border border-zinc-200 bg-white p-4" ref={listRef}>
                    {displayMessages.map((m, idx) => (
                      <div key={idx} className="mb-4">
                        <div className="mb-1 text-xs text-zinc-500">
                          {m.role === "user" ? "あなた" : "アシスタント"}
                        </div>
                        <div
                          className={
                            m.role === "user"
                              ? "rounded-lg bg-indigo-50 p-3"
                              : "rounded-lg bg-zinc-50 p-3"
                          }
                        >
                          <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed">{m.content}</pre>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* chips */}
                <div className="mb-3 flex flex-wrap gap-2">
                  {[
                    "自己PRを埋めたい",
                    "職務経歴書を要約したい",
                    "経験の整理をサポートして",
                    "将来のことについて言語化したい",
                  ].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => onClickSuggestion(t)}
                      className="rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs text-indigo-700 hover:bg-indigo-50"
                    >
                      {t}
                    </button>
                  ))}
                </div>
                
                {/* Input */}
                <div className="flex items-end gap-2">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="何でも聞いてください（Enterで送信 / Shift+Enterで改行）"
                    className="min-h-[44px] max-h-40 w-full resize-y rounded-xl border border-indigo-100 bg-white px-3 py-2 outline-none placeholder:text-zinc-400 focus:border-indigo-300"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!canSend || isTyping}
                    className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-600/90 disabled:opacity-50"
                    aria-label="send"
                    title="送信 (Enter / Ctrl/⌘+Enter)"
                  >
                    {isTyping ? "送信中…" : "送信"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Cards */}
          <section className="mt-10">
            <h2 className="mb-4 text-xl font-bold">目的から探す</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {contents.map((c) => {
            if (c.title === "自己PR") {
              return (
                <Link
                  key={c.href}
                  href="/ipo/analysis/manual"
                  onClick={(e) => { e.preventDefault(); handleTabChange('manual'); }}
                  className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <span className={`inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${c.color}`}>
                      <c.icon className="h-5 w-5 text-white" />
                    </span>
                    <div>
                      <div className="mb-1 text-base font-semibold group-hover:underline">{c.title}</div>
                      <p className="text-sm text-zinc-600">{c.description}</p>
                    </div>
                  </div>
                </Link>
              );
            }
            if (c.title === "ライフチャート") {
              return (
                <Link
                  key={c.href}
                  href="/ipo/analysis/lifeChart"
                  onClick={(e) => { e.preventDefault(); handleTabChange('lifeChart'); }}
                  className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <span className={`inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${c.color}`}>
                      <c.icon className="h-5 w-5 text-white" />
                    </span>
                    <div>
                      <div className="mb-1 text-base font-semibold group-hover:underline">{c.title}</div>
                      <p className="text-sm text-zinc-600">{c.description}</p>
                    </div>
                  </div>
                </Link>
              );
            }
            if (c.title === "経験の整理") {
              return (
                <Link
                  key={c.href}
                  href="/ipo/analysis/experienceReflection"
                  onClick={(e) => { e.preventDefault(); handleTabChange('experienceReflection'); }}
                  className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <span className={`inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${c.color}`}>
                      <c.icon className="h-5 w-5 text-white" />
                    </span>
                    <div>
                      <div className="mb-1 text-base font-semibold group-hover:underline">{c.title}</div>
                      <p className="text-sm text-zinc-600">{c.description}</p>
                    </div>
                  </div>
                </Link>
              );
            }
            if (c.title === "職務経歴書") {
              return (
                <Link
                  key={c.href}
                  href="/ipo/analysis/resume"
                  onClick={(e) => { e.preventDefault(); handleTabChange('resume'); }}
                  className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <span className={`inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${c.color}`}>
                      <c.icon className="h-5 w-5 text-white" />
                    </span>
                    <div>
                      <div className="mb-1 text-base font-semibold group-hover:underline">{c.title}</div>
                      <p className="text-sm text-zinc-600">{c.description}</p>
                    </div>
                  </div>
                </Link>
              );
            }
            if (c.title === "将来ビジョン") {
              return (
                <Link
                  key={c.href}
                  href="/ipo/analysis/futureVision"
                  onClick={(e) => { e.preventDefault(); handleTabChange('futureVision'); }}
                  className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <span className={`inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${c.color}`}>
                      <c.icon className="h-5 w-5 text-white" />
                    </span>
                    <div>
                      <div className="mb-1 text-base font-semibold group-hover:underline">{c.title}</div>
                      <p className="text-sm text-zinc-600">{c.description}</p>
                    </div>
                  </div>
                </Link>
              );
            }
            // Default render for other cards
            return (
              <Link key={c.href} href={c.href} className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                <div className="flex items-start gap-3">
                  <span className={`inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${c.color}`}>
                    <c.icon className="h-5 w-5 text-white" />
                  </span>
                  <div>
                    <div className="mb-1 text-base font-semibold group-hover:underline">{c.title}</div>
                    <p className="text-sm text-zinc-600">{c.description}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
        <div className="px-4 text-[11px] text-zinc-500">{savingPR ? "保存中…" : ""}</div>
        <div className="sr-only">thread: {threadId || "-"}</div>
      </div>{/* end main panel */}
    </div>{/* end grid */}
  </div>
);
}
