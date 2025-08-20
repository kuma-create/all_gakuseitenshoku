"use client";

/* ------------------------------------------------------------------
   Case – 結果ページ (Mobile / Expo Router)
   /app/(student)/ipo/case/[category]/(session)/[sessionId]/result/index.tsx
------------------------------------------------------------------- */

import React, { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
} from "react-native";
import {
  Trophy,
  CheckCircle,
  XCircle,
} from "lucide-react-native";
import { WebView } from "react-native-webview";
import { supabase } from 'src/lib/supabase';
import type { Database } from "@/lib/supabase/types";

/* ---------- 型定義 ---------- */
type SubmissionRow = Database["public"]["Tables"]["challenge_submissions"]["Row"];
type WebTestQuestionRow = Database["public"]["Tables"]["question_bank"]["Row"];

/* ---------- util ---------- */
const fmtScore = (n: number | null | undefined) => (n != null ? n.toFixed(1) : "—");

/**
 * YouTube URL → 埋め込み用 src 変換
 * 変換できない場合は null を返す
 */
const toYoutubeEmbed = (raw: string | null): string | null => {
  if (!raw) return null;
  try {
    const url = new URL(raw);

    // youtu.be/<id>
    if (url.hostname === "youtu.be") {
      return `https://www.youtube.com/embed/${url.pathname.slice(1)}`;
    }

    // youtube.com/watch?v=<id>
    if (url.hostname.includes("youtube.com")) {
      const v = url.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;

      // 既に /embed/<id>
      if (url.pathname.startsWith("/embed/")) return raw;
    }
  } catch {
    /* ignore malformed URL */
  }
  return null;
};

