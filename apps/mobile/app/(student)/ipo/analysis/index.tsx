import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, Pressable, Switch, Alert, Platform, Modal, Animated, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "src/lib/supabase";

import {
  BookOpen,
  Briefcase,
  TrendingUp,
  SquareStack,
  Target,
  Brain,
  FileText,
  Info,
  PlusCircle,
  Trash2,
  ChevronUp,
  ChevronDown,
  Send,
} from "lucide-react-native";
import { Picker } from "@react-native-picker/picker";

// ====== Config ======
const TABLE_THREAD = "ipo_ai_threads" as const;
const TABLE_MESSAGE = "ipo_ai_messages" as const;

// API ベースURL（例: https://your-web-app.example.com）
// Expoで動かす場合は .env に EXPO_PUBLIC_API_BASE_URL を設定してください
const API_BASE =
  (process.env.EXPO_PUBLIC_API_BASE as string | undefined) ||
  "";

// ====== Types ======
type ChatRole = "user" | "assistant" | "system";
type BasicMsg = { role: ChatRole; content: string };

type ManualPR = {
  prTitle: string;
  about: string;
  prText: string;
  strengths: [string, string, string];
};

type WorkExperience = {
  id: number;
  company: string;
  position: string;
  jobTypes: string[];
  startDate: string; // YYYY-MM
  endDate: string; // YYYY-MM
  isCurrent: boolean;
  description: string;
  technologies: string;
  achievements: string;
  isOpen?: boolean;
};

// ====== Helper ======
async function ensureThread(titleHint?: string): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id ?? null;
  if (!uid) return null;
  const newId = (global as any).crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  await supabase.from(TABLE_THREAD).insert({ id: newId, user_id: uid, title: titleHint || "自己分析チャット" });
  return newId;
}

async function saveMessage(threadId: string, role: ChatRole, content: string, id?: string) {
  try {
    await supabase.from(TABLE_MESSAGE).insert({
      id: id || (global as any).crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      thread_id: threadId,
      role,
      content,
    });
  } catch (e) {
    console.warn("saveMessage skipped:", e);
  }
}

async function callLLM(params: {
  input: string;
  history?: BasicMsg[];
  sessionId?: string;
  mode?: string;
}): Promise<string> {
  const { input, history, sessionId, mode } = params;

  if (!API_BASE) {
    // API未設定の場合
    throw new Error("EXPO_PUBLIC_API_BASE_URL が設定されていません");
  }

  // 1) Fetch Supabase access token before constructing messages
  const { data: sess } = await supabase.auth.getSession();
  const accessToken = sess?.session?.access_token;

  const messages = [...(history ?? []), { role: "user", content: input }];

  // 2) Attach Authorization header if available
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
  // NOTE: cookies are not typically present from the mobile/web dev origin; Bearer を優先
  const res = await fetch(`${API_BASE}/api/aichat`, {
    method: "POST",
    headers,
    body: JSON.stringify({ messages, mode: mode ?? "analytical", threadId: sessionId ?? null }),
  });

  if (!res.ok) throw new Error(`aichat status ${res.status}`);
  // Parse JSON and safely narrow its shape
  const raw = await res.json().catch(() => null) as unknown;
  if (!raw) return "";
  type AichatResponse = {
    content?: string;
    data?: { content?: string };
    answer?: string;
    choices?: Array<{ message?: { content?: string } }>;
  };
  const j = (raw ?? {}) as AichatResponse;
  const content =
    j.content ??
    j.data?.content ??
    j.answer ??
    (Array.isArray(j.choices) && (j.choices?.[0]?.message?.content)) ??
    "";
  return String(content ?? "");
}

const suggestionChips = [
  "自己PRを埋めたい",
  "職務経歴書を要約したい",
  "経験の整理をサポートして",
  "将来のことについて言語化したい",
];


