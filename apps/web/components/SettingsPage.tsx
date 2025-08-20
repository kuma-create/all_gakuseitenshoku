import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  User as UserIcon, 
  Bell, 
  Shield, 
  Palette, 
  Download, 
  Upload, 
  LogOut, 
  Trash2,
  Save,
  X,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Camera,
  Edit3,
  Globe,
  Moon,
  Sun,
  Monitor,
  Smartphone,
  Mail,
  Calendar,
  Target,
  GraduationCap,
  Building,
  Languages,
  Clock,
  Database,
  Lock,
  Key,
  Fingerprint,
  Activity,
  FileText,
  HelpCircle,
  ExternalLink,
  Crown,
  Zap,
  RefreshCw,
  ChevronRight,
  Copy,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Route, User } from '../App';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { Progress } from './ui/progress';
import { Avatar } from './ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface SettingsPageProps {
  navigate: (route: Route) => void;
  user: User | null;
  updateUser: (user: User) => void;
  onLogout: () => void;
}

export function SettingsPage({ navigate, user, updateUser, onLogout }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    university: user?.university || '',
    major: user?.major || '',
    graduationYear: user?.graduationYear || 2025,
    targetIndustries: user?.targetIndustries || []
  });
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const industries = [
    'IT・ソフトウェア', 'コンサルティング', '金融・銀行', 'メーカー',
    '商社', '広告・マーケティング', '不動産', '小売・流通',
    'エネルギー', '建設・インフラ', '医療・ヘルスケア', '教育',
    '公務員', 'NPO・NGO', 'スタートアップ', 'その他'
  ];

  const universities = [
    '東京大学', '京都大学', '大阪大学', '東北大学', '名古屋大学',
    '九州大学', '北海道大学', '慶應義塾大学', '早稲田大学', 'その他'
  ];

  const majors = [
    '経済学部', '経営学部', '法学部', '文学部', '理学部',
    '工学部', '農学部', '医学部', '薬学部', '教育学部',
    '国際関係学部', '情報学部', 'その他'
  ];

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name,
        email: user.email,
        university: user.university || '',
        major: user.major || '',
        graduationYear: user.graduationYear || 2025,
        targetIndustries: user.targetIndustries || []
      });
    }
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center py-12">
          <Settings className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">ログインが必要です</h2>
          <p className="text-muted-foreground mb-4">設定にアクセスするにはログインしてください</p>
          <Button onClick={() => navigate('/ipo')}>ホームに戻る</Button>
        </div>
      </div>
    );
  }

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const updatedUser: User = {
        ...user,
        name: profileData.name,
        email: profileData.email,
        university: profileData.university,
        major: profileData.major,
        graduationYear: profileData.graduationYear,
        targetIndustries: profileData.targetIndustries
      };
      updateUser(updatedUser);
      setEditingProfile(false);
      toast.success('プロフィールを更新しました');
    } catch (error) {
      toast.error('プロフィールの更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleSettingChange = async (key: string, value: any) => {
    setSaving(true);
    try {
      const updatedUser: User = {
        ...user,
        settings: {
          ...user.settings,
          [key]: typeof value === 'object' ? { ...user.settings[key as keyof User['settings']], ...value } : value
        }
      };
      updateUser(updatedUser);
      toast.success('設定を更新しました');
    } catch (error) {
      toast.error('設定の更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.new !== passwordData.confirm) {
      toast.error('新しいパスワードが一致しません');
      return;
    }
    if (passwordData.new.length < 8) {
      toast.error('パスワードは8文字以上で入力してください');
      return;
    }

    setSaving(true);
    try {
      // Here you would call your API to change the password
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock API call
      setPasswordData({ current: '', new: '', confirm: '' });
      setShowChangePassword(false);
      toast.success('パスワードを変更しました');
    } catch (error) {
      toast.error('パスワードの変更に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    setSaving(true);
    try {
      const dataToExport = {
        profile: {
          name: user.name,
          email: user.email,
          university: user.university,
          major: user.major,
          graduationYear: user.graduationYear,
          targetIndustries: user.targetIndustries
        },
        settings: user.settings,
        exportedAt: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ipo-university-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('データをエクスポートしました');
    } catch (error) {
      toast.error('データのエクスポートに失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setSaving(true);
    try {
      // Here you would call your API to delete the account
      await new Promise(resolve => setTimeout(resolve, 2000)); // Mock API call
      toast.success('アカウントを削除しました');
      onLogout();
    } catch (error) {
      toast.error('アカウントの削除に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const toggleIndustry = (industry: string) => {
    const newIndustries = profileData.targetIndustries.includes(industry)
      ? profileData.targetIndustries.filter(i => i !== industry)
      : [...profileData.targetIndustries, industry];
    setProfileData({ ...profileData, targetIndustries: newIndustries });
  };

  const getUsageStats = () => {
    return {
      totalAnalyses: 23,
      totalEvents: 45,
      totalCases: 12,
      totalLibraryViews: 89,
      streakDays: 14,
      completionRate: 78
    };
  };

  const stats = getUsageStats();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">設定</h1>
            <p className="text-muted-foreground">アカウントとアプリケーションの設定を管理</p>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant={user.role === 'premium' ? 'default' : 'secondary'} className="flex items-center space-x-1">
              {user.role === 'premium' && <Crown className="w-3 h-3" />}
              <span>{user.role === 'premium' ? 'Premium' : 'Free'}アカウント</span>
            </Badge>
            {user.role === 'free' && (
              <Button size="sm" className="flex items-center space-x-2">
                <Zap className="w-4 h-4" />
                <span>アップグレード</span>
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6 mb-8">
            <TabsTrigger value="profile" className="flex items-center space-x-2">
              <UserIcon className="w-4 h-4" />
              <span className="hidden sm:inline">プロフィール</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center space-x-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">通知</span>
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center space-x-2">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">プライバシー</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center space-x-2">
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline">外観</span>
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center space-x-2">
              <Database className="w-4 h-4" />
              <span className="hidden sm:inline">データ</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center space-x-2">
              <Lock className="w-4 h-4" />
              <span className="hidden sm:inline">セキュリティ</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground">プロフィール情報</h2>
                <Button
                  variant={editingProfile ? 'outline' : 'default'}
                  onClick={() => setEditingProfile(!editingProfile)}
                  className="flex items-center space-x-2"
                >
                  {editingProfile ? (
                    <>
                      <X className="w-4 h-4" />
                      <span>キャンセル</span>
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-4 h-4" />
                      <span>編集</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Avatar Section */}
              <div className="flex items-center space-x-6 mb-6">
                <div className="relative">
                  <Avatar name={user.name} size="lg" />
                  {editingProfile && (
                    <button className="absolute -bottom-1 -right-1 p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors">
                      <Camera className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-foreground">{user.name}</h3>
                  <p className="text-muted-foreground">{user.email}</p>
                  <p className="text-sm text-muted-foreground">
                    参加日: {new Date(user.joinedAt).toLocaleDateString('ja-JP')}
                  </p>
                </div>
              </div>

              {/* Profile Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">氏名</label>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    disabled={!editingProfile}
                    className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-colors disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">メールアドレス</label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    disabled={!editingProfile}
                    className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-colors disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">大学</label>
                  <select
                    value={profileData.university}
                    onChange={(e) => setProfileData({ ...profileData, university: e.target.value })}
                    disabled={!editingProfile}
                    className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-colors disabled:opacity-50"
                  >
                    <option value="">選択してください</option>
                    {universities.map((uni) => (
                      <option key={uni} value={uni}>{uni}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">学部</label>
                  <select
                    value={profileData.major}
                    onChange={(e) => setProfileData({ ...profileData, major: e.target.value })}
                    disabled={!editingProfile}
                    className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-colors disabled:opacity-50"
                  >
                    <option value="">選択してください</option>
                    {majors.map((major) => (
                      <option key={major} value={major}>{major}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">卒業予定年</label>
                  <input
                    type="number"
                    value={profileData.graduationYear}
                    onChange={(e) => setProfileData({ ...profileData, graduationYear: parseInt(e.target.value) })}
                    disabled={!editingProfile}
                    min="2024"
                    max="2030"
                    className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-colors disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Target Industries */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-foreground mb-3">志望業界</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {industries.map((industry) => (
                    <button
                      key={industry}
                      onClick={() => editingProfile && toggleIndustry(industry)}
                      disabled={!editingProfile}
                      className={`p-2 text-sm rounded-lg border transition-colors text-left disabled:opacity-50 ${
                        profileData.targetIndustries.includes(industry)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted text-muted-foreground border-border hover:bg-accent'
                      }`}
                    >
                      {industry}
                    </button>
                  ))}
                </div>
              </div>

              {editingProfile && (
                <div className="flex items-center space-x-3 mt-6 pt-6 border-t border-border">
                  <Button 
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="flex items-center space-x-2"
                  >
                    {saving ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>保存</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => setEditingProfile(false)}
                    disabled={saving}
                  >
                    キャンセル
                  </Button>
                </div>
              )}
            </Card>

            {/* Usage Stats */}
            <Card className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-6">利用状況</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary mb-1">{stats.totalAnalyses}</div>
                  <div className="text-sm text-muted-foreground">自己分析回数</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary mb-1">{stats.totalEvents}</div>
                  <div className="text-sm text-muted-foreground">予定作成数</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary mb-1">{stats.totalCases}</div>
                  <div className="text-sm text-muted-foreground">ケース解答数</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary mb-1">{stats.totalLibraryViews}</div>
                  <div className="text-sm text-muted-foreground">ライブラリ閲覧数</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary mb-1">{stats.streakDays}</div>
                  <div className="text-sm text-muted-foreground">連続利用日数</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary mb-1">{stats.completionRate}%</div>
                  <div className="text-sm text-muted-foreground">完了率</div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-6">通知設定</h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-foreground">メール通知</div>
                      <div className="text-sm text-muted-foreground">重要な更新をメールで受け取る</div>
                    </div>
                  </div>
                  <Switch
                    checked={user.settings.notifications.email}
                    onCheckedChange={(checked) => 
                      handleSettingChange('notifications', { email: checked })
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Smartphone className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-foreground">プッシュ通知</div>
                      <div className="text-sm text-muted-foreground">リアルタイム通知を受け取る</div>
                    </div>
                  </div>
                  <Switch
                    checked={user.settings.notifications.push}
                    onCheckedChange={(checked) => 
                      handleSettingChange('notifications', { push: checked })
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Bell className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-foreground">リマインダー</div>
                      <div className="text-sm text-muted-foreground">スケジュールのリマインダー通知</div>
                    </div>
                  </div>
                  <Switch
                    checked={user.settings.notifications.reminders}
                    onCheckedChange={(checked) => 
                      handleSettingChange('notifications', { reminders: checked })
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-foreground">週次レポート</div>
                      <div className="text-sm text-muted-foreground">週間の学習進捗レポート</div>
                    </div>
                  </div>
                  <Switch
                    checked={user.settings.notifications.weeklyReport}
                    onCheckedChange={(checked) => 
                      handleSettingChange('notifications', { weeklyReport: checked })
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Zap className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-foreground">新機能・コンテンツ</div>
                      <div className="text-sm text-muted-foreground">新しい機能やコンテンツの通知</div>
                    </div>
                  </div>
                  <Switch
                    checked={user.settings.notifications.newContent}
                    onCheckedChange={(checked) => 
                      handleSettingChange('notifications', { newContent: checked })
                    }
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-6">プライバシー設定</h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Eye className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-foreground">プロフィール公開設定</div>
                      <div className="text-sm text-muted-foreground">
                        現在: {user.settings.privacy.profileVisibility === 'public' ? '公開' : '非公開'}
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={user.settings.privacy.profileVisibility === 'public'}
                    onCheckedChange={(checked) => 
                      handleSettingChange('privacy', { 
                        profileVisibility: checked ? 'public' : 'private' 
                      })
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Database className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-foreground">データ共有</div>
                      <div className="text-sm text-muted-foreground">サービス改善のためのデータ共有</div>
                    </div>
                  </div>
                  <Switch
                    checked={user.settings.privacy.dataSharing}
                    onCheckedChange={(checked) => 
                      handleSettingChange('privacy', { dataSharing: checked })
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Activity className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-foreground">利用分析</div>
                      <div className="text-sm text-muted-foreground">利用状況の分析に協力する</div>
                    </div>
                  </div>
                  <Switch
                    checked={user.settings.privacy.analyticsOptIn}
                    onCheckedChange={(checked) => 
                      handleSettingChange('privacy', { analyticsOptIn: checked })
                    }
                  />
                </div>
              </div>

              <div className="mt-6 p-4 bg-muted/20 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium mb-1">プライバシーについて</p>
                    <p>
                      収集されたデータは、サービスの改善とパーソナライズされた体験の提供にのみ使用されます。
                      データの詳細な取り扱いについては、
                      <button className="text-primary hover:underline ml-1">プライバシーポリシー</button>
                      をご確認ください。
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-6">外観設定</h2>
              <div className="space-y-6">
                <div>
                  <div className="font-medium text-foreground mb-3">テーマ</div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { key: 'light', label: 'ライト', icon: Sun },
                      { key: 'dark', label: 'ダーク', icon: Moon },
                      { key: 'system', label: 'システム', icon: Monitor }
                    ].map(({ key, label, icon: Icon }) => (
                      <button
                        key={key}
                        onClick={() => handleSettingChange('theme', key)}
                        className={`p-4 rounded-lg border transition-all ${
                          user.settings.theme === key
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-accent'
                        }`}
                      >
                        <Icon className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                        <div className="text-sm font-medium">{label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Languages className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-foreground">言語</div>
                      <div className="text-sm text-muted-foreground">インターフェース言語</div>
                    </div>
                  </div>
                  <select
                    value={user.settings.preferences.language}
                    onChange={(e) => 
                      handleSettingChange('preferences', { 
                        language: e.target.value 
                      })
                    }
                    className="px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="ja">日本語</option>
                    <option value="en">English</option>
                  </select>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-foreground">タイムゾーン</div>
                      <div className="text-sm text-muted-foreground">現在: {user.settings.preferences.timezone}</div>
                    </div>
                  </div>
                  <select
                    value={user.settings.preferences.timezone}
                    onChange={(e) => 
                      handleSettingChange('preferences', { 
                        timezone: e.target.value 
                      })
                    }
                    className="px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                  </select>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Save className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-foreground">自動保存</div>
                      <div className="text-sm text-muted-foreground">作業内容を自動で保存する</div>
                    </div>
                  </div>
                  <Switch
                    checked={user.settings.preferences.autoSave}
                    onCheckedChange={(checked) => 
                      handleSettingChange('preferences', { autoSave: checked })
                    }
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="data" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-6">データ管理</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-foreground mb-3">データエクスポート</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    あなたのプロフィール、設定、学習データをダウンロードできます。
                  </p>
                  <Button 
                    onClick={handleExportData}
                    disabled={saving}
                    className="flex items-center space-x-2"
                  >
                    {saving ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span>データをエクスポート</span>
                  </Button>
                </div>

                <Separator />

                <div>
                  <h3 className="font-medium text-foreground mb-3">データインポート</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    以前にエクスポートしたデータをインポートできます。
                  </p>
                  <Button variant="outline" className="flex items-center space-x-2">
                    <Upload className="w-4 h-4" />
                    <span>データをインポート</span>
                  </Button>
                </div>

                <Separator />

                <div>
                  <h3 className="font-medium text-foreground mb-3">キャッシュクリア</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    アプリケーションのキャッシュをクリアして動作を軽くします。
                  </p>
                  <Button variant="outline" className="flex items-center space-x-2">
                    <RefreshCw className="w-4 h-4" />
                    <span>キャッシュをクリア</span>
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-6">ストレージ使用状況</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">プロフィールデータ</span>
                    <span className="text-sm font-medium">2.1 MB</span>
                  </div>
                  <Progress value={15} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">自己分析データ</span>
                    <span className="text-sm font-medium">5.8 MB</span>
                  </div>
                  <Progress value={42} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">ケース解答データ</span>
                    <span className="text-sm font-medium">1.2 MB</span>
                  </div>
                  <Progress value={9} className="h-2" />
                </div>
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">合計使用量</span>
                    <span className="font-bold text-primary">9.1 MB / 100 MB</span>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-6">セキュリティ設定</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-foreground mb-3">パスワード変更</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    定期的なパスワード変更をお勧めします。
                  </p>
                  {!showChangePassword ? (
                    <Button 
                      onClick={() => setShowChangePassword(true)}
                      className="flex items-center space-x-2"
                    >
                      <Key className="w-4 h-4" />
                      <span>パスワードを変更</span>
                    </Button>
                  ) : (
                    <div className="space-y-4 p-4 bg-muted/20 rounded-lg">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">現在のパスワード</label>
                        <div className="relative">
                          <input
                            type={showPassword.current ? 'text' : 'password'}
                            value={passwordData.current}
                            onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                            className="w-full px-3 py-2 pr-10 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPassword.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">新しいパスワード</label>
                        <div className="relative">
                          <input
                            type={showPassword.new ? 'text' : 'password'}
                            value={passwordData.new}
                            onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                            className="w-full px-3 py-2 pr-10 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPassword.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">新しいパスワード（確認）</label>
                        <div className="relative">
                          <input
                            type={showPassword.confirm ? 'text' : 'password'}
                            value={passwordData.confirm}
                            onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                            className="w-full px-3 py-2 pr-10 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPassword.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Button 
                          onClick={handleChangePassword}
                          disabled={saving || !passwordData.current || !passwordData.new || !passwordData.confirm}
                          className="flex items-center space-x-2"
                        >
                          {saving ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          <span>変更</span>
                        </Button>
                        <Button 
                          variant="ghost" 
                          onClick={() => {
                            setShowChangePassword(false);
                            setPasswordData({ current: '', new: '', confirm: '' });
                          }}
                          disabled={saving}
                        >
                          キャンセル
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                <div>
                  <h3 className="font-medium text-foreground mb-3">ログインセッション</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    現在のログインセッションを確認できます。
                  </p>
                  <div className="space-y-3">
                    <div className="p-3 bg-muted/20 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-foreground">このデバイス</div>
                          <div className="text-sm text-muted-foreground">
                            最終アクセス: {new Date().toLocaleString('ja-JP')}
                          </div>
                        </div>
                        <Badge variant="default">現在</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-medium text-foreground mb-3 flex items-center space-x-2">
                    <Fingerprint className="w-5 h-5" />
                    <span>二段階認証</span>
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    アカウントのセキュリティを強化するために二段階認証を有効にしてください。
                  </p>
                  <Button variant="outline" className="flex items-center space-x-2">
                    <Shield className="w-4 h-4" />
                    <span>二段階認証を設定</span>
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-6 flex items-center space-x-2">
                <LogOut className="w-6 h-6" />
                <span>アカウント操作</span>
              </h2>
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-foreground mb-3">ログアウト</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    このデバイスからログアウトします。
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={onLogout}
                    className="flex items-center space-x-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>ログアウト</span>
                  </Button>
                </div>

                <Separator />

                <div>
                  <h3 className="font-medium text-foreground mb-3 text-red-600">アカウント削除</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    アカウントを削除すると、すべてのデータが永久に失われます。この操作は取り消せません。
                  </p>
                  {!showDeleteDialog ? (
                    <Button 
                      variant="destructive"
                      onClick={() => setShowDeleteDialog(true)}
                      className="flex items-center space-x-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>アカウントを削除</span>
                    </Button>
                  ) : (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start space-x-3 mb-4">
                        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-red-900 mb-1">本当にアカウントを削除しますか？</h4>
                          <p className="text-sm text-red-800">
                            この操作は取り消せません。すべてのデータが永久に失われます。
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Button 
                          variant="destructive"
                          onClick={handleDeleteAccount}
                          disabled={saving}
                          className="flex items-center space-x-2"
                        >
                          {saving ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                          <span>削除する</span>
                        </Button>
                        <Button 
                          variant="ghost" 
                          onClick={() => setShowDeleteDialog(false)}
                          disabled={saving}
                        >
                          キャンセル
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}