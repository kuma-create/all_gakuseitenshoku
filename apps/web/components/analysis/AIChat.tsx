'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Lightbulb, Heart, Brain, Target, HelpCircle, Trash2 } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
// --- Local persistence keys (per user) ---
const storageKeys = (userId: string) => ({
  messages: `aichat:${userId}:messages`, // (legacy) single-thread messages
  meta: `aichat:${userId}:meta`,         // { threadId, chatMode, interactionMode }
  threads: `aichat:${userId}:threads`,   // Thread[]
});

// Serialize/deserialize Message[] for storage
const serializeMessages = (msgs: Message[]) =>
  msgs.map((m) => ({ ...m, timestamp: (m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp)).toISOString() }));

const deserializeMessages = (raw: any): Message[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((m) => ({ ...m, timestamp: new Date(m.timestamp) }))
    .filter((m) => m && typeof m.id === 'string' && m.content);
};

const persistThreads = (keys: ReturnType<typeof storageKeys>, ts: Thread[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      keys.threads,
      JSON.stringify(ts.map(t => ({ ...t, messages: serializeMessages(t.messages) })))
    );
  } catch {}
};

interface Thread {
  id: string;
  title?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  mode?: string;     // chatMode at creation
  messages: Message[];
}

const makeThread = (id: string, mode: string, messages: Message[] = []): Thread => ({
  id,
  title: titleFromMessages(messages),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  mode,
  messages,
});

// --- Helpers for thread title/preview based on first user message ---
const getFirstUserMessage = (msgs: Message[] = []) => msgs.find(m => m.type === 'user');
const titleFromMessages = (msgs: Message[]) => {
  const u = getFirstUserMessage(msgs);
  return u?.content?.slice(0, 24) || '新しいスレッド';
};

interface AIChatProps {
  userId: string;
  onProgressUpdate: (progress: number) => void;
  /** 親の自己分析ノートへ反映するためのコールバック */
  onApplyToManual?: (
    update: Partial<{
      prTitle: string;
      about: string;
      prText: string;
      selfAnalysis: string;
      strengths: string[];
    }>
  ) => void;
  /** セクション単位の実進捗（0~1）: 自己分析ノート, ライフチャート, 強み弱み, 経験の整理, 将来ビジョン */
  sectionProgress?: Partial<{
    selfNote: number;         // 自己分析ノート
    lifeChart: number;        // ライフチャート
    strengthsWeaknesses: number; // 強み弱み
    experience: number;       // 経験の整理
    futureVision: number;     // 将来のビジョン
  }>;
  /** セクションごとの重み（省略時はすべて1.0） */
  weights?: Partial<{
    selfNote: number;
    lifeChart: number;
    strengthsWeaknesses: number;
    experience: number;
    futureVision: number;
  }>;
}

interface Message {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  category?: string;
  insights?: string[];
  questions?: string[];
  saved?: boolean;
  emoji?: string;
}

interface ChatStats {
  messagesCount: number;
  insightsGenerated: number;
  topicsDiscussed: string[];
  emotionalState: 'positive' | 'neutral' | 'negative' | 'mixed';
  sessionDuration: number;
  deepThoughts: number;
}

const chatModes = [
  {
    id: 'empathetic',
    name: '共感型',
    description: '感情に寄り添う対話',
    icon: Heart,
    color: 'from-pink-500 to-red-500',
    bgColor: 'bg-pink-50'
  },
  {
    id: 'analytical',
    name: '分析型',
    description: '論理的な思考整理',
    icon: Brain,
    color: 'from-blue-500 to-purple-500',
    bgColor: 'bg-blue-50'
  },
  {
    id: 'questioning',
    name: '質問型',
    description: '深掘りする対話',
    icon: HelpCircle,
    color: 'from-green-500 to-blue-500',
    bgColor: 'bg-green-50'
  },
  {
    id: 'coaching',
    name: 'コーチング型',
    description: '目標達成をサポート',
    icon: Target,
    color: 'from-orange-500 to-red-500',
    bgColor: 'bg-orange-50'
  }
];

