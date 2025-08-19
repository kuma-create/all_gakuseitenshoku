'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Send, Bot, User, Lightbulb, Heart, Brain, Target, HelpCircle } from 'lucide-react-native';

// ===== Types =====
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
    selfNote: number; // 自己分析ノート
    lifeChart: number; // ライフチャート
    strengthsWeaknesses: number; // 強み弱み
    experience: number; // 経験の整理
    futureVision: number; // 将来のビジョン
  }>;
  /** セクションごとの重み（省略時はすべて1.0） */
  weights?: Partial<{
    selfNote: number;
    lifeChart: number;
    strengthsWeaknesses: number;
    experience: number;
    futureVision: number;
  }>;
  /** （任意）サーバーのベースURL。未指定時は相対パス */
  baseUrl?: string;
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
    gradient: ['#EC4899', '#EF4444'],
    bgToken: '#FDF2F8',
  },
  {
    id: 'analytical',
    name: '分析型',
    description: '論理的な思考整理',
    icon: Brain,
    gradient: ['#3B82F6', '#8B5CF6'],
    bgToken: '#EFF6FF',
  },
  {
    id: 'questioning',
    name: '質問型',
    description: '深掘りする対話',
    icon: HelpCircle,
    gradient: ['#10B981', '#3B82F6'],
    bgToken: '#ECFDF5',
  },
  {
    id: 'coaching',
    name: 'コーチング型',
    description: '目標達成をサポート',
    icon: Target,
    gradient: ['#F59E0B', '#EF4444'],
    bgToken: '#FFF7ED',
  },
] as const;

