// app/resume/page.tsx

"use client"; // ─────────── 必ずファイル先頭１行目

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  AlertCircle,
  Bot,
  Briefcase,
  Building,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Code,
  FileText,
  GraduationCap,
  Heart,
  Info,
  Mic,
  Square,
  PlusCircle,
  Save,
  Star,
  Trash2,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import DraftButton, { type AIDraft } from "@/components/ai/DraftButton";


import { exportClientPdf } from "@/lib/pdf/exportClientPdf";
import ResumeTemplate from "@/components/pdf/ResumeTemplate";


import { supabase } from "@/lib/supabase/client";

// ─── Chat (AI Hearing) 追加コンポーネント ───────────────────────────
interface ChatMessage {
  role: "user" | "assistant" | "function";
  content: string | null;
  /** `role: "function"` には必須 */
  name?: string;
}

interface ChatWindowProps {
  workExperiences: WorkExperience[];
  onFunctionCall: (name: string, args: Record<string, any>) => void;
  /** when API returns full workExperiences, refresh parent state */
  onWorkExperiencesUpdate?: (newList: WorkExperience[]) => void;
  userId?: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  workExperiences,
  onFunctionCall,
  onWorkExperiencesUpdate,
  userId,
}) => {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [thinking, setThinking] = React.useState(false);
  const [isRecording, setIsRecording] = React.useState(false);
  // NOTE: 型定義 (@types/web-speech-api) が入っていない環境でもビルドを通すため any で保持
  const recognitionRef = React.useRef<any>(null);

  // Initialise SpeechRecognition once
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recog = new SpeechRecognition();
    recog.lang = "ja-JP";
    recog.continuous = false;
    recog.interimResults = false;

    // NOTE: 型定義が無い環境でもビルドを通すため e を any で受け取る
    recog.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setInput((prev) => (prev ? prev + " " + text : text));
    };

    recog.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recog;
  }, []);

  // 学生が選択しやすい定型プロンプト
  const quickPrompts = [
    "会社名を入力して",
    "職種を入力して",
    "業務内容を入力して",
    "成果・実績を入力して",
  ];

  // OpenAI 仕様: role "function" には必ず name が必要
  const sanitizeMessages = (msgs: ChatMessage[]): ChatMessage[] =>
    msgs.map((m) =>
      m.role === "function" && !m.name
        ? { ...m, name: "updateField" } // 既定の関数名で補完
        : m
    );

  const sendMessage = async (content?: string) => {
    const text = (content ?? input).trim();
    if (!text) return;

    // ① ユーザメッセージをローカルに追加
    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    if (!content) setInput("");

    setThinking(true);

    try {
      // ② OpenAI API (Edge 関数) に POST
      const res = await fetch("/api/ai-hearing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: sanitizeMessages([...messages, userMsg]),
          workExperiences,
          userId,
        }),
      });

      if (!res.ok) {
        console.error("❌ API error status:", res.status);
        return;
      }

      /* ---------- JSON response (non‑streaming) ---------- */
      const data = await res.json();
      const choice = data?.choices?.[0]?.message;
      if (data.workExperiences && onWorkExperiencesUpdate) {
        onWorkExperiencesUpdate(data.workExperiences as WorkExperience[]);
      }

      if (!choice) return;

      /* ---------- function_call のハンドリング ---------- */
      if (choice.function_call) {
        // 1) invoke the requested update on the form
        try {
          const args = JSON.parse(choice.function_call.arguments || "{}");
          onFunctionCall(choice.function_call.name, args);
        } catch (e) {
          console.error("⚠️ function_call parse error", e);
        }

        // 2) build new conversation history
        const assistantFcMsg: ChatMessage = { role: "assistant", content: "" };
        const functionMsg: ChatMessage = {
          role: "function",
          name: choice.function_call.name,
          content: JSON.stringify({ status: "ok" }),
        };
        const newHistory = [...messages, userMsg, assistantFcMsg, functionMsg];

        // 3) update visibsle chat (skip the function role to keep UI clean)
        setMessages(newHistory.filter((m) => m.role !== "function"));

        // 4) ask OpenAI for the next step
        const followRes = await fetch("/api/ai-hearing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: sanitizeMessages(newHistory),
            workExperiences,
            userId,
          }),
        });

        if (followRes.ok) {
          const followData = await followRes.json();
          if (followData.workExperiences && onWorkExperiencesUpdate) {
            onWorkExperiencesUpdate(followData.workExperiences as WorkExperience[]);
          }
          const followChoice = followData?.choices?.[0]?.message;
          if (followChoice?.content) {
            const nextMsg: ChatMessage = {
              role: "assistant",
              content: followChoice.content,
            };
            setMessages((prev) => [...prev, nextMsg]);
          }
        } else {
          console.error("❌ follow‑up API error status:", followRes.status);
        }

        setThinking(false);
        return; // stop early – we already handled the follow‑up cycle
      } else if (choice.content) {
        // 通常メッセージ
        const aiMsg: ChatMessage = { role: "assistant", content: choice.content };
        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch (err) {
      console.error("❌ Chat send error:", err);
    } finally {
      setThinking(false);
    }
  };

  const toggleRecording = () => {
    const recog = recognitionRef.current;
    if (!recog) {
      alert("音声入力はこのブラウザではサポートされていません");
      return;
    }
    if (isRecording) {
      recog.stop();
      setIsRecording(false);
    } else {
      try {
        recog.start();
        setIsRecording(true);
      } catch (e) {
        console.error("SpeechRecognition start error:", e);
      }
    }
  };

  return (
    <div className="flex flex-col h-full border rounded-lg bg-white shadow-sm shadow-indigo-200/50 ring-1 ring-indigo-100">
      {/* Header */}
      <div className="flex items-center gap-2 border-b bg-gradient-to-r from-indigo-50 to-white px-3 py-2">
        <Bot className="h-4 w-4 text-indigo-600" />
        <span className="text-sm font-semibold text-indigo-700">AI 入力アシスタント</span>
        <Badge variant="outline" className="ml-auto text-[10px]">Beta</Badge>
      </div>
      {/* クイック選択ボタン（最初の入力支援） */}
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 p-3">
          {quickPrompts.map((qp) => (
            <Button
              key={qp}
              variant="secondary"
              size="sm"
              className="text-xs"
              onClick={() => sendMessage(qp)}
            >
              {qp}
            </Button>
          ))}
        </div>
      )}
      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 ? (
          <div className="rounded-lg bg-indigo-50 p-3 text-xs text-indigo-700">
            例: 「会社名を入力して」「業務内容を入力して」などと入力すると、AI が質問を投げてくれます。
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`text-sm ${m.role === "user" ? "text-right" : "text-left"}`}
            >
              <span
                className={`inline-block max-w-[80%] rounded px-2 py-1 ${
                  m.role === "user" ? "bg-blue-100" : "bg-gray-100"
                }`}
              >
                {m.content}
              </span>
            </div>
          ))
        )}
        {thinking && (
          <div className="text-xs text-gray-400">（考え中…）</div>
        )}
      </div>

      {/* 入力欄 */}
      <div className="flex items-center gap-2 border-t p-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            // Cmd+Enter (Mac) or Ctrl+Enter (Win) で送信
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="ここに入力..."
          className="flex-1 h-8"
        />
        <Button
          size="icon"
          variant={isRecording ? "destructive" : "secondary"}
          className="h-8 w-8"
          onClick={toggleRecording}
        >
          {isRecording ? (
            <Square className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>
        <Button size="sm" className="h-8" onClick={() => sendMessage()}>
          送信
        </Button>
      </div>
    </div>
  );
};
// ────────────────────────────────────────────────────────────────

