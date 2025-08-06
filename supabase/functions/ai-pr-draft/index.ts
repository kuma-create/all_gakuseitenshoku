import OpenAI from "npm:openai@5.0.0-beta.0";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

// --- CORS ---
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Pre‑flight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // OpenAI API key is provided through environment variables (.env for local, secrets for prod)
  const apiKey = (Deno.env.get("OPENAI_API_KEY") ?? "").trim();

  // 🔒 If the key isn't set, return an explicit 500 so we don't crash the worker
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "OPENAI_API_KEY is missing" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const openai = new OpenAI({ apiKey });

  const { prompt } = await req.json();        // { prompt: {...} }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",                     // コスパ重視
    temperature: 0.7,
    max_tokens: 512,
    tools: [{
      type: "function",
      function: {
        name: "draftPR",
        description: "候補生成",
        parameters: {
          type: "object",
          properties: {
            title:  { type: "string" },
            body:   { type: "string" },
            length: { type: "integer" }
          },
          required: ["title", "body"]
        }
      }
    }],
    tool_choice: "auto",
    messages: [
      {
        role: "system",
        content:
          "You are a resume assistant for Japanese students. " +
          "Always return your answer strictly as a JSON object with keys: title, body, length.",
      },
      {
        role: "user",
        content:
          "以下の情報を JSON 形式で自己PRドラフトに整形してください: " +
          JSON.stringify(prompt),
      },
    ],
  });

  return new Response(JSON.stringify(completion.choices[0].message.tool_calls?.[0].function.arguments ?? {}), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});