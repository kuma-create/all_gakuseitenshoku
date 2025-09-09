import { Stack, useRouter } from "expo-router";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useState } from "react";
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

// --- トグルに表示する項目（画像準拠） ---
type StepListItem = { text: string; children?: string[] };
const getItemsForStep = (title: string): StepListItem[] => {
  // STEP 1：自己理解・キャリアの方向性
  if (title.includes("自己") || title.includes("キャリア")) {
    return [
      { text: "a. やりたい仕事がない・分からない", children: ["i. AI自己分析への誘導", "ii. 自己分析のやり方記事"] },
      { text: "b. キャリア軸を決めたい", children: ["i. AI自己分析への誘導", "ii. キャリア軸の決め方（解説）"] },
      { text: "c. 就活のスケジュールが分からない", children: ["i. スケジュール記載", "1. 30分面談の誘導"] },
      { text: "d. 適性検査/診断ツールで自分を知る", children: ["i. 職務タイプ診断への誘導"] },
      { text: "e. 就活について誰に相談する？", children: ["i. エージェント面談の案内", "ii. エージェント/内定者の選択支援"] },
    ];
  }
  // STEP 2：業界・企業研究
  if (title.includes("業界") || title.includes("企業研究")) {
    return [
      { text: "a. 業界・市場動向を把握しよう", children: ["i. 業界視点で見るトレンド業界10選", "1. ライブラリへの誘導"] },
      { text: "b. 企業分析", children: ["・企業分析シートを作る（機能）"] },
    ];
  }
  // STEP 3：選考応募の準備
  if (title.includes("ES") || title.includes("選考応募") || title.includes("応募") || title.includes("準備")) {
    return [
      { text: "a. 新卒就活の流れ（解説）" },
      { text: "b. 志望動機の書き方【例文付き】", children: ["i. そのまま志望動機記入ページに遷移"] },
      { text: "c. 自己PRの書き方【例文付き】", children: ["i. そのまま自己PR記載ページに遷移"] },
      { text: "d. よく聞かれる質問" },
      { text: "e. 面接で出やすい質問への誘導" },
      { text: "f. アルバイト/長期インターンの活用（職歴入力）", children: ["・職務経歴書記載画面に遷移"] },
    ];
  }
  // STEP 4：選考対策
  if (title.includes("選考対策") || title.includes("面接") || title.includes("Webテスト")) {
    return [
      { text: "a. Webテスト（SPI/玉手箱など）の攻略" },
      { text: "b. ケース面接・構造化面接の練習方法" },
      { text: "c. 面接の評価ポイント" },
      { text: "d. 固定の評価のポイント？" },
      { text: "e. よくある質問と解答例" },
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

// --- カード内トグルセクション ---
const ToggleSection = ({ title, stepTitle }: { title: string; stepTitle: string }) => {
  const [open, setOpen] = useState(false);
  const items = getItemsForStep(stepTitle);
  if (!items.length) return null;
  return (
    <View style={S.toggleWrap}>
      <TouchableOpacity onPress={() => setOpen(!open)} activeOpacity={0.8} style={S.toggleRow}>
        <Text style={S.toggleLabel}>{title}</Text>
        <Text style={S.toggleCaret}>{open ? "▲" : "▼"}</Text>
      </TouchableOpacity>
      {open && (
        <View style={S.listWrap}>
          {items.map((it, idx) => (
            <View key={idx} style={S.listItem}>
              <Text style={S.bullet}>•</Text>
              <Text style={S.itemText}>{it.text}</Text>
              {it.children && (
                <View style={S.childList}>
                  {it.children.map((c, j) => (
                    <View key={`${idx}-${j}`} style={S.childItem}>
                      <Text style={S.childBullet}>–</Text>
                      <Text style={S.childText}>{c}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

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
            <View style={S.card}>
              <Text style={S.cardTitle}>{item.title}</Text>
              {item.description ? <Text style={S.cardDesc}>{item.description}</Text> : null}
              <ProgressBar progress={prog} />
              <Text style={S.progressText}>{Math.round(prog * 100)}%・{tasks.filter(t=>t.done).length}/{tasks.length}</Text>
              <ToggleSection title="詳細を表示" stepTitle={item.title} />
              <TouchableOpacity style={S.linkBtn} onPress={() => router.push(goToFirstPending(item.id))}>
                <Text style={S.linkBtnText}>つづきを進める</Text>
              </TouchableOpacity>
              {/* 推奨アクション群 */}
              <View style={S.actionsWrap}>
                {getActionsForStep(item.title).map((a) => (
                  <StepActionButton key={a.to} label={a.label} onPress={() => router.push(a.to)} />
                ))}
              </View>
            </View>
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
  toggleWrap: { marginTop: 10, borderTopWidth: 1, borderTopColor: "#E6EEF9" },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10 },
  toggleLabel: { fontSize: 13, fontWeight: "600", color: "#0F172A" },
  toggleCaret: { fontSize: 12, color: "#64748B" },
  listWrap: { paddingTop: 4, paddingBottom: 6 },
  listItem: { flexDirection: "row", alignItems: "flex-start", marginTop: 6 },
  bullet: { width: 14, textAlign: "center", fontSize: 14, lineHeight: 18, color: "#475569" },
  itemText: { flex: 1, fontSize: 12, color: "#334155" },
  childList: { marginTop: 6, marginLeft: 14 },
  childItem: { flexDirection: "row", alignItems: "flex-start", marginTop: 4 },
  childBullet: { width: 12, textAlign: "center", fontSize: 12, lineHeight: 16, color: "#64748B" },
  childText: { flex: 1, fontSize: 11, color: "#475569" },
  linkBtn: { alignSelf: "flex-start", marginTop: 8, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: "#E7F1FF", borderWidth: 1, borderColor: "#BFD8FF" },
  linkBtnText: { fontSize: 12, color: "#1E293B", fontWeight: "600" },
});