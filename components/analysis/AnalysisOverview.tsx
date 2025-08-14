import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Target, Star, Brain, Calendar, Clock, Award, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';

interface AnalysisOverviewProps {
  progress: {
    aiChat: number;
    lifeChart: number;
    futureVision: number;
    strengthAnalysis: number;
    experienceReflection: number;
  };
  onNavigateToTool: (toolId: string) => void;
}

export function AnalysisOverview({ progress, onNavigateToTool }: AnalysisOverviewProps) {
  const tools = [
    {
      id: 'aiChat',
      title: 'AI対話分析',
      description: 'AIとの対話を通じて自分自身を深く理解する',
      icon: Brain,
      progress: progress.aiChat,
      color: 'blue',
      insights: ['深い自己洞察', '感情の理解', '価値観の明確化'],
      estimatedTime: '15-30分',
      difficulty: '簡単',
      badge: 'AI'
    },
    {
      id: 'lifeChart',
      title: 'ライフチャート',
      description: '人生の重要な出来事を時系列で振り返る',
      icon: TrendingUp,
      progress: progress.lifeChart,
      color: 'green',
      insights: ['成長パターン分析', 'ターニングポイント発見', '経験の価値理解'],
      estimatedTime: '20-40分',
      difficulty: '普通'
    },
    {
      id: 'futureVision',
      title: '将来ビジョン',
      description: '5年後、10年後、20年後の理想の姿を描く',
      icon: Target,
      progress: progress.futureVision,
      color: 'purple',
      insights: ['目標の明確化', '価値観の整理', 'キャリアパス設計'],
      estimatedTime: '25-45分',
      difficulty: '普通',
      badge: 'HOT'
    },

    {
      id: 'experienceReflection',
      title: '経験の整理',
      description: '学生時代の経験をシンプルに整理して活用',
      icon: Award,
      progress: progress.experienceReflection,
      color: 'pink',
      insights: ['経験の体系化', 'スキルの発見', '就活準備'],
      estimatedTime: '15-25分',
      difficulty: '簡単'
    }
  ];

  const actionableTools = tools.filter(tool => tool.id !== 'aiChat');

  const overallProgress = Math.round(
    Object.values(progress).reduce((sum, value) => sum + value, 0) / Object.keys(progress).length
  );

  const completedTools = actionableTools.filter(tool => progress[tool.id as keyof typeof progress] >= 100).length;
  const inProgressTools = actionableTools.filter(tool => {
    const toolProgress = progress[tool.id as keyof typeof progress];
    return toolProgress > 0 && toolProgress < 100;
  }).length;

  const getNextRecommendedTool = () => {
    const unfinishedTools = actionableTools.filter(tool => progress[tool.id as keyof typeof progress] < 100);
    const inProgress = unfinishedTools.filter(tool => progress[tool.id as keyof typeof progress] > 0);

    if (inProgress.length > 0) {
      return inProgress[0];
    }

    // Recommend easier tools first
    const easyTools = unfinishedTools.filter(tool => tool.difficulty === '簡単');
    if (easyTools.length > 0) return easyTools[0];

    return unfinishedTools[0] || null;
  };

  const nextTool = getNextRecommendedTool();

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: {
        bg: 'from-blue-50 to-blue-100',
        border: 'border-blue-200',
        text: 'text-blue-700',
        icon: 'text-blue-600',
        accent: 'bg-blue-500'
      },
      green: {
        bg: 'from-green-50 to-green-100',
        border: 'border-green-200',
        text: 'text-green-700',
        icon: 'text-green-600',
        accent: 'bg-green-500'
      },
      purple: {
        bg: 'from-purple-50 to-purple-100',
        border: 'border-purple-200',
        text: 'text-purple-700',
        icon: 'text-purple-600',
        accent: 'bg-purple-500'
      },
      orange: {
        bg: 'from-orange-50 to-orange-100',
        border: 'border-orange-200',
        text: 'text-orange-700',
        icon: 'text-orange-600',
        accent: 'bg-orange-500'
      },
      pink: {
        bg: 'from-pink-50 to-pink-100',
        border: 'border-pink-200',
        text: 'text-pink-700',
        icon: 'text-pink-600',
        accent: 'bg-pink-500'
      }
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case '簡単': return 'bg-green-100 text-green-800';
      case '普通': return 'bg-yellow-100 text-yellow-800';
      case '上級': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-8 px-0 sm:px-4 md:px-0 pb-16 sm:pb-0 overflow-x-hidden max-w-full w-full">
      {/* Overall Progress Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full px-0 sm:px-8 py-3 sm:py-8">
          <div className="px-3 sm:px-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
              <div>
                <h2 className="text-base sm:text-2xl font-bold text-foreground mb-2">自己分析の進捗</h2>
                <p className="text-muted-foreground">あなたの自己理解度を可視化します</p>
              </div>
              <div className="text-right">
                <motion.div 
                  className="text-xl sm:text-4xl font-bold text-primary mb-1"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 5 }}
                >
                  {overallProgress}%
                </motion.div>
                <div className="text-sm text-muted-foreground">総合完了率</div>
              </div>
            </div>

            <div className="mb-8">
              <Progress value={overallProgress} className="h-3 mb-2" />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>開始</span>
                <span>完了</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 w-full">
              <motion.div 
                className="text-center p-2 sm:p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200"
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Award className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-green-700 mb-1">{completedTools}</div>
                <div className="text-sm text-green-600">完了したツール</div>
              </motion.div>
              
              <motion.div 
                className="text-center p-2 sm:p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200"
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-blue-700 mb-1">{inProgressTools}</div>
                <div className="text-sm text-blue-600">進行中のツール</div>
              </motion.div>
              
              <motion.div 
                className="text-center p-2 sm:p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200"
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Target className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-purple-700 mb-1">{actionableTools.length - completedTools}</div>
                <div className="text-sm text-purple-600">残りのツール</div>
              </motion.div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Next Recommended Action */}
      {nextTool && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="w-full px-3 sm:px-6 py-3 sm:py-6 border-2 border-dashed border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-2xl text-foreground">次におすすめのアクション</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">継続は力なり - 少しずつでも進めていきましょう</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2.5 sm:p-4 bg-card rounded-xl border gap-2 sm:gap-4 flex-wrap min-w-0">
              <div className="flex items-start space-x-4 flex-1">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${getColorClasses(nextTool.color).bg} border ${getColorClasses(nextTool.color).border}`}>
                  <nextTool.icon className={`w-4 h-4 sm:w-6 sm:h-6 ${getColorClasses(nextTool.color).icon}`} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-foreground">{nextTool.title}</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2">{nextTool.description}</p>
                  <div className="flex flex-wrap items-center gap-2 min-w-0 w-full">
                    <Badge variant="outline" className="text-[10px] sm:text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      {nextTool.estimatedTime}
                    </Badge>
                    <Badge variant="outline" className={`text-[10px] sm:text-xs ${getDifficultyColor(nextTool.difficulty)}`}>
                      {nextTool.difficulty}
                    </Badge>
                    {nextTool.badge && (
                      <Badge className="text-[10px] sm:text-xs bg-blue-100 text-blue-700">
                        {nextTool.badge}
                      </Badge>
                    )}
                    <div className="text-[10px] sm:text-xs text-muted-foreground">
                      進捗: {progress[nextTool.id as keyof typeof progress]}%
                    </div>
                  </div>
                </div>
              </div>
              <Button 
                onClick={() => onNavigateToTool(nextTool.id)}
                className="flex items-center space-x-2 w-full sm:w-auto"
                size="lg"
              >
                <span className="text-xs sm:text-base">始める</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Tools Grid */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-1 sm:gap-4 max-w-full overflow-x-hidden w-full">
        {actionableTools.map((tool, index) => {
          const colors = getColorClasses(tool.color);
          const isCompleted = progress[tool.id as keyof typeof progress] >= 100;
          const isInProgress = progress[tool.id as keyof typeof progress] > 0 && progress[tool.id as keyof typeof progress] < 100;
          const toolProgress = progress[tool.id as keyof typeof progress];
          
          return (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card 
                className={`w-full p-2 sm:p-4 cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
                  isInProgress ? 'ring-2 ring-primary/20 bg-primary/5' : ''
                } ${isCompleted ? 'bg-green-50/50' : ''}`}
                onClick={() => onNavigateToTool(tool.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-2 sm:p-3 rounded-xl bg-gradient-to-br ${colors.bg} border ${colors.border} relative`}>
                    <tool.icon className={`w-4 h-4 sm:w-6 sm:h-6 ${colors.icon}`} />
                    {isCompleted && (
                      <motion.div
                        className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", delay: 0.5 }}
                      >
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </motion.div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1 min-w-0">
                    <Badge variant={isCompleted ? 'default' : isInProgress ? 'secondary' : 'outline'}>
                      {isCompleted ? '完了' : isInProgress ? '進行中' : '未開始'}
                    </Badge>
                    <Badge variant="outline" className={`text-[10px] sm:text-xs ${getDifficultyColor(tool.difficulty)}`}>
                      {tool.difficulty}
                    </Badge>
                    {tool.badge && (
                      <Badge className="text-[10px] sm:text-xs bg-blue-100 text-blue-700">
                        {tool.badge}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <h3 className="font-bold text-base sm:text-2xl text-foreground mb-2">{tool.title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-4">{tool.description}</p>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs sm:text-sm font-medium text-foreground">進捗</span>
                      <span className={`font-medium ${colors.text}`}>
                        {toolProgress}%
                      </span>
                    </div>
                    <Progress 
                      value={toolProgress} 
                      className="h-2"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{tool.estimatedTime}</span>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-2">期待できる成果:</div>
                    <div className="flex flex-wrap gap-1">
                      {tool.insights.slice(0, 2).map((insight, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] sm:text-xs">
                          {insight}
                        </Badge>
                      ))}
                      {tool.insights.length > 2 && (
                        <Badge variant="outline" className="text-[10px] sm:text-xs">
                          +{tool.insights.length - 2}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-border">
                  <Button 
                    variant={isCompleted ? "outline" : "default"}
                    className={`w-full flex items-center justify-center space-x-2 px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm ${
                      isCompleted 
                        ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' 
                        : ''
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigateToTool(tool.id);
                    }}
                  >
                    {isCompleted ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="text-xs sm:text-base">結果を確認</span>
                      </>
                    ) : isInProgress ? (
                      <>
                        <span className="text-xs sm:text-base">続きから始める</span>
                        <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                      </>
                    ) : (
                      <>
                        <span className="text-xs sm:text-base">始める</span>
                        <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
      {/* Floating AI相談ボタン */}
      <motion.button
        onClick={() => onNavigateToTool('aiChat')}
        aria-label="AIに相談する"
        className="fixed bottom-4 right-3 sm:bottom-6 sm:right-6 z-50 bg-primary text-white px-2.5 py-1.5 sm:px-4 sm:py-3 rounded-full shadow-lg flex items-center space-x-2 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Brain className="w-4 h-4 sm:w-5 sm:h-5" />
        <span className="font-semibold text-[11px] sm:text-base">AIに相談する</span>
      </motion.button>
    </div>
  );
}