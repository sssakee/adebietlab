// Captures the real site for the video: node video/capture.mjs on a running server with fresh demo data
// (npm run db:setup && npm run build && npm start). Writes video/public/shots/*.png (1440×900 css px at 2×)
// and video/src/boxes.json: where the things the video points at sit on each shot, in css px.
import { writeFileSync } from "node:fs";
import { chromium } from "playwright-core";
const base = process.env.BASE_URL ?? "http://localhost:3000";
const out = new URL("./public/shots/", import.meta.url).pathname;
const boxes = {};
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const page = async ({ w = 1440, h = 900, mobile = false, dark = false } = {}) => {
  const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: mobile ? 3 : 2, isMobile: mobile, hasTouch: mobile, reducedMotion: "reduce", colorScheme: dark ? "dark" : "light" });
  await c.addInitScript(() => localStorage.setItem("al_music", "off"));
  return c.newPage();
};
// mock AI answers carry a "(Демо режим…)" note; the video shows the interface, not the demo label
const undemo = (p) => p.evaluate(() => {
  for (const el of document.querySelectorAll("p, div, span, li")) for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.includes("(Демо режим")) n.textContent = n.textContent.replace(/\s*\(Демо режим[^)]*\)/g, "");
  // banners and notes that only exist in demo mode (AI_MOCK)
  for (const el of document.querySelectorAll("main p, main div")) if (/^\s*Демо режим/.test(el.textContent) && el.children.length < 3) el.style.display = "none";
});
const shot = async (p, name, marks = {}) => {
  await p.waitForTimeout(600); await undemo(p);
  await p.screenshot({ path: out + name + ".png" });
  boxes[name] = {};
  for (const [k, loc] of Object.entries(marks)) {
    const l = typeof loc === "string" ? p.locator(loc).first() : loc.first();
    const bb = await l.boundingBox().catch(() => null);
    if (bb) boxes[name][k] = { x: Math.round(bb.x), y: Math.round(bb.y), w: Math.round(bb.width), h: Math.round(bb.height) };
    else console.log("  ! no box", name, k);
  }
  console.log("•", name, Object.keys(boxes[name]).join(" "));
};
const step = async (label, fn) => { try { await fn(); } catch (e) { console.log("✗", label, String(e).split("\n")[0]); } };
const card = (p, text) => p.locator(`main :is(section, article, div, form):has-text("${text}")`).filter({ has: p.locator(`:is(h2,h3):has-text("${text}")`) }).last();
const skipTour = async (p) => { const s = p.locator("text=Өткізу"); if (await s.count()) await s.first().click(); };
const student = async (name, opts) => {
  const p = await page(opts);
  await p.goto(base + "/kiru"); await p.fill("#code", "LAB7QA"); await p.fill("#name", name); await p.fill("#pin", "1234");
  await p.click("text=Зертханаға кіру"); await p.waitForURL(/oqushy/); await skipTour(p);
  return p;
};

// a little class activity first, so the cabinet, results and analytics are not empty
for (const [name, good] of [["Айару", true], ["Дана", false], ["Мирас", true]]) await step("activity " + name, async () => {
  const s = await student(name);
  await s.goto(base + "/oqushy/tapsyrmalar"); await s.click("main a:has-text('кейіптеу')");
  await s.fill("input[type=text][name^=t_], input:not([type])[name^=t_]", good ? "сақалды" : "суық");
  await s.locator("input[type=radio][name^=t_]").nth(good ? 1 : 0).check();
  const sel = s.locator("select[name^=t_]"); const n = await sel.count();
  for (let i = 0; i < n; i++) await sel.nth(i).selectOption(String(good ? n - i : i + 1));
  for (const ta of await s.locator("textarea[name^=t_]").all()) await ta.fill(good ? "Абай қысты ақ сақалды қарт адамға теңеп, кейіптеу тәсілін қолданады. «Ақ киімді, денелі, ақ сақалды» деген жолдар қыстың суық әрі қатал екенін көрсетеді." : "Қыс суық.");
  await s.click("text=Тапсыру"); await s.waitForSelector("text=Нәтижем");
  await s.goto(base + "/oqushy/zertkhana/zheli/kozy-korpesh");
  const els = ["экспозиция", "байланыс", "шиеленіс", "шарықтау шегі", "шешім"];
  for (const [i, x] of (await s.locator("select[id^=el-]").all()).entries()) await x.selectOption(good ? els[Math.min(i, 4)] : "байланыс");
  await s.click("button:has-text('Тексеру')"); await s.waitForTimeout(600);
  await s.context().close();
});

