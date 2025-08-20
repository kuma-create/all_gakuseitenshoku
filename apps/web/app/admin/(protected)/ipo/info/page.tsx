"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Loader2, Save, Plus, RefreshCw, Edit, Search, UploadCloud, List } from "lucide-react";

/** ---- Minimal fallback UI components (shadcn想定)。存在しない場合でも動くようにしておきます ---- */
function Row({ className = "", children }: any) { return <div className={`flex items-center gap-4 ${className}`}>{children}</div>; }
function Col({ className = "", children }: any) { return <div className={`flex flex-col gap-2 ${className}`}>{children}</div>; }
function Label({ children }: any) { return <label className="text-sm font-medium text-gray-700">{children}</label>; }
function Input(props: any) { return <input {...props} className={`border rounded px-3 py-2 w-full ${props.className||""}`} />; }
function Textarea(props: any) { return <textarea {...props} className={`border rounded px-3 py-2 w-full font-mono ${props.className||""}`} />; }
function Select(props: any) { return <select {...props} className={`border rounded px-3 py-2 w-full ${props.className||""}`} />; }
function Button({ loading, children, className = "", ...rest }: any) {
  return (
    <button {...rest} className={`inline-flex items-center gap-2 px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50 ${className}`}>
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
      {children}
    </button>
  );
}
function Card({ children, className = "" }: any) { return <div className={`rounded border bg-white ${className}`}>{children}</div>; }
function CardHeader({ children, className = "" }: any) { return <div className={`p-4 border-b ${className}`}>{children}</div>; }
function CardContent({ children, className = "" }: any) { return <div className={`p-4 ${className}`}>{children}</div>; }

/** ---- 型 ---- */
type Trend = "up" | "stable" | "down";
type ItemType = "industry" | "occupation";
type ItemRow = {
  id: string; // UUID
  name: string;
  type: ItemType;
  description: string | null;
  tags: string[] | null;
  popularity: number | null;
  trend: Trend | null;
  trend_score: number | null;
  details: any | null;
  created_at?: string;
};

