"use client"

import { useState, useEffect } from "react"
import {
  PlusCircle,
  Trash2,
  ChevronDown,
  ChevronUp,
  Save,
  User,
  FileText,
  Briefcase,
  Check,
  AlertCircle,
  Info,
  Clock,
  Building,
  GraduationCap,
  Code,
  Star,
  Heart,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default function ResumePage() {
  const [workExperiences, setWorkExperiences] = useState([
    {
      id: 1,
      isOpen: true,
      company: "",
      position: "",
      startDate: "",
      endDate: "",
      isCurrent: false,
      description: "",
      technologies: "",
      achievements: "",
    },
  ])
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState("basic")
  const [completionPercentage, setCompletionPercentage] = useState(0)
  const [sectionCompletion, setSectionCompletion] = useState({
    basic: 0,
    education: 0,
    work: 0,
    skills: 0,
    pr: 0,
    conditions: 0,
  })

  // Mock data for form fields
  const [formData, setFormData] = useState({
    basic: {
      lastName: "",
      firstName: "",
      lastNameKana: "",
      firstNameKana: "",
      birthdate: "",
      gender: "male",
      email: "",
      phone: "",
      address: "",
    },
    education: {
      university: "",
      faculty: "",
      admissionDate: "",
      graduationDate: "",
      status: "enrolled",
      researchTheme: "",
    },
    skills: {
      certifications: "",
      skills: "",
      languages: "",
      frameworks: "",
      tools: "",
    },
    pr: {
      title: "",
      content: "",
      strengths: ["", "", ""],
      motivation: "",
    },
    conditions: {
      industries: [],
      jobTypes: [],
      locations: [],
      workStyle: "",
      salary: "",
      workPreferences: [],
      remarks: "",
    },
  })

  // Calculate completion percentage
  useEffect(() => {
    // Simple calculation for demo purposes
    const calculateSectionCompletion = (section, fields) => {
      const totalFields = Object.keys(fields).length
      const filledFields = Object.values(fields).filter(
        (value) => value !== "" && (Array.isArray(value) ? value.some((v) => v !== "") : true),
      ).length
      return Math.round((filledFields / totalFields) * 100)
    }

    const basic = calculateSectionCompletion("basic", formData.basic)
    const education = calculateSectionCompletion("education", formData.education)
    const work = workExperiences.length > 0 ? 50 : 0 // Simplified for demo
    const skills = calculateSectionCompletion("skills", formData.skills)
    const pr = calculateSectionCompletion("pr", formData.pr)
    const conditions = calculateSectionCompletion("conditions", formData.conditions)

    const newSectionCompletion = { basic, education, work, skills, pr, conditions }
    setSectionCompletion(newSectionCompletion)

    // Calculate overall completion
    const overall = Math.round((basic + education + work + skills + pr + conditions) / 6)
    setCompletionPercentage(overall)
  }, [formData, workExperiences])

  const addWorkExperience = () => {
    const newId = workExperiences.length > 0 ? Math.max(...workExperiences.map((exp) => exp.id)) + 1 : 1
    setWorkExperiences([
      ...workExperiences,
      {
        id: newId,
        isOpen: true,
        company: "",
        position: "",
        startDate: "",
        endDate: "",
        isCurrent: false,
        description: "",
        technologies: "",
        achievements: "",
      },
    ])
  }

  const removeWorkExperience = (id) => {
    setWorkExperiences(workExperiences.filter((exp) => exp.id !== id))
  }

  const toggleCollapsible = (id) => {
    setWorkExperiences(workExperiences.map((exp) => (exp.id === id ? { ...exp, isOpen: !exp.isOpen } : exp)))
  }

  const handleWorkExperienceChange = (id, field, value) => {
    setWorkExperiences(workExperiences.map((exp) => (exp.id === id ? { ...exp, [field]: value } : exp)))
  }

  const handleInputChange = (section, field, value) => {
    setFormData({
      ...formData,
      [section]: {
        ...formData[section],
        [field]: value,
      },
    })
  }

  const handleStrengthChange = (index, value) => {
    const newStrengths = [...formData.pr.strengths]
    newStrengths[index] = value
    handleInputChange("pr", "strengths", newStrengths)
  }

  const handleSave = () => {
    setSaving(true)
    // 保存処理をシミュレート
    setTimeout(() => {
      setSaving(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    }, 1000)
  }

  const getCompletionColor = (percentage) => {
    if (percentage < 30) return "bg-red-500"
    if (percentage < 70) return "bg-yellow-500"
    return "bg-green-500"
  }

  const getSectionStatusIcon = (percentage) => {
    if (percentage === 100) return <Check size={16} className="text-green-500" />
    if (percentage > 0) return <Clock size={16} className="text-yellow-500" />
    return <AlertCircle size={16} className="text-red-500" />
  }

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      {/* Header with progress tracker */}
      <div className="mb-6 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 p-4 shadow-sm sm:mb-8 sm:p-6">
        <div className="mb-4 flex flex-col items-start justify-between gap-2 sm:mb-6 sm:flex-row sm:items-center sm:gap-4">
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">職務経歴書</h1>
            <p className="text-xs text-gray-500 sm:text-sm">あなたのキャリアや学歴情報を入力してください</p>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="relative h-8 gap-1 text-xs sm:h-10 sm:gap-2 sm:text-sm"
            >
              {saving ? (
                <>
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent sm:h-4 sm:w-4"></div>
                  保存中...
                </>
              ) : (
                <>
                  <Save size={14} className="sm:h-4 sm:w-4" />
                  保存する
                </>
              )}

              {saveSuccess && (
                <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[10px] text-white">
                  <Check size={10} />
                </span>
              )}
            </Button>

            {saveSuccess && (
              <div className="animate-fade-in rounded-md bg-green-100 px-2 py-1 text-xs text-green-800">
                保存しました！
              </div>
            )}
          </div>
        </div>

        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium sm:text-base">プロフィール完成度</h3>
          <span className="text-sm font-semibold">{completionPercentage}%</span>
        </div>

        <Progress value={completionPercentage} className={`h-2 ${getCompletionColor(completionPercentage)}`} />

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
          {Object.entries(sectionCompletion).map(([section, percentage]) => {
            const sectionNames = {
              basic: "基本情報",
              education: "学歴",
              work: "職歴",
              skills: "スキル",
              pr: "自己PR",
              conditions: "希望条件",
            }

            return (
              <div
                key={section}
                className={`flex cursor-pointer items-center justify-between rounded-md border p-2 ${
                  activeTab === section ? "border-primary bg-primary/5" : "border-gray-200"
                }`}
                onClick={() => setActiveTab(section)}
              >
                <span className="text-xs">{sectionNames[section]}</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-medium">{percentage}%</span>
                        {getSectionStatusIcon(percentage)}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        {percentage === 100 ? "完了しています" : percentage > 0 ? "入力中です" : "未入力です"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )
          })}
        </div>
      </div>

      {/* 職歴セクション - 最も目立つように最上部に配置 */}
      <Card className="mb-6 border-2 border-primary/20 bg-primary/5 sm:mb-8">
        <CardHeader className="bg-primary/10 p-3 sm:p-6">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            <CardTitle className="text-base text-primary sm:text-xl">職歴</CardTitle>
          </div>
          <CardDescription className="text-xs sm:text-sm">
            アルバイトやインターンシップの経験を入力してください
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-3 sm:space-y-6 sm:p-6">
          {workExperiences.length === 0 ? (
            <Alert className="bg-amber-50">
              <Info className="h-4 w-4 text-amber-500" />
              <AlertTitle className="text-sm font-medium text-amber-800">職歴情報がありません</AlertTitle>
              <AlertDescription className="text-xs text-amber-700">
                アルバイトやインターンシップなど、これまでの経験を追加しましょう。
              </AlertDescription>
            </Alert>
          ) : (
            workExperiences.map((exp) => (
              <Collapsible key={exp.id} open={exp.isOpen} onOpenChange={() => toggleCollapsible(exp.id)}>
                <div className="rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-gray-500" />
                      <h3 className="text-sm font-medium sm:text-base">
                        {exp.company ? exp.company : `職歴 #${exp.id}`}
                        {exp.position && <span className="ml-2 text-xs text-gray-500">（{exp.position}）</span>}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 sm:h-8 sm:w-8">
                          {exp.isOpen ? (
                            <ChevronUp size={14} className="sm:h-4 sm:w-4" />
                          ) : (
                            <ChevronDown size={14} className="sm:h-4 sm:w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      {workExperiences.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-600 sm:h-8 sm:w-8"
                          onClick={() => removeWorkExperience(exp.id)}
                        >
                          <Trash2 size={14} className="sm:h-4 sm:w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <CollapsibleContent className="mt-3 space-y-3 sm:mt-4 sm:space-y-4">
                    <div className="space-y-1 sm:space-y-2">
                      <Label htmlFor={`company-${exp.id}`} className="text-xs sm:text-sm">
                        企業・組織名
                      </Label>
                      <Input
                        id={`company-${exp.id}`}
                        placeholder="〇〇株式会社"
                        className="h-8 text-xs sm:h-10 sm:text-sm"
                        value={exp.company}
                        onChange={(e) => handleWorkExperienceChange(exp.id, "company", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1 sm:space-y-2">
                      <Label htmlFor={`position-${exp.id}`} className="text-xs sm:text-sm">
                        役職・ポジション
                      </Label>
                      <Input
                        id={`position-${exp.id}`}
                        placeholder="インターン、アルバイトなど"
                        className="h-8 text-xs sm:h-10 sm:text-sm"
                        value={exp.position}
                        onChange={(e) => handleWorkExperienceChange(exp.id, "position", e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-1 sm:space-y-2">
                        <Label htmlFor={`startDate-${exp.id}`} className="text-xs sm:text-sm">
                          開始年月
                        </Label>
                        <Input
                          id={`startDate-${exp.id}`}
                          type="month"
                          className="h-8 text-xs sm:h-10 sm:text-sm"
                          value={exp.startDate}
                          onChange={(e) => handleWorkExperienceChange(exp.id, "startDate", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1 sm:space-y-2">
                        <Label htmlFor={`endDate-${exp.id}`} className="text-xs sm:text-sm">
                          終了年月
                        </Label>
                        <Input
                          id={`endDate-${exp.id}`}
                          type="month"
                          className="h-8 text-xs sm:h-10 sm:text-sm"
                          value={exp.endDate}
                          onChange={(e) => handleWorkExperienceChange(exp.id, "endDate", e.target.value)}
                          disabled={exp.isCurrent}
                        />
                      </div>
                    </div>
                    <div className="space-y-1 sm:space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`current-${exp.id}`}
                          className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                          checked={exp.isCurrent}
                          onCheckedChange={(checked) => handleWorkExperienceChange(exp.id, "isCurrent", checked)}
                        />
                        <Label htmlFor={`current-${exp.id}`} className="text-xs sm:text-sm">
                          現在も在籍中
                        </Label>
                      </div>
                    </div>
                    <div className="space-y-1 sm:space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`jobDescription-${exp.id}`} className="text-xs sm:text-sm">
                          業務内容
                        </Label>
                        <span className="text-xs text-gray-500">{exp.description.length}/500文字</span>
                      </div>
                      <Textarea
                        id={`jobDescription-${exp.id}`}
                        placeholder="担当した業務内容や成果について記入してください"
                        className="min-h-[100px] text-xs sm:min-h-[120px] sm:text-sm"
                        value={exp.description}
                        onChange={(e) => handleWorkExperienceChange(exp.id, "description", e.target.value)}
                        maxLength={500}
                      />
                      <p className="text-xs italic text-gray-500">
                        例:
                        「Webアプリケーションの開発チームに参加し、フロントエンド実装を担当。React.jsを用いたUI開発を行い、チームの納期目標を達成した。」
                      </p>
                    </div>
                    <div className="space-y-1 sm:space-y-2">
                      <Label htmlFor={`technologies-${exp.id}`} className="text-xs sm:text-sm">
                        使用技術・ツール
                      </Label>
                      <Input
                        id={`technologies-${exp.id}`}
                        placeholder="Java, Python, AWS, Figmaなど"
                        className="h-8 text-xs sm:h-10 sm:text-sm"
                        value={exp.technologies}
                        onChange={(e) => handleWorkExperienceChange(exp.id, "technologies", e.target.value)}
                      />
                      {exp.technologies && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {exp.technologies.split(",").map((tech, i) => (
                            <Badge key={i} variant="outline" className="bg-blue-50 text-xs">
                              {tech.trim()}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 sm:space-y-2">
                      <Label htmlFor={`achievements-${exp.id}`} className="text-xs sm:text-sm">
                        成果・実績
                      </Label>
                      <Textarea
                        id={`achievements-${exp.id}`}
                        placeholder="具体的な成果や数値、評価されたポイントなどを記入してください"
                        className="min-h-[80px] text-xs sm:min-h-[100px] sm:text-sm"
                        value={exp.achievements}
                        onChange={(e) => handleWorkExperienceChange(exp.id, "achievements", e.target.value)}
                      />
                      <p className="text-xs italic text-gray-500">
                        例: 「顧客満足度調査で平均4.8/5.0の評価を獲得。前年比20%の売上向上に貢献した。」
                      </p>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))
          )}
          <Button
            variant="outline"
            className="w-full gap-1 border-dashed text-xs sm:gap-2 sm:text-sm"
            onClick={addWorkExperience}
          >
            <PlusCircle size={14} className="sm:h-4 sm:w-4" />
            職歴を追加
          </Button>
        </CardContent>
      </Card>

      {/* タブナビゲーション */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4 grid w-full grid-cols-5 sm:mb-6">
          <TabsTrigger value="basic" className="flex items-center gap-1 text-xs sm:gap-2 sm:text-sm">
            <User size={12} className="sm:h-4 sm:w-4" />
            基本情報
          </TabsTrigger>
          <TabsTrigger value="education" className="flex items-center gap-1 text-xs sm:gap-2 sm:text-sm">
            <GraduationCap size={12} className="sm:h-4 sm:w-4" />
            学歴
          </TabsTrigger>
          <TabsTrigger value="skills" className="flex items-center gap-1 text-xs sm:gap-2 sm:text-sm">
            <Code size={12} className="sm:h-4 sm:w-4" />
            スキル
          </TabsTrigger>
          <TabsTrigger value="pr" className="flex items-center gap-1 text-xs sm:gap-2 sm:text-sm">
            <FileText size={12} className="sm:h-4 sm:w-4" />
            自己PR
          </TabsTrigger>
          <TabsTrigger value="conditions" className="flex items-center gap-1 text-xs sm:gap-2 sm:text-sm">
            <Heart size={12} className="sm:h-4 sm:w-4" />
            希望条件
          </TabsTrigger>
        </TabsList>

        {/* 基本情報タブ */}
        <TabsContent value="basic" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 p-3 sm:p-6">
              <User className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base sm:text-lg">基本情報</CardTitle>
                <CardDescription className="text-xs sm:text-sm">あなたの基本的な情報を入力してください</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-3 sm:space-y-4 sm:p-6">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="lastName" className="text-xs sm:text-sm">
                    姓
                  </Label>
                  <Input
                    id="lastName"
                    placeholder="山田"
                    className="h-8 text-xs sm:h-10 sm:text-sm"
                    value={formData.basic.lastName}
                    onChange={(e) => handleInputChange("basic", "lastName", e.target.value)}
                  />
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="firstName" className="text-xs sm:text-sm">
                    名
                  </Label>
                  <Input
                    id="firstName"
                    placeholder="太郎"
                    className="h-8 text-xs sm:h-10 sm:text-sm"
                    value={formData.basic.firstName}
                    onChange={(e) => handleInputChange("basic", "firstName", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="lastNameKana" className="text-xs sm:text-sm">
                    姓（カナ）
                  </Label>
                  <Input
                    id="lastNameKana"
                    placeholder="ヤマダ"
                    className="h-8 text-xs sm:h-10 sm:text-sm"
                    value={formData.basic.lastNameKana}
                    onChange={(e) => handleInputChange("basic", "lastNameKana", e.target.value)}
                  />
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="firstNameKana" className="text-xs sm:text-sm">
                    名（カナ）
                  </Label>
                  <Input
                    id="firstNameKana"
                    placeholder="タロウ"
                    className="h-8 text-xs sm:h-10 sm:text-sm"
                    value={formData.basic.firstNameKana}
                    onChange={(e) => handleInputChange("basic", "firstNameKana", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="birthdate" className="text-xs sm:text-sm">
                  生年月日
                </Label>
                <Input
                  id="birthdate"
                  type="date"
                  className="h-8 text-xs sm:h-10 sm:text-sm"
                  value={formData.basic.birthdate}
                  onChange={(e) => handleInputChange("basic", "birthdate", e.target.value)}
                />
              </div>
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="gender" className="text-xs sm:text-sm">
                  性別
                </Label>
                <RadioGroup
                  defaultValue="male"
                  className="flex space-x-4"
                  value={formData.basic.gender}
                  onValueChange={(value) => handleInputChange("basic", "gender", value)}
                >
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <RadioGroupItem value="male" id="male" className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <Label htmlFor="male" className="text-xs sm:text-sm">
                      男性
                    </Label>
                  </div>
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <RadioGroupItem value="female" id="female" className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <Label htmlFor="female" className="text-xs sm:text-sm">
                      女性
                    </Label>
                  </div>
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <RadioGroupItem value="other" id="other" className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <Label htmlFor="other" className="text-xs sm:text-sm">
                      その他
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="email" className="text-xs sm:text-sm">
                  メールアドレス
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@university.ac.jp"
                  className="h-8 text-xs sm:h-10 sm:text-sm"
                  value={formData.basic.email}
                  onChange={(e) => handleInputChange("basic", "email", e.target.value)}
                />
              </div>
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="phone" className="text-xs sm:text-sm">
                  電話番号
                </Label>
                <Input
                  id="phone"
                  placeholder="090-1234-5678"
                  className="h-8 text-xs sm:h-10 sm:text-sm"
                  value={formData.basic.phone}
                  onChange={(e) => handleInputChange("basic", "phone", e.target.value)}
                />
              </div>
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="address" className="text-xs sm:text-sm">
                  住所
                </Label>
                <Input
                  id="address"
                  placeholder="東京都渋谷区〇〇1-2-3"
                  className="h-8 text-xs sm:h-10 sm:text-sm"
                  value={formData.basic.address}
                  onChange={(e) => handleInputChange("basic", "address", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 学歴タブ */}
        <TabsContent value="education" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 p-3 sm:p-6">
              <GraduationCap className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base sm:text-lg">学歴</CardTitle>
                <CardDescription className="text-xs sm:text-sm">最終学歴から順に入力してください</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-3 sm:space-y-4 sm:p-6">
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="university" className="text-xs sm:text-sm">
                  大学名
                </Label>
                <Input
                  id="university"
                  placeholder="〇〇大学"
                  className="h-8 text-xs sm:h-10 sm:text-sm"
                  value={formData.education.university}
                  onChange={(e) => handleInputChange("education", "university", e.target.value)}
                />
              </div>
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="faculty" className="text-xs sm:text-sm">
                  学部・学科
                </Label>
                <Input
                  id="faculty"
                  placeholder="〇〇学部△△学科"
                  className="h-8 text-xs sm:h-10 sm:text-sm"
                  value={formData.education.faculty}
                  onChange={(e) => handleInputChange("education", "faculty", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="admissionDate" className="text-xs sm:text-sm">
                    入学年月
                  </Label>
                  <Input
                    id="admissionDate"
                    type="month"
                    className="h-8 text-xs sm:h-10 sm:text-sm"
                    value={formData.education.admissionDate}
                    onChange={(e) => handleInputChange("education", "admissionDate", e.target.value)}
                  />
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="graduationDate" className="text-xs sm:text-sm">
                    卒業年月（予定）
                  </Label>
                  <Input
                    id="graduationDate"
                    type="month"
                    className="h-8 text-xs sm:h-10 sm:text-sm"
                    value={formData.education.graduationDate}
                    onChange={(e) => handleInputChange("education", "graduationDate", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="educationStatus" className="text-xs sm:text-sm">
                  状態
                </Label>
                <Select
                  value={formData.education.status}
                  onValueChange={(value) => handleInputChange("education", "status", value)}
                >
                  <SelectTrigger className="h-8 text-xs sm:h-10 sm:text-sm">
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enrolled">在学中</SelectItem>
                    <SelectItem value="graduated">卒業</SelectItem>
                    <SelectItem value="expected">卒業見込み</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 sm:space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="researchTheme" className="text-xs sm:text-sm">
                    研究テーマ（任意）
                  </Label>
                  <span className="text-xs text-gray-500">{formData.education.researchTheme.length}/300文字</span>
                </div>
                <Textarea
                  id="researchTheme"
                  placeholder="卒業論文や研究のテーマがあれば記入してください"
                  className="min-h-[80px] text-xs sm:min-h-[100px] sm:text-sm"
                  value={formData.education.researchTheme}
                  onChange={(e) => handleInputChange("education", "researchTheme", e.target.value)}
                  maxLength={300}
                />
                <p className="text-xs italic text-gray-500">
                  例:
                  「機械学習を用いた自然言語処理の研究。特に感情分析アルゴリズムの精度向上について取り組んでいます。」
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 資格・スキルタブ */}
        <TabsContent value="skills" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 p-3 sm:p-6">
              <Code className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base sm:text-lg">資格・スキル</CardTitle>
                <CardDescription className="text-xs sm:text-sm">取得した資格やスキルを入力してください</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-3 sm:space-y-4 sm:p-6">
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="certifications" className="text-xs sm:text-sm">
                  資格
                </Label>
                <Textarea
                  id="certifications"
                  placeholder="TOEIC 800点、基本情報技術者試験、など"
                  className="min-h-[80px] text-xs sm:min-h-[100px] sm:text-sm"
                  value={formData.skills.certifications}
                  onChange={(e) => handleInputChange("skills", "certifications", e.target.value)}
                />
                <p className="text-xs italic text-gray-500">
                  例: 「TOEIC 800点（2023年6月取得）、基本情報技術者試験（2022年10月合格）」
                </p>
              </div>
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="skills" className="text-xs sm:text-sm">
                  スキル
                </Label>
                <Textarea
                  id="skills"
                  placeholder="プログラミング言語、ツール、ソフトウェアなど"
                  className="min-h-[80px] text-xs sm:min-h-[100px] sm:text-sm"
                  value={formData.skills.skills}
                  onChange={(e) => handleInputChange("skills", "skills", e.target.value)}
                />
                {formData.skills.skills && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {formData.skills.skills.split(",").map((skill, i) => (
                      <Badge key={i} variant="outline" className="bg-blue-50 text-xs">
                        {skill.trim()}
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="text-xs italic text-gray-500">例: 「Java, Python, JavaScript, HTML/CSS, SQL」</p>
              </div>
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="languages" className="text-xs sm:text-sm">
                  語学力
                </Label>
                <Textarea
                  id="languages"
                  placeholder="英語（ビジネスレベル）、中国語（日常会話）など"
                  className="min-h-[60px] text-xs sm:min-h-[80px] sm:text-sm"
                  value={formData.skills.languages}
                  onChange={(e) => handleInputChange("skills", "languages", e.target.value)}
                />
                <p className="text-xs italic text-gray-500">
                  例: 「英語（ビジネスレベル、TOEIC 800点）、中国語（日常会話レベル）」
                </p>
              </div>
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="frameworks" className="text-xs sm:text-sm">
                  フレームワーク・ライブラリ
                </Label>
                <Textarea
                  id="frameworks"
                  placeholder="React, Next.js, Spring Boot, TensorFlow など"
                  className="min-h-[60px] text-xs sm:min-h-[80px] sm:text-sm"
                  value={formData.skills.frameworks}
                  onChange={(e) => handleInputChange("skills", "frameworks", e.target.value)}
                />
                {formData.skills.frameworks && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {formData.skills.frameworks.split(",").map((framework, i) => (
                      <Badge key={i} variant="outline" className="bg-green-50 text-xs">
                        {framework.trim()}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="tools" className="text-xs sm:text-sm">
                  ツール・開発環境
                </Label>
                <Textarea
                  id="tools"
                  placeholder="Git, Docker, AWS, Visual Studio Code など"
                  className="min-h-[60px] text-xs sm:min-h-[80px] sm:text-sm"
                  value={formData.skills.tools}
                  onChange={(e) => handleInputChange("skills", "tools", e.target.value)}
                />
                {formData.skills.tools && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {formData.skills.tools.split(",").map((tool, i) => (
                      <Badge key={i} variant="outline" className="bg-purple-50 text-xs">
                        {tool.trim()}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 自己PRタブ */}
        <TabsContent value="pr" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 p-3 sm:p-6">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base sm:text-lg">自己PR</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  あなたの強みや特徴をアピールしてください
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-3 sm:space-y-4 sm:p-6">
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="prTitle" className="text-xs sm:text-sm">
                  タイトル
                </Label>
                <Input
                  id="prTitle"
                  placeholder="例：主体性を持って行動できる人材です"
                  className="h-8 text-xs sm:h-10 sm:text-sm"
                  value={formData.pr.title}
                  onChange={(e) => handleInputChange("pr", "title", e.target.value)}
                />
                <p className="text-xs italic text-gray-500">例: 「課題解決に情熱を持って取り組める人材です」</p>
              </div>
              <div className="space-y-1 sm:space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="prContent" className="text-xs sm:text-sm">
                    内容
                  </Label>
                  <span className="text-xs text-gray-500">{formData.pr.content.length}/800文字</span>
                </div>
                <Textarea
                  id="prContent"
                  placeholder="あなたの強み、特徴、価値観などをアピールしてください"
                  className="min-h-[150px] text-xs sm:min-h-[200px] sm:text-sm"
                  value={formData.pr.content}
                  onChange={(e) => handleInputChange("pr", "content", e.target.value)}
                  maxLength={800}
                />
                <Alert className="bg-blue-50">
                  <Info className="h-4 w-4 text-blue-500" />
                  <AlertTitle className="text-sm font-medium text-blue-800">自己PRのポイント</AlertTitle>
                  <AlertDescription className="text-xs text-blue-700">
                    <ul className="list-disc pl-4 space-y-1">
                      <li>具体的なエピソードを交えて説明しましょう</li>
                      <li>数字や成果を用いて客観的に伝えましょう</li>
                      <li>企業が求める人材像に合わせたアピールを心がけましょう</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </div>
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="strengths" className="text-xs sm:text-sm">
                  強み（3つまで）
                </Label>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <Input
                      placeholder="強み1（例：問題解決能力）"
                      className="h-8 text-xs sm:h-10 sm:text-sm"
                      value={formData.pr.strengths[0]}
                      onChange={(e) => handleStrengthChange(0, e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <Input
                      placeholder="強み2（例：コミュニケーション能力）"
                      className="h-8 text-xs sm:h-10 sm:text-sm"
                      value={formData.pr.strengths[1]}
                      onChange={(e) => handleStrengthChange(1, e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <Input
                      placeholder="強み3（例：チームワーク）"
                      className="h-8 text-xs sm:h-10 sm:text-sm"
                      value={formData.pr.strengths[2]}
                      onChange={(e) => handleStrengthChange(2, e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-1 sm:space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="motivation" className="text-xs sm:text-sm">
                    志望動機
                  </Label>
                  <span className="text-xs text-gray-500">{formData.pr.motivation.length}/500文字</span>
                </div>
                <Textarea
                  id="motivation"
                  placeholder="なぜこの業界・職種を志望するのか、理由を記入してください"
                  className="min-h-[120px] text-xs sm:min-h-[150px] sm:text-sm"
                  value={formData.pr.motivation}
                  onChange={(e) => handleInputChange("pr", "motivation", e.target.value)}
                  maxLength={500}
                />
                <p className="text-xs italic text-gray-500">
                  例: 「大学での研究を通じて、AIの可能性に魅了され、その技術で社会課題を解決したいと考えています。」
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 希望条件タブ */}
        <TabsContent value="conditions" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 p-3 sm:p-6">
              <Heart className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base sm:text-lg">希望条件</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  あなたの希望する就業条件を選択してください
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-3 sm:space-y-6 sm:p-6">
              <div className="space-y-1 sm:space-y-2">
                <Label className="text-xs sm:text-sm">希望業界</Label>
                <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 sm:gap-2">
                  {[
                    "IT・通信",
                    "メーカー",
                    "商社",
                    "金融",
                    "コンサルティング",
                    "マスコミ",
                    "広告・マーケティング",
                    "サービス",
                    "小売・流通",
                    "医療・福祉",
                    "教育",
                    "公務員",
                  ].map((industry) => (
                    <div key={industry} className="flex items-center space-x-1 sm:space-x-2">
                      <Checkbox
                        id={`industry-${industry}`}
                        className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                        checked={formData.conditions.industries.includes(industry)}
                        onCheckedChange={(checked) => {
                          const newIndustries = checked
                            ? [...formData.conditions.industries, industry]
                            : formData.conditions.industries.filter((i) => i !== industry)
                          handleInputChange("conditions", "industries", newIndustries)
                        }}
                      />
                      <Label htmlFor={`industry-${industry}`} className="text-xs sm:text-sm">
                        {industry}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-1 sm:space-y-2">
                <Label className="text-xs sm:text-sm">希望職種</Label>
                <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 sm:gap-2">
                  {[
                    "エンジニア",
                    "営業",
                    "企画・マーケティング",
                    "コンサルタント",
                    "研究・開発",
                    "デザイナー",
                    "総務・人事",
                    "経理・財務",
                    "生産管理",
                    "品質管理",
                    "物流",
                    "販売・サービス",
                  ].map((jobType) => (
                    <div key={jobType} className="flex items-center space-x-1 sm:space-x-2">
                      <Checkbox
                        id={`jobType-${jobType}`}
                        className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                        checked={formData.conditions.jobTypes.includes(jobType)}
                        onCheckedChange={(checked) => {
                          const newJobTypes = checked
                            ? [...formData.conditions.jobTypes, jobType]
                            : formData.conditions.jobTypes.filter((j) => j !== jobType)
                          handleInputChange("conditions", "jobTypes", newJobTypes)
                        }}
                      />
                      <Label htmlFor={`jobType-${jobType}`} className="text-xs sm:text-sm">
                        {jobType}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-1 sm:space-y-2">
                <Label className="text-xs sm:text-sm">希望勤務地</Label>
                <div className="grid grid-cols-2 gap-1 sm:grid-cols-4 sm:gap-2">
                  {[
                    "東京",
                    "神奈川",
                    "千葉",
                    "埼玉",
                    "大阪",
                    "京都",
                    "兵庫",
                    "奈良",
                    "愛知",
                    "福岡",
                    "北海道",
                    "宮城",
                    "広島",
                    "沖縄",
                    "海外",
                    "リモート可",
                  ].map((location) => (
                    <div key={location} className="flex items-center space-x-1 sm:space-x-2">
                      <Checkbox
                        id={`location-${location}`}
                        className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                        checked={formData.conditions.locations.includes(location)}
                        onCheckedChange={(checked) => {
                          const newLocations = checked
                            ? [...formData.conditions.locations, location]
                            : formData.conditions.locations.filter((l) => l !== location)
                          handleInputChange("conditions", "locations", newLocations)
                        }}
                      />
                      <Label htmlFor={`location-${location}`} className="text-xs sm:text-sm">
                        {location}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="workStyle" className="text-xs sm:text-sm">
                    希望勤務形態
                  </Label>
                  <Select
                    value={formData.conditions.workStyle}
                    onValueChange={(value) => handleInputChange("conditions", "workStyle", value)}
                  >
                    <SelectTrigger className="h-8 text-xs sm:h-10 sm:text-sm">
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fulltime">正社員</SelectItem>
                      <SelectItem value="contract">契約社員</SelectItem>
                      <SelectItem value="parttime">アルバイト・パート</SelectItem>
                      <SelectItem value="intern">インターン</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="salary" className="text-xs sm:text-sm">
                    希望年収
                  </Label>
                  <Select
                    value={formData.conditions.salary}
                    onValueChange={(value) => handleInputChange("conditions", "salary", value)}
                  >
                    <SelectTrigger className="h-8 text-xs sm:h-10 sm:text-sm">
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="300">300万円未満</SelectItem>
                      <SelectItem value="300-400">300万円〜400万円</SelectItem>
                      <SelectItem value="400-500">400万円〜500万円</SelectItem>
                      <SelectItem value="500-600">500万円〜600万円</SelectItem>
                      <SelectItem value="600-700">600万円〜700万円</SelectItem>
                      <SelectItem value="700-800">700万円〜800万円</SelectItem>
                      <SelectItem value="800-">800万円以上</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1 sm:space-y-2">
                <Label className="text-xs sm:text-sm">働き方の希望</Label>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 sm:gap-2">
                  {[
                    "フレックスタイム制",
                    "リモートワーク可",
                    "副業可",
                    "残業少なめ",
                    "土日祝休み",
                    "有給取得しやすい",
                    "育児支援制度あり",
                    "研修制度充実",
                  ].map((workPreference) => (
                    <div key={workPreference} className="flex items-center space-x-1 sm:space-x-2">
                      <Checkbox
                        id={`workPreference-${workPreference}`}
                        className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                        checked={formData.conditions.workPreferences.includes(workPreference)}
                        onCheckedChange={(checked) => {
                          const newPreferences = checked
                            ? [...formData.conditions.workPreferences, workPreference]
                            : formData.conditions.workPreferences.filter((p) => p !== workPreference)
                          handleInputChange("conditions", "workPreferences", newPreferences)
                        }}
                      />
                      <Label htmlFor={`workPreference-${workPreference}`} className="text-xs sm:text-sm">
                        {workPreference}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="remarks" className="text-xs sm:text-sm">
                  備考・その他希望条件
                </Label>
                <Textarea
                  id="remarks"
                  placeholder="その他の希望条件があれば記入してください"
                  className="min-h-[80px] text-xs sm:min-h-[100px] sm:text-sm"
                  value={formData.conditions.remarks}
                  onChange={(e) => handleInputChange("conditions", "remarks", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Sticky save button */}
      <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-gray-200 bg-white p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Progress
              value={completionPercentage}
              className={`h-2 w-24 sm:w-32 ${getCompletionColor(completionPercentage)}`}
            />
            <span className="text-xs font-medium sm:text-sm">{completionPercentage}% 完了</span>
          </div>
          <Button onClick={handleSave} disabled={saving} className="h-8 gap-1 text-xs sm:h-10 sm:gap-2 sm:text-sm">
            {saving ? (
              <>
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent sm:h-4 sm:w-4"></div>
                保存中...
              </>
            ) : (
              <>
                <Save size={14} className="sm:h-4 sm:w-4" />
                すべての変更を保存
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Spacer to prevent content from being hidden behind the sticky save button */}
      <div className="h-16"></div>
    </div>
  )
}
