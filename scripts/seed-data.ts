// Library seed. Texts are NOT written from memory: only the verified stanza of «Қыс» is included.
// TODO: check grades and the list of works against the current school textbooks.
// TODO: confirm public-domain status under Kazakhstan's copyright term (author's death + 70 years).

export const QYS_STANZA = [
  "Ақ киімді, денелі, ақ сақалды,",
  "Соқыр, мылқау, танымас тірі жанды.",
  "Үсті-басы ақ қырау, түсі суық,",
  "Басқан жері сықырлап, келіп қалды.",
];

export const DEMO_MATERIAL = `${QYS_STANZA.join("\n")}

Абай бұл өлеңде қысты ақ киімді, ақ сақалды қарт бейнесінде суреттейді. Ақын табиғат құбылысын адамға ұқсатып, кейіптеу тәсілін қолданады. Өлең он бір буынды қара өлең өлшемімен жазылған.`;

type Work = {
  slug: string;
  title: string;
  author: string;
  author_years: string | null;
  genre: string;
  grades: number[];
  summary: string;
  text?: string;
  text_source?: string;
  is_public_domain: boolean;
  lab?: object;
};

const w = (slug: string, title: string, author: string, author_years: string | null, genre: string, grades: number[], is_public_domain: boolean, summary = ""): Work => ({
  slug, title, author, author_years, genre, grades, is_public_domain, summary,
});

export const WORKS: Work[] = [
  {
    ...w("abai-qys", "Қыс", "Абай Құнанбайұлы", "1845–1904", "Өлең", [5, 6, 7], true, "Абай қысты ақ киімді, ақ сақалды қарт бейнесінде кейіптеп суреттейді."),
    text: QYS_STANZA.join("\n"),
    text_source: "ТЗ-да тексерілген үзінді (1-шумақ). Толық мәтінді сенімді басылымнан қосыңыз.",
    lab: { poem: { lines: QYS_STANZA, meter: "11", rhyme: "а-а-б-а" } },
  },
  w("abai-gylym", "Ғылым таппай мақтанба", "Абай Құнанбайұлы", "1845–1904", "Өлең", [8, 9], true),
  w("abai-qara-soz", "Қара сөздер", "Абай Құнанбайұлы", "1845–1904", "Проза", [9, 10, 11], true),
  w("altynsarin-kel", "Кел, балалар, оқылық", "Ыбырай Алтынсарин", "1841–1889", "Өлең", [5], true),
  w("baitursynuly-qyryq", "Қырық мысал", "Ахмет Байтұрсынұлы", "1872–1937", "Мысал", [5, 6], true),
  w("zhumabaev-olender", "Өлеңдері", "Мағжан Жұмабаев", "1893–1938", "Өлең", [9, 10, 11], true),
  w("shakarim-olender", "Өлеңдері", "Шәкәрім Құдайбердіұлы", "1858–1931", "Өлең", [9, 10, 11], true),
  {
    ...w("kozy-korpesh", "Қозы Көрпеш – Баян сұлу", "Халық ауыз әдебиеті", null, "Лиро-эпостық жыр", [7], true, "Қозы Көрпеш пен Баян сұлудың махаббаты туралы қазақтың лиро-эпостық жыры."),
    lab: {
      characters: [
        { id: "sarybai", name: "Сарыбай", note: "бай", kind: "secondary", x: 140, y: 50 },
        { id: "karabai", name: "Қарабай", note: "бай", kind: "secondary", x: 460, y: 50 },
        { id: "kozy", name: "Қозы Көрпеш", note: "басты кейіпкер", kind: "main", x: 140, y: 180 },
        { id: "bayan", name: "Баян сұлу", note: "басты кейіпкер", kind: "main", x: 460, y: 180 },
        { id: "kodar", name: "Қодар", note: "қарсы кейіпкер", kind: "antagonist", x: 300, y: 290 },
      ],
      reference: [
        { from: "sarybai", to: "karabai", label: "құда болуға уәделесті" },
        { from: "sarybai", to: "kozy", label: "әкесі" },
        { from: "karabai", to: "bayan", label: "әкесі" },
        { from: "kozy", to: "bayan", label: "атастырылған жар" },
        { from: "kodar", to: "bayan", label: "Баянға қызығады" },
        { from: "kodar", to: "kozy", label: "өліміне себепкер" },
      ],
      // TODO: teacher should check the events and their plot elements against the textbook version of the epic.
      timeline: [
        { id: "e1", text: "Сарыбай мен Қарабай балаларын туылмай тұрып атастырады", element: "экспозиция" },
        { id: "e2", text: "Сарыбай қайтыс болып, Қарабай уәдесінен тайып, елін көшіріп кетеді", element: "байланыс" },
        { id: "e3", text: "Қозы Көрпеш ер жетіп, Баянды іздеп шығады", element: "шиеленіс" },
        { id: "e4", text: "Қодар Қозы Көрпешті өлтіреді", element: "шарықтау шегі" },
        { id: "e5", text: "Баян Қодардан кек алып, Қозының басында өзі де қаза табады", element: "шешім" },
      ],
      egerde: {
        question: "Егер Қарабай уәдесінде тұрғанда, оқиға қалай өрбір еді?",
        checklist: ["Болжам кейіпкердің мінезіне сай", "Жырдан дәлел келтірдім", "Оқиғаның соңын түсіндірдім"],
      },
    },
  },
  w("qyz-zhibek", "Қыз Жібек", "Халық ауыз әдебиеті", null, "Лиро-эпостық жыр", [7, 8], true),
  w("er-targyn", "Ер Тарғын", "Халық ауыз әдебиеті", null, "Батырлар жыры", [6, 7], true),
  w("alpamys", "Алпамыс батыр", "Халық ауыз әдебиеті", null, "Батырлар жыры", [6, 7], true),
  w("er-tostik", "Ер Төстік", "Халық ауыз әдебиеті", null, "Ертегі", [5], true),
  w("aldar-kose", "Алдар Көсе туралы ертегілер", "Халық ауыз әдебиеті", null, "Ертегі", [5], true),
  w("auezov-kokserek", "Көксерек", "Мұхтар Әуезов", "1897–1961", "Әңгіме", [7, 8], false),
  w("auezov-abai-zholy", "Абай жолы", "Мұхтар Әуезов", "1897–1961", "Роман-эпопея", [10, 11], false),
  w("zhumadilov-kozykuren", "Қозыкүрең", "Қабдеш Жұмаділов", null, "Әңгіме", [6, 7], false),
];

