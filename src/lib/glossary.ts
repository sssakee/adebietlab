// School dictionary of old, rare and literary words found in the library's summaries, the checked
// lines and the history page. Explanations are short and written for grades 5–11 by the ӘдебиетLab
// team; a teacher should look them over. match: an exact word form, or a stem ending in "*".
export type Gloss = { word: string; meaning: string; match: string[] };

export const GLOSSARY: Gloss[] = [
  { word: "қырау", meaning: "Суық түнде шөптің, ағаштың, заттың бетіне қатқан ақ ұлпа мұз.", match: ["қырау*"] },
  { word: "мылқау", meaning: "Сөйлей алмайтын, тілсіз. Абай қысты «мылқау» деп, оның үнсіз, қатал екенін көрсетеді.", match: ["мылқау*"] },
  { word: "сықырлау", meaning: "Қатқан қарды басқанда шығатын «сықыр-сықыр» дыбыс.", match: ["сықырла*"] },
  { word: "атастыру", meaning: "Балаларды кішкентай кезінде, кейде туылмай тұрып, болашақта қосылатын етіп уәделесу.", match: ["атастыр*"] },
  { word: "қалыңдық", meaning: "Айттырылған, бірақ әлі ұзатылмаған қыз.", match: ["қалыңдығ*", "қалыңдық*"] },
  { word: "қалың мал", meaning: "Күйеу жағы қыздың ата-анасына беретін мал.", match: ["қалың мал"] },
  { word: "ұзату", meaning: "Қызды күйеуге беріп, жаңа үйіне аттандыру.", match: ["ұзат*"] },
  { word: "тұлпар", meaning: "Жүйрік, асыл тұқымды ат. Жырларда батырдың ең сенімді серігі.", match: ["тұлпар*"] },
  { word: "зындан", meaning: "Жер астындағы қараңғы түрме.", match: ["зындан*"] },
  { word: "би", meaning: "Ел ішіндегі дауды әділ шешетін, шешен әрі ақылды адам.", match: ["би"] },
  { word: "жырау", meaning: "Хан қасында ақылшы болған, толғау айтатын ақын.", match: ["жырау*"] },
  { word: "толғау", meaning: "Өмір, заман, ел тағдыры туралы терең ой толғайтын жыр түрі.", match: ["толғау*"] },
  { word: "жыршы", meaning: "Дайын жырларды жатқа айтып, ел арасына таратқан адам.", match: ["жыршы*"] },
  { word: "зар заман", meaning: "Ел басына қайғы түскен заман. XIX ғасырда осылай жырлаған ақындар тобының атауы.", match: ["зар заман"] },
  { word: "ғақлия", meaning: "Ақыл сөз, өсиет. Абайдың қара сөздерінің бір атауы.", match: ["ғақлия*"] },
  { word: "кетпен", meaning: "Жер қазатын, топырақ шабатын қол құралы.", match: ["кетпен*"] },
  { word: "таға", meaning: "Аттың тұяғына қағатын иілген темір.", match: ["таға", "тағасы", "тағаны", "тағасын"] },
  { word: "апан", meaning: "Қасқырдың іні.", match: ["апан*"] },
  { word: "бөлтірік", meaning: "Қасқырдың күшігі.", match: ["бөлтірік*"] },
  { word: "кесене", meaning: "Белгілі адамның басына салынған күмбезді ескерткіш.", match: ["кесене*"] },
  { word: "қобыз", meaning: "Ысқышпен тартылатын қазақтың көне ішекті аспабы.", match: ["қобыз*"] },
  { word: "күй", meaning: "Домбыра, қобыз сияқты аспаппен орындалатын сөзсіз музыкалық шығарма.", match: ["күй"] },
  { word: "ажал", meaning: "Өлім, адам өмірінің соңы.", match: ["ажал*"] },
  { word: "көр", meaning: "Мола, қабір.", match: ["көр"] },
  { word: "кек", meaning: "Жасалған жамандыққа жауап қайтаруға деген ниет.", match: ["кек"] },
  { word: "уәде", meaning: "Берген сөз. «Уәдесінен таю» — берген сөзін орындамау.", match: ["уәде*"] },
  { word: "ар-намыс", meaning: "Адамның өз абыройын, елінің абыройын қорғау сезімі.", match: ["ар-намыс*"] },
  { word: "ағартушы", meaning: "Халықты оқуға, білімге шақырып, мектеп ашқан, кітап жазған адам.", match: ["ағартушы*"] },
  { word: "ұйқас", meaning: "Өлең жолдарының соңындағы дыбыстардың үндесуі.", match: ["ұйқас*"] },
  { word: "буын", meaning: "Ішінде бір дауысты дыбыс бар сөз бөлшегі. Өлең жолы буынмен өлшенеді.", match: ["буын*"] },
  { word: "шумақ", meaning: "Өлеңнің бірнеше жолдан тұратын бөлігі.", match: ["шумақ*"] },
  { word: "тармақ", meaning: "Өлеңнің бір жолы.", match: ["тармақ*"] },
  { word: "кейіптеу", meaning: "Жансыз нәрсені адамша сөйлетіп, әрекет еткізіп суреттеу тәсілі.", match: ["кейіпте*"] },
  { word: "теңеу", meaning: "Бір нәрсені екінші нәрсеге салыстырып суреттеу: «аппақ қардай».", match: ["теңеу*"] },
  { word: "лиро-эпос", meaning: "Оқиғаны баяндай отырып, махаббат пен сезімді де жырлайтын шығарма.", match: ["лиро-эпос*"] },
  { word: "эпос", meaning: "Батырлардың ерлігін, елдің тарихын баяндайтын көлемді жыр.", match: ["эпос*"] },
  { word: "мысал", meaning: "Жануарлар бейнесі арқылы адам мінін сынайтын қысқа шығарма.", match: ["мысал", "мысалдар*"] },
  { word: "аңыз", meaning: "Ел аузында сақталған, шындық пен қиял араласқан әңгіме.", match: ["аңыз*"] },
  { word: "болыс", meaning: "Патша заманында бірнеше ауылды біріктірген әкімшілік бөлік және оның басшысы.", match: ["болыс*"] },
  { word: "орда", meaning: "Ханның тұрағы, ел басқарылатын орын. Кейде хандықтың атауы: Бөкей ордасы.", match: ["орда*"] },
  { word: "сауыт", meaning: "Соғыста киетін, темір сақиналардан тоқылған қорғаныш киім.", match: ["сауыт*"] },
  { word: "дулыға", meaning: "Соғыста киетін темір бас киім.", match: ["дулыға*"] },
  { word: "найза", meaning: "Ұзын сапты, ұшы өткір қару.", match: ["найза*"] },
  { word: "садақ", meaning: "Жебе ататын иілген қару.", match: ["садақ", "садағы", "садағын", "садақпен"] },
  { word: "қорамсақ", meaning: "Жебе салып жүретін қап.", match: ["қорамсақ*"] },
  { word: "бәйге", meaning: "Ат жарысы, сондай-ақ жарыста жеңгенге берілетін сыйлық.", match: ["бәйге*"] },
  { word: "айтыс", meaning: "Екі ақынның суырып салып айтатын сөз жарысы.", match: ["айтыс*"] },
  { word: "қара өлең", meaning: "Әр жолы 11 буынды, көбіне а-а-б-а ұйқасты қазақ өлеңінің түрі.", match: ["қара өлең"] },
  { word: "шешен", meaning: "Сөзге шебер, ойын тапқыр әрі әсерлі айтатын адам.", match: ["шешен*"] },
  { word: "сараң", meaning: "Барын ешкімге қимайтын адам.", match: ["сараң*"] },
  { word: "тойымсыздық", meaning: "Ешқашан қанағат етпейтін, тоймайтын мінез.", match: ["тойымсыз*"] },
  { word: "қанағат", meaning: "Барына риза болу, артығын қумау.", match: ["қанағат*"] },
  { word: "рақым", meaning: "Мейірім, аяушылық.", match: ["рақым*"] },
  { word: "менмендік", meaning: "Өзін бәрінен жоғары санау.", match: ["менмендік*"] },
  { word: "жаулап алу", meaning: "Басқа елдің жерін соғыспен тартып алу.", match: ["жаулап"] },
  { word: "қастық", meaning: "Біреуге әдейі жасалған жамандық, зұлымдық.", match: ["қастығ*", "қастық*"] },
];

