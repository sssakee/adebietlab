import { z } from "zod";

export const TASK_TYPES = ["single_choice", "multiple_choice", "matching", "ordering", "fill_blank", "open"] as const;

export const TASK_TYPE_LABEL: Record<(typeof TASK_TYPES)[number], string> = {
  single_choice: "Бір жауапты тест",
  multiple_choice: "Бірнеше жауапты тест",
  matching: "Сәйкестендіру",
  ordering: "Ретке қою",
  fill_blank: "Бос орынды толтыру",
  open: "Ашық жауап",
};

/**
 * One generated task. answer_key shape depends on type:
 * single_choice → option index; multiple_choice / ordering → index array;
 * matching → { left: right }; fill_blank → accepted strings; open → null.
 */
export const TaskSchema = z
  .object({
    type: z.enum(TASK_TYPES),
    prompt: z.string().min(5),
    options: z.array(z.string()).default([]),
    answer_key: z.union([z.number().int(), z.array(z.number().int()), z.array(z.string()), z.record(z.string(), z.string()), z.null()]),
    criteria: z.string().min(3),
    points: z.number().int().min(1).max(10),
    source_ref: z.string().default(""),
  })
  .superRefine((t, ctx) => {
    const bad = (m: string) => ctx.addIssue({ code: "custom", message: m });
    const k = t.answer_key;
    if (t.type === "single_choice" && !(typeof k === "number" && k >= 0 && k < t.options.length)) bad("single_choice: answer_key нұсқа индексі болуы керек");
    if ((t.type === "multiple_choice" || t.type === "ordering") && !(Array.isArray(k) && k.every((i) => typeof i === "number" && i < t.options.length)))
      bad(`${t.type}: answer_key индекстер тізімі болуы керек`);
    if (t.type === "matching" && !(k && typeof k === "object" && !Array.isArray(k) && Object.keys(k).length >= 2)) bad("matching: answer_key {сол: оң} болуы керек");
    if (t.type === "fill_blank" && !(Array.isArray(k) && k.length > 0 && k.every((s) => typeof s === "string"))) bad("fill_blank: answer_key жолдар тізімі болуы керек");
  });

export type Task = z.infer<typeof TaskSchema>;

export const GenerationSchema = z.object({
  insufficient_material: z.boolean().default(false),
  note: z.string().default(""),
  tasks: z.array(TaskSchema),
});
export type Generation = z.infer<typeof GenerationSchema>;

export const FeedbackSchema = z.object({
  suggested_score: z.number().int().min(0),
  feedback: z.string().min(3),
});
export type Feedback = z.infer<typeof FeedbackSchema>;

export const WordSchema = z.object({
  known: z.boolean(),
  meaning: z.string().max(400).default(""),
  example: z.string().max(300).default(""),
});
export type WordExplanation = z.infer<typeof WordSchema>;
