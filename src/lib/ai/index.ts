// The only place that talks to an AI provider. Server-only.
// Every supported provider speaks the OpenAI-compatible chat API, so one fetch covers them:
//   AI_PROVIDER=gemini  → Google Gemini (free tier, key from aistudio.google.com)
//   AI_PROVIDER=groq    → Groq (free tier, key from console.groq.com)
//   AI_PROVIDER=openai  → any OpenAI-compatible endpoint, set AI_BASE_URL
// AI_MOCK=true skips all of this and returns rule-based demo answers.
import "server-only";
import type { z } from "zod";

const BASE_URLS: Record<string, string> = {
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai",
  groq: "https://api.groq.com/openai/v1",
};

export const isMock = () => process.env.AI_MOCK === "true" || !process.env.AI_API_KEY;

export class AiError extends Error {
  constructor(public userMessage: string, detail?: string) {
    super(detail ?? userMessage);
  }
}

export type Usage = { input_tokens: number; output_tokens: number };
type Msg = { role: "system" | "user" | "assistant"; content: string };

function config() {
  const provider = process.env.AI_PROVIDER ?? "gemini";
  const baseUrl = process.env.AI_BASE_URL || BASE_URLS[provider];
  const model = process.env.AI_MODEL;
  if (!baseUrl || !model) throw new AiError("ЖИ бапталмаған. Әкімшіге хабарлаңыз.", "AI_PROVIDER/AI_BASE_URL or AI_MODEL missing");
  return { baseUrl, model, key: process.env.AI_API_KEY! };
}

async function call(body: object) {
  const { baseUrl, model, key } = config();
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, ...body }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (e) {
    throw new AiError("ЖИ-ге қосылу мүмкін болмады. Интернетті тексеріп, қайта көріңіз.", String(e));
  }
  if (res.status === 429) throw new AiError("ЖИ қазір бос емес (сұрау шегі). Бір минуттан кейін қайта көріңіз.", await res.text());
  if (!res.ok) throw new AiError("ЖИ жауап бермеді. Сәлден кейін қайта көріңіз.", `${res.status} ${await res.text()}`);
  return res;
}

/** Asks for JSON and validates it with zod; one retry with the validation error if it does not fit. */
export async function generateJson<T>(system: string, user: string, schema: z.ZodType<T>): Promise<{ data: T; usage: Usage }> {
  const messages: Msg[] = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
  const usage: Usage = { input_tokens: 0, output_tokens: 0 };
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await call({ messages, response_format: { type: "json_object" }, temperature: 0.4 });
    const json = await res.json();
    usage.input_tokens += json.usage?.prompt_tokens ?? 0;
    usage.output_tokens += json.usage?.completion_tokens ?? 0;
    const choice = json.choices?.[0];
    if (choice?.finish_reason === "length") throw new AiError("ЖИ жауабы тым ұзын болып кесіліп қалды. Тапсырма санын азайтып көріңіз.");
    if (choice?.finish_reason === "content_filter") throw new AiError("ЖИ бұл сұрауға жауап беруден бас тартты. Материалды тексеріңіз.");
    const text: string = choice?.message?.content ?? "";
    let parsed: unknown;
    try {
      parsed = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ""));
    } catch {
      parsed = undefined;
    }
    const result = schema.safeParse(parsed);
    if (result.success) return { data: result.data, usage };
    messages.push({ role: "assistant", content: text });
    messages.push({ role: "user", content: `Жауап схемаға сай емес: ${result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}. Тек түзетілген JSON қайтар.` });
  }
  throw new AiError("ЖИ дұрыс пішімде жауап бермеді. Қайта көріңіз.");
}

/** Streams chat text chunks. onDone receives token usage when the provider reports it. */
export async function streamChat(system: string, history: Msg[], onDone: (u: Usage) => void): Promise<ReadableStream<Uint8Array>> {
  const res = await call({
    messages: [{ role: "system", content: system }, ...history],
    stream: true,
    stream_options: { include_usage: true },
    temperature: 0.5,
  });
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  const enc = new TextEncoder();
  let buf = "";
  const usage: Usage = { input_tokens: 0, output_tokens: 0 };
  return new ReadableStream({
    async pull(ctrl) {
      const { done, value } = await reader.read();
      if (done) {
        onDone(usage);
        ctrl.close();
        return;
      }
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") continue;
        try {
          const j = JSON.parse(data);
          if (j.usage) {
            usage.input_tokens = j.usage.prompt_tokens ?? 0;
            usage.output_tokens = j.usage.completion_tokens ?? 0;
          }
          const delta = j.choices?.[0]?.delta?.content;
          if (delta) ctrl.enqueue(enc.encode(delta));
        } catch {
          /* partial or keep-alive line */
        }
      }
    },
    cancel() {
      reader.cancel();
    },
  });
}

/** Streams a fixed text word by word, so demo mode looks like the real thing. */
export function streamText(text: string): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  const parts = text.split(/(?<= )/);
  let i = 0;
  return new ReadableStream({
    async pull(ctrl) {
      if (i >= parts.length) return ctrl.close();
      await new Promise((r) => setTimeout(r, 35));
      ctrl.enqueue(enc.encode(parts[i++]));
    },
  });
}