// sign-in
await step("kiru", async () => {
  const k = await page();
  await k.goto(base + "/kiru"); await shot(k, "kiru", { student: card(k, "Оқушы"), teacher: card(k, "Мұғалім") });
  await k.fill("#code", "LAB7QA"); await k.fill("#name", "Айару"); await k.fill("#pin", "1234");
  await shot(k, "kiru-filled", { student: card(k, "Оқушы"), code: "#code", name: "#name", pin: "#pin", go: "text=Зертханаға кіру" });
});

const st = await student("Айару");
await step("home", async () => {
  await st.goto(base + "/oqushy");
  await shot(st, "home", { hero: "main h1", stats: "main :text('ашылым')", plan: "button:has-text('Жоспар құру')", tools: card(st, "Зертхана құралдары") });
  await st.click("button:has-text('Жоспар құру')"); await st.waitForTimeout(2500);
  await st.locator("button:has-text('Жоспар құру'), :text('Жеке оқу жоспары')").first().scrollIntoViewIfNeeded().catch(() => {});
  await shot(st, "home-plan", { plan: card(st, "Жеке оқу жоспары") });
  await st.goto(base + "/oqushy/zhetistikter"); await shot(st, "achievements", { main: "main" });
});
await step("works", async () => {
  await st.goto(base + "/oqushy/shygarmalar"); await shot(st, "works", { search: "main input", grid: "main a[href*='/shygarmalar/']" });
  await st.fill("main input", "Абай"); await st.press("main input", "Enter"); await st.waitForTimeout(800);
  await shot(st, "works-search", { search: "main input", first: "main a[href*='/shygarmalar/abai']" });
});
await step("work+glossary", async () => {
  await st.goto(base + "/oqushy/shygarmalar/abai-qys");
  await shot(st, "work", { text: card(st, "Мәтін"), word: "button:has-text('кейіптеп')", about: card(st, "Шығарма туралы") });
  await st.click("button:has-text('кейіптеп')"); await st.waitForTimeout(500);
  await shot(st, "work-word", { word: "button:has-text('кейіптеп')", pop: "[role=dialog], :has(> button:has-text('Сөздігіме қосу'))", add: "button:has-text('Сөздігіме қосу')" });
  await st.click("button:has-text('Сөздігіме қосу')"); await st.waitForTimeout(800);
  await shot(st, "work-word-added", { pop: "[role=dialog], :has(> button:has-text('Сөздігіме'))" });
  await st.keyboard.press("Escape");
});
await step("olen", async () => {
  await st.goto(base + "/oqushy/zertkhana/olen/abai-qys");
  await shot(st, "olen", { lines: card(st, "Өлеңді зертте"), show: "text=Буындарды көрсету" });
  await st.click("text=Буындарды көрсету");
  await shot(st, "olen-syll", { lines: card(st, "Өлеңді зертте"), tag: "text=11 буын" });
  await st.click("text=11 буынды (қара өлең өлшемі)"); await st.click("label:has-text('а-а-б-а')"); await st.click("text=Тексеру");
  await st.waitForSelector("text=Ұйқас түрі дұрыс");
  await st.locator("text=Ұйқас түрі дұрыс").scrollIntoViewIfNeeded();
  await shot(st, "olen-ok", { quiz: card(st, "Қорытынды жаса"), ok: "text=Ұйқас түрі дұрыс" });
});
await step("karta", async () => {
  await st.goto(base + "/oqushy/zertkhana/karta/kozy-korpesh");
  await shot(st, "karta", { map: card(st, "Кейіпкер картасы"), found: "text=Табылған байланыс", egeri: card(st, "Егер") });
  await st.locator("#prediction").scrollIntoViewIfNeeded();
  await shot(st, "egeri", { egeri: "#prediction", card: card(st, "Егер") });
  await st.goto(base + "/oqushy/zertkhana/zheli/kozy-korpesh");
  await shot(st, "zheli", { list: card(st, "Оқиғаларды ретке қой") });
});
await step("suhbat", async () => {
  await st.goto(base + "/oqushy/suhbat"); await shot(st, "suhbat-list", { list: "main" });
  await st.locator("main a[href^='/oqushy/suhbat/']").first().click(); await st.waitForURL(/suhbat\/.+/);
  const q = st.locator("main button").filter({ hasText: "?" }).nth(1);
  await shot(st, "suhbat", { chat: "main textarea, main input[type=text]", q });
  await q.click(); await st.waitForTimeout(4000);
  await shot(st, "suhbat-answer", { answer: "main :text('Абай Құнанбайұлы') >> nth=1", chat: "main textarea, main input[type=text]" });
});
await step("chat", async () => {
  await st.goto(base + "/oqushy/shygarmalar/abai-qys");
  await st.click("text=Сұрағың бар ма?"); await st.waitForTimeout(400);
  await shot(st, "chat-open", { panel: "#chat-panel", fab: "text=Сұрағың бар ма?" });
  await st.fill("#chat-input", "Бұл өлеңде қандай көркемдік тәсіл бар?"); await st.press("#chat-input", "Enter");
  await st.waitForTimeout(5000); await shot(st, "chat", { panel: "#chat-panel" });
  await st.keyboard.press("Escape");
});
await step("creative", async () => {
  await st.goto(base + "/oqushy/shygarmashylyq/kozy-korpesh");
  await st.locator("#soni-text").scrollIntoViewIfNeeded();
  await shot(st, "creative", { text: "#soni-text", voice: "button:has-text('Дауыспен айту')" });
  await st.fill("#soni-text", "Сол кезде Қарабай уәдесінде тұрып, екі жасты қосады. Қодар ашуын басып, елден кетеді. Қозы мен Баян ұзақ әрі бақытты өмір сүреді, ал ел олардың махаббатын ән қылып айтып жүреді. Бірақ Баян Қодардың да жүрегінде жақсылық барын біліп, оған алғыс айтады.");
  await shot(st, "creative-typed", { text: "#soni-text", voice: "button:has-text('Дауыспен айту')" });
  await st.click("button:has-text('Сақтау')"); await st.waitForTimeout(1500);
  const fb = st.locator("button:has-text('ЖИ пікірін алу')");
  if (await fb.count()) { await fb.first().click(); await st.waitForTimeout(4000); }
  await st.locator(":text('ЖИ пікірі')").first().scrollIntoViewIfNeeded().catch(() => {});
  await shot(st, "creative-fb", { fb: card(st, "ЖИ пікірі") });
});
await step("zhattau", async () => {
  await st.goto(base + "/oqushy/zhattau");
  for (const [i, lvl] of ["0. Оқу", "1. Әр төртінші сөз", "2. Әр екінші сөз", "3. Бас әріптері", "4. Толық жасырын"].entries()) {
    await st.click(`button:has-text('${lvl}')`);
    await shot(st, "zhattau-" + i, { levels: "button:has-text('0. Оқу')", verse: card(st, "Жаттау") });
  }
});
await step("kartochka", async () => {
  await st.goto(base + "/oqushy/kartochka");
  const labels = st.locator("label:has(input[name=theme])");
  for (let i = 0; i < 4; i++) { await labels.nth(i).click(); await st.waitForTimeout(400); await shot(st, "card-" + i, { canvas: "main canvas", share: "button:has-text('Бөлісу')" }); }
});
await step("map+history", async () => {
  await st.goto(base + "/oqushy/adebi-karta");
  await st.click("button:has-text('Абай Құнанбайұлы')"); await st.waitForTimeout(500); await st.evaluate(() => window.scrollTo(0, 0));
  await shot(st, "map", { map: "main svg", info: card(st, "Абай Құнанбайұлы") });
  await st.goto(base + "/oqushy/tarih"); await shot(st, "tarih", { line: "main a:has-text('Көне түркі')" });
});
await step("baige", async () => {
  await st.goto(base + "/oqushy/baige");
  await shot(st, "baige", { daily: card(st, "Бүгінгі викторина"), streak: card(st, "Тізбек"), board: card(st, "рейтинг") });
  await st.goto(base + "/oqushy/baige/kozy-korpesh");
  await shot(st, "quiz", { q: "main form, main" });
  await st.locator("main label").first().click(); await st.waitForTimeout(300);
  await shot(st, "quiz-pick", { q: "main form, main", pick: "main label" });
  for (let i = 0; i < 6; i++) { const nx = st.locator("button:has-text('Келесі'), button:has-text('Аяқтау'), button:has-text('Тексеру')"); if (!(await nx.count())) break; await st.locator("main label").first().click().catch(() => {}); await nx.first().click(); await st.waitForTimeout(500); }
});

