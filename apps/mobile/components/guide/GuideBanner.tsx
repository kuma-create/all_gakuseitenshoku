import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export const GuideBanner = ({
  title, subtitle, ctaLabel, onPress,
}: { title: string; subtitle?: string; ctaLabel?: string; onPress?: () => void }) => {
  return (
    <View style={S.wrap}>
      <Text style={S.title}>{title}</Text>
      {subtitle ? <Text style={S.subtitle}>{subtitle}</Text> : null}
      {ctaLabel ? (
        <TouchableOpacity style={S.cta} onPress={onPress}>
          <Text style={S.ctaText}>{ctaLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};
const S = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, backgroundColor: "#E0F2FE" },
  title: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  subtitle: { fontSize: 12, color: "#334155", marginTop: 4 },
  cta: { alignSelf: "flex-start", backgroundColor: "#2563EB", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, marginTop: 8 },
  ctaText: { color: "#fff", fontWeight: "600", fontSize: 12 },
});