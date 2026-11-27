import { z } from "zod";
import { getUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { AiError, isMock, streamChat, streamText } from "@/lib/ai";
import { chatSystem } from "@/lib/ai/prompts/chat";
import { personaSystem } from "@/lib/ai/prompts/persona";
import { mockChat, mockPersona } from "@/lib/ai/mock";
import { resolveContext } from "@/lib/chat-context";
import { checkMessage } from "@/lib/safety";
import { aiUsedToday as usedToday, logAiRequest, STUDENT_LIMIT as LIMIT } from "@/lib/ai-quota";


const text = (message: string, status: number) => Response.json({ error: message }, { status });

export async function GET(req: Request) {
  const user = await getUser();
  if (user?.role !== "student") return text("Кіру керек.", 401);
  const path = new URL(req.url).searchParams.get("path") ?? "/";
  const ctx = await resolveContext(user, path);
  return Response.json({ mode: ctx.mode, title: ctx.title ?? null, remaining: Math.max(0, LIMIT - (await usedToday(user.id))) });
}

const Body = z.object({
  path: z.string().max(300),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(2000) }))
    .min(1)
    .max(30),
});

export async function POST(req: Request) {
  const user = await getUser();
  if (user?.role !== "student") return text("Кіру керек.", 401);
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return text("Сұрау дұрыс емес.", 400);

  const history = body.data.messages.slice(-10);
  const last = history[history.length - 1];
  if (last.role !== "user") return text("Сұрау дұрыс емес.", 400);
  // Filter every user message, not only the last one: history comes from the browser.
  for (const m of history.filter((m) => m.role === "user")) {
    const check = checkMessage(m.content);
    if (!check.ok) return text(check.message, 422);
  }

  const ctx = await resolveContext(user, body.data.path);
  if (ctx.mode === "off") return text("Бұл тапсырмада мұғалім ЖИ көмекшісін өшірген.", 403);
  if ((await usedToday(user.id)) >= LIMIT) return text(`Бүгінгі ${LIMIT} сұрақ шегі бітті. Ертең қайта кел!`, 429);

  await logAiRequest(user.id);
  if (ctx.assignmentId)
    await sql`insert into ai_hints values (${ctx.assignmentId}, ${user.id}) on conflict do nothing`;

  const headers = { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" };
  if (isMock())
    return new Response(streamText(ctx.persona ? mockPersona(ctx.persona.name) : mockChat(ctx.mode, last.content, ctx.title)), { headers });

  try {
    const stream = await streamChat(ctx.persona ? personaSystem(ctx.persona) : chatSystem(ctx.mode, ctx), history, (u) => {
      void sql`update ai_usage set input_tokens = input_tokens + ${u.input_tokens}, output_tokens = output_tokens + ${u.output_tokens}
        where user_id = ${user.id} and day = current_date`.catch(() => {});
    });
    return new Response(stream, { headers });
  } catch (e) {
    console.error(e);
    return text(e instanceof AiError ? e.userMessage : "Қате шықты. Қайта көр.", 502);
  }
}