export const METHODS = [
  {
    slug: "bloom",
    name: "Блум таксономиясы бойынша сұрақтар",
    description: "Білу, түсіну, қолдану, талдау, жинақтау, бағалау деңгейіндегі сұрақтар.",
    instructions: "Сұрақтарды төменгі деңгейден (білу) жоғарғы деңгейге (бағалау) қарай орналастыр. Білу деңгейіне жабық сұрақ, жоғары деңгейлерге ашық сұрақ жаса. Әр сұрақтың шартына деңгейін жаз.",
  },
  {
    slug: "test",
    name: "Тест және сәйкестендіру",
    description: "Бір жауапты тест, сәйкестендіру, бос орынды толтыру, ретке қою.",
    instructions: "Тек жабық тапсырмалар жаса: single_choice, matching, fill_blank, ordering. Әр тестте 4 нұсқа, біреуі ғана дұрыс. Дұрыс емес нұсқалар сенімді, бірақ мәтінге қайшы болсын.",
  },
  {
    slug: "sinkvein",
    name: "Синквейн",
    description: "Кейіпкерге не ұғымға бес жолдық өлең құрастыру.",
    instructions: "Бір open тапсырма жаса: 1-жол — зат есім, 2-жол — екі сын есім, 3-жол — үш етістік, 4-жол — төрт сөзден тұратын сөйлем, 5-жол — бір синоним. Критерийде әр жолдың талабын жаз. Қаласаң, бір fill_blank тапсырмасын қос.",
  },
  {
    slug: "venn",
    name: "Венн диаграммасы",
    description: "Екі кейіпкерді, екі шығарманы немесе екі бейнені салыстыру.",
    instructions: "Материалдан салыстыруға болатын екі нысанды тап. Ұқсастық пен айырмашылықты табуға арналған open тапсырма және бір matching тапсырмасын (белгі → кейіпкер) жаса.",
  },
];
