import { generateText, convertToCoreMessages } from 'ai';
import { openai } from '@ai-sdk/openai';

// Edge にするとレスポンスが速く、コールドスタートも小さいです
export const runtime = 'edge';

const errorPayload = (e: unknown) => {
  if (process.env.NODE_ENV === 'production') {
    return { error: 'Internal Server Error' };
  }
  return {
    error: (e as Error).message ?? 'Unknown error',
    stack: (e as Error).stack?.split('\n').slice(0, 5).join('\n'),
  };
};

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const {
      messages = [],
      mode = 'empathetic',
      candidate,
      jobs = [],
    }: {
      messages?: ChatMessage[];
      mode?: string;
      candidate?: { profile?: string } | null;
      jobs?: Array<{ title: string; company: string; url: string; summary: string }>;
    } = body ?? {};

    const candidateProfile: string = (candidate?.profile as string | undefined) ?? '';

    const jobListStr =
      Array.isArray(jobs) && jobs.length > 0
        ? jobs
            .map(
              (
                j: {
                  title: string;
                  company: string;
                  url: string;
                  summary: string;
                },
                idx: number
              ) =>
                `(${idx + 1}) 【${j.company}】${j.title}\n${j.summary}\nURL: ${j.url}`
            )
            .join('\n\n')
        : '（該当求人なし）';

    // ---- system / context ----
    // クライアントの期待に合わせて **JSON 形式** で返すようにモデルへ明示します。
    const systemPrompt = `
あなたは就活の自己分析・キャリア設計を支援する日本語AIコーチです。
回答は親しみやすく、簡潔かつ具体的に。ユーザーの状況に寄り添いながら、次の一歩を示してください。

必ず下記の **JSON 形式のみ** で出力してください（余計なテキストは一切含めないこと）：
{
  "content": "本文（Markdown可・日本語）",
  "category": "自己理解/価値観/経験分析/将来設計/感情整理/人間関係/キャリア/成長/挑戦 のいずれか（推奨）",
  "insights": ["気づき1", "気づき2"],
  "questions": ["深堀り質問1", "深堀り質問2"]
}

# モード（会話スタイル）
- 現在のモード: ${mode}
  - empathetic: 共感重視で受容的に
  - coaching: コーチング的に問いを返す
  - direct: 端的に要点と次アクションを示す
  - strategy: 就活戦略・選考対策を具体化
`.trim();

    const contextPrompt = `
[候補者プロフィール]
${candidateProfile || '（未入力）'}

[求人リスト]
${jobListStr}
`.trim();

    // ---- テキスト生成（JSON で返す） ----
    const result = await generateText({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      messages: [
        { role: 'user', content: contextPrompt },
        ...convertToCoreMessages(messages as any),
      ],
      temperature: 0.7,
      maxTokens: 700,
    });

    const text = result.text?.trim() || '';

    // モデル出力を JSON として解釈。失敗したら content に丸ごと格納。
    let payload: {
      content: string;
      category?: string;
      insights?: string[];
      questions?: string[];
    };
    try {
      const parsed = JSON.parse(text);
      payload = {
        content: typeof parsed.content === 'string' ? parsed.content : text,
        category: typeof parsed.category === 'string' ? parsed.category : undefined,
        insights: Array.isArray(parsed.insights) ? parsed.insights : undefined,
        questions: Array.isArray(parsed.questions) ? parsed.questions : undefined,
      };
    } catch {
      payload = {
        content: text || 'すみません、もう一度お願いできますか？',
      };
    }

    // 最低限のフェイルセーフ：空ならデフォルト文
    if (!payload.content || typeof payload.content !== 'string') {
      payload.content = 'すみません、うまく受け取れませんでした。もう少し具体的に教えてください。';
    }

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[api/chat] error', err);
    return new Response(JSON.stringify(errorPayload(err)), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}