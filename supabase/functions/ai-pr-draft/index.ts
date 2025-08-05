import OpenAI from "npm:openai@5.0.0-beta.0";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY")! });

serve(async (req) => {
  const { prompt } = await req.json();        // { prompt: {...} }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",                     // コスパ重視
    temperature: 0.7,
    max_tokens: 512,
    response_format: { type: "json_object" },
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
      { role: "system", content: "You are a resume assistant for Japanese students." },
      { role: "user",   content: JSON.stringify(prompt) }
    ]
  });

  return new Response(JSON.stringify(completion.choices[0].message.tool_calls?.[0].function.arguments ?? {}), {
    headers: { "Content-Type": "application/json" }
  });
});