const norm = (s: string) => s.toLocaleLowerCase("kk");
// two-word entries («қара өлең», «қалың мал») are matched before single words
const PHRASES = GLOSSARY.flatMap((g) => g.match.filter((m) => m.includes(" ")));

/** The dictionary entry a word of running text belongs to, if any. */
export function glossFor(token: string): Gloss | undefined {
  const t = norm(token);
  return GLOSSARY.find((g) => g.match.some((m) => (m.endsWith("*") ? t.startsWith(m.slice(0, -1)) : t === m)));
}

/** Splits text into plain parts and dictionary words, keeping spaces and punctuation as they are. */
export function glossParts(text: string): (string | { text: string; gloss: Gloss })[] {
  const out: (string | { text: string; gloss: Gloss })[] = [];
  const re = new RegExp(`${PHRASES.join("|")}|[\\p{L}-]+`, "giu");
  let last = 0;
  for (const m of text.matchAll(re)) {
    const g = glossFor(m[0]);
    if (!g) continue;
    out.push(text.slice(last, m.index), { text: m[0], gloss: g });
    last = m.index + m[0].length;
  }
  out.push(text.slice(last));
  return out.filter((p) => p !== "");
}

export const searchGlossary = (q: string) => {
  const s = norm(q.trim());
  if (!s) return [];
  return GLOSSARY.filter((g) => norm(g.word).includes(s) || glossFor(s) === g || norm(g.meaning).includes(s));
};
