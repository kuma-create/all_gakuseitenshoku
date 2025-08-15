"use client";

import React, { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Trophy, Users, Gift, CheckCircle, BarChart3, Clock } from "lucide-react-native";

/* ------------------------------------------------------------------
   NOTE: Remove reliance on `className` for styling (nativewind not required).
   Use StyleSheet and RN props so it renders correctly on web & native.
------------------------------------------------------------------- */

type BoxProps = React.ComponentProps<typeof View> & { style?: any };

const Card: React.FC<BoxProps> = ({ children, style, ...props }) => (
  <View {...props} style={[styles.card, style]}>{children}</View>
);

const CardContent: React.FC<BoxProps> = ({ children, style, ...props }) => (
  <View {...props} style={[styles.cardContent, style]}>{children}</View>
);

const CardHeader: React.FC<BoxProps> = ({ children, style, ...props }) => (
  <View {...props} style={[styles.cardHeader, style]}>{children}</View>
);

const Progress = ({ value = 0 }: { value?: number }) => (
  <View style={styles.progressOuter}>
    <View style={[styles.progressInner, { width: `${Math.max(0, Math.min(100, value))}%` }]} />
  </View>
);

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export default function CaseHomeMobile() {
  const router = useRouter();
  const params = useLocalSearchParams<{ section?: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const [sectionY, setSectionY] = useState<Record<string, number>>({});

  const saveY = (key: string) => (e: any) => {
    const y = e?.nativeEvent?.layout?.y ?? 0;
    setSectionY((prev) => ({ ...prev, [key]: y }));
  };

  // 初回：?section=leaderboard 等でジャンプ
  useEffect(() => {
    const key = params.section as string | undefined;
    if (!key) return;
    const t = setTimeout(() => {
      const y = sectionY[key] ?? 0;
      if (scrollRef.current) scrollRef.current.scrollTo({ y, animated: true });
    }, 120);
    return () => clearTimeout(t);
  }, [params.section, sectionY]);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
    >
      {/* ヘッダー */}
      <View style={styles.headerWrap}>
        <Text style={styles.kicker}>IPO</Text>
        <Text style={styles.h1}>ケース対策</Text>
        <Text style={styles.bodySmall}>
          ケース・Webテスト・面談対策をひとつの場所で。今の目的に合うメニューから始めましょう。
        </Text>
      </View>

      {/* サマリー 4枚 */}
      <View style={styles.vStack16}>
        <View style={styles.row16}>
          <Card style={styles.flex1}>
            <CardContent style={styles.centerItems}>
              <View style={[styles.iconWrap, { backgroundColor: "#dcfce7" }]}>
                <CheckCircle size={24} color="#16a34a" />
              </View>
              <Text style={styles.kpi}>—</Text>
              <Text style={styles.caption}>解答済み問題</Text>
            </CardContent>
          </Card>
          <Card style={styles.flex1}>
            <CardContent style={styles.centerItems}>
              <View style={[styles.iconWrap, { backgroundColor: "#dbeafe" }]}>
                <BarChart3 size={24} color="#2563eb" />
              </View>
              <Text style={styles.kpi}>—</Text>
              <Text style={styles.caption}>平均スコア</Text>
            </CardContent>
          </Card>
        </View>
        <View style={styles.row16}>
          <Card style={styles.flex1}>
            <CardContent style={styles.centerItems}>
              <View style={[styles.iconWrap, { backgroundColor: "#ede9fe" }]}>
                <Trophy size={24} color="#7c3aed" />
              </View>
              <Text style={styles.kpi}>—%</Text>
              <Text style={styles.caption}>完了率</Text>
            </CardContent>
          </Card>
          <Card style={styles.flex1}>
            <CardContent style={styles.centerItems}>
              <View style={[styles.iconWrap, { backgroundColor: "#ffedd5" }]}>
                <Clock size={24} color="#ea580c" />
              </View>
              <Text style={styles.kpi}>—</Text>
              <Text style={styles.caption}>総学習時間</Text>
            </CardContent>
          </Card>
        </View>
      </View>

      {/* 進捗（Webテスト/ケース） */}
      <View style={styles.vStack24}>
        <Card onLayout={saveY("webtest-progress")}> 
          <CardHeader>
            <SectionTitle>Webテスト進捗</SectionTitle>
          </CardHeader>
          <CardContent style={styles.vStack12}>
            <View style={styles.rowBetween}><Text style={styles.bodySmall}>言語理解</Text><Text style={styles.bodySmall}>—</Text></View>
            <Progress value={0} />
            <View style={styles.rowBetween}><Text style={styles.bodySmall}>数的処理</Text><Text style={styles.bodySmall}>—</Text></View>
            <Progress value={0} />
            <View style={styles.rowBetween}><Text style={styles.bodySmall}>論理推理</Text><Text style={styles.bodySmall}>—</Text></View>
            <Progress value={0} />
          </CardContent>
        </Card>

        <Card onLayout={saveY("case-progress")}>
          <CardHeader>
            <SectionTitle>ケース問題進捗</SectionTitle>
          </CardHeader>
          <CardContent style={styles.vStack12}>
            <View style={styles.rowBetween}><Text style={styles.bodySmall}>戦略系</Text><Text style={styles.bodySmall}>—</Text></View>
            <Progress value={0} />
            <View style={styles.rowBetween}><Text style={styles.bodySmall}>市場分析</Text><Text style={styles.bodySmall}>—</Text></View>
            <Progress value={0} />
            <View style={styles.rowBetween}><Text style={styles.bodySmall}>ビジネスモデル</Text><Text style={styles.bodySmall}>—</Text></View>
            <Progress value={0} />
          </CardContent>
        </Card>
      </View>

      {/* クイックアクション */}
      <View style={styles.vStack24}>
        <View style={styles.row16}>
          <Card style={styles.flex1}>
            <CardContent style={styles.centerItems}>
              <Users size={48} color="#059669" />
              <Text style={styles.cardTitle}>Webテストを解く</Text>
              <Text style={styles.cardSub}>言語・数的・論理問題に挑戦</Text>
              <Pressable onPress={() => router.push("/ipo/case/webtest")} style={styles.buttonWrap}>
                <View style={styles.buttonPrimary}>
                  <Text style={styles.buttonText}>開始</Text>
                </View>
              </Pressable>
            </CardContent>
          </Card>

          <Card style={styles.flex1}>
            <CardContent style={styles.centerItems}>
              <Trophy size={48} color="#0284c7" />
              <Text style={styles.cardTitle}>ケース問題を解く</Text>
              <Text style={styles.cardSub}>論理的思考力を鍛える</Text>
              <Pressable onPress={() => router.push("/ipo/case/case")} style={styles.buttonWrap}>
                <View style={styles.buttonPrimary}>
                  <Text style={styles.buttonText}>挑戦</Text>
                </View>
              </Pressable>
            </CardContent>
          </Card>
        </View>

        <Card style={{ opacity: 0.8 }}>
          <CardContent style={styles.centerItems}>
            <Gift size={48} color="#d97706" />
            <Text style={styles.cardTitle}>先行対策</Text>
            <Text style={styles.cardSub}>近日公開予定（Coming Soon）</Text>
            <View style={[styles.buttonWrap, { opacity: 0.7 }] }>
              <View style={[styles.buttonPrimary, { backgroundColor: "#9ca3af" }]}>
                <Text style={styles.buttonText}>準備中</Text>
              </View>
            </View>
          </CardContent>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#ffffff" },
  screenContent: { paddingHorizontal: 16, paddingVertical: 24 },

  headerWrap: { marginBottom: 16 },
  kicker: { fontSize: 10, fontWeight: "500", letterSpacing: 0.6, color: "#0284c7", textTransform: "uppercase" },
  h1: { marginTop: 4, fontSize: 28, fontWeight: "800", color: "#111827" },
  bodySmall: { marginTop: 4, fontSize: 13, color: "#4b5563" },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },

  vStack12: { rowGap: 12 },
  vStack16: { rowGap: 16 },
  vStack24: { marginTop: 24, rowGap: 16 },
  row16: { flexDirection: "row", columnGap: 16 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    // boxShadow works on web; RN warns about shadow* deprecation
    // Provide a subtle shadow without breaking native
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 0 },
  cardContent: { padding: 16 },

  flex1: { flex: 1 },
  centerItems: { alignItems: "center" },

  iconWrap: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  kpi: { fontSize: 22, fontWeight: "800", color: "#111827", marginBottom: 2 },
  caption: { fontSize: 12, color: "#6b7280" },

  progressOuter: { height: 8, width: "100%", borderRadius: 999, backgroundColor: "#e5e7eb", overflow: "hidden" },
  progressInner: { height: 8, borderRadius: 999, backgroundColor: "#111827" },

  cardTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginTop: 8 },
  cardSub: { fontSize: 12, color: "#6b7280", marginTop: 4, textAlign: "center" },

  buttonWrap: { width: "100%", marginTop: 12 },
  buttonPrimary: { width: "100%", alignItems: "center", justifyContent: "center", borderRadius: 8, paddingVertical: 10, backgroundColor: "#111827" },
  buttonText: { color: "#ffffff", fontSize: 14, fontWeight: "600" },
});
