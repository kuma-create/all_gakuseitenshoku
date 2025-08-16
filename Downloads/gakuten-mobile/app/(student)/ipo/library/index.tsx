"use client";
import React, { useCallback, useEffect, useMemo, useState, startTransition } from "react";
import { View, Text, TextInput, StyleSheet, FlatList, Pressable, Image, ActivityIndicator, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "src/lib/supabase";
import type { Database } from "@/lib/supabase/types";
import {
  Search as SearchIcon,
  TrendingUp,
  TrendingDown,
  Minus,
  Heart,
  ArrowLeft,
  MapPin,
  DollarSign,
  CheckCircle,
  BookOpen,
  Clock,
  Building,
  Briefcase,
  ChevronRight,
  AlertCircle,
  GraduationCap,
  Target,
  Home,
  Zap,
  Compass,
  Quote,
  User as UserIcon,
} from "lucide-react-native";
import { Picker } from "@react-native-picker/picker";


const makeIcon = (type: "industry" | "occupation") => {
  const IconComp = type === "industry" ? Building : Briefcase;
  return <IconComp size={24} />;
};

interface LibraryItem {
  id: string;
  name: string;
  type: "industry" | "occupation";
  icon: React.ReactNode;
  imageUrl?: string;
  description: string;
  tags: string[];
  popularity: number;
  trend: "up" | "stable" | "down";
  trendScore: number;
  isFavorite?: boolean;
  viewCount?: number;
  details: {
    overview: string;
    keySkills: string[];
    careerPath: Array<{
      level: string;
      title: string;
      experience: string;
      salary: string;
      description: string;
    }>;
    averageSalary: string;
    salaryRange: { min: number; max: number; median: number };
    workStyle: string[];
    companies: Array<{ name: string; type: string; size: string; logo?: string }>; 
    marketTrend: { growth: number; demand: number; future: string };
    education: { required: string[]; preferred: string[]; certifications: string[] };
    workEnvironment: { remote: number; flexibility: string; overtime: string; culture: string[] };
    regions: Array<{ name: string; jobCount: number; averageSalary: number }>;
    relatedFields: string[];
    dayInLife: string[];
    challenges: string[];
    rewards: string[];
    interviews: Array<{ name: string; role: string; company: string; quote: string; advice: string }>;
  };
}

interface UserData { favorites: string[]; searchHistory: string[] }

type FilterType = "all" | "industry" | "occupation";

type IpoLibraryItemRow = {
  id: string | number;
  name: string;
  type: "industry" | "occupation" | string;
  description: string | null;
  tags: string[] | null;
  popularity: number | null;
  trend: "up" | "stable" | "down" | null;
  trend_score: number | null;
  image_url?: string | null;
  details: any | null;
};

export default function LibraryScreen() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("all");
  const [sortBy, setSortBy] = useState<"trend" | "salary" | "name">("trend");
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null);
  const [selectedTab, setSelectedTab] = useState("overview");
  const [userData, setUserData] = useState<UserData>({ favorites: [], searchHistory: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthed, setIsAuthed] = useState(false);
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);

  // --- Auth bootstrap ---
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!mounted) return;
        if (data?.user?.id) {
          setUserId(data.user.id);
          setIsAuthed(true);
        } else {
          const stored = typeof window !== "undefined" ? localStorage.getItem("ipo-user-id") : null;
          if (stored) setUserId(stored);
          else {
            const newId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
            if (typeof window !== "undefined") localStorage.setItem("ipo-user-id", newId);
            setUserId(newId);
          }
          setIsAuthed(false);
        }
      } catch {
        const stored = typeof window !== "undefined" ? localStorage.getItem("ipo-user-id") : null;
        if (stored) setUserId(stored);
        else {
          const newId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
          if (typeof window !== "undefined") localStorage.setItem("ipo-user-id", newId);
          setUserId(newId);
        }
        setIsAuthed(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  // --- Fetch items ---
  useEffect(() => {
    let isMounted = true;
    setItemsLoading(true);
    (async () => {
      try {
        const { data, error } = await supabase.from("ipo_library_items").select("*");
        const rows = (data as unknown as IpoLibraryItemRow[]) ?? [];
        if (error) throw error;
        const mapped: LibraryItem[] = rows.map((row) => ({
          id: String(row.id),
          name: row.name,
          type: row.type === "industry" || row.type === "occupation" ? (row.type as any) : "industry",
          icon: makeIcon(row.type === "industry" || row.type === "occupation" ? (row.type as any) : "industry"),
          imageUrl: (row as any).image_url ?? (row as any)?.details?.image_url ?? undefined,
          description: row.description ?? "",
          tags: Array.isArray(row.tags) ? row.tags : [],
          popularity: Number(row.popularity ?? 0),
          trend: row.trend === "up" || row.trend === "stable" || row.trend === "down" ? (row.trend as any) : "stable",
          trendScore: Number(row.trend_score ?? 0),
          details: row.details ?? {
            overview: "",
            keySkills: [],
            careerPath: [],
            averageSalary: "",
            salaryRange: { min: 0, max: 0, median: 0 },
            workStyle: [],
            companies: [],
            marketTrend: { growth: 0, demand: 0, future: "" },
            education: { required: [], preferred: [], certifications: [] },
            workEnvironment: { remote: 0, flexibility: "", overtime: "", culture: [] },
            regions: [],
            relatedFields: [],
            dayInLife: [],
            challenges: [],
            rewards: [],
            interviews: [],
          },
        }));
        if (isMounted) setLibraryItems(mapped);
      } catch (e) {
        if (isMounted) setLibraryItems([]);
      } finally {
        if (isMounted) setItemsLoading(false);
      }
    })();
    return () => { isMounted = false };
  }, []);

  // --- Load user data (only when authed) ---
  useEffect(() => {
    if (!userId || !isAuthed || userId.startsWith("user_")) {
      setUserData({ favorites: [], searchHistory: [] });
      setLoading(false);
      return;
    }
    (async () => {
      try {
        setLoading(true);
        const { data: sbData } = await supabase
          .from("ipo_library_user_data")
          .select("favorites,search_history")
          .eq("user_id", userId)
          .maybeSingle();
        if (sbData) {
          setUserData({
            favorites: Array.isArray(sbData.favorites) ? (sbData.favorites as string[]) : [],
            searchHistory: Array.isArray(sbData.search_history) ? (sbData.search_history as string[]) : [],
          });
        } else {
          setUserData({ favorites: [], searchHistory: [] });
        }
      } catch {
        setUserData({ favorites: [], searchHistory: [] });
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, isAuthed]);

  const saveUserDataSupabase = async (payload: UserData) => {
    if (!isAuthed || !userId || userId.startsWith("user_")) return false;
    try {
      const { error } = await supabase
        .from("ipo_library_user_data")
        .upsert({ user_id: userId, favorites: payload.favorites, search_history: payload.searchHistory });
      if (error) throw error;
      return true;
    } catch {
      return false;
    }
  };

  const filteredAndSortedItems = useMemo(() => {
    let items = libraryItems.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q));
      const matchesFilter = selectedFilter === "all" || item.type === selectedFilter;
      return matchesSearch && matchesFilter;
    });
    items.sort((a, b) => {
      switch (sortBy) {
        case "trend":
          return b.trendScore - a.trendScore;
        case "salary":
          return (b.details.salaryRange.median || 0) - (a.details.salaryRange.median || 0);
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
    return items;
  }, [searchQuery, selectedFilter, sortBy, libraryItems]);

  const toggleFavorite = useCallback(
    async (itemId: string) => {
      try {
        setSaving(true);
        const isFav = userData.favorites.includes(itemId);
        const newFavs = isFav ? userData.favorites.filter((id) => id !== itemId) : [...userData.favorites, itemId];
        const newUserData = { ...userData, favorites: newFavs };
        setUserData(newUserData);
        await saveUserDataSupabase(newUserData);
      } finally {
        setSaving(false);
      }
    },
    [userData]
  );

  const handleItemClick = useCallback((item: LibraryItem) => {
    startTransition(() => {
      setSelectedItem(item);
      setSelectedTab("overview");
    });
  }, []);

  const getTrendIcon = (trend: "up" | "stable" | "down") => {
    switch (trend) {
      case "up":
        return <TrendingUp size={16} color="#16a34a" />;
      case "down":
        return <TrendingDown size={16} color="#dc2626" />;
      default:
        return <Minus size={16} color="#6b7280" />;
    }
  };

  const truncateText = (text: string, max = 120) => {
    if (!text) return "";
    return text.length > max ? text.slice(0, max) + "…" : text;
  };

  // ---------- Detail View ----------
  const DetailHeader = () => (
    <View style={styles.detailHeader}>
      <Pressable style={styles.backBtn} onPress={() => setSelectedItem(null)}>
        <ArrowLeft size={18} />
        <Text style={styles.backText}>戻る</Text>
      </Pressable>
      {selectedItem && (
        <Pressable
          style={styles.favBtn}
          onPress={() => toggleFavorite(selectedItem.id)}
          disabled={saving}
        >
          <Heart size={18} color={userData.favorites.includes(selectedItem.id) ? "#ef4444" : "#6b7280"} fill={userData.favorites.includes(selectedItem.id) ? "#ef4444" : "none"} />
          <Text style={styles.favText}>{userData.favorites.includes(selectedItem.id) ? "お気に入り済み" : "お気に入り"}</Text>
        </Pressable>
      )}
    </View>
  );

  const Stat = ({ label, value, color }: { label: string; value: string; color?: string }) => (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const ProgressBar = ({ value }: { value: number }) => (
    <View style={styles.progressOuter}>
      <View style={[styles.progressInner, { width: `${Math.max(0, Math.min(100, value))}%` }]} />
    </View>
  );

  const SectionHeader = ({ icon, title }: { icon?: React.ReactNode; title: string }) => (
    <View style={styles.sectionHeader}>
      {icon}
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  const TabButton = ({ id, label }: { id: string; label: string }) => (
    <Pressable style={[styles.tabBtn, selectedTab === id && styles.tabBtnActive]} onPress={() => setSelectedTab(id)}>
      <Text style={[styles.tabText, selectedTab === id && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );

  const renderDetailView = () => {
    if (!selectedItem) return null;
    const totalJobs = selectedItem.details.regions.reduce((s, r) => s + (r.jobCount || 0), 0).toLocaleString();
    const maxAvg = Math.max(1, ...selectedItem.details.regions.map((r) => r.averageSalary || 0));

    return (
      <ScrollView contentContainerStyle={styles.detailContainer}>
        <DetailHeader />

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroLeft}>
            <View style={styles.heroIcon}>{selectedItem.icon}</View>
            <View style={{ flex: 1 }}>
              <View style={styles.badgeRow}>
                <View style={styles.badge}><Text style={styles.badgeText}>{selectedItem.type === "industry" ? "業界" : "職種"}</Text></View>
                <View style={{ marginLeft: 8 }}>{getTrendIcon(selectedItem.trend)}</View>
                <Text style={styles.trendScore}>トレンドスコア: {selectedItem.trendScore}</Text>
              </View>
              <Text style={styles.heroTitle}>{selectedItem.name}</Text>
              <Text style={styles.heroDesc}>{selectedItem.description}</Text>
              <View style={styles.tagWrap}>
                {selectedItem.tags.map((t, i) => (
                  <View key={`${t}-${i}`} style={styles.tag}><Text style={styles.tagText}>{t}</Text></View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Stat label="平均年収" value={selectedItem.details.averageSalary} color="#2563eb" />
          <Stat label="リモート可能" value={`${selectedItem.details.workEnvironment.remote}%`} color="#16a34a" />
          <Stat label="求人数" value={String(totalJobs)} color="#7c3aed" />
          <Stat label="主要企業" value={`${selectedItem.details.companies.length}社`} color="#ea580c" />
        </View>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
          <TabButton id="overview" label="概要" />
          <TabButton id="career" label="キャリア" />
          <TabButton id="salary" label="年収" />
          <TabButton id="companies" label="企業" />
          <TabButton id="skills" label="スキル" />
          <TabButton id="work" label="働き方" />
          <TabButton id="regions" label="地域" />
          <TabButton id="interviews" label="インタビュー" />
        </ScrollView>

        {/* Tab Contents */}
        {selectedTab === "overview" && (
          <View style={styles.card}>
            <SectionHeader icon={<BookOpen size={18} />} title="業界・職種概要" />
            <Text style={styles.paragraph}>{selectedItem.details.overview}</Text>

            <View style={styles.cardDivider} />

            <SectionHeader icon={<TrendingUp size={18} />} title="市場トレンド" />
            <View style={{ marginTop: 8 }}>
              <View style={styles.rowBetween}><Text>成長性</Text><Text style={styles.bold}>{selectedItem.details.marketTrend.growth}%</Text></View>
              <ProgressBar value={selectedItem.details.marketTrend.growth} />
              <View style={[styles.rowBetween, { marginTop: 12 }]}><Text>需要</Text><Text style={styles.bold}>{selectedItem.details.marketTrend.demand}%</Text></View>
              <ProgressBar value={selectedItem.details.marketTrend.demand} />
              <View style={styles.sectionSpacer}>
                <Text style={styles.subheading}>将来予測</Text>
                <Text style={styles.small}>{selectedItem.details.marketTrend.future}</Text>
              </View>
            </View>

            <View style={styles.cardDivider} />
            <SectionHeader icon={<Clock size={18} />} title="1日の流れ" />
            {selectedItem.details.dayInLife.map((a, i) => (
              <View key={i} style={styles.bulletRow}><View style={styles.bulletDot} /><Text style={styles.small}>{a}</Text></View>
            ))}

            <View style={styles.cardDivider} />
            <SectionHeader title="やりがい・報酬" />
            {selectedItem.details.rewards.map((r, i) => (
              <View key={i} style={styles.iconRow}><CheckCircle size={16} color="#16a34a" /><Text style={styles.small}>{r}</Text></View>
            ))}

            <View style={styles.cardDivider} />
            <SectionHeader title="課題・困難" />
            {selectedItem.details.challenges.map((c, i) => (
              <View key={i} style={styles.iconRow}><AlertCircle size={16} color="#ea580c" /><Text style={styles.small}>{c}</Text></View>
            ))}
          </View>
        )}

        {selectedTab === "career" && (
          <View style={styles.card}>
            <SectionHeader icon={<Briefcase size={18} />} title="キャリアパス" />
            {selectedItem.details.careerPath.map((p, i) => (
              <View key={i} style={{ marginBottom: 16 }}>
                <View style={styles.rowBetween}>
                  <Text style={styles.bold}>{p.title}</Text>
                  <View style={styles.badge}><Text style={styles.badgeText}>{p.salary}</Text></View>
                </View>
                <Text style={styles.small}>{p.level} ・ {p.experience}</Text>
                <Text style={styles.paragraph}>{p.description}</Text>
              </View>
            ))}
          </View>
        )}

        {selectedTab === "salary" && (
          <View style={styles.card}>
            <SectionHeader icon={<DollarSign size={18} />} title="年収分布" />
            <View style={{ marginVertical: 8 }}>
              <View style={styles.rowBetween}><Text>最低</Text><Text style={styles.bold}>{selectedItem.details.salaryRange.min}万円</Text></View>
              <View style={styles.rowBetween}><Text>中央値</Text><Text style={[styles.bold, { color: "#2563eb" }]}>{selectedItem.details.salaryRange.median}万円</Text></View>
              <View style={styles.rowBetween}><Text>最高</Text><Text style={styles.bold}>{selectedItem.details.salaryRange.max}万円</Text></View>
              {/* Simple bar where width is median position */}
              <ProgressBar
                value={
                  ((selectedItem.details.salaryRange.median - selectedItem.details.salaryRange.min) /
                    Math.max(1, selectedItem.details.salaryRange.max - selectedItem.details.salaryRange.min)) * 100
                }
              />
            </View>

            <View style={styles.cardDivider} />
            <SectionHeader icon={<MapPin size={18} />} title="地域別年収" />
            {selectedItem.details.regions.map((r, i) => (
              <View key={i} style={styles.rowBetween}>
                <Text>{r.name}</Text>
                <Text style={styles.bold}>{r.averageSalary}万円</Text>
              </View>
            ))}
          </View>
        )}

        {selectedTab === "companies" && (
          <View style={styles.card}>
            <SectionHeader icon={<Building size={18} />} title="主要企業" />
            {selectedItem.details.companies.map((c, i) => (
              <View key={i} style={[styles.card, { padding: 12 }]}> 
                <Text style={styles.bold}>{c.name}</Text>
                <Text style={styles.small}>{c.type} ・ {c.size}</Text>
              </View>
            ))}
          </View>
        )}

        {selectedTab === "skills" && (
          <View style={styles.card}>
            <SectionHeader icon={<Target size={18} />} title="必要スキル" />
            {selectedItem.details.keySkills.map((s, i) => (
              <View key={i} style={styles.iconRow}><CheckCircle size={16} color="#16a34a" /><Text style={styles.small}>{s}</Text></View>
            ))}

            <View style={styles.cardDivider} />
            <SectionHeader icon={<GraduationCap size={18} />} title="学歴・資格" />
            <Text style={styles.subheading}>必須要件</Text>
            {selectedItem.details.education.required.map((req, i) => (
              <View key={i} style={styles.bulletRow}><View style={[styles.bulletDot, { backgroundColor: "#ef4444" }]} /><Text style={styles.small}>{req}</Text></View>
            ))}
            <Text style={styles.subheading}>優遇要件</Text>
            {selectedItem.details.education.preferred.map((pref, i) => (
              <View key={i} style={styles.bulletRow}><View style={[styles.bulletDot, { backgroundColor: "#3b82f6" }]} /><Text style={styles.small}>{pref}</Text></View>
            ))}
            <Text style={styles.subheading}>関連資格</Text>
            <View style={styles.tagWrap}>
              {selectedItem.details.education.certifications.map((cert, i) => (
                <View key={i} style={styles.tag}><Text style={styles.tagText}>{cert}</Text></View>
              ))}
            </View>
          </View>
        )}

        {selectedTab === "work" && (
          <View style={styles.card}>
            <SectionHeader icon={<Home size={18} />} title="働く環境" />
            <View style={styles.rowBetween}><Text>リモートワーク可能率</Text><Text style={styles.bold}>{selectedItem.details.workEnvironment.remote}%</Text></View>
            <ProgressBar value={selectedItem.details.workEnvironment.remote} />
            <Text style={styles.subheading}>柔軟性</Text>
            <Text style={styles.small}>{selectedItem.details.workEnvironment.flexibility}</Text>
            <Text style={styles.subheading}>残業時間</Text>
            <Text style={styles.small}>{selectedItem.details.workEnvironment.overtime}</Text>
            <Text style={styles.subheading}>企業文化</Text>
            <View style={styles.tagWrap}>
              {selectedItem.details.workEnvironment.culture.map((c, i) => (
                <View key={i} style={styles.tag}><Text style={styles.tagText}>{c}</Text></View>
              ))}
            </View>

            <View style={styles.cardDivider} />
            <SectionHeader icon={<Zap size={18} />} title="働き方の特徴" />
            {selectedItem.details.workStyle.map((w, i) => (
              <View key={i} style={styles.iconRow}><CheckCircle size={16} color="#3b82f6" /><Text style={styles.small}>{w}</Text></View>
            ))}
          </View>
        )}

        {selectedTab === "regions" && (
          <View style={styles.card}>
            <SectionHeader icon={<Compass size={18} />} title="地域別データ" />
            {selectedItem.details.regions.map((r, i) => (
              <View key={i} style={[styles.rowBetween, { marginVertical: 6 }]}>
                <Text style={styles.bold}>{r.name}</Text>
                <View style={{ width: 90 }}>
                  <ProgressBar value={(r.averageSalary / maxAvg) * 100} />
                </View>
              </View>
            ))}

            <View style={styles.cardDivider} />
            <SectionHeader title="関連分野" />
            <View style={styles.tagWrap}>
              {selectedItem.details.relatedFields.map((f, i) => (
                <View key={i} style={styles.tag}><Text style={styles.tagText}>{f}</Text></View>
              ))}
            </View>
          </View>
        )}

        {selectedTab === "interviews" && (
          <View style={styles.card}>
            {selectedItem.details.interviews.map((iv, i) => (
              <View key={i} style={[styles.card, { padding: 12 }]}> 
                <View style={styles.rowStart}>
                  <View style={styles.avatar}><UserIcon size={20} /></View>
                  <View style={{ marginLeft: 8 }}>
                    <Text style={styles.bold}>{iv.name}</Text>
                    <Text style={styles.small}>{iv.role} ・ {iv.company}</Text>
                  </View>
                </View>
                <View style={[styles.quoteRow]}> 
                  <Quote size={14} color="#60a5fa" />
                  <Text style={[styles.small, { fontStyle: "italic", marginLeft: 6 }]}>{iv.quote}</Text>
                </View>
                <View style={styles.adviceBox}>
                  <Text style={[styles.bold, { marginBottom: 4 }]}>💡 アドバイス</Text>
                  <Text style={styles.small}>{iv.advice}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  if (selectedItem) {
    return <View style={styles.screen}>{renderDetailView()}</View>;
  }

  // ---------- List (Grid on web) ----------
  return (
    <View style={styles.screen}>
      <FlatList
        data={itemsLoading ? [] : filteredAndSortedItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable onPress={() => handleItemClick(item)} style={styles.card}>
            <View style={styles.cardTopRow}>
              {item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.cardImage}
                  onError={() => { /* ignore, icon will remain */ }}
                />
              ) : null}
              <View style={[styles.iconSquare, !item.imageUrl ? {} : { display: "none" }]}>{item.icon}</View>
              <View style={{ flex: 1 }}>
                <View style={styles.badgeSmall}><Text style={styles.badgeSmallText}>{item.type === "industry" ? "業界" : "職種"}</Text></View>
                <Text style={styles.cardTitle}>{item.name}</Text>
              </View>
              <View style={styles.rowStart}>
                {getTrendIcon(item.trend)}
                <Pressable
                  style={styles.heartBtn}
                  onPress={() => toggleFavorite(item.id)}
                  disabled={saving || !isAuthed}
                >
                  <Heart size={18} color={userData.favorites.includes(item.id) ? "#ef4444" : "#9ca3af"} fill={userData.favorites.includes(item.id) ? "#ef4444" : "none"} />
                </Pressable>
              </View>
            </View>
            <Text style={styles.cardDesc}>{truncateText(item.description, 120)}</Text>
            <View style={styles.tagWrap}>
              {item.tags.slice(0, 3).map((t, i) => (
                <View key={`${t}-${i}`} style={styles.tag}><Text style={styles.tagText}>{t}</Text></View>
              ))}
              {item.tags.length > 3 && (
                <View style={styles.tag}><Text style={styles.tagText}>+{item.tags.length - 3}</Text></View>
              )}
            </View>
            <View style={styles.rightIcon}><ChevronRight size={16} color="#2563eb" /></View>
          </Pressable>
        )}
        ListHeaderComponent={
          <View>
            <Text style={styles.h1}>業界・職種ライブラリ</Text>
            <Text style={styles.subtitle}>500社以上の詳細データと社員インタビューで、あなたの理想のキャリアを見つけよう</Text>

            {/* Search & Filters */}
            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <SearchIcon size={18} color="#9ca3af" style={{ marginRight: 6 }} />
                <TextInput
                  placeholder="業界名・職種名・スキルで検索..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={styles.input}
                  returnKeyType="search"
                />
              </View>
              <View style={styles.pickersRow}>
                <View style={styles.pickerWrap}>
                  <Picker selectedValue={selectedFilter} onValueChange={(v) => setSelectedFilter(v)}>
                    <Picker.Item label="すべて" value="all" />
                    <Picker.Item label="業界" value="industry" />
                    <Picker.Item label="職種" value="occupation" />
                  </Picker>
                </View>
                <View style={styles.pickerWrap}>
                  <Picker selectedValue={sortBy} onValueChange={(v) => setSortBy(v)}>
                    <Picker.Item label="トレンド順" value="trend" />
                    <Picker.Item label="年収順" value="salary" />
                    <Picker.Item label="名前順" value="name" />
                  </Picker>
                </View>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          itemsLoading ? (
            <ActivityIndicator size="large" />
          ) : (
            <View style={{ alignItems: "center", paddingVertical: 32 }}>
              <AlertCircle size={48} color="#9ca3af" />
              <Text style={{ marginTop: 8, fontSize: 16 }}>検索結果が見つかりません</Text>
              <Text style={{ color: "#6b7280" }}>別のキーワードで検索してみてください</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  container: { padding: 16 },
  h1: { fontSize: 24, fontWeight: "700", color: "#111827", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#4b5563", marginBottom: 12 },
  searchRow: { marginBottom: 12 },
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: "#e5e7eb" },
  input: { flex: 1, fontSize: 14 },
  pickersRow: { flexDirection: "row", marginTop: 8, gap: 8 },
  pickerWrap: { flex: 1, backgroundColor: "#fff", borderRadius: 10, borderWidth: 1, borderColor: "#e5e7eb" },

  card: { backgroundColor: "#fff", borderRadius: 12, padding: 12, marginTop: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardTopRow: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 10 },
  cardImage: { width: 48, height: 48, borderRadius: 8, marginRight: 8 },
  iconSquare: { width: 48, height: 48, borderRadius: 8, backgroundColor: "#dbeafe", alignItems: "center", justifyContent: "center", marginRight: 8 },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#111827" },
  cardDesc: { color: "#4b5563", marginTop: 4 },
  heartBtn: { marginLeft: 8, padding: 4, borderRadius: 8 },
  rightIcon: { alignItems: "flex-end", marginTop: 8 },

  tagWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  tag: { backgroundColor: "#eff6ff", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { color: "#1d4ed8", fontSize: 12 },
  badgeSmall: { alignSelf: "flex-start", backgroundColor: "#f3f4f6", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 4 },
  badgeSmallText: { fontSize: 11, color: "#374151" },

  // Detail
  detailContainer: { padding: 16 },
  detailHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, backgroundColor: "#f3f4f6" },
  backText: { fontWeight: "600" },
  favBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb" },
  favText: { color: "#374151", fontSize: 12 },

  hero: { backgroundColor: "#1d4ed8", borderRadius: 12, padding: 16 },
  heroLeft: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  heroIcon: { width: 56, height: 56, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  badgeRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  badge: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { color: "#fff" },
  trendScore: { color: "#e5e7eb", marginLeft: 8 },
  heroTitle: { color: "#fff", fontSize: 22, fontWeight: "700", marginBottom: 4 },
  heroDesc: { color: "#e5e7eb" },

  statsRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 12, gap: 8 },
  statBox: { width: "48%", backgroundColor: "#fff", borderRadius: 10, padding: 12, alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "700" },
  statLabel: { color: "#6b7280", marginTop: 2 },

  tabsRow: { gap: 8, paddingVertical: 8 },
  tabBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: "#f3f4f6", marginRight: 8 },
  tabBtnActive: { backgroundColor: "#1d4ed8" },
  tabText: { color: "#374151", fontSize: 12 },
  tabTextActive: { color: "#fff", fontWeight: "600" },

  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  subheading: { fontWeight: "600", marginTop: 12 },
  paragraph: { color: "#374151", lineHeight: 20 },
  small: { color: "#4b5563" },
  bold: { fontWeight: "700" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowStart: { flexDirection: "row", alignItems: "center" },
  bulletRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#3b82f6" },
  iconRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  sectionSpacer: { marginTop: 12 },
  cardDivider: { height: 1, backgroundColor: "#e5e7eb", marginVertical: 12 },
  adviceBox: { backgroundColor: "#eff6ff", borderRadius: 10, padding: 10, marginTop: 8 },
  quoteRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#e5e7eb", alignItems: "center", justifyContent: "center" },
  progressOuter: { height: 8, backgroundColor: "#e5e7eb", borderRadius: 999, overflow: "hidden", marginTop: 6 },
  progressInner: { height: 8, backgroundColor: "#3b82f6" },
});
