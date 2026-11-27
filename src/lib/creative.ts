// Creative work a teacher scores 0–2 on three criteria; the AI suggests the same three scores.
export type CreativeKind = "soni" | "hat";

export const CRITERIA: Record<"egerde" | CreativeKind, string[]> = {
  egerde: ["Болжам кейіпкер мінезіне сай", "Жырдан дәлел келтірілген", "Оқиғаның соңы логикалы"],
  soni: ["Кейіпкерлердің мінезі сақталған", "Жаңа соңы оқиғадан қисынды туындайды", "Тілі көркем әрі сауатты"],
  hat: ["Кейіпкер мен оқиғаны дұрыс біледі", "Өз ойы мен сезімі анық", "Хат пішіні мен тілі сақталған"],
};

export const KIND: Record<CreativeKind, { title: string; task: string }> = {
  soni: {
    title: "Соңын өзгерт",
    task: "Шығарманың соңы басқаша болса ше? Оқиғаның соңын өз нұсқаңмен жаз. Кейіпкерлердің мінезін сақта: олар өздеріне тән түрде әрекет етуі керек.",
  },
  hat: {
    title: "Кейіпкерге хат",
    task: "Кейіпкерге хат жаз: оның қай ісіне сүйсіндің, қайсысымен келіспейсің, оған не сұрақ қояр едің? Шығармадағы оқиғаға сүйен.",
  },
};

export const MIN_WORDS = 20;
export const words = (t: string) => t.split(/\s+/).filter(Boolean).length;
