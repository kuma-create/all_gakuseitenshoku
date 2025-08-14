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

export default function CalendarPage() {
  const [activeTab, setActiveTab] = useState<'week' | 'month' | 'events'>('events');
  const [currentWeek, setCurrentWeek] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventDetail, setShowEventDetail] = useState(false);

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
          .select('*')
          .or(user ? `is_public.eq.true,user_id.eq.${user.id}` : 'is_public.eq.true')
          .order('date', { ascending: true })
          .returns<DbEvent[]>();
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
            .in('event_id', eventIdsNum as number[])
            .returns<RegistrationRow[]>();
          if (regErr) throw regErr;
          myRegs = new Set((regs ?? []).map(r => String(r.event_id)));
        }

        // aggregate counts per event
        const countsMap = new Map<string, number>();
        if (eventIds.length) {
          const { data: allRegs, error: countErr } = await supabase
            .from('ipo_event_registrations')
            .select('event_id')
            .in('event_id', eventIdsNum as number[])
            .returns<RegistrationRow[]>();
          if (countErr) throw countErr;
          if (allRegs) {
            for (const r of allRegs) {
              const id = String(r.event_id);
              countsMap.set(id, (countsMap.get(id) ?? 0) + 1);
            }
          }
        }

        const mapped = (rows ?? []).map((r: any) => {
          const id = String(r.id);
          const isReg = myRegs.has(id);
          const cnt = countsMap.get(id) ?? 0;
          return mapRowToEvent(r as DbEvent, isReg, cnt);
        });

        setEvents(mapped);
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
                    <h3 className="font-bold text-gray-900 text-lg mb-1">{event.title}</h3>
                    <div className="flex items-center space-x-2">
                      <Badge className={category.bgColor}>
                        {category.label}
                      </Badge>
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

              <p className="text-gray-600 mb-4 line-clamp-2">{event.description}</p>

              <div className="flex flex-wrap gap-2 mb-4">
                {event.tags.map((tag, index) => (
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

              {event.isPublic && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {event.maxParticipants && (
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${(event.currentParticipants / event.maxParticipants) * 100}%` }}
                        />
                      </div>
                    )}
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

  const EventDetailDialog = () => {
    if (!selectedEvent) return null;
    
    const category = EVENT_CATEGORIES[selectedEvent.category];
    const IconComponent = category.icon;
    const dateInfo = formatDate(selectedEvent.date);

    return (
      <Dialog open={showEventDetail} onOpenChange={setShowEventDetail}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className={`h-3 bg-gradient-to-r ${category.color} -mx-6 -mt-6 mb-6`} />
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
                  {selectedEvent.isRegistered && (
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      参加予定
                    </Badge>
                  )}
                </div>
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
                    {selectedEvent.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">詳細</h4>
              <p className="text-gray-600 leading-relaxed">{selectedEvent.description}</p>
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
            {selectedEvent.isPublic && (
              <div className="flex space-x-4 pt-4 border-t">
                <Button
                  onClick={() => handleEventRegistration(selectedEvent.id)}
                  variant={selectedEvent.isRegistered ? "outline" : "default"}
                  className="flex-1"
                >
                  {selectedEvent.isRegistered ? "参加をキャンセル" : "参加申し込み"}
                </Button>
                <Button variant="outline" className="flex items-center space-x-2">
                  <Bell className="w-4 h-4" />
                  <span>リマインダー設定</span>
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="bg-background min-h-screen">
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
              <Button className="flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>予定を追加</span>
              </Button>
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
          {/* On mobile: horizontal compact row with scroll; on md+: 4-column grid */}
          <div className="flex gap-3 overflow-x-auto md:overflow-visible md:grid md:grid-cols-4 md:gap-6">
            <Card className="min-w-[9rem] md:min-w-0">
              <CardContent className="p-4 md:p-6 text-center">
                <div className="text-lg md:text-2xl font-bold text-blue-600 mb-0.5 md:mb-1">
                  {events.filter(e => e.isRegistered).length}
                </div>
                <div className="text-xs md:text-sm text-gray-600">参加予定</div>
              </CardContent>
            </Card>
            <Card className="min-w-[9rem] md:min-w-0">
              <CardContent className="p-4 md:p-6 text-center">
                <div className="text-lg md:text-2xl font-bold text-green-600 mb-0.5 md:mb-1">
                  {events.filter(e => e.isPublic && !e.isRegistered && e.registrationStatus === 'open').length}
                </div>
                <div className="text-xs md:text-sm text-gray-600">申し込み可能</div>
              </CardContent>
            </Card>
            <Card className="min-w-[9rem] md:min-w-0">
              <CardContent className="p-4 md:p-6 text-center">
                <div className="text-lg md:text-2xl font-bold text-orange-600 mb-0.5 md:mb-1">
                  {events.filter(e => e.registrationDeadline && new Date(e.registrationDeadline) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)).length}
                </div>
                <div className="text-xs md:text-sm text-gray-600">締切間近</div>
              </CardContent>
            </Card>
            <Card className="min-w-[9rem] md:min-w-0">
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