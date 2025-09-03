"use client";
import React, { useState, useEffect, useCallback, startTransition } from 'react';
import { 
  Calendar as CalendarIcon, Clock, MapPin, User, ChevronLeft, ChevronRight,
  Plus, Search, Filter, Bell, Users, Star, CheckCircle, AlertCircle,
  Zap, Briefcase, Coffee, BookOpen, Target, MessageSquare
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

import { motion, AnimatePresence } from 'framer-motion';

// --- iCalendar (.ics) helper ----------------------------------------------
const escapeICS = (s: string) => (s || "").replace(/[\\;,\n]/g, (m) => ({"\\":"\\\\",";":"\\;",",":"\\,","\n":"\\n"}[m] as string));
const buildICSFile = (ev: CalendarEvent) => {
  const startBase = new Date(ev.date);
  let start = new Date(startBase);
  let end = new Date(startBase);
  if (ev.time && /^\d{2}:\d{2}$/.test(ev.time)) {
    const [hh, mm] = ev.time.split(":").map(Number);
    start.setHours(hh, mm ?? 0, 0, 0);
  }
  if (ev.endTime && /^\d{2}:\d{2}$/.test(ev.endTime)) {
    const [eh, em] = ev.endTime.split(":").map(Number);
    end = new Date(start);
    end.setHours(eh, em ?? 0, 0, 0);
  } else if (ev.time) {
    end = new Date(start);
    end.setMinutes(end.getMinutes() + 60);
  } else {
    // all-day
    start = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()));
    end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
  }
  const uid = `${ev.id || `tmp-${Date.now()}`}@ipo-calendar`;
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//IPO Calendar//EN',
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
  return new Blob([ics], { type: 'text/calendar;charset=utf-8' });
};
const downloadICS = (ev: CalendarEvent) => {
  const blob = buildICSFile(ev);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(ev.title || 'event').replace(/[^\w\-]+/g,'_')}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
// --------------------------------------------------------------------------


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
  stageStatus?: string;
  stageCompanyId?: string | null;
}
const stageStatusLabel = (s?: string) => {
  switch (s) {
    case 'scheduled':
      return '予定';
    case 'pending':
      return '保留';
    case 'passed':
      return '合格';
    case 'failed':
      return '不合格';
    // legacy value fallback
    case 'completed':
      return '完了';
    default:
      return s ?? '';
  }
};

// Supabase row types (minimum needed)
type DbEvent = {
  id: string | number;
  title: string;
  type: 'deadline' | 'interview' | 'corporate_event' | 'seminar' | 'practice' | 'task' | 'networking';
  category: 'explanation' | 'gd_practice' | 'interview_practice' | 'industry_seminar' | 'career_talk' | 'networking' | 'workshop' | 'personal';
  date: string; // ISO date
  time?: string | null;
  end_time?: string | null;
  location?: string | null;
  description: string;
  priority: 'high' | 'medium' | 'low';
  is_public: boolean;
  max_participants?: number | null;
  organizer: string;
  tags?: string[] | null;
  registration_deadline?: string | null;
  requirements?: string[] | null;
  benefits?: string[] | null;
  target_audience?: string | null;
  registration_status?: 'open' | 'closed' | 'waitlist' | null;
};

// registration rows (ipo_event_registrations)
type RegistrationRow = { event_id: number; user_id: string };

// selection (選考管理) – 先行予約の最小型（実フィールド名が異なる環境にも対応できるよう可変に）
type PrebookingRow = {
  id: string | number;
  user_id?: string | null;
  title?: string | null;
  company?: string | null;
  location?: string | null;
  memo?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  scheduled_at?: string | null;
  reserved_at?: string | null;
  datetime?: string | null;
};

// selection_stages（選考段階） – 実カラムに合わせた型
type StageRow = {
  id: string | number;
  user_id: string | null;
  company_id: string | null;
  name: string | null;        // 段階名
  status: string | null;      // scheduled / pending / completed など
  date: string | null;        // YYYY-MM-DD
  time: string | null;        // HH:mm
  location: string | null;
  feedback: string | null;
  interviewer: string | null;
  notes: string | null;       // メモ
  rating: number | null;
  preparation: any[] | null;  // 配列
  completed_at: string | null;
};

type StageStatus = 'scheduled' | 'pending' | 'passed' | 'failed';

type StageForm = {
  name: string;
  date: string;
  time: string;
  location: string;
  notes: string;
  status: StageStatus;
  tagsText?: string;
  category?: CalendarEvent['category'];
};
const castStageStatus = (s?: string): StageStatus => {
  const allowed: StageStatus[] = ['scheduled', 'pending', 'passed', 'failed'];
  return (allowed as readonly string[]).includes(s ?? '') ? (s as StageStatus) : 'scheduled';
};


