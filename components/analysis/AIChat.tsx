'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Lightbulb, Heart, Brain, Target, HelpCircle } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [saving, setSaving] = useState(false);
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // --- 真の空欄補充率を計算（0~100） ---
  const computeSectionPercent = (): number | null => {
    const sp = sectionProgress || {};
    const entries: Array<[keyof NonNullable<typeof sp>, number]> = Object.entries(sp)
      .filter(([, v]) => typeof v === 'number') as any;
    if (entries.length === 0) return null; // まだ親から渡されていない

    // デフォルトは全セクション=1.0の等重み
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
  };



  useEffect(() => {
    initializeChat();
    
    const timer = setInterval(() => {
      setStats(prev => ({
        ...prev,
        sessionDuration: Math.floor((Date.now() - sessionStartTime) / 1000)
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, [userId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
  }, [sectionProgress, weights, messages, stats.insightsGenerated, stats.deepThoughts]);

  const initializeChat = async () => {
    try {
      setLoading(true);
      
      // Mock welcome message
      const welcomeMessage: Message = {
        id: 'welcome',
        type: 'ai',
        content: 'こんにちは！私はあなたの自己分析をサポートするAIアシスタントです。\n\n今日はどんなことを話してみたいですか？どんな小さなことでも大丈夫です。\n\n• 最近感じていること\n• 将来の不安や期待\n• 過去の印象深い経験\n• 自分の性格について\n\nリラックスして、思ったことを自由にお話しください 😊',
        timestamp: new Date(),
        category: '導入',
        emoji: '🤖',
        questions: ['最近どんなことを考えていますか？', '今日の気分はどうですか？']
      };
      
      setMessages([welcomeMessage]);
    } catch (error) {
      console.error('Error initializing chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

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
    setMessages(newMessages);
    setInputText('');
    setIsTyping(true);

    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    try {
      // まずはOpenAI連携（サーバー経由）を試行。失敗した場合はモックにフォールバック。
      const aiResponse = await fetchAIResponse(newMessages, chatMode).catch(() => null);

      if (aiResponse) {
        const updated = [...newMessages, aiResponse];
        setMessages(updated);
        setIsTyping(false);
        updateStats(updated);
        return;
      }

      // フォールバック：モック応答
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

    const insights = [
      'この経験はあなたの成長において重要な意味を持っているようです',
      '感情の変化に気づくことは自己理解の第一歩です',
      '過去の経験が現在の価値観形成に大きく影響していることが分かります',
      'この気づきは将来の選択に活かせる貴重な洞察です',
      'あなたの考え方の特徴がよく表れています',
      'このような自己反省ができることは素晴らしい能力です',
      '感情と論理のバランスが取れた判断ができているようです',
      'この体験があなたの価値観を形作る重要な要素になっています'
    ];

    const questions = [
      'この話をもっと詳しく聞かせてください',
      '同じような状況になったら、今度はどう対処しますか？',
      'この経験から学んだことを一言で表すとすれば？',
      'この気づきを今後どのように活用していきたいですか？',
      'この経験があなたに与えた最も大きな変化は何ですか？',
      'もしアドバイスを求められたら、何と言いますか？',
      'この体験があなたの人生観に与えた影響は？',
      '似たような困難に直面している人に、どんな言葉をかけますか？'
    ];

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

  // OpenAI連携用（サーバー経由）
  // 期待するサーバー側のAPI: POST /api/aichat
  // body: { messages: Array<{ role: 'system'|'user'|'assistant', content: string }>, mode: string, threadId?: string }
  // response: { content: string, category?: string, insights?: string[], questions?: string[] }
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

      // 直接 fetch を使用（apiService.request は private のため使用不可）
      const resp = await fetch('/api/aichat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        console.warn('fetchAIResponse: non-OK status', resp.status);
        return null;
      }

      // レスポンス形を柔軟に扱う（ {content,...} または {success:true, data:{...}} を許容）
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

  // ---- Helpers for applying AI output into manual fields ----
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
      <div className="w-full max-w-full md:max-w-5xl md:mx-auto px-2 sm:px-4 overflow-x-hidden">
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
    <div className="w-full max-w-full md:max-w-5xl md:mx-auto px-2 sm:px-4 overflow-x-hidden">

      {/* Top Bar: 空欄補充率 + モード切替 */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-2xl p-3 sm:p-4 mb-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between text-[13px] sm:text-sm leading-relaxed mb-2">
              <span className="font-medium">自己分析の空欄補充率</span>
              <span className="tabular-nums">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={interactionMode === 'free' ? 'default' : 'outline'}
              size="sm"
              className="text-[11px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1"
              onClick={() => setInteractionMode('free')}
            >
              壁打ちモード
            </Button>
            <Button
              variant={interactionMode === 'fill' ? 'default' : 'outline'}
              size="sm"
              className="text-[11px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1"
              onClick={() => setInteractionMode('fill')}
            >
              空欄を埋めるモード
            </Button>
          </div>
        </div>
      </div>
      <div className="bg-card rounded-2xl shadow-sm border border-border mb-4 overflow-hidden">
        <div className="p-2.5 sm:p-4 md:p-6 space-y-3 sm:space-y-4 min-h-[40vh] max-h-[60vh] sm:max-h-[65vh] md:max-h-[70vh] lg:max-h-[75vh] overflow-y-auto overflow-x-hidden">
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div 
                key={message.id} 
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <div className={`flex ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start space-x-3 max-w-4xl group`}>
                  <div className="flex-shrink-0">
                    {message.type === 'ai' ? (
                      <div className={`w-10 h-10 bg-gradient-to-br ${currentMode.color} rounded-full flex items-center justify-center`}>
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                <div className={`rounded-2xl p-2.5 sm:p-4 relative break-words ${
                  message.type === 'user'
                    ? 'bg-primary text-primary-foreground max-w-[90vw] sm:max-w-md'
                    : 'bg-muted text-muted-foreground max-w-[92vw] sm:max-w-lg md:max-w-2xl'
                }`}>
                    <div className="flex items-start space-x-2 mb-2">
                      {message.emoji && (
                        <span className="text-lg flex-shrink-0">{message.emoji}</span>
                      )}
                      <p className="text-[13px] sm:text-sm leading-relaxed whitespace-pre-line flex-1 break-words">{message.content}</p>
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
                          <span className="text-[13px] sm:text-sm font-medium text-blue-800">💡 気づき</span>
                        </div>
                        {message.insights.map((insight, i) => (
                          <p key={i} className="text-[13px] sm:text-sm text-blue-700 leading-relaxed break-words">• {insight}</p>
                        ))}
                      </motion.div>
                    )}
                    
                    {message.questions && (
                      <div className="mt-3 space-y-1">
                        <div className="text-[11px] sm:text-xs font-medium text-blue-600 mb-2">💭 続けて話せること:</div>
                        {message.questions.map((question, i) => (
                          <motion.button
                            key={i}
                            onClick={() => handleQuickPrompt(question)}
                            className="block w-full text-left text-[13px] sm:text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1.5 sm:p-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed leading-relaxed break-words"
                            disabled={isTyping}
                            whileHover={{ x: 4 }}
                            transition={{ type: "spring", stiffness: 300 }}
                          >
                            {question}
                          </motion.button>
                        ))}
                      </div>
                    )}

                    {message.type === 'ai' && onApplyToManual && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="text-[11px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 rounded border bg-muted hover:bg-muted/70"
                          onClick={() => onApplyToManual?.({ prTitle: pickTitleFrom(message.content) })}
                        >PRタイトルに反映</button>
                        <button
                          type="button"
                          className="text-[11px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 rounded border bg-muted hover:bg-muted/70"
                          onClick={() => onApplyToManual?.({ about: message.content })}
                        >自己紹介に反映</button>
                        <button
                          type="button"
                          className="text-[11px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 rounded border bg-muted hover:bg-muted/70"
                          onClick={() => onApplyToManual?.({ prText: message.content })}
                        >自己PRに反映</button>
                        <button
                          type="button"
                          className="text-[11px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 rounded border bg-muted hover:bg-muted/70"
                          onClick={() => onApplyToManual?.({ selfAnalysis: message.content })}
                        >自己分析に追記</button>
                        <button
                          type="button"
                          className="text-[11px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 rounded border bg-muted hover:bg-muted/70"
                          onClick={() => onApplyToManual?.({ strengths: pickStrengthsFrom(message.content) })}
                        >強みに追加</button>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/20">
                      <div className="flex items-center space-x-2">
                        {message.category && (
                          <Badge variant="secondary" className="text-[11px] sm:text-xs">
                            {message.category}
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] sm:text-xs opacity-50">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
              <div className="flex items-start space-x-3 max-w-[92vw] sm:max-w-3xl">
                <div className={`w-10 h-10 bg-gradient-to-br ${currentMode.color} rounded-full flex items-center justify-center`}>
                  <Bot className="w-5 h-5 text-white" />
                </div>
              <div className="bg-muted rounded-2xl p-3 sm:p-4 border border-border/40">
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
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-2 leading-relaxed">AIが考えています...</p>
              </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Enhanced Input Area */}
        <div className="border-t border-border p-3 sm:p-4">
          <div className="flex items-end space-x-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
                onKeyPress={handleKeyPress}
                placeholder={placeholderText}
                className="w-full px-3 py-2.5 sm:px-4 sm:py-3 bg-input-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder-muted-foreground resize-none min-h-[44px] max-h-[120px]"
                rows={1}
                disabled={isTyping}
                maxLength={1000}
              />
              <div className="absolute right-3 bottom-2 text-xs text-muted-foreground">
                {inputText.length}/1000
              </div>
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isTyping}
              className="p-2.5 sm:p-3 shrink-0"
              size="lg"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between mt-3 text-[11px] sm:text-xs text-muted-foreground">
            <div className="flex items-center space-x-3">
              <span>Enterで送信 • Shift+Enterで改行</span>
              <Badge variant="outline" className="text-[11px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1">
                {interactionMode === 'free' ? '壁打ちモード' : '空欄を埋めるモード'}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}