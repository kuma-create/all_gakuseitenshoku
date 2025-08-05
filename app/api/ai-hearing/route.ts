import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

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
    {
      name: "deleteField",
      description: "履歴書の 1 つのフィールドを削除する。",
      parameters: {
        type: "object",
        properties: {
          section: { type: "string", description: "セクションキー。例: basic, education, workExperience, skills, pr" },
          field:   { type: "string", description: "フィールド名。例: firstName, university, companyName" }
        },
        required: ["section", "field"]
      }
    },
    {
      name: "addWorkExperience",
      description: "work_experiences 配列に新しいオブジェクトを追加する。",
      parameters: {
        type: "object",
        properties: {
          experience: { type: "object", description: "追加する work_experience オブジェクト" }
        },
        required: ["experience"]
      }
    }
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
    // Accept both legacy `formData` and new `workExperiences` payloads
    const {
      messages = [],
      formData: incomingFormData = {},
      workExperiences = [],
    } = await req.json();

    // normalise into a single `formData` object the rest of the handler can use
    const formData: Record<string, any> = {
      ...incomingFormData,
      // keep both camelCase & snake_case for maximum compatibility
      workExperiences: Array.isArray(workExperiences)
        ? workExperiences
        : incomingFormData.workExperiences ?? [],
      work_experiences: Array.isArray(workExperiences)
        ? workExperiences
        : incomingFormData.work_experiences ?? [],
    };

    // OpenAI Client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    /* --------------------- Supabase client (user‑scoped) --------------------- */
    // 📝 `cookies()` is async in Next.js 15 — we need to await it
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("sb-access-token")?.value;

    // Reject if the user is not signed in
    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // RLS respected
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      },
    );

    // Resolve authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* ----------------- Fetch current DB state for the logged‑in user ----------------- */
    const { data: resumeRow } = await supabase
      .from("resumes")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const { data: profileRow } = await supabase
      .from("student_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // Merge DB state into formData so the model can "read" it
    if (resumeRow) {
      Object.assign(formData, resumeRow);
      if (resumeRow.work_experiences) {
        formData.work_experiences = resumeRow.work_experiences;
        formData.workExperiences = resumeRow.work_experiences;
      }
    }
    if (profileRow) {
      formData.studentProfile = profileRow;
    }

    // -------------------- applyUpdate (enhanced: array & alias support) --------------------
    const applyUpdate = (
      draft: Record<string, any>,
      section: string,
      field: string,
      value: any,
    ) => {
      // ---------------- Section alias normalisation ----------------
      const sectionAlias: Record<string, string> = {
        workExperience: "work_experiences",
        workExperiences: "work_experiences",
        workexperience: "work_experiences",
      };
      const normalizedSection = sectionAlias[section] ?? section;
      // ---------------- Field alias normalisation ----------------
      const fieldAlias: Record<string, string> = {
        jobDescription: "description",
        achievement: "achievements",
        achievements: "achievements",
        results: "achievements",
      };
      const normalizedField = fieldAlias[field] ?? field;

      /* ----------------------------------------------------------
       * 1. work_experiences など「配列」を想定したセクション
       *    - とりあえず 0 番目のオブジェクトを対象にする
       * ---------------------------------------------------------- */
      if (normalizedSection === "work_experiences") {
        if (!Array.isArray(draft.work_experiences)) {
          draft.work_experiences = [{}];
        }
        if (!draft.work_experiences[0]) {
          draft.work_experiences[0] = {};
        }
        draft.work_experiences[0][normalizedField] = value;
        // --- keep backward‑compatibility: also update the original section key ---
        if (normalizedSection !== section) {
          if (normalizedSection === "work_experiences") {
            // mirror array style back to camelCase "workExperiences"
            if (!Array.isArray(draft.workExperiences)) draft.workExperiences = [{}];
            if (!draft.workExperiences[0]) draft.workExperiences[0] = {};
            draft.workExperiences[0][normalizedField] = value;
          } else {
            if (typeof draft[section] !== "object" || draft[section] === null) {
              draft[section] = {};
            }
            draft[section][normalizedField] = value;
          }
        }
        return;
      }

      /* ----------------------------------------------------------
       * 2. オブジェクト想定の従来セクション
       * ---------------------------------------------------------- */
      if (typeof draft[normalizedSection] !== "object" || draft[normalizedSection] === null) {
        draft[normalizedSection] = {};
      }
      draft[normalizedSection][normalizedField] = value;
      // --- keep backward‑compatibility: also update the original section key ---
      if (normalizedSection !== section) {
        if (normalizedSection === "work_experiences") {
          // mirror array style back to camelCase "workExperiences"
          if (!Array.isArray(draft.workExperiences)) draft.workExperiences = [{}];
          if (!draft.workExperiences[0]) draft.workExperiences[0] = {};
          draft.workExperiences[0][normalizedField] = value;
        } else {
          if (typeof draft[section] !== "object" || draft[section] === null) {
            draft[section] = {};
          }
          draft[section][normalizedField] = value;
        }
      }
    };

    /* ------------------------------ deleteField helper ------------------------------ */
    const removeField = (
      draft: Record<string, any>,
      section: string,
      field: string,
    ) => {
      const sectionAlias: Record<string, string> = {
        workExperience: "work_experiences",
        workExperiences: "work_experiences",
        workexperience: "work_experiences",
      };
      const normalizedSection = sectionAlias[section] ?? section;

      const fieldAlias: Record<string, string> = {
        jobDescription: "description",
        achievement: "achievements",
        achievements: "achievements",
        results: "achievements",
      };
      const normalizedField = fieldAlias[field] ?? field;

      if (normalizedSection === "work_experiences") {
        if (Array.isArray(draft.work_experiences) && draft.work_experiences[0]) {
          delete draft.work_experiences[0][normalizedField];
        }
        if (Array.isArray(draft.workExperiences) && draft.workExperiences[0]) {
          delete draft.workExperiences[0][normalizedField];
        }
        return;
      }

      if (draft[normalizedSection]) delete draft[normalizedSection][normalizedField];
      if (draft[section]) delete draft[section][normalizedField];
    };

    /* -------------------------------- 1st completion -------------------------------- */
    const baseMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
      {
        role: "user",
        name: "form_state",
        content: `現時点のフォームデータ: ${JSON.stringify(formData)}`,
      },
    ];

    const firstCompletion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-0125",
      temperature: 0.2,
      stream: false,
      tools: FUNCTIONS.map((fn) => ({ type: "function", function: fn })),
      tool_choice: "auto",
      messages: baseMessages,
    });

    const assistantMessage = firstCompletion.choices[0].message;

    // Prepare a history that includes the assistant's tool_call message
    const enrichedMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      ...baseMessages,
      assistantMessage,
    ];

    // Clone formData so we can mutate safely
    const updatedFormData: Record<string, any> = JSON.parse(
      JSON.stringify(formData),
    );

    /* -------------------------- Execute tool‑calls (loop) ------------------------- */
    let completion = firstCompletion;
    let assistantMsg = assistantMessage;

    while (assistantMsg.tool_calls?.length) {
      for (const call of assistantMsg.tool_calls) {
        if (call.function.name === "updateField") {
          const { section, field, value } = JSON.parse(call.function.arguments ?? "{}");
          applyUpdate(updatedFormData, section, field, value);
        } else if (call.function.name === "deleteField") {
          const { section, field } = JSON.parse(call.function.arguments ?? "{}");
          removeField(updatedFormData, section, field);
        } else if (call.function.name === "addWorkExperience") {
          const { experience } = JSON.parse(call.function.arguments ?? "{}");
          if (!Array.isArray(updatedFormData.work_experiences)) updatedFormData.work_experiences = [];
          updatedFormData.work_experiences.push(experience);
          updatedFormData.workExperiences = updatedFormData.work_experiences; // camelCase mirror
        }

        // Echo a tool response so the model can continue
        enrichedMessages.push({
          role: "tool",
          tool_call_id: call.id,
          name: call.function.name,
          content: "OK",
        } as OpenAI.Chat.Completions.ChatCompletionMessageParam);
      }

      // Ask the model to continue after executing tool calls
      completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-0125",
        temperature: 0.2,
        stream: false,
        tools: FUNCTIONS.map((fn) => ({ type: "function", function: fn })),
        tool_choice: "auto",
        messages: enrichedMessages,
      });

      assistantMsg = completion.choices[0].message;
      enrichedMessages.push(assistantMsg);
    }

    /* ------------------------------- Persist & Return ------------------------------ */
    if (resumeRow) {
      await supabase
        .from("resumes")
        .update({
          work_experiences:
            updatedFormData.workExperiences ??
            updatedFormData.work_experiences ??
            [],
        })
        .eq("user_id", user.id);
    } else {
      await supabase
        .from("resumes")
        .insert([
          {
            user_id: user.id,
            work_experiences:
              updatedFormData.workExperiences ??
              updatedFormData.work_experiences ??
              [],
          },
        ]);
    }

    return NextResponse.json({
      // For backward‑compatibility with the old client:
      choices: [{ message: assistantMsg }], // so front‑end that expects choices[0].message still works
      // New, simpler fields:
      message: assistantMsg,
      workExperiences:
        updatedFormData.workExperiences ?? updatedFormData.work_experiences ?? [],
    });
  } catch (error) {
    console.error("❌ /api/ai-hearing error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}