// ─── PDF Export Button ─────────────────────────────────────────────
interface ExportButtonProps {
  targetRef: React.RefObject<HTMLDivElement | null>;
  filename: string;
  /** Optional callback that makes sure the preview DOM is mounted (e.g. 開いていない場合は開く) */
  ensureContentVisible?: () => Promise<void>;
}

const ExportButton: React.FC<ExportButtonProps> = ({
  targetRef,
  filename,
  ensureContentVisible,
}) => (
  <Button
    variant="default"
    onClick={async () => {
      // ① プレビューが閉じている場合は開いて DOM が描画されるのを待つ
      if (ensureContentVisible) {
        await ensureContentVisible();
      }

      // ② DOM が存在すれば PDF 出力
      if (targetRef.current) {
        exportClientPdf(targetRef.current, filename);
      } else {
        alert("プレビューがまだレンダリングされていません");
      }
    }}
    className="relative h-8 gap-1 text-xs sm:h-10 sm:gap-2 sm:text-sm"
  >
    <FileText size={14} className="sm:h-4 sm:w-4" />
    PDF出力
  </Button>
);
// ───────────────────────────────────────────────────────────────────



// ─── 型定義 ──────────────────────────────────────────────────────
/**
 * Supabase が期待する JSON 型
 * (supabase-js v2 のユーティリティ型をローカルで定義)
 */
type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

// 職歴アイテムの型
interface WorkExperience {
  id: number;
  isOpen: boolean;
  company: string;
  position: string;
  jobTypes: string[];
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
  technologies: string;
  achievements: string;
}

// ─── WorkExperience field aliases (AI → canonical) ───────────────
const WORK_FIELD_ALIAS_MAP: Record<string, keyof WorkExperience> = {
  // description variants
  description: "description",
  duty: "description",
  jobDescription: "description",
  job_description: "description",
  "業務内容": "description",
  "仕事内容": "description",
  "業務": "description",
  // technologies variants
  technologies: "technologies",
  skills: "technologies",
  スキル: "technologies",
  // achievements variants
  achievements: "achievements",
  "成果・実績": "achievements",
};

// 性別の選択肢
type GenderOption = "male" | "female" | "other";
// 学歴ステータス
type EducationStatus = "enrolled" | "graduated" | "expected";
// 各セクションキー
type SectionKey = "basic" | "education" | "work" | "skills" | "pr" | "conditions";
// 任意のフィールド群
type Fields = Record<string, string | string[] | number | null | undefined>;

// フォーム全体のデータ構造
interface FormData {
  basic: {
    lastName: string;
    firstName: string;
    lastNameKana: string;
    firstNameKana: string;
    birthdate: string;
    gender: GenderOption;
    email: string;
    phone: string;
    address: string;
  };
  education: {
    university: string;
    faculty: string;
    admissionDate: string;
    graduationDate: string;
    status: EducationStatus;
    researchTheme: string;
  };
  skills: {
    certifications: string;
    skills: string;
    languages: string;
    frameworks: string;
    tools: string;
  };
  pr: {
    title: string;
    content: string;
    strengths: string[];
    motivation: string;
  };
  conditions: {
    industries: string[];
    jobTypes: string[];
    locations: string[];
    workStyle: string;
    salary: string;
    workPreferences: string[];
    remarks: string;
  };
}
// ────────────────────────────────────────────────────────────────


