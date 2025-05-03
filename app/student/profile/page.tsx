"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { PlusCircle, Trash2, Save, X, Edit, School, Briefcase, Code, User, Trophy, Award, Target } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CalendarIcon, ExternalLink } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AchievementBadge } from "@/components/achievement-badge"
import { getUserBadges, getEarnedBadges } from "@/lib/badge-data"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MultiSelect } from "@/components/multi-select"

// モックデータ
const initialProfile = {
  basicInfo: {
    name: "山田 太郎",
    university: "東京大学",
    faculty: "工学部",
    year: 3,
    graduationYear: 2026,
  },
  studentSkills: [
    { id: 1, skill_name: "JavaScript", level: 3 },
    { id: 2, skill_name: "React", level: 4 },
    { id: 3, skill_name: "TypeScript", level: 2 },
  ],
  experiences: [
    {
      id: 1,
      company_name: "テックスタートアップ株式会社",
      role: "フロントエンドエンジニアインターン",
      start_date: "2023-06-01",
      end_date: "2023-09-30",
      duration: "3ヶ月",
      achievements: "React/TypeScriptを用いたWebアプリケーション開発。UIコンポーネントの実装とテスト。",
    },
    {
      id: 2,
      company_name: "グローバルテック株式会社",
      role: "サマーインターン",
      start_date: "2022-08-01",
      end_date: "2022-09-30",
      duration: "2ヶ月",
      achievements: "チーム開発でのプロトタイプ作成。ユーザーインターフェースデザインとフロントエンド実装を担当。",
    },
  ],
  certifications: [
    {
      id: 1,
      certification_name: "基本情報技術者",
      issuer: "IPA",
      issued_at: "2023-04-01",
      certification_id: "FE123456",
    },
  ],
  selfPR: `私は大学での学びと並行して、実践的なWeb開発スキルを身につけるために独学とインターンシップを重ねてきました。特にフロントエンド開発に情熱を持ち、ReactとTypeScriptを用いたモダンなUI実装に強みがあります。

チーム開発の経験から、コミュニケーション能力とコラボレーションの重要性を学びました。また、新しい技術への適応力が高く、継続的に学習を続けることで技術スタックを広げています。

将来はユーザー体験を向上させるプロダクト開発に携わり、技術を通じて社会に貢献したいと考えています。`,
  education: [
    {
      id: 1,
      school: "東京都立青山高等学校",
      period: "2018年4月 - 2021年3月",
      description: "情報科学コース",
    },
  ],
  desiredIndustries: [
    { id: 1, name: "IT" },
    { id: 2, name: "コンサル" },
  ],
  desiredLocations: [
    { id: 1, name: "東京" },
    { id: 2, name: "大阪" },
  ],
  desiredPositions: [
    { id: 1, name: "フロントエンドエンジニア" },
    { id: 2, name: "バックエンドエンジニア" },
  ],
  jobPreferences: {
    work_style: "hybrid",
    salary_range: "500-600",
    remarks: "週3日出社希望",
  },
}

