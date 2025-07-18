"use client"; // ─────────── 必ずファイル先頭１行目

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

import { exportClientPdf } from "@/lib/pdf/exportClientPdf";
import ResumeTemplate from "@/components/pdf/ResumeTemplate";
import { supabase } from "@/lib/supabase/client";

// ─── PDF Export Button ─────────────────────────────────────────────
interface ExportButtonProps {
  targetRef: React.RefObject<HTMLDivElement | null>;
  filename: string;
}
const ExportButton: React.FC<ExportButtonProps> = ({
  targetRef,
  filename,
}) => (
  <Button
    variant="default"
    onClick={() =>
      targetRef.current
        ? exportClientPdf(targetRef.current, filename)
        : alert("プレビューがまだレンダリングされていません")
    }
    className="relative h-8 gap-1 text-xs sm:h-10 sm:gap-2 sm:text-sm"
  >
    <FileText size={14} className="sm:h-4 sm:w-4" />
    PDF出力
  </Button>
);

// ─── 型定義 ──────────────────────────────────────────────────────
type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

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
type GenderOption = "male" | "female" | "other";
type EducationStatus = "enrolled" | "graduated" | "expected";
type SectionKey =
  | "basic"
  | "education"
  | "work"
  | "skills"
  | "pr"
  | "conditions";
type Fields = Record<
  string,
  string | string[] | number | null | undefined
>;
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

