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


/* ------------------------------------------------------------------
   モバイル版 選考管理ページ
------------------------------------------------------------------- */
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
          tags: form.tags
            ? form.tags.split(",").map((t) => t.trim())
            : [],
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
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 8,
              backgroundColor: "#F3F4F6",
            }}
          >
            <Icon size={14} color="#111827" />
            <Text style={{ marginLeft: 4, fontSize: 12 }}>
              {STATUS_LABEL[item.status]}
            </Text>
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
              {item.industry}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ color: "#6B7280", fontSize: 12 }}>
              {PRIORITY_LABEL[item.priority]}
            </Text>
          </View>
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
              height: 6,
              borderRadius: 9999,
              backgroundColor: "#E5E7EB",
              overflow: "hidden",
              marginTop: 4,
            }}
          >
            <View
              style={{
                width: `${progress}%`,
                height: 6,
                borderRadius: 9999,
                backgroundColor: "#2563EB",
              }}
            />
          </View>
        </View>

        {/* フッタ */}
        <View
          style={{
            marginTop: 8,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#6B7280", fontSize: 12 }}>{item.lastUpdate}</Text>
          <Text style={{ color: "#111827", fontSize: 12 }}>詳細を見る ›</Text>
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
            paddingVertical: 8,
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

      {/* ステータスカード（横スクロール） */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ paddingHorizontal: 12, paddingTop: 12 }}
      >
        {[
          { label: "総応募数", value: stats.total, Icon: Building },
          { label: "選考中", value: stats.inProgress, Icon: Timer },
          { label: "内定", value: stats.offers, Icon: Award },
          { label: "不合格", value: stats.rejected, Icon: XCircle },
          { label: "平均評価", value: stats.averageRating, Icon: Star },
        ].map(({ label, value, Icon }, i) => (
          <View
            key={label}
            style={{
              width: 90,
              backgroundColor: "#FFFFFF",
              borderWidth: 1,
              borderColor: "#E5E7EB",
              borderRadius: 12,
              padding: 10,
              alignItems: "center",
              marginRight: 8,
            }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: "#F3F4F6",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 6,
              }}
            >
              <Icon size={16} color="#111827" />
            </View>
            <Text style={{ fontWeight: "700", fontSize: 18 }}>{String(value)}</Text>
            <Text style={{ fontSize: 12, color: "#4B5563", marginTop: 2 }}>
              {label}
            </Text>
          </View>
        ))}
      </ScrollView>

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
