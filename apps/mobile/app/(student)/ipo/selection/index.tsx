"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  ActivityIndicator,
  SafeAreaView,
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
} from "lucide-react-native";
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
  });

  // 詳細モーダル
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<Company | null>(null);
  const [detailTab, setDetailTab] = useState<"overview" | "stages" | "notes">("overview");

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

  const stats = useMemo(() => ({
    total: companies.length,
    inProgress: companies.filter(
      (c) => c.status === "in_progress" || c.status === "final_interview",
    ).length,
    offers: companies.filter((c) => c.status === "offer").length,
    rejected: companies.filter((c) => c.status === "rejected").length,
    averageRating:
      companies.filter((c) => c.overallRating).length > 0
        ? Math.round(
            (companies
              .filter((c) => c.overallRating)
              .reduce((acc, c) => acc + (c.overallRating || 0), 0) /
              companies.filter((c) => c.overallRating).length) *
              10,
          ) / 10
        : 0,
  }), [companies]);

  // 企業情報の更新（編集モーダル）
  const handleUpdateCompany = useCallback(async () => {
    if (!editTarget) return;
    if (!editForm.name.trim() || !editForm.jobTitle.trim()) return;

    try {
      const nowDate = new Date().toISOString().split("T")[0];
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
          tags: editForm.tags ? editForm.tags.split(",").map((t) => t.trim()) : [],
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
                tags: editForm.tags ? editForm.tags.split(",").map((t) => t.trim()) : [],
              }
            : c,
        ),
      );

      setEditOpen(false);
      setEditTarget(null);
    } catch (e) {
      // 失敗してもローカル更新は反映
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
                tags: editForm.tags ? editForm.tags.split(",").map((t) => t.trim()) : [],
              }
            : c,
        ),
      );
      setEditOpen(false);
      setEditTarget(null);
    }
  }, [editForm, editTarget]);

  // 新規企業の追加
  const handleAddCompany = useCallback(async () => {
    if (!form.name.trim() || !form.jobTitle.trim()) return;
    const nowDate = new Date().toISOString().split("T")[0];
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
          tags: form.tags ? form.tags.split(",").map((t) => t.trim()) : [],
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
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()) : [],
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
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()) : [],
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
      <TouchableOpacity
        onPress={() => setFilterSheetOpen(false)}
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
            <View
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
            >
              <Icon size={14} color="#1F2937" />
              <Text style={{ marginLeft: 4, fontSize: 12 }}>
                {STATUS_LABEL[item.status]}
              </Text>
            </View>
            {/* 編集ボタン -> /ipo/selection/[id]/edit */}
            <TouchableOpacity
              onPress={() => {
                setEditTarget(item);
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
                  tags: item.tags?.join(",") || "",
                });
                setEditOpen(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="編集"
              style={{ padding: 6, marginRight: 6 }}
            >
              <Pencil size={16} color="#374151" />
            </TouchableOpacity>
      {/* 企業編集（ポップアップ） */}
      <Modal visible={editOpen} animationType="slide" transparent>
        <View
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
              { k: "tags", ph: "タグ（カンマ区切り）" },
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
                />
              </View>
            ))}

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
              />
            </View>

            <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
              <TouchableOpacity
                onPress={() => {
                  setEditOpen(false);
                  setEditTarget(null);
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
                  backgroundColor: !editForm.name.trim() || !editForm.jobTitle.trim()
                    ? "#93C5FD"
                    : "#2563EB",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>更新</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
            {/* 詳細（ポップアップ） */}
            <TouchableOpacity
              onPress={() => {
                setDetailTarget(item);
                setDetailTab("overview");
                setDetailOpen(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="詳細を見る"
              style={{ padding: 6 }}
            >
              <Eye size={16} color="#374151" />
            </TouchableOpacity>
        {/* 企業詳細（ポップアップ） */}
        <Modal visible={detailOpen} animationType="slide" transparent>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.2)", justifyContent: "flex-end" }}>
            <View
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
                {/* 右上：編集ショートカット */}
                <TouchableOpacity
                  onPress={() => {
                    if (!detailTarget) return;
                    setEditTarget(detailTarget);
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
                      tags: detailTarget.tags?.join(",") || "",
                    });
                    setDetailOpen(false);
                    setEditOpen(true);
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
                  { key: "overview", label: "概要" },
                  { key: "stages", label: "選考段階" },
                  { key: "notes", label: "メモ" },
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
                    {/* 2カラム風カード（縦積み） */}
                    <View style={{ flexDirection: "row", gap: 12 }}>
                      {/* 左：企業情報 */}
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
                        </View>
                      </View>

                      {/* 右：職務情報 */}
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
                    {detailTarget.stages.length === 0 ? (
                      <Text style={{ color: "#6B7280" }}>選考段階の記録はありません</Text>
                    ) : (
                      detailTarget.stages.map((s) => (
                        <View
                          key={s.id}
                          style={{
                            backgroundColor: "#FFFFFF",
                            borderWidth: 1,
                            borderColor: "#E5E7EB",
                            borderRadius: 12,
                            padding: 12,
                            marginBottom: 8,
                          }}
                        >
                          <Text style={{ fontWeight: "700" }}>{s.name}</Text>
                          <Text style={{ color: "#6B7280", marginTop: 4 }}>
                            {s.date || "-"} {s.time || ""}
                          </Text>
                          {s.feedback ? (
                            <Text style={{ marginTop: 8 }}>FB: {s.feedback}</Text>
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
                  onPress={() => setDetailOpen(false)}
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
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Building size={14} color="#6B7280" />
            <Text style={{ color: "#6B7280", marginLeft: 6, fontSize: 12 }}>
              {item.industry || "-"}
            </Text>
            <Text style={{ color: "#9CA3AF", marginHorizontal: 6, fontSize: 12 }}>・</Text>
            <Text style={{ color: "#6B7280", fontSize: 12 }}>
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
      </TouchableOpacity>
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
          <TouchableOpacity onPress={() => router.push("/ipo/dashboard" as Route)}>
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

      {/* ステータスカード（4分割グリッド／固定配置） */}
      <View style={{ paddingHorizontal: 12, paddingTop: 6 }}>
        {(() => {
          const items = [
            { key: "total",      label: "総応募数", value: stats.total,      Icon: Building,    tint: "#EFF6FF", iconColor: "#3B82F6", countColor: "#1D4ED8" },
            { key: "inProgress", label: "選考中",   value: stats.inProgress, Icon: Timer,       tint: "#FFF7ED", iconColor: "#F59E0B", countColor: "#B45309" },
            { key: "offer",      label: "内定",     value: stats.offers,     Icon: CheckCircle, tint: "#ECFDF5", iconColor: "#10B981", countColor: "#047857" },
            { key: "rejected",   label: "不合格",   value: stats.rejected,   Icon: XCircle,     tint: "#FEF2F2", iconColor: "#EF4444", countColor: "#B91C1C" },
          ] as const;

          return (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                marginHorizontal: -6,
              }}
            >
              {items.map(({ key, label, value, Icon, tint, iconColor, countColor }) => (
                <View key={key} style={{ width: "25%", paddingHorizontal: 6, marginBottom: 8 }}>
                  <View
                    style={{
                      height: 90,
                      backgroundColor: "#FFFFFF",
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                      borderRadius: 12,
                      paddingVertical: 10,
                      paddingHorizontal: 8,
                      alignItems: "center",
                      justifyContent: "center",
                      shadowColor: "#000",
                      shadowOpacity: 0.06,
                      shadowRadius: 8,
                      shadowOffset: { width: 0, height: 2 },
                    }}
                  >
                    {/* top icon */}
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: tint,
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 6,
                      }}
                    >
                      <Icon size={14} color={iconColor} />
                    </View>

                    {/* count */}
                    <Text
                      style={{
                        fontWeight: "700",
                        fontSize: 18,
                        lineHeight: 22,
                        color: countColor,
                      }}
                    >
                      {String(value)}
                    </Text>

                    {/* label */}
                    <Text
                      style={{
                        fontSize: 10,
                        color: "#6B7280",
                        marginTop: 2,
                      }}
                      numberOfLines={1}
                    >
                      {label}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          );
        })()}
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

      {/* フィルター・並び替え（簡易モーダル） */}
      <Modal visible={filterSheetOpen} animationType="slide" transparent>
        <View
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
              onPress={() => setFilterSheetOpen(false)}
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

      {/* 企業追加（簡易） */}
      <Modal visible={addOpen} animationType="slide" transparent>
        <View
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
              maxHeight: "85%",
            }}
          >
            <Text style={{ fontWeight: "700", fontSize: 16 }}>新しい企業を追加</Text>

            {[
              { k: "name", ph: "企業名 *" },
              { k: "jobTitle", ph: "職種 *" },
              { k: "industry", ph: "業界" },
              { k: "location", ph: "所在地" },
              { k: "salary", ph: "想定年収（例: 600-800万円）" },
              { k: "tags", ph: "タグ（カンマ区切り）" },
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
                  value={(form as any)[f.k]}
                  onChangeText={(t) => setForm((p) => ({ ...(p as any), [f.k]: t }))}
                />
              </View>
            ))}

            <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
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
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