export function AIChat({ userId, onProgressUpdate, onApplyToManual, sectionProgress, weights }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [chatMode, setChatMode] = useState('empathetic');
  const [interactionMode, setInteractionMode] = useState<'free' | 'fill'>('free');
  const [progressPercent, setProgressPercent] = useState(0);
  const [stats, setStats] = useState<ChatStats>({
    messagesCount: 0,
    insightsGenerated: 0,
    topicsDiscussed: [],
    emotionalState: 'neutral',
    sessionDuration: 0,
    deepThoughts: 0
  });
  const [sessionStartTime] = useState(Date.now());
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  // keys for localStorage (scoped by user)
  const keys = storageKeys(userId);
  // Responsive max height for the scroll area (handles mobile keyboards/safe areas)
  // 初期値はundefined（後で計算）
  const [listMaxHeight, setListMaxHeight] = useState<number | undefined>(undefined);
  const [footerHeight, setFooterHeight] = useState(0);
  const [showHistory, setShowHistory] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- 真の空欄補充率を計算（0~100） ---
  const computeSectionPercent = useCallback((): number | null => {
    const sp = sectionProgress || {};
    const entries: Array<[keyof NonNullable<typeof sp>, number]> = Object.entries(sp)
      .filter(([, v]) => typeof v === 'number') as any;
    if (entries.length === 0) return null;

    const w = {
      selfNote: 1,
      lifeChart: 1,
      strengthsWeaknesses: 1,
      experience: 1,
      futureVision: 1,
      ...(weights || {})
    } as Record<string, number>;

    let weighted = 0;
    let totalW = 0;
    for (const [k, v] of entries) {
      const val = Math.max(0, Math.min(1, Number(v)));
      const ww = Math.max(0, Number(w[String(k)] ?? 1));
      weighted += val * ww;
      totalW += ww;
    }
    if (totalW === 0) return 0;
    return Math.round((weighted / totalW) * 100);
  }, [sectionProgress, weights]);


  // 画面下部のタブバー(ナビゲーション)高さを推定して、ファーストビューで入力欄が見えるように調整
  const getBottomNavHeight = () => {
    if (typeof window === 'undefined') return 0;
    // CSS変数優先
    const root = document.documentElement;
    const varKeys = ['--bottom-nav-height', '--app-tabbar-height', '--tabbar-height'];
    for (const key of varKeys) {
      const v = getComputedStyle(root).getPropertyValue(key).trim();
      if (v) {
        const px = parseInt(v.replace('px','').trim(), 10);
        if (!Number.isNaN(px)) return px;
      }
    }
    // 要素ID候補
    const ids = ['app-tabbar', 'tabbar', 'bottom-nav'];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el && (el as HTMLElement).offsetHeight) return (el as HTMLElement).offsetHeight;
    }
    // iOSセーフエリア + 想定タブバー
    const safe = (window as any).visualViewport ? Math.max(0, ((window as any).visualViewport.height || 0) - window.innerHeight) : 0;
    return 64 + safe; // デフォルトで約64px確保
  };

  // スクロールエリアの高さを動的に計算する関数
  const computeHeights = useCallback(() => {
    if (typeof window === 'undefined') return;

    // ビューポートの高さ（キーボードを考慮）
    const vv = (window as any).visualViewport;
    const viewportHeight = vv ? Math.floor(vv.height) : window.innerHeight;
    
    // ヘッダーとフッターの高さを取得
    const headerH = headerRef.current?.offsetHeight || 0;
    const footerH = footerRef.current?.offsetHeight || 0;
    setFooterHeight(footerH);
    
    // スクロール領域の最大高さを計算
    const topOffset = headerRef.current?.getBoundingClientRect().top || 0;
    const extraBottom = getBottomNavHeight();
    const maxH = Math.max(100, viewportHeight - topOffset - headerH - footerH - extraBottom - 4); // わずかな余白＋タブバー
    setListMaxHeight(maxH);
  }, []);

  // 初期化とイベントリスナーの設定
  useEffect(() => {
    initializeChat();
    
    const timer = setInterval(() => {
      setStats(prev => ({
        ...prev,
        sessionDuration: Math.floor((Date.now() - sessionStartTime) / 1000)
      }));
    }, 1000);

    // 初回描画時に高さを計算
    computeHeights();
    // 初回レンダ後にも再計算（外側のレイアウト確定後）
    setTimeout(() => computeHeights(), 0);

    const vv = (window as any).visualViewport;
    window.addEventListener('resize', computeHeights);
    window.addEventListener('orientationchange', computeHeights);
    if (vv) vv.addEventListener('resize', computeHeights);

    // ResizeObserverでヘッダー/フッターの高さ変化を監視
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && headerRef.current && footerRef.current) {
      ro = new ResizeObserver(() => {
        computeHeights();
        // 高さ変更後に一番下へスクロール
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if(scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          });
        });
      });
      ro.observe(headerRef.current);
      ro.observe(footerRef.current);
    }
    
    return () => {
      clearInterval(timer);
      window.removeEventListener('resize', computeHeights);
      window.removeEventListener('orientationchange', computeHeights);
      if (vv) vv.removeEventListener('resize', computeHeights);
      if (ro) ro.disconnect();
    };
  }, [userId, computeHeights, sessionStartTime]);

  // メッセージ追加時に一番下へスクロール
  useEffect(() => {
    const scrollToBottom = () => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    };
    
    // RAFで描画後に確実にスクロール
    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToBottom);
    });
  }, [messages]);

  // 進捗率の計算
  useEffect(() => {
    const sectionPercent = computeSectionPercent();
    if (sectionPercent !== null) {
      setProgressPercent(sectionPercent);
      onProgressUpdate?.(sectionPercent);
      return;
    }
    // フォールバック: 会話ベース進行度
    const fallback = Math.min(100, messages.length * 3 + stats.insightsGenerated * 5 + stats.deepThoughts * 10);
    setProgressPercent(fallback);
    onProgressUpdate?.(fallback);
  }, [computeSectionPercent, messages, stats.insightsGenerated, stats.deepThoughts, onProgressUpdate]);

  const initializeChat = async () => {
    try {
      setLoading(true);
      if (typeof window !== 'undefined') {
        try {
          // 1) Load threads list (new format)
          const rawThreads = window.localStorage.getItem(keys.threads);
          if (rawThreads) {
            const parsed: Thread[] = JSON.parse(rawThreads);
            const normalized = parsed.map(t => ({
              ...t,
              messages: deserializeMessages(t.messages),
            }));
            setThreads(normalized);
            // Normalize thread titles after loading
            setThreads(prev => prev.map(th => ({
              ...th,
              title: th.title && th.title !== '新しいスレッド' ? th.title : titleFromMessages(th.messages)
            })));
            // prefer last updated as current
            const latest = [...normalized].sort((a,b)=>new Date(b.updatedAt).getTime()-new Date(a.updatedAt).getTime())[0];
            if (latest) {
              setThreadId(latest.id);
              setMessages(latest.messages || []);
              setChatMode(latest.mode || chatMode);
            }
          } else {
            // 2) Legacy migration from single-thread storage
            const rawMsgs = window.localStorage.getItem(keys.messages);
            const rawMeta = window.localStorage.getItem(keys.meta);
            let legacyMsgs: Message[] = [];
            let legacyThreadId: string | null = null;
            if (rawMsgs) legacyMsgs = deserializeMessages(JSON.parse(rawMsgs));
            if (rawMeta) {
              const meta = JSON.parse(rawMeta) || {};
              if (typeof meta.threadId === 'string') legacyThreadId = meta.threadId;
              if (typeof meta.chatMode === 'string') setChatMode(meta.chatMode);
              if (meta.interactionMode === 'free' || meta.interactionMode === 'fill') setInteractionMode(meta.interactionMode);
            }
            const tid = legacyThreadId || `t-${Date.now()}`;
            const t = makeThread(tid, chatMode, legacyMsgs);
            setThreads([t]);
            setThreadId(tid);
            setMessages(legacyMsgs.length ? legacyMsgs : []);
            // write new format
            window.localStorage.setItem(keys.threads, JSON.stringify([{...t, messages: serializeMessages(t.messages)}]));
          }
        } catch (e) {
          console.warn('AIChat: restore/migrate failed', e);
        }
      }
      // 3) If still no messages (fresh user), seed with welcome
      if ((messages?.length || 0) === 0) {
        const welcomeMessage: Message = {
          id: 'welcome',
          type: 'ai',
          content:
            'こんにちは！AIアシスタントです。\n\nどんなことを話してみたいですか？\n\n- 最近感じていること\n- 過去の印象深い経験\n- 自分の性格について\n\nリラックスして、思ったことを自由にお話しください 😊',
          timestamp: new Date(),
          category: '導入',
          emoji: '🤖',
          questions: ['最近どんなことを考えていますか？', '今日の気分はどうですか？'],
        };
        setMessages([welcomeMessage]);
        const tid = threadId || `t-${Date.now()}`;
        if (!threadId) setThreadId(tid);
        // ユーザーの最初の入力が来るまでは threads には登録しない
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
    } finally {
      setLoading(false);
    }
  };
  // --- Persist to localStorage whenever state changes ---
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      // update threads with current thread's messages
      if (threadId) {
        setThreads((prev) => {
          const hasUser = !!getFirstUserMessage(messages);
          if (!hasUser) {
            // ユーザー発言がない場合はスレッドを保存しない
            return prev;
          }
          const idx = prev.findIndex(t => t.id === threadId);
          const nowIso = new Date().toISOString();
          const updatedThread: Thread = idx >= 0
            ? { ...prev[idx], messages, updatedAt: nowIso, mode: chatMode, title: prev[idx].title || titleFromMessages(messages) }
            : makeThread(threadId, chatMode, messages);
          const next = idx >= 0 ? Object.assign([...prev], { [idx]: updatedThread }) as Thread[] : [...prev, updatedThread];
          // write to storage
          window.localStorage.setItem(keys.threads, JSON.stringify(next.map(t => ({...t, messages: serializeMessages(t.messages)}))));
          // keep legacy keys for backward compatibility (optional)
          window.localStorage.setItem(keys.messages, JSON.stringify(serializeMessages(messages)));
          window.localStorage.setItem(keys.meta, JSON.stringify({ threadId, chatMode, interactionMode }));
          return next;
        });
      }
    } catch {}
  }, [messages, threadId, chatMode, interactionMode, keys.threads, keys.messages, keys.meta]);

  // --- Cross-tab sync: listen to storage events and update state ---
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (ev: StorageEvent) => {
      if (!ev.key) return;
      if (ev.key === keys.threads && ev.newValue) {
        try {
          const parsed: Thread[] = JSON.parse(ev.newValue);
          const normalized = parsed.map(t => ({...t, messages: deserializeMessages(t.messages)}));
          setThreads(normalized);
          // if current thread exists, refresh its messages
          const cur = threadId ? normalized.find(t=>t.id===threadId) : null;
          if (cur) setMessages(cur.messages || []);
        } catch {}
      }
      if (ev.key === keys.meta && ev.newValue) {
        try {
          const meta = JSON.parse(ev.newValue) || {};
          if (typeof meta.threadId === 'string') setThreadId(meta.threadId);
          if (typeof meta.chatMode === 'string') setChatMode(meta.chatMode);
          if (meta.interactionMode === 'free' || meta.interactionMode === 'fill') setInteractionMode(meta.interactionMode);
        } catch {}
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [keys.threads, keys.meta, threadId]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
      emoji: '👤'
    };

    const newMessages = [...messages, userMessage];
    // --- Update thread title if first message in thread ---
    setThreads(prev => prev.map(t => t.id===threadId ? { ...t, title: t.title || titleFromMessages([...messages, userMessage]), updatedAt: new Date().toISOString() } : t));
    setMessages(newMessages);
    setInputText('');
    setIsTyping(true);

    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    try {
      const aiResponse = await fetchAIResponse(newMessages, chatMode).catch(() => null);

      if (aiResponse) {
        const updated = [...newMessages, aiResponse];
        setMessages(updated);
        setIsTyping(false);
        updateStats(updated);
        return;
      }

      const mock = generateMockResponse(inputText, messages.length, chatMode);
      const updatedMessages = [...newMessages, mock];
      setMessages(updatedMessages);
      setIsTyping(false);
      updateStats(updatedMessages);
    } catch (error) {
      console.error('Error sending message:', error);
      setIsTyping(false);
    }
  };

  const generateMockResponse = (input: string, messageCount: number, mode: string): Message => {
    const responses = {
      empathetic: [
        'そのお気持ち、とてもよく分かります。そう感じるのは自然なことですね。もう少し詳しく教えていただけますか？',
        'なるほど、大変な思いをされたのですね。その時のお気持ちを聞かせてください。',
        'お話しいただいてありがとうございます。あなたの感情に寄り添いたいと思います。',
        'それは素晴らしい気づきですね。その感覚をもう少し掘り下げてみませんか？',
        'あなたの正直な気持ちを聞かせていただき、ありがとうございます。'
      ],
      analytical: [
        'なるほど、興味深い内容ですね。この状況を整理すると、主な要因は何だと考えられますか？',
        'データとして見ると、どのようなパターンが見えてきますか？',
        '論理的に分析してみると、次に取るべきステップは何でしょうか？',
        '客観的な視点から見て、この経験はどのような意味を持っていますか？',
        'その問題を構造化して考えてみましょう。根本的な原因は何でしょうか？'
      ],
      questioning: [
        'とても興味深いですね。なぜそのように感じるのか、根本的な理由は何だと思いますか？',
        'もしその状況が変わったとしたら、あなたはどう感じるでしょうか？',
        '同じような経験をした人に、あなたなら何とアドバイスしますか？',
        'この経験があなたの価値観にどのような影響を与えましたか？',
        'もし時間を巻き戻せるとしたら、同じ選択をしますか？その理由は？'
      ],
      coaching: [
        '素晴らしい洞察です！この気づきを具体的な行動につなげるには、どうしたらよいでしょうか？',
        'あなたの目標達成のために、次に何ができそうですか？',
        'この経験から得た学びを、今後どのように活用していきたいですか？',
        'あなたの強みを活かして、どんなことにチャレンジしてみたいですか？',
        '理想の自分に近づくために、今日から始められることは何でしょうか？'
      ]
    };
    
    const insights = ['この経験はあなたの成長において重要な意味を持っているようです', '感情の変化に気づくことは自己理解の第一歩です', '過去の経験が現在の価値観形成に大きく影響していることが分かります', 'この気づきは将来の選択に活かせる貴重な洞察です', 'あなたの考え方の特徴がよく表れています', 'このような自己反省ができることは素晴らしい能力です', '感情と論理のバランスが取れた判断ができているようです', 'この体験があなたの価値観を形作る重要な要素になっています'];
    const questions = ['この話をもっと詳しく聞かせてください', '同じような状況になったら、今度はどう対処しますか？', 'この経験から学んだことを一言で表すとすれば？', 'この気づきを今後どのように活用していきたいですか？', 'この経験があなたに与えた最も大きな変化は何ですか？', 'もしアドバイスを求められたら、何と言いますか？', 'この体験があなたの人生観に与えた影響は？', '似たような困難に直面している人に、どんな言葉をかけますか？'];
    const categories = ['自己理解', '価値観', '経験分析', '将来設計', '感情整理', '人間関係', 'キャリア', '成長', '挑戦'];
    const selectedCategory = categories[Math.floor(Math.random() * categories.length)];
    const responsePool = responses[mode as keyof typeof responses] || responses.empathetic;
    const selectedResponse = responsePool[Math.floor(Math.random() * responsePool.length)];
    const emojis = ['🤔', '💭', '✨', '🌟', '💡', '🎯', '🌱', '🔍', '💪', '🌈'];

    return {
      id: (Date.now() + 1).toString(),
      type: 'ai',
      content: selectedResponse,
      timestamp: new Date(),
      category: selectedCategory,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      insights: messageCount > 2 ? [insights[Math.floor(Math.random() * insights.length)]] : undefined,
      questions: messageCount > 1 ? [questions[Math.floor(Math.random() * questions.length)]] : undefined
    };
  };

  const fetchAIResponse = async (messageList: Message[], mode: string): Promise<Message | null> => {
    try {
      const payload = {
        messages: messageList.map(m => ({
          role: m.type === 'user' ? 'user' : m.type === 'ai' ? 'assistant' : 'system',
          content: m.content,
        })),
        mode,
        threadId,
      };
      const resp = await fetch('/api/aichat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        console.warn('fetchAIResponse: non-OK status', resp.status);
        return null;
      }
      const json: any = await resp.json();
      const data = json?.content ? json : json?.data ? json.data : null;
      if (!data || !data.content) return null;
      if (data.threadId && data.threadId !== threadId) setThreadId(data.threadId);

      const categories = ['自己理解', '価値観', '経験分析', '将来設計', '感情整理', '人間関係', 'キャリア', '成長', '挑戦'];
      return {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: data.content,
        timestamp: new Date(),
        category: data.category || categories[Math.floor(Math.random() * categories.length)],
        emoji: '🤖',
        insights: data.insights,
        questions: data.questions,
      };
    } catch (e) {
      console.warn('fetchAIResponse failed, fallback to mock:', e);
      return null;
    }
  };

  const updateStats = (messageList: Message[]) => {
    const topics = [...new Set(messageList.filter(m => m.category).map(m => m.category!))];
    const insights = messageList.reduce((count, m) => count + (m.insights?.length || 0), 0);
    const deepThoughts = messageList.filter(m => m.type === 'user' && m.content.length > 100).length;
    const emotionalState = analyzeEmotionalState(messageList);
    
    setStats(prev => ({
      ...prev,
      messagesCount: messageList.length,
      insightsGenerated: insights,
      topicsDiscussed: topics,
      emotionalState,
      deepThoughts
    }));
  };

  const analyzeEmotionalState = (messages: Message[]): 'positive' | 'neutral' | 'negative' | 'mixed' => {
    const recentMessages = messages.slice(-6);
    let positiveScore = 0;
    let negativeScore = 0;
    const positiveKeywords = ['嬉しい', '楽しい', '良い', 'できる', '成功', '喜び', '希望', '幸せ', '満足', '安心', '感謝', '素晴らしい'];
    const negativeKeywords = ['不安', '困る', '悪い', 'できない', '失敗', '悲しい', '心配', '辛い', '大変', '疲れ', '落ち込む', '迷う'];
    recentMessages.forEach(msg => {
      positiveKeywords.forEach(word => {
        if (msg.content.includes(word)) positiveScore++;
      });
      negativeKeywords.forEach(word => {
        if (msg.content.includes(word)) negativeScore++;
      });
    });
    if (positiveScore > negativeScore * 1.5) return 'positive';
    if (negativeScore > positiveScore * 1.5) return 'negative';
    if (positiveScore > 0 && negativeScore > 0) return 'mixed';
    return 'neutral';
  };

  const handleQuickPrompt = (prompt: string) => {
    setInputText(prompt);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getCurrentMode = () => {
    return chatModes.find(mode => mode.id === chatMode) || chatModes[0];
  };

  const currentMode = getCurrentMode();

  // -- Chat History helpers --
  const scrollToMessage = (mid: string) => {
    const el = document.getElementById(`msg-${mid}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setShowHistory(false);
    }
  };

  const exportJSON = () => {
    try {
      const blob = new Blob([
        JSON.stringify(serializeMessages(messages), null, 2)
      ], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'aichat-history.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.warn('export failed', e);
    }
  };

  // --- Thread operations ---
  const startNewThread = () => {
    const tid = `t-${Date.now()}`;
    setThreadId(tid);
    setMessages([]); // ユーザー初回入力までは threads に登録しない
    setShowHistory(false);
  };

  const switchThread = (tid: string) => {
    const t = threads.find(th => th.id === tid);
    if (!t) return;
    setThreadId(tid);
    setChatMode(t.mode || chatMode);
    setMessages(t.messages || []);
    setShowHistory(false);
  };

  const deleteThread = (tid: string) => {
    if (!confirm('このスレッドを削除します。よろしいですか？\n（この操作は取り消せません）')) return;
    setThreads(prev => {
      const next = prev.filter(t => t.id !== tid);
      // If the current thread was deleted, switch to the latest remaining thread or clear
      if (tid === threadId) {
        const latest = [...next].sort((a,b)=> new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
        if (latest) {
          setThreadId(latest.id);
          setChatMode(latest.mode || chatMode);
          setMessages(latest.messages || []);
        } else {
          setThreadId(null);
          setMessages([]);
        }
      }
      persistThreads(keys, next);
      // keep legacy meta pointing to current selection
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(keys.meta, JSON.stringify({ threadId: tid === threadId ? (next[0]?.id ?? null) : threadId, chatMode, interactionMode }));
        } catch {}
      }
      return next;
    });
  };

  const canShowApplyActions = (idx: number) => {
    const msg = messages[idx];
    const isLatestAi = idx === messages.length - 1 && msg?.type === 'ai';
    const filledMode = interactionMode === 'fill';
    const notTypingNow = !isTyping && !loading;
    const hasContent = !!msg?.content?.trim();
    const sp = computeSectionPercent();
    const needsFill = sp === null ? true : sp < 100;
    return Boolean(onApplyToManual) && isLatestAi && filledMode && notTypingNow && hasContent && needsFill;
  };
  
  const pickTitleFrom = (text: string) => (text || '').split(/\n|。/)[0]?.slice(0, 40) || '';
  const pickStrengthsFrom = (text: string): string[] => {
    const lines = (text || '').split(/\n+/).map(s => s.trim()).filter(Boolean);
    const bullets = lines
      .filter(l => /^[\-・*●■◆◇▪️•]/.test(l))
      .map(l => l.replace(/^[\-・*●■◆◇▪️•]\s*/, ''));
    const uniq: string[] = [];
    for (const b of bullets) {
      if (uniq.length >= 3) break;
      if (!uniq.includes(b)) uniq.push(b.slice(0, 40));
    }
    if (uniq.length === 0) {
      for (const l of lines) {
        if (uniq.length >= 3) break;
        if (l.length <= 28) uniq.push(l);
      }
    }
    return uniq.slice(0, 3);
  };

  if (loading) {
    return (
      <div className="w-full max-w-full md:max-w-5xl md:mx-auto px-0 sm:px-0 h-dvh min-h-[100dvh] pt-0 pb-0 overflow-hidden flex flex-col">
        <Card className="p-12 text-center">
          <div className="w-8 h-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">AIチャットを準備しています...</p>
        </Card>
      </div>
    );
  }

  const placeholderText = interactionMode === 'fill'
    ? '自己PRやプロフィールの空欄を一緒に埋めましょう。質問や回答を入力してください…'
    : '何でも気軽に話してください…';

  return (
    <div className="w-full max-w-full md:max-w-5xl md:mx-auto px-0 h-[100dvh] max-h-[100dvh] pt-0 pb-0 overflow-hidden flex flex-col">

      {/* Top Bar: 空欄補充率 + モード切替 */}
      <div ref={headerRef} className="sticky top-0 z-30 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-xl p-2 mb-1">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs sm:text-sm leading-relaxed mb-1">
              <span className="font-medium">自己分析の空欄補充率</span>
              <span className="tabular-nums">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2 md:mt-0 sm:flex sm:items-center sm:flex-wrap">
            <Button
              variant={interactionMode === 'free' ? 'default' : 'outline'}
              size="sm"
              className="text-xs sm:text-sm px-2 h-9 sm:h-8 w-full sm:w-auto"
              onClick={() => setInteractionMode('free')}
            >
              壁打ちモード
            </Button>
            <Button
              variant={interactionMode === 'fill' ? 'default' : 'outline'}
              size="sm"
              className="text-xs sm:text-sm px-2 h-9 sm:h-8 w-full sm:w-auto"
              onClick={() => setInteractionMode('fill')}
            >
              空欄を埋めるモード
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs sm:text-sm px-2 h-9 sm:h-8 col-span-2 w-full sm:w-auto"
              onClick={() => setShowHistory(true)}
              title="これまでの会話を一覧で表示"
            >
              履歴
            </Button>
          </div>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="px-3 py-2 space-y-3 min-h-0 overflow-y-auto overscroll-contain flex-1"
        style={{ maxHeight: listMaxHeight }}
      >
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div 
                key={message.id}
                id={`msg-${message.id}`}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <div className={`flex ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start space-x-3 max-w-[90vw] sm:max-w-[70%] md:max-w-[60%] lg:max-w-[50%] group`}>
                  <div className="flex-shrink-0">
                    {message.type === 'ai' ? (
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br ${currentMode.color} rounded-full flex items-center justify-center`}>
                        <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                    )}
                  </div>
                <div className={`rounded-2xl p-3 sm:p-4 relative break-words ${
                  message.type === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}>
                    <div className="flex items-start space-x-2 mb-2">
                      {message.emoji && (
                        <span className="text-lg flex-shrink-0">{message.emoji}</span>
                      )}
                      <p className="text-sm leading-relaxed whitespace-pre-line flex-1 break-words">{message.content}</p>
                    </div>
                    
                    {message.insights && (
                      <motion.div 
                        className="mt-3 p-3 bg-blue-100 rounded-lg"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ delay: 0.5 }}
                      >
                        <div className="flex items-center space-x-2 mb-2">
                          <Lightbulb className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-800">💡 気づき</span>
                        </div>
                        {message.insights.map((insight, i) => (
                          <p key={i} className="text-sm text-blue-700 leading-relaxed break-words">• {insight}</p>
                        ))}
                      </motion.div>
                    )}
                    
                    {message.questions && (
                      <div className="mt-3 space-y-1">
                        <div className="text-xs font-medium text-blue-600 mb-2">💭 続けて話せること:</div>
                        {message.questions.map((question, i) => (
                          <motion.button
                            key={i}
                            onClick={() => handleQuickPrompt(question)}
                            className="block w-full text-left text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed leading-relaxed break-words"
                            disabled={isTyping}
                            whileHover={{ x: 4 }}
                            transition={{ type: "spring", stiffness: 300 }}
                          >
                            {question}
                          </motion.button>
                        ))}
                      </div>
                    )}

                    {canShowApplyActions(index) && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="text-xs px-2 py-1 rounded border bg-muted hover:bg-muted/70 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={!pickTitleFrom(message.content)}
                          onClick={() => onApplyToManual?.({ prTitle: pickTitleFrom(message.content) })}
                          title="AIの最新メッセージから抽出して反映します"
                        >PRタイトルに反映</button>
                        <button
                          type="button"
                          className="text-xs px-2 py-1 rounded border bg-muted hover:bg-muted/70 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={!message.content?.trim()}
                          onClick={() => onApplyToManual?.({ about: message.content })}
                          title="AIの最新メッセージから抽出して反映します"
                        >自己紹介に反映</button>
                        <button
                          type="button"
                          className="text-xs px-2 py-1 rounded border bg-muted hover:bg-muted/70 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={!message.content?.trim()}
                          onClick={() => onApplyToManual?.({ prText: message.content })}
                          title="AIの最新メッセージから抽出して反映します"
                        >自己PRに反映</button>
                        <button
                          type="button"
                          className="text-xs px-2 py-1 rounded border bg-muted hover:bg-muted/70 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={!message.content?.trim()}
                          onClick={() => onApplyToManual?.({ selfAnalysis: message.content })}
                          title="AIの最新メッセージから抽出して反映します"
                        >自己分析に追記</button>
                        {(() => { const _s = pickStrengthsFrom(message.content); return (
                          <button
                            type="button"
                            className="text-xs px-2 py-1 rounded border bg-muted hover:bg-muted/70 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={_s.length === 0}
                            onClick={() => onApplyToManual?.({ strengths: _s })}
                            title="AIの最新メッセージから抽出して反映します"
                          >強みに追加</button>
                        ); })()}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/20">
                      <div className="flex items-center space-x-2">
                        {message.category && (
                          <Badge variant="secondary" className="text-xs">
                            {message.category}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs opacity-50">
                        {(message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {isTyping && (
            <motion.div 
              className="flex justify-start"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="flex items-start space-x-3 max-w-[90vw] sm:max-w-3xl">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br ${currentMode.color} rounded-full flex items-center justify-center`}>
                  <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="bg-muted rounded-2xl p-3 sm:p-4 border border-border/30">
                  <div className="flex space-x-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 bg-muted-foreground rounded-full"
                        animate={{
                          scale: [1, 1.5, 1],
                          opacity: [0.5, 1, 0.5]
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          delay: i * 0.2
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">AIが考えています...</p>
                </div>
              </div>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

      {showHistory && (
        <div className="fixed inset-0 z-[100] bg-black/30" onClick={() => setShowHistory(false)}>
          <div
            className="absolute right-0 top-0 h-full w-full sm:w-[min(90vw,360px)] bg-background shadow-2xl border-l p-3 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium"></div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="text-xs px-2 h-8" onClick={exportJSON}>エクスポート</Button>
                <Button variant="outline" size="sm" className="text-xs px-2 h-8" onClick={startNewThread}>新しいスレッド</Button>
                <Button variant="default" size="sm" className="text-xs px-2 h-8" onClick={() => setShowHistory(false)}>閉じる</Button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mb-2">スレッド単位で表示しています</div>
            <div className="flex-1 overflow-y-auto divide-y">
              {threads.length === 0 && (
                <div className="text-sm text-muted-foreground p-4">スレッドはまだありません。</div>
              )}
              {[...threads]
                .filter(t => !!getFirstUserMessage(t.messages))
                .sort((a,b)=> new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                .map((t) => (
                <div
                  key={t.id}
                  role="button"
                  tabIndex={0}
                  className={`w-full text-left p-3 hover:bg-muted/50 focus:bg-muted/70 rounded cursor-pointer ${t.id===threadId ? 'bg-muted/40' : ''}`}
                  onClick={() => switchThread(t.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); switchThread(t.id); } }}
                  title={`${new Date(t.updatedAt).toLocaleString()}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-sm truncate">{t.title || '無題のスレッド'}</div>
                    <div className="flex items-center gap-2">
                      <div className="text-[11px] opacity-70">{new Date(t.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      <button
                        type="button"
                        aria-label="スレッドを削除"
                        className="p-1 rounded hover:bg-destructive/10"
                        onClick={(e) => { e.stopPropagation(); deleteThread(t.id); }}
                        title="スレッドを削除"
                      >
                        <Trash2 className="w-4 h-4 opacity-70" />
                      </button>
                    </div>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">{t.messages.length} 件のメッセージ</div>
                  {(() => { const firstU = getFirstUserMessage(t.messages); return (
                    <div className="text-xs line-clamp-2 mt-1 text-muted-foreground">
                      {firstU ? firstU.content : '（最初のユーザー入力はまだありません）'}
                    </div>
                  ); })()}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

        {/* Enhanced Input Area */}
        <div
          ref={footerRef}
          className="sticky bottom-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border p-3 sm:p-2 pb-[env(safe-area-inset-bottom)]"
        >
          {/* 端末下部のナビゲーション分を確保（見えないスペーサー） */}
          <div aria-hidden className="pointer-events-none h-0" style={{ height: getBottomNavHeight() ? 0 : 0 }} />
          <div className="flex items-end space-x-2 sm:space-x-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
                }}
                onKeyPress={handleKeyPress}
                onFocus={() => {
                  setTimeout(() => {
                    inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }, 0);
                }}
                placeholder={placeholderText}
                className="w-full px-4 py-2 bg-input-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder-muted-foreground resize-none min-h-[44px] max-h-[160px] text-sm"
                rows={1}
                disabled={isTyping}
                maxLength={1000}
                aria-label="メッセージ入力"
              />
              <div className="absolute right-3 bottom-2 text-xs text-muted-foreground opacity-70">
                {inputText.length}/1000
              </div>
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isTyping}
              className="p-2 sm:p-3 shrink-0 min-w-10"
              size="lg"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <div className="hidden sm:flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <div className="flex items-center space-x-3">
              <span>Enterで送信 • Shift+Enterで改行</span>
              <Badge variant="outline" className="text-xs px-2 py-1">
                {interactionMode === 'free' ? '壁打ちモード' : '空欄を埋めるモード'}
              </Badge>
            </div>
          </div>
        </div>
      </div>
  );
}