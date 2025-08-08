import React, { useState, useRef, useEffect } from 'react';
import { Send, Save, RefreshCw, Bot, User, Lightbulb, BookOpen, Heart, Brain, Target, Zap, MessageSquare, Download, X, Play, Pause, Settings, Star, HelpCircle, AlertCircle } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Avatar } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Progress } from '../ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../../utils/api';

interface AIChatProps {
  userId: string;
  onProgressUpdate: (progress: number) => void;
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

export function AIChat({ userId, onProgressUpdate }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [chatMode, setChatMode] = useState('empathetic');
  const [showSettings, setShowSettings] = useState(false);
  const [stats, setStats] = useState<ChatStats>({
    messagesCount: 0,
    insightsGenerated: 0,
    topicsDiscussed: [],
    emotionalState: 'neutral',
    sessionDuration: 0,
    deepThoughts: 0
  });
  const [sessionStartTime] = useState(Date.now());
  const [isMobile, setIsMobile] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const quickPrompts = [
    { icon: Heart, text: '自分の強みがわからない', category: '自己理解', difficulty: 'easy' },
    { icon: Target, text: 'やりたいことが見つからない', category: '目標設定', difficulty: 'medium' },
    { icon: Brain, text: '将来に不安を感じている', category: '将来設計', difficulty: 'medium' },
    { icon: Lightbulb, text: '自分に自信が持てない', category: 'メンタル', difficulty: 'easy' },
    { icon: BookOpen, text: 'キャリア選択で迷っている', category: 'キャリア', difficulty: 'hard' },
    { icon: MessageSquare, text: '人間関係で悩んでいる', category: '人間関係', difficulty: 'medium' },
    { icon: Star, text: '価値観を整理したい', category: '価値観', difficulty: 'hard' },
    { icon: Zap, text: '最近の出来事を振り返りたい', category: '経験反省', difficulty: 'easy' }
  ];

  // Check mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
    const progress = Math.min(100, messages.length * 3 + stats.insightsGenerated * 5 + stats.deepThoughts * 10);
    onProgressUpdate(progress);
  }, [messages, stats.insightsGenerated, stats.deepThoughts]);

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
      setTimeout(async () => {
        const aiResponse = generateAIResponse(inputText, messages.length, chatMode);
        const updatedMessages = [...newMessages, aiResponse];
        setMessages(updatedMessages);
        setIsTyping(false);
        updateStats(updatedMessages);
      }, 1000 + Math.random() * 1500);
    } catch (error) {
      console.error('Error sending message:', error);
      setIsTyping(false);
    }
  };

  const generateAIResponse = (input: string, messageCount: number, mode: string): Message => {
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

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-700 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'hard': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getCurrentMode = () => {
    return chatModes.find(mode => mode.id === chatMode) || chatModes[0];
  };

  const currentMode = getCurrentMode();

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <Card className="p-12 text-center">
          <div className="w-8 h-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">AIチャットを準備しています...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header with Enhanced Stats */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="mb-6 p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 space-y-4 md:space-y-0">
            <div className="flex items-center space-x-3">
              <div className={`p-3 bg-gradient-to-br ${currentMode.color} rounded-xl flex-shrink-0`}>
                <currentMode.icon className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-foreground">AI対話分析</h2>
                <p className="text-sm text-muted-foreground">
                  {currentMode.name} • {currentMode.description}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <div className="text-sm text-muted-foreground">セッション時間</div>
                <div className="text-lg font-bold text-foreground">{formatTime(stats.sessionDuration)}</div>
              </div>
              <div className={`w-3 h-3 rounded-full ${ 
                stats.emotionalState === 'positive' ? 'bg-green-500' : 
                stats.emotionalState === 'negative' ? 'bg-red-500' :
                stats.emotionalState === 'mixed' ? 'bg-yellow-500' : 'bg-gray-400'
              }`} title={`感情状態: ${stats.emotionalState}`}></div>
              <Dialog open={showSettings} onOpenChange={setShowSettings}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>対話設定</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium mb-3">AIの対話スタイル</h3>
                      <div className="grid grid-cols-1 gap-2">
                        {chatModes.map((mode) => (
                          <button
                            key={mode.id}
                            onClick={() => setChatMode(mode.id)}
                            className={`p-3 rounded-lg text-left transition-all border-2 ${
                              chatMode === mode.id 
                                ? 'border-blue-500 bg-blue-50' 
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 bg-gradient-to-r ${mode.color} rounded-lg flex items-center justify-center`}>
                                <mode.icon className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <div className="font-medium">{mode.name}</div>
                                <div className="text-sm text-gray-600">{mode.description}</div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          {/* Enhanced Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-4">
            <motion.div 
              className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg"
              whileHover={{ scale: 1.02 }}
            >
              <MessageSquare className="w-4 h-4 md:w-5 md:h-5 text-blue-600 mx-auto mb-1" />
              <div className="text-lg font-bold text-blue-700">{stats.messagesCount}</div>
              <div className="text-xs text-blue-600">メッセージ</div>
            </motion.div>
            <motion.div 
              className="text-center p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg"
              whileHover={{ scale: 1.02 }}
            >
              <Lightbulb className="w-4 h-4 md:w-5 md:h-5 text-green-600 mx-auto mb-1" />
              <div className="text-lg font-bold text-green-700">{stats.insightsGenerated}</div>
              <div className="text-xs text-green-600">気づき</div>
            </motion.div>
            <motion.div 
              className="text-center p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg"
              whileHover={{ scale: 1.02 }}
            >
              <Brain className="w-4 h-4 md:w-5 md:h-5 text-purple-600 mx-auto mb-1" />
              <div className="text-lg font-bold text-purple-700">{stats.topicsDiscussed.length}</div>
              <div className="text-xs text-purple-600">話題</div>
            </motion.div>
            <motion.div 
              className="text-center p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg"
              whileHover={{ scale: 1.02 }}
            >
              <Star className="w-4 h-4 md:w-5 md:h-5 text-orange-600 mx-auto mb-1" />
              <div className="text-lg font-bold text-orange-700">{stats.deepThoughts}</div>
              <div className="text-xs text-orange-600">深い思考</div>
            </motion.div>
            <motion.div 
              className="text-center p-3 bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg"
              whileHover={{ scale: 1.02 }}
            >
              <Heart className="w-4 h-4 md:w-5 md:h-5 text-pink-600 mx-auto mb-1" />
              <div className="text-lg font-bold text-pink-700">
                {stats.emotionalState === 'positive' ? '😊' : 
                 stats.emotionalState === 'negative' ? '😔' :
                 stats.emotionalState === 'mixed' ? '🤔' : '😐'}
              </div>
              <div className="text-xs text-pink-600">感情</div>
            </motion.div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">対話の深さ</span>
              <span className="text-sm text-muted-foreground">{Math.min(100, messages.length * 3 + stats.insightsGenerated * 5)}%</span>
            </div>
            <Progress value={Math.min(100, messages.length * 3 + stats.insightsGenerated * 5)} className="h-2" />
          </div>

          {/* Quick Prompts */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-foreground mb-3 flex items-center space-x-2">
              <Zap className="w-4 h-4 text-orange-500" />
              <span>クイックスタート</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {quickPrompts.slice(0, isMobile ? 4 : 6).map((prompt, index) => (
                <motion.button
                  key={index}
                  onClick={() => handleQuickPrompt(prompt.text)}
                  className="flex items-center space-x-2 p-3 bg-muted text-muted-foreground rounded-lg hover:bg-accent hover:text-accent-foreground transition-all duration-200 text-left text-sm group"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isTyping}
                >
                  <prompt.icon className="w-4 h-4 flex-shrink-0 group-hover:text-primary transition-colors" />
                  <span className="truncate flex-1">{prompt.text}</span>
                  <div className="flex items-center space-x-1 flex-shrink-0">
                    <Badge variant="outline" className="text-xs">{prompt.category}</Badge>
                    <Badge className={`text-xs ${getDifficultyColor(prompt.difficulty)}`}>
                      {prompt.difficulty === 'easy' ? '簡単' : prompt.difficulty === 'medium' ? '普通' : '難しい'}
                    </Badge>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Topics Discussed */}
          {stats.topicsDiscussed.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-foreground mb-2">話し合ったトピック</h3>
              <div className="flex flex-wrap gap-1">
                {stats.topicsDiscussed.map((topic, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {topic}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Chat Messages */}
      <div className="bg-card rounded-2xl shadow-sm border border-border mb-4 overflow-hidden">
        <div className="p-4 md:p-6 space-y-4 max-h-[60vh] md:max-h-96 overflow-y-auto">
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
                  <div className={`rounded-2xl p-4 relative ${ 
                    message.type === 'user' 
                      ? 'bg-primary text-primary-foreground max-w-md' 
                      : 'bg-muted text-muted-foreground max-w-2xl'
                  }`}>
                    <div className="flex items-start space-x-2 mb-2">
                      {message.emoji && (
                        <span className="text-lg flex-shrink-0">{message.emoji}</span>
                      )}
                      <p className="text-sm leading-relaxed whitespace-pre-line flex-1">{message.content}</p>
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
                          <p key={i} className="text-sm text-blue-700">• {insight}</p>
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
                            className="block w-full text-left text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isTyping}
                            whileHover={{ x: 4 }}
                            transition={{ type: "spring", stiffness: 300 }}
                          >
                            {question}
                          </motion.button>
                        ))}
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
              <div className="flex items-start space-x-3 max-w-3xl">
                <div className={`w-10 h-10 bg-gradient-to-br ${currentMode.color} rounded-full flex items-center justify-center`}>
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="bg-muted rounded-2xl p-4">
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
                  <p className="text-xs text-muted-foreground mt-2">AIが考えています...</p>
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Enhanced Input Area */}
        <div className="border-t border-border p-4">
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
                placeholder="何でも気軽に話してください..."
                className="w-full px-4 py-3 bg-input-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder-muted-foreground resize-none min-h-[44px] max-h-[120px]"
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
              className="p-3 shrink-0"
              size="lg"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
            <div className="flex items-center space-x-3">
              <span>Enterで送信 • Shift+Enterで改行</span>
              <Badge variant="outline" className="text-xs">
                {currentMode.name}モード
              </Badge>
            </div>
            <div className="flex items-center space-x-1">
              <span>深度レベル:</span>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div
                    key={level}
                    className={`w-2 h-2 rounded-full ${
                      level <= Math.min(5, Math.floor(stats.deepThoughts / 2) + 1)
                        ? 'bg-blue-500'
                        : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}