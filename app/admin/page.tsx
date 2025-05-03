"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Users,
  Building2,
  Briefcase,
  Bell,
  BarChart3,
  ChevronDown,
  Eye,
  Ban,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Download,
  Calendar,
  UserPlus,
  PlusIcon as BuildingPlus,
  RefreshCcw,
  Settings,
  ChevronUp,
  LineChart,
  TrendingUp,
  TrendingDown,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { format, subDays } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { UserCog, UserX } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"

// Mock data
const mockStudents = [
  { id: 1, name: "田中 太郎", university: "東京大学", registrationDate: "2023-04-01", status: "アクティブ" },
  { id: 2, name: "佐藤 花子", university: "慶應義塾大学", registrationDate: "2023-04-05", status: "アクティブ" },
  { id: 3, name: "鈴木 一郎", university: "早稲田大学", registrationDate: "2023-04-10", status: "アクティブ" },
  { id: 4, name: "高橋 次郎", university: "京都大学", registrationDate: "2023-04-15", status: "凍結中" },
  { id: 5, name: "伊藤 三郎", university: "大阪大学", registrationDate: "2023-04-20", status: "アクティブ" },
  { id: 6, name: "渡辺 四郎", university: "名古屋大学", registrationDate: "2023-04-25", status: "アクティブ" },
  { id: 7, name: "山本 五郎", university: "九州大学", registrationDate: "2023-04-30", status: "アクティブ" },
  { id: 8, name: "中村 六郎", university: "北海道大学", registrationDate: "2023-05-01", status: "凍結中" },
]

const mockCompanies = [
  { id: 1, name: "テクノロジー株式会社", jobCount: 5, registrationDate: "2023-03-01", status: "承認済み" },
  { id: 2, name: "グローバル商事", jobCount: 3, registrationDate: "2023-03-05", status: "承認済み" },
  { id: 3, name: "未来コンサルティング", jobCount: 7, registrationDate: "2023-03-10", status: "承認済み" },
  { id: 4, name: "デジタルソリューションズ", jobCount: 2, registrationDate: "2023-03-15", status: "停止中" },
  { id: 5, name: "イノベーション産業", jobCount: 4, registrationDate: "2023-03-20", status: "承認済み" },
  { id: 6, name: "クリエイティブデザイン", jobCount: 1, registrationDate: "2023-03-25", status: "承認済み" },
  { id: 7, name: "フューチャーテック", jobCount: 6, registrationDate: "2023-03-30", status: "承認済み" },
  { id: 8, name: "スマートシステムズ", jobCount: 3, registrationDate: "2023-04-01", status: "停止中" },
]

const mockJobs = [
  { id: 1, title: "ソフトウェアエンジニア", company: "テクノロジー株式会社", status: "公開中", deadline: "2023-06-30" },
  { id: 2, title: "マーケティングスペシャリスト", company: "グローバル商事", status: "公開中", deadline: "2023-07-15" },
  { id: 3, title: "データアナリスト", company: "未来コンサルティング", status: "公開中", deadline: "2023-07-30" },
  { id: 4, title: "UXデザイナー", company: "デジタルソリューションズ", status: "下書き", deadline: "2023-08-15" },
  { id: 5, title: "プロジェクトマネージャー", company: "イノベーション産業", status: "公開中", deadline: "2023-08-30" },
  {
    id: 6,
    title: "グラフィックデザイナー",
    company: "クリエイティブデザイン",
    status: "公開中",
    deadline: "2023-09-15",
  },
  { id: 7, title: "AIエンジニア", company: "フューチャーテック", status: "下書き", deadline: "2023-09-30" },
  { id: 8, title: "セールスマネージャー", company: "スマートシステムズ", status: "公開中", deadline: "2023-10-15" },
]

const mockRequests = [
  {
    id: 1,
    type: "スカウト承認",
    company: "テクノロジー株式会社",
    student: "田中 太郎",
    date: "2023-05-01",
    status: "未対応",
  },
  { id: 2, type: "問い合わせ", company: "グローバル商事", student: "-", date: "2023-05-02", status: "未対応" },
  { id: 3, type: "企業登録申請", company: "新規企業A", student: "-", date: "2023-05-03", status: "未対応" },
  {
    id: 4,
    type: "スカウト承認",
    company: "未来コンサルティング",
    student: "佐藤 花子",
    date: "2023-05-04",
    status: "未対応",
  },
  { id: 5, type: "問い合わせ", company: "-", student: "鈴木 一郎", date: "2023-05-05", status: "未対応" },
]

const monthlyData = [
  { month: "1月", students: 120, companies: 25, applications: 350, scouts: 180 },
  { month: "2月", students: 135, companies: 28, applications: 380, scouts: 200 },
  { month: "3月", students: 150, companies: 30, applications: 420, scouts: 220 },
  { month: "4月", students: 180, companies: 35, applications: 480, scouts: 250 },
  { month: "5月", students: 210, companies: 40, applications: 520, scouts: 280 },
  { month: "6月", students: 230, companies: 42, applications: 550, scouts: 300 },
]

