import { useQuery } from "@tanstack/react-query";
import { FlatList, Text, View } from "react-native";
import { supabase } from "../../src/lib/supabase";

type JobItem = {
  id: string | number;
  title: string;
  company: string;
  location?: string | null;
  created_at?: string | null;
};

async function fetchLatestJobs(): Promise<JobItem[]> {
  const { data, error } = await supabase
    .from("jobs")
    .select(`id, title, created_at, location, companies ( name )`)
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;

  return (data ?? []).map((j: any) => ({
    id: j.id,
    title: j.title,
    location: j.location,
    company: j.companies?.name ?? "",
    created_at: j.created_at ?? null,
  }));
}

export default function Jobs() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["latest-jobs"],
    queryFn: fetchLatestJobs,
  });

  if (isLoading) return <View style={{padding:16}}><Text>読み込み中…</Text></View>;
  if (error)     return <View style={{padding:16}}><Text>読み込みエラー</Text></View>;

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={{ padding:16, gap:12 }}
      renderItem={({ item }) => (
        <View style={{ padding:12, borderRadius:8, borderWidth:1 }}>
          <Text style={{ fontWeight:"700" }}>{item.title}</Text>
          <Text>{item.company}</Text>
          {item.location ? <Text style={{ color:"#666" }}>{item.location}</Text> : null}
        </View>
      )}
    />
  );
}