// ====== Screen ======
export default function AnalysisDemoMobile() {
  const router = useRouter();
  const styles = useMemo(() => rnStyles, []);
  const LOG_HEIGHT = Math.round(Dimensions.get("window").height * 0.72);
  const TypingBubble: React.FC = () => {
    const v1 = useRef(new Animated.Value(0)).current;
    const v2 = useRef(new Animated.Value(0)).current;
    const v3 = useRef(new Animated.Value(0)).current;
    const makeLoop = (v: Animated.Value, delayMs: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delayMs),
          Animated.timing(v, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 280, useNativeDriver: true }),
        ])
      );
    useEffect(() => {
      const l1 = makeLoop(v1, 0);
      const l2 = makeLoop(v2, 160);
      const l3 = makeLoop(v3, 320);
      l1.start(); l2.start(); l3.start();
      return () => { l1.stop(); l2.stop(); l3.stop(); };
    }, [v1, v2, v3]);
    const dotStyle = (v: Animated.Value) => ({
      opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
      transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.25] }) }],
    });
    return (
      <View style={styles.typingWrap}>
        <View style={styles.typingWaveRow}>
          <Text style={styles.typingText}>考えています</Text>
          <View style={{ flexDirection: "row", marginLeft: 6 }}>
            <Animated.Text style={[styles.dot, dotStyle(v1)]}>•</Animated.Text>
            <Animated.Text style={[styles.dot, dotStyle(v2)]}>•</Animated.Text>
            <Animated.Text style={[styles.dot, dotStyle(v3)]}>•</Animated.Text>
          </View>
        </View>
      </View>
    );
  };
  const listRef = useRef<ScrollView | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [chatOpened, setChatOpened] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const canSend = input.trim().length > 0 && !isTyping;

  // Threads
  type AiThread = { id: string; title: string | null; created_at: string };
  const [sessions, setSessions] = useState<AiThread[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [historyMessages, setHistoryMessages] = useState<{ role: ChatRole; content: string; created_at?: string }[]>([]);
  const [messages, setMessages] = useState<BasicMsg[]>([]);
  const [showThreadList, setShowThreadList] = useState(false);

  // Active feature tab
  type TabId = "aiChat" | "manual" | "lifeChart" | "experienceReflection" | "futureVision" | "resume";
  const [activeTab, setActiveTab] = useState<TabId>("aiChat");
  const [infoVisible, setInfoVisible] = useState(false);
  const [infoData, setInfoData] = useState<{ id: TabId; title: string; desc: string; Icon: React.ComponentType<any>; color: string } | null>(null);
  const openInfo = useCallback((d: { id: TabId; title: string; desc: string; Icon: React.ComponentType<any>; color: string }) => {
    setInfoData(d);
    setInfoVisible(true);
  }, []);
  const closeInfo = useCallback(() => setInfoVisible(false), []);
  const goInfo = useCallback(() => {
    if (infoData) {
      setActiveTab(infoData.id);
      setInfoVisible(false);
    }
  }, [infoData]);
  const renderInfoModal = () => (
    <Modal visible={infoVisible} transparent animationType="fade" onRequestClose={closeInfo}>
      <Pressable style={styles.modalOverlay} onPress={closeInfo}>
        <Pressable style={styles.modalCard} onPress={() => { /* stop propagation */ }}>
          {infoData ? (
            <>
              <View style={styles.modalIconRow}>
                <View style={[styles.modalIcon, { backgroundColor: infoData.color }]}>
                  <infoData.Icon size={20} color="#fff" />
                </View>
                <Text style={styles.modalTitle}>{infoData.title}</Text>
              </View>
              <Text style={styles.modalDesc}>{infoData.desc}</Text>
              <View style={styles.modalActions}>
                <Pressable onPress={closeInfo} style={styles.outlineSm}><Text style={styles.outlineSmText}>閉じる</Text></Pressable>
                <Pressable onPress={goInfo} style={styles.primarySm}><Text style={styles.primarySmText}>開く</Text></Pressable>
              </View>
            </>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );

  // Manual PR
  const emptyPR: ManualPR = { prTitle: "", about: "", prText: "", strengths: ["", "", ""] };
  const [manual, setManual] = useState<ManualPR>(emptyPR);
  const [savingPR, setSavingPR] = useState(false);
  const [lastSavedManual, setLastSavedManual] = useState<ManualPR>(emptyPR);
  const manualLoadedRef = useRef(false);
  const [profileKey, setProfileKey] = useState<"user_id" | "id">("user_id");
  const [aiFilling, setAiFilling] = useState(false);

  // Resume
  const [workExperiences, setWorkExperiences] = useState<WorkExperience[]>([
    { id: 1, company: "", position: "", jobTypes: [], startDate: "", endDate: "", isCurrent: false, description: "", technologies: "", achievements: "", isOpen: true },
  ]);
  const [resumeSaving, setResumeSaving] = useState(false);
  const patchWorkExperience = useCallback((id: number, patch: Partial<WorkExperience>) => {
    setWorkExperiences((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  // Bottom sheet for selecting job types
  const [jobTypeSheetVisible, setJobTypeSheetVisible] = useState(false);
  const [jobTypeSheetRowId, setJobTypeSheetRowId] = useState<number | null>(null);
  const JOBTYPE_OPTIONS = ["エンジニア","営業","コンサルタント","経営・経営企画","総務・人事","経理・財務","企画","マーケティング","デザイナー","広報","その他"];
  const openJobTypeSheet = useCallback((rowId: number) => {
    setJobTypeSheetRowId(rowId);
    setJobTypeSheetVisible(true);
  }, []);
  const closeJobTypeSheet = useCallback(() => setJobTypeSheetVisible(false), []);
  const applyJobTypeSheet = useCallback((nextSelected: string[]) => {
    if (jobTypeSheetRowId == null) return;
    patchWorkExperience(jobTypeSheetRowId, { jobTypes: nextSelected });
    setJobTypeSheetVisible(false);
  }, [jobTypeSheetRowId, patchWorkExperience]);

  // On mount: session, new thread, load threads
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id ?? null;
      if (!mounted) return;
      setUserId(uid);

      if (uid) {
        // 新規スレッドを作成（WEB版と合わせる）
        const tid = await ensureThread("自己分析チャット");
        setThreadId(tid);

        // スレッド一覧
        await loadThreads(uid);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const loadThreads = useCallback(async (uid: string) => {
    try {
      setSessionsLoading(true);
      const { data } = await supabase
        .from(TABLE_THREAD)
        .select("id, title, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });
      setSessions((data as any[])?.map((r) => ({ id: r.id, title: r.title ?? null, created_at: r.created_at })) ?? []);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const openThread = useCallback(async (tid: string) => {
    setThreadId(tid);
    try {
      const { data, error } = await supabase
        .from(TABLE_MESSAGE)
        .select("role, content, message, text, created_at")
        .eq("thread_id", tid)
        .order("created_at", { ascending: true });
      if (error) console.warn("load messages error:", error.message);
      const rows = Array.isArray(data) ? data : [];
      const hist = rows.map((m: any) => {
        const body = (m?.content ?? m?.message ?? m?.text ?? "");
        return { role: (m?.role as ChatRole) || "assistant", content: String(body ?? ""), created_at: m?.created_at };
      });
      setHistoryMessages(hist);
    } catch (e) {
      console.warn("openThread failed:", e);
      setHistoryMessages([]);
    } finally {
      setChatOpened(true);
    }
  }, []);

  useEffect(() => {
    if (!threadId) return;
    (async () => {
      try {
        const { data } = await supabase
          .from(TABLE_MESSAGE)
          .select("role, content, message, text, created_at")
          .eq("thread_id", threadId)
          .order("created_at", { ascending: true });
        const rows = Array.isArray(data) ? data : [];
        const hist = rows.map((m: any) => {
          const body = (m?.content ?? m?.message ?? m?.text ?? "");
          return { role: (m?.role as ChatRole) || "assistant", content: String(body ?? ""), created_at: m?.created_at };
        });
        setHistoryMessages(hist);
      } catch {}
    })();
  }, [threadId]);

  const newThread = useCallback(async () => {
    const tid = await ensureThread("新しい会話");
    if (tid) {
      setThreadId(tid);
      setHistoryMessages([]);
      if (userId) loadThreads(userId);
    }
  }, [userId, loadThreads]);

  // Chat send (optimistic UI)
  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return "";
    // 1) Optimistically render the user message immediately
    if (threadId) {
      setHistoryMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    } else {
      setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    }
    setChatOpened(true);
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
    setIsTyping(true);
    try {
      const historyArr: BasicMsg[] = threadId
        ? [...historyMessages.map(m => ({ role: m.role as ChatRole, content: m.content })), { role: "user", content: trimmed }]
        : [...messages.map(m => ({ role: m.role as ChatRole, content: m.content })), { role: "user", content: trimmed }];
      if (threadId) await saveMessage(threadId, "user", trimmed);
      const assistantText = await callLLM({
        input: trimmed,
        history: historyArr,
        sessionId: threadId ?? undefined,
        mode: "analytical",
      });
      if (threadId) await saveMessage(threadId, "assistant", assistantText);
      // 2) Append only assistant reply (user message is already shown)
      if (threadId) {
        setHistoryMessages((prev) => [...prev, { role: "assistant", content: assistantText }]);
        if (userId) loadThreads(userId);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: assistantText }]);
      }
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
      return assistantText;
    } catch (e: any) {
      console.error("LLM error:", e?.message || e);
      Alert.alert("エラー", API_BASE ? "うまく処理できませんでした。" : "APIの接続先が未設定です。EXPO_PUBLIC_API_BASE_URL を設定してください。");
      return "";
    } finally {
      setIsTyping(false);
    }
  }, [threadId, historyMessages, messages, userId, loadThreads]);

  const handleSend = useCallback(async () => {
    if (!canSend) return;
    const txt = input.trim();
    setInput("");
    await send(txt);
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
    if (!chatOpened) setChatOpened(true);
  }, [canSend, input, send, chatOpened]);

  // Manual PR: load from student_profiles
  useEffect(() => {
    if (!userId) return;
    let aborted = false;
    (async () => {
      try {
        const baseCols = "user_id,id,pr_title,about,pr_text,strength1,strength2,strength3";
        const { data, error } = await supabase
          .from("student_profiles")
          .select(baseCols)
          .eq("user_id", userId)
          .maybeSingle();
        let row = data as Record<string, any> | null;
        if (error && error.code !== "PGRST116") console.warn("student_profiles load warn:", error.message);
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

        let prTitle = row?.pr_title ?? "";
        let about = row?.about ?? "";
        let prText = row?.pr_text ?? "";

        try {
          const { data: noteRow } = await supabase
            .from("student_profiles")
            .select("analysis_note")
            .eq(profileKey, userId)
            .maybeSingle();
          const rawNote = (noteRow as any)?.analysis_note;
          const note =
            typeof rawNote === "string" ? JSON.parse(rawNote) :
            (rawNote && typeof rawNote === "object" ? rawNote : null);
          if (note) {
            prTitle = String(note.prTitle ?? prTitle ?? "");
            about = String(note.about ?? about ?? "");
            prText = String(note.prText ?? prText ?? "");
          }
        } catch {}

        const strengths: [string, string, string] = [
          String(row?.strength1 ?? ""),
          String(row?.strength2 ?? ""),
          String(row?.strength3 ?? ""),
        ];
        const hasContent =
          (prTitle?.trim()?.length ?? 0) > 0 ||
          (about?.trim()?.length ?? 0) > 0 ||
          (prText?.trim()?.length ?? 0) > 0 ||
          strengths.some((s) => s && String(s).trim().length > 0);

        if (!manualLoadedRef.current && hasContent) {
          const next: ManualPR = { prTitle, about, prText, strengths };
          setManual(next);
          setLastSavedManual(next);
          manualLoadedRef.current = true;
        }
      } catch (e) {
        console.warn("load PR failed:", e);
      }
    })();
    return () => { aborted = true; };
  }, [userId, profileKey]);

  const savePR = useCallback(async (payload: ManualPR) => {
    if (!userId) return;
    setSavingPR(true);
    try {
      const key = profileKey;
      const base = {
        pr_title: payload.prTitle || null,
        about: payload.about || null,
        pr_text: payload.prText || null,
        strength1: payload.strengths?.[0] || null,
        strength2: payload.strengths?.[1] || null,
        strength3: payload.strengths?.[2] || null,
        updated_at: new Date().toISOString(),
      };
      const { data: existing } = await supabase
        .from("student_profiles")
        .select(key)
        .eq(key, userId)
        .maybeSingle();
      if (existing) {
        const { error: updErr } = await supabase.from("student_profiles").update(base).eq(key, userId);
        if (updErr) throw updErr;
      } else {
        const insertObj: Record<string, any> = { ...base, [key]: userId };
        const { error: insErr } = await supabase.from("student_profiles").insert([insertObj]);
        if (insErr) throw insErr;
      }
      setLastSavedManual(payload);
    } catch (e) {
      console.error("save PR error:", e);
      Alert.alert("保存に失敗しました");
    } finally {
      setSavingPR(false);
    }
  }, [userId, profileKey]);

  const handleCancelPR = useCallback(() => {
    setManual(lastSavedManual);
  }, [lastSavedManual]);

  // Resume load/save
  useEffect(() => {
    if (!userId) return;
    let aborted = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("resumes")
          .select("work_experiences")
          .eq("user_id", userId)
          .maybeSingle();
        if (error && error.code !== "PGRST116") console.warn("resumes load warn:", error.message);
        const arr = (data?.work_experiences ?? []) as any[];
        if (!aborted && Array.isArray(arr) && arr.length) {
          const rows: WorkExperience[] = arr.map((r: any, i: number) => ({
            id: typeof r.id === "number" ? r.id : i + 1,
            company: String(r.company ?? ""),
            position: String(r.position ?? ""),
            jobTypes: Array.isArray(r.jobTypes) ? r.jobTypes.map(String) : (Array.isArray(r.job_types) ? r.job_types.map(String) : []),
            startDate: String(r.startDate ?? ""),
            endDate: String(r.endDate ?? ""),
            isCurrent: Boolean(r.isCurrent ?? false),
            description: String(r.description ?? ""),
            technologies: String(r.technologies ?? ""),
            achievements: String(r.achievements ?? ""),
            isOpen: true,
          }));
          setWorkExperiences(rows);
        }
      } catch (e) {
        console.warn("load resume failed:", e);
      }
    })();
    return () => { aborted = true; };
  }, [userId]);

  const addWorkExperience = useCallback(() => {
    setWorkExperiences((prev) => {
      const nextId = prev.length ? Math.max(...prev.map((r) => r.id)) + 1 : 1;
      return [
        ...prev,
        { id: nextId, company: "", position: "", jobTypes: [], startDate: "", endDate: "", isCurrent: false, description: "", technologies: "", achievements: "", isOpen: true },
      ];
    });
  }, []);

  const removeWorkExperience = useCallback((id: number) => {
    setWorkExperiences((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  }, []);


  const toggleRowOpen = useCallback((id: number) => {
    setWorkExperiences((prev) => prev.map((r) => (r.id === id ? { ...r, isOpen: !r.isOpen } : r)));
  }, []);

  const toggleJobType = useCallback((id: number, opt: string) => {
    setWorkExperiences((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const set = new Set(r.jobTypes || []);
        if (set.has(opt)) set.delete(opt);
        else set.add(opt);
        return { ...r, jobTypes: Array.from(set) };
      })
    );
  }, []);

  const saveResume = useCallback(async () => {
    if (!userId) return;
    setResumeSaving(true);
    try {
      const { data: existing } = await supabase
        .from("resumes")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      const payload: any = { user_id: userId, work_experiences: workExperiences, updated_at: new Date().toISOString() };
      if (existing?.id) {
        const { error: updErr } = await supabase.from("resumes").update(payload).eq("id", existing.id);
        if (updErr) throw updErr;
      } else {
        const { error: insErr } = await supabase.from("resumes").insert(payload);
        if (insErr) throw insErr;
      }
      Alert.alert("保存しました");
    } catch (e) {
      console.error("saveResume error:", e);
      Alert.alert("保存に失敗しました");
    } finally {
      setResumeSaving(false);
    }
  }, [userId, workExperiences]);

  // AI autofill resume row
  const aiFillResumeRow = useCallback(async (rowId: number) => {
    const row = workExperiences.find((r) => r.id === rowId);
    if (!row) return;
    try {
      const prompt = [
        "あなたは就活用の職務経歴書アシスタントです。",
        "以下のJSONの未入力フィールド（description, achievements, technologies）を日本語で簡潔に補完してください。",
        '必ず次のキーのみでJSON出力: { "description": string, "achievements": string, "technologies": string }',
        "入力:",
        "```json",
        JSON.stringify(row),
        "```",
      ].join("\n");
      const reply = await callLLM({ input: prompt, history: [], sessionId: threadId ?? undefined, mode: "analytical" });
      const parseJSON = (t: string) => {
        try { return JSON.parse(t); } catch {}
        const m = t.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (m) { try { return JSON.parse(m[1]); } catch {} }
        return null;
      };
      const j = parseJSON(reply);
      if (!j) return Alert.alert("AIの戻り値を解析できませんでした");
      patchWorkExperience(rowId, {
        description: typeof j.description === "string" ? j.description.slice(0, 500) : row.description,
        achievements: typeof j.achievements === "string" ? j.achievements.slice(0, 600) : row.achievements,
        technologies: typeof j.technologies === "string" ? j.technologies.slice(0, 200) : row.technologies,
      });
    } catch (e) {
      console.error("aiFillResumeRow error:", e);
      Alert.alert("AI自動入力に失敗しました");
    }
  }, [workExperiences, patchWorkExperience, threadId]);

  // AI autofill manual
  const aiAutofillManual = useCallback(async () => {
    if (aiFilling) return;
    setAiFilling(true);
    try {
      const ctx = { manual, now: new Date().toISOString() };
      const prompt = [
        "あなたは就活の自己PR作成の専門家です。",
        "次のユーザーデータ(JSON)を参考に、以下の形式で日本語の下書きを返してください。",
        '必ず次のキーのみを含むJSONで出力してください：{ "prTitle": string, "about": string, "prText": string, "strengths": string[] }',
        "制約：aboutは200文字以内、prTextは800文字以内、strengthsは最大3つ。",
        "ユーザーデータ:",
        "```json",
        JSON.stringify(ctx),
        "```",
      ].join("\n");
      const reply = await callLLM({ input: prompt, history: [], sessionId: threadId ?? undefined, mode: "analytical" });
      const safeJsonFromText = (text: string): any | null => {
        if (!text) return null;
        try { return JSON.parse(text); } catch {}
        const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (codeBlock?.[1]) { try { return JSON.parse(codeBlock[1]); } catch {} }
        const braceIdx = text.indexOf("{");
        const lastIdx = text.lastIndexOf("}");
        if (braceIdx !== -1 && lastIdx !== -1 && lastIdx > braceIdx) {
          const blob = text.slice(braceIdx, lastIdx + 1);
          try { return JSON.parse(blob); } catch {}
        }
        return null;
      };
      const json = safeJsonFromText(reply);
      if (!json) {
        Alert.alert("AIの戻り値を解析できませんでした");
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
      Alert.alert("自動入力に失敗しました");
    } finally {
      setAiFilling(false);
    }
  }, [manual, threadId, aiFilling]);

  const renderHeader = () => (
    <View style={styles.headerWrap}>
      <Text style={styles.title}>自己分析プラットフォーム <Text style={styles.aiBadge}>AI</Text></Text>
      {!API_BASE ? (
        <View style={styles.banner}>
          <Info size={16} color="#1f2937" />
          <Text style={styles.bannerText}>API接続先未設定：.env の EXPO_PUBLIC_API_BASE を設定してください</Text>
        </View>
      ) : null}
    </View>
  );

  const renderChips = () => (
    <View style={styles.chipsRow}>
      {suggestionChips.map((t) => (
        <Pressable key={t} onPress={() => setInput(t)} style={styles.chip}>
          <Text style={styles.chipText}>{t}</Text>
        </Pressable>
      ))}
    </View>
  );

  const renderThreadList = () => (
    <View style={styles.threadListWrap}>
      <View style={styles.rowBetween}>
        <Text style={styles.threadListTitle}>過去ログの一覧</Text>
        <Pressable onPress={() => setShowThreadList(false)} style={styles.ghostSm}>
          <Text style={styles.ghostSmText}>閉じる</Text>
        </Pressable>
      </View>
      <ScrollView style={{ maxHeight: 280 }}>
        {sessionsLoading && <Text style={styles.threadListHint}>読み込み中…</Text>}
        {!sessionsLoading && sessions.length === 0 && (
          <Text style={styles.threadListHint}>過去ログはまだありません。</Text>
        )}
        {sessions.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => { openThread(s.id); setShowThreadList(false); }}
            style={styles.threadItem}
          >
            <Text numberOfLines={1} style={styles.threadItemTitle}>{s.title || "新しい会話"}</Text>
            <Text style={styles.threadItemMeta}>{new Date(s.created_at).toLocaleString()}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={{ marginTop: 8 }}>
        <Pressable onPress={async () => { await newThread(); setShowThreadList(false); }} style={styles.outlineSm}>
          <Text style={styles.outlineSmText}>新規スレッドを作成</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderChat = () => {
    const display = threadId ? historyMessages : messages;
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>AIに何でも聞いてください</Text>
        <View style={styles.rowBetween}>
          <View />
          <Pressable onPress={() => setShowThreadList((v) => !v)} style={styles.outlineXs}>
            <Text style={styles.outlineXsText}>過去ログの一覧</Text>
          </Pressable>
        </View>
        {showThreadList ? renderThreadList() : null}
        {chatOpened ? (
          <ScrollView
            ref={listRef}
            style={[styles.msgList, { height: LOG_HEIGHT }]}
            contentContainerStyle={{ padding: 12 }}
          >
            {display.map((m, idx) => {
              const isUser = m.role === "user";
              return (
                <View key={idx} style={isUser ? styles.msgRowUser : styles.msgRowAssistant}>
                  <Text style={[styles.msgMeta, isUser && styles.msgMetaRight]}>
                    {isUser ? "あなた" : "アシスタント"}
                  </Text>
                  <View
                    style={[
                      styles.msgBubble,
                      isUser ? styles.userBubble : styles.assistantBubble,
                      isUser ? styles.msgBubbleRight : styles.msgBubbleLeft,
                    ]}
                  >
                    <Text style={styles.msgText}>{m.content}</Text>
                  </View>
                </View>
              );
            })}
            {isTyping && (
              <View style={styles.msgRowAssistant}>
                <Text style={styles.msgMeta}>アシスタント</Text>
                <View style={[styles.msgBubble, styles.assistantBubble, styles.msgBubbleLeft]}>
                  <TypingBubble />
                </View>
              </View>
            )}
          </ScrollView>
        ) : (
          renderChips()
        )}
        <View style={styles.inputRow}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={"何でも聞いてください（送信ボタンで送信）"}
            multiline
            style={styles.textArea}
            onSubmitEditing={() => {
              if (Platform.OS === "ios") handleSend();
            }}
          />
          <TouchableOpacity onPress={handleSend} disabled={!canSend} style={[styles.sendBtn, !canSend && { opacity: 0.5 }]}>
            <Send size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const JobTypeOption: React.FC<{ label: string; checked: boolean; onToggle: () => void; size?: "md" | "sm" }> = ({ label, checked, onToggle, size = "md" }) => (
    <Pressable
      onPress={onToggle}
      style={[
        styles.tag,
        size === "sm" && { paddingHorizontal: 8, paddingVertical: 4 },
        checked && styles.tagChecked
      ]}
    >
      <Text
        style={[
          styles.tagText,
          size === "sm" && { fontSize: 11 },
          checked && styles.tagTextChecked
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );

  const JobTypeBottomSheet: React.FC = () => {
    if (!jobTypeSheetVisible || jobTypeSheetRowId == null) return null;
    const row = workExperiences.find((r) => r.id === jobTypeSheetRowId);
    const selected = new Set(row?.jobTypes || []);
    const toggleLocal = (opt: string) => {
      if (selected.has(opt)) selected.delete(opt); else selected.add(opt);
      // mutate set, we'll pass array on apply
    };
    return (
      <Modal visible transparent animationType="fade" onRequestClose={closeJobTypeSheet}>
        <Pressable style={styles.sheetOverlay} onPress={closeJobTypeSheet}>
          <Pressable style={styles.sheetCard} onPress={() => { /* stop propagate */ }}>
            <Text style={styles.sheetTitle}>職種を選択</Text>
            <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ paddingVertical: 8 }}>
              <View style={styles.tagsWrap}>
                {JOBTYPE_OPTIONS.map((opt) => {
                  const isOn = selected.has(opt);
                  return (
                    <Pressable
                      key={opt}
                      onPress={() => { toggleLocal(opt); /* trigger re-render by noop setState */ setInput((s) => s); }}
                      style={[styles.sheetPill, isOn && styles.sheetPillActive]}
                    >
                      <Text style={[styles.sheetPillText, isOn && styles.sheetPillTextActive]}>{opt}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
            <View style={styles.sheetActions}>
              <Pressable onPress={closeJobTypeSheet} style={styles.outlineSm}><Text style={styles.outlineSmText}>閉じる</Text></Pressable>
              <Pressable onPress={() => applyJobTypeSheet(Array.from(selected))} style={styles.primarySm}><Text style={styles.primarySmText}>適用</Text></Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

  const renderResume = () => (
    <View>
      <View style={styles.cardHeaderRow}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Briefcase size={18} color="#4338ca" />
          <Text style={styles.cardHeaderTitle}>職務経歴書</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable onPress={saveResume} style={styles.primarySm}>
            <Text style={styles.primarySmText}>{resumeSaving ? "保存中…" : "保存"}</Text>
          </Pressable>
          <Pressable onPress={addWorkExperience} style={styles.outlineSm}>
            <PlusCircle size={16} color="#111827" />
            <Text style={styles.outlineSmText}>職歴を追加</Text>
          </Pressable>
        </View>
      </View>

      {workExperiences.map((r) => (
        <View key={r.id} style={styles.resumeItem}>
          <View style={styles.resumeItemHeader}>
            <Pressable onPress={() => toggleRowOpen(r.id)} style={styles.resumeItemTitleBtn}>
              <View style={styles.iconCircle}>
                {r.isOpen ? <ChevronUp size={16} color="#111827" /> : <ChevronDown size={16} color="#111827" />}
              </View>
              <Text style={styles.resumeItemTitle}>{r.company || `職歴 #${r.id}`}</Text>
            </Pressable>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Pressable onPress={() => aiFillResumeRow(r.id)} style={styles.secondarySm}>
                <Text style={styles.secondarySmText}>AIで自動入力</Text>
              </Pressable>
              {workExperiences.length > 1 && (
                <Pressable onPress={() => removeWorkExperience(r.id)} style={styles.ghostDanger}>
                  <Trash2 size={16} color="#ef4444" />
                </Pressable>
              )}
            </View>
          </View>

          {r.isOpen && (
            <View style={styles.formGrid}>
              <View style={styles.formCol}>
                <Text style={styles.label}>企業・組織名</Text>
                <TextInput value={r.company} onChangeText={(v) => patchWorkExperience(r.id, { company: v })} style={styles.input} />
              </View>

              <View style={styles.formCol}>
                <Text style={styles.label}>職種（複数選択可）</Text>
                <View style={{ gap: 6 }}>
                  <View style={styles.tagsWrap}>
                    {(r.jobTypes || []).slice(0, 4).map((opt) => (
                      <JobTypeOption
                        key={opt}
                        label={opt}
                        checked={true}
                        onToggle={() => toggleJobType(r.id, opt)}
                        size="sm"
                      />
                    ))}
                    {((r.jobTypes || []).length === 0) && (
                      <Text style={{ fontSize: 11, color: "#6b7280" }}>未選択</Text>
                    )}
                  </View>
                  <Pressable onPress={() => openJobTypeSheet(r.id)} style={styles.sheetOpenBtn}>
                    <Text style={styles.sheetOpenBtnText}>さらに選ぶ（一覧を開く）</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.formCol}>
                <Text style={styles.label}>役職・ポジション</Text>
                <View style={styles.pickerWrap}>
                  <Picker
                    selectedValue={r.position}
                    onValueChange={(v) => patchWorkExperience(r.id, { position: v })}
                  >
                    <Picker.Item label="選択してください" value="" />
                    <Picker.Item label="メンバー" value="メンバー" />
                    <Picker.Item label="リーダー" value="リーダー" />
                    <Picker.Item label="マネージャー" value="マネージャー" />
                    <Picker.Item label="責任者" value="責任者" />
                    <Picker.Item label="役員" value="役員" />
                    <Picker.Item label="代表" value="代表" />
                  </Picker>
                </View>
              </View>

              <View style={styles.formCol}>
                <Text style={styles.label}>開始年月 (YYYY-MM)</Text>
                <TextInput
                  value={r.startDate}
                  onChangeText={(v) => patchWorkExperience(r.id, { startDate: v })}
                  placeholder="2023-04"
                  style={styles.input}
                />
              </View>

              <View style={styles.formCol}>
                <Text style={styles.label}>終了年月 (YYYY-MM)</Text>
                <TextInput
                  editable={!r.isCurrent}
                  value={r.endDate}
                  onChangeText={(v) => patchWorkExperience(r.id, { endDate: v })}
                  placeholder="在籍中は空欄"
                  style={[styles.input, !r.isCurrent && null]}
                />
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
                  <Switch value={r.isCurrent} onValueChange={(v) => patchWorkExperience(r.id, { isCurrent: v })} />
                  <Text style={{ marginLeft: 8, color: "#374151", fontSize: 12 }}>現在も在籍中</Text>
                </View>
              </View>

              <View style={[styles.formCol, { width: "100%" }]}>
                <Text style={styles.label}>業務内容（〜500文字）</Text>
                <TextInput
                  value={r.description}
                  onChangeText={(v) => patchWorkExperience(r.id, { description: v.slice(0, 500) })}
                  multiline
                  style={[styles.input, { minHeight: 96 }]}
                />
              </View>

              <View style={[styles.formCol, { width: "100%" }]}>
                <Text style={styles.label}>使用技術・ツール</Text>
                <TextInput
                  value={r.technologies}
                  onChangeText={(v) => patchWorkExperience(r.id, { technologies: v })}
                  style={styles.input}
                />
              </View>

              <View style={[styles.formCol, { width: "100%" }]}>
                <Text style={styles.label}>成果・実績</Text>
                <TextInput
                  value={r.achievements}
                  onChangeText={(v) => patchWorkExperience(r.id, { achievements: v })}
                  multiline
                  style={[styles.input, { minHeight: 72 }]}
                />
              </View>
            </View>
          )}
        </View>
      ))}
    </View>
  );

  const renderManual = () => (
    <View style={styles.whiteCard}>
      <View style={styles.rowBetween}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <FileText size={18} color="#6d28d9" />
          <Text style={styles.cardHeaderTitle}>自己PR</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable onPress={handleCancelPR} style={styles.outlineSm}><Text style={styles.outlineSmText}>キャンセル</Text></Pressable>
          <Pressable onPress={() => savePR(manual)} style={styles.primarySm}><Text style={styles.primarySmText}>{savingPR ? "保存中…" : "保存"}</Text></Pressable>
          <Pressable onPress={aiAutofillManual} style={styles.secondarySm}><Text style={styles.secondarySmText}>{aiFilling ? "AI作成中…" : "AIで自動入力"}</Text></Pressable>
        </View>
      </View>

      <View style={styles.formColFull}>
        <Text style={styles.label}>PR タイトル</Text>
        <TextInput
          value={manual.prTitle}
          onChangeText={(v) => setManual((p) => ({ ...p, prTitle: v }))}
          placeholder="あなたを一言で"
          style={styles.input}
        />
      </View>

      <View style={styles.formColFull}>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>自己紹介（〜200文字）</Text>
          <Text style={styles.counter}>{manual.about.length}/200</Text>
        </View>
        <TextInput
          value={manual.about}
          onChangeText={(v) => setManual((p) => ({ ...p, about: v.slice(0, 200) }))}
          multiline
          style={[styles.input, { minHeight: 80 }]}
          placeholder="200文字以内で自己紹介"
        />
      </View>

      <View style={styles.formColFull}>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>自己PR（〜800文字）</Text>
          <Text style={styles.counter}>{manual.prText.length}/800</Text>
        </View>
        <TextInput
          value={manual.prText}
          onChangeText={(v) => setManual((p) => ({ ...p, prText: v.slice(0, 800) }))}
          multiline
          style={[styles.input, { minHeight: 140 }]}
          placeholder="課題 → 行動 → 成果 の順でエピソードを具体的に"
        />
      </View>

      <View style={styles.formCol}>
        <Text style={styles.label}>強み（最大3つ）</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {manual.strengths.map((v, i) => (
            <TextInput
              key={i}
              value={v}
              onChangeText={(t) => {
                const arr = [...manual.strengths] as [string, string, string];
                arr[i] = t;
                setManual((p) => ({ ...p, strengths: arr }));
              }}
              placeholder={`強み${i + 1}`}
              style={[styles.input, { flex: 1 }]}
            />
          ))}
        </View>
      </View>
    </View>
  );

  const FeatureTabs: { id: TabId; title: string; icon: React.ComponentType<any> }[] = [
    { id: "manual", title: "自己PR", icon: BookOpen },
    { id: "lifeChart", title: "ライフチャート", icon: TrendingUp },
    { id: "experienceReflection", title: "経験の整理", icon: SquareStack },
    { id: "futureVision", title: "将来ビジョン", icon: Target },
    { id: "resume", title: "職務経歴書", icon: Briefcase },
  ];

  const renderFeatureBar = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {FeatureTabs.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <Pressable
              key={t.id}
              onPress={() => {
                // 同じタブをもう一度押すと閉じて aiChat に戻る
                setActiveTab((prev) => (prev === t.id ? "aiChat" : t.id));
              }}
              style={[styles.tabBtn, active && styles.tabBtnActive]}
            >
              <Icon size={16} color={active ? "#fff" : "#111827"} />
              <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>{t.title}</Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );

  const renderActiveFeature = () => {
    switch (activeTab) {
      case "manual":
        return renderManual();
      case "resume":
        return renderResume();
      // NOTE: 「ライフチャート」「将来ビジョン」「経験の整理」はWebの専用コンポーネント依存のため
      // モバイルではまず占位を表示。必要に応じて後続で移植します。
      case "lifeChart":
        return <View style={styles.placeholder}><TrendingUp size={18} color="#111827" /><Text style={styles.placeholderText}>ライフチャート（後日実装予定）</Text></View>;
      case "experienceReflection":
        return <View style={styles.placeholder}><SquareStack size={18} color="#111827" /><Text style={styles.placeholderText}>経験の整理（後日実装予定）</Text></View>;
      case "futureVision":
        return <View style={styles.placeholder}><Target size={18} color="#111827" /><Text style={styles.placeholderText}>将来ビジョン（後日実装予定）</Text></View>;
      default:
        return null;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      {renderHeader()}

      {/* 機能タブ（同じボタンをもう一度押すと閉じる＝aiChatに戻る） */}
      {renderFeatureBar()}

      {/* アクティブ機能 */}
      {activeTab !== "aiChat" ? renderActiveFeature() : null}

      {/* チャット */}
      {renderChat()}

      {/* Info モーダル */}
      {renderInfoModal()}

      {/* Job type bottom sheet */}
      <JobTypeBottomSheet />

      {/* 目的から探す（カード） */}
      <View style={{ marginTop: 16 }}>
        <Text style={styles.sectionTitle}>目的から探す</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            {[
              { title: "自己PR", desc: "まずは自分の強みを整理して自己PRを作ろう", id: "manual", icon: BookOpen, color: "#0ea5e9" },
              { title: "ライフチャート", desc: "自分の人生を振り返り自分をもっとよく知ろう", id: "lifeChart", icon: TrendingUp, color: "#10b981" },
              { title: "将来ビジョン", desc: "将来の仕事や人生観を整理しよう", id: "futureVision", icon: Target, color: "#ec4899" },
              { title: "経験の整理", desc: "学業やバイト、インターン経験を整理しよう", id: "experienceReflection", icon: SquareStack, color: "#6366f1" },
              { title: "職務経歴書", desc: "アルバイト・インターン等の職歴を入力・管理", id: "resume", icon: Briefcase, color: "#4f46e5" }
              // { title: "適職診断", desc: "性格・価値観から適職を診断", id: "aiChat", icon: Brain, color: "#8b5cf6" }, // 一旦コメントアウト
            ].map((c) => {
              const Icon = c.icon;
              return (
                <Pressable
                  key={c.title}
                  onPress={() => openInfo({ id: c.id as TabId, title: c.title, desc: c.desc, Icon, color: c.color })}
                  style={[styles.cardSmall, { borderColor: "#e5e7eb" }]}
                >
                  <View style={[styles.cardIcon, { backgroundColor: c.color }]}>
                    <Icon size={18} color="#fff" />
                  </View>
                  <View style={{ flexShrink: 1 }}>
                    <Text style={styles.cardSmallTitle}>{c.title}</Text>
                    <Text style={styles.cardSmallDesc}>{c.desc}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <Text style={styles.footerNote}>{savingPR ? "保存中…" : ""}</Text>
      <Text style={styles.srOnly}>thread: {threadId || "-"}</Text>
    </ScrollView>
  );
}

// ====== Minimal styles (RN) ======
const rnStyles = {
  container: { flex: 1, backgroundColor: "#fff" } as const,
  headerWrap: { marginBottom: 8 } as const,
  title: { fontSize: 24, fontWeight: "700", color: "#111827" } as const,
  aiBadge: { fontSize: 14, fontWeight: "700", color: "#4f46e5" } as const,
  banner: {
    marginTop: 8, padding: 10, backgroundColor: "#e5e7eb", borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 8,
  } as const,
  bannerText: { color: "#111827", fontSize: 12 } as const,

  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 8 } as const,

  card: { backgroundColor: "#eef2ff", borderColor: "#e0e7ff", borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 10 } as const,
  whiteCard: { backgroundColor: "#fff", borderColor: "#e5e7eb", borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 10 } as const,
  cardTitle: { fontSize: 14, fontWeight: "600", color: "#4338ca", marginBottom: 8 } as const,

  msgList: { backgroundColor: "#fff", borderColor: "#e5e7eb", borderWidth: 1, borderRadius: 12, height: 360 },
  msgMeta: { fontSize: 11, color: "#6b7280", marginBottom: 4 } as const,
  msgBubble: { borderRadius: 10, padding: 10 } as const,
  userBubble: { backgroundColor: "#eef2ff" } as const,
  assistantBubble: { backgroundColor: "#f9fafb" } as const,
  msgText: { fontSize: 13, color: "#111827" } as const,
  msgRowUser: { marginBottom: 12, alignItems: "flex-end" } as const,
  msgRowAssistant: { marginBottom: 12, alignItems: "flex-start" } as const,
  msgMetaRight: { textAlign: "right" } as const,
  msgBubbleRight: { alignSelf: "flex-end", maxWidth: "85%", borderTopRightRadius: 6, borderTopLeftRadius: 12, borderBottomRightRadius: 6 } as const,
  msgBubbleLeft: { alignSelf: "flex-start", maxWidth: "85%", borderTopLeftRadius: 6, borderTopRightRadius: 12, borderBottomLeftRadius: 6 } as const,

  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginVertical: 8 } as const,
  chip: { borderColor: "#c7d2fe", borderWidth: 1, backgroundColor: "#fff", borderRadius: 9999, paddingHorizontal: 10, paddingVertical: 6 } as const,
  chipText: { fontSize: 11, color: "#4338ca" } as const,

  // Typing bubble

  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 } as const,
  textArea: {
    flex: 1, minHeight: 44, maxHeight: 140, borderColor: "#e0e7ff", borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, backgroundColor: "#fff",
  } as const,
  sendBtn: { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: "#4f46e5", borderRadius: 12 } as const,

  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" } as const,
  cardHeaderRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4, marginBottom: 8,
  } as const,
  cardHeaderTitle: { fontSize: 15, fontWeight: "600", color: "#111827" } as const,

  primarySm: { backgroundColor: "#4f46e5", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 } as const,
  primarySmText: { color: "#fff", fontSize: 12, fontWeight: "600" } as const,

  secondarySm: { backgroundColor: "#e5e7eb", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 } as const,
  secondarySmText: { color: "#111827", fontSize: 12, fontWeight: "600" } as const,

  outlineSm: { borderColor: "#e5e7eb", borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 6 } as const,
  outlineSmText: { color: "#111827", fontSize: 12, fontWeight: "600" } as const,

  ghostDanger: { padding: 6, borderRadius: 8 } as const,

  formGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 } as const,
  formCol: { flexGrow: 1, flexBasis: "48%" } as const,
  formColFull: { width: "100%" } as const,
  label: { fontSize: 12, color: "#374151", marginBottom: 6 } as const,
  input: { borderColor: "#e5e7eb", borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, backgroundColor: "#fff" } as const,
  pickerWrap: { borderColor: "#e5e7eb", borderWidth: 1, borderRadius: 10, backgroundColor: "#fff", paddingHorizontal: 6, paddingVertical: 2 } as const,
  counter: { fontSize: 11, color: "#6b7280" } as const,

  tagsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 } as const,
  tag: { borderColor: "#e5e7eb", borderWidth: 1, borderRadius: 9999, paddingHorizontal: 10, paddingVertical: 6 },
  tagChecked: { backgroundColor: "#eef2ff", borderColor: "#c7d2fe" } as const,
  tagText: { fontSize: 12, color: "#374151" } as const,
  tagTextChecked: { color: "#4338ca", fontWeight: "600" } as const,

  resumeItem: { borderColor: "#e5e7eb", borderWidth: 1, borderRadius: 12, padding: 12, backgroundColor: "#fff", marginBottom: 12 } as const,
  resumeItemHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 } as const,
  resumeItemTitleBtn: { flexDirection: "row", alignItems: "center", gap: 8 } as const,
  iconCircle: { width: 28, height: 28, borderRadius: 8, borderColor: "#e5e7eb", borderWidth: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" } as const,
  resumeItemTitle: { fontSize: 14, fontWeight: "600", color: "#111827" } as const,

  cardSmall: { borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: "row", gap: 10, alignItems: "center", width: 260, backgroundColor: "#fff" } as const,
  cardIcon: { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center" } as const,
  cardSmallTitle: { fontSize: 14, fontWeight: "600", color: "#111827", marginBottom: 2 } as const,
  cardSmallDesc: { fontSize: 12, color: "#4b5563" } as const,

  placeholder: { borderColor: "#e5e7eb", borderWidth: 1, borderRadius: 12, padding: 16, backgroundColor: "#fff", flexDirection: "row", gap: 8, alignItems: "center" } as const,
  placeholderText: { color: "#111827", fontSize: 13 } as const,

  footerNote: { marginTop: 8, color: "#6b7280", fontSize: 11 } as const,
  srOnly: { position: "absolute", left: -9999, height: 1, width: 1 } as const,

  tabBtn: { borderColor: "#e5e7eb", borderWidth: 1, borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 6 } as const,
  tabBtnActive: { backgroundColor: "#4f46e5", borderColor: "#4f46e5" } as const,
  tabBtnText: { color: "#111827", fontSize: 12, fontWeight: "600" } as const,
  tabBtnTextActive: { color: "#fff" } as const,
  threadListWrap: { borderColor: "#e5e7eb", borderWidth: 1, borderRadius: 12, backgroundColor: "#fff", padding: 12, marginTop: 8 } as const,
  threadListTitle: { fontSize: 14, fontWeight: "600", color: "#111827" } as const,
  threadListHint: { fontSize: 12, color: "#6b7280", paddingVertical: 8 } as const,
  threadItem: { paddingVertical: 10, borderBottomColor: "#f3f4f6", borderBottomWidth: 1 } as const,
  threadItemTitle: { fontSize: 13, color: "#111827", marginBottom: 2 } as const,
  threadItemMeta: { fontSize: 11, color: "#6b7280" } as const,
  ghostSm: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 } as const,
  ghostSmText: { color: "#111827", fontSize: 12, fontWeight: "600" } as const,
  outlineXs: { borderColor: "#e5e7eb", borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 } as const,
  outlineXsText: { color: "#111827", fontSize: 12, fontWeight: "600" } as const,

  // Typing bubble
  typingWrap: { alignItems: "center", justifyContent: "center" } as const,
  typingText: { marginTop: 6, fontSize: 12, color: "#6b7280" } as const,
  typingWaveRow: { flexDirection: "row", alignItems: "center" } as const,
  dot: { fontSize: 16, color: "#6b7280", marginHorizontal: 2 } as const,

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center", padding: 16 } as const,
  modalCard: { width: "100%", maxWidth: 420, borderRadius: 16, backgroundColor: "#fff", padding: 16, borderColor: "#e5e7eb", borderWidth: 1 } as const,
  modalIconRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 } as const,
  modalIcon: { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center" } as const,
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#111827" } as const,
  modalDesc: { marginTop: 4, fontSize: 13, color: "#4b5563", lineHeight: 20 } as const,
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 16 } as const,
 

  sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" } as const,
  sheetCard: { backgroundColor: "#fff", borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, borderColor: "#e5e7eb", borderWidth: 1 } as const,
  sheetTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 8 } as const,
  sheetPill: { borderColor: "#e5e7eb", borderWidth: 1, backgroundColor: "#fff", borderRadius: 9999, paddingHorizontal: 10, paddingVertical: 6, marginRight: 8, marginBottom: 8 } as const,
  sheetPillActive: { backgroundColor: "#eef2ff", borderColor: "#c7d2fe" } as const,
  sheetPillText: { fontSize: 12, color: "#374151" } as const,
  sheetPillTextActive: { color: "#4338ca", fontWeight: "600" } as const,
  sheetActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 12 } as const,
  sheetOpenBtn: { alignSelf: "flex-start", borderColor: "#e5e7eb", borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 } as const,
  sheetOpenBtnText: { fontSize: 12, color: "#2563eb", fontWeight: "700" } as const,
 };