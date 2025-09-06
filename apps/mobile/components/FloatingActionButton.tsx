import * as React from "react";
import { Pressable, Text, StyleSheet, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Brain } from "lucide-react-native";

type IconProps = { size?: number; color?: string };

type Props = {
  onPress: () => void;
  /** ボタンに表示するテキスト。テキスト不要なら "" か undefined を渡せばアイコンのみになります。 */
  label?: string;
  /** lucide-react-native 等のアイコンコンポーネントを渡す */
  Icon?: React.ComponentType<IconProps>;
  /** 画面の左右どちらに固定するか */
  position?: "right" | "left";
  /** セーフエリアに加算する下マージン(px) */
  bottomOffset?: number;
  /** 追加スタイル（色やサイズ調整用） */
  style?: ViewStyle;
  /** アクセシビリティ用ラベル */
  accessibilityLabel?: string;
  /** 無効化 */
  disabled?: boolean;
  /** ローディング中表示（簡易） */
  loading?: boolean;
  /** testID（E2E向け） */
  testID?: string;
};

export default function FloatingActionButton({
  onPress,
  label = "AIに相談する",
  Icon = Brain,
  position = "right",
  bottomOffset = 16,
  style,
  accessibilityLabel,
  disabled = false,
  loading = false,
  testID,
}: Props) {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(16, insets.bottom) + bottomOffset;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label ?? "Floating Action Button"}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        position === "right" ? styles.right : styles.left,
        { bottom },
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {Icon ? <Icon size={20} color="#fff" /> : null}
      {!!label && (
        <Text style={styles.labelText}>{loading ? "…" : label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 999,
    backgroundColor: "#111827", // slate-900 相当
    // Android
    elevation: 6,
    // iOS
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 999,
  },
  right: { right: 16 },
  left: { left: 16 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.5 },
  labelText: { color: "#fff", fontWeight: "600", marginLeft: 8 },
});