// モックデータ - グランプリ履歴
const grandPrixHistory = [
  {
    id: 1,
    month: "2025年5月",
    title: "あなたがチームで成果を出した経験を教えてください",
    status: "採点済", // 未提出, 提出済, 採点済
    score: 82,
    answer: `私は大学3年次の夏、テックスタートアップでのインターン中に5人チームのリーダーとして、新機能の開発プロジェクトを担当しました。

チーム内でスキルレベルの差があり、進捗にばらつきが生じていました。そこで私は、各メンバーの強みを活かせるようタスク分担を見直し、毎日15分のショートミーティングを導入して問題点を早期に共有できる環境を作りました。

また、技術的な課題に直面した際は、チーム全体でのペアプログラミングセッションを実施。これにより知識共有が進み、メンバー全員のスキル向上にも繋がりました。

結果として、予定より2日早くプロジェクトを完了させ、クライアントからも高い評価を得ることができました。この経験から、チームの成功には個々の能力だけでなく、適切なコミュニケーションと協力体制の構築が重要だと学びました。`,
    feedback:
      "チームでの役割と具体的な行動が明確に書かれており、成果に至るプロセスが分かりやすいです。数字や具体例をもう少し盛り込むとさらに説得力が増すでしょう。",
  },
  {
    id: 2,
    month: "2025年4月",
    title: "あなたの強みと弱み、それをどのように活かし、克服しようとしているか教えてください",
    status: "採点済",
    score: 78,
    answer: `私の強みは、複雑な問題を論理的に分解し、効率的な解決策を見つける分析力です。プログラミングコンテストでの入賞経験や、学内プロジェクトでのトラブルシューティング役を任されることが多いのはこの強みによるものです。

一方、弱みは初対面の人とのコミュニケーションに時間がかかることです。内向的な性格のため、新しい環境での人間関係構築に苦労することがあります。

強みを活かすため、大学ではデータ分析やアルゴリズム設計の授業に積極的に参加し、実践的なスキルを磨いています。また、弱みを克服するために、学生団体の広報担当に自ら志願し、外部の人との交渉や調整を担当。最初は緊張しましたが、回数を重ねるごとに自信がつき、今では以前より円滑にコミュニケーションが取れるようになりました。

今後も分析力を磨きながら、コミュニケーション能力も向上させ、チームの中で両方の能力を発揮できる人材になりたいと考えています。`,
    feedback:
      "自己分析が的確で、強み・弱みの具体例が示されています。特に弱みへの取り組みが具体的で評価できます。今後のキャリアにどう活かすかの展望があるとより良いでしょう。",
  },
  {
    id: 3,
    month: "2025年3月",
    title: "学生時代に最も力を入れたことは何ですか？その経験から何を学びましたか？",
    status: "提出済",
    score: null,
    answer: `学生時代に最も力を入れたのは、プログラミングサークルでのWebアプリケーション開発です。2年生の時に興味を持ち始め、独学でプログラミングを学んだ後、サークルに入会しました。

最初は基礎的な知識しかなかったため、先輩方のコードを理解するのに苦労しましたが、毎日コーディングの練習を重ね、オンライン講座も活用して技術力を高めました。3年生になると小規模なプロジェクトのリーダーを任され、5人のチームで大学祭の来場者管理システムを開発。要件定義から設計、実装、テストまでの一連の流れを経験しました。

この活動から、技術的なスキルだけでなく、チームでの役割分担や進捗管理、メンバー間のコミュニケーションの重要性を学びました。特に、技術レベルの異なるメンバーが協力して一つの成果物を作り上げる難しさと喜びを知ることができました。

この経験は、将来エンジニアとして働く上での基盤となっており、チームでの開発プロセスへの理解や問題解決能力の向上に大きく貢献しています。`,
    feedback: null,
  },
  {
    id: 4,
    month: "2025年2月",
    title: "あなたが志望する業界・職種について、なぜその分野に興味を持ったのか教えてください",
    status: "未提出",
    score: null,
    answer: null,
    feedback: null,
  },
]

// モックデータ - 選択肢
const availableIndustries = [
  { id: 1, name: "IT" },
  { id: 2, name: "金融" },
  { id: 3, name: "コンサル" },
  { id: 4, name: "メーカー" },
  { id: 5, name: "商社" },
]

const availableLocations = [
  { id: 1, name: "東京" },
  { id: 2, name: "大阪" },
  { id: 3, name: "名古屋" },
  { id: 4, name: "福岡" },
  { id: 5, name: "札幌" },
]

const availablePositions = [
  { id: 1, name: "フロントエンドエンジニア" },
  { id: 2, name: "バックエンドエンジニア" },
  { id: 3, name: "データサイエンティスト" },
  { id: 4, name: "プロジェクトマネージャー" },
  { id: 5, name: "セールス" },
]

// ユーティリティ関数
const getSkillLevelColor = (level: number) => {
  switch (level) {
    case 1:
      return "text-gray-500"
    case 2:
      return "text-green-500"
    case 3:
      return "text-blue-500"
    case 4:
      return "text-purple-500"
    case 5:
      return "text-red-500"
    default:
      return "text-gray-500"
  }
}

const getWorkStyleLabel = (workStyle: string) => {
  switch (workStyle) {
    case "full_remote":
      return "フルリモート"
    case "hybrid":
      return "ハイブリッド"
    case "office":
      return "オフィス勤務"
    case "flexible":
      return "柔軟に対応可能"
    default:
      return "未設定"
  }
}

