import { NextResponse } from 'next/server';
import { generateText, convertToCoreMessages } from 'ai';
import { openai } from '@ai-sdk/openai';

export const runtime = 'nodejs'; // できる限り高速に

const errorPayload = (e: unknown) => {
  if (process.env.NODE_ENV === 'production') {
    return { error: 'Internal Server Error' };
  }
  // dev: できる限り詳細を返す
  return {
    error: (e as Error).message ?? 'Unknown error',
    stack: (e as Error).stack?.split('\n').slice(0, 5).join('\n'),
  };
};

export async function POST(req: Request) {
  const { messages = [], candidate, jobs = [] } = await req.json();

  // 候補者や求人が渡されていない場合でも落ちないようにデフォルト
  const candidateProfile: string =
    (candidate?.profile as string | undefined) ?? '';

  const jobListStr =
    jobs.length > 0
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

  // ---- ① システムメッセージとユーザーコンテキストを組み立て ----
  const systemPrompt = `
あなたは優秀で親しみやすいキャリアアドバイザーです。
以下の「候補者プロフィール」と「求人リスト」を参考に、
候補者に最適な 1〜2 件の求人を選び、その理由と追加のキャリアアドバイスを日本語で提供してください。

# 出力フォーマット
## 推薦求人
- **タイトル**: …
  - *推薦理由*: …
## キャリアアドバイス
- …
`.trim();

  const contextPrompt = `
[候補者プロフィール]
${candidateProfile}

[求人リスト]
${jobListStr}
`.trim();

  try {
    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      messages: [
        { role: 'user', content: contextPrompt },
        ...convertToCoreMessages(messages),
      ],
      temperature: 0.7,
      topP: 0.9,
      presencePenalty: 0.2,
      maxTokens: 600,
    });

    return NextResponse.json(text);
  } catch (err: any) {
    console.error('[chat-route] primary model error', err);

    // モデルが利用できない場合は 3.5 にフォールバック
    if (err.status === 404 || err.code === 'model_not_found') {
      try {
        const { text } = await generateText({
          model: openai('gpt-3.5-turbo'),
          system: systemPrompt,
          messages: [
            { role: 'user', content: contextPrompt },
            ...convertToCoreMessages(messages),
          ],
          temperature: 0.7,
          topP: 0.9,
          presencePenalty: 0.2,
          maxTokens: 600,
        });

        return NextResponse.json(text);
      } catch (fallbackErr) {
        console.error('[chat-route] fallback model error', fallbackErr);
        return NextResponse.json(errorPayload(fallbackErr), { status: 500 });
      }
    }

    return NextResponse.json(errorPayload(err), { status: 500 });
  }
}