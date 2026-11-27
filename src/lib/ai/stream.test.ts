import { afterEach, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

afterEach(() => vi.unstubAllGlobals());

// Gemini's first chunk carries only the role; the stream must keep reading past it.
test("streamChat reads past chunks with no text", async () => {
  process.env.AI_API_KEY = "test";
  const sse = [
    'data: {"choices":[{"delta":{"role":"assistant"}}]}\n\n',
    'data: {"choices":[{"delta":{"content":"Сәлем"}}]}\n\n',
    'data: {"choices":[{"delta":{"content":", дос"}}]}\n\ndata: {"choices":[],"usage":{"prompt_tokens":3,"completion_tokens":2}}\n\n',
    "data: [DONE]\n\n",
  ];
  const enc = new TextEncoder();
  const body = new ReadableStream({ start: (c) => (sse.forEach((s) => c.enqueue(enc.encode(s))), c.close()) });
  vi.stubGlobal("fetch", vi.fn(async () => new Response(body)));
  const { streamChat } = await import("./index");
  let usage;
  const text = await new Response(await streamChat("sys", [{ role: "user", content: "q" }], (u) => (usage = u))).text();
  expect(text).toBe("Сәлем, дос");
  expect(usage).toEqual({ input_tokens: 3, output_tokens: 2 });
});
