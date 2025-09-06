import { Stack, useRouter } from "expo-router";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useGuideSteps } from "@/features/guide/useGuideSteps";
import { ProgressBar } from "components/guide/ProgressBar";
import { GuideBanner } from "components/guide/GuideBanner";

// ガイド内アクション定義（タイトルに応じて表示）
type StepAction = { label: string; to: string };
const getActionsForStep = (title: string): StepAction[] => {
  // STEP 1：自己理解・キャリアの方向性
  if (title.includes("自己理解") || title.includes("キャリア")) {
    return [
      { label: "AI自己分析をする", to: "/ipo/analysis" },
      { label: "自己分析のやり方（解説）", to: "/articles/self-analysis" },
      { label: "キャリア軸を決める（AI）", to: "/ipo/analysis?mode=career-axes" },
      { label: "キャリア軸の決め方（解説）", to: "/articles/career-axes" },
      { label: "就活スケジュールの基本", to: "/articles/schedule" },
      { label: "30分面談で一緒に作る", to: "/consult/booking?slot=30" },
      { label: "適職タイプ診断", to: "/tools/aptitude" },
      { label: "相談先を選ぶ（エージェント/内定者）", to: "/guide/consult-choice" },
    ];
  }
  // STEP 2：業界・企業研究
  if (title.includes("業界") || title.includes("企業研究")) {
    return [
      { label: "トレンド業界10選（ライブラリ）", to: "/library/industries/trends" },
      { label: "企業分析シートを作る", to: "/tools/company-sheet" },
    ];
  }
  // STEP 3：選考応募の準備
  if (title.includes("選考応募") || title.includes("応募") || title.includes("準備")) {
    return [
      { label: "新卒就活の流れ（解説）", to: "/articles/flow" },
      { label: "志望動機：書き方＋記入", to: "/writer/motivation" },
      { label: "自己PR：書き方＋記入", to: "/writer/selfpr" },
      { label: "ES質問集＋ES保管庫", to: "/library/es-questions" },
      { label: "アルバイト/長期インターンの活用（職歴入力）", to: "/resume/work" },
    ];
  }
  // STEP 4：選考対策
  if (title.includes("選考対策") || title.includes("面接") || title.includes("Webテスト")) {
    return [
      { label: "Webテスト（SPI/玉手箱）対策", to: "/library/tests" },
      { label: "ケース/構造化面接の練習", to: "/practice/interview" },
      { label: "面接の流れ（当日の動き）", to: "/articles/interview-flow" },
    ];
  }
  return [];
};

// アクションボタン（このファイル内限定の軽量コンポーネント）
const StepActionButton = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <TouchableOpacity style={S.action} onPress={onPress} activeOpacity={0.85}>
    <Text style={S.actionText}>{label}</Text>
  </TouchableOpacity>
);

export default function GuideHome() {
  const router = useRouter();
  const { steps, tasksByStep, progressByStep, goToFirstPending } = useGuideSteps();

  return (
    <View style={S.container}>
      <Stack.Screen options={{ title: "なるほど！就活ガイド" }} />
      <GuideBanner
        title="ステップで分かる！なるほど！就活ガイド"
        subtitle="進めるだけでプロフィールが“勝手に”仕上がる"
        ctaLabel="CHECK（かんたん診断）"
        onPress={() => router.push("/guide/check")}
      />
      <FlatList
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        data={steps}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => {
          const prog = progressByStep[item.id] ?? 0;
          const tasks = tasksByStep[item.id] ?? [];
          return (
            <TouchableOpacity
              style={S.card}
              onPress={() => router.push(goToFirstPending(item.id))}
              activeOpacity={0.8}
            >
              <Text style={S.cardTitle}>{item.title}</Text>
              {item.description ? <Text style={S.cardDesc}>{item.description}</Text> : null}
              <ProgressBar progress={prog} />
              <Text style={S.progressText}>{Math.round(prog * 100)}%・{tasks.filter(t=>t.done).length}/{tasks.length}</Text>
              {/* 推奨アクション群 */}
              <View style={S.actionsWrap}>
                {getActionsForStep(item.title).map((a) => (
                  <StepActionButton key={a.to} label={a.label} onPress={() => router.push(a.to)} />
                ))}
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}
const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  card: {
    backgroundColor: "#F5F9FF", borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: "#E6EEF9",
  },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#0F172A" },
  cardDesc: { fontSize: 12, color: "#64748B", marginTop: 4 },
  progressText: { fontSize: 12, color: "#475569", marginTop: 6 },
  actionsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  action: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#BFD8FF",
    backgroundColor: "#FFFFFF",
  },
  actionText: { fontSize: 12, color: "#1E293B", fontWeight: "500" },
});