const EVENT_CATEGORIES = {
  explanation: {
    label: '企業説明会',
    icon: Briefcase,
    color: 'from-blue-400 to-blue-600',
    bgColor: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  gd_practice: {
    label: 'GD練習会',
    icon: Users,
    color: 'from-green-400 to-green-600',
    bgColor: 'bg-green-100 text-green-800 border-green-200'
  },
  interview_practice: {
    label: '面接練習',
    icon: MessageSquare,
    color: 'from-purple-400 to-purple-600',
    bgColor: 'bg-purple-100 text-purple-800 border-purple-200'
  },
  industry_seminar: {
    label: '業界セミナー',
    icon: BookOpen,
    color: 'from-indigo-400 to-indigo-600',
    bgColor: 'bg-indigo-100 text-indigo-800 border-indigo-200'
  },
  career_talk: {
    label: 'キャリアトーク',
    icon: Target,
    color: 'from-orange-400 to-orange-600',
    bgColor: 'bg-orange-100 text-orange-800 border-orange-200'
  },
  networking: {
    label: 'ネットワーキング',
    icon: Coffee,
    color: 'from-pink-400 to-pink-600',
    bgColor: 'bg-pink-100 text-pink-800 border-pink-200'
  },
  workshop: {
    label: 'ワークショップ',
    icon: Zap,
    color: 'from-yellow-400 to-yellow-600',
    bgColor: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  },
  personal: {
    label: '個人予定',
    icon: CalendarIcon,
    color: 'from-gray-400 to-gray-600',
    bgColor: 'bg-gray-100 text-gray-800 border-gray-200'
  }
};

// --- Google Calendar helper ----------------------------------------------
// Format date objects to Google Calendar expected formats
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
const ymdHisZ = (d: Date) =>
  `${ymd(d)}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;

/**
 * Build a Google Calendar "add event" URL from a CalendarEvent.
 * - If time is absent, treats it as an all-day event (end date is next day).
 * - If endTime is absent but time is present, assumes 60 min duration.
 */
const buildGoogleCalendarUrl = (ev: CalendarEvent) => {
  try {
    const startBase = new Date(ev.date); // ev.date is ISO
    let start = new Date(startBase);
    let end = new Date(startBase);

    if (ev.time) {
      // Use given start time (already in ev.date or overridden by ev.time)
      // If `ev.date` already has time baked in, we trust it; otherwise align time by parsing HH:mm
      if (/^\d{2}:\d{2}$/.test(ev.time)) {
        const [hh, mm] = ev.time.split(":").map(Number);
        start.setHours(hh, mm ?? 0, 0, 0);
      }
      if (ev.endTime && /^\d{2}:\d{2}$/.test(ev.endTime)) {
        const [eh, em] = ev.endTime.split(":").map(Number);
        end = new Date(start);
        end.setHours(eh, em ?? 0, 0, 0);
      } else {
        // default 60 minutes
        end = new Date(start);
        end.setMinutes(end.getMinutes() + 60);
      }
      const dates = `${ymdHisZ(start)}/${ymdHisZ(end)}`;
      const params = new URLSearchParams({
        action: "TEMPLATE",
        text: ev.title || "",
        details: ev.description || "",
        location: ev.location || "",
        dates,
      });
      return `https://calendar.google.com/calendar/render?${params.toString()}`;
    } else {
      // All-day event
      const startDay = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()));
      const endDay = new Date(startDay);
      endDay.setUTCDate(endDay.getUTCDate() + 1); // end is exclusive
      const dates = `${ymd(startDay)}/${ymd(endDay)}`;
      const params = new URLSearchParams({
        action: "TEMPLATE",
        text: ev.title || "",
        details: ev.description || "",
        location: ev.location || "",
        dates,
      });
      return `https://calendar.google.com/calendar/render?${params.toString()}`;
    }
  } catch {
    // Fallback without dates
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: ev.title || "",
      details: ev.description || "",
      location: ev.location || "",
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }
};
// --------------------------------------------------------------------------