export default function AdminResumePage() {
  const searchParams = useSearchParams();
  const resumeId = searchParams.get("id");
  const studentId = searchParams.get("user_id");
  const [targetUserId, setTargetUserId] = useState<string | null>(studentId);

  // ─── Guard: 学生IDまたは履歴書IDが必須 ──────────────────────────────
  if (!studentId && !resumeId) {
    return (
      <div className="p-4 text-center text-red-500">
        URL に ?user_id=xxxxx または ?id=xxxxx を付与してください
      </div>
    );
  }

  // ─── State 定義 ─────────────────────────────────────────
  const [workExperiences, setWorkExperiences] = useState<
    WorkExperience[]
  >([
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

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<SectionKey>("basic");
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [sectionCompletion, setSectionCompletion] = useState<
    Record<SectionKey, number>
  >({
    basic: 0,
    education: 0,
    work: 0,
    skills: 0,
    pr: 0,
    conditions: 0,
  });

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

  const [initialLoaded, setInitialLoaded] = useState(false);

  const pdfFilename = `${formData.basic.lastName}${formData.basic.firstName}_職務経歴書.pdf`;

  // ─── データ取得 ─────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      /* resumes: allow URL param to be either user_id or resume.id */
      const idParam = resumeId ?? studentId!;
      // first attempt: treat idParam as user_id
      let resumeResult = await supabase
        .from("resumes")
        .select("id, user_id, form_data, work_experiences")
        .eq("user_id", idParam)
        .maybeSingle<{
          id: string;
          user_id: string | null;
          form_data: FormData | null;
          work_experiences: WorkExperience[] | null;
        }>();

      let resumeRow = resumeResult.data;
      let resumeErr = resumeResult.error;

      // if not found by user_id, try as resume.id
      if (!resumeRow && (!resumeErr || resumeErr.code === "PGRST116")) {
        const altResult = await supabase
          .from("resumes")
          .select("id, user_id, form_data, work_experiences")
          .eq("id", idParam)
          .maybeSingle<{
            id: string;
            user_id: string | null;
            form_data: FormData | null;
            work_experiences: WorkExperience[] | null;
          }>();
        resumeRow = altResult.data;
        resumeErr = altResult.error;
      }

      if (resumeRow) {
        if (resumeRow.user_id) {
          setTargetUserId(resumeRow.user_id);
        }
        if (resumeRow.form_data) setFormData(resumeRow.form_data);
        if (Array.isArray(resumeRow.work_experiences)) {
          setWorkExperiences(
            resumeRow.work_experiences.map((exp) => ({
              ...exp,
              isOpen: true,
            }))
          );
        }
      } else if (resumeErr && resumeErr.code !== "PGRST116") {
        console.warn("resume fetch error:", resumeErr.message);
      }

      /* student_profiles */
      if (targetUserId) {
        const {
          data: profile,
          error: profileErr,
        } = await supabase
          .from("student_profiles")
          .select(
            "last_name, first_name, last_name_kana, first_name_kana, birth_date, gender, phone, address, admission_month, graduation_month, university, faculty, research_theme"
          )
          .eq("user_id", targetUserId!)
          .maybeSingle<{
            last_name: string | null;
            first_name: string | null;
            last_name_kana: string | null;
            first_name_kana: string | null;
            birth_date: string | null;
            gender: string | null;
            phone: string | null;
            address: string | null;
            admission_month: string | null;
            graduation_month: string | null;
            university: string | null;
            faculty: string | null;
            research_theme: string | null;
          }>();

        if (profile && !profileErr) {
          setFormData((prev) => ({
            ...prev,
            basic: {
              ...prev.basic,
              lastName: profile.last_name ?? prev.basic.lastName,
              firstName: profile.first_name ?? prev.basic.firstName,
              lastNameKana:
                profile.last_name_kana ?? prev.basic.lastNameKana,
              firstNameKana:
                profile.first_name_kana ?? prev.basic.firstNameKana,
              birthdate:
                profile.birth_date ?? prev.basic.birthdate,
              gender: (profile.gender as any) ?? prev.basic.gender,
              phone: profile.phone ?? prev.basic.phone,
              address: profile.address ?? prev.basic.address,
            },
            education: {
              ...prev.education,
              university:
                profile.university ?? prev.education.university,
              faculty: profile.faculty ?? prev.education.faculty,
              admissionDate:
                profile.admission_month ??
                prev.education.admissionDate,
              graduationDate:
                profile.graduation_month ??
                prev.education.graduationDate,
              researchTheme:
                profile.research_theme ??
                prev.education.researchTheme,
            },
          }));
        }
      }

      setInitialLoaded(true);
    };
    load();
  }, [studentId, resumeId]);

  // ─── 完了率計算（ロジックは元コードと同じ） ────────────────
  useEffect(() => {
    const calc = (fields: Fields) => {
      const total = Object.keys(fields).length;
      const filled = Object.values(fields).filter((v) =>
        Array.isArray(v)
          ? v.some((i) => i)
          : v !== "" && v !== null && v !== undefined
      ).length;
      return Math.round((filled / total) * 100);
    };
    const basic = calc(formData.basic);
    const education = calc(formData.education);
    const skills = calc(formData.skills);
    const pr = calc(formData.pr);
    const conditions = calc(formData.conditions);

    /* work section */
    let work = 0;
    if (workExperiences.length) {
      const req = workExperiences.length * 6;
      const filled = workExperiences.reduce((c, w) => {
        if (w.company) c++;
        if (w.position) c++;
        if (w.startDate) c++;
        if (w.isCurrent || w.endDate) c++;
        if (w.description) c++;
        if (w.achievements) c++;
        return c;
      }, 0);
      work = Math.round((filled / req) * 100);
    }

    setSectionCompletion({
      basic,
      education,
      work,
      skills,
      pr,
      conditions,
    });
    setCompletionPercentage(work);
  }, [formData, workExperiences]);

  // ─── フォーム入力ハンドラ (一部のみ、詳細は省略) ─────────────
  const handleInputChange = <K extends keyof FormData, F extends keyof FormData[K]>(
    section: K,
    field: F,
    value: FormData[K][F]
  ) => {
    setFormData({
      ...formData,
      [section]: { ...formData[section], [field]: value },
    });
  };

  // ─── Work‑experience helpers ───────────────────────────
  const addWorkExperience = () => {
    const newId =
      workExperiences.length > 0
        ? Math.max(...workExperiences.map((w) => w.id)) + 1
        : 1;
    setWorkExperiences([
      ...workExperiences,
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
  const removeWorkExperience = (id: number) =>
    setWorkExperiences(workExperiences.filter((w) => w.id !== id));
  const toggleCollapsible = (id: number) =>
    setWorkExperiences(
      workExperiences.map((w) =>
        w.id === id ? { ...w, isOpen: !w.isOpen } : w
      )
    );
  const handleWorkExperienceChange = (
    id: number,
    field: keyof WorkExperience,
    value: string | boolean | string[]
  ) =>
    setWorkExperiences(
      workExperiences.map((w) =>
        w.id === id ? { ...w, [field]: value } : w
      )
    );
  const handleJobTypeToggle = (
    id: number,
    value: string,
    checked: boolean
  ) =>
    setWorkExperiences((prev) =>
      prev.map((w) =>
        w.id === id
          ? {
              ...w,
              jobTypes: checked
                ? [...new Set([...(w.jobTypes || []), value])]
                : (w.jobTypes || []).filter((v) => v !== value),
            }
          : w
      )
    );
  // ───────────────────────────────────────────────────────

  // ─── 保存（手動のみ） ───────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    // Check existing resume by id or user_id
    const selection = supabase
      .from("resumes")
      .select("id");
    // conditionally filter by resumeId or targetUserId
    const selector = resumeId
      ? selection.eq("id", resumeId)
      : selection.eq("user_id", targetUserId!);

    const { data: existing, error: selErr } = await selector.maybeSingle();

    if (selErr && selErr.code !== "PGRST116") {
      alert(`読込エラー: ${selErr.message}`);
      setSaving(false);
      return;
    }

    let upErr = null;
    if (existing?.id) {
      // Update the existing resume record
      const { error } = await supabase
        .from("resumes")
        .update({
          form_data: formData as unknown as Json,
          work_experiences: workExperiences as unknown as Json,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      upErr = error;
    } else {
      // Insert new resume record with user_id
      const { error } = await supabase
        .from("resumes")
        .insert({
          user_id: targetUserId!,
          form_data: formData as unknown as Json,
          work_experiences: workExperiences as unknown as Json,
          updated_at: new Date().toISOString(),
        });
      upErr = error;
    }

    setSaving(false);
    if (upErr) {
      alert(`保存失敗: ${upErr.message}`);
    } else {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  // ─── UI (元コードを流用。一部 Save ボタンの hidden を削除) ───
  if (!initialLoaded) {
    return (
      <div className="p-4 text-center text-sm text-gray-500">
        読込中…
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 p-4 shadow-sm sm:mb-8 sm:p-6">
        <div className="mb-4 flex flex-col items-start justify-between gap-2 sm:mb-6 sm:flex-row sm:items-center sm:gap-4">
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">
              学生職務経歴書（管理者編集）
            </h1>
            <p className="text-xs text-gray-500 sm:text-sm">
              {resumeId
                ? `履歴書ID: ${resumeId}`
                : studentId
                ? `ユーザーID: ${studentId}`
                : ""}
            </p>
          </div>

          <div className="flex items-center gap-2">
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
            <ExportButton targetRef={previewRef} filename={pdfFilename} />
          </div>
        </div>

        {/* Progress */}
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium sm:text-base">
            プロフィール完成度
          </h3>
          <span className="text-sm font-semibold">
            {completionPercentage}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded bg-gray-200">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
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
                        {exp.company || `職歴 #${exp.id}`}
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
                          <div key={opt} className="flex items-center space-x-2">
                            <Checkbox
                              id={`jobType-${exp.id}-${opt}`}
                              className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                              checked={exp.jobTypes.includes(opt)}
                              onCheckedChange={(checked) =>
                                handleJobTypeToggle(exp.id, opt, checked as boolean)
                              }
                            />
                            <Label htmlFor={`jobType-${exp.id}-${opt}`} className="text-[10px] sm:text-xs">
                              {opt}
                            </Label>
                          </div>
                        ))}
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

      {/* プレビュー */}  
      <div className="mb-6">  
        <h2 className="mb-2 text-lg font-semibold">  
          プレビュー  
        </h2>  
        <div  
          ref={previewRef}  
          className="overflow-auto border border-gray-300 p-4"  
          style={{ minHeight: 600, backgroundColor: "white" }}  
        >  
          <ResumeTemplate  
            basic={{ ...formData.basic }}  
            workExperiences={workExperiences}  
            skills={  
              formData.skills.skills  
                ? formData.skills.skills.split(/[\\s,]+/).filter((s) => s.trim() !== "")  
                : []  
            }  
            educations={  
              formData.education.university  
                ? [  
                    `${  
                      formData.education.graduationDate ||  
                      formData.education.admissionDate  
                    } ${formData.education.university} ${formData.education.faculty}`,  
                  ]  
                : []  
            }  
          />  
        </div>  
      </div>  

      <div className="h-16"></div>  
    </div>
  );
}