export function AIChat({
  userId,
  onProgressUpdate,
  onApplyToManual,
  sectionProgress,
  weights,
  baseUrl,
}: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chatMode, setChatMode] = useState<'empathetic' | 'analytical' | 'questioning' | 'coaching'>('empathetic');
  const [interactionMode, setInteractionMode] = useState<'free' | 'fill'>('free');
  const [progressPercent, setProgressPercent] = useState(0);
  const [stats, setStats] = useState<ChatStats>({
    messagesCount: 0,
    insightsGenerated: 0,
    topicsDiscussed: [],
    emotionalState: 'neutral',
    sessionDuration: 0,
    deepThoughts: 0,
  });
  const [sessionStartTime] = useState(Date.now());
  const [threadId, setThreadId] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const currentMode = useMemo(() => chatModes.find((m) => m.id === chatMode) || chatModes[0], [chatMode]);

  // 真の空欄補充率
  const computeSectionPercent = (): number | null => {
    const sp = sectionProgress || {};
    const entries = Object.entries(sp).filter(([, v]) => typeof v === 'number') as Array<[string, number]>;
    if (entries.length === 0) return null;
    const w = {
      selfNote: 1,
      lifeChart: 1,
      strengthsWeaknesses: 1,
      experience: 1,
      futureVision: 1,
      ...(weights || {}),
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
    const id = setInterval(() => {
      setStats((prev) => ({ ...prev, sessionDuration: Math.floor((Date.now() - sessionStartTime) / 1000) }));
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    const sectionPercent = computeSectionPercent();
    if (sectionPercent !== null) {
      setProgressPercent(sectionPercent);
      onProgressUpdate?.(sectionPercent);
      return;
    }
    const fallback = Math.min(100, messages.length * 3 + stats.insightsGenerated * 5 + stats.deepThoughts * 10);
    setProgressPercent(fallback);
    onProgressUpdate?.(fallback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionProgress, weights, messages, stats.insightsGenerated, stats.deepThoughts]);

  useEffect(() => {
    // 自動スクロール
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, isTyping]);

  const initializeChat = () => {
    setLoading(true);
    const welcome: Message = {
      id: 'welcome',
      type: 'ai',
      content:
        'こんにちは！私はあなたの自己分析をサポートするAIアシスタントです。\n\n今日はどんなことを話してみたいですか？どんな小さなことでも大丈夫です。\n\n• 最近感じていること\n• 将来の不安や期待\n• 過去の印象深い経験\n• 自分の性格について\n\nリラックスして、思ったことを自由にお話しください 😊',
      timestamp: new Date(),
      category: '導入',
      emoji: '🤖',
      questions: ['最近どんなことを考えていますか？', '今日の気分はどうですか？'],
    };
    setMessages([welcome]);
    setLoading(false);
  };

  const analyzeEmotionalState = (list: Message[]): ChatStats['emotionalState'] => {
    const recent = list.slice(-6);
    let pos = 0;
    let neg = 0;
    const positiveKeywords = ['嬉しい', '楽しい', '良い', 'できる', '成功', '喜び', '希望', '幸せ', '満足', '安心', '感謝', '素晴らしい'];
    const negativeKeywords = ['不安', '困る', '悪い', 'できない', '失敗', '悲しい', '心配', '辛い', '大変', '疲れ', '落ち込む', '迷う'];
    recent.forEach((m) => {
      positiveKeywords.forEach((w) => m.content.includes(w) && pos++);
      negativeKeywords.forEach((w) => m.content.includes(w) && neg++);
    });
    if (pos > neg * 1.5) return 'positive';
    if (neg > pos * 1.5) return 'negative';
    if (pos > 0 && neg > 0) return 'mixed';
    return 'neutral';
  };

  const updateStats = (list: Message[]) => {
    const topics = Array.from(new Set(list.filter((m) => m.category).map((m) => m.category!)));
    const insights = list.reduce((acc, m) => acc + (m.insights?.length || 0), 0);
    const deep = list.filter((m) => m.type === 'user' && m.content.length > 100).length;
    const emotionalState = analyzeEmotionalState(list);
    setStats((prev) => ({ ...prev, messagesCount: list.length, insightsGenerated: insights, topicsDiscussed: topics, deepThoughts: deep, emotionalState }));
  };

  const handleQuickPrompt = (prompt: string) => {
    setInputText(prompt);
    inputRef.current?.focus();
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isTyping) return;

    const userMessage: Message = {
      id: `${Date.now()}`,
      type: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
      emoji: '👤',
    };

    const newList = [...messages, userMessage];
    setMessages(newList);
    setInputText('');
    setIsTyping(true);

    try {
      const ai = await fetchAIResponse(newList, chatMode).catch(() => null);
      if (ai) {
        const updated = [...newList, ai];
        setMessages(updated);
        setIsTyping(false);
        updateStats(updated);
        return;
      }
      const mock = generateMockResponse(userMessage.content, messages.length, chatMode);
      const updated = [...newList, mock];
      setMessages(updated);
      setIsTyping(false);
      updateStats(updated);
    } catch (e) {
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
        'あなたの正直な気持ちを聞かせていただき、ありがとうございます。',
      ],
      analytical: [
        'なるほど、興味深い内容ですね。この状況を整理すると、主な要因は何だと考えられますか？',
        'データとして見ると、どのようなパターンが見えてきますか？',
        '論理的に分析してみると、次に取るべきステップは何でしょうか？',
        '客観的な視点から見て、この経験はどのような意味を持っていますか？',
        'その問題を構造化して考えてみましょう。根本的な原因は何でしょうか？',
      ],
      questioning: [
        'とても興味深いですね。なぜそのように感じるのか、根本的な理由は何だと思いますか？',
        'もしその状況が変わったとしたら、あなたはどう感じるでしょうか？',
        '同じような経験をした人に、あなたなら何とアドバイスしますか？',
        'この経験があなたの価値観にどのような影響を与えましたか？',
        'もし時間を巻き戻せるとしたら、同じ選択をしますか？その理由は？',
      ],
      coaching: [
        '素晴らしい洞察です！この気づきを具体的な行動につなげるには、どうしたらよいでしょうか？',
        'あなたの目標達成のために、次に何ができそうですか？',
        'この経験から得た学びを、今後どのように活用していきたいですか？',
        'あなたの強みを活かして、どんなことにチャレンジしてみたいですか？',
        '理想の自分に近づくために、今日から始められることは何でしょうか？',
      ],
    } as const;

    const insights = [
      'この経験はあなたの成長において重要な意味を持っているようです',
      '感情の変化に気づくことは自己理解の第一歩です',
      '過去の経験が現在の価値観形成に大きく影響していることが分かります',
      'この気づきは将来の選択に活かせる貴重な洞察です',
      'あなたの考え方の特徴がよく表れています',
      'このような自己反省ができることは素晴らしい能力です',
      '感情と論理のバランスが取れた判断ができているようです',
      'この体験があなたの価値観を形作る重要な要素になっています',
    ];

    const questions = [
      'この話をもっと詳しく聞かせてください',
      '同じような状況になったら、今度はどう対処しますか？',
      'この経験から学んだことを一言で表すとすれば？',
      'この気づきを今後どのように活用していきたいですか？',
      'この経験があなたに与えた最も大きな変化は何ですか？',
      'もしアドバイスを求められたら、何と言いますか？',
      'この体験があなたの人生観に与えた影響は？',
      '似たような困難に直面している人に、どんな言葉をかけますか？',
    ];

    const categories = ['自己理解', '価値観', '経験分析', '将来設計', '感情整理', '人間関係', 'キャリア', '成長', '挑戦'];
    const selectedCategory = categories[Math.floor(Math.random() * categories.length)];
    const pool = (responses as any)[mode] || responses.empathetic;
    const selected = pool[Math.floor(Math.random() * pool.length)];
    const emojis = ['🤔', '💭', '✨', '🌟', '💡', '🎯', '🌱', '🔍', '💪', '🌈'];

    return {
      id: `${Date.now() + 1}`,
      type: 'ai',
      content: selected,
      timestamp: new Date(),
      category: selectedCategory,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      insights: messageCount > 2 ? [insights[Math.floor(Math.random() * insights.length)]] : undefined,
      questions: messageCount > 1 ? [questions[Math.floor(Math.random() * questions.length)]] : undefined,
    };
  };

  const fetchAIResponse = async (messageList: Message[], mode: string): Promise<Message | null> => {
    try {
      const payload = {
        messages: messageList.map((m) => ({
          role: m.type === 'user' ? 'user' : m.type === 'ai' ? 'assistant' : 'system',
          content: m.content,
        })),
        mode,
        threadId,
      };
      const url = `${baseUrl || ''}/api/aichat`;
      const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!resp.ok) return null;
      const json: any = await resp.json();
      const data = json?.content ? json : json?.data ? json.data : null;
      if (!data || !data.content) return null;
      if (data.threadId && data.threadId !== threadId) setThreadId(data.threadId);
      const categories = ['自己理解', '価値観', '経験分析', '将来設計', '感情整理', '人間関係', 'キャリア', '成長', '挑戦'];
      return {
        id: `${Date.now() + 1}`,
        type: 'ai',
        content: data.content,
        timestamp: new Date(),
        category: data.category || categories[Math.floor(Math.random() * categories.length)],
        emoji: '🤖',
        insights: data.insights,
        questions: data.questions,
      };
    } catch (e) {
      return null;
    }
  };

  const pickTitleFrom = (text: string) => (text || '').split(/\n|。/)[0]?.slice(0, 40) || '';
  const pickStrengthsFrom = (text: string): string[] => {
    const lines = (text || '')
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const bullets = lines
      .filter((l) => /^[\-・*●■◆◇▪️•]/.test(l))
      .map((l) => l.replace(/^[\-・*●■◆◇▪️•]\s*/, ''));
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

  const placeholderText = interactionMode === 'fill'
    ? '自己PRやプロフィールの空欄を一緒に埋めましょう。質問や回答を入力してください…'
    : '何でも気軽に話してください…';

  // ===== Render =====
  if (loading) {
    return (
      <View style={styles.container}> 
        <View style={styles.card}> 
          <ActivityIndicator size="small" />
          <Text style={styles.muted}>AIチャットを準備しています...</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={{ flex: 1 }}>
            <View style={styles.rowBetween}> 
              <Text style={styles.topLabel}>自己分析の空欄補充率</Text>
              <Text style={styles.topLabel}>{progressPercent}%</Text>
            </View>
            <View style={styles.progressOuter}>
              <View style={[styles.progressInner, { width: `${progressPercent}%` }]} />
            </View>
          </View>
          <View style={styles.modeButtons}>
            <SmallButton onPress={() => setInteractionMode('free')} active={interactionMode === 'free'} label="壁打ち" />
            <SmallButton onPress={() => setInteractionMode('fill')} active={interactionMode === 'fill'} label="空欄埋め" />
          </View>
        </View>

        {/* Chat area */}
        <View style={styles.chatCard}>
          <ScrollView ref={scrollRef} contentContainerStyle={styles.chatScroll}>
            {messages.map((m) => (
              <View key={m.id} style={[styles.msgRow, m.type === 'user' ? styles.right : styles.left]}>
                <View style={[styles.avatar, { backgroundColor: m.type === 'user' ? '#6B7280' : '#6366F1' }]}>
                  {m.type === 'user' ? <User size={18} color="#fff" /> : <Bot size={18} color="#fff" />}
                </View>
                <View style={[styles.bubble, m.type === 'user' ? styles.bubbleUser : styles.bubbleAI]}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                    {!!m.emoji && <Text style={styles.emoji}>{m.emoji}</Text>}
                    <Text style={styles.msgText}>{m.content}</Text>
                  </View>

                  {!!m.insights && (
                    <View style={styles.insightBox}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Lightbulb size={14} color="#2563EB" />
                        <Text style={styles.insightTitle}>  💡 気づき</Text>
                      </View>
                      {m.insights.map((ins, idx) => (
                        <Text key={idx} style={styles.insightText}>• {ins}</Text>
                      ))}
                    </View>
                  )}

                  {!!m.questions && (
                    <View style={{ marginTop: 8 }}>
                      <Text style={styles.followTitle}>💭 続けて話せること:</Text>
                      {m.questions.map((q, idx) => (
                        <TouchableOpacity key={idx} onPress={() => handleQuickPrompt(q)} disabled={isTyping}>
                          <Text style={styles.followItem}>{q}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {m.type === 'ai' && onApplyToManual && (
                    <View style={styles.applyRow}>
                      <Tag onPress={() => onApplyToManual?.({ prTitle: pickTitleFrom(m.content) })} label="PRタイトルに反映" />
                      <Tag onPress={() => onApplyToManual?.({ about: m.content })} label="自己紹介に反映" />
                      <Tag onPress={() => onApplyToManual?.({ prText: m.content })} label="自己PRに反映" />
                      <Tag onPress={() => onApplyToManual?.({ selfAnalysis: m.content })} label="自己分析に追記" />
                      <Tag onPress={() => onApplyToManual?.({ strengths: pickStrengthsFrom(m.content) })} label="強みに追加" />
                    </View>
                  )}

                  <View style={styles.metaRow}>
                    {!!m.category && <Text style={styles.badge}>{m.category}</Text>}
                    <Text style={styles.timeText}>
                      {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
              </View>
            ))}

            {isTyping && (
              <View style={[styles.msgRow, styles.left]}> 
                <View style={[styles.avatar, { backgroundColor: '#6366F1' }]}> 
                  <Bot size={18} color="#fff" />
                </View>
                <View style={[styles.bubble, styles.bubbleAI]}> 
                  <View style={{ flexDirection: 'row' }}>
                    <View style={styles.dot} />
                    <View style={[styles.dot, { opacity: 0.8 }]} />
                    <View style={[styles.dot, { opacity: 0.6 }]} />
                  </View>
                  <Text style={styles.typingText}>AIが考えています...</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Input area */}
          <View style={styles.inputBar}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder={placeholderText}
              value={inputText}
              onChangeText={setInputText}
              editable={!isTyping}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSendMessage} disabled={!inputText.trim() || isTyping}>
              <Send size={18} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.hintRow}>
            <Text style={styles.hintText}>Enterで送信 • Shift+Enterで改行（物理キーボード時）</Text>
            <Text style={styles.hintBadge}>{interactionMode === 'free' ? '壁打ちモード' : '空欄を埋めるモード'}</Text>
          </View>
        </View>

        {/* Mode selector (simple) */}
        <View style={styles.modeRow}>
          {chatModes.map((m) => (
            <TouchableOpacity key={m.id} onPress={() => setChatMode(m.id as any)} style={[styles.modeChip, chatMode === m.id && styles.modeChipActive]}> 
              <Text style={[styles.modeText, chatMode === m.id && styles.modeTextActive]}>{m.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ===== Small UI Parts =====
const SmallButton = ({ onPress, active, label }: { onPress: () => void; active: boolean; label: string }) => (
  <TouchableOpacity onPress={onPress} style={[styles.smallBtn, active && styles.smallBtnActive]}>
    <Text style={[styles.smallBtnText, active && styles.smallBtnTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const Tag = ({ onPress, label }: { onPress: () => void; label: string }) => (
  <TouchableOpacity onPress={onPress} style={styles.tag}>
    <Text style={styles.tagText}>{label}</Text>
  </TouchableOpacity>
);

// ===== Styles =====
const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 12, paddingTop: 8, backgroundColor: '#0A0A0A00' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', gap: 8 },
  muted: { color: '#6B7280', marginTop: 8 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  topLabel: { fontSize: 12, color: '#111827' },
  progressOuter: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 8, overflow: 'hidden' },
  progressInner: { height: 8, backgroundColor: '#111827' },
  modeButtons: { flexDirection: 'row', gap: 6, marginLeft: 8 },
  smallBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: '#D1D5DB', backgroundColor: '#fff' },
  smallBtnActive: { backgroundColor: '#111827' },
  smallBtnText: { fontSize: 11, color: '#111827' },
  smallBtnTextActive: { color: '#fff' },

  chatCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB', overflow: 'hidden' },
  chatScroll: { padding: 10, paddingBottom: 12 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 8 },
  left: { justifyContent: 'flex-start' },
  right: { justifyContent: 'flex-end' },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  bubble: { flex: 1, borderRadius: 14, padding: 10 },
  bubbleUser: { backgroundColor: '#111827' },
  bubbleAI: { backgroundColor: '#F3F4F6', borderWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB' },
  emoji: { fontSize: 16, marginRight: 6 },
  msgText: { fontSize: 13, lineHeight: 19, color: '#111827', flexShrink: 1 },
  insightBox: { marginTop: 8, backgroundColor: '#DBEAFE', borderRadius: 8, padding: 8 },
  insightTitle: { fontSize: 12, color: '#1D4ED8', fontWeight: '600' },
  insightText: { fontSize: 12, color: '#1E3A8A', lineHeight: 18 },
  followTitle: { fontSize: 11, color: '#2563EB', marginBottom: 4, fontWeight: '600' },
  followItem: { fontSize: 13, color: '#2563EB', paddingVertical: 6 },
  applyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tag: { paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  tagText: { fontSize: 11, color: '#111827' },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingTop: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(0,0,0,0.08)' },
  badge: { fontSize: 11, paddingVertical: 2, paddingHorizontal: 6, backgroundColor: '#F3F4F6', borderRadius: 6, color: '#111827' },
  timeText: { fontSize: 11, color: 'rgba(0,0,0,0.5)' },

  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#6B7280', marginRight: 4 },
  typingText: { marginTop: 6, fontSize: 11, color: '#6B7280' },

  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB' },
  input: { flex: 1, minHeight: 40, maxHeight: 120, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#F9FAFB', borderWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB', borderRadius: 12, fontSize: 14 },
  sendBtn: { padding: 12, borderRadius: 12, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' },
  hintRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 10 },
  hintText: { fontSize: 11, color: '#6B7280' },
  hintBadge: { fontSize: 11, color: '#111827' },

  modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 10 },
  modeChip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB', backgroundColor: '#fff' },
  modeChipActive: { backgroundColor: '#111827' },
  modeText: { fontSize: 12, color: '#111827' },
  modeTextActive: { color: '#fff' },
});

export default AIChat;
