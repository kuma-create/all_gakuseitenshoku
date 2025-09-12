"use client";

import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useAIChatCore } from "@/components/analysis/useAIChatCore";
import { BookOpen, Briefcase, TrendingUp, SquareStack, Target, Brain, FileText, Info } from "lucide-react";
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

// --- Supabase tables (想定スキーマ) ---
// テーブル例: ipo_ai_sessions(id uuid PK, user_id uuid, title text, created_at timestamptz, updated_at timestamptz)
//            ipo_ai_messages(id uuid PK, session_id uuid, role text, content text, created_at timestamptz)
// 生成型の列名推論を有効にするため、テーブル名はリテラル型に固定
const TABLE_SESSION = "ipo_ai_sessions" as const;
const TABLE_MESSAGE = "ipo_ai_messages" as const;

// ---- Inline helpers (no external ai/chatBridge.ts) ----
type ChatRole = "user" | "assistant" | "system";
type BasicMsg = { role: ChatRole; content: string };

async function ensureChatSession(titleHint?: string): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id ?? null;
  if (!uid) return null;
  const newId = crypto.randomUUID();
  await supabase.from(TABLE_SESSION).insert({ id: newId, user_id: uid, title: titleHint || "自己分析チャット" });
  return newId;
}

async function saveMessage(sessionId: string, role: ChatRole, content: string, id?: string) {
  try {
    await supabase.from(TABLE_MESSAGE).insert({
      id: id || crypto.randomUUID(),
      session_id: sessionId,
      role,
      content,
    });
    await supabase.from(TABLE_SESSION).update({ updated_at: new Date().toISOString() }).eq("id", sessionId);
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
  sessionId?: string | null;
}): Promise<{ assistantText: string; sessionId: string | null }>
{
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id ?? undefined;
  const sessionId = opts.sessionId ?? (await ensureChatSession(opts.titleHint));
  if (sessionId) await saveMessage(sessionId, "user", opts.userText);
  let assistantText = "";
  try {
    assistantText = await callLLM({
      instruction: "自己分析向け。PRタイトル/自己紹介/自己PR/希望条件/経験を引き出し、不足情報は質問で返す。",
      input: opts.userText,
      history: opts.history,
      userId: uid,
      sessionId: sessionId || undefined,
      mode: "analytical",
    });
  } catch (e) {
    console.error("LLM error:", e);
    assistantText = "うまく処理できませんでした。別の聞き方で教えてください。";
  }
  if (sessionId) await saveMessage(sessionId, "assistant", assistantText);
  return { assistantText, sessionId };
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
  const [sessionId, setSessionId] = useState<string | null>(null);
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

  // Sidebar visibility (collapsible)
  const [showSidebar, setShowSidebar] = useState(true);

  // ---- Sessions sidebar (ChatGPT-like) ----
  type AiSession = { id: string; title: string | null; created_at: string; updated_at: string };
  const [sessions, setSessions] = useState<AiSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [historyMessages, setHistoryMessages] = useState<{ role: ChatRole; content: string; created_at?: string }[]>([]);

  const loadSessions = useCallback(async (uid: string) => {
    try {
      setSessionsLoading(true);
      const { data } = await supabase
        .from(TABLE_SESSION)
        .select("id, title, created_at, updated_at")
        .eq("user_id", uid)
        .order("updated_at", { ascending: false });
      setSessions((data as any[])?.map((r) => ({
        id: r.id, title: r.title ?? null, created_at: r.created_at, updated_at: r.updated_at
      })) ?? []);
    } finally {
      setSessionsLoading(false);
    }
  }, []);
  const loadSessionMessages = useCallback(async (sid: string) => {
    const { data } = await supabase
      .from(TABLE_MESSAGE)
      .select("role, content, created_at")
      .eq("session_id", sid)
      .order("created_at", { ascending: true });
    setHistoryMessages((data as any[])?.map((m) => ({ role: m.role as ChatRole, content: m.content, created_at: m.created_at })) ?? []);
  }, []);

  const openSession = useCallback(async (sid: string) => {
    setSessionId(sid);
    await loadSessionMessages(sid);
    setChatOpened(true);
  }, [loadSessionMessages]);
  const newSession = useCallback(async () => {
    const sid = await ensureChatSession("新しい会話");
    if (sid) {
      setSessionId(sid);
      setHistoryMessages([]);
      if (userId) { loadSessions(userId); }
    }
  }, [userId, loadSessions]);

  // ---- Tab routing (activeTab) ----
  type TabId = 'aiChat' | 'manual' | 'lifeChart' | 'experienceReflection' | 'futureVision' | 'overview';
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
    if (activeTab === 'manual' || activeTab === 'lifeChart' || activeTab === 'experienceReflection' || activeTab === 'futureVision') {
      setActiveFeature(activeTab);
    } else {
      setActiveFeature(null);
    }
  }, [activeTab]);

  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab((prev) => {
      const isFeature = tab === 'manual' || tab === 'lifeChart' || tab === 'experienceReflection' || tab === 'futureVision';
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
  type FeatureId = 'manual' | 'lifeChart' | 'experienceReflection' | 'futureVision' | null;
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

        // ログインごとに新規セッションを作成
        const newId = crypto.randomUUID();
        const { error: insErr } = await supabase
          .from(TABLE_SESSION)
          .insert({ id: newId, user_id: uid, title: "自己分析チャット" });
        const sid = insErr ? null : newId;
        if (!mounted) return;
        setSessionId(sid);
        // Load sessions after login/session established
        await loadSessions(uid);
        // 既存メッセージのロード
        // (Removed per instructions)
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => { mounted = false; };
  }, [loadSessions]);

  useEffect(() => {
    if (!userId) return;
    try {
      localStorage.removeItem(`aichat:${userId}:messages:v2`);
    } catch {}
  }, [userId]);

  const { messages, isTyping, send } = useAIChatCore({
    userId,
    onSend: async (userText, history) => {
      const { assistantText, sessionId: usedSid } = await sendAndReceiveInline({
        userText,
        history,
        titleHint: messages.length ? messages[0].content.slice(0, 32) : "自己分析チャット",
        sessionId, // reuse selected session if any
      });
      // If we are in a selected session, reflect new messages locally for the sidebar view
      if (sessionId) {
        setHistoryMessages((prev) => [...prev, { role: "user", content: userText }, { role: "assistant", content: assistantText }]);
        // refresh sessions ordering
        if (userId) { loadSessions(userId); }
      } else {
        // if a new session was created internally, adopt it
        if (usedSid) {
          setSessionId(usedSid);
          if (userId) { loadSessions(userId); }
        }
      }
      return assistantText;
    },
  });
  // Compute messages to display (sidebar session vs. default)
  const displayMessages = sessionId ? historyMessages : messages;

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
        sessionId: sessionId ?? undefined,
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
                <Button size="sm" variant="outline" onClick={newSession}>新規</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowSidebar(false)}>非表示</Button>
              </div>
            </div>
            <div className="space-y-1 max-h-[70vh] overflow-auto">
              {sessionsLoading && <div className="text-xs text-gray-500 px-2 py-1">読み込み中...</div>}
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => openSession(s.id)}
                  className={`w-full text-left rounded-lg px-3 py-2 hover:bg-muted ${sessionId === s.id ? "bg-muted" : ""}`}
                >
                  <div className="text-sm font-medium truncate">{s.title || "新しい会話"}</div>
                  <div className="text-[11px] text-muted-foreground">{new Date(s.updated_at).toLocaleString()}</div>
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
              <span className="align-middle">AI自己分析</span>
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
                    "履歴書を要約して",
                    "今週の優先タスク教えて",
                    "志望動機の添削",
                    "ケース面接の練習",
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
        <div className="sr-only">session: {sessionId || "-"}</div>
      </div>{/* end main panel */}
    </div>{/* end grid */}
  </div>
);
}
