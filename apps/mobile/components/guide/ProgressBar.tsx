import { View, StyleSheet } from "react-native";

export const ProgressBar = ({ progress }: { progress: number }) => {
  const pct = Math.max(0, Math.min(1, progress));
  return (
    <View style={S.base}>
      <View style={[S.fill, { width: `${pct * 100}%` }]} />
    </View>
  );
};

const S = StyleSheet.create({
  base: {
    height: 8,
    backgroundColor: "#E2E8F0",
    borderRadius: 999,
    marginTop: 10,
    overflow: "hidden",
  },
  fill: {
    height: 8,
    backgroundColor: "#3B82F6",
    borderRadius: 999,
  },
});