export default function CaseResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string; sessionId?: string }>();
  const category = (params.category ?? "").toString();
  const sessionId = (params.sessionId ?? "").toString();
  const isWeb = category === "webtest";

  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState<SubmissionRow | null>(null);
  const [questions, setQuestions] = useState<WebTestQuestionRow[]>([]);
  const [caseQuestions, setCaseQuestions] = useState<WebTestQuestionRow[]>([]);
  const [answerUrl, setAnswerUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* ---------------- fetch ---------------- */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        // 1) submission 取得
        const { data: sub, error: subErr } = await supabase
          .from("challenge_submissions")
          .select("id, session_id, answer, answers, auto_score, final_score, challenge_id, created_at, updated_at")
          .eq("session_id", sessionId)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (subErr) throw subErr;
        if (!mounted) return;
        setSubmission(sub as SubmissionRow);

        if (isWeb) {
          const answerMap = (sub?.answers ?? {}) as Record<string, number>;
          const qIds = Object.keys(answerMap);
          if (qIds.length) {
            const { data: qs, error: qErr } = await supabase
              .from("question_bank")
              .select("id, stem, order_no, correct_choice")
              .in("id", qIds)
              .order("order_no", { ascending: true });
            if (qErr) throw qErr;
            if (!mounted) return;
            setQuestions((qs ?? []) as WebTestQuestionRow[]);
          }
        } else {
          if (sub?.challenge_id) {
            const { data: qs, error: qErr } = await supabase
              .from("challenge_questions")
              .select("order_no, question:question_bank(id, stem)")
              .eq("challenge_id", sub.challenge_id)
              .order("order_no");
            if (qErr) throw qErr;
            if (!mounted) return;
            const flattened = (qs ?? []).map((row: any) => row.question) as WebTestQuestionRow[];
            setCaseQuestions(flattened);
          }
          if (sub?.challenge_id) {
            const { data: ch, error: chErr } = await supabase
              .from("challenges")
              .select("answer_video_url")
              .eq("id", sub.challenge_id)
              .maybeSingle();
            if (chErr) throw chErr;
            if (!mounted) return;
            setAnswerUrl(ch?.answer_video_url ?? null);
          }
        }
      } catch (e: any) {
        setErrorMsg(e?.message ?? "読み込み中にエラーが発生しました");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [sessionId, isWeb]);

  /* ---------------- 集計 ---------------- */
  const correctCount = useMemo(() => {
    if (!isWeb || !submission) return 0;
    const ansMap = (submission.answers ?? {}) as Record<string, number>;
    return questions.reduce((acc, q) => acc + (ansMap[q.id] === q.correct_choice ? 1 : 0), 0);
  }, [isWeb, submission, questions]);

  const total = isWeb ? Object.keys((submission?.answers ?? {})).length : 0;
  const percentage = isWeb && total ? Math.round((correctCount / total) * 100) : 0;
  const score = submission?.final_score ?? submission?.auto_score ?? percentage;

  /* ---------------- 結果通知予定日 (Case/Bizscore) ---------------- */
  const resultNotice = useMemo(() => {
    if (isWeb || !submission?.created_at) return null;
    const d = new Date(submission.created_at);
    d.setDate(d.getDate() + 3);
    return d.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
  }, [isWeb, submission]);

  /* ---------------- Case / Bizscore free-text answer ---------------- */
  const freeTextAnswer = useMemo(() => {
    if (!submission) return "";
    const ans = submission.answer as unknown;
    if (typeof ans === "string") return ans;
    if (typeof ans === "object" && ans && (ans as any).text) {
      return (ans as any).text ?? "";
    }
    const answersJson = submission.answers as any;
    if (answersJson) {
      if (typeof answersJson.text === "string") return answersJson.text;
      if (typeof answersJson.answer === "string") return answersJson.answer;
    }
    return "";
  }, [submission]);

  /* ---------------- UI parts ---------------- */
  const ProgressBar = ({ value }: { value: number }) => (
    <View style={{ width: "100%", height: 10, backgroundColor: "#e5e7eb", borderRadius: 8 }}>
      <View
        style={{
          width: `${Math.max(0, Math.min(100, value))}%`,
          height: 10,
          backgroundColor: "#10b981",
          borderRadius: 8,
        }}
      />
    </View>
  );

  /* ---------------- ローディング ---------------- */
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f9fafb" }}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* ---- スコア概要 ---- */}
        <View style={{ backgroundColor: "#ffffff", borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
          <View style={{ backgroundColor: "#ecfdf5", paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center" }}>
            <Trophy size={22} color="#059669" />
            <Text style={{ marginLeft: 8, fontSize: 18, fontWeight: "700" }}>結果発表</Text>
          </View>

          <View style={{ padding: 16, gap: 12 as any }}>
            <Text style={{ color: "#6b7280" }}>あなたの {isWeb ? "Web テスト" : "診断"} 結果</Text>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              {isWeb && (
                <View style={{ alignItems: "center" }}>
                  <Text style={{ color: "#6b7280", fontSize: 12 }}>総得点</Text>
                  <Text style={{ fontSize: 32, fontWeight: "800", color: "#059669" }}>{fmtScore(score)}</Text>
                </View>
              )}

              {isWeb && (
                <>
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ color: "#6b7280", fontSize: 12 }}>正答数</Text>
                    <Text style={{ fontSize: 32, fontWeight: "800", color: "#059669" }}>
                      {correctCount}/{total}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <ProgressBar value={percentage} />
                    <Text style={{ marginTop: 4, textAlign: "right", color: "#4b5563", fontSize: 12 }}>正答率 {percentage}%</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>

        {/* ---- エラー表示 ---- */}
        {errorMsg ? (
          <View style={{ backgroundColor: "#fff1f2", padding: 12, borderRadius: 8, marginBottom: 16 }}>
            <Text style={{ color: "#b91c1c" }}>{errorMsg}</Text>
          </View>
        ) : null}

        {isWeb ? (
          /* ---- 問題別一覧 ---- */
          <View style={{ backgroundColor: "#ffffff", borderRadius: 12, padding: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", marginBottom: 12 }}>問題別 正誤一覧</Text>
            {questions.map((q, idx) => {
              const selected = (submission?.answers as Record<string, number>)[q.id];
              const isCorrect = selected === q.correct_choice;
              return (
                <View key={q.id} style={{ flexDirection: "row", gap: 12, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, padding: 12, marginBottom: 8 }}>
                  {isCorrect ? (
                    <CheckCircle size={20} color="#059669" />
                  ) : (
                    <XCircle size={20} color="#dc2626" />)
                  }
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "600" }}>問題 {idx + 1}</Text>
                    <Text style={{ marginTop: 4, color: "#374151", fontSize: 13 }} numberOfLines={3}>
                      {(q.stem ?? "")}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <>
            {/* ---- 採点・結果通知予定 ---- */}
            <View style={{ backgroundColor: "#ffffff", borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", marginBottom: 8 }}>結果通知について</Text>
              <Text style={{ color: "#374151", lineHeight: 20, fontSize: 13 }}>ご提出いただいた回答は運営側で採点後、結果をお知らせします。</Text>
              {resultNotice && (
                <Text style={{ marginTop: 6, color: "#111827", fontSize: 13 }}>
                  目安：<Text style={{ fontWeight: "700" }}>{resultNotice} まで</Text> にメールにて通知予定
                </Text>
              )}
            </View>

            {/* ---- 回答全文 (Case / Bizscore) ---- */}
            <View style={{ backgroundColor: "#ffffff", borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", marginBottom: 8 }}>あなたの回答</Text>
              {freeTextAnswer ? (
                <Text style={{ color: "#111827", lineHeight: 20, fontSize: 14 }}>
                  {freeTextAnswer}
                </Text>
              ) : (
                <View>
                  {caseQuestions.map((q, idx) => {
                    const rawChoice = (submission?.answers as Record<string, any> | undefined)?.[q.id];
                    const choice = typeof rawChoice === "object" ? rawChoice?.text ?? JSON.stringify(rawChoice) : rawChoice;
                    return (
                      <View key={q.id} style={{ marginBottom: 12 }}>
                        <Text style={{ fontWeight: "600" }}>Q{idx + 1}. {q.stem}</Text>
                        <Text style={{ marginTop: 4, color: "#111827" }}>あなたの回答: {choice ?? "—"}</Text>
                      </View>
                    );
                  })}
                  {caseQuestions.length === 0 && (
                    <Text style={{ color: "#6b7280" }}>回答データが見つかりません</Text>
                  )}
                </View>
              )}
            </View>
          </>
        )}

        {/* ---- 解説動画 ---- */}
        {answerUrl ? (
          <View style={{ backgroundColor: "#ffffff", borderRadius: 12, padding: 16, marginBottom: 24 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", marginBottom: 12 }}>解説動画</Text>
            {(() => {
              const embedSrc = toYoutubeEmbed(answerUrl);
              if (embedSrc) {
                return (
                  <View style={{ width: "100%", aspectRatio: 16 / 9, overflow: "hidden", borderRadius: 8 }}>
                    <WebView
                      source={{ uri: embedSrc }}
                      allowsFullscreenVideo
                      style={{ flex: 1 }}
                    />
                  </View>
                );
              }
              return (
                <TouchableOpacity onPress={() => Linking.openURL(answerUrl)} style={{ padding: 12, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, alignItems: "center" }}>
                  <Text>YouTubeで解説を見る</Text>
                </TouchableOpacity>
              );
            })()}
          </View>
        ) : null}

        {/* 戻るボタン（任意） */}
        <TouchableOpacity onPress={() => router.back()} style={{ alignSelf: "center", paddingVertical: 12, paddingHorizontal: 20 }}>
          <Text style={{ color: "#2563eb", fontWeight: "600" }}>戻る</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