export default function ResumePage() {
  // ─── State 定義 ────────────────────────────────────────────────

  const [workExperiences, setWorkExperiences] = useState<WorkExperience[]>([
    {
      id: 1,
      isOpen: true,
      company: "",
      position: "",
      jobTypes: [],
      startDate: "",
      endDate: "",
      isCurrent: false,
      description: "",
      technologies: "",
      achievements: "",
    },
  ]);

  const [userId, setUserId] = useState<string | null>(null);

  /* ------------------------------------------------------------------ *
   *  refreshResume(): Fetch the latest resume & work experiences from
   *  Supabase and update local state — avoids a full page reload.
   * ------------------------------------------------------------------ */
  const refreshResume = useCallback(async () => {
    if (!userId) return;

    try {
      const { data: resumeRow, error } = await supabase
        .from("resumes")
        .select("form_data, work_experiences")
        .eq("user_id", userId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.warn("⚠️ refreshResume error:", error.message);
        return;
      }

      /* --- form_data --- */
      if (resumeRow?.form_data) {
        try {
          const parsed =
            typeof resumeRow.form_data === "string"
              ? (JSON.parse(resumeRow.form_data) as FormData)
              : (resumeRow.form_data as unknown as FormData);
          setFormData(parsed);
        } catch (e) {
          console.warn("⚠️ refreshResume form_data parse error", e);
        }
      }

      /* --- work_experiences --- */
      if (resumeRow?.work_experiences) {
        try {
          const parsed: WorkExperience[] =
            typeof resumeRow.work_experiences === "string"
              ? JSON.parse(resumeRow.work_experiences)
              : (resumeRow.work_experiences as unknown as WorkExperience[]);

          if (Array.isArray(parsed)) {
            const seen = new Set<number>();
            const normalised = parsed.map((w, i) => {
              let id =
                typeof w.id === "number" && !Number.isNaN(w.id) ? w.id : i + 1;
              while (seen.has(id)) id += 1;
              seen.add(id);
              return { ...w, id };
            });
            setWorkExperiences(normalised);
          }
        } catch (e) {
          console.warn("⚠️ refreshResume work_experiences parse error", e);
        }
      }
    } catch (err) {
      console.error("❌ refreshResume unexpected error:", err);
    }
  }, [userId]);

  const [saving, setSaving] = useState<boolean>(false);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<SectionKey>("basic");
  const [completionPercentage, setCompletionPercentage] = useState<number>(0);
  const [sectionCompletion, setSectionCompletion] = useState<Record<SectionKey, number>>({
    basic: 0,
    education: 0,
    work: 0,
    skills: 0,
    pr: 0,
    conditions: 0,
  });
  // プレビューはデフォルトで折りたたみ状態
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);

  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [formData, setFormData] = useState<FormData>({
    basic: {
      lastName: "",
      firstName: "",
      lastNameKana: "",
      firstNameKana: "",
      birthdate: "",
      gender: "male",
      email: "",
      phone: "",
      address: "",
    },
    education: {
      university: "",
      faculty: "",
      admissionDate: "",
      graduationDate: "",
      status: "enrolled",
      researchTheme: "",
    },
    skills: {
      certifications: "",
      skills: "",
      languages: "",
      frameworks: "",
      tools: "",
    },
    pr: {
      title: "",
      content: "",
      strengths: ["", "", ""],
      motivation: "",
    },
    conditions: {
      industries: [],
      jobTypes: [],
      locations: [],
      workStyle: "",
      salary: "",
      workPreferences: [],
      remarks: "",
    },
  });

  // 初期ロード済みフラグ
  const [initialLoaded, setInitialLoaded] = useState(false);

  const pdfFilename = `${formData.basic.lastName}${formData.basic.firstName || ""}_職務経歴書.pdf`;

  // ─── 既存レジュメを取得 ─────────────────────────────────────
  useEffect(() => {
    const loadResume = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const uid = session?.user?.id;
        if (!uid) {
          console.warn("⚠️ No session – skipping resume fetch");
          return;
        }
        setUserId(uid);   // <‑‑ add this

        // --- Supabase fetch for existing resume (replaced logic) ---
        const {
          data: resumeRow,
          error: resumeErr,
        } = await supabase
          .from("resumes")
          .select("id, form_data, work_experiences")
          .eq("user_id", uid)
          .maybeSingle();

        if (resumeRow) {
          /* --- 既存レジュメあり → JSON 文字列かオブジェクトかを判定してパース --- */
          if (resumeRow.form_data) {
            try {
              const parsed =
                typeof resumeRow.form_data === "string"
                  ? (JSON.parse(resumeRow.form_data) as FormData)
                  : (resumeRow.form_data as unknown as FormData);
              setFormData(parsed);
            } catch (e) {
              console.warn("⚠️ form_data JSON parse error – fallback to initial", e);
            }
          }

          /* ---------- work_experiences ---------- */
          if (resumeRow.work_experiences) {
            try {
              const parsed: WorkExperience[] =
                typeof resumeRow.work_experiences === "string"
                  ? JSON.parse(resumeRow.work_experiences)
                  : (resumeRow.work_experiences as unknown as WorkExperience[]);

              if (Array.isArray(parsed) && parsed.length) {
                // 1) 強制的に id を数値化。null/undefined や重複は後で解決
                const withIds = parsed.map((w, i) => ({
                  ...w,
                  id:
                    typeof w.id === "number" && !Number.isNaN(w.id)
                      ? w.id
                      : i + 1,
                }));

                // 2) id 重複を回避（重複があれば +1 ずつインクリメントしてユニークに）
                const seen = new Set<number>();
                const uniqueIds = withIds.map((w) => {
                  let newId = w.id;
                  while (seen.has(newId)) newId += 1;
                  seen.add(newId);
                  return { ...w, id: newId };
                });

                setWorkExperiences(uniqueIds);
              }
            } catch (e) {
              console.warn("⚠️ work_experiences JSON parse error", e);
            }
          }

          console.log("📄 Resume loaded from DB");
        } else if (resumeErr && resumeErr.code !== "PGRST116") {
          // それ以外のエラーのみ警告
          console.warn("⚠️ resume fetch error:", resumeErr.message);
        } else {
          // レジュメがまだ無いユーザーの場合は初期値のまま
          console.log("ℹ️ No existing resume found – initializing blank form");
        }

        /* --- 基本情報を student_profiles から取得 ------------------- */
        try {
          const { data: profile, error: profileErr } = await supabase
            .from("student_profiles")
            .select(
              "last_name, first_name, last_name_kana, first_name_kana, birth_date, gender, phone, address, admission_month, graduation_month, university, faculty, research_theme"
            )
            .eq("user_id", uid)
            .single();

          if (!profileErr && profile) {
            setFormData((prev) => ({
              ...prev,
              basic: {
                ...prev.basic,
                lastName: profile.last_name ?? prev.basic.lastName,
                firstName: profile.first_name ?? prev.basic.firstName,
                lastNameKana: profile.last_name_kana ?? prev.basic.lastNameKana,
                firstNameKana: profile.first_name_kana ?? prev.basic.firstNameKana,
                birthdate: profile.birth_date ?? prev.basic.birthdate,
                gender: (profile.gender as any) ?? prev.basic.gender,
                email: session?.user?.email ?? prev.basic.email,
                phone: profile.phone ?? prev.basic.phone,
                address: profile.address ?? prev.basic.address,
              },
              education: {
                ...prev.education,
                university: profile.university ?? prev.education.university,
                faculty: profile.faculty ?? prev.education.faculty,
                admissionDate: profile.admission_month ?? prev.education.admissionDate,
                graduationDate: profile.graduation_month ?? prev.education.graduationDate,
                researchTheme: profile.research_theme ?? prev.education.researchTheme,
              },
            }));
          } else if (profileErr && profileErr.code !== "PGRST116") {
            console.warn("⚠️ student_profiles fetch error:", profileErr.message);
          }
        } catch (err) {
          console.error("❌ student_profiles fetch error:", err);
        }
        /* ------------------------------------------------------------- */
      } catch (err) {
        console.error("❌ loadResume error:", err);
      } finally {
        /* ← 必ず初期ロード完了にする */
        setInitialLoaded(true);
      }
    };

    loadResume();
  }, []);

  /* ------------------------------------------------------------------ *
   *  listen for "resume-updated" custom event (fired by AI chat window)
   *  → force a quick page refresh so the latest DB data appears instantly
   * ------------------------------------------------------------------ */
  useEffect(() => {
    const handleResumeUpdated = () => {
      // Supabase のレプリケーション完了を待ってからソフトリフレッシュ
      setTimeout(() => {
        refreshResume();
      }, 100);
    };
    window.addEventListener("resume-updated", handleResumeUpdated);
    return () => window.removeEventListener("resume-updated", handleResumeUpdated);
  }, [refreshResume]);


  // ─── 完了率を計算 ────────────────────────────────────────────────

  useEffect(() => {
    const calculateSectionCompletion = (section: SectionKey, fields: Fields): number => {
      if (!fields || typeof fields !== "object") return 0;
      const totalFields = Object.keys(fields).length;
      const filledFields = Object.values(fields).filter((value) => {
        if (value === "" || value == null) return false;
        return Array.isArray(value)
          ? value.some((v) => v != null && v !== "")
          : true;
      }).length;
      return Math.round((filledFields / totalFields) * 100);
    };

    const basic = calculateSectionCompletion("basic", formData.basic ?? {});
    const education = calculateSectionCompletion("education", formData.education ?? {});
    // ───── 職歴セクション完了度 (0–100) ─────────
    // 「使用技術」を除外し、下記 6 要素を均等配点とする：
    // 1. 企業名
    // 2. 役職
    // 3. 開始年月
    // 4. 終了年月 *or* 「現在も在籍中」のどちらか
    // 5. 業務内容
    // 6. 成果・実績
    let work = 0;
    if (workExperiences.length > 0) {
      const requiredPerRow = 6; // 必須フィールド数
      const totalRequired = workExperiences.length * requiredPerRow;

      const filled = workExperiences.reduce((cnt, w) => {
        if (w.company.trim() !== "") cnt++;                 // 1. company
        if (w.position.trim() !== "") cnt++;                // 2. position
        if (w.startDate.trim() !== "") cnt++;               // 3. startDate

        // 4. endDate OR isCurrent が true
        const hasEndInfo =
          w.isCurrent || w.endDate.trim() !== "";
        if (hasEndInfo) cnt++;

        if (w.description.trim() !== "") cnt++;             // 5. description
        if (w.achievements.trim() !== "") cnt++;            // 6. achievements
        return cnt;
      }, 0);

      work = Math.round((filled / totalRequired) * 100);
    }
    const skills = calculateSectionCompletion("skills", formData.skills ?? {});
    const pr = calculateSectionCompletion("pr", formData.pr ?? {});
    const conditions = calculateSectionCompletion("conditions", formData.conditions ?? {});

    const newSectionCompletion: Record<SectionKey, number> = {
      basic,
      education,
      work,
      skills,
      pr,
      conditions,
    };
    setSectionCompletion(newSectionCompletion);

    // プロフィール完成度バーは「職歴」セクションだけを反映
    const overall = work;
    setCompletionPercentage(overall);
  }, [formData, workExperiences]);

  // ─── Auto‑save whenever form data or work experiences change ─────────────────
  useEffect(() => {
    // Clear any existing timer so we only save once after the latest change
    if (saveTimeout.current) clearTimeout(saveTimeout.current);

    // Debounce: wait 1 second after the user stops typing/changing before saving
    saveTimeout.current = setTimeout(() => {
      handleSave();
    }, 1000);

    // Clean‑up on unmount
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [formData, workExperiences]);
  // ────────────────────────────────────────────────────────────────────────────


  // ─── ハンドラ関数 ────────────────────────────────────────────────

  // 職歴を追加
  const addWorkExperience = (): void => {
    const newId =
      workExperiences.reduce(
        (max, w) =>
          typeof w.id === "number" && !Number.isNaN(w.id) && w.id > max
            ? w.id
            : max,
        0
      ) + 1;

    setWorkExperiences((prev) => [
      ...prev,
      {
        id: newId,
        isOpen: true,
        company: "",
        position: "",
        jobTypes: [],
        startDate: "",
        endDate: "",
        isCurrent: false,
        description: "",
        technologies: "",
        achievements: "",
      },
    ]);
  };

  // 職歴を削除
  const removeWorkExperience = (id: number): void => {
    setWorkExperiences(prev =>
      prev.filter(exp => exp.id !== id)
    );
  };

  // 折りたたみの開閉
  const toggleCollapsible = (id: number): void => {
    setWorkExperiences(
      workExperiences.map((exp) =>
        exp.id === id ? { ...exp, isOpen: !exp.isOpen } : exp
      )
    );
  };

  // 職歴フィールドを更新
  const handleWorkExperienceChange = (
    id: number,
    field: keyof WorkExperience,
    value: string | boolean | string[]
  ): void => {
    setWorkExperiences(
      workExperiences.map((exp) =>
        exp.id === id ? { ...exp, [field]: value } : exp
      )
    );
  };

  // Toggle 職種 selections
  const handleJobTypeToggle = (
    id: number,
    value: string,
    checked: boolean
  ): void => {
    setWorkExperiences((prev) =>
      prev.map((exp) =>
        exp.id === id
          ? {
              ...exp,
              jobTypes: checked
                ? [...new Set([...(exp.jobTypes || []), value])]
                : (exp.jobTypes || []).filter((v) => v !== value),
            }
          : exp
      )
    );
  };

  // 任意のフォームセクションを更新
  const handleInputChange = <K extends keyof FormData, F extends keyof FormData[K]>(
    section: K,
    field: F,
    value: FormData[K][F]
  ): void => {
    setFormData({
      ...formData,
      [section]: {
        ...formData[section],
        [field]: value,
      },
    });
  };

  // 自己PRの強み配列更新
  const handleStrengthChange = (index: number, value: string): void => {
    const newStrengths = [...formData.pr.strengths];
    newStrengths[index] = value;
    handleInputChange("pr", "strengths", newStrengths);
  };

  // AI からの updateField 関数呼び出しを解釈してフォームを更新
  const handleAIUpdateField = (name: string, args: any) => {
    if (name !== "updateField" || !args) return;

    try {
      /* OpenAI 側のスキーマ想定
         {
           section: "basic" | "education" | "skills" | "pr" | "conditions" | "work",
           field: string,               // 更新するフィールド名
           value: any,                  // その値
           // --- work セクションのみ追加 ---
           id?: number,                 // WorkExperience.id (優先)
           index?: number               // or 配列 index (fallback)
         }
      */
      const { section, field, value, id, index } = args as {
        section: SectionKey | "work" | "workExperiences" | "work_experiences";
        field: string;
        value: any;
        id?: number;
        index?: number;
      };
      // resolve the field name (for debug log later)
      let targetFieldDebug: string | undefined = undefined;
      // --- accept multiple aliases for the work experience section ---
      const normalizedSection: SectionKey | "work" =
        section === "work" ||
        section === "workExperiences" ||
        section === "work_experiences"
          ? "work"
          : (section as SectionKey);
      console.debug("🔧 AI updateField args:", args);

      if (normalizedSection === "work") {
        /* --------- 職歴セクションの更新 --------- */
        // 1) decide which row to target (by id > index > 末尾)
        let targetIdx: number;
        if (typeof id === "number") {
          targetIdx = workExperiences.findIndex((w) => w.id === id);
        } else if (typeof index === "number") {
          targetIdx = index;
        } else {
          targetIdx = 0; // fallback to first row
        }

        // 2) if the requested row doesn't exist yet, append rows until it does
        while (targetIdx >= workExperiences.length) {
          addWorkExperience();             // ← 2社目・3社目を自動追加
        }

        if (targetIdx < 0) {
          // id 指定だが見つからない場合は末尾を新規作成
          addWorkExperience();
          targetIdx = workExperiences.length - 1;
        }

        const targetField =
          WORK_FIELD_ALIAS_MAP[field] ?? (field as keyof WorkExperience);
        targetFieldDebug = String(targetField);

        // 4) finally update the requested field
        handleWorkExperienceChange(
          workExperiences[targetIdx].id,
          targetField,
          value
        );
      } else { /* --------- 通常セクションの更新 --------- */
        handleInputChange(normalizedSection as any, field as any, value);
        targetFieldDebug = String(field);
      }
      console.debug("✅ Updated field via AI:", { normalizedSection, targetField: targetFieldDebug, value });
    } catch (err) {
      console.error("❌ handleAIUpdateField parse error:", err);
    }
  };

  // 保存／自動保存
  const handleSave = async (): Promise<void> => {
    console.log("🟡 Auto‑save fired");
    setSaving(true);

    /* 1) Auth セッション取得 */
    const {
      data: { session },
      error: sessionErr,
    } = await supabase.auth.getSession();

    if (sessionErr || !session?.user?.id) {
      console.warn("⚠️ セッション無しで自動保存スキップ");
      setSaving(false);
      return;
    }
    const uid = session.user.id;

    /* 2) 既存行があるかチェック */
    const { data: existing, error: selectErr } = await supabase
      .from("resumes")
      .select("id")
      .eq("user_id", uid)
      .single();

    if (selectErr && selectErr.code !== "PGRST116") {
      // PGRST116 = Row not found
      console.error("❌ resumes select error:", selectErr);
      setSaving(false);
      return;
    }

    /* 3) insert か update か分岐 */
    let saveErr = null;
    if (existing?.id) {
      /* update */
      const { error } = await supabase
        .from("resumes")
        .update({
          form_data: formData as unknown as Json,
          work_experiences: workExperiences as unknown as Json,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      saveErr = error;
    } else {
      /* insert */
      const { error } = await supabase.from("resumes").insert({
        user_id: uid,
        form_data: formData as unknown as Json,
        work_experiences: workExperiences as unknown as Json,
        updated_at: new Date().toISOString(),
      });
      saveErr = error;
    }

    if (saveErr) {
      console.error("❌ Auto‑save error:", saveErr);
      alert("自動保存に失敗しました: " + saveErr.message);
      setSaving(false);
      return;
    }

    console.log("✅ Auto‑save succeeded");
    setSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  /** 完了率に応じて色を変える
   *   0‑49   → 赤
   *  50‑79   → 黄
   *  80‑94   → 緑 (やや薄め)
   *  95‑100  → 緑 (濃い)
   */
  const getCompletionColor = (percentage: number): string => {
    if (percentage < 50) return "bg-red-400";
    if (percentage < 80) return "bg-yellow-300";
    if (percentage < 95) return "bg-green-400";
    return "bg-green-600";
  };

  // セクションステータスアイコン
  const getSectionStatusIcon = (percentage: number) => {
    if (percentage === 100) return <Check size={16} className="text-green-500" />;
    if (percentage > 0) return <Clock size={16} className="text-yellow-500" />;
    return <AlertCircle size={16} className="text-red-500" />;
  };

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      {/* Header with progress tracker */}
      <div className="mb-6 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 p-4 shadow-sm sm:mb-8 sm:p-6">
        <div className="mb-4 flex flex-col items-start justify-between gap-2 sm:mb-6 sm:flex-row sm:items-center sm:gap-4">
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">職務経歴書</h1>
            <p className="text-xs text-gray-500 sm:text-sm">あなたのキャリアや学歴情報を入力してください</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="relative h-8 gap-1 text-xs sm:h-10 sm:gap-2 sm:text-sm hidden"
            >
              {saving ? (
                <>
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent sm:h-4 sm:w-4"></div>
                  保存中...
                </>
              ) : (
                <>
                  <Save size={14} className="sm:h-4 sm:w-4" />
                  保存する
                </>
              )}

              {saveSuccess && (
                <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[10px] text-white">
                  <Check size={10} />
                </span>
              )}
            </Button>
          <ExportButton targetRef={previewRef} filename={pdfFilename} />
          </div>
        </div>

        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium sm:text-base">プロフィール完成度</h3>
          <span className="text-sm font-semibold">{completionPercentage}%</span>
        </div>

        <div className="h-2 w-full rounded bg-gray-200 overflow-hidden">
          <div
            className={`h-full transition-all ${getCompletionColor(completionPercentage)}`}
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>
      {/* AI 入力アシスタント – 横幅を固定 (max‑w) */}
      <div className="mb-6 sm:mb-8 max-w-3xl mx-auto w-full">
        <ChatWindow
          workExperiences={workExperiences}
          onFunctionCall={handleAIUpdateField}
          onWorkExperiencesUpdate={setWorkExperiences}
          userId={userId ?? undefined}
        />
      </div>

      {/* 職歴セクション - 最も目立つように最上部に配置 */}
      <Card className="mb-6 border-2 border-primary/20 bg-primary/5 sm:mb-8">
        <CardHeader className="bg-primary/10 p-3 sm:p-6">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            <CardTitle className="text-base text-primary sm:text-xl">職歴</CardTitle>
          </div>
          <CardDescription className="text-xs sm:text-sm">
            アルバイトやインターンシップの経験を入力してください
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-3 sm:space-y-6 sm:p-6">
          {workExperiences.length === 0 ? (
            <Alert className="bg-amber-50">
              <Info className="h-4 w-4 text-amber-500" />
              <AlertTitle className="text-sm font-medium text-amber-800">職歴情報がありません</AlertTitle>
              <AlertDescription className="text-xs text-amber-700">
                アルバイトやインターンシップなど、これまでの経験を追加しましょう。
              </AlertDescription>
            </Alert>
          ) : (
             workExperiences.map((exp, idx) => (
              <Collapsible
                key={`work-${exp.id}`}
                open={exp.isOpen}
                onOpenChange={() => toggleCollapsible(exp.id)}
              >
                <div className="rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-gray-500" />
                      <h3 className="text-sm font-medium sm:text-base">
                        {exp.company ? exp.company : `職歴 #${exp.id}`}
                        {exp.position && (
                          <span className="ml-2 text-xs text-gray-500">（{exp.position}）</span>
                        )}
                      </h3>
                    </div>

                    {/* --- AI Draft Button (work experience) --- */}
                    <div className="flex items-center gap-1 sm:gap-2">
                      <DraftButton
                        prompt={exp}
                        onInsert={(d: AIDraft) => {
                          // description に AI が生成した body を挿入
                          handleWorkExperienceChange(exp.id, "description", d.body);
                          // achievements に length 情報などを入れたい場合はここで追記可
                        }}
                      />

                      {/* existing toggle / delete buttons */}
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 sm:h-8 sm:w-8">
                          {exp.isOpen ? (
                            <ChevronUp size={14} className="sm:h-4 sm:w-4" />
                          ) : (
                            <ChevronDown size={14} className="sm:h-4 sm:w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      {workExperiences.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-600 sm:h-8 sm:w-8"
                          onClick={(e) => {
                            e.stopPropagation();      // prevent header toggle
                            removeWorkExperience(exp.id);
                          }}
                        >
                          <Trash2 size={14} className="sm:h-4 sm:w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <CollapsibleContent className="mt-3 space-y-3 sm:mt-4 sm:space-y-4">
                    <div className="space-y-1 sm:space-y-2">
                      <Label htmlFor={`company-${exp.id}`} className="text-xs sm:text-sm">
                        企業・組織名
                      </Label>
                      <Input
                        id={`company-${exp.id}`}
                        placeholder="〇〇株式会社"
                        className="h-8 text-xs sm:h-10 sm:text-sm"
                        value={exp.company}
                        onChange={(e) => handleWorkExperienceChange(exp.id, "company", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1 sm:space-y-2">
                      <div className="space-y-1 sm:space-y-2">
                        <Label className="text-xs sm:text-sm">職種（複数選択可）</Label>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-2">
                          {[
                            "エンジニア",
                            "営業",
                            "コンサルタント",
                            "研究・開発",
                            "総務・人事",
                            "経理・財務",
                            "品質管理",
                            "物流",
                            "企画・マーケティング",
                            "デザイナー",
                            "生産管理",
                            "販売・サービス",
                          ].map((opt) => (
                            <div key={`${exp.id}-${opt}`} className="flex items-center space-x-2">
                              <Checkbox
                                id={`jobType-${exp.id}-${opt}`}
                                className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                                checked={(exp.jobTypes || []).includes(opt)}
                                onCheckedChange={(checked) =>
                                  handleJobTypeToggle(exp.id, opt, checked as boolean)
                                }
                              />
                              <Label
                                htmlFor={`jobType-${exp.id}-${opt}`}
                                className="text-[10px] sm:text-xs"
                              >
                                {opt}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1 sm:space-y-2">
                      <Label htmlFor={`position-${exp.id}`} className="text-xs sm:text-sm">
                        役職・ポジション
                      </Label>
                      <Input
                        id={`position-${exp.id}`}
                        placeholder="インターン、アルバイトなど"
                        className="h-8 text-xs sm:h-10 sm:text-sm"
                        value={exp.position}
                        onChange={(e) => handleWorkExperienceChange(exp.id, "position", e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-1 sm:space-y-2">
                        <Label htmlFor={`startDate-${exp.id}`} className="text-xs sm:text-sm">
                          開始年月
                        </Label>
                        <Input
                          id={`startDate-${exp.id}`}
                          type="month"
                          className="h-8 text-xs sm:h-10 sm:text-sm"
                        value={exp.startDate}
                        onChange={(e) => handleWorkExperienceChange(exp.id, "startDate", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1 sm:space-y-2">
                        <Label htmlFor={`endDate-${exp.id}`} className="text-xs sm:text-sm">
                          終了年月
                        </Label>
                        <Input
                          id={`endDate-${exp.id}`}
                          type="month"
                          className="h-8 text-xs sm:h-10 sm:text-sm"
                        value={exp.endDate}
                        onChange={(e) => handleWorkExperienceChange(exp.id, "endDate", e.target.value)}
                        disabled={exp.isCurrent}
                        />
                      </div>
                    </div>
                    <div className="space-y-1 sm:space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`current-${exp.id}`}
                          className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                          checked={exp.isCurrent}
                          onCheckedChange={(checked) => handleWorkExperienceChange(exp.id, "isCurrent", checked)}
                        />
                        <Label htmlFor={`current-${exp.id}`} className="text-xs sm:text-sm">
                          現在も在籍中
                        </Label>
                      </div>
                    </div>
                    <div className="space-y-1 sm:space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`jobDescription-${exp.id}`} className="text-xs sm:text-sm">
                          業務内容
                        </Label>
                        <span className="text-xs text-gray-500">{exp.description.length}/500文字</span>
                      </div>
                      <Textarea
                        id={`jobDescription-${exp.id}`}
                        placeholder="担当した業務内容や成果について記入してください"
                        className="min-h-[100px] text-xs sm:min-h-[120px] sm:text-sm"
                        value={exp.description}
                        onChange={(e) => handleWorkExperienceChange(exp.id, "description", e.target.value)}
                        maxLength={500}
                      />
                      <p className="text-xs italic text-gray-500">
                        例:
                        「Webアプリケーションの開発チームに参加し、フロントエンド実装を担当。React.jsを用いたUI開発を行い、チームの納期目標を達成した。」
                      </p>
                    </div>
                    <div className="space-y-1 sm:space-y-2">
                      <Label htmlFor={`technologies-${exp.id}`} className="text-xs sm:text-sm">
                        スキル
                      </Label>
                      <Input
                        id={`technologies-${exp.id}`}
                        placeholder="Word, Chat Gpt,Java, Python, AWS, Figmaなど"
                        className="h-8 text-xs sm:h-10 sm:text-sm"
                        value={exp.technologies}
                        onChange={(e) => handleWorkExperienceChange(exp.id, "technologies", e.target.value)}
                      />
                      {exp.technologies &&
                        exp.technologies.split(",").some((tech) => tech.trim() !== "") && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {exp.technologies.split(",").map((tech, idx) => {
                              const trimmed = tech.trim();
                              if (!trimmed) return null;
                              return (
                                <Badge
                                  key={`${exp.id}-tech-${idx}`}
                                  variant="secondary"
                                  className="text-[10px] sm:text-xs"
                                >
                                  {trimmed}
                                </Badge>
                              );
                            })}
                          </div>
                        )}
                    </div>
                    <div className="space-y-1 sm:space-y-2">
                      <Label htmlFor={`achievements-${exp.id}`} className="text-xs sm:text-sm">
                        成果・実績
                      </Label>
                      <Textarea
                        id={`achievements-${exp.id}`}
                        placeholder="具体的な成果や数値、評価されたポイントなどを記入してください"
                        className="min-h-[80px] text-xs sm:min-h-[100px] sm:text-sm"
                        value={exp.achievements}
                        onChange={(e) => handleWorkExperienceChange(exp.id, "achievements", e.target.value)}
                      />
                      <p className="text-xs italic text-gray-500">
                        例: 「顧客満足度調査で平均4.8/5.0の評価を獲得。前年比20%の売上向上に貢献した。」
                      </p>
                    </div>
                  
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))
          )}
          <Button
            variant="outline"
            className="w-full gap-1 border-dashed text-xs sm:gap-2 sm:text-sm"
            onClick={addWorkExperience}
          >
            <PlusCircle size={14} className="sm:h-4 sm:w-4" />
            職歴を追加
          </Button>
        </CardContent>
      </Card>
      {/* ─── プレビュー（折りたたみ & PDF出力） ─────────────────── */}
      <Card className="mb-6">
        <Collapsible open={previewOpen} onOpenChange={setPreviewOpen}>
          <CardHeader className="flex flex-row items-center justify-between bg-gray-50 p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="text-base sm:text-lg">職務経歴書プレビュー</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  {previewOpen ? (
                    <ChevronUp size={14} className="sm:h-4 sm:w-4" />
                  ) : (
                    <ChevronDown size={14} className="sm:h-4 sm:w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <ExportButton
                targetRef={previewRef}
                filename={pdfFilename}
                ensureContentVisible={async () => {
                  if (!previewOpen) {
                    // 折りたたまれている場合は開く → state 更新後に DOM が描画されるまで待つ
                    setPreviewOpen(true);
                    await new Promise((r) => setTimeout(r, 300)); // 300ms 待機
                  }
                }}
              />
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="p-3 sm:p-4">
              <div
                ref={previewRef}
                id="resume-preview"
                className="border shadow-sm overflow-auto max-h-[80vh]"
              >
                <ResumeTemplate
                  basic={{ ...formData.basic }}
                  contact={{
                    email: formData.basic.email,
                    phone: formData.basic.phone,
                    address: formData.basic.address,
                  }}
                  workExperiences={workExperiences}
                  educations={
                    formData.education.university
                      ? [
                          `${
                            formData.education.graduationDate ||
                            formData.education.admissionDate ||
                            ""
                          } ${formData.education.university} ${
                            formData.education.faculty
                          }`.trim(),
                        ].filter(Boolean)
                      : []
                  }
                  skills={
                    formData.skills.skills
                      ? formData.skills.skills
                          .split(/[\\s,]+/)
                          .map((s) => s.trim())
                          .filter(Boolean)
                      : []
                  }
                  certifications={
                    formData.skills.certifications
                      ? formData.skills.certifications
                          .split(/[\\s,]+/)
                          .map((s) => s.trim())
                          .filter(Boolean)
                      : []
                  }
                  languages={
                    formData.skills.languages
                      ? formData.skills.languages
                          .split(/[\\s,]+/)
                          .map((s) => s.trim())
                          .filter(Boolean)
                      : []
                  }
                  frameworks={
                    formData.skills.frameworks
                      ? formData.skills.frameworks
                          .split(/[\\s,]+/)
                          .map((s) => s.trim())
                          .filter(Boolean)
                      : []
                  }
                  tools={
                    formData.skills.tools
                      ? formData.skills.tools
                          .split(/[\\s,]+/)
                          .map((s) => s.trim())
                          .filter(Boolean)
                      : []
                  }
                  pr={{
                    title: formData.pr.title,
                    content: formData.pr.content,
                    strengths: (formData.pr.strengths || []).filter(
                      (v) => v.trim() !== ""
                    ),
                    motivation: formData.pr.motivation,
                  }}
                />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="h-16"></div>
    </div>
    )
}