const mockActivityLogs = [
  {
    id: 1,
    timestamp: "2025-05-03 14:32:45",
    actor: "田中 太郎",
    role: "student",
    action: "プロフィール更新",
    target: "自己PR",
    ipAddress: "192.168.1.1",
  },
  {
    id: 2,
    timestamp: "2025-05-03 13:15:22",
    actor: "テクノロジー株式会社",
    role: "company",
    action: "求人作成",
    target: "ソフトウェアエンジニア",
    ipAddress: "192.168.1.2",
  },
  {
    id: 3,
    timestamp: "2025-05-03 12:05:17",
    actor: "管理者",
    role: "admin",
    action: "アカウント凍結",
    target: "高橋 次郎",
    ipAddress: "192.168.1.3",
  },
  {
    id: 4,
    timestamp: "2025-05-03 11:45:33",
    actor: "佐藤 花子",
    role: "student",
    action: "応募",
    target: "マーケティングスペシャリスト @ グローバル商事",
    ipAddress: "192.168.1.4",
  },
  {
    id: 5,
    timestamp: "2025-05-03 10:22:18",
    actor: "グローバル商事",
    role: "company",
    action: "スカウト送信",
    target: "鈴木 一郎",
    ipAddress: "192.168.1.5",
  },
  {
    id: 6,
    timestamp: "2025-05-03 09:17:42",
    actor: "管理者",
    role: "admin",
    action: "企業承認",
    target: "新規企業A",
    ipAddress: "192.168.1.6",
  },
  {
    id: 7,
    timestamp: "2025-05-02 17:32:11",
    actor: "鈴木 一郎",
    role: "student",
    action: "ログイン",
    target: "-",
    ipAddress: "192.168.1.7",
  },
  {
    id: 8,
    timestamp: "2025-05-02 16:45:29",
    actor: "未来コンサルティング",
    role: "company",
    action: "求人編集",
    target: "データアナリスト",
    ipAddress: "192.168.1.8",
  },
  {
    id: 9,
    timestamp: "2025-05-02 15:22:37",
    actor: "管理者",
    role: "admin",
    action: "求人削除",
    target: "UXデザイナー @ デジタルソリューションズ",
    ipAddress: "192.168.1.9",
  },
  {
    id: 10,
    timestamp: "2025-05-02 14:11:05",
    actor: "伊藤 三郎",
    role: "student",
    action: "プロフィール作成",
    target: "-",
    ipAddress: "192.168.1.10",
  },
  {
    id: 11,
    timestamp: "2025-05-02 13:05:42",
    actor: "イノベーション産業",
    role: "company",
    action: "スカウト送信",
    target: "田中 太郎",
    ipAddress: "192.168.1.11",
  },
  {
    id: 12,
    timestamp: "2025-05-02 12:32:19",
    actor: "管理者",
    role: "admin",
    action: "企業停止",
    target: "デジタルソリューションズ",
    ipAddress: "192.168.1.12",
  },
]

// Mock analytics data
const mockAnalyticsData = {
  // Metrics for current period
  currentPeriod: {
    students: 1245,
    companies: 248,
    applications: 3782,
    scouts: 5430,
  },
  // Metrics for previous period (for comparison)
  previousPeriod: {
    students: 1180,
    companies: 235,
    applications: 3520,
    scouts: 5120,
  },
  // Monthly trends data for line chart
  monthlyTrends: [
    { month: "1月", students: 120, applications: 350, scouts: 180 },
    { month: "2月", students: 135, applications: 380, scouts: 200 },
    { month: "3月", students: 150, applications: 420, scouts: 220 },
    { month: "4月", students: 180, applications: 480, scouts: 250 },
    { month: "5月", students: 210, applications: 520, scouts: 280 },
    { month: "6月", students: 230, applications: 550, scouts: 300 },
  ],
  // Job category data for bar chart
  jobCategories: [
    { category: "エンジニアリング", applications: 1250 },
    { category: "マーケティング", applications: 850 },
    { category: "営業", applications: 720 },
    { category: "デザイン", applications: 480 },
    { category: "コンサルティング", applications: 380 },
    { category: "人事", applications: 320 },
    { category: "経理", applications: 280 },
    { category: "その他", applications: 220 },
  ],
  // Application outcome data for pie chart
  applicationOutcomes: [
    { status: "面接中", count: 1450 },
    { status: "合格", count: 980 },
    { status: "不合格", count: 1120 },
    { status: "検討中", count: 650 },
  ],
  // Peak activity days
  peakActivityDays: [
    { date: "2025-05-01", students: 45, companies: 12, applications: 78, scouts: 95 },
    { date: "2025-04-15", students: 38, companies: 8, applications: 65, scouts: 82 },
    { date: "2025-04-22", students: 42, companies: 10, applications: 70, scouts: 88 },
    { date: "2025-04-30", students: 40, companies: 9, applications: 68, scouts: 85 },
    { date: "2025-04-10", students: 36, companies: 7, applications: 62, scouts: 78 },
  ],
  // Top jobs by applications
  topJobs: [
    { id: 1, title: "ソフトウェアエンジニア", company: "テクノロジー株式会社", applications: 85 },
    { id: 2, title: "データアナリスト", company: "未来コンサルティング", applications: 72 },
    { id: 3, title: "マーケティングスペシャリスト", company: "グローバル商事", applications: 68 },
    { id: 4, title: "プロジェクトマネージャー", company: "イノベーション産業", applications: 65 },
    { id: 5, title: "AIエンジニア", company: "フューチャーテック", applications: 60 },
  ],
  // Top companies by scout count
  topCompanies: [
    { id: 1, name: "テクノロジー株式会社", scouts: 320 },
    { id: 2, name: "未来コンサルティング", scouts: 285 },
    { id: 3, name: "グローバル商事", scouts: 260 },
    { id: 4, name: "イノベーション産業", scouts: 240 },
    { id: 5, name: "フューチャーテック", scouts: 220 },
  ],
}

