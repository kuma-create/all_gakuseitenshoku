// app/api/ai/generate-star/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  const { description, category } = await req.json();
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const prompt = `
あなたは就活の面接官です。次の「経験の説明」から、STARフレームワークの
- 困難・課題（S/T）
- 取り組み・行動（A）
- 結果・成果（R）
を日本語で各80〜120文字で要約してください。
カテゴリ: ${category}
説明: ${description}
出力はJSONで: {"challenge":"...", "action":"...", "result":"..."}
`.trim();

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4,
  });

  const text = completion.choices[0]?.message?.content ?? '{}';
  // LLMの出力が余計な文を含んでも耐性を持たせる
  const json = text.match(/\{[\s\S]*\}$/)?.[0] ?? '{}';
  try {
    const data = JSON.parse(json);
    return NextResponse.json({
      challenge: data.challenge,
      action: data.action,
      result: data.result,
    });
  } catch {
    return NextResponse.json({ }, { status: 200 }); // フロント側でフォールバック
  }
}