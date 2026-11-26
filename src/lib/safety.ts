// Input filters for the student chat. Runs before anything is sent to an AI provider.

const PII: { re: RegExp; what: string }[] = [
  { re: /(\+?7|8)[\s(-]*7\d{2}[\s)-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}/, what: "телефон нөмірі" },
  { re: /[\w.+-]+@[\w-]+\.[\w.]+/, what: "электрондық пошта" },
  { re: /\b\d{12}\b/, what: "ЖСН" },
  { re: /(көшесі|көш\.|даңғылы|пәтер|улица|ул\.|кв\.)\s*[\wа-яәғқңөұүһі.-]*\s*\d+/i, what: "мекенжай" },
];

// ponytail: tiny word list, swap for a maintained list or a moderation API if abuse appears.
const RUDE = [/ах?у[еи]л/i, /бл[яи]д/i, /п[иі]зд/i, /еб[аау]т/i, /сук[аи]/i, /хуй/i, /шеше[ңн]д[іи]/i, /қотақ/i, /ақымақ/i, /оңбаған/i];

export type FilterResult = { ok: true } | { ok: false; reason: "pii" | "rude"; message: string };

export function checkMessage(text: string): FilterResult {
  const pii = PII.find((p) => p.re.test(text));
  if (pii)
    return {
      ok: false,
      reason: "pii",
      message: `Хабарламаңда ${pii.what} сияқты жеке дерек бар. Оны жазба — ЖИ-ге жеке дерек жіберілмейді.`,
    };
  if (RUDE.some((r) => r.test(text)))
    return { ok: false, reason: "rude", message: "Сыпайы сөзбен қайта жазып көрші. Сұрағыңа көмектесуге дайынмын!" };
  return { ok: true };
}
