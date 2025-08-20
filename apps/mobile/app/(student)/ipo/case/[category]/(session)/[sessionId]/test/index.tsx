"use client";
// ------------------------------------------------------------------
// Mobile version (Expo Router / React Native)
// app/(student)/ipo/case/[category]/(session)/[sessionId]/test/index.tsx
// - Mirrors web logic for loading questions, timer, navigation, submit
// - UI is adapted to React Native primitives
// ------------------------------------------------------------------
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert as RNAlert,
  BackHandler,
} from "react-native";
import { supabase } from 'src/lib/supabase';
import type { Database } from "@/lib/supabase/types";

/* ---------- 型 ---------- */
type SessionAnswerRow = Database["public"]["Tables"]["session_answers"]["Row"];
type QuestionRow = Database["public"]["Tables"]["question_bank"]["Row"];

interface AnswerRow extends SessionAnswerRow {
  question: QuestionRow | null;
}

// Helper: MCQ (4択) 判定
const isMCQ = (q: any) => {
  if (!q) return false;
  const arr = Array.isArray(q.choices)
    ? q.choices.filter((x: any) => (typeof x === "string" ? x.trim().length > 0 : x != null))
    : [];
  const hasChoices = arr.length >= 2; // 2以上なら択一扱い
  const hasCorrect = Number.isInteger(q.correct_choice) && q.correct_choice >= 1 && q.correct_choice <= 4;
  return hasChoices && hasCorrect;
};