export default function CalendarPage() {
  const [activeTab, setActiveTab] = useState<'week' | 'month' | 'events'>('events');
  const [currentWeek, setCurrentWeek] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventDetail, setShowEventDetail] = useState(false);

  const [createForm, setCreateForm] = useState({
    title: '',
    category: 'personal' as CalendarEvent['category'],
    date: new Date().toISOString().slice(0,10),
    time: '',
    endTime: '',
    location: '',
    description: '',
  });

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  // Run a callback when the main thread is idle (fallback to setTimeout)
  const runIdle = (cb: () => void) => {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      // @ts-ignore - TS lib may not include requestIdleCallback
      (window as any).requestIdleCallback(cb);
    } else {
      setTimeout(cb, 0);
    }
  };

  const handleTabChange = useCallback((value: string) => {
    startTransition(() => {
      setActiveTab(value as typeof activeTab);
    });
    // Avoid blocking paint; scroll after the transition
    if (typeof window !== 'undefined') {
      runIdle(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }
  }, [activeTab]);

  const mapRowToEvent = (row: DbEvent, isRegistered: boolean, currentParticipants: number): CalendarEvent => ({
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
  });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        // Resolve auth user
        const { data: { user }, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;
        setAuthUserId(user?.id ?? null);

        // Fetch events: public + personal(自分の) をまとめて
        const { data: rows, error: evErr } = await supabase
          .from('ipo_calendar_events')
          .select('id,title,type,category,date,time,end_time,location,description,priority,is_public,max_participants,organizer,tags,registration_deadline,requirements,benefits,target_audience,registration_status')
          .or(user ? `is_public.eq.true,user_id.eq.${user.id}` : 'is_public.eq.true')
          .order('date', { ascending: true });
        if (evErr) throw evErr;

        const eventIds = (rows ?? []).map(r => String((r as DbEvent).id));
        const eventIdsNum = (rows ?? [])
          .map(r => Number((r as DbEvent).id))
          .filter((n) => Number.isFinite(n));
        // registrations of current user
        let myRegs = new Set<string>();
        if (user && eventIds.length) {
          const { data: regs, error: regErr } = await supabase
            .from('ipo_event_registrations')
            .select('event_id,user_id')
            .eq('user_id', user.id)
            .in('event_id', eventIdsNum as number[]);
          if (regErr) throw regErr;
          myRegs = new Set((regs ?? []).map(r => String(r.event_id)));
        }

        // aggregate counts per event
        const countsMap = new Map<string, number>();
        if (eventIds.length) {
          const { data: allRegs, error: countErr } = await supabase
            .from('ipo_event_registrations')
            .select('event_id')
            .in('event_id', eventIdsNum as number[]);
          if (countErr) throw countErr;
          if (allRegs) {
            for (const r of allRegs) {
              const id = String(r.event_id);
              countsMap.set(id, (countsMap.get(id) ?? 0) + 1);
            }
          }
        }

        const mapped = (rows ?? []).map((r: any) => {
          const isReg = (myRegs as Set<string>).has(String(r.id));
          const cnt = ((countsMap as Map<string, number>).get(String(r.id))) ?? 0;
          return mapRowToEvent(r as DbEvent, isReg, cnt);
        });

        // --- 選考管理の「先行予約」を取り込み（存在すれば） ---
        let prebookMapped: CalendarEvent[] = [];
        try {
          // テーブル名は環境に合わせていずれかが存在する想定。先に見つかったものを使用。
          const prebookTableCandidates = [
            'selection_prebookings',
            'ipo_selection_prebookings',
            'prebookings',
          ];
          let preRows: PrebookingRow[] | null = null;
          for (const t of prebookTableCandidates) {
            const { data, error } = await supabase
              .from(t as any)
              .select('id,user_id,title,company,location,memo,start_at,end_at,scheduled_at,reserved_at,datetime')
              .limit(200);
            if (!error && data) {
              preRows = data as unknown as PrebookingRow[];
              break;
            }
          }

          if (preRows && preRows.length) {
            prebookMapped = preRows.map((r) => {
              const start = r.start_at ?? r.scheduled_at ?? r.reserved_at ?? r.datetime ?? null;
              const end = r.end_at ?? null;
              const startDate = start ? new Date(start) : new Date();
              const endDate = end ? new Date(end) : null;
              const dateISO = startDate.toISOString();
              const timeStr = start ? startDate.toTimeString().slice(0,5) : undefined;
              const endTimeStr = endDate ? endDate.toTimeString().slice(0,5) : undefined;

              return {
                id: `prebook-${String(r.id)}`,
                title: r.title || `${r.company ?? '面談/面接 先行予約'}`,
                type: 'interview',
                category: 'personal',
                date: dateISO,
                time: timeStr,
                endTime: endTimeStr,
                location: r.location ?? undefined,
                description: r.memo ?? `${r.company ?? ''} の先行予約` ,
                priority: 'medium',
                isPublic: false,
                maxParticipants: undefined,
                currentParticipants: 0,
                organizer: r.company ?? '自分',
                tags: ['先行予約', '選考管理'],
                registrationDeadline: undefined,
                requirements: undefined,
                benefits: undefined,
                targetAudience: undefined,
                isRegistered: true,
                registrationStatus: 'open',
              } as CalendarEvent;
            });
          }
        } catch (e) {
          // テーブルが存在しない等のエラーは握りつぶしてカレンダー自体は表示
          console.warn('prebookings fetch skipped:', e);
        }

        // --- 選考段階（selection_stages）を取り込み ---
        let stageMapped: CalendarEvent[] = [];
        try {
          const stageTableCandidates = [
            'selection_stages',
            'ipo_selection_stages',
            'stages',
          ];
          let stageRows: StageRow[] | null = null;
          for (const t of stageTableCandidates) {
            const { data, error } = await supabase
              .from(t as any)
              .select('id,user_id,company_id,name,status,date,time,location,interviewer,notes,feedback,rating,preparation,completed_at')
              .limit(500);
            if (!error && data) {
              stageRows = data as unknown as StageRow[];
              break;
            }
          }

          if (stageRows && stageRows.length) {
            stageMapped = stageRows
              .filter((r) => r.date || r.time)
              .map((r) => {
                const baseDate = r.date ? `${r.date}T${(r.time ?? '09:00')}:00` : new Date().toISOString();
                const d = new Date(baseDate);
                const dateISO = d.toISOString();
                const timeStr = r.time ?? undefined;

                const title = r.name || '選考（予定）';
                // タグは最小限（メタは出さない）
                const tags: string[] = ['選考'];

                return {
                  id: `stage-${String(r.id)}`,
                  title,
                  type: 'interview',
                  category: 'personal',
                  date: dateISO,
                  time: timeStr,
                  endTime: undefined,
                  location: r.location ?? undefined,
                  description: r.notes || r.feedback || title,
                  priority: 'medium',
                  isPublic: false,
                  maxParticipants: undefined,
                  currentParticipants: 0,
                  organizer: r.interviewer ?? '自分',
                  tags, // メタは表示しない
                  registrationDeadline: undefined,
                  requirements: undefined,
                  benefits: undefined,
                  targetAudience: undefined,
                  isRegistered: true,
                  registrationStatus: 'open',
                  stageStatus: r.status ?? undefined,
                  stageCompanyId: r.company_id ?? null,
                } as CalendarEvent;
              });
          }
        } catch (e) {
          console.warn('selection_stages fetch skipped:', e);
        }

        setEvents([...mapped, ...prebookMapped, ...stageMapped]);
        setError(null);
      } catch (e: any) {
        console.error(e);
        setError('イベントの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Filter events based on search and category
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || 
                           event.category === selectedCategory ||
                           (selectedCategory === 'registered' && event.isRegistered);
    
    return matchesSearch && matchesCategory;
  });

  // Get current week events
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + currentWeek * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const weekEvents = events.filter(event => {
    const eventDate = new Date(event.date);
    return eventDate >= weekStart && eventDate <= weekEnd;
  });

  const handleEventRegistration = async (eventId: string) => {
    if (!authUserId) {
      setError('参加するにはログインが必要です');
      return;
    }
    const target = events.find(e => e.id === eventId);
    if (!target) return;

    // DB は bigint 想定なので数値化
    const eventIdNum = Number(eventId);
    if (!Number.isFinite(eventIdNum)) {
      setError('不正なイベントIDです');
      return;
    }

    try {
      // capacity check
      if (!target.isRegistered && target.maxParticipants && target.currentParticipants >= target.maxParticipants) {
        setError('定員に達しています');
        return;
      }

      if (target.isRegistered) {
        // cancel registration
        const { error: delErr } = await supabase
          .from('ipo_event_registrations')
          .delete()
          .eq('user_id', authUserId)
          .eq('event_id', eventIdNum);
        if (delErr) throw delErr;

        setEvents(prev => prev.map(ev => ev.id === eventId
          ? { ...ev, isRegistered: false, currentParticipants: Math.max(0, ev.currentParticipants - 1) }
          : ev
        ));
      } else {
        // register
        const { error: insErr } = await supabase
          .from('ipo_event_registrations')
          .insert({ user_id: authUserId, event_id: eventIdNum });
        if (insErr) throw insErr;

        setEvents(prev => prev.map(ev => ev.id === eventId
          ? { ...ev, isRegistered: true, currentParticipants: ev.currentParticipants + 1 }
          : ev
        ));
      }
      setError(null);
    } catch (e: any) {
      console.error(e);
      setError('参加処理に失敗しました');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      month: date.getMonth() + 1,
      day: date.getDate(),
      weekday: ['日', '月', '火', '水', '木', '金', '土'][date.getDay()],
      formatted: date.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })
    };
  };

  const formatWeekRange = () => {
    const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric' };
    return `${weekStart.toLocaleDateString('ja-JP', options)} - ${weekEnd.toLocaleDateString('ja-JP', options)}`;
  };

  const EventCard = ({ event, isCompact = false }: { event: CalendarEvent; isCompact?: boolean }) => {
    const category = EVENT_CATEGORIES[event.category];
    const IconComponent = category.icon;
    const dateInfo = formatDate(event.date);
    
    const isDeadlineSoon = event.registrationDeadline && 
      new Date(event.registrationDeadline) <= new Date(Date.now() + 24 * 60 * 60 * 1000);

    return (
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all duration-300 overflow-hidden"
          onClick={() => {
            startTransition(() => {
              setSelectedEvent(event);
              setShowEventDetail(true);
            });
          }}
        >
          <CardContent className="p-0">
            <div className={`h-2 bg-gradient-to-r ${category.color}`} />
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 bg-gradient-to-br ${category.color} rounded-xl flex items-center justify-center text-white`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg mb-1 break-words">{event.title}</h3>
                    <div className="flex items-center space-x-2">
                      <Badge className={category.bgColor}>
                        {category.label}
                      </Badge>
                      {event.id.startsWith('stage-') && event.stageStatus && (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                          {stageStatusLabel(event.stageStatus)}
                        </Badge>
                      )}
                      {event.isRegistered && (
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          参加予定
                        </Badge>
                      )}
                      {isDeadlineSoon && (
                        <Badge variant="destructive" className="animate-pulse">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          締切間近
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{dateInfo.formatted}</div>
                  {event.time && (
                    <div className="text-sm text-gray-600">{event.time}{event.endTime && ` - ${event.endTime}`}</div>
                  )}
                </div>
              </div>

              <p className="text-gray-600 mb-4 line-clamp-2 break-words">{event.description}</p>

              <div className="flex flex-wrap gap-2 mb-4">
                {!event.id.startsWith('stage-') && event.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                {event.location && (
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{event.location}</span>
                  </div>
                )}
                {event.maxParticipants && (
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>{event.currentParticipants}/{event.maxParticipants}人</span>
                  </div>
                )}
                <div className="flex items-center space-x-1">
                  <User className="w-4 h-4" />
                  <span className="truncate">{event.organizer}</span>
                </div>
                {event.registrationDeadline && (
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>締切: {formatDate(event.registrationDeadline).formatted}</span>
                  </div>
                )}
              </div>

              {/* For private/personal events, still allow quick add to Google Calendar */}
              {!event.isPublic && (
                <div className="flex justify-end">
                  <a
                    href={buildGoogleCalendarUrl(event)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button variant="outline" size="sm" className="flex items-center space-x-2">
                      <CalendarIcon className="w-4 h-4" />
                      <span>Googleカレンダーに追加</span>
                    </Button>
                  </a>
                </div>
              )}

              {event.isPublic && (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    {event.maxParticipants && (
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${(event.currentParticipants / event.maxParticipants) * 100}%` }}
                        />
                      </div>
                    )}
                    {/* Add to Google Calendar */}
                    <a
                      href={buildGoogleCalendarUrl(event)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="ml-2"
                    >
                      <Button variant="outline" size="sm" className="flex items-center space-x-2">
                        <CalendarIcon className="w-4 h-4" />
                        <span>Googleカレンダーに追加</span>
                      </Button>
                    </a>
                  </div>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEventRegistration(event.id);
                    }}
                    variant={event.isRegistered ? "outline" : "default"}
                    size="sm"
                  >
                    {event.isRegistered ? "キャンセル" : "参加申し込み"}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  // --- Inline editing for stage events ---
  const updateStageEvent = async (stageId: string, payload: { name?: string; date?: string; time?: string; location?: string; notes?: string; status?: StageStatus; }) => {
    try {
      const { error } = await supabase
        .from('ipo_selection_stages')
        .update({
          name: payload.name,
          date: payload.date,
          time: payload.time,
          location: payload.location,
          notes: payload.notes,
          status: payload.status,
        })
        .eq('id', stageId);
      if (error) throw error;
      // フロントの状態も更新
      setEvents(prev => prev.map(e => {
        if (e.id === `stage-${stageId}`) {
          return {
            ...e,
            title: payload.name ?? e.title,
            date: payload.date ? new Date(`${payload.date}T${(payload.time ?? e.time ?? '09:00')}:00`).toISOString() : e.date,
            time: payload.time ?? e.time,
            location: payload.location ?? e.location,
            description: payload.notes ?? e.description,
            stageStatus: payload.status ?? e.stageStatus,
          };
        }
        return e;
      }));
      // 選択中の詳細も更新
      setSelectedEvent(prev => prev && prev.id === `stage-${stageId}` ? {
        ...prev,
        title: payload.name ?? prev.title,
        date: payload.date ? new Date(`${payload.date}T${(payload.time ?? prev.time ?? '09:00')}:00`).toISOString() : prev.date,
        time: payload.time ?? prev.time,
        location: payload.location ?? prev.location,
        description: payload.notes ?? prev.description,
        stageStatus: payload.status ?? prev.stageStatus,
      } : prev);
    } catch (e) {
      console.error(e);
      setError('更新に失敗しました');
    }
  };

  const EventDetailDialog = () => {
    if (!selectedEvent) return null;
    
    const category = EVENT_CATEGORIES[selectedEvent.category];
    const IconComponent = category.icon;
    const dateInfo = formatDate(selectedEvent.date);
    const isStage = selectedEvent.id.startsWith('stage-');
    const [editMode, setEditMode] = React.useState(false);
    const [form, setForm] = React.useState<StageForm>({
      name: selectedEvent.title,
      date: selectedEvent.date.slice(0,10),
      time: selectedEvent.time || '',
      location: selectedEvent.location || '',
      notes: selectedEvent.description || '',
      status: castStageStatus(selectedEvent.stageStatus),
      tagsText: (selectedEvent.tags || []).join(', '),
      category: selectedEvent.category,
    });

    return (
      <Dialog open={showEventDetail} onOpenChange={setShowEventDetail}>
        <DialogContent className="w-screen max-w-[100vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className={`h-3 bg-gradient-to-r ${category.color} md:-mx-6 md:-mt-6 mx-0 mt-0 mb-6`} />
            <div className="flex items-start space-x-4">
              <div className={`w-16 h-16 bg-gradient-to-br ${category.color} rounded-xl flex items-center justify-center text-white flex-shrink-0`}>
                <IconComponent className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-2xl mb-2">{selectedEvent.title}</DialogTitle>
                <DialogDescription>
                  {selectedEvent.organizer}主催 • {dateInfo.formatted}
                  {selectedEvent.time && ` ${selectedEvent.time}`}
                  {selectedEvent.location && ` • ${selectedEvent.location}`}
                </DialogDescription>
                <div className="flex items-center space-x-2 mb-4">
                  <Badge className={category.bgColor}>
                    {category.label}
                  </Badge>
                  {isStage && selectedEvent.stageStatus && (
                    <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                      {stageStatusLabel(selectedEvent.stageStatus)}
                    </Badge>
                  )}
                  {selectedEvent.isRegistered && (
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      参加予定
                    </Badge>
                  )}
                </div>
                {isStage && (
                  <div className="mt-2">
                    <Button variant="outline" size="sm" onClick={() => setEditMode(v => !v)}>
                      {editMode ? '編集をやめる' : '編集'}
                    </Button>
                  </div>
                )}
                {/* 編集ボタン for personal/private events */}
                {!isStage && !selectedEvent.isPublic && (
                  <div className="mt-2">
                    <Button variant="outline" size="sm" onClick={() => setEditMode(v => !v)}>
                      {editMode ? '編集をやめる' : '編集'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Event Details */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">開催情報</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <CalendarIcon className="w-4 h-4 text-gray-500" />
                      <span>{dateInfo.formatted}</span>
                    </div>
                    {selectedEvent.time && (
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span>{selectedEvent.time}{selectedEvent.endTime && ` - ${selectedEvent.endTime}`}</span>
                      </div>
                    )}
                    {selectedEvent.location && (
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-gray-500" />
                        <span>{selectedEvent.location}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span>主催: {selectedEvent.organizer}</span>
                    </div>
                  </div>
                </div>

                {selectedEvent.maxParticipants && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">参加状況</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>参加者数</span>
                        <span>{selectedEvent.currentParticipants}/{selectedEvent.maxParticipants}人</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${(selectedEvent.currentParticipants / selectedEvent.maxParticipants) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {selectedEvent.registrationDeadline && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">申し込み締切</h4>
                    <p className="text-sm text-gray-600">{formatDate(selectedEvent.registrationDeadline).formatted}</p>
                  </div>
                )}

                {selectedEvent.targetAudience && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">対象者</h4>
                    <p className="text-sm text-gray-600">{selectedEvent.targetAudience}</p>
                  </div>
                )}

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">タグ</h4>
                  <div className="flex flex-wrap gap-2">
                    {!isStage && selectedEvent.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Inline edit form for stage event */}
            {isStage && editMode && (
              <div className="p-4 border rounded-md bg-muted/20 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="stage-name">名称</Label>
                    <Input id="stage-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="stage-status">ステータス</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as StageStatus })}>
                      <SelectTrigger id="stage-status"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">予定</SelectItem>
                        <SelectItem value="pending">保留</SelectItem>
                        <SelectItem value="passed">合格</SelectItem>
                        <SelectItem value="failed">不合格</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="stage-date">日付</Label>
                    <Input id="stage-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="stage-time">時間</Label>
                    <Input id="stage-time" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="stage-location">場所</Label>
                    <Input id="stage-location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="stage-notes">メモ</Label>
                    <Textarea id="stage-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditMode(false)}>キャンセル</Button>
                  <Button onClick={() => updateStageEvent(selectedEvent.id.replace('stage-',''), { ...form })}>保存</Button>
                </div>
              </div>
            )}

            {/* Inline edit form for personal/private events */}
            {!isStage && editMode && (
              <div className="p-4 border rounded-md bg-muted/20 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="event-title">タイトル</Label>
                    <Input id="event-title" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="event-date">日付</Label>
                    <Input id="event-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="event-time">時間</Label>
                    <Input id="event-time" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
                  </div>
                  {/* Category selector */}
                  <div>
                    <Label htmlFor="event-category">カテゴリ</Label>
                    <Select value={form.category ?? selectedEvent.category} onValueChange={(v) => setForm({ ...form, category: v as CalendarEvent['category'] })}>
                      <SelectTrigger id="event-category"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(EVENT_CATEGORIES).map(([key, c]) => (
                          <SelectItem key={key} value={key}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="event-location">場所</Label>
                    <Input id="event-location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="event-tags">タグ（カンマ区切り）</Label>
                    <Input id="event-tags" placeholder="例: インターン, OB訪問" value={form.tagsText ?? ''} onChange={(e) => setForm({ ...form, tagsText: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="event-notes">詳細</Label>
                    <Textarea id="event-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditMode(false)}>キャンセル</Button>
                  <Button onClick={async () => {
                    try {
                      const tagsArr = (form.tagsText ?? '').split(',').map(s => s.trim()).filter(Boolean);
                      const idNum = Number(selectedEvent.id);
                      const idValue = Number.isFinite(idNum) ? idNum : selectedEvent.id; // bigint列対策
                      const cat = (form.category ?? selectedEvent.category);
                      const { error } = await supabase
                        .from('ipo_calendar_events')
                        .update({
                          title: form.name,
                          date: form.date,
                          time: form.time || null,
                          location: form.location,
                          description: form.notes,
                          tags: tagsArr.length ? tagsArr : [],
                          category: cat,
                        })
                        .eq('id', idValue as any);
                      if (error) throw error;
                      setEvents(prev => prev.map(e => e.id === selectedEvent.id ? { ...e, title: form.name, date: new Date(`${form.date}T${form.time || '00:00'}:00`).toISOString(), time: form.time, location: form.location, description: form.notes, tags: tagsArr, category: cat } : e));
                      setSelectedEvent(prev => prev ? { ...prev, title: form.name, date: new Date(`${form.date}T${form.time || '00:00'}:00`).toISOString(), time: form.time, location: form.location, description: form.notes, tags: tagsArr, category: cat } : prev);
                      setEditMode(false);
                    } catch (e) {
                      console.error(e);
                      setError('予定の更新に失敗しました');
                    }
                  }}>保存</Button>
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">詳細</h4>
              <p className="text-gray-600 leading-relaxed break-words">{selectedEvent.description}</p>
            </div>
            {/* Requirements */}
            {selectedEvent.requirements && selectedEvent.requirements.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">参加要件</h4>
                <ul className="space-y-1">
                  {selectedEvent.requirements.map((req, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Benefits */}
            {selectedEvent.benefits && selectedEvent.benefits.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">参加特典</h4>
                <ul className="space-y-1">
                  {selectedEvent.benefits.map((benefit, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-center space-x-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t">
              <div className="flex items-center gap-2">
                <a
                  href={buildGoogleCalendarUrl(selectedEvent)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" className="flex items-center space-x-2">
                    <CalendarIcon className="w-4 h-4" />
                    <span>Googleカレンダーに追加</span>
                  </Button>
                </a>
                <Button variant="outline" className="flex items-center space-x-2">
                  <Bell className="w-4 h-4" />
                  <span>リマインダー設定</span>
                </Button>
              </div>
              {selectedEvent.isPublic && (
                <Button
                  onClick={() => handleEventRegistration(selectedEvent.id)}
                  variant={selectedEvent.isRegistered ? "outline" : "default"}
                  className="sm:flex-1"
                >
                  {selectedEvent.isRegistered ? "参加をキャンセル" : "参加申し込み"}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="bg-background min-h-screen w-full max-w-[100vw] overflow-x-hidden">
      {loading && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="p-8 text-center">読み込み中...</CardContent>
          </Card>
        </div>
      )}
      {error && !loading && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Card>
            <CardContent className="p-4 text-red-600">{error}</CardContent>
          </Card>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-8"
        >
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">イベントカレンダー</h1>
              <p className="text-muted-foreground text-lg">就活支援イベントと個人予定を管理</p>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" className="flex items-center space-x-2">
                <Bell className="w-4 h-4" />
                <span>通知設定</span>
              </Button>
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button className="flex items-center space-x-2" onClick={() => setShowCreateDialog(true)}>
                    <Plus className="w-4 h-4" />
                    <span>予定を追加</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-screen max-w-[100vw] sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>個人予定を追加</DialogTitle>
                    <DialogDescription>自分用の予定を作成して、Google/Appleカレンダーに登録できます。</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <Label htmlFor="c-title">タイトル</Label>
                      <Input id="c-title" value={createForm.title} onChange={(e)=>setCreateForm({...createForm,title:e.target.value})} />
                    </div>
                    <div>
                      <Label htmlFor="c-date">日付</Label>
                      <Input id="c-date" type="date" value={createForm.date} onChange={(e)=>setCreateForm({...createForm,date:e.target.value})} />
                    </div>
                    <div>
                      <Label htmlFor="c-time">開始時間（任意）</Label>
                      <Input id="c-time" type="time" value={createForm.time} onChange={(e)=>setCreateForm({...createForm,time:e.target.value})} />
                    </div>
                    <div>
                      <Label htmlFor="c-end">終了時間（任意）</Label>
                      <Input id="c-end" type="time" value={createForm.endTime} onChange={(e)=>setCreateForm({...createForm,endTime:e.target.value})} />
                    </div>
                    <div>
                      <Label htmlFor="c-category">カテゴリ</Label>
                      <Select value={createForm.category} onValueChange={(v)=>setCreateForm({...createForm,category: v as CalendarEvent['category']})}>
                        <SelectTrigger id="c-category"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(EVENT_CATEGORIES).map(([key, c]) => (
                            <SelectItem key={key} value={key}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="c-location">場所（任意）</Label>
                      <Input id="c-location" value={createForm.location} onChange={(e)=>setCreateForm({...createForm,location:e.target.value})} />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="c-desc">詳細（任意）</Label>
                      <Textarea id="c-desc" value={createForm.description} onChange={(e)=>setCreateForm({...createForm,description:e.target.value})} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={()=>setShowCreateDialog(false)}>閉じる</Button>
                    <Button onClick={async ()=>{
                      // Create a local event object for calendar links
                      const newEvent: CalendarEvent = {
                        id: `local-${Date.now()}`,
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
                        tags: [],
                        registrationDeadline: undefined,
                        requirements: undefined,
                        benefits: undefined,
                        targetAudience: undefined,
                        isRegistered: true,
                        registrationStatus: 'open',
                      };
                      try {
                        // Persist to Supabase (private event)
                        const { data, error } = await supabase.from('ipo_calendar_events').insert({
                          title: newEvent.title,
                          type: newEvent.type,
                          category: newEvent.category,
                          date: new Date(createForm.date).toISOString(),
                          time: createForm.time || null,
                          end_time: createForm.endTime || null,
                          location: createForm.location || null,
                          description: newEvent.description,
                          priority: 'low',
                          is_public: false,
                          max_participants: null,
                          organizer: '自分',
                          tags: [],
                          registration_deadline: null,
                          requirements: null,
                          benefits: null,
                          target_audience: null,
                          registration_status: 'open',
                        }).select('id').single();
                        if (error) throw error;
                        // reflect to UI state
                        const savedId = String(data.id);
                        setEvents(prev => [{ ...newEvent, id: savedId }, ...prev]);
                        setShowCreateDialog(false);
                        setCreateForm({ title:'', category:'personal', date: new Date().toISOString().slice(0,10), time:'', endTime:'', location:'', description:'' });
                        // Optional: immediately open detail dialog
                        startTransition(()=>{ setSelectedEvent({ ...newEvent, id: savedId }); setShowEventDetail(true); });
                      } catch(e) {
                        console.error(e);
                        setError('予定の作成に失敗しました');
                      }
                    }}>保存</Button>
                    <Button variant="outline" onClick={()=>{
                      const ev: CalendarEvent = {
                        id: `local-${Date.now()}`,
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
                        tags: [],
                        isRegistered: true,
                        registrationStatus: 'open',
                      };
                      // Apple/Outlook: download .ics
                      downloadICS(ev);
                    }}>Apple/Outlook に追加 (.ics)</Button>
                    <a
                      href={buildGoogleCalendarUrl({
                        id: 'new',
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
                        tags: [],
                        isRegistered: true,
                        registrationStatus: 'open',
                      })}
                      target="_blank" rel="noopener noreferrer"
                      onClick={(e)=> e.stopPropagation()}
                    >
                      <Button variant="outline">Googleカレンダーに追加</Button>
                    </a>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          {/* On mobile: 2列想定。選考管理の先行予約も合算表示 */}
          <div className="flex gap-3 overflow-x-auto md:overflow-visible md:grid md:grid-cols-4 md:gap-6 px-2">
            <Card className="min-w-0">
              <CardContent className="p-4 md:p-6 text-center">
                <div className="text-lg md:text-2xl font-bold text-blue-600 mb-0.5 md:mb-1">
                  {events.filter(e => e.isRegistered).length}
                </div>
                <div className="text-xs md:text-sm text-gray-600">参加予定</div>
              </CardContent>
            </Card>
            <Card className="min-w-0">
              <CardContent className="p-4 md:p-6 text-center">
                <div className="text-lg md:text-2xl font-bold text-green-600 mb-0.5 md:mb-1">
                  {events.filter(e => e.isPublic && !e.isRegistered && e.registrationStatus === 'open').length}
                </div>
                <div className="text-xs md:text-sm text-gray-600">申し込み可能</div>
              </CardContent>
            </Card>
            <Card className="min-w-0">
              <CardContent className="p-4 md:p-6 text-center">
                <div className="text-lg md:text-2xl font-bold text-orange-600 mb-0.5 md:mb-1">
                  {events.filter(e => e.registrationDeadline && new Date(e.registrationDeadline) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)).length}
                </div>
                <div className="text-xs md:text-sm text-gray-600">締切間近</div>
              </CardContent>
            </Card>
            <Card className="min-w-0">
              <CardContent className="p-4 md:p-6 text-center">
                <div className="text-lg md:text-2xl font-bold text-purple-600 mb-0.5 md:mb-1">
                  {weekEvents.length}
                </div>
                <div className="text-xs md:text-sm text-gray-600">今週の予定</div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Search and Filter */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-4 mb-8"
        >
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="イベントを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full lg:w-48">
              <SelectValue placeholder="カテゴリ選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              <SelectItem value="registered">参加予定</SelectItem>
              {Object.entries(EVENT_CATEGORIES).map(([key, category]) => (
                <SelectItem key={key} value={key}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="events">イベント一覧</TabsTrigger>
            <TabsTrigger value="week">週表示</TabsTrigger>
            <TabsTrigger value="month">月表示</TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="space-y-6">
            <AnimatePresence>
              {filteredEvents.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Card>
                    <CardContent className="p-12 text-center">
                      <CalendarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-medium text-gray-900 mb-2">該当するイベントがありません</h3>
                      <p className="text-gray-600">検索条件を変更してお試しください。</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <div className="grid gap-6">
                  {filteredEvents
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((event, index) => (
                      <motion.div
                        key={event.id}
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <EventCard event={event} />
                      </motion.div>
                    ))
                  }
                </div>
              )}
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="week" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">週表示</h2>
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentWeek(currentWeek - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="font-medium text-gray-900 min-w-max">{formatWeekRange()}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentWeek(currentWeek + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {weekEvents.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">予定がありません</h3>
                    <p className="text-gray-600">この週のイベントはまだ登録されていません。</p>
                  </CardContent>
                </Card>
              ) : (
                weekEvents
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map((event) => <EventCard key={event.id} event={event} isCompact />)
              )}
            </div>
          </TabsContent>

          <TabsContent value="month" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {events
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((event) => <EventCard key={event.id} event={event} isCompact />)
              }
            </div>
          </TabsContent>
        </Tabs>

        {/* Event Detail Dialog */}
        <EventDetailDialog />
      </div>
    </div>
  );
}