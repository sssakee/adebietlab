import { describe, expect, it } from "vitest";
import { countSyllables, rhymeScheme, syllabify, syllabifyLine } from "./poem";
import { compareMap, levelFor, scoreTask } from "./grading";
import { checkMessage } from "./safety";
import { GenerationSchema, TaskSchema } from "./ai/schemas";
import { mockFeedback, mockGenerate } from "./ai/mock";
import { DEMO_MATERIAL, QYS_STANZA, WORKS } from "../../scripts/seed-data";

describe("Өлең өлшегіш", () => {
  it("«Қыс» 1-шумағының әр жолы 11 буын", () => {
    expect(QYS_STANZA.map(countSyllables)).toEqual([11, 11, 11, 11]);
  });

  it("«у» дауыссыздан кейін ғана буын болады", () => {
    expect(countSyllables("суық")).toBe(2); // су-ық
    expect(countSyllables("мылқау")).toBe(2); // мыл-қау
    expect(countSyllables("уақыт")).toBe(2); // уа-қыт
  });

  it("сөзді буынға бөледі", () => {
    expect(syllabify("киімді")).toEqual(["ки", "ім", "ді"]);
    expect(syllabify("сықырлап")).toEqual(["сы", "қыр", "лап"]);
    expect(syllabifyLine("Ақ киімді, денелі,")).toBe("Ақ ки-ім-ді, де-не-лі,");
  });

  it("«Қыс» ұйқасы — а-а-б-а (қара өлең)", () => {
    expect(rhymeScheme(QYS_STANZA)).toBe("а-а-б-а");
    expect(rhymeScheme(["бала келді", "дала", "жерді", "қала"])).toBe("а-б-а-б");
  });
});

describe("Жабық тапсырмаларды ережемен тексеру", () => {
  it("бір жауапты тест", () => {
    const t = { type: "single_choice" as const, answer_key: 2, points: 2 };
    expect(scoreTask(t, 2)).toBe(2);
    expect(scoreTask(t, 1)).toBe(0);
    expect(scoreTask(t, undefined)).toBe(0);
  });

  it("бос орын: бас әріп пен тыныс белгісі маңызды емес", () => {
    const t = { type: "fill_blank" as const, answer_key: ["кейіптеу"], points: 1 };
    expect(scoreTask(t, " Кейіптеу.")).toBe(1);
    expect(scoreTask(t, "теңеу")).toBe(0);
  });

  it("сәйкестендіру жартылай балл береді, рет толық сәйкес болуы керек", () => {
    const m = { type: "matching" as const, answer_key: { a: "1", b: "2", c: "3", d: "4" }, points: 4 };
    expect(scoreTask(m, { a: "1", b: "2", c: "4", d: "3" })).toBe(2);
    const o = { type: "ordering" as const, answer_key: [2, 0, 1], points: 3 };
    expect(scoreTask(o, [2, 0, 1])).toBe(3);
    expect(scoreTask(o, [0, 2, 1])).toBe(0);
  });

  it("ашық жауапқа автобалл қойылмайды", () => {
    expect(scoreTask({ type: "open", answer_key: null, points: 4 }, "жауап")).toBeNull();
  });
});

describe("Кейіпкер картасы", () => {
  const ref = (WORKS.find((w) => w.slug === "kozy-korpesh")!.lab as { reference: { from: string; to: string }[] }).reference;

  it("эталонмен салыстырады, бағыт маңызды емес", () => {
    const r = compareMap(ref, [
      { from: "kozy", to: "sarybai" },
      { from: "bayan", to: "karabai" },
      { from: "kozy", to: "bayan" },
      { from: "sarybai", to: "karabai" },
      { from: "kodar", to: "sarybai" },
    ]);
    expect(r).toMatchObject({ found: 4, total: 6 });
    expect(r.extra).toHaveLength(1);
  });
});

describe("Чат сүзгісі", () => {
  it("жеке деректі ұстайды", () => {
    expect(checkMessage("менің нөмірім +7 701 234 56 78").ok).toBe(false);
    expect(checkMessage("поштам aru@mail.kz").ok).toBe(false);
    expect(checkMessage("Абай көшесі 15 үйде тұрамын").ok).toBe(false);
  });

  it("қалыпты сұрақты өткізеді", () => {
    expect(checkMessage("«Қыс» өлеңінде қандай кейіптеу бар?").ok).toBe(true);
    expect(checkMessage("11 буынды өлең деген не?").ok).toBe(true);
  });
});

describe("ЖИ жауабының схемасы", () => {
  it("демо генерация схемадан өтеді және материалға сүйенеді", () => {
    const g = mockGenerate({ methodSlug: "bloom", material: DEMO_MATERIAL, count: 6, level: "B" });
    expect(() => GenerationSchema.parse(g)).not.toThrow();
    expect(g.tasks.length).toBe(6);
    const blank = g.tasks.find((t) => t.type === "fill_blank")!;
    expect(DEMO_MATERIAL).toContain((blank.answer_key as string[])[0]);
  });

  it("жеткіліксіз материалды ашық айтады", () => {
    const g = mockGenerate({ methodSlug: "test", material: "Қыс.", count: 5, level: "A" });
    expect(g.insufficient_material).toBe(true);
    expect(g.tasks).toHaveLength(0);
  });

  it("дұрыс жауабы нұсқадан тыс тестті қабылдамайды", () => {
    const bad = { type: "single_choice", prompt: "Қай сөз?", options: ["а", "б"], answer_key: 5, criteria: "1 балл", points: 1 };
    expect(TaskSchema.safeParse(bad).success).toBe(false);
  });

  it("ашық жауап кері байланысы балл шегінен шықпайды", () => {
    expect(mockFeedback({ answer: "", points: 4 }).suggested_score).toBe(0);
    expect(mockFeedback({ answer: "ұзын жауап ".repeat(80), points: 4 }).suggested_score).toBe(4);
  });
});

describe("Деңгейлер", () => {
  it("Балапан → Қанаттанған → Қыран", () => {
    expect(levelFor(0).name).toBe("Балапан");
    expect(levelFor(42)).toMatchObject({ name: "Балапан", toNext: 18 });
    expect(levelFor(60).name).toBe("Қанаттанған");
    expect(levelFor(500)).toMatchObject({ name: "Қыран", next: null });
  });
});
