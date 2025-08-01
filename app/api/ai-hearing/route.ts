import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

/* -------------------------------------------------------------------------- */
/*                                Function 定義                                */
/* -------------------------------------------------------------------------- */
const FUNCTIONS = [
  {
    name: "updateField",
    description:
      "履歴書の 1 つのフィールドを更新する。質問が終わったら必ず呼び出す。",
    parameters: {
      type: "object",
      properties: {
        section: {
          type: "string",
          description:
            "セクションキー。例: basic, education, workExperience, skills, pr",
        },
        field: {
          type: "string",
          description: "フィールド名。例: firstName, university, companyName",
        },
        value: {
          description: "入力値。文字列・配列・真偽値のいずれか",
          anyOf: [
            { type: "string" },
            { type: "array", items: { type: "string" } },
            { type: "boolean" },
          ],
        },
      },
      required: ["section", "field", "value"],
    },
  },
];

/* -------------------------------------------------------------------------- */
/*                               System Prompt                                */
/* -------------------------------------------------------------------------- */
const SYSTEM_PROMPT = `
あなたは履歴書作成を支援する AI 面接官です。
未入力または不十分な項目のみを 1 つずつ質問し、ユーザの回答を確認したら
必ず "updateField" 関数を呼び出してください。
一度に複数の質問をしないでください。
回答が曖昧な場合は Yes/No などの再確認を挟んでください。
質問・回答ともに日本語（丁寧語）で行います。
`.trim();

/* -------------------------------------------------------------------------- */
/*                                   Handler                                  */
/* -------------------------------------------------------------------------- */
export async function POST(req: NextRequest) {
  try {
    const { messages, formData } = await req.json();

    // OpenAI Client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    // Chat Completion
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-0125",
      temperature: 0.2,
      stream: false,
      function_call: "auto",
      functions: FUNCTIONS,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...(messages ?? []),
        {
          role: "user",
          name: "form_state",
          content: `現時点のフォームデータ: ${JSON.stringify(formData)}`,
        },
      ],
    });

    return NextResponse.json(completion);
  } catch (error) {
    console.error("❌ /api/ai-hearing error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}