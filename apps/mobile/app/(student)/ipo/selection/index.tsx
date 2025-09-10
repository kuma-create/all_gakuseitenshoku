"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Pressable,
  TextInput,
  ScrollView,
  Modal,
  ActivityIndicator,
  SafeAreaView,
  Linking,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Plus,
  Search,
  Filter,
  Building,
  Star,
  Timer,
  XCircle,
  Award,
  CheckCircle,
  Eye,
  Pencil,
  Copy as CopyIcon,
  Calendar,
  Clock,
  ExternalLink,
} from "lucide-react-native";
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Clipboard from 'expo-clipboard';
import { supabase } from 'src/lib/supabase';

/* ------------------------------------------------------------------
   型定義（WEB版と互換の最小限）
------------------------------------------------------------------- */

type Route = string;

interface SelectionStage {
  id: string;
  name: string;
  status: "pending" | "passed" | "failed" | "scheduled";
  date?: string;
  time?: string;
  location?: string;
  feedback?: string;
  interviewer?: string;
  notes?: string;
  documents?: string[];
  preparation?: string[];
  rating?: number;
  completedAt?: string;
}

interface Company {
  id: string;
  name: string;
  industry: string;
  size: "startup" | "sme" | "large" | "megacorp";
  location: string;
  appliedDate: string;
  status:
    | "applied"
    | "in_progress"
    | "final_interview"
    | "offer"
    | "rejected"
    | "withdrawn";
  currentStage: number;
  stages: SelectionStage[];
  priority: "high" | "medium" | "low";
  notes: string;
  contacts: {
    name: string;
    role: string;
    email?: string;
    phone?: string;
  }[];
  jobDetails: {
    title: string;
    salary?: string;
    benefits?: string[];
    requirements?: string[];
    description?: string;
  };
  lastUpdate: string;
  overallRating?: number;
  tags: string[];
}

const STATUS_LABEL: Record<Company["status"], string> = {
  applied: "エントリー",
  in_progress: "選考中",
  final_interview: "最終",
  offer: "内定",
  rejected: "不合格",
  withdrawn: "辞退",
};

const STATUS_STAGE_LABEL: Record<SelectionStage["status"], string> = {
  scheduled: "予定",
  pending: "進行中",
  passed: "合格",
  failed: "不合格",
};

const STATUS_ICON: Record<Company["status"], any> = {
  applied: ArrowLeft, // 代替
  in_progress: Timer,
  final_interview: Star,
  offer: CheckCircle,
  rejected: XCircle,
  withdrawn: Filter, // 代替
};

const PRIORITY_LABEL = {
  high: "第一",
  medium: "第二",
  low: "練習",
};

const STAT_COLORS = {
  total: { dot: "#60A5FA", text: "#1D4ED8" },      // blue
  inProgress: { dot: "#FBBF24", text: "#B45309" }, // amber
  offer: { dot: "#34D399", text: "#047857" },      // green
  rejected: { dot: "#F87171", text: "#B91C1C" },   // red
} as const;

const WEEKDAYS_JA = ['日', '月', '火', '水', '木', '金', '土'] as const;