const getSalaryRangeLabel = (salaryRange: string) => {
  switch (salaryRange) {
    case "300-400":
      return "300万円〜400万円"
    case "400-500":
      return "400万円〜500万円"
    case "500-600":
      return "500万円〜600万円"
    case "600-700":
      return "600万円〜700万円"
    case "700-800":
      return "700万円〜800万円"
    case "800-":
      return "800万円〜"
    default:
      return "未設定"
  }
}

export default function StudentProfilePage() {
  const [profile, setProfile] = useState(initialProfile)
  const [isEditing, setIsEditing] = useState(false)
  const [newSkill, setNewSkill] = useState("")
  const [editedProfile, setEditedProfile] = useState(initialProfile)
  const [selectedAnswer, setSelectedAnswer] = useState<(typeof grandPrixHistory)[0] | null>(null)
  const [isAnswerModalOpen, setIsAnswerModalOpen] = useState(false)
  const [badgeTab, setBadgeTab] = useState<"all" | "earned">("earned")
  const [newSkillName, setNewSkillName] = useState("")
  const [newSkillLevel, setNewSkillLevel] = useState(1)

  // Get user badges
  const allBadges = getUserBadges()
  const earnedBadges = getEarnedBadges()

  // 平均スコアの計算
  const scoredSubmissions = grandPrixHistory.filter((item) => item.status === "採点済" && item.score !== null)
  const averageScore =
    scoredSubmissions.length > 0
      ? Math.round(scoredSubmissions.reduce((acc, curr) => acc + (curr.score || 0), 0) / scoredSubmissions.length)
      : null

  // 編集モードの切り替え
  const toggleEditMode = () => {
    if (isEditing) {
      // 編集をキャンセル
      setEditedProfile(profile)
    } else {
      // 編集モードに入る
      setEditedProfile({ ...profile })
    }
    setIsEditing(!isEditing)
  }

  // 変更を保存
  const saveChanges = () => {
    setProfile(editedProfile)
    setIsEditing(false)
  }

  // 基本情報の更新
  const updateBasicInfo = (field: string, value: string | number) => {
    setEditedProfile({
      ...editedProfile,
      basicInfo: {
        ...editedProfile.basicInfo,
        [field]: value,
      },
    })
  }

  // スキルの追加
  const addSkill = () => {
    if (newSkill.trim() && !editedProfile.skills.includes(newSkill.trim())) {
      setEditedProfile({
        ...editedProfile,
        skills: [...editedProfile.skills, newSkill.trim()],
      })
      setNewSkill("")
    }
  }

  // スキルの削除
  const removeSkill = (skillToRemove: string) => {
    setEditedProfile({
      ...editedProfile,
      skills: editedProfile.skills.filter((skill) => skill !== skillToRemove),
    })
  }

  // 経歴の更新
  const updateExperience = (id: number, field: string, value: string) => {
    setEditedProfile({
      ...editedProfile,
      experiences: editedProfile.experiences.map((exp) => (exp.id === id ? { ...exp, [field]: value } : exp)),
    })
  }

  // 経歴の追加
  const addExperience = () => {
    const newId = Math.max(0, ...editedProfile.experiences.map((exp) => exp.id)) + 1
    setEditedProfile({
      ...editedProfile,
      experiences: [
        ...editedProfile.experiences,
        {
          id: newId,
          company_name: "",
          role: "",
          start_date: "",
          end_date: "",
          duration: "",
          achievements: "",
        },
      ],
    })
  }

  // 経歴の削除
  const removeExperience = (id: number) => {
    setEditedProfile({
      ...editedProfile,
      experiences: editedProfile.experiences.filter((exp) => exp.id !== id),
    })
  }

  // 学歴の更新
  const updateEducation = (id: number, field: string, value: string) => {
    setEditedProfile({
      ...editedProfile,
      education: editedProfile.education.map((edu) => (edu.id === id ? { ...edu, [field]: value } : edu)),
    })
  }

  // 学歴の追加
  const addEducation = () => {
    const newId = Math.max(0, ...editedProfile.education.map((edu) => edu.id)) + 1
    setEditedProfile({
      ...editedProfile,
      education: [
        ...editedProfile.education,
        {
          id: newId,
          school: "",
          period: "",
          description: "",
        },
      ],
    })
  }

  // 学歴の削除
  const removeEducation = (id: number) => {
    setEditedProfile({
      ...editedProfile,
      education: editedProfile.education.filter((edu) => edu.id !== id),
    })
  }

  // スキル関連の関数
  const addSkillItem = () => {
    if (newSkillName.trim()) {
      const newId = Math.max(0, ...editedProfile.studentSkills.map((skill) => skill.id)) + 1
      setEditedProfile({
        ...editedProfile,
        studentSkills: [
          ...editedProfile.studentSkills,
          { id: newId, skill_name: newSkillName.trim(), level: newSkillLevel },
        ],
      })
      setNewSkillName("")
      setNewSkillLevel(1)
    }
  }

  const removeSkillItem = (id: number) => {
    setEditedProfile({
      ...editedProfile,
      studentSkills: editedProfile.studentSkills.filter((skill) => skill.id !== id),
    })
  }

  // 資格関連の関数
  const addCertification = () => {
    const newId = Math.max(0, ...editedProfile.certifications.map((cert) => cert.id)) + 1
    setEditedProfile({
      ...editedProfile,
      certifications: [
        ...editedProfile.certifications,
        {
          id: newId,
          certification_name: "",
          issuer: "",
          issued_at: new Date().toISOString().slice(0, 10), // 今日の日付を初期値として設定
          certification_id: "",
        },
      ],
    })
  }

  const removeCertification = (id: number) => {
    setEditedProfile({
      ...editedProfile,
      certifications: editedProfile.certifications.filter((cert) => cert.id !== id),
    })
  }

  const updateCertification = (id: number, field: string, value: string) => {
    setEditedProfile({
      ...editedProfile,
      certifications: editedProfile.certifications.map((cert) => (cert.id === id ? { ...cert, [field]: value } : cert)),
    })
  }

  // 希望条件関連の関数
  const setDesiredIndustries = (selected: { id: number; name: string }[]) => {
    setEditedProfile({ ...editedProfile, desiredIndustries: selected })
  }

  const setDesiredLocations = (selected: { id: number; name: string }[]) => {
    setEditedProfile({ ...editedProfile, desiredLocations: selected })
  }

  const setDesiredPositions = (selected: { id: number; name: string }[]) => {
    setEditedProfile({ ...editedProfile, desiredPositions: selected })
  }

  const updateJobPreferences = (field: string, value: string) => {
    setEditedProfile({
      ...editedProfile,
      jobPreferences: {
        ...editedProfile.jobPreferences,
        [field]: value,
      },
    })
  }

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-4xl">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">マイプロフィール</h1>
        {isEditing ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={toggleEditMode}>
              <X className="mr-2 h-4 w-4" /> キャンセル
            </Button>
            <Button onClick={saveChanges}>
              <Save className="mr-2 h-4 w-4" /> 保存
            </Button>
          </div>
        ) : (
          <Button onClick={toggleEditMode}>
            <Edit className="mr-2 h-4 w-4" /> 編集
          </Button>
        )}
      </div>

      {/* 保有バッジセクション */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Award className="mr-2 h-5 w-5 text-muted-foreground" />
              <CardTitle>保有バッジ</CardTitle>
            </div>
            <Badge variant="outline" className="ml-2">
              {earnedBadges.length}/{allBadges.length}個獲得
            </Badge>
          </div>
          <CardDescription>グランプリでの実績に応じて獲得したバッジです</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="earned" onValueChange={(value) => setBadgeTab(value as "all" | "earned")}>
            <TabsList className="mb-4">
              <TabsTrigger value="earned">獲得済み ({earnedBadges.length})</TabsTrigger>
              <TabsTrigger value="all">全てのバッジ ({allBadges.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="earned">
              {earnedBadges.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {earnedBadges.map((badge) => (
                    <AchievementBadge
                      key={badge.id}
                      id={badge.id}
                      name={badge.name}
                      description={badge.description}
                      icon={badge.icon}
                      earned={badge.earned}
                      earnedDate={badge.earnedDate}
                      variant={badge.variant}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="mb-3 text-4xl">🏆</div>
                  <h3 className="mb-1 text-lg font-medium">まだバッジを獲得していません</h3>
                  <p className="text-sm text-muted-foreground">グランプリに参加して、バッジを獲得しましょう！</p>
                  <Button className="mt-4" asChild>
                    <a href="/grandprix">グランプリに挑戦する</a>
                  </Button>
                </div>
              )}
            </TabsContent>
            <TabsContent value="all">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {allBadges.map((badge) => (
                  <AchievementBadge
                    key={badge.id}
                    id={badge.id}
                    name={badge.name}
                    description={badge.description}
                    icon={badge.icon}
                    earned={badge.earned}
                    earnedDate={badge.earnedDate}
                    progress={badge.progress}
                    maxProgress={badge.maxProgress}
                    variant={badge.variant}
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 基本情報 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center">
            <User className="mr-2 h-5 w-5 text-muted-foreground" />
            <CardTitle>基本情報</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">氏名</Label>
                <Input
                  id="name"
                  value={editedProfile.basicInfo.name}
                  onChange={(e) => updateBasicInfo("name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="university">大学名</Label>
                <Input
                  id="university"
                  value={editedProfile.basicInfo.university}
                  onChange={(e) => updateBasicInfo("university", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="faculty">学部</Label>
                <Input
                  id="faculty"
                  value={editedProfile.basicInfo.faculty}
                  onChange={(e) => updateBasicInfo("faculty", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">学年</Label>
                <Input
                  id="year"
                  type="number"
                  value={editedProfile.basicInfo.year}
                  onChange={(e) => updateBasicInfo("year", Number.parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="graduationYear">卒業予定年</Label>
                <Input
                  id="graduationYear"
                  type="number"
                  value={editedProfile.basicInfo.graduationYear}
                  onChange={(e) => updateBasicInfo("graduationYear", Number.parseInt(e.target.value) || 2024)}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">氏名</p>
                <p className="text-lg">{profile.basicInfo.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">大学名</p>
                <p className="text-lg">{profile.basicInfo.university}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">学部</p>
                <p className="text-lg">{profile.basicInfo.faculty}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">学年</p>
                <p className="text-lg">{profile.basicInfo.year}年</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">卒業予定年</p>
                <p className="text-lg">{profile.basicInfo.graduationYear}年</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* スキル */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center">
            <Code className="mr-2 h-5 w-5 text-muted-foreground" />
            <CardTitle>スキル</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {editedProfile.studentSkills.map((skillItem) => (
                  <Badge key={skillItem.id} variant="secondary" className="flex items-center gap-1 px-3 py-1">
                    {skillItem.skill_name}
                    {skillItem.level && <span className="ml-1 text-xs">Lv.{skillItem.level}</span>}
                    <button
                      type="button"
                      onClick={() => removeSkillItem(skillItem.id)}
                      className="ml-1 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Input
                  placeholder="スキル名"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  className="col-span-2"
                />
                <Select
                  value={newSkillLevel.toString()}
                  onValueChange={(value) => setNewSkillLevel(Number.parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="レベル" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">初級</SelectItem>
                    <SelectItem value="2">中級</SelectItem>
                    <SelectItem value="3">上級</SelectItem>
                    <SelectItem value="4">エキスパート</SelectItem>
                    <SelectItem value="5">マスター</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" onClick={addSkillItem} size="sm" className="md:col-span-3">
                  追加
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {profile.studentSkills.map((skillItem) => (
                <Badge key={skillItem.id} variant="secondary" className="flex items-center gap-1">
                  {skillItem.skill_name}
                  {skillItem.level && (
                    <span className={`ml-1 text-xs ${getSkillLevelColor(skillItem.level)}`}>Lv.{skillItem.level}</span>
                  )}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 資格 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center">
            <Award className="mr-2 h-5 w-5 text-muted-foreground" />
            <CardTitle>資格</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              {editedProfile.certifications.map((cert) => (
                <div key={cert.id} className="p-4 border rounded-md relative space-y-3">
                  <button
                    type="button"
                    onClick={() => removeCertification(cert.id)}
                    className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`cert-name-${cert.id}`}>資格名</Label>
                      <Input
                        id={`cert-name-${cert.id}`}
                        value={cert.certification_name}
                        onChange={(e) => updateCertification(cert.id, "certification_name", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`cert-date-${cert.id}`}>取得日</Label>
                      <Input
                        id={`cert-date-${cert.id}`}
                        type="date"
                        value={cert.issued_at}
                        onChange={(e) => updateCertification(cert.id, "issued_at", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`cert-issuer-${cert.id}`}>発行機関</Label>
                      <Input
                        id={`cert-issuer-${cert.id}`}
                        value={cert.issuer}
                        onChange={(e) => updateCertification(cert.id, "issuer", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`cert-id-${cert.id}`}>認定番号（任意）</Label>
                      <Input
                        id={`cert-id-${cert.id}`}
                        value={cert.certification_id}
                        onChange={(e) => updateCertification(cert.id, "certification_id", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" className="w-full" onClick={addCertification}>
                <PlusCircle className="mr-2 h-4 w-4" /> 資格を追加
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {profile.certifications.length > 0 ? (
                profile.certifications.map((cert) => (
                  <div key={cert.id} className="flex justify-between items-start border-b pb-3 last:border-0 last:pb-0">
                    <div>
                      <h4 className="font-medium">{cert.certification_name}</h4>
                      <p className="text-sm text-muted-foreground">{cert.issuer}</p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(cert.issued_at).toLocaleDateString("ja-JP", { year: "numeric", month: "long" })}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">資格情報はまだ登録されていません</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* インターン経験 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center">
            <Briefcase className="mr-2 h-5 w-5 text-muted-foreground" />
            <CardTitle>インターン経験</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-6">
              {editedProfile.experiences.map((exp) => (
                <div key={exp.id} className="p-4 border rounded-md relative space-y-3">
                  <button
                    type="button"
                    onClick={() => removeExperience(exp.id)}
                    className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <div className="space-y-2">
                    <Label htmlFor={`exp-company-${exp.id}`}>企業名</Label>
                    <Input
                      id={`exp-company-${exp.id}`}
                      value={exp.company_name}
                      onChange={(e) => updateExperience(exp.id, "company_name", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`exp-role-${exp.id}`}>役割</Label>
                    <Input
                      id={`exp-role-${exp.id}`}
                      value={exp.role}
                      onChange={(e) => updateExperience(exp.id, "role", e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`exp-start-${exp.id}`}>開始日</Label>
                      <Input
                        id={`exp-start-${exp.id}`}
                        type="date"
                        value={exp.start_date}
                        onChange={(e) => updateExperience(exp.id, "start_date", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`exp-end-${exp.id}`}>終了日</Label>
                      <Input
                        id={`exp-end-${exp.id}`}
                        type="date"
                        value={exp.end_date}
                        onChange={(e) => updateExperience(exp.id, "end_date", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`exp-duration-${exp.id}`}>期間（例：3ヶ月）</Label>
                    <Input
                      id={`exp-duration-${exp.id}`}
                      value={exp.duration}
                      onChange={(e) => updateExperience(exp.id, "duration", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`exp-achievements-${exp.id}`}>成果・実績</Label>
                    <Textarea
                      id={`exp-achievements-${exp.id}`}
                      value={exp.achievements}
                      onChange={(e) => updateExperience(exp.id, "achievements", e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" className="w-full" onClick={addExperience}>
                <PlusCircle className="mr-2 h-4 w-4" /> インターン経験を追加
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {profile.experiences.length > 0 ? (
                profile.experiences.map((exp) => (
                  <div key={exp.id} className="space-y-2">
                    <div className="flex justify-between">
                      <h3 className="font-semibold text-lg">{exp.company_name}</h3>
                      <span className="text-sm text-muted-foreground">{exp.duration}</span>
                    </div>
                    <p className="font-medium">{exp.role}</p>
                    <p className="text-muted-foreground">{exp.achievements}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">インターン経験はまだ登録されていません</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 希望条件 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center">
            <Target className="mr-2 h-5 w-5 text-muted-foreground" />
            <CardTitle>希望条件</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>希望業界</Label>
                <MultiSelect
                  options={availableIndustries}
                  selected={editedProfile.desiredIndustries}
                  onChange={setDesiredIndustries}
                  placeholder="業界を選択"
                />
              </div>
              <div className="space-y-2">
                <Label>希望勤務地</Label>
                <MultiSelect
                  options={availableLocations}
                  selected={editedProfile.desiredLocations}
                  onChange={setDesiredLocations}
                  placeholder="勤務地を選択"
                />
              </div>
              <div className="space-y-2">
                <Label>希望職種</Label>
                <MultiSelect
                  options={availablePositions}
                  selected={editedProfile.desiredPositions}
                  onChange={setDesiredPositions}
                  placeholder="職種を選択"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="work-style">希望勤務形態</Label>
                <Select
                  value={editedProfile.jobPreferences.work_style}
                  onValueChange={(value) => updateJobPreferences("work_style", value)}
                >
                  <SelectTrigger id="work-style">
                    <SelectValue placeholder="勤務形態を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_remote">フルリモート</SelectItem>
                    <SelectItem value="hybrid">ハイブリッド</SelectItem>
                    <SelectItem value="office">オフィス勤務</SelectItem>
                    <SelectItem value="flexible">柔軟に対応可能</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="salary-range">希望年収</Label>
                <Select
                  value={editedProfile.jobPreferences.salary_range}
                  onValueChange={(value) => updateJobPreferences("salary_range", value)}
                >
                  <SelectTrigger id="salary-range">
                    <SelectValue placeholder="希望年収を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="300-400">300万円〜400万円</SelectItem>
                    <SelectItem value="400-500">400万円〜500万円</SelectItem>
                    <SelectItem value="500-600">500万円〜600万円</SelectItem>
                    <SelectItem value="600-700">600万円〜700万円</SelectItem>
                    <SelectItem value="700-800">700万円〜800万円</SelectItem>
                    <SelectItem value="800-">800万円〜</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="remarks">備考・その他希望条件</Label>
                <Textarea
                  id="remarks"
                  value={editedProfile.jobPreferences.remarks || ""}
                  onChange={(e) => updateJobPreferences("remarks", e.target.value)}
                  placeholder="その他の希望条件があればご記入ください"
                  rows={3}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">希望業界</h4>
                <div className="flex flex-wrap gap-2">
                  {profile.desiredIndustries.map((industry) => (
                    <Badge key={industry.id} variant="outline">
                      {industry.name}
                    </Badge>
                  ))}
                  {profile.desiredIndustries.length === 0 && <p className="text-sm text-muted-foreground">未設定</p>}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">希望勤務地</h4>
                <div className="flex flex-wrap gap-2">
                  {profile.desiredLocations.map((location) => (
                    <Badge key={location.id} variant="outline">
                      {location.name}
                    </Badge>
                  ))}
                  {profile.desiredLocations.length === 0 && <p className="text-sm text-muted-foreground">未設定</p>}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">希望職種</h4>
                <div className="flex flex-wrap gap-2">
                  {profile.desiredPositions.map((position) => (
                    <Badge key={position.id} variant="outline">
                      {position.name}
                    </Badge>
                  ))}
                  {profile.desiredPositions.length === 0 && <p className="text-sm text-muted-foreground">未設定</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">希望勤務形態</h4>
                  <p>{getWorkStyleLabel(profile.jobPreferences.work_style)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">希望年収</h4>
                  <p>{getSalaryRangeLabel(profile.jobPreferences.salary_range)}</p>
                </div>
              </div>
              {profile.jobPreferences.remarks && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">備考・その他希望条件</h4>
                  <p className="text-sm">{profile.jobPreferences.remarks}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 自己PR */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>自己PR</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editedProfile.selfPR}
                onChange={(e) => setEditedProfile({ ...editedProfile, selfPR: e.target.value })}
                rows={8}
              />
            </div>
          ) : (
            <blockquote className="border-l-4 border-muted pl-4 italic">
              {profile.selfPR.split("\n\n").map((paragraph, index) => (
                <p key={index} className="my-2">
                  {paragraph}
                </p>
              ))}
            </blockquote>
          )}
        </CardContent>
      </Card>

      {/* 教育 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center">
            <School className="mr-2 h-5 w-5 text-muted-foreground" />
            <CardTitle>教育</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-6">
              {editedProfile.education.map((edu) => (
                <div key={edu.id} className="p-4 border rounded-md relative space-y-3">
                  <button
                    type="button"
                    onClick={() => removeEducation(edu.id)}
                    className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <div className="space-y-2">
                    <Label htmlFor={`school-${edu.id}`}>学校名</Label>
                    <Input
                      id={`school-${edu.id}`}
                      value={edu.school}
                      onChange={(e) => updateEducation(edu.id, "school", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`edu-period-${edu.id}`}>期間</Label>
                    <Input
                      id={`edu-period-${edu.id}`}
                      value={edu.period}
                      onChange={(e) => updateEducation(edu.id, "period", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`edu-description-${edu.id}`}>詳細</Label>
                    <Input
                      id={`edu-description-${edu.id}`}
                      value={edu.description}
                      onChange={(e) => updateEducation(edu.id, "description", e.target.value)}
                    />
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" className="w-full" onClick={addEducation}>
                <PlusCircle className="mr-2 h-4 w-4" /> 学歴を追加
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {profile.education.map((edu) => (
                <div key={edu.id} className="space-y-1">
                  <div className="flex justify-between">
                    <h3 className="font-semibold">{edu.school}</h3>
                    <span className="text-sm text-muted-foreground">{edu.period}</span>
                  </div>
                  <p className="text-muted-foreground">{edu.description}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* グランプリ履歴 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Trophy className="mr-2 h-5 w-5 text-muted-foreground" />
              <CardTitle>就活グランプリの履歴</CardTitle>
            </div>
            {averageScore !== null && (
              <Badge variant="outline" className="ml-2">
                平均スコア: {averageScore}/100
              </Badge>
            )}
          </div>
          <CardDescription>これまでに提出したお題とスコアを確認できます</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="hidden md:block">
            {" "}
            {/* デスクトップ表示 */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>月</TableHead>
                  <TableHead>お題</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>スコア</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grandPrixHistory.map((item) => (
                  <TableRow key={item.id} className={item.status === "未提出" ? "bg-muted/50" : ""}>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                        {item.month}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{item.title}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.status === "採点済" ? "success" : item.status === "提出済" ? "default" : "secondary"
                        }
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.score ? `${item.score}/100` : "-"}</TableCell>
                    <TableCell>
                      {item.status !== "未提出" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedAnswer(item)
                            setIsAnswerModalOpen(true)
                          }}
                        >
                          回答を表示
                        </Button>
                      )}
                      {item.status === "未提出" && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href="/grandprix">
                            挑戦する <ExternalLink className="ml-1 h-3 w-3" />
                          </a>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="md:hidden space-y-4">
            {" "}
            {/* モバイル表示 */}
            {grandPrixHistory.map((item) => (
              <div key={item.id} className={`p-4 border rounded-lg ${item.status === "未提出" ? "bg-muted/50" : ""}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center">
                    <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{item.month}</span>
                  </div>
                  <Badge
                    variant={item.status === "採点済" ? "success" : item.status === "提出済" ? "default" : "secondary"}
                  >
                    {item.status}
                  </Badge>
                </div>
                <p className="mb-2 line-clamp-2">{item.title}</p>
                <div className="flex justify-between items-center mt-3">
                  <div>
                    {item.score ? (
                      <span className="font-medium">スコア: {item.score}/100</span>
                    ) : (
                      <span className="text-muted-foreground">未採点</span>
                    )}
                  </div>
                  {item.status !== "未提出" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedAnswer(item)
                        setIsAnswerModalOpen(true)
                      }}
                    >
                      回答を表示
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" asChild>
                      <a href="/grandprix">
                        挑戦する <ExternalLink className="ml-1 h-3 w-3" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 回答表示モーダル */}
      <Dialog open={isAnswerModalOpen} onOpenChange={setIsAnswerModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">{selectedAnswer?.title}</DialogTitle>
            <DialogDescription className="flex items-center mt-2">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedAnswer?.month}
              <Badge
                variant={
                  selectedAnswer?.status === "採点済"
                    ? "success"
                    : selectedAnswer?.status === "提出済"
                      ? "default"
                      : "secondary"
                }
                className="ml-3"
              >
                {selectedAnswer?.status}
              </Badge>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <h4 className="text-sm font-medium mb-2">あなたの回答:</h4>
              <div className="bg-muted/50 p-4 rounded-md whitespace-pre-wrap text-sm">
                {selectedAnswer?.answer || "回答がありません"}
              </div>
            </div>

            {selectedAnswer?.status === "採点済" && (
              <>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">スコア:</h4>
                  <div className="text-xl font-bold">{selectedAnswer?.score}/100</div>
                </div>

                {selectedAnswer?.feedback && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">フィードバック:</h4>
                    <div className="bg-muted/30 p-4 rounded-md text-sm">{selectedAnswer.feedback}</div>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={() => setIsAnswerModalOpen(false)}>
                閉じる
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
