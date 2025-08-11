import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

export default function Home() {
  return (
    <View style={{ flex:1, alignItems:"center", justifyContent:"center", gap:12 }}>
      <Text style={{ fontSize:22, fontWeight:"700" }}>学生転職（モバイル）</Text>
      <Link href="../auth/login" asChild>
        <Pressable style={{ padding:12, borderRadius:8, borderWidth:1 }}>
          <Text>メールでログイン</Text>
        </Pressable>
      </Link>
      <Link href="/jobs" asChild>
        <Pressable style={{ padding:12, borderRadius:8, borderWidth:1 }}>
          <Text>新着求人を見る</Text>
        </Pressable>
      </Link>
    </View>
  );
}