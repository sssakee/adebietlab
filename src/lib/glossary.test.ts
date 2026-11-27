import { describe, expect, it } from "vitest";
import { GLOSSARY, glossFor, glossParts } from "./glossary";

describe("glossary", () => {
  it("finds inflected forms of a stem", () => {
    expect(glossFor("тұлпарының")?.word).toBe("тұлпар");
    expect(glossFor("Толғауларында")?.word).toBe("толғау");
  });

  it("does not mistake look-alike words", () => {
    for (const w of ["тағайындау", "тағам", "садақа", "мысалы", "қалың", "зар"]) expect(glossFor(w), w).toBeUndefined();
  });

  it("matches two-word entries only together", () => {
    const words = (t: string) => glossParts(t).flatMap((p) => (typeof p === "string" ? [] : [p.gloss.word]));
    expect(words("қалың мал төледі")).toEqual(["қалың мал"]);
    expect(words("қалың орман")).toEqual([]);
    expect(words("Ақындар «зар заман» деді")).toEqual(["зар заман"]);
  });

  it("keeps the text unchanged", () => {
    const t = "Абай қысты кейіптеп, «ақ киімді» шал етеді.\nҚырау түседі.";
    expect(glossParts(t).map((p) => (typeof p === "string" ? p : p.text)).join("")).toBe(t);
  });

  it("has one entry per word", () => {
    expect(new Set(GLOSSARY.map((g) => g.word)).size).toBe(GLOSSARY.length);
  });
});
