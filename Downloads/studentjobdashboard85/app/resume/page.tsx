"use client"

import { useState } from "react"
import { PlusCircle, Trash2, ChevronDown, ChevronUp, Save, User, Award, FileText, Briefcase } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function ResumePage() {
  const [workExperiences, setWorkExperiences] = useState([{ id: 1, isOpen: true }])
  const [saving, setSaving] = useState(false)

  const addWorkExperience = () => {
    const newId = workExperiences.length > 0 ? Math.max(...workExperiences.map((exp) => exp.id)) + 1 : 1
    setWorkExperiences([...workExperiences, { id: newId, isOpen: true }])
  }

  const removeWorkExperience = (id: number) => {
    setWorkExperiences(workExperiences.filter((exp) => exp.id !== id))
  }

  const toggleCollapsible = (id: number) => {
    setWorkExperiences(workExperiences.map((exp) => (exp.id === id ? { ...exp, isOpen: !exp.isOpen } : exp)))
  }

  const handleSave = () => {
    setSaving(true)
    // 保存処理をシミュレート
    setTimeout(() => {
      setSaving(false)
    }, 1000)
  }

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      <div className="mb-4 flex flex-col items-start justify-between gap-2 sm:mb-6 sm:flex-row sm:items-center sm:gap-4">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">職務経歴書</h1>
          <p className="text-xs text-gray-500 sm:text-sm">あなたのキャリアや学歴情報を入力してください</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="h-8 gap-1 text-xs sm:h-10 sm:gap-2 sm:text-sm">
          <Save size={14} className="sm:h-4 sm:w-4" />
          {saving ? "保存中..." : "保存する"}
        </Button>
      </div>

      {/* 職歴セクション - 最も目立つように最上部に配置 */}
      <Card className="mb-6 border-2 border-primary/20 bg-primary/5 sm:mb-8">
        <CardHeader className="bg-primary/10 p-3 sm:p-6">
          <CardTitle className="text-base text-primary sm:text-xl">職歴</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            アルバイトやインターンシップの経験を入力してください
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-3 sm:space-y-6 sm:p-6">
          {workExperiences.map((exp) => (
            <Collapsible key={exp.id} open={exp.isOpen} onOpenChange={() => toggleCollapsible(exp.id)}>
              <div className="rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium sm:text-base">職歴 #{exp.id}</h3>
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
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1 sm:space-y-2">
                      <Label htmlFor={`startDate-${exp.id}`} className="text-xs sm:text-sm">
                        開始年月
                      </Label>
                      <Input id={`startDate-${exp.id}`} type="month" className="h-8 text-xs sm:h-10 sm:text-sm" />
                    </div>
                    <div className="space-y-1 sm:space-y-2">
                      <Label htmlFor={`endDate-${exp.id}`} className="text-xs sm:text-sm">
                        終了年月
                      </Label>
                      <Input id={`endDate-${exp.id}`} type="month" className="h-8 text-xs sm:h-10 sm:text-sm" />
                    </div>
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox id={`current-${exp.id}`} className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <Label htmlFor={`current-${exp.id}`} className="text-xs sm:text-sm">
                        現在も在籍中
                      </Label>
                    </div>
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor={`jobDescription-${exp.id}`} className="text-xs sm:text-sm">
                      業務内容
                    </Label>
                    <Textarea
                      id={`jobDescription-${exp.id}`}
                      placeholder="担当した業務内容や成果について記入してください"
                      className="min-h-[100px] text-xs sm:min-h-[120px] sm:text-sm"
                    />
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor={`technologies-${exp.id}`} className="text-xs sm:text-sm">
                      使用技術・ツール
                    </Label>
                    <Input
                      id={`technologies-${exp.id}`}
                      placeholder="Java, Python, AWS, Figmaなど"
                      className="h-8 text-xs sm:h-10 sm:text-sm"
                    />
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor={`achievements-${exp.id}`} className="text-xs sm:text-sm">
                      成果・実績
                    </Label>
                    <Textarea
                      id={`achievements-${exp.id}`}
                      placeholder="具体的な成果や数値、評価されたポイントなどを記入してください"
                      className="min-h-[80px] text-xs sm:min-h-[100px] sm:text-sm"
                    />
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
          <Button variant="default" className="w-full gap-1 text-xs sm:gap-2 sm:text-sm" onClick={addWorkExperience}>
            <PlusCircle size={14} className="sm:h-4 sm:w-4" />
            職歴を追加
          </Button>
        </CardContent>
      </Card>

      {/* タブナビゲーション */}
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="mb-4 grid w-full grid-cols-4 sm:mb-6">
          <TabsTrigger value="basic" className="flex items-center gap-1 text-xs sm:gap-2 sm:text-sm">
            <User size={12} className="sm:h-4 sm:w-4" />
            基本情報
          </TabsTrigger>
          <TabsTrigger value="skills" className="flex items-center gap-1 text-xs sm:gap-2 sm:text-sm">
            <Award size={12} className="sm:h-4 sm:w-4" />
            資格・スキル
          </TabsTrigger>
          <TabsTrigger value="pr" className="flex items-center gap-1 text-xs sm:gap-2 sm:text-sm">
            <FileText size={12} className="sm:h-4 sm:w-4" />
            自己PR
          </TabsTrigger>
          <TabsTrigger value="conditions" className="flex items-center gap-1 text-xs sm:gap-2 sm:text-sm">
            <Briefcase size={12} className="sm:h-4 sm:w-4" />
            希望条件
          </TabsTrigger>
        </TabsList>

        {/* 基本情報タブ */}
        <TabsContent value="basic" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-base sm:text-lg">基本情報</CardTitle>
              <CardDescription className="text-xs sm:text-sm">あなたの基本的な情報を入力してください</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-3 sm:space-y-4 sm:p-6">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="lastName" className="text-xs sm:text-sm">
                    姓
                  </Label>
                  <Input id="lastName" placeholder="山田" className="h-8 text-xs sm:h-10 sm:text-sm" />
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="firstName" className="text-xs sm:text-sm">
                    名
                  </Label>
                  <Input id="firstName" placeholder="太郎" className="h-8 text-xs sm:h-10 sm:text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="lastNameKana" className="text-xs sm:text-sm">
                    姓（カナ）
                  </Label>
                  <Input id="lastNameKana" placeholder="ヤマダ" className="h-8 text-xs sm:h-10 sm:text-sm" />
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="firstNameKana" className="text-xs sm:text-sm">
                    名（カナ）
                  </Label>
                  <Input id="firstNameKana" placeholder="タロウ" className="h-8 text-xs sm:h-10 sm:text-sm" />
                </div>
              </div>
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="birthdate" className="text-xs sm:text-sm">
                  生年月日
                </Label>
                <Input id="birthdate" type="date" className="h-8 text-xs sm:h-10 sm:text-sm" />
              </div>
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="gender" className="text-xs sm:text-sm">
                  性別
                </Label>
                <RadioGroup defaultValue="male" className="flex space-x-4">
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
                />
              </div>
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="phone" className="text-xs sm:text-sm">
                  電話番号
                </Label>
                <Input id="phone" placeholder="090-1234-5678" className="h-8 text-xs sm:h-10 sm:text-sm" />
              </div>
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="address" className="text-xs sm:text-sm">
                  住所
                </Label>
                <Input id="address" placeholder="東京都渋谷区〇〇1-2-3" className="h-8 text-xs sm:h-10 sm:text-sm" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-base sm:text-lg">学歴</CardTitle>
              <CardDescription className="text-xs sm:text-sm">最終学歴から順に入力してください</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-3 sm:space-y-4 sm:p-6">
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="university" className="text-xs sm:text-sm">
                  大学名
                </Label>
                <Input id="university" placeholder="〇〇大学" className="h-8 text-xs sm:h-10 sm:text-sm" />
              </div>
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="faculty" className="text-xs sm:text-sm">
                  学部・学科
                </Label>
                <Input id="faculty" placeholder="〇〇学部△△学科" className="h-8 text-xs sm:h-10 sm:text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="admissionDate" className="text-xs sm:text-sm">
                    入学年月
                  </Label>
                  <Input id="admissionDate" type="month" className="h-8 text-xs sm:h-10 sm:text-sm" />
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="graduationDate" className="text-xs sm:text-sm">
                    卒業年月（予定）
                  </Label>
                  <Input id="graduationDate" type="month" className="h-8 text-xs sm:h-10 sm:text-sm" />
                </div>
              </div>
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="educationStatus" className="text-xs sm:text-sm">
                  状態
                </Label>
                <Select defaultValue="enrolled">
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
                <Label htmlFor="researchTheme" className="text-xs sm:text-sm">
                  研究テーマ（任意）
                </Label>
                <Textarea
                  id="researchTheme"
                  placeholder="卒業論文や研究のテーマがあれば記入してください"
                  className="min-h-[80px] text-xs sm:min-h-[100px] sm:text-sm"
                />
              </div>
            </CardContent>
            <CardFooter className="p-3 sm:p-6">
              <Button variant="outline" className="w-full text-xs sm:text-sm">
                このセクションを保存
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* 資格・スキルタブ */}
        <TabsContent value="skills" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-base sm:text-lg">資格・スキル</CardTitle>
              <CardDescription className="text-xs sm:text-sm">取得した資格やスキルを入力してください</CardDescription>
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
                />
              </div>
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="skills" className="text-xs sm:text-sm">
                  スキル
                </Label>
                <Textarea
                  id="skills"
                  placeholder="プログラミング言語、ツール、ソフトウェアなど"
                  className="min-h-[80px] text-xs sm:min-h-[100px] sm:text-sm"
                />
              </div>
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="languages" className="text-xs sm:text-sm">
                  語学力
                </Label>
                <Textarea
                  id="languages"
                  placeholder="英語（ビジネスレベル）、中国語（日常会話）など"
                  className="min-h-[60px] text-xs sm:min-h-[80px] sm:text-sm"
                />
              </div>
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="frameworks" className="text-xs sm:text-sm">
                  フレームワーク・ライブラリ
                </Label>
                <Textarea
                  id="frameworks"
                  placeholder="React, Next.js, Spring Boot, TensorFlow など"
                  className="min-h-[60px] text-xs sm:min-h-[80px] sm:text-sm"
                />
              </div>
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="tools" className="text-xs sm:text-sm">
                  ツール・開発環境
                </Label>
                <Textarea
                  id="tools"
                  placeholder="Git, Docker, AWS, Visual Studio Code など"
                  className="min-h-[60px] text-xs sm:min-h-[80px] sm:text-sm"
                />
              </div>
            </CardContent>
            <CardFooter className="p-3 sm:p-6">
              <Button variant="outline" className="w-full text-xs sm:text-sm">
                このセクションを保存
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* 自己PRタブ */}
        <TabsContent value="pr" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-base sm:text-lg">自己PR</CardTitle>
              <CardDescription className="text-xs sm:text-sm">あなたの強みや特徴をアピールしてください</CardDescription>
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
                />
              </div>
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="prContent" className="text-xs sm:text-sm">
                  内容
                </Label>
                <Textarea
                  id="prContent"
                  placeholder="あなたの強み、特徴、価値観などをアピールしてください"
                  className="min-h-[150px] text-xs sm:min-h-[200px] sm:text-sm"
                />
              </div>
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="strengths" className="text-xs sm:text-sm">
                  強み（3つまで）
                </Label>
                <div className="grid grid-cols-1 gap-2">
                  <Input placeholder="強み1（例：問題解決能力）" className="h-8 text-xs sm:h-10 sm:text-sm" />
                  <Input placeholder="強み2（例：コミュニケーション能力）" className="h-8 text-xs sm:h-10 sm:text-sm" />
                  <Input placeholder="強み3（例：チームワーク）" className="h-8 text-xs sm:h-10 sm:text-sm" />
                </div>
              </div>
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="motivation" className="text-xs sm:text-sm">
                  志望動機
                </Label>
                <Textarea
                  id="motivation"
                  placeholder="なぜこの業界・職種を志望するのか、理由を記入してください"
                  className="min-h-[120px] text-xs sm:min-h-[150px] sm:text-sm"
                />
              </div>
            </CardContent>
            <CardFooter className="p-3 sm:p-6">
              <Button variant="outline" className="w-full text-xs sm:text-sm">
                このセクションを保存
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* 希望条件タブ */}
        <TabsContent value="conditions" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-base sm:text-lg">希望条件</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                あなたの希望する就業条件を選択してください
              </CardDescription>
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
                      <Checkbox id={`industry-${industry}`} className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
                      <Checkbox id={`jobType-${jobType}`} className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
                      <Checkbox id={`location-${location}`} className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
                  <Select>
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
                  <Select>
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
                  ].map((workStyle) => (
                    <div key={workStyle} className="flex items-center space-x-1 sm:space-x-2">
                      <Checkbox id={`workStyle-${workStyle}`} className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <Label htmlFor={`workStyle-${workStyle}`} className="text-xs sm:text-sm">
                        {workStyle}
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
                />
              </div>
            </CardContent>
            <CardFooter className="p-3 sm:p-6">
              <Button variant="outline" className="w-full text-xs sm:text-sm">
                このセクションを保存
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-6 flex justify-end sm:mt-8">
        <Button className="gap-1 text-xs sm:gap-2 sm:text-sm">
          <Save size={14} className="sm:h-4 sm:w-4" />
          すべての変更を保存
        </Button>
      </div>
    </div>
  )
}
