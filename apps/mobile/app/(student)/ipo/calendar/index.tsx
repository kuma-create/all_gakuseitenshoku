import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Modal,
  ActivityIndicator,
  StyleSheet,
  Linking, Share, Platform,
} from 'react-native';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Bell,
  Users,
  Star,
  CheckCircle,
  AlertCircle,
  Zap,
  Briefcase,
  Coffee,
  BookOpen,
  Target,
  MessageSquare,
} from 'lucide-react-native';
import { supabase } from 'src/lib/supabase';

// ===== Types =====
interface CalendarEvent {
  id: string;
  title: string;
  type: 'deadline' | 'interview' | 'corporate_event' | 'seminar' | 'practice' | 'task' | 'networking';
  category: 'explanation' | 'gd_practice' | 'interview_practice' | 'industry_seminar' | 'career_talk' | 'networking' | 'workshop' | 'personal';
  date: string;
  time?: string;
  endTime?: string;
  location?: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  isPublic: boolean;
  maxParticipants?: number;
  currentParticipants: number;
  organizer: string;
  tags: string[];
  registrationDeadline?: string;
  requirements?: string[];
  benefits?: string[];
  targetAudience?: string;
  isRegistered?: boolean;
  registrationStatus?: 'open' | 'closed' | 'waitlist';
}

type DbEvent = {
  id: string | number;
  title: string;
  type: CalendarEvent['type'];
  category: CalendarEvent['category'];
  date: string;
  time?: string | null;
  end_time?: string | null;
  location?: string | null;
  description: string;
  priority: CalendarEvent['priority'];
  is_public: boolean;
  max_participants?: number | null;
  organizer: string;
  tags?: string[] | null;
  registration_deadline?: string | null;
  requirements?: string[] | null;
  benefits?: string[] | null;
  target_audience?: string | null;
  registration_status?: CalendarEvent['registrationStatus'] | null;
  user_id?: string | null;
};

type RegistrationRow = { event_id: number; user_id: string };

const EVENT_CATEGORIES: Record<CalendarEvent['category'], { label: string; icon: any; tint: string; chipBg: string }>
  = {
  explanation: { label: '企業説明会', icon: Briefcase, tint: '#2563eb', chipBg: '#dbeafe' },
  gd_practice: { label: 'GD練習会', icon: Users, tint: '#16a34a', chipBg: '#dcfce7' },
  interview_practice: { label: '面接練習', icon: MessageSquare, tint: '#7c3aed', chipBg: '#ede9fe' },
  industry_seminar: { label: '業界セミナー', icon: BookOpen, tint: '#4f46e5', chipBg: '#e0e7ff' },
  career_talk: { label: 'キャリアトーク', icon: Target, tint: '#ea580c', chipBg: '#ffedd5' },
  networking: { label: 'ネットワーキング', icon: Coffee, tint: '#db2777', chipBg: '#fce7f3' },
  workshop: { label: 'ワークショップ', icon: Zap, tint: '#ca8a04', chipBg: '#fef9c3' },
  personal: { label: '個人予定', icon: CalendarIcon, tint: '#6b7280', chipBg: '#f3f4f6' },
};