export default function AdminIpoInfoPage() {
  const [me, setMe] = useState<{ id: string; email?: string } | null>(null);

  // フォーム
  const [id, setId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<ItemType>("industry");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string>(""); // comma区切り
  const [popularity, setPopularity] = useState<number>(50);
  const [trend, setTrend] = useState<Trend>("stable");
  const [trendScore, setTrendScore] = useState<number>(50);
  const [detailsText, setDetailsText] = useState<string>('{\n  "overview": "",\n  "keySkills": [],\n  "careerPath": []\n}');
  const [submitting, setSubmitting] = useState(false);

  // 検索/一覧
  const [q, setQ] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [items, setItems] = useState<ItemRow[]>([]);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((r) =>
      [r.name, r.type, r.description || "", (r.tags || []).join(",")].some((v) => (v || "").toLowerCase().includes(s))
    );
  }, [q, items]);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      if (data?.user) setMe({ id: data.user.id, email: data.user.email || undefined });
    });
    return () => { mounted = false; };
  }, []);

  // 一覧ロード
  const loadList = async () => {
    setLoadingList(true);
    const { data, error } = await supabase
      .from("ipo_library_items")
      .select("*")
      .order("created_at", { ascending: false, nullsFirst: false })
      .limit(50);
    if (error) {
      console.error("[admin/info] list error:", error.message);
      setItems([]);
    } else {
      setItems((data as any as ItemRow[]) || []);
    }
    setLoadingList(false);
  };
  useEffect(() => { loadList(); }, []);

  // 編集としてフォームに流し込む
  const loadIntoForm = (row: ItemRow) => {
    setId(row.id);
    setName(row.name);
    setType(row.type);
    setDescription(row.description || "");
    setTags((row.tags || []).join(","));
    setPopularity(row.popularity || 0);
    setTrend((row.trend || "stable") as Trend);
    setTrendScore(row.trend_score || 0);
    setDetailsText(JSON.stringify(row.details || {}, null, 2));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    setId(null);
    setName("");
    setType("industry");
    setDescription("");
    setTags("");
    setPopularity(50);
    setTrend("stable");
    setTrendScore(50);
    setDetailsText('{\n  "overview": "",\n  "keySkills": [],\n  "careerPath": []\n}');
  };

  // 送信
  const onSubmit = async (e: any) => {
    e.preventDefault();
    setSubmitting(true);
    let details: any = {};
    try {
      details = detailsText ? JSON.parse(detailsText) : {};
    } catch (err: any) {
      alert("details がJSONとして不正です: " + err.message);
      setSubmitting(false);
      return;
    }
    const payload = {
      ...(id ? { id } : {}), // id is UUID (string) when updating; omit for inserts
      name: name.trim(),
      type,
      description: description.trim() || null,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      popularity: Number(popularity) || 0,
      trend,
      trend_score: Number(trendScore) || 0,
      details,
    };

    // upsert (id 指定で更新、未指定なら新規)
    const { data, error } = await supabase
      .from("ipo_library_items")
      // 型衝突（bigint/Json/nullable等）を回避するため any で明示キャスト
      .upsert(payload as any, { onConflict: "id" })
      .select("*")
      .single();

    if (error) {
      console.error("[admin/info] upsert error:", error.message);
      alert("保存に失敗しました: " + error.message);
    } else {
      alert(`保存しました (id: ${data?.id})`);
      await loadList();
      // 新規作成後は編集モードに入る
      if (data?.id) setId(data.id);
    }
    setSubmitting(false);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <Card>
        <CardHeader>
          <Row className="justify-between">
            <div className="text-lg font-semibold">IPOライブラリ（業界/職種）管理</div>
            <Row className="text-sm text-gray-500">
              <List className="w-4 h-4" />
              <span>最近50件</span>
              <Button className="ml-2 bg-gray-700" onClick={loadList}>
                <RefreshCw className="w-4 h-4" />
                再読込
              </Button>
            </Row>
          </Row>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            <Row className="justify-between">
              <div className="text-sm text-gray-600">
                {me ? <>ログイン: <b>{me.email || me.id}</b></> : "未ログイン"}
              </div>
              <Row>
                <Button type="button" className="bg-gray-600" onClick={resetForm}>
                  <Plus className="w-4 h-4" /> 新規
                </Button>
                <Button type="submit" loading={submitting} className="ml-2">
                  <Save className="w-4 h-4" /> {id ? "更新" : "作成"}
                </Button>
              </Row>
            </Row>

            {id ? <div className="text-xs text-gray-500">編集対象ID: {id}</div> : null}

            <Col>
              <Label>名称</Label>
              <Input value={name} onChange={(e: any) => setName(e.target.value)} placeholder="例: コンサルティング / ソフトウェアエンジニア" required />
            </Col>

            <Row>
              <Col className="flex-1">
                <Label>タイプ</Label>
                <Select value={type} onChange={(e: any) => setType(e.target.value as ItemType)}>
                  <option value="industry">industry（業界）</option>
                  <option value="occupation">occupation（職種）</option>
                </Select>
              </Col>
              <Col className="w-40">
                <Label>人気度 (0-100)</Label>
                <Input type="number" min={0} max={100} value={popularity} onChange={(e: any) => setPopularity(Number(e.target.value))} />
              </Col>
              <Col className="w-48">
                <Label>トレンド</Label>
                <Select value={trend} onChange={(e: any) => setTrend(e.target.value as Trend)}>
                  <option value="up">up</option>
                  <option value="stable">stable</option>
                  <option value="down">down</option>
                </Select>
              </Col>
              <Col className="w-44">
                <Label>トレンドスコア (0-100)</Label>
                <Input type="number" min={0} max={100} value={trendScore} onChange={(e: any) => setTrendScore(Number(e.target.value))} />
              </Col>
            </Row>

            <Col>
              <Label>説明</Label>
              <Textarea rows={3} value={description} onChange={(e: any) => setDescription(e.target.value)} placeholder="概要説明" />
            </Col>

            <Col>
              <Label>タグ（カンマ区切り）</Label>
              <Input value={tags} onChange={(e: any) => setTags(e.target.value)} placeholder="例: 戦略, 業務改革, データ分析" />
            </Col>

            <Col>
              <Row className="justify-between">
                <Label>詳細(JSON)</Label>
                <span className="text-xs text-gray-500">例: {"{ \"overview\": \"...\", \"keySkills\": [\"...\"], ... }"}</span>
              </Row>
              <Textarea rows={12} value={detailsText} onChange={(e: any) => setDetailsText(e.target.value)} />
            </Col>

            <Row className="justify-end">
              <Button type="submit" loading={submitting}><Save className="w-4 h-4" /> {id ? "更新する" : "作成する"}</Button>
            </Row>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Row className="justify-between">
            <Row>
              <Search className="w-4 h-4" />
              <Input value={q} onChange={(e: any) => setQ(e.target.value)} placeholder="検索..." className="ml-2 w-72" />
            </Row>
            <div className="text-sm text-gray-500">{(filtered || []).length} / {(items || []).length} 件</div>
          </Row>
        </CardHeader>
        <CardContent>
          {loadingList ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> 読み込み中...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-gray-500">データがありません</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left">
                  <tr>
                    <th className="p-2">ID</th>
                    <th className="p-2">名称</th>
                    <th className="p-2">タイプ</th>
                    <th className="p-2">タグ</th>
                    <th className="p-2">人気</th>
                    <th className="p-2">Trend</th>
                    <th className="p-2 w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="p-2 font-mono text-xs truncate max-w-[12rem]" title={r.id}>{r.id}</td>
                      <td className="p-2">{r.name}</td>
                      <td className="p-2">{r.type}</td>
                      <td className="p-2">{(r.tags || []).slice(0, 4).join(", ")}</td>
                      <td className="p-2">{r.popularity ?? "-"}</td>
                      <td className="p-2">{r.trend ?? "-"}/{r.trend_score ?? "-"}</td>
                      <td className="p-2">
                        <Button className="bg-gray-700" onClick={() => loadIntoForm(r)}>
                          <Edit className="w-4 h-4" /> 編集
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-xs text-gray-500">
        注意: このページはクライアントから直接 `ipo_library_items` を upsert します。RLSで**管理者のみ書き込み可**にしてください。
      </div>
    </div>
  );
}