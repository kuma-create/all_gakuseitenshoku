// app/resume/page.tsx

"use client"; // ─────────── 必ずファイル先頭１行目

import React, { useState, useEffect, useRef } from "react";
import {
  PlusCircle,
  Trash2,
  ChevronDown,
  ChevronUp,
  Save,
  User,
  FileText,
  Briefcase,
  Check,
  AlertCircle,
  Info,
  Clock,
  Building,
  GraduationCap,
  Code,
  Star,
  Heart,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

// Create a single Supabase client instance for the component to avoid multiple GoTrue instances
const supabase = createClientComponentClient();



// ─── 型定義 ──────────────────────────────────────────────────────

// 職歴アイテムの型
interface WorkExperience {
  id: number;
  isOpen: boolean;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
  technologies: string;
  achievements: string;
}

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
      startDate: "",
      endDate: "",
      isCurrent: false,
      description: "",
      technologies: "",
      achievements: "",
    },
  ]);

  const [saving, setSaving] = useState<boolean>(false);
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

  // ─── 既存レジュメを取得 ─────────────────────────────────────
  useEffect(() => {
    const loadResume = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) return;

      const { data, error } = await supabase
        .from("resumes")
        .select("form_data, work_experiences")
        .eq("user_id", uid)
        .single();

      if (!error && data) {
        if (data.form_data) {
          setFormData(data.form_data as FormData);
        }
        if (data.work_experiences && Array.isArray(data.work_experiences)) {
          setWorkExperiences(data.work_experiences as WorkExperience[]);
        }
        console.log("📄 Resume loaded from DB");
      } else {
        console.log("ℹ️ No existing resume found (or error):", error?.message);
      }
      setInitialLoaded(true);
    };

    loadResume();
  }, []);


  // ─── 完了率を計算 ────────────────────────────────────────────────

  useEffect(() => {
    const calculateSectionCompletion = (section: SectionKey, fields: Fields): number => {
      const totalFields = Object.keys(fields).length;
      const filledFields = Object.values(fields).filter((value) => {
        if (value === "" || value == null) return false;
        return Array.isArray(value)
          ? value.some((v) => v != null && v !== "")
          : true;
      }).length;
      return Math.round((filledFields / totalFields) * 100);
    };

    const basic = calculateSectionCompletion("basic", formData.basic);
    const education = calculateSectionCompletion("education", formData.education);
    // 職歴: 1 行でも会社名・役職・成果が埋まっていれば 100 %
    const isWorkComplete = (w: WorkExperience) =>
      w.company.trim() !== "" &&
      w.position.trim() !== "" &&
      w.achievements.trim() !== "";

    const work = workExperiences.some(isWorkComplete)
      ? 100                     // 完了
      : workExperiences.length > 0
        ? 50                    // 行はあるが未完了
        : 0;                    // 行も無し
    const skills = calculateSectionCompletion("skills", formData.skills);
    const pr = calculateSectionCompletion("pr", formData.pr);
    const conditions = calculateSectionCompletion("conditions", formData.conditions);

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
      workExperiences.length > 0
        ? Math.max(...workExperiences.map((exp) => exp.id)) + 1
        : 1;
    setWorkExperiences([
      ...workExperiences,
      {
        id: newId,
        isOpen: true,
        company: "",
        position: "",
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
    setWorkExperiences(workExperiences.filter((exp) => exp.id !== id));
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
    value: string | boolean
  ): void => {
    setWorkExperiences(
      workExperiences.map((exp) =>
        exp.id === id ? { ...exp, [field]: value } : exp
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

  // 保存／自動保存
  const handleSave = async (): Promise<void> => {
    console.log("🟡 Auto‑save fired");          // ← デバッグ用
    setSaving(true);

    // 1) セッションから UID を取得
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

    // 2) resumes を upsert
    const { error } = await supabase
      .from("resumes")
      .upsert(
        {
          user_id: uid,
          form_data: formData,
          work_experiences: workExperiences,
          updated_at: new Date().toISOString(),
        } as any, // 👈 型をゆるめる
        {
          onConflict: "user_id",
        }
      );

    if (error) {
      console.error("❌ Auto‑save error:", error);
      alert("自動保存に失敗しました: " + error.message); // 一時的に可視化
      setSaving(false);
      return;
    }

    console.log("✅ Auto‑save succeeded");
    setSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // 完了率バーの色を返す
  const getCompletionColor = (percentage: number): string => {
    if (percentage < 30) return "bg-red-500";
    if (percentage < 70) return "bg-yellow-500";
    return "bg-green-500";
  };

  // セクションステータスアイコン
  const getSectionStatusIcon = (percentage: number) => {
    if (percentage === 100) return <Check size={16} className="text-green-500" />;
    if (percentage > 0) return <Clock size={16} className="text-yellow-500" />;
    return <AlertCircle size={16} className="text-red-500" />;
  };

  return (
    // Optional UI guard: 読込中はローディング表示
    !initialLoaded ? (
      <div className="p-4 text-center text-sm text-gray-500">読込中…</div>
    ) : (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      {/* Header with progress tracker */}
      <div className="mb-6 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 p-4 shadow-sm sm:mb-8 sm:p-6">
        <div className="mb-4 flex flex-col items-start justify-between gap-2 sm:mb-6 sm:flex-row sm:items-center sm:gap-4">
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">職務経歴書</h1>
            <p className="text-xs text-gray-500 sm:text-sm">あなたのキャリアや学歴情報を入力してください</p>
          </div>
          <div className="hidden">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="relative h-8 gap-1 text-xs sm:h-10 sm:gap-2 sm:text-sm"
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

          </div>
        </div>

        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium sm:text-base">プロフィール完成度</h3>
          <span className="text-sm font-semibold">{completionPercentage}%</span>
        </div>

        <Progress value={completionPercentage} className={`h-2 ${getCompletionColor(completionPercentage)}`} />
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
            workExperiences.map((exp) => (
              <Collapsible key={exp.id} open={exp.isOpen} onOpenChange={() => toggleCollapsible(exp.id)}>
                <div className="rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-gray-500" />
                      <h3 className="text-sm font-medium sm:text-base">
                        {exp.company ? exp.company : `職歴 #${exp.id}`}
                        {exp.position && <span className="ml-2 text-xs text-gray-500">（{exp.position}）</span>}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
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
                          onClick={() => removeWorkExperience(exp.id)}
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
                        使用技術・ツール
                      </Label>
                      <Input
                        id={`technologies-${exp.id}`}
                        placeholder="Java, Python, AWS, Figmaなど"
                        className="h-8 text-xs sm:h-10 sm:text-sm"
                        value={exp.technologies}
                        onChange={(e) => handleWorkExperienceChange(exp.id, "technologies", e.target.value)}
                      />
                      {exp.technologies && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {exp.technologies.split(",").map((tech, i) => (
                            <Badge key={i} variant="outline" className="bg-blue-50 text-xs">
                              {tech.trim()}
                            </Badge>
                          ))}
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
      <div className="h-16"></div>
    </div>
    )
)}