const isoToday = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const addDaysIso = (iso: string, days: number) => {
  const d = new Date(iso + 'T00:00');
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const isTodayIso = (iso: string) => iso === isoToday();


/* ------------------------------------------------------------------
   モバイル版 選考管理ページ
------------------------------------------------------------------- */

function sizeToLabel(size: Company["size"]) {
  if (size === "startup") return "スタートアップ";
  if (size === "sme") return "中小";
  if (size === "large") return "大企業";
  if (size === "megacorp") return "メガベンチャー";
  return "-";
}

const Row = ({ label, value }: { label: string; value?: string }) => (
  <View style={{ flexDirection: "row" }}>
    <Text style={{ width: 72, color: "#6B7280", fontSize: 12 }}>{label}:</Text>
    <Text style={{ flex: 1, color: "#111827", fontSize: 12 }}>{value || "-"}</Text>
  </View>
);

export default function SelectionIndex() {
  const router = useRouter();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // フィルタ・検索
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "name" | "priority" | "status">(
    "date",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  // 編集モーダル
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Company | null>(null);
  const [editForm, setEditForm] = useState({
    id: "" as string,
    name: "",
    industry: "",
    size: "large" as Company["size"],
    location: "",
    priority: "medium" as Company["priority"],
    jobTitle: "",
    salary: "",
    description: "",
    notes: "",
    tags: "",
    accountId: "",
    password: "",
    siteUrl: "",
  });

  // 詳細モーダル
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<Company | null>(null);
  const [detailTab, setDetailTab] = useState<"overview" | "stages" | "notes">("stages");

  // 認証情報ポップアップ
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [credentialsTarget, setCredentialsTarget] = useState<Company | null>(null);

  // 選考段階 編集モーダル
  const [stageEditOpen, setStageEditOpen] = useState(false);
  const [stageEditing, setStageEditing] = useState<SelectionStage | null>(null);
  const [stageForm, setStageForm] = useState({
    name: "",
    status: "scheduled" as SelectionStage["status"],
    date: "",
    time: "",
    location: "",
    interviewer: "",
    rating: 0 as number,
    feedback: "",
    notes: "",
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  // 選択中の日付（直近1週間 ribbon 選択）
  const [selectedDateIso, setSelectedDateIso] = useState<string | null>(null);


  const formatDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const formatTime = (d: Date) => {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  // 追加フォーム
  const [form, setForm] = useState({
    name: "",
    industry: "",
    size: "large" as Company["size"],
    location: "",
    priority: "medium" as Company["priority"],
    jobTitle: "",
    salary: "",
    description: "",
    notes: "",
    tags: "",
    accountId: "",
    password: "",
    siteUrl: "",
  });

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data: companiesRows, error: companiesErr } = await supabase
        .from("ipo_selection_companies")
        .select(
          `id,name,industry,size,location,applied_date,status,current_stage,priority,notes,last_update,overall_rating,tags,job_title,job_salary,job_benefits,job_requirements,job_description`,
        )
        .order("last_update", { ascending: false });

      if (companiesErr) throw companiesErr;

      const ids = (companiesRows || []).map((c: any) => c.id);

      const { data: stagesRows } = await supabase
        .from("ipo_selection_stages")
        .select(
          `id,company_id,name,status,date,time,location,feedback,interviewer,notes,rating,preparation,completed_at`,
        )
        .in("company_id", ids);

      const { data: contactsRows } = await supabase
        .from("ipo_selection_contacts")
        .select(`id,company_id,name,role,email,phone`)
        .in("company_id", ids);

      const mapped: Company[] = (companiesRows || []).map((row: any) => {
        const companyStages = (stagesRows || [])
          .filter((s: any) => s.company_id === row.id)
          .map((s: any) => ({
            id: String(s.id),
            name: s.name,
            status: (s.status ?? "pending") as SelectionStage["status"],
            date: s.date ?? undefined,
            time: s.time ?? undefined,
            location: s.location ?? undefined,
            feedback: s.feedback ?? undefined,
            interviewer: s.interviewer ?? undefined,
            notes: s.notes ?? undefined,
            documents: undefined,
            preparation: Array.isArray(s.preparation) ? (s.preparation as string[]) : undefined,
            rating: s.rating ?? undefined,
            completedAt: s.completed_at ?? undefined,
          })) as SelectionStage[];

        const companyContacts = (contactsRows || [])
          .filter((c: any) => c.company_id === row.id)
          .map((c: any) => ({
            name: c.name,
            role: c.role,
            email: c.email ?? undefined,
            phone: c.phone ?? undefined,
          }));

        return {
          id: String(row.id),
          name: row.name,
          industry: row.industry ?? "",
          size: (row.size ?? "large") as Company["size"],
          location: row.location ?? "",
          appliedDate: row.applied_date ?? "",
          status: (row.status ?? "applied") as Company["status"],
          currentStage: Number(row.current_stage ?? 0),
          stages: companyStages,
          priority: (row.priority ?? "medium") as Company["priority"],
          notes: row.notes ?? "",
          contacts: companyContacts,
          jobDetails: {
            title: row.job_title ?? "",
            salary: row.job_salary ?? undefined,
            benefits: Array.isArray(row.job_benefits)
              ? (row.job_benefits as string[])
              : undefined,
            requirements: Array.isArray(row.job_requirements)
              ? (row.job_requirements as string[])
              : undefined,
            description: row.job_description ?? undefined,
          },
          lastUpdate: row.last_update ?? "",
          overallRating: row.overall_rating ?? undefined,
          tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
        } as Company;
      });

      setCompanies(mapped);
    } catch (e: any) {
      setLoadError("サーバーからの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Safety effect to reset pickers when all modals are closed
  useEffect(() => {
    if (!editOpen && !detailOpen && !stageEditOpen && !filterSheetOpen && !addOpen) {
      if (showDatePicker) setShowDatePicker(false);
      if (showTimePicker) setShowTimePicker(false);
    }
  }, [editOpen, detailOpen, stageEditOpen, filterSheetOpen, addOpen, showDatePicker, showTimePicker]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    let list = companies.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(q) ||
        c.industry.toLowerCase().includes(q) ||
        c.jobDetails.title.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q));
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      const matchesPriority =
        priorityFilter === "all" || c.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });

    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") cmp = a.name.localeCompare(b.name);
      if (sortBy === "date")
        cmp = new Date(a.appliedDate).getTime() - new Date(b.appliedDate).getTime();
      if (sortBy === "priority") {
        const p = { high: 3, medium: 2, low: 1 } as const;
        cmp = p[a.priority] - p[b.priority];
      }
      if (sortBy === "status") cmp = a.status.localeCompare(b.status);
      return sortOrder === "asc" ? cmp : -cmp;
    });

    return list;
  }, [companies, searchQuery, statusFilter, priorityFilter, sortBy, sortOrder]);


  // 直近の予定（1週間）: next7Days, upcomingStages
  const { next7Days, upcomingStages } = useMemo(() => {
    // Build next 7 days buckets
    const startIso = isoToday();
    const days = Array.from({ length: 7 }, (_, i) => {
      const iso = addDaysIso(startIso, i);
      const dt = new Date(iso + 'T00:00');
      const label = `${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getDate()).padStart(2, '0')}`;
      return { iso, label, count: 0 } as { iso: string; label: string; count: number };
    });

    // Map for quick lookup
    const idxByIso = new Map<string, number>();
    days.forEach((d, i) => idxByIso.set(d.iso, i));

    const inRangeStages: { company: Company; stage: SelectionStage }[] = [];

    for (const company of companies) {
      for (const stage of company.stages) {
        if (!stage?.date) continue;
        // Only consider upcoming within the next 7 days (today inclusive)
        const iso = stage.date;
        if (iso >= days[0].iso && iso <= days[days.length - 1].iso) {
          const i = idxByIso.get(iso);
          if (i !== undefined) days[i].count += 1;
          // Select stages that are likely actionable
          if (['scheduled', 'pending'].includes(stage.status)) {
            inRangeStages.push({ company, stage });
          }
        }
      }
    }

    // sort upcoming stages by date/time
    inRangeStages.sort((a, b) => {
      const at = `${a.stage.date ?? ''} ${a.stage.time ?? ''}`.trim();
      const bt = `${b.stage.date ?? ''} ${b.stage.time ?? ''}`.trim();
      return at.localeCompare(bt);
    });

    return { next7Days: days, upcomingStages: inRangeStages };
  }, [companies]);

  // 選択中の日付の予定リスト
  const selectedDayStages = useMemo(() => {
    if (!selectedDateIso) return [] as { company: Company; stage: SelectionStage }[];
    return upcomingStages.filter(({ stage }) => stage.date === selectedDateIso);
  }, [selectedDateIso, upcomingStages]);

  // 企業情報の更新（編集モーダル）
  const handleUpdateCompany = useCallback(async () => {
    if (!editTarget) return;
    if (!editForm.name.trim() || !editForm.jobTitle.trim()) return;

    try {
      const nowDate = new Date().toISOString().split("T")[0];
      // build tags with form-priority embedded values
      const inputTags = editForm.tags ? editForm.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
      const preservedSpecial = (editTarget?.tags || []).filter(
        (t) => t.startsWith("__") && !t.startsWith("__id:") && !t.startsWith("__pw:") && !t.startsWith("__url:")
      );
      const embedTags = [
        ...(editForm.accountId ? ["__id:" + editForm.accountId] : []),
        ...(editForm.password ? ["__pw:" + editForm.password] : []),
        ...(editForm.siteUrl ? ["__url:" + editForm.siteUrl] : []),
      ];
      const combinedTags = Array.from(new Set([...inputTags, ...preservedSpecial, ...embedTags]));
      await supabase
        .from("ipo_selection_companies")
        .update({
          name: editForm.name,
          industry: editForm.industry || null,
          size: editForm.size,
          location: editForm.location || null,
          priority: editForm.priority,
          notes: editForm.notes || null,
          last_update: nowDate,
          job_title: editForm.jobTitle,
          job_salary: editForm.salary || null,
          job_description: editForm.description || null,
          tags: combinedTags,
        })
        .eq("id", editTarget.id);

      setCompanies((prev) =>
        prev.map((c) =>
          c.id === editTarget.id
            ? {
                ...c,
                name: editForm.name,
                industry: editForm.industry,
                size: editForm.size,
                location: editForm.location,
                priority: editForm.priority,
                notes: editForm.notes,
                lastUpdate: nowDate,
                jobDetails: {
                  ...c.jobDetails,
                  title: editForm.jobTitle,
                  salary: editForm.salary,
                  description: editForm.description,
                },
                tags: combinedTags,
              }
            : c,
        ),
      );

      setEditOpen(false);
      setEditTarget(null);
    } catch (e) {
      // 失敗してもローカル更新は反映
      // build tags with form-priority embedded values in catch as well
      const inputTags = editForm.tags ? editForm.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
      const preservedSpecial = (editTarget?.tags || []).filter(
        (t) => t.startsWith("__") && !t.startsWith("__id:") && !t.startsWith("__pw:") && !t.startsWith("__url:")
      );
      const embedTags = [
        ...(editForm.accountId ? ["__id:" + editForm.accountId] : []),
        ...(editForm.password ? ["__pw:" + editForm.password] : []),
        ...(editForm.siteUrl ? ["__url:" + editForm.siteUrl] : []),
      ];
      const combinedTags = Array.from(new Set([...inputTags, ...preservedSpecial, ...embedTags]));
      setCompanies((prev) =>
        prev.map((c) =>
          c.id === editTarget.id
            ? {
                ...c,
                name: editForm.name,
                industry: editForm.industry,
                size: editForm.size,
                location: editForm.location,
                priority: editForm.priority,
                notes: editForm.notes,
                jobDetails: {
                  ...c.jobDetails,
                  title: editForm.jobTitle,
                  salary: editForm.salary,
                  description: editForm.description,
                },
                tags: combinedTags,
              }
            : c,
        ),
      );
      setEditOpen(false);
      setEditTarget(null);
    }
  }, [editForm, editTarget]);

  // 選考段階の保存（新規/更新）
  const handleSaveStage = useCallback(async () => {
    if (!detailTarget) return;
    // 追加: 認証ユーザーID（RLS対策）
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id ?? null;
    const payload: any = {
      user_id: uid,
      company_id: detailTarget.id,
      name: stageForm.name.trim() || "無題の段階",
      status: stageForm.status,
      date: stageForm.date || null,
      time: stageForm.time || null,
      location: stageForm.location || null,
      interviewer: stageForm.interviewer || null,
      rating: typeof stageForm.rating === 'number' ? stageForm.rating : Number(stageForm.rating) || 0,
      feedback: stageForm.feedback || null,
      notes: stageForm.notes || null,
    };

    try {
      if (stageEditing && stageEditing.id) {
        // 更新
        await supabase.from("ipo_selection_stages").update(payload).eq("id", stageEditing.id);
        setCompanies((prev) =>
          prev.map((c) => {
            if (c.id !== detailTarget.id) return c;
            return {
              ...c,
              stages: c.stages.map((s) =>
                s.id === stageEditing.id
                  ? { ...s, ...payload, id: String(stageEditing.id) }
                  : s,
              ),
              lastUpdate: new Date().toISOString().split("T")[0],
            };
          }),
        );
        setDetailTarget((prev) =>
          prev && prev.id === detailTarget.id
            ? {
                ...prev,
                stages: prev.stages.map((s) =>
                  s.id === String(stageEditing.id) ? { ...s, ...payload, id: String(stageEditing.id) } : s,
                ),
                lastUpdate: new Date().toISOString().split("T")[0],
              }
            : prev,
        );
      } else {
        // 追加
        const { data: inserted } = await supabase
          .from("ipo_selection_stages")
          .insert(payload)
          .select("id")
          .single();
        const newId = inserted?.id ? String(inserted.id) : `${Date.now()}`;
        const newStage: SelectionStage = { id: newId, ...payload } as SelectionStage;
        setCompanies((prev) =>
          prev.map((c) => (c.id === detailTarget.id ? { ...c, stages: [...c.stages, newStage] } : c)),
        );
        setDetailTarget((prev) =>
          prev && prev.id === detailTarget.id
            ? { ...prev, stages: [...prev.stages, newStage] }
            : prev,
        );
      }
    } catch (e) {
      console.error('save stage failed', e);
      try { Alert.alert('保存に失敗しました', (e as any)?.message ?? '権限設定(RLS)の可能性があります。後で再読み込みすると消える場合があります。'); } catch {}
      // 楽観的更新（失敗してもローカル反映）)
      if (stageEditing && stageEditing.id) {
        setCompanies((prev) =>
          prev.map((c) => (c.id === detailTarget.id ? { ...c, stages: c.stages.map((s) => (s.id === stageEditing.id ? { ...s, ...payload } : s)) } : c)),
        );
        setDetailTarget((prev) =>
          prev && prev.id === detailTarget.id
            ? { ...prev, stages: prev.stages.map((s) => (s.id === stageEditing!.id ? { ...s, ...payload } : s)) }
            : prev,
        );
      } else {
        const newStage: SelectionStage = { id: `${Date.now()}`, ...payload } as SelectionStage;
        setCompanies((prev) =>
          prev.map((c) => (c.id === detailTarget.id ? { ...c, stages: [...c.stages, newStage] } : c)),
        );
        setDetailTarget((prev) =>
          prev && prev.id === detailTarget.id
            ? { ...prev, stages: [...prev.stages, newStage] }
            : prev,
        );
      }
    } finally {
      // Close the editor, clear transient pickers
      setStageEditOpen(false);
      setStageEditing(null);
      setShowDatePicker(false);
      setShowTimePicker(false);
      // Re-open the detail modal (stages tab) after iOS fully dismisses the editor
      setTimeout(() => {
        setDetailTab("stages");
        setDetailOpen(true);
      }, 200);
    }
  }, [detailTarget, stageForm, stageEditing]);

  // 選考段階の削除
  const handleDeleteStage = useCallback(async (stageId: string) => {
    if (!detailTarget) return;
    try {
      await supabase.from("ipo_selection_stages").delete().eq("id", stageId);
    } catch (e) {
      // no-op
    } finally {
      setCompanies((prev) =>
        prev.map((c) => (c.id === detailTarget.id ? { ...c, stages: c.stages.filter((s) => s.id !== stageId) } : c)),
      );
      setDetailTarget((prev) =>
        prev && prev.id === detailTarget.id
          ? { ...prev, stages: prev.stages.filter((s) => s.id !== stageId) }
          : prev,
      );
    }
  }, [detailTarget]);
  // 新規企業の追加
  const handleAddCompany = useCallback(async () => {
    if (!form.name.trim() || !form.jobTitle.trim()) return;
    const nowDate = new Date().toISOString().split("T")[0];
    // Build tagsCombined before insert
    const baseTags = form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
    const embedTags = [
      ...(form.accountId ? [`__id:${form.accountId}`] : []),
      ...(form.password ? [`__pw:${form.password}`] : []),
      ...(form.siteUrl ? [`__url:${form.siteUrl}`] : []),
    ];
    const tagsCombined = Array.from(new Set([...baseTags, ...embedTags]));
    try {
      const { data: inserted } = await supabase
        .from("ipo_selection_companies")
        .insert({
          name: form.name,
          industry: form.industry || null,
          size: form.size,
          location: form.location || null,
          applied_date: nowDate,
          status: "applied",
          current_stage: 0,
          priority: form.priority,
          notes: form.notes || null,
          last_update: nowDate,
          overall_rating: null,
          tags: tagsCombined,
          job_title: form.jobTitle,
          job_salary: form.salary || null,
          job_description: form.description || null,
        })
        .select("id")
        .single();

      const newId = inserted?.id ? String(inserted.id) : Date.now().toString();

      const newCompany: Company = {
        id: newId,
        name: form.name,
        industry: form.industry,
        size: form.size,
        location: form.location,
        appliedDate: nowDate,
        status: "applied",
        currentStage: 0,
        priority: form.priority,
        notes: form.notes,
        lastUpdate: nowDate,
        overallRating: undefined,
        tags: tagsCombined,
        stages: [
          {
            id: `${newId}-entry`,
            name: "エントリー",
            status: "passed",
            date: nowDate,
            completedAt: nowDate,
            feedback: "エントリー完了",
            rating: 5,
          },
        ],
        contacts: [],
        jobDetails: {
          title: form.jobTitle,
          salary: form.salary,
          description: form.description,
        },
      };

      setCompanies((prev) => [newCompany, ...prev]);
      setAddOpen(false);
      setForm({
        name: "",
        industry: "",
        size: "large",
        location: "",
        priority: "medium",
        jobTitle: "",
        salary: "",
        description: "",
        notes: "",
        tags: "",
        accountId: "",
        password: "",
        siteUrl: "",
      });
    } catch (e) {
      // ローカルだけでも追加
      const newCompany: Company = {
        id: Date.now().toString(),
        name: form.name,
        industry: form.industry,
        size: form.size,
        location: form.location,
        appliedDate: nowDate,
        status: "applied",
        currentStage: 0,
        priority: form.priority,
        notes: form.notes,
        lastUpdate: nowDate,
        overallRating: undefined,
        tags: tagsCombined,
        stages: [
          {
            id: `${Date.now()}-1`,
            name: "エントリー",
            status: "passed",
            date: nowDate,
            completedAt: nowDate,
            feedback: "エントリー完了",
            rating: 5,
          },
        ],
        contacts: [],
        jobDetails: {
          title: form.jobTitle,
          salary: form.salary,
          description: form.description,
        },
      };
      setCompanies((prev) => [newCompany, ...prev]);
      setAddOpen(false);
    }
  }, [form]);

  const CompanyCard = ({ item }: { item: Company }) => {
    const Icon = STATUS_ICON[item.status] || Timer;
    const progress = item.stages.length
      ? ((item.currentStage + 1) / item.stages.length) * 100
      : 0;

    return (
      <Pressable
        onPress={() => {
          setDetailTarget(item);
          setDetailTab("stages");
          setDetailOpen(true);
        }}
        accessibilityLabel="企業の概要を表示"
        style={{
          backgroundColor: "#fff",
          padding: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#E5E7EB",
          marginBottom: 12,
          shadowColor: "#000",
          shadowOpacity: 0.05,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
        }}
      >
        {/* ヘッダ */}
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text numberOfLines={1} style={{ fontWeight: "700", fontSize: 16 }}>
              {item.name}
            </Text>
            <Text numberOfLines={1} style={{ color: "#4B5563", marginTop: 2 }}>
              {item.jobDetails.title}
            </Text>
          </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TouchableOpacity
                onPress={() => { setCredentialsTarget(item); setCredentialsOpen(true); }}
                accessibilityRole="button"
                accessibilityLabel="アイパス"
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 9999,
                  backgroundColor: "#EEF2FF",
                  borderWidth: 1,
                  borderColor: "#E0E7FF",
                  marginRight: 8,
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={{ fontSize: 12 }}>
                  アイパス
                </Text>
              </TouchableOpacity>
              {/* 編集ボタン -> /ipo/selection/[id]/edit */}
              <TouchableOpacity
                onPress={() => {
                  setEditTarget(item);
                  const specialId = item.tags?.find((t) => t.startsWith("__id:"))?.replace("__id:", "") || "";
                  const specialPw = item.tags?.find((t) => t.startsWith("__pw:"))?.replace("__pw:", "") || "";
                  const specialUrl = item.tags?.find((t) => t.startsWith("__url:"))?.replace("__url:", "") || "";
                  const visibleTags = (item.tags || []).filter((t) => !t.startsWith("__")).join(",");
                  setEditForm({
                    id: item.id,
                    name: item.name,
                    industry: item.industry || "",
                    size: item.size,
                    location: item.location || "",
                    priority: item.priority,
                    jobTitle: item.jobDetails.title || "",
                    salary: item.jobDetails.salary || "",
                    description: item.jobDetails.description || "",
                    notes: item.notes || "",
                    tags: visibleTags,
                    accountId: specialId,
                    password: specialPw,
                    siteUrl: specialUrl,
                  });
                  setEditOpen(true);
                }}
                accessibilityRole="button"
                accessibilityLabel="編集"
                style={{ padding: 6, marginRight: 6 }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Pencil size={16} color="#374151" />
              </TouchableOpacity>
      {/* 認証情報（別ポップアップ） */}
      <Modal
        visible={credentialsOpen}
        animationType="fade"
        transparent
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onRequestClose={() => setCredentialsOpen(false)}
      >
        <View
          pointerEvents="box-none"
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.25)",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 480,
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#E5E7EB",
              padding: 16,
            }}
          >
            <Text style={{ fontWeight: "800", fontSize: 18, marginBottom: 12 }}>
              {credentialsTarget?.name ?? ""}
            </Text>
            <View style={{ gap: 12 }}>
              {(() => {
                const idTag = credentialsTarget?.tags?.find((t) => t.startsWith("__id:"));
                const idVal = idTag ? idTag.replace("__id:", "") : "";
                return (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={{ width: 110, fontSize: 12, color: "#6B7280" }}>マイページID:</Text>
                    <Text style={{ flex: 1, fontSize: 12 }}>{idVal || "-"}</Text>
                    {idVal ? (
                      <TouchableOpacity
                        onPress={async () => {
                          await Clipboard.setStringAsync(idVal);
                          Alert.alert("コピーしました", "マイページIDをコピーしました");
                        }}
                        style={{ marginLeft: 8, padding: 6, borderRadius: 8, backgroundColor: "#F3F4F6" }}
                      >
                        <CopyIcon size={14} color="#374151" />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                );
              })()}
              {(() => {
                const pwTag = credentialsTarget?.tags?.find((t) => t.startsWith("__pw:"));
                const pwVal = pwTag ? pwTag.replace("__pw:", "") : "";
                return (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={{ width: 110, fontSize: 12, color: "#6B7280" }}>マイページPW:</Text>
                    <Text style={{ flex: 1, fontSize: 12 }}>{pwVal || "-"}</Text>
                    {pwVal ? (
                      <TouchableOpacity
                        onPress={async () => {
                          await Clipboard.setStringAsync(pwVal);
                          Alert.alert("コピーしました", "マイページパスワードをコピーしました");
                        }}
                        style={{ marginLeft: 8, padding: 6, borderRadius: 8, backgroundColor: "#F3F4F6" }}
                      >
                        <CopyIcon size={14} color="#374151" />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                );
              })()}
              {(() => {
                const urlTag = credentialsTarget?.tags?.find((t) => t.startsWith("__url:"));
                const rawUrl = urlTag ? urlTag.replace("__url:", "") : "";
                const url = rawUrl && !/^https?:\/\//i.test(rawUrl) ? `https://${rawUrl}` : rawUrl;
                return (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={{ width: 110, fontSize: 12, color: "#6B7280" }}>URL:</Text>
                    <Text style={{ flex: 1, fontSize: 12 }} numberOfLines={1}>{rawUrl || "-"}</Text>
                    {rawUrl ? (
                      <>
                        <TouchableOpacity
                          onPress={() => Linking.openURL(url)}
                          style={{ marginLeft: 8, padding: 6, borderRadius: 8, backgroundColor: "#F3F4F6" }}
                        >
                          <Text style={{ fontSize: 12, color: "#2563EB" }}>開く</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={async () => {
                            await Clipboard.setStringAsync(rawUrl);
                            Alert.alert("コピーしました", "サイトURLをコピーしました");
                          }}
                          style={{ marginLeft: 4, padding: 6, borderRadius: 8, backgroundColor: "#F3F4F6" }}
                        >
                          <CopyIcon size={14} color="#374151" />
                        </TouchableOpacity>
                      </>
                    ) : null}
                  </View>
                );
              })()}
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 20 }}>
              <TouchableOpacity
                onPress={() => setCredentialsOpen(false)}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: "#2563EB", alignItems: "center" }}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>閉じる</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
          </View>
        </View>

        {/* 情報行 */}
        <View
          style={{
            marginTop: 8,
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <View style={{ flexDirection: "column" }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Building size={14} color="#6B7280" />
                <Text style={{ color: "#6B7280", marginLeft: 6, fontSize: 12 }}>
                  {item.industry || "-"}
                </Text>
              </View>
            </View>
            <Text style={{ color: "#9CA3AF", marginHorizontal: 6, fontSize: 12, alignSelf: "center" }}>・</Text>
            <Text style={{ color: "#6B7280", fontSize: 12, alignSelf: "center" }}>
              {item.stages[item.currentStage]?.name || "新しい段階"}
            </Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        {/* 進捗 */}
        <View style={{ marginTop: 8 }}>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text style={{ fontSize: 12, color: "#374151" }}>
              {item.currentStage + 1}/{item.stages.length}
            </Text>
            {item.overallRating ? (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Star size={14} color="#F59E0B" />
                <Text style={{ marginLeft: 4, fontSize: 12, color: "#374151" }}>
                  {item.overallRating}
                </Text>
              </View>
            ) : null}
          </View>
          <View
            style={{
              height: 4,
              borderRadius: 9999,
              backgroundColor: "#E5E7EB",
              overflow: "hidden",
              marginTop: 4,
            }}
          >
            <View
              style={{
                width: `${progress}%`,
                height: 4,
                borderRadius: 9999,
                backgroundColor: "#3B82F6",
              }}
            />
          </View>
        </View>

        {/* フッタ */}
        <View
          style={{
            marginTop: 8,
            flexDirection: "row",
            justifyContent: "flex-start",
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#6B7280", fontSize: 12 }}>{item.lastUpdate}</Text>
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      {/* ヘッダー */}
      <View
        style={{
          backgroundColor: "#FFFFFF",
          borderBottomWidth: 1,
          borderBottomColor: "#E5E7EB",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        >
          <TouchableOpacity onPress={() => router.push("/ipo/dashboard")}>
            <ArrowLeft size={22} color="#111827" />
          </TouchableOpacity>
          <View style={{ alignItems: "center", flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: "700" }}>選考管理</Text>
            {loadError ? (
              <Text
                style={{ fontSize: 11, color: "#92400E", marginTop: 2 }}
                numberOfLines={1}
              >
                {loadError}
              </Text>
            ) : null}
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity onPress={() => setFilterSheetOpen(true)}>
              <Filter size={20} color="#111827" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setAddOpen(true)}>
              <Plus size={20} color="#2563EB" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 検索ボックス */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginHorizontal: 12,
            marginBottom: 10,
            backgroundColor: "#F3F4F6",
            borderRadius: 10,
            paddingHorizontal: 10,
            paddingVertical: 6,
          }}
        >
          <Search size={16} color="#6B7280" />
          <TextInput
            placeholder="企業名・業界・職種・タグで検索"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{ marginLeft: 8, flex: 1 }}
          />
        </View>
      </View>

      {/* 直近の予定（1週間） */}
      <View style={{ paddingHorizontal: 12, paddingTop: 10 }}>
        <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Calendar size={16} color="#2563EB" />
              <Text style={{ fontSize: 13, fontWeight: '700' }}>直近の予定（1週間）</Text>
            </View>
            {next7Days.every(d => d.count === 0) ? (
              <Text style={{ fontSize: 11, color: '#6B7280' }}>予定はありません</Text>
            ) : null}
          </View>

          {/* Days ribbon */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 2 }}>
              {next7Days.map((d) => {
                const wd = WEEKDAYS_JA[new Date(d.iso + 'T00:00').getDay()];
                const today = isTodayIso(d.iso);
                const isWeekend = wd === '土' || wd === '日';
                return (
                  <Pressable
                    onPress={() => setSelectedDateIso((prev) => (prev === d.iso ? null : d.iso))}
                    key={d.iso}
                    aria-current={today ? 'date' : undefined}
                    style={{
                      minWidth: 74,
                      borderWidth: 1,
                      borderColor: (selectedDateIso === d.iso || today) ? '#93C5FD' : '#E5E7EB',
                      backgroundColor: selectedDateIso === d.iso ? '#DBEAFE' : (today ? '#DBEAFE66' : '#FFFFFF'),
                      borderRadius: 10,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                    }}
                  >
                    <Text style={{ fontSize: 10, color: '#6B7280' }}>{d.iso}</Text>
                    <Text style={{ marginTop: 2, fontSize: 16, fontWeight: '800' }}>
                      {d.label} <Text style={{ fontSize: 10, color: wd === '土' ? '#2563EB' : wd === '日' ? '#EF4444' : '#6B7280' }}>（{wd}）</Text>
                    </Text>
                    <View
                      style={{
                        marginTop: 4,
                        alignSelf: 'flex-start',
                        paddingHorizontal: 8,
                        height: 20,
                        borderRadius: 9999,
                        justifyContent: 'center',
                        backgroundColor: d.count > 0 ? 'rgba(37,99,235,0.10)' : '#F3F4F6',
                      }}
                    >
                      <Text style={{ fontSize: 11, color: d.count > 0 ? '#1D4ED8' : '#6B7280' }}>{d.count} 件</Text>
                    </View>
                    {today ? <View style={{ position: 'absolute', right: -4, top: -4, width: 8, height: 8, borderRadius: 9999, backgroundColor: '#3B82F6' }} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {/* Upcoming cards */}
          {selectedDateIso && selectedDayStages.length > 0 ? (
            <View style={{ marginTop: 10, gap: 8 }}>
              {selectedDayStages.map(({ company, stage }) => {
                const isUrl = !!(stage.location && /^https?:\/\//.test(stage.location));
                return (
                  <View key={stage.id} style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 10, maxWidth: 520 }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <View style={{ width: 24, height: 24, borderRadius: 9999, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' }}>
                        <Calendar size={14} color="#1D4ED8" />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ fontSize: 11, color: '#6B7280' }}>{stage.date}{stage.time ? ` ${stage.time}` : ''}</Text>
                        <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>{company.name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text numberOfLines={1} style={{ fontSize: 12, color: '#374151', flexShrink: 1 }}>{stage.name}</Text>
                          {isUrl ? (
                            <Pressable onPress={() => stage.location && Linking.openURL(stage.location!)} style={{ flexDirection: 'row', alignItems: 'center' }} accessibilityLabel="面接URLを開く">
                              <Text style={{ fontSize: 12, color: '#2563EB', textDecorationLine: 'underline' }}>面接URL</Text>
                              <ExternalLink size={12} color="#2563EB" />
                            </Pressable>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}
          {selectedDateIso && selectedDayStages.length === 0 ? (
            <View style={{ marginTop: 10 }}>
              <Text style={{ fontSize: 12, color: '#6B7280' }}>この日の予定はありません</Text>
            </View>
          ) : null}
          {!selectedDateIso ? (
            <View style={{ marginTop: 6 }}>
              <Text style={{ fontSize: 12, color: '#6B7280' }}>見たい日付をタップすると予定が表示されます</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* リスト */}
      <View style={{ flex: 1, padding: 12 }}>
        {filtered.length === 0 ? (
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderWidth: 1,
              borderColor: "#E5E7EB",
              borderRadius: 12,
              padding: 16,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontWeight: "700", fontSize: 16, marginBottom: 6 }}>
              企業がありません
            </Text>
            <Text style={{ color: "#6B7280" }}>
              {searchQuery || statusFilter !== "all" || priorityFilter !== "all"
                ? "検索条件に一致する企業が見つかりません"
                : "右上の＋から企業を追加しましょう"}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <CompanyCard item={item} />}
            contentContainerStyle={{ paddingBottom: 24 }}
          />
        )}
      </View>

      {/* 企業編集（ポップアップ） - リスト外 */}
      <Modal
        visible={editOpen}
        animationType="slide"
        transparent
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onRequestClose={() => {
          setEditOpen(false);
          setEditTarget(null);
          setShowDatePicker(false);
          setShowTimePicker(false);
        }}
        onDismiss={() => {
          setShowDatePicker(false);
          setShowTimePicker(false);
        }}
      >
        <View
          pointerEvents="box-none"
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.2)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: "#fff",
              padding: 16,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              maxHeight: "90%",
            }}
          >
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 120 }}>
              <Text style={{ fontWeight: "700", fontSize: 16 }}>企業情報を編集</Text>
              <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 2 }}>
                企業情報と応募したポジションの詳細を編集してください。
              </Text>

              {[
                { k: "name", ph: "企業名 *" },
                { k: "jobTitle", ph: "職種 *" },
                { k: "industry", ph: "業界" },
                { k: "location", ph: "所在地" },
                { k: "salary", ph: "想定年収（例: 600-800（万円））" },
              ].map((f) => (
                <View
                  key={f.k}
                  style={{
                    backgroundColor: "#F3F4F6",
                    borderRadius: 10,
                    paddingHorizontal: 10,
                    paddingVertical: 10,
                    marginTop: 10,
                  }}
                >
                  <TextInput
                    placeholder={f.ph}
                    value={(editForm as any)[f.k]}
                    onChangeText={(t) => setEditForm((p) => ({ ...(p as any), [f.k]: t }))}
                    editable={true}
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                </View>
              ))}

              {/* マイページID & パスワード（編集） */}
              <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                <View style={{ flex: 1, backgroundColor: "#F3F4F6", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10 }}>
                  <TextInput
                    placeholder="マイページID"
                    value={editForm.accountId}
                    onChangeText={(t) => setEditForm((p) => ({ ...p, accountId: t }))}
                    editable={true}
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={async () => {
                      await Clipboard.setStringAsync(editForm.accountId || "");
                      Alert.alert("コピーしました", "マイページIDをコピーしました");
                    }}
                    accessibilityLabel="IDをコピー"
                    style={{ alignSelf: 'flex-start', marginTop: 6, padding: 6, borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' }}
                  >
                    <CopyIcon size={16} color="#374151" />
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1, backgroundColor: "#F3F4F6", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10 }}>
                  <TextInput
                    placeholder="マイページパスワード"
                    value={editForm.password}
                    onChangeText={(t) => setEditForm((p) => ({ ...p, password: t }))}
                    secureTextEntry
                    editable={true}
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={async () => {
                      await Clipboard.setStringAsync(editForm.password || "");
                      Alert.alert("コピーしました", "マイページパスワードをコピーしました");
                    }}
                    accessibilityLabel="パスワードをコピー"
                    style={{ alignSelf: 'flex-start', marginTop: 6, padding: 6, borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' }}
                  >
                    <CopyIcon size={16} color="#374151" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* サイトURL（編集） */}
              <View style={{ backgroundColor: "#F3F4F6", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10, marginTop: 10 }}>
                <TextInput
                  placeholder="サイトURL"
                  value={editForm.siteUrl}
                  onChangeText={(t) => setEditForm((p) => ({ ...p, siteUrl: t }))}
                  editable={true}
                  autoCorrect={false}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={async () => {
                    await Clipboard.setStringAsync(editForm.siteUrl || "");
                    Alert.alert("コピーしました", "サイトURLをコピーしました");
                  }}
                  accessibilityLabel="サイトURLをコピー"
                  style={{ alignSelf: 'flex-start', marginTop: 6, padding: 6, borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' }}
                >
                  <CopyIcon size={16} color="#374151" />
                </TouchableOpacity>
              </View>

              {/* タグ */}
              <View
                style={{
                  backgroundColor: "#F3F4F6",
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 10,
                  marginTop: 10,
                }}
              >
                <TextInput
                  placeholder="タグ（カンマ区切り）"
                  value={editForm.tags}
                  onChangeText={(t) => setEditForm((p) => ({ ...p, tags: t }))}
                  editable={true}
                  autoCorrect={false}
                  autoCapitalize="none"
                />
              </View>

              {/* 優先度（3択） */}
              <View style={{ marginTop: 10 }}>
                <Text style={{ fontSize: 12, color: "#6B7280" }}>優先度</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {(["high", "medium", "low"] as const).map((v) => (
                    <TouchableOpacity
                      key={v}
                      onPress={() => setEditForm((p) => ({ ...p, priority: v }))}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        borderRadius: 9999,
                        borderWidth: 1,
                        borderColor: editForm.priority === v ? "#2563EB" : "#E5E7EB",
                        backgroundColor: editForm.priority === v ? "#DBEAFE" : "#FFFFFF",
                        marginRight: 8,
                        marginTop: 8,
                      }}
                    >
                      <Text style={{ fontSize: 12 }}>{PRIORITY_LABEL[v]}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* 職務内容 / メモ */}
              <View
                style={{
                  backgroundColor: "#F3F4F6",
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 10,
                  marginTop: 10,
                  minHeight: 80,
                }}
              >
                <TextInput
                  placeholder="職務内容"
                  value={editForm.description}
                  onChangeText={(t) => setEditForm((p) => ({ ...p, description: t }))}
                  multiline
                  editable={true}
                  autoCorrect={false}
                />
              </View>

              <View
                style={{
                  backgroundColor: "#F3F4F6",
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 10,
                  marginTop: 10,
                  minHeight: 80,
                }}
              >
                <TextInput
                  placeholder="メモ"
                  value={editForm.notes}
                  onChangeText={(t) => setEditForm((p) => ({ ...p, notes: t }))}
                  multiline
                  editable={true}
                  autoCorrect={false}
                />
              </View>
            </ScrollView>
            {/* Sticky footer: always visible buttons */}
            <View
              style={{
                position: "absolute",
                left: 16,
                right: 16,
                bottom: 16 + (Platform.OS === 'ios' ? 8 : 0),
                flexDirection: "row",
                gap: 8,
              }}
              pointerEvents="box-none"
            >
              <TouchableOpacity
                onPress={() => {
                  setEditOpen(false);
                  setEditTarget(null);
                  setShowDatePicker(false);
                  setShowTimePicker(false);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: "#FFFFFF",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  alignItems: "center",
                }}
              >
                <Text>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleUpdateCompany}
                disabled={!editForm.name.trim() || !editForm.jobTitle.trim()}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor:
                    !editForm.name.trim() || !editForm.jobTitle.trim()
                      ? "#93C5FD"
                      : "#2563EB",
                  alignItems: "center",
                }}
                activeOpacity={0.8}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>更新</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 企業詳細（ポップアップ）- 共有モーダル（リスト外） */}
      <Modal
        visible={detailOpen}
        animationType="slide"
        transparent
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onRequestClose={() => {
          setDetailOpen(false);
          setShowDatePicker(false);
          setShowTimePicker(false);
        }}
        onDismiss={() => {
          setShowDatePicker(false);
          setShowTimePicker(false);
        }}
      >
        <View
          pointerEvents="box-none"
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.2)", justifyContent: "flex-end" }}>
          <View
            pointerEvents="box-none"
            style={{
              backgroundColor: "#fff",
              padding: 16,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              maxHeight: "92%",
            }}
          >
            {/* ヘッダ */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text numberOfLines={1} style={{ fontWeight: "800", fontSize: 18 }}>
                  {detailTarget?.name ?? ""}
                </Text>
                <Text numberOfLines={1} style={{ color: "#6B7280", marginTop: 2 }}>
                  {(detailTarget?.industry || "-") + " ・ " + (detailTarget?.jobDetails.title || "-")}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  if (!detailTarget) return;
                  setEditTarget(detailTarget);
                  const specialId = detailTarget.tags?.find((t) => t.startsWith("__id:"))?.replace("__id:", "") || "";
                  const specialPw = detailTarget.tags?.find((t) => t.startsWith("__pw:"))?.replace("__pw:", "") || "";
                  const specialUrl = detailTarget.tags?.find((t) => t.startsWith("__url:"))?.replace("__url:", "") || "";
                  const visibleTags = (detailTarget.tags || []).filter((t) => !t.startsWith("__")).join(",");
                  setEditForm({
                    id: detailTarget.id,
                    name: detailTarget.name,
                    industry: detailTarget.industry || "",
                    size: detailTarget.size,
                    location: detailTarget.location || "",
                    priority: detailTarget.priority,
                    jobTitle: detailTarget.jobDetails.title || "",
                    salary: detailTarget.jobDetails.salary || "",
                    description: detailTarget.jobDetails.description || "",
                    notes: detailTarget.notes || "",
                    tags: visibleTags,
                    accountId: specialId,
                    password: specialPw,
                    siteUrl: specialUrl,
                  });
                  setDetailOpen(false);
                  // wait for iOS to fully dismiss before opening next modal
                  setTimeout(() => {
                    setEditOpen(true);
                  }, 250);
                }}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: "#F3F4F6",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                }}
              >
                <Text style={{ fontWeight: "700" }}>編集</Text>
              </TouchableOpacity>
            </View>

            {/* タブ */}
            <View
              style={{
                flexDirection: "row",
                marginTop: 12,
                backgroundColor: "#F3F4F6",
                borderRadius: 8,
                padding: 4,
              }}
            >
              {[
                { key: "stages", label: "選考段階" },
                { key: "notes", label: "メモ" },
                { key: "overview", label: "概要" },
              ].map((t) => (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => setDetailTab(t.key as any)}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    alignItems: "center",
                    borderRadius: 6,
                    backgroundColor: detailTab === t.key ? "#FFFFFF" : "transparent",
                    borderWidth: detailTab === t.key ? 1 : 0,
                    borderColor: "#E5E7EB",
                  }}
                >
                  <Text style={{ fontWeight: "600", fontSize: 12 }}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 本文 */}
            <ScrollView style={{ marginTop: 12 }} contentContainerStyle={{ paddingBottom: 20 }}>
              {detailTab === "overview" && detailTarget ? (
                <View>
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: "#FFFFFF",
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                        borderRadius: 12,
                        padding: 12,
                      }}
                    >
                      <Text style={{ fontWeight: "700", marginBottom: 8 }}>企業情報</Text>
                      <View style={{ gap: 8 }}>
                        <Row label="業界" value={detailTarget.industry || "-"} />
                        <Row label="規模" value={sizeToLabel(detailTarget.size)} />
                        <Row label="所在地" value={detailTarget.location || "-"} />
                        <Row label="応募日" value={detailTarget.appliedDate || "-"} />
                        {(() => {
                          const tag = detailTarget.tags?.find((t) => t.startsWith("__url:"));
                          const rawUrl = tag ? tag.replace("__url:", "") : "";
                          const url = rawUrl && !/^https?:\/\//i.test(rawUrl) ? `https://${rawUrl}` : rawUrl;
                          return (
                            <View style={{ flexDirection: "row" }}>
                              <Text style={{ width: 72, color: "#6B7280", fontSize: 12 }}>サイト:</Text>
                              {url ? (
                                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                                  <TouchableOpacity onPress={() => Linking.openURL(url)} style={{ flex: 1 }}>
                                    <Text numberOfLines={1} style={{ color: "#2563EB", fontSize: 12, textDecorationLine: "underline" }}>{rawUrl}</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    onPress={async () => {
                                      await Clipboard.setStringAsync(rawUrl);
                                      Alert.alert("コピーしました", "サイトURLをコピーしました");
                                    }}
                                    accessibilityLabel="サイトURLをコピー"
                                    style={{ marginLeft: 8, padding: 6, borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' }}
                                  >
                                    <CopyIcon size={16} color="#374151" />
                                  </TouchableOpacity>
                                </View>
                              ) : (
                                <Text style={{ flex: 1, color: "#111827", fontSize: 12 }}>-</Text>
                              )}
                            </View>
                          );
                        })()}
                      </View>
                    </View>
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: "#FFFFFF",
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                        borderRadius: 12,
                        padding: 12,
                      }}
                    >
                      <Text style={{ fontWeight: "700", marginBottom: 8 }}>職務情報</Text>
                      <View style={{ gap: 8 }}>
                        <Row label="職種" value={detailTarget.jobDetails.title || "-"} />
                        <Row label="職務内容" value={detailTarget.jobDetails.description || "-"} />
                      </View>
                    </View>
                  </View>
                </View>
              ) : null}

              {detailTab === "stages" && detailTarget ? (
                <View>
                  <View style={{ flexDirection: "row", justifyContent: "flex-end", marginBottom: 8 }}>
                    <Pressable
                      pointerEvents="auto"
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => {
                        // Reset transient states and close the underlying detail modal first (iOS nested Modal touch fix)
                        setShowDatePicker(false);
                        setShowTimePicker(false);
                        setStageEditing(null);
                        setStageForm({ name: "", status: "scheduled", date: "", time: "", location: "", interviewer: "", rating: 0, feedback: "", notes: "" });
                        setDetailOpen(false);
                        setTimeout(() => {
                          setStageEditOpen(true);
                        }, 250);
                      }}
                      style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: "#2563EB" }}
                    >
                      <Text style={{ color: "#fff", fontWeight: "700" }}>＋ 追加</Text>
                    </Pressable>
                  </View>
                  {detailTarget.stages.length === 0 ? (
                    <Text style={{ color: "#6B7280" }}>選考段階の記録はありません</Text>
                  ) : (
                    detailTarget.stages.map((s) => (
                      <View
                        key={s.id}
                        pointerEvents="box-none"
                        style={{
                          backgroundColor: "#FFFFFF",
                          borderWidth: 1,
                          borderColor: "#E5E7EB",
                          borderRadius: 12,
                          padding: 12,
                          marginBottom: 8,
                        }}
                      >
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                          <Text style={{ fontWeight: "700" }}>{s.name}</Text>
                          <View style={{ flexDirection: "row", gap: 8, zIndex: 1 }} pointerEvents="box-none">
                            <Pressable
                              pointerEvents="auto"
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              onPress={() => {
                                // iOS nested Modal touch fix: close the underlying detail modal before opening the editor
                                setShowDatePicker(false);
                                setShowTimePicker(false);
                                setStageEditing(s);
                                setStageForm({
                                  name: s.name || "",
                                  status: s.status,
                                  date: s.date || "",
                                  time: s.time || "",
                                  location: s.location || "",
                                  interviewer: s.interviewer || "",
                                  rating: typeof s.rating === 'number' ? s.rating : 0,
                                  feedback: s.feedback || "",
                                  notes: s.notes || "",
                                });
                                // Close the detail modal first so touches are not eaten by the underlay on iOS
                                setDetailOpen(false);
                                setTimeout(() => {
                                  setStageEditOpen(true);
                                }, 250);
                              }}
                              style={{ paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB" }}
                            >
                              <Text style={{ fontSize: 12 }}>編集</Text>
                            </Pressable>
                            <Pressable
                              pointerEvents="auto"
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              onPress={() => handleDeleteStage(s.id)}
                              style={{ paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA" }}
                            >
                              <Text style={{ fontSize: 12, color: "#B91C1C" }}>削除</Text>
                            </Pressable>
                          </View>
                        </View>
                        <Text style={{ color: "#6B7280", marginTop: 4 }}>
                          {s.date || "-"} {s.time || ""}
                        </Text>
                        {s.feedback ? (
                          <Text style={{ marginTop: 8 }}>FB: {s.feedback}</Text>
                        ) : null}
                        {s.notes ? (
                          <Text style={{ marginTop: 6 }}>メモ: {s.notes}</Text>
                        ) : null}
                        {!s.feedback && !s.notes ? (
                          <Text style={{ marginTop: 8, color: "#9CA3AF" }}>メモはありません</Text>
                        ) : null}
                      </View>
                    ))
                  )}
                </View>
              ) : null}

              {detailTab === "notes" && detailTarget ? (
                <View
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  <Text style={{ fontWeight: "700", marginBottom: 8 }}>メモ</Text>
                  <Text style={{ color: "#374151" }}>
                    {detailTarget.notes?.trim() ? detailTarget.notes : "メモはありません"}
                  </Text>
                </View>
              ) : null}
            </ScrollView>

            {/* フッター（閉じる） */}
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                onPress={() => {
                  setDetailOpen(false);
                  setShowDatePicker(false);
                  setShowTimePicker(false);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: "#FFFFFF",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  alignItems: "center",
                }}
              >
                <Text>閉じる</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 選考段階 編集モーダル */}
      <Modal
        visible={stageEditOpen}
        animationType="slide"
        transparent
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onRequestClose={() => {
          setStageEditOpen(false);
          setStageEditing(null);
          setShowDatePicker(false);
          setShowTimePicker(false);
        }}
        onDismiss={() => {
          setShowDatePicker(false);
          setShowTimePicker(false);
        }}
      >
        <View
          pointerEvents="box-none"
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.2)", justifyContent: "flex-end" }}>
          <View pointerEvents="box-none" style={{ backgroundColor: "#fff", padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: "88%" }}>
            <Text style={{ fontWeight: "700", fontSize: 16 }}>{stageEditing ? "選考段階を編集" : "選考段階を追加"}</Text>

            {/* 段階名 + 状況 */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <View style={{ flex: 1, backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10 }}>
                <TextInput
                  placeholder="段階名（例: 一次面接）"
                  value={stageForm.name}
                  onChangeText={(t) => setStageForm((p) => ({ ...p, name: t }))}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>状況</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {([
                    { v: 'pending', l: '待機中' },
                    { v: 'scheduled', l: '予定' },
                    { v: 'passed', l: '通過' },
                    { v: 'failed', l: '不通過' },
                  ] as const).map(({ v, l }) => (
                    <TouchableOpacity
                      key={v}
                      onPress={() => setStageForm((p) => ({ ...p, status: v }))}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        borderRadius: 9999,
                        borderWidth: 1,
                        borderColor: stageForm.status === v ? '#2563EB' : '#E5E7EB',
                        backgroundColor: stageForm.status === v ? '#DBEAFE' : '#FFFFFF',
                        marginRight: 8,
                      }}
                    >
                      <Text style={{ fontSize: 12 }}>{l}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* 日付 + 時間 */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              {/* 日付 */}
              <View style={{ flex: 1, backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10 }}>
                <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>日付</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TextInput
                    placeholder="YYYY-MM-DD"
                    value={stageForm.date}
                    onChangeText={(t) => setStageForm((p) => ({ ...p, date: t }))}
                    style={{ flex: 1 }}
                  />
                  <TouchableOpacity onPress={() => setShowDatePicker(true)} accessibilityLabel="日付を選択">
                    <Calendar size={18} color="#374151" />
                  </TouchableOpacity>
                </View>
              </View>
              {/* 時間 */}
              <View style={{ flex: 1, backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10 }}>
                <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>時間</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TextInput
                    placeholder="HH:mm"
                    value={stageForm.time}
                    onChangeText={(t) => setStageForm((p) => ({ ...p, time: t }))}
                    style={{ flex: 1 }}
                  />
                  <TouchableOpacity onPress={() => setShowTimePicker(true)} accessibilityLabel="時間を選択">
                    <Clock size={18} color="#374151" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            {showDatePicker && (
              <>
                <DateTimePicker
                  value={stageForm.date ? new Date(stageForm.date + 'T' + (stageForm.time || '00:00')) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(e, d) => {
                    if (Platform.OS !== 'ios') setShowDatePicker(false);
                    if (!d) return;
                    setStageForm((p) => ({ ...p, date: formatDate(d) }));
                  }}
                  style={Platform.OS === 'web' ? { position: 'absolute', opacity: 0, width: 1, height: 1 } : undefined}
                />
                {Platform.OS === 'ios' && showDatePicker ? (
                  <TouchableOpacity onPress={() => setShowDatePicker(false)} style={{ alignSelf: 'flex-end', paddingVertical: 8 }}>
                    <Text style={{ color: '#2563EB', fontWeight: '600' }}>完了</Text>
                  </TouchableOpacity>
                ) : null}
              </>
            )}
            {showTimePicker && (
              <>
                <DateTimePicker
                  value={stageForm.time && stageForm.date ? new Date(stageForm.date + 'T' + stageForm.time) : new Date()}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(e, d) => {
                    if (Platform.OS !== 'ios') setShowTimePicker(false);
                    if (!d) return;
                    setStageForm((p) => ({ ...p, time: formatTime(d) }));
                  }}
                  style={Platform.OS === 'web' ? { position: 'absolute', opacity: 0, width: 1, height: 1 } : undefined}
                />
                {Platform.OS === 'ios' && showTimePicker ? (
                  <TouchableOpacity onPress={() => setShowTimePicker(false)} style={{ alignSelf: 'flex-end', paddingVertical: 8 }}>
                    <Text style={{ color: '#2563EB', fontWeight: '600' }}>完了</Text>
                  </TouchableOpacity>
                ) : null}
              </>
            )}

            {/* 場所 + 面接官 */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <View style={{ flex: 1, backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10 }}>
                <TextInput
                  placeholder="場所"
                  value={stageForm.location}
                  onChangeText={(t) => setStageForm((p) => ({ ...p, location: t }))}
                />
              </View>
              <View style={{ flex: 1, backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10 }}>
                <TextInput
                  placeholder="面接官"
                  value={stageForm.interviewer}
                  onChangeText={(t) => setStageForm((p) => ({ ...p, interviewer: t }))}
                />
              </View>
            </View>

            {/* 評価（0-5） */}
            <View style={{ marginTop: 10 }}>
              <Text style={{ fontSize: 12, color: '#6B7280' }}>評価 (1-5)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {([
                  { v: 0, l: '未評価' },
                  { v: 1, l: '1' },
                  { v: 2, l: '2' },
                  { v: 3, l: '3' },
                  { v: 4, l: '4' },
                  { v: 5, l: '5' },
                ] as const).map(({ v, l }) => (
                  <TouchableOpacity
                    key={v}
                    onPress={() => setStageForm((p) => ({ ...p, rating: v }))}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      borderRadius: 9999,
                      borderWidth: 1,
                      borderColor: stageForm.rating === v ? '#2563EB' : '#E5E7EB',
                      backgroundColor: stageForm.rating === v ? '#DBEAFE' : '#FFFFFF',
                      marginRight: 8,
                      marginTop: 8,
                    }}
                  >
                    <Text style={{ fontSize: 12 }}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* フィードバック */}
            <View style={{ backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10, marginTop: 10, minHeight: 80 }}>
              <TextInput
                placeholder="選考結果やフィードバックを入力..."
                value={stageForm.feedback}
                onChangeText={(t) => setStageForm((p) => ({ ...p, feedback: t }))}
                multiline
              />
            </View>

            {/* メモ */}
            <View style={{ backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10, marginTop: 10, minHeight: 80 }}>
              <TextInput
                placeholder="面接の感想、準備内容など..."
                value={stageForm.notes}
                onChangeText={(t) => setStageForm((p) => ({ ...p, notes: t }))}
                multiline
              />
            </View>

            <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
              <TouchableOpacity
                onPress={() => {
                  setStageEditOpen(false);
                  setStageEditing(null);
                  setShowDatePicker(false);
                  setShowTimePicker(false);
                }}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB", alignItems: "center" }}
              >
                <Text>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  // Dismiss pickers before saving to avoid overlay consuming touches on iOS
                  if (Platform.OS === 'ios') {
                    setShowDatePicker(false);
                    setShowTimePicker(false);
                  }
                  handleSaveStage();
                }}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: "#2563EB", alignItems: "center" }}
                activeOpacity={0.8}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* フィルター・並び替え（簡易モーダル） */}
      <Modal
        visible={filterSheetOpen}
        animationType="slide"
        transparent
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onRequestClose={() => {
          setFilterSheetOpen(false);
          setShowDatePicker(false);
          setShowTimePicker(false);
        }}
        onDismiss={() => {
          setShowDatePicker(false);
          setShowTimePicker(false);
        }}
      >
        <View
          pointerEvents="box-none"
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.2)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: "#fff",
              padding: 16,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              maxHeight: "80%",
            }}
          >
            <Text style={{ fontWeight: "700", fontSize: 16 }}>フィルター</Text>

            <View style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 12, color: "#6B7280" }}>選考状況</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {(["all", "applied", "in_progress", "final_interview", "offer", "rejected", "withdrawn"] as const).map(
                  (v) => (
                    <TouchableOpacity
                      key={v}
                      onPress={() => setStatusFilter(v)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        borderRadius: 9999,
                        borderWidth: 1,
                        borderColor: statusFilter === v ? "#2563EB" : "#E5E7EB",
                        backgroundColor: statusFilter === v ? "#DBEAFE" : "#FFFFFF",
                        marginRight: 8,
                        marginTop: 8,
                      }}
                    >
                      <Text style={{ fontSize: 12 }}>
                        {v === "all" ? "全て" : STATUS_LABEL[v as Company["status"]]}
                      </Text>
                    </TouchableOpacity>
                  ),
                )}
              </ScrollView>
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 12, color: "#6B7280" }}>優先度</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {(["all", "high", "medium", "low"] as const).map((v) => (
                  <TouchableOpacity
                    key={v}
                    onPress={() => setPriorityFilter(v)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      borderRadius: 9999,
                      borderWidth: 1,
                      borderColor: priorityFilter === v ? "#2563EB" : "#E5E7EB",
                      backgroundColor: priorityFilter === v ? "#DBEAFE" : "#FFFFFF",
                      marginRight: 8,
                      marginTop: 8,
                    }}
                  >
                    <Text style={{ fontSize: 12 }}>
                      {v === "all" ? "全て" : PRIORITY_LABEL[v as Company["priority"]]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 12, color: "#6B7280" }}>並び替え</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {([
                  { k: "date", name: "応募日" },
                  { k: "name", name: "企業名" },
                  { k: "priority", name: "優先度" },
                  { k: "status", name: "選考状況" },
                ] as const).map(({ k, name }) => (
                  <TouchableOpacity
                    key={k}
                    onPress={() => setSortBy(k)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      borderRadius: 9999,
                      borderWidth: 1,
                      borderColor: sortBy === k ? "#2563EB" : "#E5E7EB",
                      backgroundColor: sortBy === k ? "#DBEAFE" : "#FFFFFF",
                      marginRight: 8,
                      marginTop: 8,
                    }}
                  >
                    <Text style={{ fontSize: 12 }}>{name}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  onPress={() =>
                    setSortOrder((p) => (p === "asc" ? "desc" : "asc"))
                  }
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    borderRadius: 9999,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    backgroundColor: "#FFFFFF",
                    marginRight: 8,
                    marginTop: 8,
                  }}
                >
                  <Text style={{ fontSize: 12 }}>
                    {sortOrder === "asc" ? "昇順" : "降順"}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            <TouchableOpacity
              onPress={() => {
                setFilterSheetOpen(false);
                setShowDatePicker(false);
                setShowTimePicker(false);
              }}
              style={{
                marginTop: 16,
                backgroundColor: "#2563EB",
                paddingVertical: 12,
                borderRadius: 12,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>適用</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 企業追加（詳細フォーム） */}
      <Modal
        visible={addOpen}
        animationType="slide"
        transparent
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onRequestClose={() => {
          setAddOpen(false);
          setShowDatePicker(false);
          setShowTimePicker(false);
        }}
        onDismiss={() => {
          setShowDatePicker(false);
          setShowTimePicker(false);
        }}
      >
        <View
          pointerEvents="box-none"
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.2)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: "#fff",
              padding: 16,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              maxHeight: "90%",
            }}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 24 }}
            >
              <Text style={{ fontWeight: "700", fontSize: 16 }}>新しい企業を追加</Text>

              {/* 1. 企業名 */}
              <View
                style={{
                  backgroundColor: "#F3F4F6",
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 10,
                  marginTop: 12,
                }}
              >
                <Text style={{ fontSize: 12, color: "#374151" }}>企業名 <Text style={{ color: "#EF4444" }}>*</Text></Text>
                <TextInput
                  placeholder=""
                  value={form.name}
                  onChangeText={(t) => setForm((p) => ({ ...p, name: t }))}
                  style={{ marginTop: 2 }}
                />
              </View>

              {/* 2. 業界 */}
              <View
                style={{
                  backgroundColor: "#F3F4F6",
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 10,
                  marginTop: 12,
                }}
              >
                <Text style={{ fontSize: 12, color: "#374151" }}>業界</Text>
                <TextInput
                  placeholder="例: IT"
                  value={form.industry}
                  onChangeText={(t) => setForm((p) => ({ ...p, industry: t }))}
                  style={{ marginTop: 2 }}
                />
              </View>

              {/* 3. マイページID */}
              <View
                style={{
                  flexDirection: "row",
                  gap: 10,
                  marginTop: 12,
                }}
              >
                <View style={{ flex: 1, backgroundColor: "#F3F4F6", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10 }}>
                  <Text style={{ fontSize: 12, color: "#374151" }}>マイページID</Text>
                  <TextInput
                    placeholder="ID"
                    value={form.accountId || ""}
                    onChangeText={(t) => setForm((p) => ({ ...p, accountId: t }))}
                    style={{ marginTop: 2 }}
                  />
                </View>
                {/* 4. マイページパスワード */}
                <View style={{ flex: 1, backgroundColor: "#F3F4F6", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10 }}>
                  <Text style={{ fontSize: 12, color: "#374151" }}>マイページパスワード</Text>
                  <TextInput
                    placeholder="パスワード"
                    value={form.password || ""}
                    onChangeText={(t) => setForm((p) => ({ ...p, password: t }))}
                    style={{ marginTop: 2 }}
                    secureTextEntry
                  />
                </View>
              </View>

              {/* 5. サイトURL */}
              <View
                style={{
                  backgroundColor: "#F3F4F6",
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 10,
                  marginTop: 12,
                }}
              >
                <Text style={{ fontSize: 12, color: "#374151" }}>サイトURL</Text>
                <TextInput
                  placeholder="https://example.co.jp"
                  value={form.siteUrl || ""}
                  onChangeText={(t) => setForm((p) => ({ ...p, siteUrl: t }))}
                  style={{ marginTop: 2 }}
                  autoCapitalize="none"
                />
              </View>

              {/* 6. 企業規模 */}
              <View style={{ marginTop: 12 }}>
                <Text style={{ fontSize: 12, color: "#374151" }}>企業規模</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 2 }}>
                  {([
                    { v: "startup", l: "スタートアップ" },
                    { v: "sme", l: "中小" },
                    { v: "large", l: "大企業" },
                    { v: "megacorp", l: "メガベンチャー" },
                  ] as const).map(({ v, l }) => (
                    <TouchableOpacity
                      key={v}
                      onPress={() => setForm((p) => ({ ...p, size: v }))}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 9999,
                        borderWidth: 1,
                        borderColor: form.size === v ? "#2563EB" : "#E5E7EB",
                        backgroundColor: form.size === v ? "#DBEAFE" : "#FFFFFF",
                        marginRight: 8,
                        marginTop: 4,
                      }}
                    >
                      <Text style={{ fontSize: 12 }}>{l}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* 7. 職種 */}
              <View
                style={{
                  backgroundColor: "#F3F4F6",
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 10,
                  marginTop: 12,
                }}
              >
                <Text style={{ fontSize: 12, color: "#374151" }}>職種 <Text style={{ color: "#EF4444" }}>*</Text></Text>
                <TextInput
                  placeholder="例: ソフトウェアエンジニア"
                  value={form.jobTitle}
                  onChangeText={(t) => setForm((p) => ({ ...p, jobTitle: t }))}
                  style={{ marginTop: 2 }}
                />
              </View>

              {/* 8. 優先度 */}
              <View style={{ marginTop: 12 }}>
                <Text style={{ fontSize: 12, color: "#374151" }}>優先度</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 2 }}>
                  {(["high", "medium", "low"] as const).map((v) => (
                    <TouchableOpacity
                      key={v}
                      onPress={() => setForm((p) => ({ ...p, priority: v }))}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 9999,
                        borderWidth: 1,
                        borderColor: form.priority === v ? "#2563EB" : "#E5E7EB",
                        backgroundColor: form.priority === v ? "#DBEAFE" : "#FFFFFF",
                        marginRight: 8,
                        marginTop: 4,
                      }}
                    >
                      <Text style={{ fontSize: 12 }}>{PRIORITY_LABEL[v]}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* 9. タグ */}
              <View
                style={{
                  backgroundColor: "#F3F4F6",
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 10,
                  marginTop: 12,
                }}
              >
                <Text style={{ fontSize: 12, color: "#374151" }}>タグ</Text>
                <TextInput
                  placeholder="カンマ区切りで入力（例: IT, グローバル, 大手）"
                  value={form.tags}
                  onChangeText={(t) => setForm((p) => ({ ...p, tags: t }))}
                  style={{ marginTop: 2 }}
                />
              </View>

              {/* 10. 職務内容 */}
              <View
                style={{
                  backgroundColor: "#F3F4F6",
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 10,
                  marginTop: 12,
                  minHeight: 80,
                }}
              >
                <Text style={{ fontSize: 12, color: "#374151" }}>職務内容</Text>
                <TextInput
                  placeholder=""
                  value={form.description}
                  onChangeText={(t) => setForm((p) => ({ ...p, description: t }))}
                  multiline
                  style={{ marginTop: 2, minHeight: 60, textAlignVertical: "top" }}
                />
              </View>

              {/* 11. メモ */}
              <View
                style={{
                  backgroundColor: "#F3F4F6",
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 10,
                  marginTop: 12,
                  minHeight: 80,
                }}
              >
                <Text style={{ fontSize: 12, color: "#374151" }}>メモ</Text>
                <TextInput
                  placeholder=""
                  value={form.notes}
                  onChangeText={(t) => setForm((p) => ({ ...p, notes: t }))}
                  multiline
                  style={{ marginTop: 2, minHeight: 60, textAlignVertical: "top" }}
                />
              </View>

              <View style={{ flexDirection: "row", gap: 8, marginTop: 18 }}>
                <TouchableOpacity
                  onPress={() => setAddOpen(false)}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 12,
                    backgroundColor: "#FFFFFF",
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    alignItems: "center",
                  }}
                >
                  <Text>キャンセル</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleAddCompany}
                  disabled={!form.name.trim() || !form.jobTitle.trim()}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 12,
                    backgroundColor: !form.name.trim() || !form.jobTitle.trim()
                      ? "#93C5FD"
                      : "#2563EB",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "700" }}>追加</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}