const mockAdminUsers = [
  {
    id: 1,
    name: "山田 健太",
    email: "admin@example.com",
    role: "スーパー管理者",
    permissions: ["学生管理", "企業管理", "求人管理", "分析", "システム設定", "管理者管理"],
    lastLogin: "2025-05-03 09:15:22",
    isCurrentUser: true,
  },
  {
    id: 2,
    name: "佐藤 美咲",
    email: "m.sato@example.com",
    role: "コンテンツ管理者",
    permissions: ["学生管理", "企業管理", "求人管理"],
    lastLogin: "2025-05-02 14:30:45",
    isCurrentUser: false,
  },
  {
    id: 3,
    name: "鈴木 大輔",
    email: "d.suzuki@example.com",
    role: "サポート管理者",
    permissions: ["学生管理", "企業管理"],
    lastLogin: "2025-05-01 11:22:33",
    isCurrentUser: false,
  },
  {
    id: 4,
    name: "高橋 恵子",
    email: "k.takahashi@example.com",
    role: "分析担当者",
    permissions: ["分析"],
    lastLogin: "2025-04-30 16:45:12",
    isCurrentUser: false,
  },
  {
    id: 5,
    name: "田中 隆",
    email: "t.tanaka@example.com",
    role: "サポート管理者",
    permissions: ["学生管理", "企業管理"],
    lastLogin: "2025-04-29 10:05:38",
    isCurrentUser: false,
  },
]

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview")
  const [studentPage, setStudentPage] = useState(1)
  const [companyPage, setCompanyPage] = useState(1)
  const [jobPage, setJobPage] = useState(1)
  const [requestPage, setRequestPage] = useState(1)
  const [showFreezeDialog, setShowFreezeDialog] = useState(false)
  const [showSuspendDialog, setShowSuspendDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null)

  const [activityPage, setActivityPage] = useState(1)
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  })
  const [roleFilter, setRoleFilter] = useState("all")
  const [actionFilter, setActionFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  const [slackNewApplication, setSlackNewApplication] = useState(true)
  const [slackNewScout, setSlackNewScout] = useState(true)
  const [slackWebhookUrl, setSlackWebhookUrl] = useState(
    "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX",
  )
  const [emailDailySummary, setEmailDailySummary] = useState(true)
  const [emailWeeklyReport, setEmailWeeklyReport] = useState(true)
  const [adminEmail, setAdminEmail] = useState("admin@example.com")
  const [preferredTime, setPreferredTime] = useState("08:00")
  const [initialSettings, setInitialSettings] = useState({
    slackNewApplication: true,
    slackNewScout: true,
    slackWebhookUrl: "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX",
    emailDailySummary: true,
    emailWeeklyReport: true,
    adminEmail: "admin@example.com",
    preferredTime: "08:00",
  })
  const [isCopied, setIsCopied] = useState(false)

  // Analytics state
  const [analyticsDateRange, setAnalyticsDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })
  const [analyticsCategory, setAnalyticsCategory] = useState("all")
  const [analyticsGroupBy, setAnalyticsGroupBy] = useState("month")
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(false)

  const [adminSearchQuery, setAdminSearchQuery] = useState("")
  const [adminRoleFilter, setAdminRoleFilter] = useState("all")
  const [showOnlyActive, setShowOnlyActive] = useState(false)
  const [showAddAdminModal, setShowAddAdminModal] = useState(false)
  const [showEditPermissionsModal, setShowEditPermissionsModal] = useState(false)
  const [showRemoveAdminDialog, setShowRemoveAdminDialog] = useState(false)
  const [selectedAdmin, setSelectedAdmin] = useState<any>(null)

  // New admin form state
  const [newAdminName, setNewAdminName] = useState("")
  const [newAdminEmail, setNewAdminEmail] = useState("")
  const [newAdminRole, setNewAdminRole] = useState("サポート管理者")
  const [newAdminPermissions, setNewAdminPermissions] = useState<string[]>(["学生管理", "企業管理"])

  // Edit permissions state
  const [editPermissions, setEditPermissions] = useState<string[]>([])

  const router = useRouter()

  const handleFreeze = (id: number) => {
    setSelectedItemId(id)
    setShowFreezeDialog(true)
  }

  const handleSuspend = (id: number) => {
    setSelectedItemId(id)
    setShowSuspendDialog(true)
  }

  const handleDelete = (id: number) => {
    setSelectedItemId(id)
    setShowDeleteDialog(true)
  }

  const confirmFreeze = () => {
    // Mock implementation - would connect to backend in real app
    console.log(`Freezing student with ID: ${selectedItemId}`)
    setShowFreezeDialog(false)
    // Update UI to reflect the change
  }

  const confirmSuspend = () => {
    // Mock implementation - would connect to backend in real app
    console.log(`Suspending company with ID: ${selectedItemId}`)
    setShowSuspendDialog(false)
    // Update UI to reflect the change
  }

  const confirmDelete = () => {
    // Mock implementation - would connect to backend in real app
    console.log(`Deleting job with ID: ${selectedItemId}`)
    setShowDeleteDialog(false)
    // Update UI to reflect the change
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(slackWebhookUrl)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  const isWebhookUrlValid = () => {
    return slackWebhookUrl.startsWith("https://hooks.slack.com/")
  }

  const hasSettingsChanged = () => {
    return (
      slackNewApplication !== initialSettings.slackNewApplication ||
      slackNewScout !== initialSettings.slackNewScout ||
      slackWebhookUrl !== initialSettings.slackWebhookUrl ||
      emailDailySummary !== initialSettings.emailDailySummary ||
      emailWeeklyReport !== initialSettings.emailWeeklyReport ||
      adminEmail !== initialSettings.adminEmail ||
      preferredTime !== initialSettings.preferredTime
    )
  }

  const saveSettings = () => {
    // Mock implementation - would connect to backend in real app
    setInitialSettings({
      slackNewApplication,
      slackNewScout,
      slackWebhookUrl,
      emailDailySummary,
      emailWeeklyReport,
      adminEmail,
      preferredTime,
    })
    toast({
      title: "通知設定を保存しました",
      description: "設定が正常に更新されました。",
    })
  }

  const filteredLogs = mockActivityLogs.filter((log) => {
    // Apply role filter
    if (roleFilter !== "all" && log.role !== roleFilter) return false

    // Apply action filter
    if (actionFilter !== "all") {
      const actionMap: Record<string, string[]> = {
        account: ["アカウント凍結", "アカウント作成", "ログイン", "プロフィール更新", "プロフィール作成"],
        job: ["求人作成", "求人編集", "求人削除"],
        application: ["応募", "スカウト送信"],
        admin: ["企業承認", "企業停止", "アカウント凍結", "求人削除"],
      }
      if (!actionMap[actionFilter].includes(log.action)) return false
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        log.actor.toLowerCase().includes(query) ||
        log.target.toLowerCase().includes(query) ||
        log.action.toLowerCase().includes(query)
      )
    }

    return true
  })

  // Calculate percentage changes for metrics
  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return 100
    return ((current - previous) / previous) * 100
  }

  const studentChange = calculatePercentageChange(
    mockAnalyticsData.currentPeriod.students,
    mockAnalyticsData.previousPeriod.students,
  )
  const companyChange = calculatePercentageChange(
    mockAnalyticsData.currentPeriod.companies,
    mockAnalyticsData.previousPeriod.companies,
  )
  const applicationChange = calculatePercentageChange(
    mockAnalyticsData.currentPeriod.applications,
    mockAnalyticsData.previousPeriod.applications,
  )
  const scoutChange = calculatePercentageChange(
    mockAnalyticsData.currentPeriod.scouts,
    mockAnalyticsData.previousPeriod.scouts,
  )

  // Helper function to format date ranges for display
  const formatDateRange = () => {
    if (analyticsDateRange.from && analyticsDateRange.to) {
      return `${format(analyticsDateRange.from, "yyyy/MM/dd")} - ${format(analyticsDateRange.to, "yyyy/MM/dd")}`
    }
    return "日付を選択"
  }

  // Set predefined date ranges
  const setDateRangePreset = (days: number) => {
    setAnalyticsDateRange({
      from: subDays(new Date(), days),
      to: new Date(),
    })
  }

  const handleAddAdmin = () => {
    // Mock implementation - would connect to backend in real app
    toast({
      title: "管理者を追加しました",
      description: `${newAdminName} (${newAdminEmail}) を ${newAdminRole} として追加しました。`,
    })
    setShowAddAdminModal(false)
    // Reset form
    setNewAdminName("")
    setNewAdminEmail("")
    setNewAdminRole("サポート管理者")
    setNewAdminPermissions(["学生管理", "企業管理"])
  }

  const handleEditPermissions = () => {
    // Mock implementation - would connect to backend in real app
    toast({
      title: "権限を更新しました",
      description: `${selectedAdmin?.name} の権限が更新されました。`,
    })
    setShowEditPermissionsModal(false)
  }

  const handleRemoveAdmin = () => {
    // Mock implementation - would connect to backend in real app
    toast({
      title: "管理者を削除しました",
      description: `${selectedAdmin?.name} が管理者から削除されました。`,
    })
    setShowRemoveAdminDialog(false)
  }

  const openEditPermissions = (admin: any) => {
    setSelectedAdmin(admin)
    setEditPermissions([...admin.permissions])
    setShowEditPermissionsModal(true)
  }

  const openRemoveAdmin = (admin: any) => {
    setSelectedAdmin(admin)
    setShowRemoveAdminDialog(true)
  }

  const togglePermission = (permission: string) => {
    if (editPermissions.includes(permission)) {
      setEditPermissions(editPermissions.filter((p) => p !== permission))
    } else {
      setEditPermissions([...editPermissions, permission])
    }
  }

  const toggleNewPermission = (permission: string) => {
    if (newAdminPermissions.includes(permission)) {
      setNewAdminPermissions(newAdminPermissions.filter((p) => p !== permission))
    } else {
      setNewAdminPermissions([...newAdminPermissions, permission])
    }
  }

  // Filter admin users based on search and filters
  const filteredAdmins = mockAdminUsers.filter((admin) => {
    // Apply search filter
    if (adminSearchQuery) {
      const query = adminSearchQuery.toLowerCase()
      if (!admin.name.toLowerCase().includes(query) && !admin.email.toLowerCase().includes(query)) {
        return false
      }
    }

    // Apply role filter
    if (adminRoleFilter !== "all" && admin.role !== adminRoleFilter) {
      return false
    }

    // Apply active filter (this is a mock - in a real app, you'd have an active status)
    if (showOnlyActive) {
      // For this mock, we'll consider all admins active
      return true
    }

    return true
  })

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">管理者ダッシュボード</h1>
          <p className="text-muted-foreground mt-1">プラットフォーム全体の管理・監視</p>
        </div>
        <div className="flex items-center mt-4 md:mt-0">
          <div className="mr-4 text-right hidden md:block">
            <p className="font-medium">管理者</p>
            <p className="text-sm text-muted-foreground">admin@example.com</p>
          </div>
          <Avatar className="h-10 w-10">
            <AvatarImage src="/admin-interface.png" alt="Admin" />
            <AvatarFallback>AD</AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Navigation */}
      <div className="mb-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 w-full">
            <TabsTrigger value="overview" className="flex items-center">
              <BarChart3 className="mr-2 h-4 w-4" />
              <span className="hidden md:inline">概要</span>
              <span className="md:hidden">概要</span>
            </TabsTrigger>
            <TabsTrigger value="students" className="flex items-center">
              <Users className="mr-2 h-4 w-4" />
              <span className="hidden md:inline">学生管理</span>
              <span className="md:hidden">学生</span>
            </TabsTrigger>
            <TabsTrigger value="companies" className="flex items-center">
              <Building2 className="mr-2 h-4 w-4" />
              <span className="hidden md:inline">企業管理</span>
              <span className="md:hidden">企業</span>
            </TabsTrigger>
            <TabsTrigger value="jobs" className="flex items-center">
              <Briefcase className="mr-2 h-4 w-4" />
              <span className="hidden md:inline">求人管理</span>
              <span className="md:hidden">求人</span>
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center">
              <Bell className="mr-2 h-4 w-4" />
              <span className="hidden md:inline">申請対応</span>
              <span className="md:hidden">申請</span>
              <Badge className="ml-1 bg-red-500">5</Badge>
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center">
              <RefreshCcw className="mr-2 h-4 w-4" />
              <span className="hidden md:inline">活動ログ</span>
              <span className="md:hidden">ログ</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center">
              <LineChart className="mr-2 h-4 w-4" />
              <span className="hidden md:inline">分析</span>
              <span className="md:hidden">分析</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center">
              <Settings className="mr-2 h-4 w-4" />
              <span className="hidden md:inline">設定</span>
              <span className="md:hidden">設定</span>
            </TabsTrigger>
            <TabsTrigger value="admins" className="flex items-center">
              <UserCog className="mr-2 h-4 w-4" />
              <span className="hidden md:inline">管理者</span>
              <span className="md:hidden">管理者</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>学生数</CardTitle>
                  <CardDescription>現在の登録学生数</CardDescription>
                </CardHeader>
                <CardContent className="text-2xl font-bold">
                  {mockAnalyticsData.currentPeriod.students}
                  <span className="text-sm text-muted-foreground ml-2">
                    {studentChange > 0 ? (
                      <TrendingUp className="inline-block mr-1 h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="inline-block mr-1 h-4 w-4 text-red-500" />
                    )}
                    {studentChange.toFixed(1)}%
                  </span>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>企業数</CardTitle>
                  <CardDescription>現在の登録企業数</CardDescription>
                </CardHeader>
                <CardContent className="text-2xl font-bold">
                  {mockAnalyticsData.currentPeriod.companies}
                  <span className="text-sm text-muted-foreground ml-2">
                    {companyChange > 0 ? (
                      <TrendingUp className="inline-block mr-1 h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="inline-block mr-1 h-4 w-4 text-red-500" />
                    )}
                    {companyChange.toFixed(1)}%
                  </span>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>応募数</CardTitle>
                  <CardDescription>現在の総応募数</CardDescription>
                </CardHeader>
                <CardContent className="text-2xl font-bold">
                  {mockAnalyticsData.currentPeriod.applications}
                  <span className="text-sm text-muted-foreground ml-2">
                    {applicationChange > 0 ? (
                      <TrendingUp className="inline-block mr-1 h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="inline-block mr-1 h-4 w-4 text-red-500" />
                    )}
                    {applicationChange.toFixed(1)}%
                  </span>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>スカウト数</CardTitle>
                  <CardDescription>現在の総スカウト数</CardDescription>
                </CardHeader>
                <CardContent className="text-2xl font-bold">
                  {mockAnalyticsData.currentPeriod.scouts}
                  <span className="text-sm text-muted-foreground ml-2">
                    {scoutChange > 0 ? (
                      <TrendingUp className="inline-block mr-1 h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="inline-block mr-1 h-4 w-4 text-red-500" />
                    )}
                    {scoutChange.toFixed(1)}%
                  </span>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>月別アクティビティ</CardTitle>
                  <CardDescription>学生、応募、スカウトの月ごとの推移</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Placeholder for Line Chart */}
                  <div className="h-64 bg-gray-100 rounded-md flex items-center justify-center text-gray-500">
                    Line Chart Placeholder
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>求人カテゴリ別応募数</CardTitle>
                  <CardDescription>カテゴリごとの応募数</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Placeholder for Bar Chart */}
                  <div className="h-64 bg-gray-100 rounded-md flex items-center justify-center text-gray-500">
                    Bar Chart Placeholder
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students" className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <Input type="text" placeholder="学生を検索..." className="max-w-md" />
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                学生を追加
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>名前</TableHead>
                  <TableHead>大学</TableHead>
                  <TableHead>登録日</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockStudents.slice((studentPage - 1) * 5, studentPage * 5).map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>{student.id}</TableCell>
                    <TableCell>{student.name}</TableCell>
                    <TableCell>{student.university}</TableCell>
                    <TableCell>{student.registrationDate}</TableCell>
                    <TableCell>
                      {student.status === "アクティブ" ? (
                        <Badge className="bg-green-500 text-white">アクティブ</Badge>
                      ) : (
                        <Badge className="bg-yellow-500 text-white">凍結中</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>操作</DropdownMenuLabel>
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            詳細
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            編集
                          </DropdownMenuItem>
                          {student.status === "アクティブ" ? (
                            <DropdownMenuItem onClick={() => handleFreeze(student.id)}>
                              <Ban className="mr-2 h-4 w-4" />
                              凍結
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              アクティブ化
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-500">
                            <Trash2 className="mr-2 h-4 w-4" />
                            削除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Pagination>
              <PaginationContent>
                <PaginationPrevious href="#" />
                <PaginationItem>
                  <PaginationLink href="#" isActive>
                    {studentPage}
                  </PaginationLink>
                </PaginationItem>
                <PaginationNext href="#" />
              </PaginationContent>
            </Pagination>
          </TabsContent>

          {/* Companies Tab */}
          <TabsContent value="companies" className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <Input type="text" placeholder="企業を検索..." className="max-w-md" />
              <Button>
                <BuildingPlus className="mr-2 h-4 w-4" />
                企業を追加
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>企業名</TableHead>
                  <TableHead>求人数</TableHead>
                  <TableHead>登録日</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockCompanies.slice((companyPage - 1) * 5, companyPage * 5).map((company) => (
                  <TableRow key={company.id}>
                    <TableCell>{company.id}</TableCell>
                    <TableCell>{company.name}</TableCell>
                    <TableCell>{company.jobCount}</TableCell>
                    <TableCell>{company.registrationDate}</TableCell>
                    <TableCell>
                      {company.status === "承認済み" ? (
                        <Badge className="bg-green-500 text-white">承認済み</Badge>
                      ) : (
                        <Badge className="bg-yellow-500 text-white">停止中</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>操作</DropdownMenuLabel>
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            詳細
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            編集
                          </DropdownMenuItem>
                          {company.status === "承認済み" ? (
                            <DropdownMenuItem onClick={() => handleSuspend(company.id)}>
                              <Ban className="mr-2 h-4 w-4" />
                              停止
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              承認
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-500">
                            <Trash2 className="mr-2 h-4 w-4" />
                            削除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Pagination>
              <PaginationContent>
                <PaginationPrevious href="#" />
                <PaginationItem>
                  <PaginationLink href="#" isActive>
                    {companyPage}
                  </PaginationLink>
                </PaginationItem>
                <PaginationNext href="#" />
              </PaginationContent>
            </Pagination>
          </TabsContent>

          {/* Jobs Tab */}
          <TabsContent value="jobs" className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <Input type="text" placeholder="求人を検索..." className="max-w-md" />
              <Button>
                <Briefcase className="mr-2 h-4 w-4" />
                求人を追加
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>タイトル</TableHead>
                  <TableHead>企業</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>締切日</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockJobs.slice((jobPage - 1) * 5, jobPage * 5).map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>{job.id}</TableCell>
                    <TableCell>{job.title}</TableCell>
                    <TableCell>{job.company}</TableCell>
                    <TableCell>
                      {job.status === "公開中" ? (
                        <Badge className="bg-green-500 text-white">公開中</Badge>
                      ) : (
                        <Badge className="bg-yellow-500 text-white">下書き</Badge>
                      )}
                    </TableCell>
                    <TableCell>{job.deadline}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>操作</DropdownMenuLabel>
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            詳細
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            編集
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(job.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            削除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Pagination>
              <PaginationContent>
                <PaginationPrevious href="#" />
                <PaginationItem>
                  <PaginationLink href="#" isActive>
                    {jobPage}
                  </PaginationLink>
                </PaginationItem>
                <PaginationNext href="#" />
              </PaginationContent>
            </Pagination>
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests" className="mt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>種類</TableHead>
                  <TableHead>企業</TableHead>
                  <TableHead>学生</TableHead>
                  <TableHead>日付</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockRequests.slice((requestPage - 1) * 5, requestPage * 5).map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>{request.id}</TableCell>
                    <TableCell>{request.type}</TableCell>
                    <TableCell>{request.company}</TableCell>
                    <TableCell>{request.student}</TableCell>
                    <TableCell>{request.date}</TableCell>
                    <TableCell>
                      {request.status === "未対応" ? (
                        <Badge className="bg-yellow-500 text-white">未対応</Badge>
                      ) : (
                        <Badge className="bg-green-500 text-white">対応済</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>操作</DropdownMenuLabel>
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            詳細
                          </DropdownMenuItem>
                          {request.status === "未対応" ? (
                            <DropdownMenuItem>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              対応済みにする
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem>
                              <XCircle className="mr-2 h-4 w-4" />
                              未対応に戻す
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Pagination>
              <PaginationContent>
                <PaginationPrevious href="#" />
                <PaginationItem>
                  <PaginationLink href="#" isActive>
                    {requestPage}
                  </PaginationLink>
                </PaginationItem>
                <PaginationNext href="#" />
              </PaginationContent>
            </Pagination>
          </TabsContent>

          {/* Activity Log Tab */}
          <TabsContent value="activity" className="mt-6">
            <div className="mb-4 p-4 rounded-md bg-gray-50">
              <Collapsible open={isFilterCollapsed} onOpenChange={setIsFilterCollapsed}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    <CollapsibleTrigger className="flex items-center">
                      フィルター
                      {isFilterCollapsed ? (
                        <ChevronUp className="ml-2 h-4 w-4" />
                      ) : (
                        <ChevronDown className="ml-2 h-4 w-4" />
                      )}
                    </CollapsibleTrigger>
                  </h3>
                </div>
                <CollapsibleContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <Label htmlFor="date">日付範囲</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={
                              "w-[280px] justify-start text-left font-normal" +
                              (!dateRange.from ? " text-muted-foreground" : "")
                            }
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange.from ? (
                              format(dateRange.from, "yyyy/MM/dd") +
                              " - " +
                              format(dateRange.to || dateRange.from, "yyyy/MM/dd")
                            ) : (
                              <span>日付を選択</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="center" side="bottom">
                          <Calendar
                            mode="range"
                            defaultMonth={dateRange?.from}
                            selected={dateRange}
                            onSelect={setDateRange}
                            numberOfMonths={2}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label htmlFor="role">ロール</Label>
                      <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger className="w-[280px]">
                          <SelectValue placeholder="すべてのロール" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">すべてのロール</SelectItem>
                          <SelectItem value="student">学生</SelectItem>
                          <SelectItem value="company">企業</SelectItem>
                          <SelectItem value="admin">管理者</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="action">アクション</Label>
                      <Select value={actionFilter} onValueChange={setActionFilter}>
                        <SelectTrigger className="w-[280px]">
                          <SelectValue placeholder="すべてのアクション" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">すべてのアクション</SelectItem>
                          <SelectItem value="account">アカウント関連</SelectItem>
                          <SelectItem value="job">求人関連</SelectItem>
                          <SelectItem value="application">応募関連</SelectItem>
                          <SelectItem value="admin">管理者関連</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            <div className="flex items-center justify-between mb-4">
              <Input
                type="text"
                placeholder="アクティビティを検索..."
                className="max-w-md"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button>
                <Download className="mr-2 h-4 w-4" />
                CSVをダウンロード
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>タイムスタンプ</TableHead>
                  <TableHead>アクター</TableHead>
                  <TableHead>ロール</TableHead>
                  <TableHead>アクション</TableHead>
                  <TableHead>ターゲット</TableHead>
                  <TableHead>IPアドレス</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.slice((activityPage - 1) * 5, activityPage * 5).map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{log.timestamp}</TableCell>
                    <TableCell>{log.actor}</TableCell>
                    <TableCell>{log.role}</TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell>{log.target}</TableCell>
                    <TableCell>{log.ipAddress}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Pagination>
              <PaginationContent>
                <PaginationPrevious href="#" />
                <PaginationItem>
                  <PaginationLink href="#" isActive>
                    {activityPage}
                  </PaginationLink>
                </PaginationItem>
                <PaginationNext href="#" />
              </PaginationContent>
            </Pagination>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="mt-6">
            <div className="mb-4 p-4 rounded-md bg-gray-50">
              <Collapsible open={isFilterCollapsed} onOpenChange={setIsFilterCollapsed}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    <CollapsibleTrigger className="flex items-center">
                      フィルター
                      {isFilterCollapsed ? (
                        <ChevronUp className="ml-2 h-4 w-4" />
                      ) : (
                        <ChevronDown className="ml-2 h-4 w-4" />
                      )}
                    </CollapsibleTrigger>
                  </h3>
                </div>
                <CollapsibleContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <Label htmlFor="date">日付範囲</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={
                              "w-[280px] justify-start text-left font-normal" +
                              (!analyticsDateRange.from ? " text-muted-foreground" : "")
                            }
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formatDateRange()}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="center" side="bottom">
                          <div className="grid w-full max-w-sm gap-2">
                            <Calendar
                              mode="range"
                              defaultMonth={analyticsDateRange?.from}
                              selected={analyticsDateRange}
                              onSelect={setAnalyticsDateRange}
                              numberOfMonths={2}
                            />
                            <div className="flex justify-around space-x-2">
                              <Button variant="outline" size="sm" onClick={() => setDateRangePreset(7)}>
                                7日間
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => setDateRangePreset(30)}>
                                30日間
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => setDateRangePreset(90)}>
                                90日間
                              </Button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label htmlFor="category">カテゴリ</Label>
                      <Select value={analyticsCategory} onValueChange={setAnalyticsCategory}>
                        <SelectTrigger className="w-[280px]">
                          <SelectValue placeholder="すべてのカテゴリ" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">すべてのカテゴリ</SelectItem>
                          <SelectItem value="engineering">エンジニアリング</SelectItem>
                          <SelectItem value="marketing">マーケティング</SelectItem>
                          <SelectItem value="sales">営業</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="group-by">グループ化</Label>
                      <Select value={analyticsGroupBy} onValueChange={setAnalyticsGroupBy}>
                        <SelectTrigger className="w-[280px]">
                          <SelectValue placeholder="月別" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="month">月別</SelectItem>
                          <SelectItem value="week">週別</SelectItem>
                          <SelectItem value="day">日別</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>応募状況</CardTitle>
                  <CardDescription>応募状況の内訳</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Placeholder for Pie Chart */}
                  <div className="h-64 bg-gray-100 rounded-md flex items-center justify-center text-gray-500">
                    Pie Chart Placeholder
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>ピークアクティビティ</CardTitle>
                  <CardDescription>アクティビティが最も高い日</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>日付</TableHead>
                        <TableHead>学生</TableHead>
                        <TableHead>企業</TableHead>
                        <TableHead>応募</TableHead>
                        <TableHead>スカウト</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockAnalyticsData.peakActivityDays.map((day) => (
                        <TableRow key={day.date}>
                          <TableCell>{day.date}</TableCell>
                          <TableCell>{day.students}</TableCell>
                          <TableCell>{day.companies}</TableCell>
                          <TableCell>{day.applications}</TableCell>
                          <TableCell>{day.scouts}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>応募数の多い求人</CardTitle>
                  <CardDescription>応募数が多い求人トップ5</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>求人</TableHead>
                        <TableHead>企業</TableHead>
                        <TableHead>応募数</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockAnalyticsData.topJobs.map((job) => (
                        <TableRow key={job.id}>
                          <TableCell>{job.title}</TableCell>
                          <TableCell>{job.company}</TableCell>
                          <TableCell>{job.applications}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>スカウト数の多い企業</CardTitle>
                  <CardDescription>スカウト数が多い企業トップ5</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>企業名</TableHead>
                        <TableHead>スカウト数</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockAnalyticsData.topCompanies.map((company) => (
                        <TableRow key={company.id}>
                          <TableCell>{company.name}</TableCell>
                          <TableCell>{company.scouts}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>通知設定</CardTitle>
                <CardDescription>プラットフォームからの通知設定</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="slack-new-application">Slackに新規応募を通知</Label>
                  <Switch
                    id="slack-new-application"
                    checked={slackNewApplication}
                    onCheckedChange={(checked) => setSlackNewApplication(checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="slack-new-scout">Slackに新規スカウトを通知</Label>
                  <Switch
                    id="slack-new-scout"
                    checked={slackNewScout}
                    onCheckedChange={(checked) => setSlackNewScout(checked)}
                  />
                </div>
                <div>
                  <Label htmlFor="slack-webhook-url">Slack Webhook URL</Label>
                  <div className="flex items-center">
                    <Input
                      id="slack-webhook-url"
                      type="text"
                      value={slackWebhookUrl}
                      onChange={(e) => setSlackWebhookUrl(e.target.value)}
                      className="mr-2"
                    />
                    <Button variant="secondary" size="sm" onClick={copyToClipboard} disabled={isCopied}>
                      {isCopied ? "コピー済み!" : "コピー"}
                    </Button>
                  </div>
                  {!isWebhookUrlValid() && (
                    <p className="text-sm text-red-500 mt-1">有効なSlack Webhook URLを入力してください。</p>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="email-daily-summary">メールで毎日の概要を送信</Label>
                  <Switch
                    id="email-daily-summary"
                    checked={emailDailySummary}
                    onCheckedChange={(checked) => setEmailDailySummary(checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="email-weekly-report">メールで毎週のレポートを送信</Label>
                  <Switch
                    id="email-weekly-report"
                    checked={emailWeeklyReport}
                    onCheckedChange={(checked) => setEmailWeeklyReport(checked)}
                  />
                </div>
                <div>
                  <Label htmlFor="admin-email">管理者メールアドレス</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="preferred-time">希望する時間</Label>
                  <Input
                    id="preferred-time"
                    type="time"
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={saveSettings} disabled={!hasSettingsChanged()}>
                  設定を保存
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Admins Tab */}
          <TabsContent value="admins" className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Input
                  type="text"
                  placeholder="管理者を検索..."
                  className="max-w-md mr-2"
                  value={adminSearchQuery}
                  onChange={(e) => setAdminSearchQuery(e.target.value)}
                />
                <Select value={adminRoleFilter} onValueChange={setAdminRoleFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="すべてのロール" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべてのロール</SelectItem>
                    <SelectItem value="スーパー管理者">スーパー管理者</SelectItem>
                    <SelectItem value="コンテンツ管理者">コンテンツ管理者</SelectItem>
                    <SelectItem value="サポート管理者">サポート管理者</SelectItem>
                    <SelectItem value="分析担当者">分析担当者</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => setShowAddAdminModal(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                管理者を追加
              </Button>
            </div>

            <div className="flex items-center mb-4">
              <Checkbox
                id="show-only-active"
                checked={showOnlyActive}
                onCheckedChange={(checked) => setShowOnlyActive(checked)}
              />
              <Label htmlFor="show-only-active" className="ml-2">
                アクティブな管理者のみ表示
              </Label>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名前</TableHead>
                  <TableHead>メールアドレス</TableHead>
                  <TableHead>ロール</TableHead>
                  <TableHead>権限</TableHead>
                  <TableHead>最終ログイン</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAdmins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell>{admin.name}</TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell>{admin.role}</TableCell>
                    <TableCell>
                      {admin.permissions.map((permission) => (
                        <Badge key={permission} className="mr-1">
                          {permission}
                        </Badge>
                      ))}
                    </TableCell>
                    <TableCell>{admin.lastLogin}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>操作</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => openEditPermissions(admin)}>
                            <Edit className="mr-2 h-4 w-4" />
                            権限を編集
                          </DropdownMenuItem>
                          {!admin.isCurrentUser && (
                            <DropdownMenuItem className="text-red-500" onClick={() => openRemoveAdmin(admin)}>
                              <UserX className="mr-2 h-4 w-4" />
                              削除
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Add Admin Modal */}
            <Dialog open={showAddAdminModal} onOpenChange={setShowAddAdminModal}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>管理者を追加</DialogTitle>
                  <DialogDescription>新しい管理者の情報を入力してください。</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      名前
                    </Label>
                    <Input
                      id="name"
                      value={newAdminName}
                      onChange={(e) => setNewAdminName(e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">
                      メールアドレス
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="role" className="text-right">
                      ロール
                    </Label>
                    <Select value={newAdminRole} onValueChange={setNewAdminRole}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="ロールを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="スーパー管理者">スーパー管理者</SelectItem>
                        <SelectItem value="コンテンツ管理者">コンテンツ管理者</SelectItem>
                        <SelectItem value="サポート管理者">サポート管理者</SelectItem>
                        <SelectItem value="分析担当者">分析担当者</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="permissions" className="text-right mt-2">
                      権限
                    </Label>
                    <div className="col-span-3 space-y-1">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="student-management"
                          checked={newAdminPermissions.includes("学生管理")}
                          onCheckedChange={() => toggleNewPermission("学生管理")}
                        />
                        <Label htmlFor="student-management">学生管理</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="company-management"
                          checked={newAdminPermissions.includes("企業管理")}
                          onCheckedChange={() => toggleNewPermission("企業管理")}
                        />
                        <Label htmlFor="company-management">企業管理</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="job-management"
                          checked={newAdminPermissions.includes("求人管理")}
                          onCheckedChange={() => toggleNewPermission("求人管理")}
                        />
                        <Label htmlFor="job-management">求人管理</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="analytics"
                          checked={newAdminPermissions.includes("分析")}
                          onCheckedChange={() => toggleNewPermission("分析")}
                        />
                        <Label htmlFor="analytics">分析</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="system-settings"
                          checked={newAdminPermissions.includes("システム設定")}
                          onCheckedChange={() => toggleNewPermission("システム設定")}
                        />
                        <Label htmlFor="system-settings">システム設定</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="admin-management"
                          checked={newAdminPermissions.includes("管理者管理")}
                          onCheckedChange={() => toggleNewPermission("管理者管理")}
                        />
                        <Label htmlFor="admin-management">管理者管理</Label>
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="secondary" onClick={() => setShowAddAdminModal(false)}>
                    キャンセル
                  </Button>
                  <Button type="submit" onClick={handleAddAdmin}>
                    追加
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Edit Permissions Modal */}
            <Dialog open={showEditPermissionsModal} onOpenChange={setShowEditPermissionsModal}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>権限を編集</DialogTitle>
                  <DialogDescription>{selectedAdmin?.name} の権限を編集します。</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="permissions" className="text-right mt-2">
                      権限
                    </Label>
                    <div className="col-span-3 space-y-1">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="student-management-edit"
                          checked={editPermissions.includes("学生管理")}
                          onCheckedChange={() => togglePermission("学生管理")}
                        />
                        <Label htmlFor="student-management-edit">学生管理</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="company-management-edit"
                          checked={editPermissions.includes("企業管理")}
                          onCheckedChange={() => togglePermission("企業管理")}
                        />
                        <Label htmlFor="company-management-edit">企業管理</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="job-management-edit"
                          checked={editPermissions.includes("求人管理")}
                          onCheckedChange={() => togglePermission("求人管理")}
                        />
                        <Label htmlFor="job-management-edit">求人管理</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="analytics-edit"
                          checked={editPermissions.includes("分析")}
                          onCheckedChange={() => togglePermission("分析")}
                        />
                        <Label htmlFor="analytics-edit">分析</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="system-settings-edit"
                          checked={editPermissions.includes("システム設定")}
                          onCheckedChange={() => togglePermission("システム設定")}
                        />
                        <Label htmlFor="system-settings-edit">システム設定</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="admin-management-edit"
                          checked={editPermissions.includes("管理者管理")}
                          onCheckedChange={() => togglePermission("管理者管理")}
                        />
                        <Label htmlFor="admin-management-edit">管理者管理</Label>
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="secondary" onClick={() => setShowEditPermissionsModal(false)}>
                    キャンセル
                  </Button>
                  <Button type="submit" onClick={handleEditPermissions}>
                    保存
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Remove Admin Dialog */}
            <Dialog open={showRemoveAdminDialog} onOpenChange={setShowRemoveAdminDialog}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>管理者削除</DialogTitle>
                  <DialogDescription>{selectedAdmin?.name} を本当に削除しますか？</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button type="button" variant="secondary" onClick={() => setShowRemoveAdminDialog(false)}>
                    キャンセル
                  </Button>
                  <Button type="submit" variant="destructive" onClick={handleRemoveAdmin}>
                    削除
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <Dialog open={showFreezeDialog} onOpenChange={setShowFreezeDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>学生を凍結</DialogTitle>
            <DialogDescription>選択した学生を凍結しますか？</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setShowFreezeDialog(false)}>
              キャンセル
            </Button>
            <Button type="submit" onClick={confirmFreeze}>
              凍結
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>企業を停止</DialogTitle>
            <DialogDescription>選択した企業を停止しますか？</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setShowSuspendDialog(false)}>
              キャンセル
            </Button>
            <Button type="submit" onClick={confirmSuspend}>
              停止
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>求人を削除</DialogTitle>
            <DialogDescription>選択した求人を削除しますか？</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setShowDeleteDialog(false)}>
              キャンセル
            </Button>
            <Button type="submit" onClick={confirmDelete}>
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
