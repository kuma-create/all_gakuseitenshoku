// v0 version of app/admin/(protected)/grandprix/page.tsx
"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { supabase } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/types"

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/lib/hooks/use-toast"
import {
  ArrowUpRight,
  Calendar,
  Check,
  Clock,
  Edit,
  Eye,
  FileText,
  Filter,
  Loader2,
  Plus,
  Search,
  Star,
  Trash2,
  Users,
  X,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

// ---------- 型定義 ----------------------------------------------------
type ChallengeRow =
  Database["public"]["Tables"]["challenges"]["Row"]

type SubmissionRow =
  Database["public"]["Tables"]["challenge_submissions"]["Row"] & {
    student_profiles: {
      full_name: string | null
      university: string | null
    } | null
  }

// =====================================================================
// メインコンポーネント
// =====================================================================
export default function AdminGrandPrixPage() {
  const { toast } = useToast()
  const router = useRouter()

  /* Grand Prix 種別: case | webtest | bizscore */
  const [grandType, setGrandType] = useState<"case" | "webtest" | "bizscore">("case");
  // ------- Data state -----------------------------------------------
  const [currentChallenge, setCurrentChallenge] =
    useState<ChallengeRow | null>(null)
  const [challengeForm, setChallengeForm] = useState({
    title: "",
    description: "",
    word_limit: 500,     // Case / Bizscore 用
    num_questions: 50,   // WebTest 用
    randomize: true,     // WebTest 用
    deadline: new Date(),
  })
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([])
  const [pastChallenges, setPastChallenges] = useState<
    (ChallengeRow & {
      submissionsCount: number
      avgScore: number
    })[]
  >([])
  // 公開中 / 予定のお題一覧
  const [upcomingChallenges, setUpcomingChallenges] = useState<ChallengeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // question_bank rows for the selected type
  const [questions, setQuestions] = useState<Database["public"]["Tables"]["question_bank"]["Row"][]>([])
  const [questionLoading, setQuestionLoading] = useState(false)
  /* 出題対象として選択された question_id の配列 */
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([])

  // In-place editing for questions
  const [qModalOpen, setQModalOpen] = useState(false)
  const [editingQ, setEditingQ] =
    useState<Database["public"]["Tables"]["question_bank"]["Row"] | null>(null)
    const [qForm, setQForm] = useState({
      stem: "",
      choices: ["", "", "", ""],   // webtest
      correct: 1,                  // webtest
      weight: 1,                   // bizscore
      keywords: "",                // case 用
      order_no: 1,
    })

  // CSV upload input ref
  const fileInputRef = useRef<HTMLInputElement>(null)

  // CSV upload handler
  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const text = await file.text()
    const lines = text.split(/\r?\n/).filter(Boolean)
    if (lines.length === 0) return

    // header detection
    const hasHeader = /stem|question/i.test(lines[0])
    const dataLines = hasHeader ? lines.slice(1) : lines

    const parseCsv = (line: string) => {
      const cells: string[] = []
      let cur = ""
      let inQuote = false
      for (const ch of line) {
        if (ch === '"' && !inQuote) {
          inQuote = true
          continue
        }
        if (ch === '"' && inQuote) {
          inQuote = false
          continue
        }
        if (ch === "," && !inQuote) {
          cells.push(cur.trim())
          cur = ""
        } else {
          cur += ch
        }
      }
      cells.push(cur.trim())
      return cells
    }

    const rows = dataLines.map((l) => {
      const [stem, c1, c2, c3, c4, correct] = parseCsv(l)
      return {
        grand_type: grandType,
        stem,
        choices: [c1, c2, c3, c4],
        correct_choice: Number(correct || 1),
      } as Database["public"]["Tables"]["question_bank"]["Insert"];
    })

    const { error } = await supabase.from("question_bank").insert(rows)
    if (error) {
      toast({ title: "CSV取込エラー", description: error.message, variant: "destructive" })
    } else {
      toast({ title: "CSVを取り込みました", description: `${rows.length}件追加` })
      fetchData()
    }
  }

  // openQuestionModal now accepts q: ... | null
  const openQuestionModal = (q: Database["public"]["Tables"]["question_bank"]["Row"] | null) => {
    if (q) {
      setEditingQ(q)
      setQForm({
        stem: q.stem ?? "",
        choices: Array.isArray(q.choices) ? (q.choices as string[]) : ["", "", "", ""],
        correct: (q.correct_choice ?? 1),
        order_no: q.order_no ?? 1,
        weight: (q.weight as number) ?? 1,
        keywords: Array.isArray(q.expected_kw) ? (q.expected_kw as string[]).join(",") : "",
      })
    } else {
      setEditingQ(null)
      setQForm({
        stem: "",
        choices: ["", "", "", ""],
        correct: 1,
        order_no: questions.length + 1,
        weight: 1,
        keywords: "",
      })
    }
    setQModalOpen(true)
  }

  const handleQuestionSave = async () => {
    if (editingQ) {
      // update as before
      const updates: any = {
        stem: qForm.stem,
        order_no: qForm.order_no,
        grand_type: grandType,       // ← 追加: 必ず現在のタブ種別に揃える
      }
      if (grandType === "webtest") {
        updates.choices = qForm.choices
        updates.correct_choice = qForm.correct
      }
      if (grandType === "bizscore") {
        updates.weight = qForm.weight
      }
      if (grandType === "case") {
        updates.expected_kw = qForm.keywords
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }

      const { error } = await supabase
        .from("question_bank")
        .update(updates)
        .eq("id", editingQ.id)

      if (error) {
        toast({ title: "保存に失敗しました", description: error.message, variant: "destructive" })
        return
      }
      toast({ title: "問題を更新しました" })
      setQModalOpen(false)
      fetchData()
    } else {
      // insert new question
      const insertData: any = {
        grand_type: grandType,
        stem: qForm.stem,
        order_no: qForm.order_no,
      }
      if (grandType === "webtest") {
        insertData.choices = qForm.choices
        insertData.correct_choice = qForm.correct
      }
      if (grandType === "bizscore") {
        insertData.weight = qForm.weight
      }
      if (grandType === "case") {
        insertData.expected_kw = qForm.keywords
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      }
      const { error } = await supabase.from("question_bank").insert(insertData)
      if (error) {
        toast({ title: "保存に失敗しました", description: error.message, variant: "destructive" })
        return
      }
      toast({ title: "新しい問題を追加しました" })
      setQModalOpen(false)
      fetchData()
    }
  }

  // ------- UI state --------------------------------------------------
  const [filters, setFilters] = useState({
    status: "all",
    scoreRange: "all",
    search: "",
  })
  const [scoringModalOpen, setScoringModalOpen] = useState(false)
  const [scoringSubmission, setScoringSubmission] =
    useState<SubmissionRow | null>(null)
  const [score, setScore] = useState<number | null>(null)
  const [feedback, setFeedback] = useState("")
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [selectedTime, setSelectedTime] = useState("23:59")

  // 回答閲覧モーダル
  const [answerModalOpen, setAnswerModalOpen] = useState(false)
  const [viewingSubmission, setViewingSubmission] = useState<SubmissionRow | null>(null)

  const openAnswerModal = (sub: SubmissionRow) => {
    setViewingSubmission(sub)
    setAnswerModalOpen(true)
  }

  // 新規お題作成モード
  const [isCreating, setIsCreating] = useState(false)
  // 編集対象の challenge ID（ハイライト用）
  const [editingId, setEditingId] = useState<string | null>(null)
  // 削除確認モーダル
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [challengeToDelete, setChallengeToDelete] = useState<ChallengeRow | null>(null)
  // プレビューモーダル
  const [previewModalOpen, setPreviewModalOpen] = useState(false)

  // 問題セット閲覧モーダル
  const [psModalOpen, setPsModalOpen] = useState(false)
  const [viewingChallenge, setViewingChallenge] = useState<ChallengeRow | null>(null)
  const [viewingQuestions, setViewingQuestions] = useState<
    { order_no: number; stem: string | null }[]
  >([])

  /** 選択された challenge の問題セットを取得してモーダル表示 */
  const openPsModal = async (ch: ChallengeRow) => {
    try {
      setViewingChallenge(ch)
      // challenge_questions -> question_bank
      const { data, error } = await supabase
        .from("challenge_questions")
        .select(
          `
          order_no,
          question_bank:question_id (
            stem
          )
        `,
        )
        .eq("challenge_id", ch.id)
        .order("order_no", { ascending: true })

      if (error) throw error
      const qs =
        (data ?? []).map((r: any) => ({
          order_no: r.order_no,
          stem: r.question_bank?.stem ?? "",
        })) ?? []
      setViewingQuestions(qs)
      setPsModalOpen(true)
    } catch (e) {
      toast({
        title: "問題セット取得エラー",
        description: (e as any).message,
        variant: "destructive",
      })
    }
  }

  // ------------------------------------------------------------------
  // データ取得
  // ------------------------------------------------------------------
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const nowIso = new Date().toISOString()

      // 1) 現在のお題
      const { data: current, error: err1 } = await supabase
        .from("challenges")
        .select("*")
        .or(`type.is.null,type.eq.${grandType}`)
        .gt("deadline", nowIso)
        .order("deadline", { ascending: true })
        .limit(1)
        .single()

      if (err1 && err1.code !== "PGRST116") throw err1 // 116: row not found

      if (current) {
        setCurrentChallenge(current)
        setChallengeForm({
          title: current.title ?? "",
          description: current.description ?? "",
          word_limit: current.word_limit ?? 500,
          num_questions: (current as any).num_questions ?? 50,
          randomize: (current as any).randomize ?? true,
          deadline: current.deadline ? new Date(current.deadline) : new Date(),
        })
        setSelectedTime(
          current.deadline
            ? format(new Date(current.deadline), "HH:mm", {
                locale: ja,
              })
            : "23:59",
        )

        // 2) 回答
        const { data: subs, error: err2 } = await supabase
          .from("challenge_submissions")
          .select(
            `
            *,
            student_profiles:student_id (
              full_name,
              university
            )
          `,
          )
          .eq("challenge_id", current.id)
          .order("created_at", { ascending: false })

        if (err2) throw err2
        setSubmissions((subs ?? []) as SubmissionRow[])
      } else {
        // 現在公開中のお題が無い場合は、直近（締切が一番近い過去のお題）を取得して表示
        const { data: latest, error: errLatest } = await supabase
          .from("challenges")
          .select("*")
          .or(`type.is.null,type.eq.${grandType}`)
          .order("deadline", { ascending: false })
          .limit(1)
          .single()

        if (!errLatest && latest) {
          // 直近のお題を「対象」にしてフォーム・提出物をセット
          setCurrentChallenge(latest)
          setChallengeForm({
            title: latest.title ?? "",
            description: latest.description ?? "",
            word_limit: latest.word_limit ?? 500,
            num_questions: (latest as any).num_questions ?? 50,
            randomize: (latest as any).randomize ?? true,
            deadline: latest.deadline ? new Date(latest.deadline) : new Date(),
          })
          setSelectedTime(
            latest.deadline
              ? format(new Date(latest.deadline), "HH:mm", { locale: ja })
              : "23:59",
          )

          // そのお題に対する提出物を取得
          const { data: subs, error: errSub } = await supabase
            .from("challenge_submissions")
            .select(
              `
              *,
              student_profiles:student_id (
                full_name,
                university
              )
            `,
            )
            .eq("challenge_id", latest.id)
            .order("created_at", { ascending: false })

          if (errSub) throw errSub
          setSubmissions((subs ?? []) as SubmissionRow[])
        } else {
          // 過去にもお題が一つも無い場合はクリア
          setCurrentChallenge(null)
          setSubmissions([])
          setChallengeForm({
            title: "",
            description: "",
            word_limit: 500,
            num_questions: 50,
            randomize: true,
            deadline: new Date(),
          })
        }
      }

      // 2-1) これから公開中/予定のお題を取得
      const upcomingQuery = supabase
        .from("challenges")
        .select("*")
        .or(`type.is.null,type.eq.${grandType}`)
        .gt("deadline", nowIso)
        .order("deadline", { ascending: true });

      if (current) {
        upcomingQuery.neq("id", current.id); // 現在のお題を除外
      }

      const { data: upcoming, error: errUpcoming } = await upcomingQuery;
      if (errUpcoming) throw errUpcoming;

      // 念のためクライアント側でも昇順ソート
      const sortedUpcoming = (upcoming ?? []).sort(
        (a, b) =>
          new Date(a.deadline ?? 0).getTime() -
          new Date(b.deadline ?? 0).getTime()
      );
      setUpcomingChallenges(sortedUpcoming);

      // 3) 過去のお題
      const { data: past, error: err3 } = await supabase
        .from("challenges")
        .select("*")
        .or(`type.is.null,type.eq.${grandType}`)
        .lt("deadline", nowIso)
        .order("deadline", { ascending: false })
      if (err3) throw err3

      // 4) 過去統計
      const pastWithStats = await Promise.all(
        (past || []).map(async (ch) => {
          const { count } = await supabase
            .from("challenge_submissions")
            .select("*", { count: "exact", head: true })
            .eq("challenge_id", ch.id)

          const { data: scoreData } = await supabase
            .from("challenge_submissions")
            .select("score")
            .eq("challenge_id", ch.id)
            .not("score", "is", null)

          const avg =
            scoreData && scoreData.length > 0
              ? scoreData.reduce(
                  (sum, r) => sum + (r.score || 0),
                  0,
                ) / scoreData.length
              : 0

          return {
            ...ch,
            submissionsCount: count || 0,
            avgScore: Math.round(avg),
          }
        }),
      )

      setPastChallenges(pastWithStats)

      // 5) question bank for selected type
      setQuestionLoading(true)
      const { data: qbRows, error: errQB } = await supabase
        .from("question_bank")
        .select("*")
        .eq("grand_type", grandType)
        .limit(1000)
        .order("order_no", { ascending: true })

      if (errQB) console.error(errQB)
      setQuestions(qbRows ?? [])
      setQuestionLoading(false)

      // 6) challenge_questions (現在編集対象がある場合のみ)
      if (current) {
        const { data: cqRows, error: errCQ } = await supabase
          .from("challenge_questions")
          .select("question_id")
          .eq("challenge_id", current.id)

        if (errCQ) throw errCQ
        setSelectedQuestionIds((cqRows ?? []).map((r: any) => r.question_id))
      } else {
        setSelectedQuestionIds([])
      }
    } catch (e: any) {
      console.error(e)
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [grandType])

  useEffect(() => {
    fetchData()
  }, [fetchData, grandType])

  // ------------------------------------------------------------------
  // 新しいお題作成モードの開始
  // ------------------------------------------------------------------
  const startCreate = () => {
    setCurrentChallenge(null)
    setEditingId(null)
    setChallengeForm({
      title: "",
      description: "",
      word_limit: 500,
      num_questions: 50,
      randomize: true,
      deadline: new Date(),
    })
    setSelectedTime("23:59")
    setIsCreating(true)
    setSelectedQuestionIds([])
  }

  /** 既存お題を編集モードで開く */
  const startEdit = (ch: ChallengeRow) => {
    setCurrentChallenge(ch)
    setEditingId(ch.id)
    setChallengeForm({
      title: ch.title ?? "",
      description: ch.description ?? "",
      word_limit: ch.word_limit ?? 500,
      num_questions: (ch as any).num_questions ?? 50,
      randomize: (ch as any).randomize ?? true,
      deadline: ch.deadline ? new Date(ch.deadline) : new Date(),
    })
    setSelectedTime(
      ch.deadline
        ? format(new Date(ch.deadline), "HH:mm", { locale: ja })
        : "23:59",
    )
    setIsCreating(false)
    ;(async () => {
      const { data: cqRows, error } = await supabase
        .from("challenge_questions")
        .select("question_id")
        .eq("challenge_id", ch.id)
      if (!error) {
        setSelectedQuestionIds((cqRows ?? []).map((r: any) => r.question_id))
      }
    })()
  }

  // ------------------------------------------------------------------
  // お題の新規作成 / 更新
  // ------------------------------------------------------------------
  const handleChallengeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const creating = !currentChallenge || isCreating
    // 新規作成時にあとで state へ流し込むための一時変数
    let createdChallengeRow: ChallengeRow | null = null;

    try {
      const dateTime = new Date(challengeForm.deadline)
      const [h, m] = selectedTime.split(":").map(Number)
      dateTime.setHours(h, m)

      const base = {
        title: challengeForm.title,
        description: challengeForm.description,
        deadline: dateTime.toISOString(),
        type: grandType,          // 同義カラム (旧)
        category: grandType,      // ← UI で参照している category も常に同期
      }

      // Build payload per type
      let payload: Record<string, any> = { ...base }
      // ↓ type と category が食い違わないように念のため統一
      payload.type = grandType;
      payload.category = grandType;

      if (grandType === "webtest") {
        payload.num_questions = challengeForm.num_questions
        payload.randomize = challengeForm.randomize
        payload.word_limit = null
      } else {
        payload.word_limit = challengeForm.word_limit
      }

      let createdChallengeId: string
      if (creating) {
        // Supabase 型に合わせてキャスト
        const insertRows: Database["public"]["Tables"]["challenges"]["Insert"][] = [
          payload as Database["public"]["Tables"]["challenges"]["Insert"],
        ]

        const { data: newCh, error } = await supabase
          .from("challenges")
          .insert(insertRows) // array 形式で渡す
          .select()
          .single()

        if (error) throw error
        createdChallengeId = newCh!.id
        createdChallengeRow = newCh as ChallengeRow;   // ← state へ反映するため保持
      } else {
        const { error } = await supabase
          .from("challenges")
          .update(payload)
          .eq("id", currentChallenge!.id)
        if (error) throw error
        createdChallengeId = currentChallenge!.id
      }

      // ---------- challenge_questions へ追加 ----------
      // 1) 既に登録済みの question_id 一覧を取得
      //    新規作成時 (creating=true) はまだ存在しないので空配列にしておく
      const existingRows =
        creating
          ? []
          : (
              await supabase
                .from("challenge_questions")
                .select("question_id, order_no")
                .eq("challenge_id", createdChallengeId)
            ).data ?? [];

      const existingIds = new Set(
        (existingRows ?? []).map((r: any) => r.question_id as string)
      );

      // 2) UI で選択された question_id の重複を排除
      const uniqIds = Array.from(new Set(selectedQuestionIds));

      // 3) 既存に無いものだけ新規 INSERT する
      const newIds = uniqIds.filter((id) => !existingIds.has(id));

      // 📝 Debugging logs before insertion
      console.log("📝 selectedQuestionIds", selectedQuestionIds);
      console.log("📝 uniqIds", uniqIds);
      console.log("📝 newIds", newIds);

      if (newIds.length > 0) {
        // 既存行の最大 order_no を取得（NULL -> 0）
        const maxOrder = existingRows && existingRows.length
          ? Math.max(...existingRows.map((r: any) => r.order_no ?? 0))
          : 0;

        const rows = newIds.map((qid, idx) => ({
          challenge_id: createdChallengeId,
          question_id: qid,
          order_no: maxOrder + idx + 1, // 重複しない order_no
        }));

        // Insert and select the inserted rows for debug/visibility
        const { data: cqInserted, error } = await supabase
          .from("challenge_questions")
          .insert(rows)
          .select("challenge_id,question_id,order_no");   // ← representation for debug

        console.log("✅ challenge_questions inserted", cqInserted, "❌ error", error);

        if (error) throw error;

        // question_bank 側にも challenge_id をセット
        await supabase
          .from("question_bank")
          .update({ challenge_id: createdChallengeId })
          .in("id", newIds);
      }

      /* --- 新規作成直後にそのまま編集モードへ移行 --------------------- */
      if (creating && createdChallengeRow) {
        setCurrentChallenge(createdChallengeRow);
        setIsCreating(false);
        setEditingId(createdChallengeRow.id);
      }

      toast({
        title: creating ? "お題を公開しました" : "お題が更新されました",
        description: creating
          ? "現在公開中のお題として登録されました。"
          : "お題の内容が更新されました",
      })
      setIsCreating(false)
      setEditingId(null)
      fetchData()
    } catch (e: any) {
      console.error(e)
      toast({
        title: "お題の保存に失敗しました",
        description: e.message,
        variant: "destructive",
      })
    }
  }

  // ------------------------------------------------------------------
  // お題の削除
  // ------------------------------------------------------------------
  const confirmDelete = (challenge: ChallengeRow) => {
    setChallengeToDelete(challenge)
    setDeleteModalOpen(true)
  }

  const handleDeleteChallenge = async () => {
    if (!challengeToDelete) return

    try {
      const { error } = await supabase
        .from("challenges")
        .delete()
        .eq("id", challengeToDelete.id)

      if (error) throw error

      toast({
        title: "お題を削除しました",
        description: `「${challengeToDelete.title}」が削除されました`,
      })
      setDeleteModalOpen(false)
      setChallengeToDelete(null)
      fetchData()
    } catch (e: any) {
      console.error(e)
      toast({
        title: "削除に失敗しました",
        description: e.message,
        variant: "destructive",
      })
    }
  }

  // ------------------------------------------------------------------
  // 採点保存
  // ------------------------------------------------------------------
  const handleScoreSubmit = async () => {
    if (!scoringSubmission) return
    if (score === null || score < 0 || score > 100) {
      toast({
        title: "エラー",
        description: "スコアは0から100の間で入力してください。",
        variant: "destructive",
      })
      return
    }

    try {
      const { error: err } = await supabase
        .from("challenge_submissions")
        .update({ score, status: "採点済", comment: feedback })
        .eq("id", scoringSubmission.id)

      if (err) throw err

      // --- 通知作成 ----------------------------------------------------
      // 採点結果を学生へ通知 (notifications テーブルに INSERT)
      await supabase
        .from("notifications")
        .insert([
          {
            user_id: scoringSubmission.student_id,
            title: "グランプリの採点結果が届きました",
            message: `スコア: ${score} 点${feedback ? `\nフィードバック: ${feedback}` : ""}`,
            notification_type: "grandprix_feedback",
            related_id: scoringSubmission.id,
            channel: "in_app",
            url: `/grandprix/result/${scoringSubmission.id}`,
          } as Database["public"]["Tables"]["notifications"]["Insert"],
        ])

      toast({
        title: "採点が完了しました",
        description: `${
          scoringSubmission.student_profiles?.full_name ?? "学生"
        } の回答を採点しました。`,
      })
      setScoringModalOpen(false)
      fetchData()
    } catch (e: any) {
      console.error(e)
      toast({
        title: "採点に失敗しました",
        description: e.message,
        variant: "destructive",
      })
    }
  }

  // ------------------------------------------------------------------
  // モーダル
  // ------------------------------------------------------------------
  const openScoringModal = (sub: SubmissionRow) => {
    setScoringSubmission(sub)
    setScore(sub.score)
    setFeedback(sub.comment || "")
    setScoringModalOpen(true)
  }

  // ------------------------------------------------------------------
  // フィルタリング
  // ------------------------------------------------------------------
  const filteredSubmissions = submissions.filter((sub) => {
    if (filters.status !== "all" && sub.status !== filters.status)
      return false

    if (filters.scoreRange !== "all" && sub.score !== null) {
      if (filters.scoreRange === "90-100" && sub.score < 90) return false
      if (
        filters.scoreRange === "70-89" &&
        (sub.score < 70 || sub.score >= 90)
      )
        return false
      if (filters.scoreRange === "0-69" && sub.score >= 70) return false
    }

    if (
      filters.search &&
      !(
        (sub.student_profiles?.full_name ?? "")
          .toLowerCase()
          .includes(filters.search.toLowerCase()) ||
        sub.answer.toLowerCase().includes(filters.search.toLowerCase())
      )
    ) {
      return false
    }
    return true
  })

  // ------------------------------------------------------------------
  // 統計情報
  // ------------------------------------------------------------------
  const stats = {
    totalSubmissions: submissions.length,
    gradedSubmissions: submissions.filter((s) => s.status === "採点済").length,
    pendingSubmissions: submissions.filter((s) => s.status === "未採点").length,
    averageScore:
      submissions.filter((s) => s.score !== null).length > 0
        ? Math.round(
            submissions
              .filter((s) => s.score !== null)
              .reduce((sum, s) => sum + (s.score || 0), 0) /
              submissions.filter((s) => s.score !== null).length,
          )
        : 0,
  }

  // ------------------------------------------------------------------
  // ローディング
  // ------------------------------------------------------------------
  if (loading) {
    return (
      <div className="space-y-6 p-4">
        <Skeleton className="h-8 w-1/3" />
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent>
              <Skeleton className="h-6 mb-4" />
              <Skeleton className="h-40" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // ------------------------------------------------------------------
  // エラー
  // ------------------------------------------------------------------
  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertTitle>読み込みエラー</AlertTitle>
          <AlertDescription>
            {error}
            <div className="mt-2">
              <Button onClick={fetchData}>再読み込み</Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // ===================================================================
  // JSX
  // ===================================================================
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">グランプリ管理</h1>
      {/* 種別トグル */}
      <div className="mb-6 flex gap-4">
        <Select value={grandType} onValueChange={(v) => setGrandType(v as any)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Grand Prix Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="case">Case</SelectItem>
            <SelectItem value="webtest">WebTest</SelectItem>
            <SelectItem value="bizscore">戦闘力</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="challenge" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="challenge">お題の管理</TabsTrigger>
          <TabsTrigger value="submissions">提出された回答</TabsTrigger>
          <TabsTrigger value="past">過去のお題</TabsTrigger>
          <TabsTrigger value="questions">問題バンク</TabsTrigger>
        </TabsList>

        {/* --------------------------------------------------------- */}
        {/* Challenge 管理 */}
        {/* --------------------------------------------------------- */}
        <TabsContent value="challenge">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>
                {isCreating
                  ? "新しいお題を作成"
                  : currentChallenge
                  ? "お題を編集"
                  : "今月のお題の管理"}
              </CardTitle>
              <div className="flex gap-2 mt-4 sm:mt-0">
                {!isCreating && currentChallenge && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={startCreate}
                  >
                    キャンセル
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startCreate}
                >
                  新しいお題を作成
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleChallengeSubmit}
                className="space-y-4"
              >
                {/* タイトル */}
                <div className="space-y-2">
                  <Label htmlFor="title">お題のタイトル</Label>
                  <Input
                    id="title"
                    value={challengeForm.title}
                    onChange={(e) =>
                      setChallengeForm((p) => ({
                        ...p,
                        title: e.target.value,
                      }))
                    }
                    required
                  />
                </div>

                {/* 質問文 */}
                <div className="space-y-2">
                  <Label htmlFor="description">質問文</Label>
                  <Textarea
                    id="description"
                    value={challengeForm.description}
                    onChange={(e) =>
                      setChallengeForm((p) => ({
                        ...p,
                        description: e.target.value,
                      }))
                    }
                    className="min-h-[100px]"
                    required
                  />
                </div>

                {/* 文字数 */}
                {grandType !== "webtest" && (
                  <div className="space-y-2">
                    <Label htmlFor="wordLimit">文字数制限</Label>
                    <Input
                      id="wordLimit"
                      type="number"
                      value={challengeForm.word_limit}
                      onChange={(e) =>
                        setChallengeForm((p) => ({
                          ...p,
                          word_limit: +e.target.value,
                        }))
                      }
                      min={100}
                      max={1000}
                      required
                    />
                  </div>
                )}

                {grandType === "webtest" && (
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="space-y-2 flex-1">
                      <Label>出題数</Label>
                      <Input
                        type="number"
                        min={10}
                        max={100}
                        value={challengeForm.num_questions}
                        onChange={(e) =>
                          setChallengeForm((p) => ({
                            ...p,
                            num_questions: +e.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2 flex-1">
                      <Label>ランダム出題</Label>
                      <Select
                        value={challengeForm.randomize ? "yes" : "no"}
                        onValueChange={(v) =>
                          setChallengeForm((p) => ({
                            ...p,
                            randomize: v === "yes",
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="ランダム出題" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">はい</SelectItem>
                          <SelectItem value="no">いいえ</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* 締切 */}
                <div className="space-y-2">
                  <Label>締切日時</Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Popover
                      open={isDatePickerOpen}
                      onOpenChange={setIsDatePickerOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          {format(challengeForm.deadline, "PPP", {
                            locale: ja,
                          })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto p-0"
                        align="start"
                      >
                        <CalendarComponent
                          mode="single"
                          selected={challengeForm.deadline}
                          onSelect={(d) => {
                            if (d) {
                              setChallengeForm((p) => ({
                                ...p,
                                deadline: d,
                              }))
                              setIsDatePickerOpen(false)
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>

                    <Input
                      type="time"
                      value={selectedTime}
                      onChange={(e) =>
                        setSelectedTime(e.target.value)
                      }
                      className="w-full"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full sm:w-auto"
                >
                  {isCreating ? "お題を公開する" : "お題を更新する"}
                </Button>
                {/* 出題する問題の選択 */}
                <div className="space-y-2">
                  <Label>出題する問題を選択</Label>
                  {questionLoading ? (
                    <p className="text-sm text-muted-foreground">読み込み中…</p>
                  ) : questions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      この種別の問題が登録されていません
                    </p>
                  ) : (
                    <ScrollArea className="max-h-[200px] border rounded">
                      {questions.map((q) => (
                        <div
                          key={q.id}
                          className="flex items-start gap-2 p-2 border-b"
                        >
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={selectedQuestionIds.includes(q.id as string)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedQuestionIds((prev) => [
                                  ...prev,
                                  q.id as string,
                                ])
                              } else {
                                setSelectedQuestionIds((prev) =>
                                  prev.filter((id) => id !== (q.id as string)),
                                )
                              }
                            }}
                          />
                          <span className="text-sm">
                            {(q.stem ?? "").substring(0, 80)}
                            {(q.stem ?? "").length > 80 && "…"}
                          </span>
                        </div>
                      ))}
                    </ScrollArea>
                  )}
                </div>
              </form>
              {/* ===== 一覧 ===== */}
              {/* ---------- 現在公開中のお題 ---------- */}
              {currentChallenge ? (
                <div className="mb-8">
                  <h3 className="font-medium mb-2">現在公開中のお題</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 px-1 text-left">タイトル</th>
                        <th className="py-2 px-1 text-left">締切</th>
                        <th className="py-2 px-1 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b bg-muted/40">
                        <td className="py-2 px-1">{currentChallenge.title}</td>
                        <td className="py-2 px-1">
                          {currentChallenge.deadline
                            ? format(new Date(currentChallenge.deadline), "yyyy/MM/dd HH:mm")
                            : "－"}
                        </td>
                        <td className="py-2 px-1 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEdit(currentChallenge)}
                          >
                            編集
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="ml-2"
                            onClick={() => openPsModal(currentChallenge)}
                          >
                            問題セット
                          </Button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : null}

              {/* ---------- 今後公開予定のお題 ---------- */}
              <div>
                <h3 className="font-medium mb-2">公開予定のお題</h3>
                {upcomingChallenges.length === 0 ? (
                  <p className="text-sm text-muted-foreground">お題はありません</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 px-1 text-left">タイトル</th>
                        <th className="py-2 px-1 text-left">締切</th>
                        <th className="py-2 px-1 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {upcomingChallenges.map((ch) => (
                        <tr
                          key={ch.id}
                          className={`border-b ${editingId === ch.id ? "bg-muted/40" : ""}`}
                        >
                          <td className="py-2 px-1">{ch.title}</td>
                          <td className="py-2 px-1">
                            {ch.deadline
                              ? format(new Date(ch.deadline), "yyyy/MM/dd HH:mm")
                              : "－"}
                          </td>
                          <td className="py-2 px-1 text-right">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="mr-2"
                              onClick={() => openPsModal(ch)}
                            >
                              問題
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEdit(ch)}
                            >
                              編集
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --------------------------------------------------------- */}
        {/* Submissions Tab */}
        {/* --------------------------------------------------------- */}
        <TabsContent value="submissions">
          <Card>
            <CardHeader>
              <CardTitle>提出された回答一覧</CardTitle>
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <div className="relative flex-1">
                  <Input
                    placeholder="学生名または回答内容で検索"
                    value={filters.search}
                    onChange={(e) =>
                      setFilters((p) => ({ ...p, search: e.target.value }))
                    }
                    className="pl-8"
                  />
                </div>
                <Select
                  value={filters.status}
                  onValueChange={(v) => setFilters((p) => ({ ...p, status: v }))}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="ステータス" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    <SelectItem value="未採点">未採点</SelectItem>
                    <SelectItem value="採点済">採点済</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filters.scoreRange}
                  onValueChange={(v) =>
                    setFilters((p) => ({ ...p, scoreRange: v }))
                  }
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="スコア範囲" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    <SelectItem value="90-100">90–100点</SelectItem>
                    <SelectItem value="70-89">70–89点</SelectItem>
                    <SelectItem value="0-69">0–69点</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {/* Desktop */}
              <div className="hidden md:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="py-3 px-2 text-left">学生</th>
                      <th className="py-3 px-2 text-left">提出日時</th>
                      <th className="py-3 px-2 text-left">回答抜粋</th>
                      <th className="py-3 px-2 text-center">ステータス</th>
                      <th className="py-3 px-2 text-center">スコア</th>
                      <th className="py-3 px-2 text-right">アクション</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubmissions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-4">
                          該当する回答がありません
                        </td>
                      </tr>
                    ) : (
                      filteredSubmissions.map((sub) => (
                        <tr
                          key={sub.id}
                          className="border-b hover:bg-muted/50"
                        >
                          <td className="py-3 px-2">
                            <div className="font-medium">
                              {sub.student_profiles?.full_name ?? "－"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {sub.student_profiles?.university ?? ""}
                            </div>
                          </td>
                          <td className="py-3 px-2 text-sm">
                            {format(
                              new Date(sub.created_at!),
                              "yyyy/MM/dd HH:mm"
                            )}
                          </td>
                          <td className="py-3 px-2">
                            <p className="text-sm line-clamp-2">
                              {sub.answer.substring(0, 100)}…
                            </p>
                          </td>
                          <td className="py-3 px-2 text-center">
                            <Badge
                              variant={
                                sub.status === "採点済" ? "default" : "secondary"
                              }
                            >
                              {sub.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-2 text-center">
                            {sub.score ?? "-"}
                          </td>
                          <td className="py-3 px-2 text-right space-x-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => openAnswerModal(sub)}
                            >
                              回答を見る
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openScoringModal(sub)}
                            >
                              {sub.status === "採点済" ? "編集" : "採点する"}
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="md:hidden space-y-4">
                {filteredSubmissions.length === 0 ? (
                  <div className="text-center py-4">
                    該当する回答がありません
                  </div>
                ) : (
                  filteredSubmissions.map((sub) => (
                    <Card key={sub.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-medium">
                              {sub.student_profiles?.full_name ?? "－"}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {sub.student_profiles?.university ?? ""}
                            </p>
                          </div>
                          <Badge
                            variant={
                              sub.status === "採点済" ? "default" : "secondary"
                            }
                          >
                            {sub.status}
                          </Badge>
                        </div>
                        <div className="text-sm mb-2">
                          提出日時:{" "}
                          {format(
                            new Date(sub.created_at!),
                            "yyyy/MM/dd HH:mm"
                          )}
                        </div>
                        <p className="text-sm line-clamp-3 mb-3">
                          {sub.answer.substring(0, 100)}…
                        </p>
                        <div className="flex justify-between items-center gap-2">
                          {sub.score !== null ? (
                            <div className="font-medium">スコア: {sub.score}</div>
                          ) : (
                            <div className="text-muted-foreground">未採点</div>
                          )}
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openAnswerModal(sub)}
                          >
                            回答を見る
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openScoringModal(sub)}
                          >
                            {sub.status === "採点済" ? "編集" : "採点する"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Past Challenges */}
        <TabsContent value="past">
          <Card>
            <CardHeader>
              <CardTitle>過去のお題一覧</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Desktop */}
              <div className="hidden md:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="py-3 px-2 text-left">月</th>
                      <th className="py-3 px-2 text-left">お題</th>
                      <th className="py-3 px-2 text-center">提出数</th>
                      <th className="py-3 px-2 text-center">平均スコア</th>
                      <th className="py-3 px-2 text-right">アクション</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pastChallenges.map((ch) => (
                      <tr
                        key={ch.id}
                        className="border-b hover:bg-muted/50"
                      >
                        <td className="py-3 px-2">
                          {ch.deadline
                            ? format(new Date(ch.deadline), "yyyy年M月", { locale: ja })
                            : "－"}
                        </td>
                        <td className="py-3 px-2">{ch.title}</td>
                        <td className="py-3 px-2 text-center">
                          {ch.submissionsCount}
                        </td>
                        <td className="py-3 px-2 text-center">
                          {ch.avgScore}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              router.push(`/admin/grandprix/${ch.id}`)
                            }
                          >
                            詳細
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="md:hidden space-y-4">
                {pastChallenges.map((ch) => (
                  <Card key={ch.id}>
                    <CardContent className="p-4">
                      <div className="mb-2">
                        <div className="text-sm text-muted-foreground">
                          {ch.deadline
                            ? format(new Date(ch.deadline), "yyyy年M月", { locale: ja })
                            : "－"}
                        </div>
                        <h3 className="font-medium">{ch.title}</h3>
                      </div>
                      <div className="flex justify-between text-sm mb-3">
                        <div>提出数: {ch.submissionsCount}</div>
                        <div>平均スコア: {ch.avgScore}</div>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            router.push(`/admin/grandprix/${ch.id}`)
                          }
                        >
                          詳細
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --------------------------------------------------------- */}
        {/* Question Bank Tab */}
        {/* --------------------------------------------------------- */}
        <TabsContent value="questions">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>問題バンク（{grandType}）</CardTitle>
              <div className="flex gap-2 mt-4 sm:mt-0">
                {grandType === "webtest" && (
                  <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                    CSVアップロード
                  </Button>
                )}
                <Button size="sm" onClick={() => openQuestionModal(null)}>
                  新規追加
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {questionLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : questions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  この種別にはまだ問題が登録されていません
                </p>
              ) : (
                <ScrollArea className="max-h-[60vh]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b sticky top-0 bg-background">
                        <th className="py-2 px-1 text-left">#</th>
                        <th className="py-2 px-1 text-left">問題文</th>
                        {grandType === "webtest" && (
                          <th className="py-2 px-1 text-left">選択肢</th>
                        )}
                        <th className="py-2 px-1 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {questions.map((q, idx) => (
                        <tr key={q.id} className="border-b">
                          <td className="py-2 px-1">{idx + 1}</td>
                          <td className="py-2 px-1">
                            {(q.stem ?? "").substring(0, 60)}
                            {(q.stem ?? "").length > 60 && "…"}
                          </td>
                          {grandType === "webtest" && (
                            <td className="py-2 px-1">
                              {Array.isArray(q.choices)
                                ? q.choices.join(" / ")
                                : ""}
                            </td>
                          )}
                          <td className="py-2 px-1 text-right">
                            <Button size="sm" variant="outline" onClick={() => openQuestionModal(q)}>
                              編集
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* CSV upload input (hidden) */}
      <input
        type="file"
        accept=".csv"
        ref={fileInputRef}
        onChange={handleCsvUpload}
        className="hidden"
      />

      {/* 採点モーダル */}
      <Dialog open={scoringModalOpen} onOpenChange={setScoringModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>回答の採点</DialogTitle>
            {scoringSubmission && (
              <DialogDescription>
                <span className="font-medium">
                  {scoringSubmission.student_profiles?.full_name ?? "－"}
                </span>
                <span className="text-muted-foreground ml-1">
                  ({scoringSubmission.student_profiles?.university ?? "－"})
                </span>
                <br className="sm:hidden" />
                <span className="text-muted-foreground sm:ml-2">
                  提出日時:{" "}
                  {format(
                    new Date(scoringSubmission.created_at!),
                    "yyyy/MM/dd HH:mm"
                  )}
                </span>
              </DialogDescription>
            )}
          </DialogHeader>

          {scoringSubmission && (
            <>
              <div className="border rounded-md p-4 my-4 bg-muted/30">
                <h3 className="font-medium mb-2">回答内容:</h3>
                <p className="whitespace-pre-line">
                  {scoringSubmission.answer}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Label htmlFor="score">スコア (0–100)</Label>
                    <Input
                      id="score"
                      type="number"
                      value={score ?? ""}
                      onChange={(e) =>
                        setScore(e.target.value ? +e.target.value : null)
                      }
                      min={0}
                      max={100}
                      required
                    />
                  </div>
                  <div className="flex-1 flex items-end">
                    <div className="text-sm text-muted-foreground">
                      <div>評価基準:</div>
                      <div>90–100: 優れた回答</div>
                      <div>70–89: 良い回答</div>
                      <div>0–69: 改善が必要</div>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="feedback">フィードバック</Label>
                  <Textarea
                    id="feedback"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setScoringModalOpen(false)}
                >
                  キャンセル
                </Button>
                <Button onClick={handleScoreSubmit}>採点結果を保存</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Answer View Modal */}
      <Dialog open={answerModalOpen} onOpenChange={setAnswerModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>回答詳細</DialogTitle>
            {viewingSubmission && (
              <DialogDescription>
                {viewingSubmission.student_profiles?.full_name ?? "－"} /
                {viewingSubmission.student_profiles?.university ?? "－"}
                <span className="ml-2 text-muted-foreground">
                  提出日時:{" "}
                  {format(
                    new Date(viewingSubmission.created_at!),
                    "yyyy/MM/dd HH:mm"
                  )}
                </span>
              </DialogDescription>
            )}
          </DialogHeader>
          {viewingSubmission && (
            <div className="border rounded-md p-4 bg-muted/30 whitespace-pre-line">
              {viewingSubmission.answer}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnswerModalOpen(false)}>
              閉じる
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Question Edit Modal */}
      <Dialog open={qModalOpen} onOpenChange={setQModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingQ ? "問題を編集" : "新規問題を追加"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>問題文</Label>
              <Textarea
                value={qForm.stem}
                onChange={(e) => setQForm({ ...qForm, stem: e.target.value })}
                className="min-h-[120px]"
              />
            </div>

            {grandType === "webtest" && (
              <div className="space-y-2">
                <Label>選択肢</Label>
                {qForm.choices.map((c, i) => (
                  <Input
                    key={i}
                    value={c}
                    placeholder={`選択肢 ${i + 1}`}
                    onChange={(e) => {
                      const arr = [...qForm.choices]
                      arr[i] = e.target.value
                      setQForm({ ...qForm, choices: arr })
                    }}
                    className="mb-2"
                  />
                ))}
                <Label>正解番号 (1-4)</Label>
                <Input
                  type="number"
                  min={1}
                  max={4}
                  value={qForm.correct}
                  onChange={(e) => setQForm({ ...qForm, correct: +e.target.value })}
                />
              </div>
            )}

            {grandType === "bizscore" && (
              <div>
                <Label>重み</Label>
                <Input
                  type="number"
                  value={qForm.weight}
                  onChange={(e) => setQForm({ ...qForm, weight: +e.target.value })}
                  step="0.1"
                />
              </div>
            )}

            {grandType === "case" && (
              <div>
                <Label>想定キーワード (カンマ区切り)</Label>
                <Textarea
                  value={qForm.keywords}
                  onChange={(e) => setQForm({ ...qForm, keywords: e.target.value })}
                  className="min-h-[80px]"
                  placeholder="例) 市場規模, 競合分析, 三段論法"
                />
              </div>
            )}

            <div>
              <Label>表示順</Label>
              <Input
                type="number"
                value={qForm.order_no}
                onChange={(e) => setQForm({ ...qForm, order_no: +e.target.value })}
                min={1}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setQModalOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleQuestionSave}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}