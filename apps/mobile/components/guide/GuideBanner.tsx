import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

type Props = {
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onPress?: () => void;
};

export const GuideBanner = ({ title, subtitle, ctaLabel, onPress }: Props) => {
  return (
    <View style={S.wrap}>
      <Text style={S.title}>{title}</Text>
      {subtitle && <Text style={S.subtitle}>{subtitle}</Text>}
      {ctaLabel && (
        <TouchableOpacity style={S.cta} onPress={onPress} activeOpacity={0.8}>
          <Text style={S.ctaText}>{ctaLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const S = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#E0F2FE",
    borderRadius: 12,
    marginVertical: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  subtitle: {
    fontSize: 13,
    color: "#334155",
    marginTop: 4,
  },
  cta: {
    alignSelf: "flex-start",
    backgroundColor: "#2563EB",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginTop: 10,
  },
  ctaText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
});