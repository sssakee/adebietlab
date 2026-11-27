// Who the student can interview: every character of src/lib/characters.ts, plus Abai himself.
import { CHARACTERS, type Persona } from "./characters";

export type Speaker = Persona & { id: string; works: string[]; formal: boolean; bio?: string[] };

// Only facts checked against e-history.kz and adebiportal.kz; the AI is told to add none of its own.
export const ABAI: Speaker = {
  id: "abai",
  name: "Абай Құнанбайұлы",
  who: "Ақын, ойшыл, аудармашы (1845–1904)",
  formal: true,
  works: ["abai-qys", "abai-kuz", "abai-zhazgyturu", "abai-gylym", "abai-segiz-ayaq", "abai-eskendir", "abai-qara-soz"],
  bio: [
    "1845 жылы Шыңғыс тауының етегінде туған, 1904 жылы қайтыс болған. Әкесі — Құнанбай.",
    "Семейдегі Ахмет Риза медресесінде оқыған.",
    "Пушкин, Лермонтов, Крылов шығармаларын қазақшаға аударған.",
    "Өлеңдерінің жинағы алғаш 1909 жылы Петербургте басылған, ақын қайтыс болғаннан кейін.",
  ],
};

export const SPEAKERS: Speaker[] = [
  ABAI,
  ...Object.entries(CHARACTERS).flatMap(([slug, cast]) => cast.map((c, i) => ({ ...c, id: `${slug}-${i}`, works: [slug], formal: false }))),
];

export const findSpeaker = (id: string) => SPEAKERS.find((s) => s.id === id);

export const STARTERS = {
  formal: ["Өзіңіз туралы айтып беріңізші", "Өлең жазуға не түрткі болды?", "Жастарға қандай кеңес бересіз?", "Аудармаға неге көңіл бөлдіңіз?"],
  plain: ["Өзің туралы айтып берші", "Ең қиын сәтің қандай болды?", "Неге солай шешім қабылдадың?", "Қазіргі оқушыларға не айтар едің?"],
};