// ---- Calendar helpers ----
const pad2 = (n: number) => String(n).padStart(2, '0');
const ymdHisZ = (d: Date) => {
  const yyyy = d.getUTCFullYear();
  const MM = pad2(d.getUTCMonth() + 1);
  const DD = pad2(d.getUTCDate());
  const hh = pad2(d.getUTCHours());
  const mm = pad2(d.getUTCMinutes());
  const ss = pad2(d.getUTCSeconds());
  return `${yyyy}${MM}${DD}T${hh}${mm}${ss}Z`;
};
const buildGoogleCalendarUrl = (ev: CalendarEvent) => {
// Format as HH:MM, zero-padded
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  const start = new Date(ev.date);
  let dtStart = ymdHisZ(start);
  let dtEnd = ymdHisZ(new Date(start.getTime() + 60 * 60 * 1000));
  if (ev.time && /^\d{2}:\d{2}$/.test(ev.time)) {
    const [hh, mm] = ev.time.split(':').map(Number);
    start.setHours(hh, mm ?? 0, 0, 0);
    dtStart = ymdHisZ(new Date(start));
    if (ev.endTime && /^\d{2}:\d{2}$/.test(ev.endTime)) {
      const [eh, em] = ev.endTime.split(':').map(Number);
      const end = new Date(start);
      end.setHours(eh, em ?? 0, 0, 0);
      dtEnd = ymdHisZ(end);
    } else {
      dtEnd = ymdHisZ(new Date(start.getTime() + 60 * 60 * 1000));
    }
  } else {
    // all-day
    const s = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()));
    const e = new Date(s); e.setUTCDate(e.getUTCDate() + 1);
    dtStart = ymdHisZ(s);
    dtEnd = ymdHisZ(e);
  }
  const text = encodeURIComponent(ev.title || '無題の予定');
  const details = encodeURIComponent(ev.description || '');
  const location = encodeURIComponent(ev.location || '');
  const dates = `${dtStart}/${dtEnd}`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}&location=${location}`;
};
const escapeICS = (s: string) => (s || '').replace(/[\\;,\n]/g, (m) => ({'\\':'\\\\',';':'\\;',',':'\\,','\n':'\\n'} as any)[m]);
const buildICS = (ev: CalendarEvent) => {
  const startBase = new Date(ev.date);
  let start = new Date(startBase);
  let end = new Date(startBase);
  if (ev.time && /^\d{2}:\d{2}$/.test(ev.time)) {
    const [hh, mm] = ev.time.split(':').map(Number);
    start.setHours(hh, mm ?? 0, 0, 0);
  }
  if (ev.endTime && /^\d{2}:\d{2}$/.test(ev.endTime)) {
    const [eh, em] = ev.endTime.split(':').map(Number);
    end = new Date(start); end.setHours(eh, em ?? 0, 0, 0);
  } else if (ev.time) {
    end = new Date(start.getTime() + 60 * 60 * 1000);
  } else {
    start = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()));
    end = new Date(start); end.setUTCDate(end.getUTCDate() + 1);
  }
  const uid = `${ev.id || `tmp-${Date.now()}`}@ipo-calendar`;
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//IPO Calendar Mobile//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${ymdHisZ(new Date())}`,
    `DTSTART:${ymdHisZ(start)}`,
    `DTEND:${ymdHisZ(end)}`,
    `SUMMARY:${escapeICS(ev.title)}`,
    ev.location ? `LOCATION:${escapeICS(ev.location)}` : '',
    ev.description ? `DESCRIPTION:${escapeICS(ev.description)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
  return ics;
};
const openICS = async (ev: CalendarEvent) => {
  // Use a data URL so it opens in the default handler (Calendar) via browser
  const dataUrl = `data:text/calendar;charset=utf-8,${encodeURIComponent(buildICS(ev))}`;
  await Linking.openURL(dataUrl);
};
// ---------------------------

const TabValues = ['events', 'week', 'month'] as const;

type Tab = typeof TabValues[number];

export default function CalendarScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('events');
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'registered' | CalendarEvent['category']>('all');
  const [showDetail, setShowDetail] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  // Keep horizontal chip scroll position so it doesn't jump back to start on re-render
  const chipScrollRef = useRef<ScrollView | null>(null);
  const chipScrollX = useRef(0);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    category: 'personal' as CalendarEvent['category'],
    date: new Date().toISOString().slice(0,10),
    time: '',
    endTime: '',
    location: '',
    description: '',
    tagsText: '',
  });
  const [editMode, setEditMode] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showEditStartTimePicker, setShowEditStartTimePicker] = useState(false);
  const [showEditEndTimePicker, setShowEditEndTimePicker] = useState(false);

  const runIdle = (cb: () => void) => setTimeout(cb, 0);

  const mapRowToEvent = useCallback((row: DbEvent, isRegistered: boolean, currentParticipants: number): CalendarEvent => ({
    id: String(row.id),
    title: row.title,
    type: row.type,
    category: row.category,
    date: row.date,
    time: row.time ?? undefined,
    endTime: row.end_time ?? undefined,
    location: row.location ?? undefined,
    description: row.description,
    priority: row.priority,
    isPublic: row.is_public,
    maxParticipants: row.max_participants ?? undefined,
    currentParticipants,
    organizer: row.organizer,
    tags: row.tags ?? [],
    registrationDeadline: row.registration_deadline ?? undefined,
    requirements: row.requirements ?? undefined,
    benefits: row.benefits ?? undefined,
    targetAudience: row.target_audience ?? undefined,
    isRegistered,
    registrationStatus: (row.registration_status ?? 'open') as CalendarEvent['registrationStatus'],
  }), []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data: { user }, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;
        setAuthUserId(user?.id ?? null);

        const { data: rows, error: evErr } = await supabase
          .from('ipo_calendar_events')
          .select('*')
          .or(user ? `is_public.eq.true,user_id.eq.${user.id}` : 'is_public.eq.true')
          .order('date', { ascending: true })
          .returns<DbEvent[]>();
        if (evErr) throw evErr;

        const eventIds = (rows ?? []).map((r) => String(r.id));
        const eventIdsNum = (rows ?? [])
          .map((r) => Number(r.id))
          .filter((n) => Number.isFinite(n));

        let myRegs = new Set<string>();
        if (user && eventIdsNum.length) {
          const { data: regs, error: regErr } = await supabase
            .from('ipo_event_registrations')
            .select('event_id,user_id')
            .eq('user_id', user.id)
            .in('event_id', eventIdsNum as number[])
            .returns<RegistrationRow[]>();
          if (regErr) throw regErr;
          myRegs = new Set((regs ?? []).map((r) => String(r.event_id)));
        }

        const countsMap = new Map<string, number>();
        if (eventIdsNum.length) {
          const { data: allRegs, error: countErr } = await supabase
            .from('ipo_event_registrations')
            .select('event_id')
            .in('event_id', eventIdsNum as number[])
            .returns<RegistrationRow[]>();
          if (countErr) throw countErr;
          for (const r of allRegs ?? []) {
            const id = String(r.event_id);
            countsMap.set(id, (countsMap.get(id) ?? 0) + 1);
          }
        }

        const mapped = (rows ?? []).map((r) => {
          const id = String(r.id);
          const isReg = myRegs.has(id);
          const cnt = countsMap.get(id) ?? 0;
          return mapRowToEvent(r as DbEvent, isReg, cnt);
        });

        setEvents(mapped);
        setError(null);
      } catch (e) {
        console.error(e);
        setError('イベントの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [mapRowToEvent]);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return events.filter((event) => {
      const matchesSearch = !q
        || event.title.toLowerCase().includes(q)
        || event.description.toLowerCase().includes(q)
        || event.tags.some((t) => t.toLowerCase().includes(q));
      const matchesCategory = selectedCategory === 'all'
        || event.category === selectedCategory
        || (selectedCategory === 'registered' && !!event.isRegistered);
      return matchesSearch && matchesCategory;
    });
  }, [events, searchQuery, selectedCategory]);

  const today = new Date();
  const weekStart = useMemo(() => {
    const base = new Date(today);
    const baseStart = new Date(base);
    baseStart.setDate(base.getDate() - base.getDay() + currentWeekOffset * 7);
    baseStart.setHours(0, 0, 0, 0);
    return baseStart;
  }, [today, currentWeekOffset]);
  const weekEnd = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(weekStart.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
  }, [weekStart]);

  const weekEvents = useMemo(() => {
    return events.filter((e) => {
      const d = new Date(e.date);
      return d >= weekStart && d <= weekEnd;
    });
  }, [events, weekStart, weekEnd]);

  const formatDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    const formatted = date.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });
    return { month: date.getMonth() + 1, day: date.getDate(), weekday: '日月火水木金土'[date.getDay()], formatted };
  }, []);

  const formatWeekRange = useCallback(() => {
    return `${weekStart.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })} - ${weekEnd.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })}`;
  }, [weekStart, weekEnd]);

  const handleEventRegistration = useCallback(async (eventId: string) => {
    if (!authUserId) {
      setError('参加するにはログインが必要です');
      return;
    }
    const target = events.find((e) => e.id === eventId);
    if (!target) return;
    const eventIdNum = Number(eventId);
    if (!Number.isFinite(eventIdNum)) {
      setError('不正なイベントIDです');
      return;
    }

    try {
      if (!target.isRegistered && target.maxParticipants && target.currentParticipants >= target.maxParticipants) {
        setError('定員に達しています');
        return;
      }
      if (target.isRegistered) {
        const { error: delErr } = await supabase
          .from('ipo_event_registrations')
          .delete()
          .eq('user_id', authUserId)
          .eq('event_id', eventIdNum);
        if (delErr) throw delErr;
        setEvents((prev) => prev.map((ev) => ev.id === eventId ? { ...ev, isRegistered: false, currentParticipants: Math.max(0, ev.currentParticipants - 1) } : ev));
      } else {
        const { error: insErr } = await supabase
          .from('ipo_event_registrations')
          .insert({ user_id: authUserId, event_id: eventIdNum });
        if (insErr) throw insErr;
        setEvents((prev) => prev.map((ev) => ev.id === eventId ? { ...ev, isRegistered: true, currentParticipants: ev.currentParticipants + 1 } : ev));
      }
      setError(null);
    } catch (e) {
      console.error(e);
      setError('参加処理に失敗しました');
    }
  }, [authUserId, events]);

  const StatCard = ({ value, label, tint }: { value: number; label: string; tint: string }) => (
    <View style={[styles.statCard, { borderColor: tint }]}> 
      <Text style={[styles.statValue, { color: tint }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const CategoryChips = () => (
    <ScrollView
      horizontal
      ref={chipScrollRef}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingVertical: 8 }}
      onScroll={(e) => {
        chipScrollX.current = e.nativeEvent.contentOffset.x;
      }}
      scrollEventThrottle={16}
      onContentSizeChange={() => {
        // Restore previous offset to prevent auto-jump to the start on re-render
        requestAnimationFrame(() => {
          chipScrollRef.current?.scrollTo({ x: chipScrollX.current, animated: false });
        });
      }}
    >
      {(['all', 'registered'] as const).map((key) => (
        <TouchableOpacity key={key} onPress={() => setSelectedCategory(key)} style={[styles.chip, selectedCategory === key && styles.chipActive]}> 
          <Text style={[styles.chipText, selectedCategory === key && styles.chipTextActive]}>
            {key === 'all' ? 'すべて' : '参加予定'}
          </Text>
        </TouchableOpacity>
      ))}
      {Object.entries(EVENT_CATEGORIES).map(([key, cat]) => (
        <TouchableOpacity key={key} onPress={() => setSelectedCategory(key as CalendarEvent['category'])} style={[styles.chip, selectedCategory === key && { backgroundColor: cat.chipBg, borderColor: cat.tint }]}> 
          <Text style={[styles.chipText, selectedCategory === key && { color: '#111827' }]}>{cat.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const EventItem = ({ item }: { item: CalendarEvent }) => {
    const cat = EVENT_CATEGORIES[item.category];
    const IconComp = cat.icon;
    const dateInfo = formatDate(item.date);
    const isDeadlineSoon = item.registrationDeadline && new Date(item.registrationDeadline) <= new Date(Date.now() + 24 * 60 * 60 * 1000);
    return (
      <TouchableOpacity
        onPress={() => { setSelectedEvent(item); setShowDetail(true); }}
        style={styles.card}
        activeOpacity={0.9}
      >
        <View style={[styles.cardAccent, { backgroundColor: cat.tint }]} />
        <View style={styles.cardBody}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconWrap}> 
              <IconComp size={24} color={'#fff'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                <View style={[styles.badge, { backgroundColor: cat.chipBg, borderColor: cat.tint }]}> 
                  <Text style={[styles.badgeText, { color: '#111827' }]}>{cat.label}</Text>
                </View>
                {!!item.isRegistered && (
                  <View style={[styles.badge, { backgroundColor: '#dcfce7', borderColor: '#16a34a', flexDirection: 'row', alignItems: 'center' }]}> 
                    <CheckCircle size={14} color={'#16a34a'} />
                    <Text style={[styles.badgeText, { marginLeft: 4, color: '#166534' }]}>参加予定</Text>
                  </View>
                )}
                {!!isDeadlineSoon && (
                  <View style={[styles.badge, { backgroundColor: '#fee2e2', borderColor: '#ef4444', flexDirection: 'row', alignItems: 'center' }]}> 
                    <AlertCircle size={14} color={'#b91c1c'} />
                    <Text style={[styles.badgeText, { marginLeft: 4, color: '#991b1b' }]}>締切間近</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.dateMain}>{dateInfo.formatted}</Text>
              {!!item.time && (
                <Text style={styles.dateSub}>{item.time}{item.endTime ? ` - ${item.endTime}` : ''}</Text>
              )}
            </View>
          </View>

          {!!item.description && <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>}

          <View style={styles.metaRow}>
            {!!item.location && (
              <View style={styles.metaItem}> 
                <MapPin size={16} color={'#6b7280'} />
                <Text style={styles.metaText} numberOfLines={1}>{item.location}</Text>
              </View>
            )}
            {!!item.maxParticipants && (
              <View style={styles.metaItem}> 
                <Users size={16} color={'#6b7280'} />
                <Text style={styles.metaText}>{item.currentParticipants}/{item.maxParticipants}人</Text>
              </View>
            )}
            <View style={styles.metaItem}> 
              <UserIcon size={16} color={'#6b7280'} />
              <Text style={styles.metaText} numberOfLines={1}>{item.organizer}</Text>
            </View>
            {!!item.registrationDeadline && (
              <View style={styles.metaItem}> 
                <Clock size={16} color={'#6b7280'} />
                <Text style={styles.metaText}>締切: {formatDate(item.registrationDeadline).formatted}</Text>
              </View>
            )}
          </View>

          {item.isPublic && (
            <View style={styles.actionsRow}>
              {!!item.maxParticipants && (
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${(item.currentParticipants / item.maxParticipants) * 100}%` }]} />
                </View>
              )}
              <TouchableOpacity onPress={() => handleEventRegistration(item.id)} style={[styles.primaryBtn, item.isRegistered && styles.outlineBtn]}> 
                <Text style={[styles.primaryBtnText, item.isRegistered && styles.outlineBtnText]}>{item.isRegistered ? 'キャンセル' : '参加申し込み'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const Header = () => (
    <View style={styles.headerWrap}>
      <View>
        <Text style={styles.headerTitle}>イベントカレンダー</Text>
        <Text style={styles.headerSub}>就活支援イベントと個人予定を管理</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {/*<TouchableOpacity style={styles.ghostBtn}>
          <Bell size={18} color={'#111827'} />
          <Text style={styles.ghostBtnText}></Text>
        </TouchableOpacity>*/}
        <TouchableOpacity style={styles.primaryBtnSm} onPress={() => setShowCreate(true)}>
          <Plus size={18} color={'#fff'} />
          <Text style={styles.primaryBtnSmText}>予定を追加</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const Stats = () => (
    <View style={styles.statsRow}>
      <StatCard value={events.filter((e) => e.isRegistered).length} label={'参加予定'} tint={'#2563eb'} />
      <StatCard value={events.filter((e) => e.isPublic && !e.isRegistered && e.registrationStatus === 'open').length} label={'申し込み可能'} tint={'#16a34a'} />
      <StatCard value={events.filter((e) => e.registrationDeadline && new Date(e.registrationDeadline) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)).length} label={'締切間近'} tint={'#ea580c'} />
      <StatCard value={weekEvents.length} label={'今週の予定'} tint={'#7c3aed'} />
    </View>
  );

  const SearchFilter = () => (
    <View style={styles.searchRow}>
      <View style={styles.searchBox}> 
        <Search size={16} color={'#6b7280'} style={{ marginRight: 6 }} />
        <TextInput
          placeholder="イベントを検索..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={{ flex: 1, paddingVertical: 8 }}
        />
      </View>
      <CategoryChips />
    </View>
  );

  const WeekHeader = () => (
    <View style={styles.weekHeader}>
      <Text style={styles.weekHeaderTitle}>週表示</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity onPress={() => setCurrentWeekOffset((v) => v - 1)} style={styles.iconBtn}> 
          <ChevronLeft size={18} color={'#111827'} />
        </TouchableOpacity>
        <Text style={styles.weekRange}>{formatWeekRange()}</Text>
        <TouchableOpacity onPress={() => setCurrentWeekOffset((v) => v + 1)} style={styles.iconBtn}> 
          <ChevronRight size={18} color={'#111827'} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const TabsBar = () => (
    <View style={styles.tabsBar}>
      {TabValues.map((t) => (
        <TouchableOpacity key={t} onPress={() => setActiveTab(t)} style={[styles.tabBtn, activeTab === t && styles.tabBtnActive]}> 
          <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>{t === 'events' ? 'イベント一覧' : t === 'week' ? '週表示' : '月表示'}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderEventsList = () => (
    <FlatList
      data={[...filteredEvents].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())}
      keyExtractor={(item) => item.id}
      renderItem={EventItem}
      contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
      ListEmptyComponent={() => (
        <View style={styles.emptyCard}> 
          <CalendarIcon size={48} color={'#9ca3af'} />
          <Text style={styles.emptyTitle}>該当するイベントがありません</Text>
          <Text style={styles.emptySub}>検索条件を変更してお試しください。</Text>
        </View>
      )}
    />
  );

  const renderWeek = () => (
    <View>
      <WeekHeader />
      {weekEvents.length === 0 ? (
        <View style={styles.emptyCard}> 
          <CalendarIcon size={40} color={'#9ca3af'} />
          <Text style={styles.emptyTitleSm}>予定がありません</Text>
          <Text style={styles.emptySub}>この週のイベントはまだ登録されていません。</Text>
        </View>
      ) : (
        <FlatList
          data={[...weekEvents].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())}
          keyExtractor={(item) => item.id}
          renderItem={EventItem}
          contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
        />
      )}
    </View>
  );

  const renderMonth = () => (
    <FlatList
      data={[...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())}
      keyExtractor={(item) => item.id}
      renderItem={EventItem}
      numColumns={1}
      contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
    />
  );

  return (
    <SafeAreaView style={styles.safe}>
      {loading && (
        <View style={{ padding: 16 }}>
          <View style={styles.loadingCard}>
            <ActivityIndicator />
            <Text style={{ marginTop: 8 }}>読み込み中...</Text>
          </View>
        </View>
      )}
      {!!error && !loading && (
        <View style={{ padding: 16 }}>
          <View style={styles.errorCard}>
            <Text style={{ color: '#b91c1c' }}>{error}</Text>
          </View>
        </View>
      )}

      {/* Use a single FlatList and move header content into ListHeaderComponent to avoid nesting VirtualizedLists inside a ScrollView */}
      {(() => {
        const listData = activeTab === 'events' ? filteredEvents : activeTab === 'week' ? weekEvents : events;
        const Empty = () => (
          <View style={styles.emptyCard}>
            <CalendarIcon size={activeTab === 'week' ? 40 : 48} color={'#9ca3af'} />
            <Text style={activeTab === 'week' ? styles.emptyTitleSm : styles.emptyTitle}>
              {activeTab === 'week' ? '予定がありません' : '該当するイベントがありません'}
            </Text>
            <Text style={styles.emptySub}>
              {activeTab === 'week' ? 'この週のイベントはまだ登録されていません。' : '検索条件を変更してお試しください。'}
            </Text>
          </View>
        );
        return (
          <FlatList
            data={[...listData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())}
            keyExtractor={(item) => item.id}
            renderItem={EventItem}
            contentContainerStyle={{ padding: 16, paddingBottom: 20, gap: 12 }}
            ListHeaderComponent={
              <>
                <Header />
                <Stats />
                <SearchFilter />
                <TabsBar />
                {activeTab === 'week' && <WeekHeader />}
              </>
            }
            ListEmptyComponent={Empty}
          />
        );
      })()}

      {/* Create Modal */}
      <Modal visible={showCreate} animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <SafeAreaView style={styles.modalSafe}>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <TouchableOpacity onPress={() => setShowCreate(false)} style={{ marginBottom: 8 }}>
              <Text style={{ color: '#2563eb' }}>閉じる</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>個人予定を追加</Text>
            <View style={{ gap: 10, marginTop: 12 }}>
              <Text>タイトル</Text>
              <TextInput value={createForm.title} onChangeText={(v)=>setCreateForm({...createForm,title:v})} style={styles.searchBox} />
              <Text>日付</Text>
              {Platform.OS === 'ios' || Platform.OS === 'android' ? (
                <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.searchBox}>
                  <Text>{createForm.date}</Text>
                </TouchableOpacity>
              ) : (
                <TextInput value={createForm.date} onChangeText={(v)=>setCreateForm({...createForm,date:v})} placeholder="YYYY-MM-DD" style={styles.searchBox} />
              )}
              {showDatePicker && (
                <DateTimePicker
                  value={new Date(createForm.date)}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) {
                      const isoDate = selectedDate.toISOString().slice(0,10);
                      setCreateForm({...createForm,date: isoDate});
                    }
                  }}
                />
              )}
              <Text>開始時間（任意）</Text>
              {(Platform.OS === 'ios' || Platform.OS === 'android') ? (
                <TouchableOpacity onPress={()=>setShowStartTimePicker(true)} style={styles.searchBox}>
                  <Text>{createForm.time || 'HH:MM'}</Text>
                </TouchableOpacity>
              ) : (
                <TextInput value={createForm.time} onChangeText={(v)=>setCreateForm({...createForm,time:v})} placeholder="HH:MM" style={styles.searchBox} />
              )}
              {showStartTimePicker && (
                <DateTimePicker
                  value={new Date(`1970-01-01T${createForm.time || '09:00'}:00`) }
                  mode="time"
                  display="default"
                  is24Hour
                  onChange={(event, selectedDate) => {
                    setShowStartTimePicker(false);
                    if (selectedDate) {
                      setCreateForm({...createForm, time: hhmm(selectedDate)});
                    }
                  }}
                />
              )}
              <Text>終了時間（任意）</Text>
              {(Platform.OS === 'ios' || Platform.OS === 'android') ? (
                <TouchableOpacity onPress={()=>setShowEndTimePicker(true)} style={styles.searchBox}>
                  <Text>{createForm.endTime || 'HH:MM'}</Text>
                </TouchableOpacity>
              ) : (
                <TextInput value={createForm.endTime} onChangeText={(v)=>setCreateForm({...createForm,endTime:v})} placeholder="HH:MM" style={styles.searchBox} />
              )}
              {showEndTimePicker && (
                <DateTimePicker
                  value={new Date(`1970-01-01T${createForm.endTime || (createForm.time || '10:00')}:00`) }
                  mode="time"
                  display="default"
                  is24Hour
                  onChange={(event, selectedDate) => {
                    setShowEndTimePicker(false);
                    if (selectedDate) {
                      setCreateForm({...createForm, endTime: hhmm(selectedDate)});
                    }
                  }}
                />
              )}
              <Text>カテゴリ</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {Object.entries(EVENT_CATEGORIES).map(([key, cat]) => (
                  <TouchableOpacity key={key} onPress={()=>setCreateForm({...createForm, category: key as CalendarEvent['category']})} style={[styles.chip, createForm.category===key && { backgroundColor: cat.chipBg, borderColor: cat.tint }]}>
                    <Text style={[styles.chipText, createForm.category===key && { color: '#111827' }]}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text>場所（任意）</Text>
              <TextInput value={createForm.location} onChangeText={(v)=>setCreateForm({...createForm,location:v})} style={styles.searchBox} />
              <Text>詳細（任意）</Text>
              <TextInput value={createForm.description} onChangeText={(v)=>setCreateForm({...createForm,description:v})} multiline style={[styles.searchBox,{height:100,textAlignVertical:'top'}]} />
              <Text>タグ（カンマ区切り）</Text>
              <TextInput value={createForm.tagsText} onChangeText={(v)=>setCreateForm({...createForm,tagsText:v})} style={styles.searchBox} />
              <View style={{ flexDirection:'row', gap: 8, marginTop: 12 }}>
                <TouchableOpacity onPress={async ()=>{
                  // Save to Supabase
                  try {
                    const tagsArr = (createForm.tagsText||'').split(',').map(s=>s.trim()).filter(Boolean);
                    const { data, error } = await supabase.from('ipo_calendar_events').insert({
                      title: createForm.title || '無題の予定',
                      type: 'task',
                      category: createForm.category,
                      date: new Date(createForm.date).toISOString(),
                      time: createForm.time || null,
                      end_time: createForm.endTime || null,
                      location: createForm.location || null,
                      description: createForm.description || '',
                      priority: 'low',
                      is_public: false,
                      max_participants: null,
                      organizer: '自分',
                      tags: tagsArr,
                      registration_deadline: null,
                      target_audience: null,
                      registration_status: 'open',
                    }).select('id').single();
                    if (error) throw error;
                    const savedId = String(data.id);
                    const newEvent: CalendarEvent = {
                      id: savedId,
                      title: createForm.title || '無題の予定',
                      type: 'task',
                      category: createForm.category,
                      date: new Date(createForm.date + (createForm.time ? `T${createForm.time}:00` : 'T00:00:00')).toISOString(),
                      time: createForm.time || undefined,
                      endTime: createForm.endTime || undefined,
                      location: createForm.location || undefined,
                      description: createForm.description || '',
                      priority: 'low',
                      isPublic: false,
                      maxParticipants: undefined,
                      currentParticipants: 0,
                      organizer: '自分',
                      tags: tagsArr,
                      isRegistered: true,
                      registrationStatus: 'open',
                    };
                    setEvents(prev=>[newEvent, ...prev]);
                    setShowCreate(false);
                    setCreateForm({ title:'', category:'personal', date: new Date().toISOString().slice(0,10), time:'', endTime:'', location:'', description:'', tagsText:'' });
                  } catch(e) {
                    console.error(e);
                    setError('予定の作成に失敗しました');
                  }
                }} style={styles.primaryBtn}>
                  <Text style={styles.primaryBtnText}>保存</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={()=>{
                  const ev: CalendarEvent = {
                    id: `local-${Date.now()}`,
                    title: createForm.title || '無題の予定',
                    type: 'task',
                    category: createForm.category,
                    date: new Date(createForm.date).toISOString(),
                    time: createForm.time || undefined,
                    endTime: createForm.endTime || undefined,
                    location: createForm.location || undefined,
                    description: createForm.description || '',
                    priority: 'low', isPublic:false, currentParticipants:0, organizer:'自分', tags:[]
                  };
                  const url = buildGoogleCalendarUrl(ev);
                  Linking.openURL(url);
                }} style={[styles.ghostBtn,{flexDirection:'row',alignItems:'center',gap:6}]}> 
                  <CalendarIcon size={16} color={'#111827'} />
                  <Text style={styles.ghostBtnText}>Googleカレンダー</Text>
                </TouchableOpacity>
                {/* 
                <TouchableOpacity onPress={()=>{
                  const ev: CalendarEvent = {
                    id: `local-${Date.now()}`,
                    title: createForm.title || '無題の予定',
                    type: 'task', category: createForm.category,
                    date: new Date(createForm.date).toISOString(),
                    time: createForm.time || undefined,
                    endTime: createForm.endTime || undefined,
                    location: createForm.location || undefined,
                    description: createForm.description || '', priority:'low', isPublic:false, currentParticipants:0, organizer:'自分', tags:[]
                  };
                  openICS(ev);
                }} style={[styles.ghostBtn,{flexDirection:'row',alignItems:'center',gap:6}]}> 
                  <CalendarIcon size={16} color={'#111827'} />
                  <Text style={styles.ghostBtnText}>Apple/Outlook (.ics)</Text>
                </TouchableOpacity>
                */}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Detail Modal */}
      <Modal visible={showDetail} animationType="slide" onRequestClose={() => setShowDetail(false)}>
        <SafeAreaView style={styles.modalSafe}>
          {selectedEvent && (
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <TouchableOpacity onPress={() => setShowDetail(false)} style={{ marginBottom: 8 }}>
                <Text style={{ color: '#2563eb' }}>閉じる</Text>
              </TouchableOpacity>

              {(() => {
                const cat = EVENT_CATEGORIES[selectedEvent.category];
                const IconComp = cat.icon;
                const dateInfo = formatDate(selectedEvent.date);
                return (
                  <View>
                    <View style={[styles.modalAccent, { backgroundColor: cat.tint }]} />
                    <View style={styles.modalHeaderRow}>
                      <View style={[styles.iconWrap, { backgroundColor: cat.tint }]}> 
                        <IconComp size={28} color={'#fff'} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.modalTitle}>{selectedEvent.title}</Text>
                        <Text style={styles.modalSub}>
                          {selectedEvent.organizer}主催 ・ {dateInfo.formatted}
                          {selectedEvent.time ? ` ${selectedEvent.time}` : ''}
                          {selectedEvent.location ? ` ・ ${selectedEvent.location}` : ''}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                          <View style={[styles.badge, { backgroundColor: cat.chipBg, borderColor: cat.tint }]}> 
                            <Text style={[styles.badgeText, { color: '#111827' }]}>{cat.label}</Text>
                          </View>
                          {!!selectedEvent.isRegistered && (
                            <View style={[styles.badge, { backgroundColor: '#dcfce7', borderColor: '#16a34a', flexDirection: 'row', alignItems: 'center' }]}> 
                              <CheckCircle size={14} color={'#16a34a'} />
                              <Text style={[styles.badgeText, { marginLeft: 4, color: '#166534' }]}>参加予定</Text>
                            </View>
                          )}
                        </View>
                        {!selectedEvent.isPublic && (
                          <TouchableOpacity onPress={()=>setEditMode(v=>!v)} style={[styles.ghostBtn,{marginTop:8}]}> 
                            <Text style={styles.ghostBtnText}>{editMode ? '編集をやめる' : '編集'}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    <View style={{ gap: 16 }}>
                      <View style={{ gap: 8 }}>
                        <Text style={styles.sectionTitle}>開催情報</Text>
                        <View style={{ gap: 6 }}>
                          <View style={styles.metaItem}> 
                            <CalendarIcon size={16} color={'#6b7280'} />
                            <Text style={styles.metaText}>{dateInfo.formatted}</Text>
                          </View>
                          {!!selectedEvent.time && (
                            <View style={styles.metaItem}> 
                              <Clock size={16} color={'#6b7280'} />
                              <Text style={styles.metaText}>{selectedEvent.time}{selectedEvent.endTime ? ` - ${selectedEvent.endTime}` : ''}</Text>
                            </View>
                          )}
                          {!!selectedEvent.location && (
                            <View style={styles.metaItem}> 
                              <MapPin size={16} color={'#6b7280'} />
                              <Text style={styles.metaText}>{selectedEvent.location}</Text>
                            </View>
                          )}
                          <View style={styles.metaItem}> 
                            <UserIcon size={16} color={'#6b7280'} />
                            <Text style={styles.metaText}>主催: {selectedEvent.organizer}</Text>
                          </View>
                        </View>
                      </View>

                      {editMode && (
                        <View style={{ gap: 10, padding: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: '#e5e7eb', borderRadius: 8 }}>
                          <Text style={styles.sectionTitle}>予定を編集</Text>
                          <Text>タイトル</Text>
                          <TextInput value={selectedEvent.title} onChangeText={(v)=>setSelectedEvent(prev=>prev?{...prev,title:v}:prev)} style={styles.searchBox} />
                          <Text>日付</Text>
                          <TextInput value={selectedEvent.date.slice(0,10)} onChangeText={(v)=>setSelectedEvent(prev=>prev?{...prev,date:new Date(v + (prev.time?`T${prev.time}:00`:'T00:00:00')).toISOString()}:prev)} style={styles.searchBox} />
                          <Text>時間</Text>
                          {(Platform.OS === 'ios' || Platform.OS === 'android') ? (
                            <View style={{ flexDirection:'row', gap: 8 }}>
                              <TouchableOpacity onPress={()=>setShowEditStartTimePicker(true)} style={[styles.searchBox, { flex: 1 }]}>
                                <Text>{selectedEvent.time || '開始 HH:MM'}</Text>
                              </TouchableOpacity>
                              <TouchableOpacity onPress={()=>setShowEditEndTimePicker(true)} style={[styles.searchBox, { flex: 1 }]}>
                                <Text>{selectedEvent.endTime || '終了 HH:MM'}</Text>
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <TextInput value={selectedEvent.time || ''} onChangeText={(v)=>setSelectedEvent(prev=>prev?{...prev,time:v}:prev)} placeholder="HH:MM" style={styles.searchBox} />
                          )}
                          {showEditStartTimePicker && (
                            <DateTimePicker
                              value={new Date(`1970-01-01T${selectedEvent.time || '09:00'}:00`) }
                              mode="time"
                              display="default"
                              is24Hour
                              onChange={(event, selectedDate) => {
                                setShowEditStartTimePicker(false);
                                if (selectedDate) {
                                  setSelectedEvent(prev=>prev?{...prev, time: hhmm(selectedDate)}:prev);
                                }
                              }}
                            />
                          )}
                          {showEditEndTimePicker && (
                            <DateTimePicker
                              value={new Date(`1970-01-01T${selectedEvent.endTime || (selectedEvent.time || '10:00')}:00`) }
                              mode="time"
                              display="default"
                              is24Hour
                              onChange={(event, selectedDate) => {
                                setShowEditEndTimePicker(false);
                                if (selectedDate) {
                                  setSelectedEvent(prev=>prev?{...prev, endTime: hhmm(selectedDate)}:prev);
                                }
                              }}
                            />
                          )}
                          <Text>場所</Text>
                          <TextInput value={selectedEvent.location || ''} onChangeText={(v)=>setSelectedEvent(prev=>prev?{...prev,location:v}:prev)} style={styles.searchBox} />
                          <Text>カテゴリ</Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                            {Object.entries(EVENT_CATEGORIES).map(([key, cat]) => (
                              <TouchableOpacity key={key} onPress={()=>setSelectedEvent(prev=>prev?{...prev, category: key as CalendarEvent['category']}:prev)} style={[styles.chip, selectedEvent.category===key && { backgroundColor: cat.chipBg, borderColor: cat.tint }]}>
                                <Text style={[styles.chipText, selectedEvent.category===key && { color: '#111827' }]}>{cat.label}</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                          <Text>タグ（カンマ区切り）</Text>
                          <TextInput value={(selectedEvent.tags||[]).join(', ')} onChangeText={(v)=>setSelectedEvent(prev=>prev?{...prev, tags: v.split(',').map(s=>s.trim()).filter(Boolean)}:prev)} style={styles.searchBox} />
                          <Text>詳細</Text>
                          <TextInput value={selectedEvent.description || ''} onChangeText={(v)=>setSelectedEvent(prev=>prev?{...prev,description:v}:prev)} multiline style={[styles.searchBox,{height:100,textAlignVertical:'top'}]} />
                          <View style={{ flexDirection:'row', justifyContent:'flex-end', gap: 8 }}>
                            <TouchableOpacity onPress={()=>setEditMode(false)} style={styles.ghostBtn}><Text style={styles.ghostBtnText}>キャンセル</Text></TouchableOpacity>
                            <TouchableOpacity onPress={async ()=>{
                              try {
                                if (!selectedEvent) return;
                                const idNum = Number(selectedEvent.id);
                                const idValue: any = Number.isFinite(idNum) ? idNum : selectedEvent.id;
                                const { error } = await supabase.from('ipo_calendar_events').update({
                                  title: selectedEvent.title,
                                  date: selectedEvent.date.slice(0,10),
                                  time: selectedEvent.time || null,
                                  end_time: selectedEvent.endTime || null,
                                  location: selectedEvent.location || null,
                                  description: selectedEvent.description || '',
                                  tags: selectedEvent.tags || [],
                                  category: selectedEvent.category,
                                }).eq('id', idValue);
                                if (error) throw error;
                                setEvents(prev=>prev.map(e=> e.id===selectedEvent.id ? {...e, ...selectedEvent } : e));
                                setEditMode(false);
                              } catch(e){
                                console.error(e); setError('予定の更新に失敗しました');
                              }
                            }} style={styles.primaryBtn}><Text style={styles.primaryBtnText}>保存</Text></TouchableOpacity>
                          </View>
                        </View>
                      )}

                      {!!selectedEvent.maxParticipants && (
                        <View style={{ gap: 8 }}>
                          <Text style={styles.sectionTitle}>参加状況</Text>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={styles.metaText}>参加者数</Text>
                            <Text style={styles.metaText}>{selectedEvent.currentParticipants}/{selectedEvent.maxParticipants}人</Text>
                          </View>
                          <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${(selectedEvent.currentParticipants / selectedEvent.maxParticipants) * 100}%` }]} />
                          </View>
                        </View>
                      )}

                      {!!selectedEvent.registrationDeadline && (
                        <View>
                          <Text style={styles.sectionTitle}>申し込み締切</Text>
                          <Text style={styles.metaText}>{formatDate(selectedEvent.registrationDeadline).formatted}</Text>
                        </View>
                      )}

                      {!!selectedEvent.targetAudience && (
                        <View>
                          <Text style={styles.sectionTitle}>対象者</Text>
                          <Text style={styles.metaText}>{selectedEvent.targetAudience}</Text>
                        </View>
                      )}

                      {!!selectedEvent.tags?.length && (
                        <View>
                          <Text style={styles.sectionTitle}>タグ</Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            {selectedEvent.tags.map((tag, i) => (
                              <View key={i} style={[styles.badge, { backgroundColor: '#fff', borderColor: '#e5e7eb' }]}> 
                                <Text style={[styles.badgeText, { color: '#374151' }]}>{tag}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}

                      {!!selectedEvent.description && (
                        <View>
                          <Text style={styles.sectionTitle}>詳細</Text>
                          <Text style={{ color: '#4b5563', lineHeight: 20 }}>{selectedEvent.description}</Text>
                        </View>
                      )}

                      {!!selectedEvent.requirements?.length && (
                        <View>
                          <Text style={styles.sectionTitle}>参加要件</Text>
                          {selectedEvent.requirements.map((req, i) => (
                            <Text key={i} style={styles.metaText}>・{req}</Text>
                          ))}
                        </View>
                      )}

                      {!!selectedEvent.benefits?.length && (
                        <View>
                          <Text style={styles.sectionTitle}>参加特典</Text>
                          {selectedEvent.benefits.map((b, i) => (
                            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Star size={16} color={'#f59e0b'} />
                              <Text style={styles.metaText}>{b}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {selectedEvent.isPublic && (
                        <View style={{ flexDirection: 'row', gap: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e5e7eb' }}>
                          <TouchableOpacity onPress={() => handleEventRegistration(selectedEvent.id)} style={[styles.primaryBtn, selectedEvent.isRegistered && styles.outlineBtn, { flex: 1 }]}> 
                            <Text style={[styles.primaryBtnText, selectedEvent.isRegistered && styles.outlineBtnText]}>
                              {selectedEvent.isRegistered ? '参加をキャンセル' : '参加申し込み'}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.ghostBtn, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}> 
                            <Bell size={18} color={'#111827'} />
                            <Text style={styles.ghostBtnText}>リマインダー設定</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })()}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ===== Styles =====
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  headerWrap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#111827' },
  headerSub: { fontSize: 14, color: '#6b7280', marginTop: 4 },

  ghostBtn: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: '#e5e7eb', borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  ghostBtnText: { color: '#111827', fontWeight: '600' },

  primaryBtnSm: { backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  primaryBtnSmText: { color: '#fff', fontWeight: '700' },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center', backgroundColor: '#fff' },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 2 },

  searchRow: { marginBottom: 8 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 10, backgroundColor: '#fff' },

  chip: { borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, marginRight: 8 },
  chipActive: { backgroundColor: '#e5e7eb' },
  chipText: { color: '#374151', fontWeight: '600' },
  chipTextActive: { color: '#111827' },

  // badge styles (used for category/registered/deadline chips)
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },

  tabsBar: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 10, padding: 4, marginTop: 8, marginBottom: 12 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  tabText: { color: '#6b7280', fontWeight: '700' },
  tabTextActive: { color: '#111827' },

  weekHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  weekHeaderTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  iconBtn: { padding: 8, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8 },
  weekRange: { fontWeight: '600', color: '#111827' },

  card: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, backgroundColor: '#fff', overflow: 'hidden' },
  cardAccent: { height: 6, width: '100%' },
  cardBody: { padding: 14 },
  cardHeaderRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 8 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  dateMain: { fontSize: 13, fontWeight: '700', color: '#111827' },
  dateSub: { fontSize: 12, color: '#6b7280' },
  desc: { color: '#6b7280', marginVertical: 6 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4, marginBottom: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: '#6b7280' },
  actionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  progressBarBg: { flex: 1, height: 8, backgroundColor: '#e5e7eb', borderRadius: 999 },
  progressBarFill: { height: 8, backgroundColor: '#2563eb', borderRadius: 999 },
  primaryBtn: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  primaryBtnText: { color: '#fff', fontWeight: '800' },
  outlineBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  outlineBtnText: { color: '#111827' },

  emptyCard: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff', borderRadius: 12, padding: 24, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 8 },
  emptyTitleSm: { fontSize: 15, fontWeight: '700', color: '#111827', marginTop: 6 },
  emptySub: { color: '#6b7280' },

  loadingCard: { borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center' },
  errorCard: { borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff', borderRadius: 12, padding: 12 },

  modalSafe: { flex: 1, backgroundColor: '#fff' },
  modalAccent: { height: 10, width: '100%', backgroundColor: '#2563eb', borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  modalSub: { color: '#6b7280', marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 },
});