export default function MobileTestScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category: string; sessionId: string }>();
  const category = String(params.category ?? "");
  const sessionId = String(params.sessionId ?? "");

  /* ---------- state ---------- */
  const [sessionInfo, setSessionInfo] = useState<{ challenge_id: string | null; student_id: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const answersRef = useRef<Record<string, any>>({});
  const [current, setCurrent] = useState(0);
  const total = answers.length;
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  /* ---------- fetch ---------- */
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("session_answers")
        .select("*, question:question_bank(*)")
        .eq("session_id", sessionId)
        .order("question_id", { ascending: true, nullsFirst: false });

      if (error) {
        RNAlert.alert("エラー", error.message);
      } else {
        const rows = (data as AnswerRow[]).filter((r) => r.question);
        const filtered = category === "webtest" ? rows.filter((r) => isMCQ(r.question)) : rows;
        if (!mounted) return;
        setAnswers(filtered);
        answersRef.current = filtered.reduce<Record<string, any>>((acc, r) => {
          if (r.question_id) acc[r.question_id] = r.answer_raw;
          return acc;
        }, {});
      }

      // fallback: session_answers が無い場合
      if ((data as AnswerRow[]).length === 0) {
        const { data: sessRow, error: sessErr } = await supabase
          .from("challenge_sessions")
          .select("challenge_id")
          .eq("id", sessionId)
          .single();

        if (sessErr || !sessRow?.challenge_id) {
          RNAlert.alert("エラー", sessErr?.message ?? "challenge_id を取得できません");
        } else {
          const { data: cqRows, error: cqErr } = await supabase
            .from("challenge_questions")
            .select("question:question_bank(*)")
            .eq("challenge_id", sessRow.challenge_id)
            .order("order_no", { ascending: true });

          if (cqErr) {
            RNAlert.alert("エラー", cqErr.message);
          } else {
            const fallbackAnswers: AnswerRow[] = (cqRows ?? []).map((row: any) => ({
              session_id: sessionId,
              question_id: row.question?.id ?? "",
              answer_raw: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              question: row.question,
            })) as any;
            const fbFiltered = category === "webtest" ? fallbackAnswers.filter((r) => isMCQ(r.question)) : fallbackAnswers;
            if (!mounted) return;
            setAnswers(fbFiltered);
            answersRef.current = fbFiltered.reduce<Record<string, any>>((acc, r) => {
              if (r.question_id) acc[r.question_id] = r.answer_raw;
              return acc;
            }, {});
          }
        }
      }

      // started_at 取得 → deadline 計算 (40分)
      const { data: sess, error: sessErr2 } = await supabase
        .from("challenge_sessions")
        .select("started_at, challenge_id, student_id")
        .eq("id", sessionId)
        .maybeSingle();

      if (sessErr2) RNAlert.alert("エラー", sessErr2.message);

      if (sess) {
        setSessionInfo({ challenge_id: sess.challenge_id, student_id: sess.student_id });
      }

      const now = new Date();
      let start = sess?.started_at ? new Date(sess.started_at) : now;
      let dl = new Date(start.getTime() + 40 * 60 * 1000);

      // started_at が NULL なら現在時刻で設定
      if (!sess?.started_at) {
        await supabase.from("challenge_sessions").update({ started_at: now.toISOString() }).eq("id", sessionId);
        start = now;
        dl = new Date(now.getTime() + 40 * 60 * 1000);
      }
      // 期限超過ならリセット
      if (dl < now) {
        start = now;
        dl = new Date(now.getTime() + 40 * 60 * 1000);
      }

      if (!mounted) return;
      setDeadline(dl);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [sessionId, category]);

  /* ---------- Back ハンドリング (提出前の離脱警告) ---------- */
  useEffect(() => {
    const onBack = () => {
      if (!submitted) {
        RNAlert.alert("確認", "未提出です。ページを離れますか？", [
          { text: "キャンセル", style: "cancel" },
          { text: "離れる", style: "destructive", onPress: () => router.back() },
        ]);
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
    return () => sub.remove();
  }, [submitted, router]);

  /* ---------- timer ---------- */
  useEffect(() => {
    if (!deadline) return;
    const id = setInterval(() => {
      const sec = Math.max(0, Math.floor((deadline.getTime() - Date.now()) / 1000));
      setRemaining(sec);
      if (sec === 0) {
        clearInterval(id);
        handleSubmit();
      }
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline]);

  /* ---------- derived ---------- */
  const currentAnswer = answers[current];
  const progressPct = useMemo(() => (total ? ((current + 1) / total) * 100 : 0), [current, total]);
  const remainMin = Math.ceil(remaining / 60);

  /* ---------- 回答選択 ---------- */
  const handleAnswered = useCallback((qid: string, choice: number | string | null) => {
    setAnswers((prev) => prev.map((row) => (row.question_id === qid ? { ...row, answer_raw: choice } : row)));
    answersRef.current[qid] = choice;
  }, []);

  /* ---------- submit ---------- */
  const handleSubmit = useCallback(async () => {
    try {
      const answerMap: Record<string, any> = {};
      for (const [qid, val] of Object.entries(answersRef.current)) {
        if (val != null) answerMap[qid] = val;
      }

      if (Object.keys(answerMap).length !== answers.length) {
        const proceed = await new Promise<boolean>((resolve) => {
          RNAlert.alert(
            "確認",
            "未回答の問題があります。このまま提出しますか？（未回答は0点になります）",
            [
              { text: "キャンセル", style: "cancel", onPress: () => resolve(false) },
              { text: "提出する", onPress: () => resolve(true) },
            ]
          );
        });
        if (!proceed) return;
      }

      const challengeId =
        sessionInfo?.challenge_id ?? currentAnswer?.question?.challenge_id ?? null;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      let studentId = sessionInfo?.student_id ?? user?.id ?? null;
      if (!studentId) {
        const { data: sessRow2 } = await supabase
          .from("challenge_sessions")
          .select("student_id")
          .eq("id", sessionId)
          .single();
        studentId = sessRow2?.student_id ?? null;
      }

      let finalChallengeId = challengeId;
      if (!finalChallengeId) {
        const { data: sessRow } = await supabase
          .from("challenge_sessions")
          .select("challenge_id")
          .eq("id", sessionId)
          .single();
        finalChallengeId = sessRow?.challenge_id ?? null;
      }

      if (!finalChallengeId || !studentId) {
        RNAlert.alert("内部エラー", "challengeId または studentId が取得できません");
        return;
      }

      const correctCount = answers.reduce((cnt, row) => {
        const correct = (row.question as any)?.correct_choice; // 1-4
        return cnt + (row.answer_raw === correct ? 1 : 0);
      }, 0);
      const finalScore = correctCount;

      const { error: upsertErr } = await supabase.from("challenge_submissions").upsert(
        [
          {
            challenge_id: finalChallengeId!,
            student_id: studentId!,
            session_id: sessionId,
            answer: "",
            answers: answerMap as any,
            auto_score: category === "webtest" || category === "business" || category === "bizscore" ? finalScore : null,
            final_score: category === "webtest" || category === "business" || category === "bizscore" ? finalScore : null,
            status: category === "webtest" || category === "business" || category === "bizscore" ? "採点済み" : "未採点",
          },
        ],
        { onConflict: "session_id" }
      );

      if (!upsertErr) {
        await supabase.from("challenge_sessions").update({ score: finalScore }).eq("id", sessionId);
      }

      if (upsertErr) {
        RNAlert.alert("送信エラー", upsertErr.message ?? "送信に失敗しました (Upsert)");
        return;
      }

      setSubmitted(true);
      RNAlert.alert("完了", "提出が完了しました。採点結果を表示します。", [
        {
          text: "OK",
          onPress: () => router.replace(`/ipo/case/${category}/${sessionId}/result` as any),
        },
      ]);
    } catch (e: any) {
      RNAlert.alert("送信エラー", e?.message ?? "送信に失敗しました");
    }
  }, [answers, category, currentAnswer?.question?.challenge_id, router, sessionId, sessionInfo]);

  /* ---------- UI ---------- */
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f9fafb" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!currentAnswer?.question) {
    return (
      <View style={{ padding: 16 }}>
        <Text>問題が見つかりません</Text>
      </View>
    );
  }

  const remainStr = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      {/* Header */}
      <View style={{ height: 56, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb", paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#dc2626" }}>学生転職</Text>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#d1fae5", borderRadius: 9999 }}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: "#065f46" }}>残り {Math.ceil(remaining / 60)} 分 ({remainStr})</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Progress Header */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: "700" }}>{category === "webtest" ? "総合Webテスト" : "診断テスト"}</Text>
          <View style={{ marginTop: 8, flexDirection: "row", flexWrap: "wrap", alignItems: "center" }}>
            <Text style={{ marginRight: 12, color: "#6b7280" }}>問題: <Text style={{ color: "#111827", fontWeight: "600" }}>{current + 1}/{total}</Text></Text>
            {/* progress bar */}
            <View style={{ height: 8, width: 128, backgroundColor: "#e5e7eb", borderRadius: 9999, overflow: "hidden", marginRight: 12 }}>
              <View style={{ height: 8, width: `${progressPct}%`, backgroundColor: "#10b981" }} />
            </View>
            <Text style={{ color: "#6b7280" }}>残り {Math.ceil(remaining / 60)} 分</Text>
          </View>
        </View>

        {/* 注意 */}
        <View style={{ borderWidth: 1, borderColor: "#a7f3d0", backgroundColor: "#ecfdf5", padding: 12, borderRadius: 8, marginBottom: 16 }}>
          <Text style={{ fontWeight: "700", marginBottom: 4 }}>注意</Text>
          <Text>アプリを閉じたり再読み込みすると、回答が失われる可能性があります。</Text>
        </View>

        {/* 問題カード */}
        <View style={{ backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", marginBottom: 16 }}>
          <View style={{ padding: 12, backgroundColor: "#f9fafb", borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: "700" }}>問題 {current + 1}</Text>
            <Text style={{ color: "#6b7280", marginTop: 4 }}>以下の問いに対して、最も適切な答えを選んでください。</Text>
          </View>

          <View style={{ padding: 16 }}>
            {/* 質問文 */}
            <Text style={{ fontSize: 16, marginBottom: 12 }}>{(currentAnswer.question as any)?.text ?? ""}</Text>

            {/* 4択の描画 */}
            {Array.isArray((currentAnswer.question as any)?.choices) && (
              <View style={{ gap: 8 }}>
                {(currentAnswer.question as any).choices.map((label: string, i: number) => {
                  if (!label) return null;
                  const idx = i + 1;
                  const isSelected = currentAnswer.answer_raw === idx;
                  return (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => handleAnswered(currentAnswer.question_id!, idx)}
                      style={{
                        paddingVertical: 12,
                        paddingHorizontal: 12,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: isSelected ? "#10b981" : "#e5e7eb",
                        backgroundColor: isSelected ? "#ecfdf5" : "#fff",
                      }}
                    >
                      <Text style={{ fontWeight: isSelected ? "700" : "400" }}>{idx}. {label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* フッター操作 */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", padding: 12, borderTopWidth: 1, borderTopColor: "#e5e7eb", backgroundColor: "#f9fafb", borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
            <TouchableOpacity
              disabled={current === 0}
              onPress={() => setCurrent((p) => Math.max(0, p - 1))}
              style={{ opacity: current === 0 ? 0.5 : 1, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8 }}
            >
              <Text>前の問題</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => RNAlert.alert("保存", "一時保存しました")}
              style={{ paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8 }}
            >
              <Text>一時保存</Text>
            </TouchableOpacity>

            {current + 1 === total ? (
              <TouchableOpacity onPress={handleSubmit} style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, backgroundColor: "#dc2626" }}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>テスト終了・提出</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => setCurrent((p) => Math.min(total - 1, p + 1))}
                style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, backgroundColor: "#10b981" }}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>次の問題</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 問題番号ボタン */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, flex: 1 }}>
            {answers.map((_, idx) => {
              const isCurrent = idx === current;
              const isPast = idx < current;
              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setCurrent(idx)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 10,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: isCurrent ? "#10b981" : isPast ? "#e5e7eb" : "#e5e7eb",
                    backgroundColor: isCurrent ? "#10b981" : isPast ? "#f3f4f6" : "#fff",
                  }}
                >
                  <Text style={{ color: isCurrent ? "#fff" : "#111827", fontWeight: isCurrent ? "700" : "400" }}>{idx + 1}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity onPress={handleSubmit} style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, backgroundColor: "#dc2626", marginLeft: 8 }}>
            <Text style={{ color: "#fff", fontWeight: "700" }}>テスト終了・提出</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
