import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { ChatCompletionMessageParam } from "openai/resources";

/** rudimentary keyword checker: did user explicitly ask for job suggestions? */
function userAskedForJobs(text: string): boolean {
  return /求人|仕事|ポジション|募集|紹介|応募|職探し/.test(text);
}

/* -------------------------------------------------------------------------- */
/*                        Utility Types & Environment Check                   */
/* -------------------------------------------------------------------------- */

type Intent =
  | 'career_coaching'     // キャリア全般の相談や壁打ち
  | 'job_recommendation'  // 求人提案
  | 'resume_brushup'      // 履歴書ブラッシュアップ
  | 'cv_brushup'          // 職務経歴書ブラッシュアップ
  | 'event_suggestion'    // イベント／その他提案
  | 'unknown';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing env: OPENAI_API_KEY');
}
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase env variables');
}

/* -------------------------------------------------------------------------- */
/*                         Shared OpenAI / Supabase Clients                   */
/* -------------------------------------------------------------------------- */

// ◆ service‑role (書込み専用)
const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);


const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

/* -------------------------------------------------------------------------- */
/*                              Intent Classifier                             */
/* -------------------------------------------------------------------------- */

/** Classify final user message into one of the supported intents */
async function classifyIntent(message: string): Promise<Intent> {
  const CLASSIFIER_PROMPT = `
あなたはユーザーの入力文を次のラベルのいずれかで分類して、必ず JSON 形式（キーは intent のみ）で返してください。

- career_coaching      : キャリア全般の相談や壁打ち
- job_recommendation   : 求人提案を求めている
- resume_brushup       : 履歴書のブラッシュアップ依頼
- cv_brushup           : 職務経歴書（職歴詳細）のブラッシュアップ依頼
- event_suggestion     : イベントやその他の提案依頼
`.trim();

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: CLASSIFIER_PROMPT },
      { role: 'user', content: message }
    ]
  });

  try {
    const messageContent = res.choices[0].message.content ?? '{}';
    const json = JSON.parse(messageContent);
    return (json.intent as Intent) ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

/* -------------------------------------------------------------------------- */
/*                       Function‑Calling: updateField tool                   */
/* -------------------------------------------------------------------------- */

const UPDATE_FIELD_TOOL = {
  name: 'updateField',
  description: '履歴書 / 職務経歴書の 1 フィールドを更新する',
  parameters: {
    type: 'object',
    properties: {
      section: { type: 'string', description: '例: basic, education, workExperience, skills, pr' },
      field: { type: 'string', description: '例: firstName, university, companyName' },
      value: {
        description: '入力値',
        anyOf: [
          { type: 'string' },
          { type: 'array', items: { type: 'string' } },
          { type: 'boolean' }
        ]
      }
    },
    required: ['section', 'field', 'value']
  }
} as const;

const DELETE_FIELD_TOOL = {
  name: "deleteField",
  description: "履歴書 / 職務経歴書の 1 フィールドを削除する",
  parameters: {
    type: "object",
    properties: {
      section: { type: "string", description: "例: basic, education, workExperience, skills, pr" },
      field: { type: "string", description: "例: firstName, university, companyName" }
    },
    required: ["section", "field"]
  }
} as const;

const ADD_WORK_TOOL = {
  name: "addWorkExperience",
  description: "work_experiences 配列に新しいオブジェクトを追加する",
  parameters: {
    type: "object",
    properties: {
      experience: { type: "object", description: "追加する work_experience オブジェクト" }
    },
    required: ["experience"]
  }
} as const;

/* ---------------- helper: applyUpdate (superset of旧ai‑hearing logic) --------------- */

function applyUpdate(
  draft: Record<string, any>,
  section: string,
  field: string,
  value: any
) {
  const sectionAlias: Record<string, string> = {
    workExperience: 'work_experiences',
    workExperiences: 'work_experiences',
    workexperience: 'work_experiences'
  };
  const fieldAlias: Record<string, string> = {
    jobDescription: 'description',
    achievement: 'achievements',
    achievements: 'achievements',
    results: 'achievements'
  };

  const normalizedSection = sectionAlias[section] ?? section;
  const normalizedField = fieldAlias[field] ?? field;

  // work_experiences は配列前提
  if (normalizedSection === 'work_experiences') {
    if (!Array.isArray(draft.work_experiences)) draft.work_experiences = [{}];
    if (!draft.work_experiences[0]) draft.work_experiences[0] = {};
    draft.work_experiences[0][normalizedField] = value;
    return;
  }

  if (typeof draft[normalizedSection] !== 'object' || draft[normalizedSection] === null) {
    draft[normalizedSection] = {};
  }
  draft[normalizedSection][normalizedField] = value;
}

/* ------------------------------ deleteField helper ------------------------------ */
function removeField(
  draft: Record<string, any>,
  section: string,
  field: string
) {
  const sectionAlias: Record<string, string> = {
    workExperience: "work_experiences",
    workExperiences: "work_experiences",
    workexperience: "work_experiences",
  };
  const fieldAlias: Record<string, string> = {
    jobDescription: "description",
    achievement: "achievements",
    achievements: "achievements",
    results: "achievements",
  };

  const normalizedSection = sectionAlias[section] ?? section;
  const normalizedField = fieldAlias[field] ?? field;

  if (normalizedSection === "work_experiences") {
    if (Array.isArray(draft.work_experiences) && draft.work_experiences[0]) {
      delete draft.work_experiences[0][normalizedField];
    }
    return;
  }

  if (draft[normalizedSection]) delete draft[normalizedSection][normalizedField];
}

/* -------------------------------------------------------------------------- */
/*                     Main Handler: Unified Chat End‑point                   */
/* -------------------------------------------------------------------------- */

export async function POST(req: NextRequest) {
  // ----------------------------------------------------------------------
  // Next.js 15: cookies() is async – call it *once* before any other await
  // ----------------------------------------------------------------------
  const cookieStore = await cookies();                 // ⚠️ await required
  // Pass a *sync* getter so the helper never calls cookies() after awaits
  const supabase = createRouteHandlerClient({
    cookies: () => cookieStore,
  });
  try {
    const {
      messages = [],
      userId,
      candidate = {},
      jobs = [],
      resumeText = '',
      cvText = '',
      formData = {},
      workExperiences = []
    } = await req.json();

    const lastUserMsg: string =
      (messages as any[]).slice().reverse().find((m) => m.role === 'user')?.content ?? '';

    /* ------------------------ 認証ユーザー取得 ------------------------ */
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loggedInUserId = user.id;

    /* --------------------------- 個人コンテキスト取得 --------------------------- */
    const { data: resumeCtx } = await supabaseService
      .from("resumes")
      .select("*")
      .eq("user_id", loggedInUserId)
      .single();

    const { data: profileCtx } = await supabaseService
      .from("student_profiles")
      .select("*")
      .eq("user_id", loggedInUserId)
      .single();

    const personalContextMsg: ChatCompletionMessageParam | null =
      resumeCtx || profileCtx
        ? {
            role: "user",
            name: "user_context",
            content: `ログインユーザー情報: ${JSON.stringify({
              resume: resumeCtx ?? null,
              profile: profileCtx ?? null,
            })}`,
          }
        : null;

    const attachContext = (hist: any[]): any[] =>
      personalContextMsg ? [...hist, personalContextMsg] : hist;

    const intent = await classifyIntent(lastUserMsg);

    // Guard: たとえ分類が job_recommendation でも、ユーザーが求人を希望していなければ
    // career_coaching として処理する
    let intentState = intent;
    if (intent === 'job_recommendation' && !userAskedForJobs(lastUserMsg)) {
      // force‑override
      intentState = 'career_coaching';
    }

    /* ----------------------------- Intent Routing ----------------------------- */

    // 1. Resume / CV interactive update flow (updateField tool)
    if (intentState === 'cv_brushup') {
      return await handleInteractiveUpdate(
        attachContext(messages),
        { workExperiences, formData },
        loggedInUserId
      );
    }

    // 2. Non-interactive generation flows
    switch (intentState) {
      case 'resume_brushup':
        return await respondWithBrushUp(
          attachContext(messages),
          resumeText || cvText,
          '履歴書',
          loggedInUserId
        );

      case 'cv_brushup':
        return await respondWithBrushUp(
          attachContext(messages),
          cvText || resumeText,
          '職務経歴書',
          loggedInUserId
        );

      case 'job_recommendation':
        return await respondWithJobRecommendation(
          attachContext(messages),
          candidate,
          jobs
        );

      case 'event_suggestion':
        return await respondWithEventIdeas(
          attachContext(messages)
        );

      case 'career_coaching':
      default:
        return await respondWithCareerCoaching(
          attachContext(messages)
        );
    }
  } catch (err: any) {
    console.error('[api/chat] fatal error:', err);
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === 'production'
            ? 'Internal Server Error'
            : err?.message ?? 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                             Response Strategies                            */
/* -------------------------------------------------------------------------- */

async function respondWithBrushUp(
  history: any[],
  rawText: string,
  docLabel: '履歴書' | '職務経歴書',
  userId?: string
) {
  const SYSTEM_PROMPT = `
あなたは優秀で親しみやすいキャリアアドバイザーです。
以下の${docLabel}（Markdown形式）を読み取り、読みやすさ・説得力・具体性を高めるために全面的にブラッシュアップしてください。

# 出力フォーマット
## 改善後の${docLabel}
...
## 改善ポイント
- 箇条書きで 3〜5 点
`.trim();

  const { choices } = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.7,
    max_tokens: 800,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: rawText || '（テキストが空です）' },
      ...history
    ]
  });

  const assistantMsg = choices[0].message;
  /* ---------- push improved Self‑PR into student_profiles ---------- */
  if (userId && docLabel === '履歴書') {
    // 抽出: 「## 改善後の履歴書」ブロックだけを取り出し
    const match =
      assistantMsg.content?.match(/##\s*改善後の履歴書\s*([\s\S]*?)##\s*改善ポイント/) ??
      assistantMsg.content?.match(/##\s*改善後の履歴書\s*([\s\S]*)/);
    const prText = match?.[1]?.trim() ?? '';

    // さらに「### 自己PR ...」ブロックだけを抽出（存在すれば）
    let prBody = prText;
    const prSectionMatch =
      prText.match(/###\s*自己PR\s*([\s\S]*?)(?=\n###|\n##\s*改善ポイント|$)/);
    if (prSectionMatch?.[1]) {
      prBody = prSectionMatch[1].trim();
    }

    if (prText) {
      await supabaseService
        .from('student_profiles')
        .upsert(
          { user_id: userId, pr_text: prBody, pr_body: prBody },
          { onConflict: 'user_id' }
        )
        .throwOnError();

      // --- also sync to resumes.form_data.pr_text ----------------------------
      const { data: resumeRow } = await supabaseService
        .from('resumes')
        .select('form_data')
        .eq('user_id', userId)
        .single();

      if (resumeRow) {
        await supabaseService
          .from('resumes')
          .update({
            form_data: {
              ...resumeRow.form_data,
              pr_text: prBody
            }
          })
          .eq('user_id', userId)
          .throwOnError();
      } else {
        await supabaseService
          .from('resumes')
          .upsert(
            {
              user_id: userId,
              form_data: { pr_text: prBody }
            },
            { onConflict: 'user_id' }
          )
          .throwOnError();
      }
    }
  }
  return NextResponse.json({
    text: assistantMsg.content,
    intent: docLabel === '履歴書' ? 'resume_brushup' : 'cv_brushup'
  });
}

async function respondWithJobRecommendation(
  history: any[],
  candidate: any,
  jobs: any[]
) {
  const SYSTEM_PROMPT = `
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

  const jobListStr =
    jobs.length > 0
      ? jobs
          .map(
            (j: { title: string; company: string; url: string; summary: string }, idx: number) =>
              `(${idx + 1}) 【${j.company}】${j.title}\n${j.summary}\nURL: ${j.url}`
          )
          .join('\n\n')
      : '（該当求人なし）';

  const contextPrompt = `
[候補者プロフィール]
${(candidate?.profile as string) ?? ''}

[求人リスト]
${jobListStr}
`.trim();

  const { choices } = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.7,
    max_tokens: 800,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: contextPrompt },
      ...history
    ]
  });

  const assistantMsg = choices[0].message;
  return NextResponse.json({
    text: assistantMsg.content,
    intent: 'job_recommendation'
  });
}

async function respondWithEventIdeas(history: any[]) {
  const SYSTEM_PROMPT = `
あなたは学生向けキャリアイベントに詳しいプロフェッショナルです。
ユーザーの悩みやニーズを踏まえ、参加すると有益そうなイベントやプログラムを最大 3 つ提案し、
それぞれの概要・得られるメリット・参加方法を説明してください。
`.trim();

  const { choices } = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.7,
    max_tokens: 600,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history
    ]
  });

  const assistantMsg = choices[0].message;
  return NextResponse.json({
    text: assistantMsg.content,
    intent: 'event_suggestion'
  });
}

async function respondWithCareerCoaching(history: any[]) {
  const SYSTEM_PROMPT = `
あなたは親身で実践的なキャリアコーチです。
ユーザーの相談内容を深掘りしながら、具体的な行動提案や視点の変え方を提示してください。
`.trim();

  const { choices } = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.7,
    max_tokens: 700,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history
    ]
  });

  const assistantMsg = choices[0].message;
  return NextResponse.json({
    text: assistantMsg.content,
    intent: 'career_coaching'
  });
}

/* -------------------------------------------------------------------------- */
/*                    Interactive update (updateField tool)                   */
/* -------------------------------------------------------------------------- */

async function handleInteractiveUpdate(
  history: any[],
  { workExperiences, formData }: { workExperiences: any[]; formData: any },
  userId?: string
) {
  const SYSTEM_PROMPT = `
あなたは履歴書・職務経歴書作成を支援する **AI 面接官** です。
## ルール
1. フォームの **未入力・不十分な項目** を 1 つ選び、その項目だけを深掘りする **質問を 1 つだけ** 投げる。
2. **ユーザーが十分な回答を返したら、説明文や助言を書かずに** ただちに \`updateField\`／\`deleteField\`／\`addWorkExperience\` のいずれかを **呼び出すだけ** を返信とする。
3. 1 回の応答に **複数の質問を含めない**。質問が不要な場合は質問をスキップしてすぐツールを呼び出す。
4. まだ不足情報がある場合は **1 つだけ質問** → 回答を受け取ったら **即ツール呼び出し** を繰り返す。
5. **汎用的なアドバイスや箇条書きの提案は禁止**。ツール呼び出し以外の出力は、質問文を除き出さない。
6. ツール呼び出しが完了したら、次の未入力項目へ進む。すべて埋まったら「完了しました」とだけ述べる。

# 出力形式
- **質問が必要**な場合: 通常の assistant メッセージ（日本語、丁寧語）で **1 つだけ質問**を記載。
- **ツール呼び出し**が必要な場合: content を空文字にし、function_call で \`updateField\` / \`deleteField\` / \`addWorkExperience\` を実行。
`.trim();

  /** Normalise incoming state */
  const draft: Record<string, any> = {
    ...formData,
    work_experiences: Array.isArray(workExperiences)
      ? workExperiences
      : formData.work_experiences ?? []
  };

  /* -------------------- DB current state -------------------- */
  const { data: resumeRow } = await supabaseService
    .from("resumes")
    .select("*")
    .eq("user_id", userId)
    .single();

  const { data: profileRow } = await supabaseService
    .from("student_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (resumeRow) {
    draft.work_experiences =
      resumeRow.work_experiences ?? draft.work_experiences ?? [];
    Object.assign(draft, resumeRow);
  }
  if (profileRow) {
    draft.studentProfile = profileRow;
  }

  /* ---------- Boot‑strap LLM with current state and tool definition ---------- */
  const baseMsgs: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    {
      role: 'user',
      name: 'form_state',
      content: `現時点のフォームデータ: ${JSON.stringify(draft)}`
    }
  ];

  let completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo-0125',
    temperature: 0.2,
    tools: [
      { type: "function", function: UPDATE_FIELD_TOOL },
      { type: "function", function: DELETE_FIELD_TOOL },
      { type: "function", function: ADD_WORK_TOOL }
    ],
    tool_choice: 'auto',
    messages: baseMsgs
  });

  const enriched: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    ...baseMsgs,
    completion.choices[0].message
  ];
  let assistantMsg = completion.choices[0].message;

  /* ------------------------ Loop until no more tool_calls ------------------- */
  while (assistantMsg.tool_calls?.length) {
    for (const call of assistantMsg.tool_calls) {
      if (call.function.name === "updateField") {
        const { section, field, value } = JSON.parse(call.function.arguments ?? "{}");
        applyUpdate(draft, section, field, value);
      } else if (call.function.name === "deleteField") {
        const { section, field } = JSON.parse(call.function.arguments ?? "{}");
        removeField(draft, section, field);
      } else if (call.function.name === "addWorkExperience") {
        const { experience } = JSON.parse(call.function.arguments ?? "{}");
        if (!Array.isArray(draft.work_experiences)) draft.work_experiences = [];
        draft.work_experiences.push(experience);
      }

      // echo tool response
      enriched.push({
        role: "tool",
        tool_call_id: call.id,
        name: call.function.name,
        content: "OK",
      } as OpenAI.Chat.Completions.ChatCompletionMessageParam);
    }

    completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo-0125',
      temperature: 0.2,
      tools: [
        { type: "function", function: UPDATE_FIELD_TOOL },
        { type: "function", function: DELETE_FIELD_TOOL },
        { type: "function", function: ADD_WORK_TOOL }
      ],
      tool_choice: 'auto',
      messages: enriched
    });

    assistantMsg = completion.choices[0].message;
    enriched.push(assistantMsg);
  }

  /* --------------------------- Persist to Supabase -------------------------- */
  if (userId) {
    /* ---------- 1. resumes: store only work_experiences ---------- */
    const resumePayload = {
      user_id: userId,
      work_experiences: draft.work_experiences ?? []
    };
    await supabaseService
      .from("resumes")
      .upsert(resumePayload, { onConflict: "user_id" });

    /* ---------- 2. student_profiles: store the rest ---------- */
    // Exclude work_experiences and helper-only fields
    const { work_experiences, studentProfile: _omit, ...profileFields } = draft;
    const profilePayload = { user_id: userId, ...profileFields };
    await supabaseService
      .from("student_profiles")
      .upsert(profilePayload, { onConflict: "user_id" });
  }

  return NextResponse.json({
    text: assistantMsg.content,
    workExperiences: draft.work_experiences ?? [],
    intent: 'cv_brushup'
  });
}