await step("phone+dark", async () => {
  const ph = await student("Мирас", { w: 390, h: 844, mobile: true });
  await shot(ph, "phone-home");
  await ph.goto(base + "/oqushy/zertkhana/olen/abai-qys"); await ph.click("text=Буындарды көрсету"); await shot(ph, "phone-olen");
  const dk = await student("Айару", { dark: true });
  await shot(dk, "dark-home");
});

// teacher
const t = await page();
await t.goto(base + "/kiru"); await t.fill("#email", "demo@adebietlab.kz"); await t.fill("#password", "demo1234"); await t.press("#password", "Enter"); await t.waitForURL(/mugalim/);
await skipTour(t);
await step("teacher", async () => {
  await t.goto(base + "/mugalim/synyptar"); await shot(t, "t-classes", { code: "main :text('Сынып коды')", create: card(t, "Жаңа сынып"), table: "main table" });
  await t.goto(base + "/mugalim/zhasau");
  await t.selectOption("#work", { label: /«Қыс»/ }).catch(() => t.locator("#work option").nth(3).getAttribute("value").then((v) => t.selectOption("#work", v)));
  await t.fill("#title", "Абай, «Қыс»: кейіптеу"); await t.fill("#obj", "Өлеңдегі кейіптеуді табу"); await t.selectOption("#grade", "6"); await t.selectOption("#level", "B");
  await shot(t, "t-create", { material: "#text", work: "#work", params: "#title", level: "#level", go: "button:has-text('Тапсырма жасау')" });
  await t.locator("label:has(input[name=method_id])").nth(0).scrollIntoViewIfNeeded();
  await shot(t, "t-create-methods", { methods: "label:has(input[name=method_id])", go: "button:has-text('Тапсырма жасау')" });
  await t.click("button:has-text('Тапсырма жасау')"); await t.waitForURL(/bank\/.+/, { timeout: 30000 }); await t.waitForTimeout(800);
  await shot(t, "t-new-set", { head: "main h1", approve: "button:has-text('Бекіту')", first: "main ol > li, main article" });
  const ap = t.locator("button:has-text('Бекіту')"); if (await ap.count()) { await ap.first().click(); await t.waitForTimeout(1500); }
  await t.locator("#ai").scrollIntoViewIfNeeded().catch(() => {});
  await shot(t, "t-assign", { ai: "#ai", send: "button:has-text('Сыныпқа жіберу')", form: "form:has(#ai)" });
  await t.goto(base + "/mugalim/bank"); await shot(t, "t-bank", { list: "main" });
  await t.goto(base + "/mugalim/natizheler"); await shot(t, "t-results", { table: "main table", csv: "text=Excel-ге (CSV)" });
  // open-answer grading: the AI suggests points, the teacher saves the grade
  await t.goto(base + "/mugalim/natizheler"); await t.click("text=Бағалау");
  await t.click("text=ЖИ-ден ұсыныс балы"); await t.waitForSelector("text=ЖИ ұсынысы", { timeout: 15000 });
  await t.locator(":text('ЖИ ұсынысы')").first().scrollIntoViewIfNeeded();
  await shot(t, "t-grade", { ai: ":text('ЖИ ұсынысы')", save: "button:has-text('Бағаны сақтау'), button:has-text('Сақтау')" });
  await t.goto(base + "/mugalim/analitika"); await shot(t, "t-analytics", { stats: "main :text('Назар керек')", hard: card(t, "Қай шығарма қиын"), skills: card(t, "Қай дағды қиын") });
});
writeFileSync(new URL("./src/boxes.json", import.meta.url), JSON.stringify(boxes, null, 1));
await b.close();
