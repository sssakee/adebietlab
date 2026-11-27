// npm run smoke — end-to-end check of the main scenarios on a running server with fresh demo data
// (npm run db:setup && npm run build && npm start). Uses an installed Chrome: set CHROME_PATH if needed.
import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const base = process.env.BASE_URL ?? "http://localhost:3000";
const log = (...a) => console.log("•", ...a);
const errors = [];
async function ctx(vw = 1440) { const c = await b.newContext({ viewport: { width: vw, height: 1000 } }); const p = await c.newPage(); p.on("console", m => m.type()==="error" && errors.push(m.text())); p.on("pageerror", e => errors.push(String(e))); return p; }
const st = await ctx();
await st.goto(base + "/kiru");
await st.fill("#code", "LAB7QA"); await st.fill("#name", "Айару"); await st.fill("#pin", "0000"); await st.click("text=Зертханаға кіру");
await st.waitForSelector("[role=alert]:has-text('PIN')"); log("wrong PIN rejected");
// brute-force guard: 5 wrong PINs for one student block that student only
const tryPin = async (pin) => { await st.fill("#name", "Дана"); await st.fill("#pin", pin); await Promise.all([st.waitForResponse((r) => r.request().method() === "POST"), st.click("text=Зертханаға кіру")]); };
for (let i = 0; i < 5; i++) await tryPin("0000");
await tryPin("1234"); await st.waitForSelector("text=Тым көп қате әрекет"); log("sign-in limit holds");
await st.fill("#name", "Айару");
await st.fill("#pin", "1234"); await st.click("text=Зертханаға кіру"); await st.waitForURL(/oqushy/);
// role guard
await st.goto(base + "/mugalim"); log("student → /mugalim lands on", new URL(st.url()).pathname);
// olen check
await st.goto(base + "/oqushy/zertkhana/olen/abai-qys");
await st.click("text=Буындарды көрсету"); log("syllable tags:", await st.locator("text=11 буын").count());
await st.click("text=11 буынды (қара өлең өлшемі)"); await st.click("label:has-text('а-а-б-а')"); await st.click("text=Тексеру");
await st.waitForSelector("text=Ұйқас түрі дұрыс"); log("olen check ok");
// chat
await st.click("text=Сұрағың бар ма?");
await st.fill("#chat-input", "менің нөмірім +7 701 234 56 78"); await st.press("#chat-input", "Enter");
await st.waitForSelector("[role=alert]:has-text('жеке дерек')"); log("PII blocked");
await st.fill("#chat-input", "Бұл сөздің мағынасы не?"); await st.press("#chat-input", "Enter");
await st.waitForFunction(() => [...document.querySelectorAll("#chat-panel p")].some(p => p.textContent.includes("түбір")), null, { timeout: 15000 });
log("chat streamed");
await st.screenshot({ path: "smoke-chat.png" });
await st.keyboard.press("Escape");
// assignment
await st.goto(base + "/oqushy/tapsyrmalar"); await st.click("main a:has-text('кейіптеу')");
await st.fill("input[type=text][name^=t_], input:not([type])[name^=t_]", "сақалды");
await st.locator("input[type=radio][name^=t_]").nth(1).check();
const sel = st.locator("select[name^=t_]"); const n = await sel.count();
// correct order is reverse of shown (mock reverses), so option i gets position n-i
for (let i = 0; i < n; i++) await sel.nth(i).selectOption(String(n - i));
for (const ta of await st.locator("textarea[name^=t_]").all()) await ta.fill("Абай қысты ақ сақалды қарт адамға теңеп, кейіптеу тәсілін қолданады. Мысалы, «ақ киімді, денелі, ақ сақалды» деген жолдар. Бұл бейне қыстың суық әрі қатал екенін көрсетеді.");
await st.click("text=Тапсыру"); await st.waitForSelector("text=Нәтижем");
log("submitted; score shown:", await st.locator("h2:has-text('Нәтижем') + span").textContent());
await st.screenshot({ path: "smoke-result.png", fullPage: true });
// timeline: pick an element for every event, check
await st.goto(base + "/oqushy/zertkhana/zheli/kozy-korpesh");
for (const s of await st.locator("select[id^=el-]").all()) await s.selectOption("шешім");
await st.click("button:has-text('Тексеру')"); await st.waitForSelector("text=сюжет элементі дұрыс"); log("timeline checked");

const t = await ctx();
await t.goto(base + "/kiru"); await t.fill("#email", "demo@adebietlab.kz"); await t.fill("#password", "demo1234"); await t.press("#password", "Enter"); await t.waitForURL(/mugalim/);
await t.goto(base + "/mugalim/natizheler"); await t.click("text=Бағалау");
await t.click("text=ЖИ-ден ұсыныс балы"); await t.waitForSelector("text=ЖИ ұсынысы"); log("AI suggestions shown");
await t.click("text=Бағаны сақтау"); await t.waitForSelector("text=Баға сақталды"); log("graded");
// CSV export
await t.goto(base + "/mugalim/natizheler");
const csv = await t.request.get(base + (await t.locator("a:has-text('CSV')").first().getAttribute("href")));
log("csv:", csv.status(), csv.headers()["content-type"]);
if (csv.status() !== 200 || !(await csv.text()).startsWith("\uFEFF")) errors.push("CSV failed");
// custom method
await t.goto(base + "/mugalim/zhasau");
await t.click("text=+ Өз әдісімді қосу"); await t.fill("#mn", "Үш сұрақ"); await t.fill("#md", "Не, неге, қалай сұрақтарына жауап береді");
await t.click("text=Әдісті сақтау"); await t.waitForSelector("text=Әдіс қосылды"); log("custom method added:", await t.locator("text=өз әдісім").count());
// generator
await t.goto(base + "/mugalim/zhasau");
await t.fill("#text", "Ыбырай Алтынсарин балаларды оқуға шақырады. Ақын білімнің пайдасын түсіндіреді. Өлеңде оқу — болашақтың кілті деген ой бар. Балалар ынталы болса, көп нәрсе үйренеді.");
await t.fill("#title", "Тест жинағы"); await t.click("text=Тапсырма жасау >> nth=-1");
await t.waitForURL(/bank\//); log("generated set:", await t.locator("h1").textContent(), "tasks:", await t.locator("ol > li").count());
await t.click("text=Бекіту"); await t.waitForSelector("text=Сыныпқа беру"); log("approved");
await t.click("button:has-text('Сыныпқа жіберу')"); await t.waitForURL(/natizheler/); log("assigned");
await t.screenshot({ path: "smoke-t-res2.png", fullPage: true });
// teacher route guard on student API
const r = await t.request.post(base + "/api/chat", { data: { path: "/", messages: [{ role: "user", content: "сәлем" }] } });
log("teacher → /api/chat:", r.status());
const unexpected = errors.filter((e) => !e.includes("422")); // 422 = the PII filter, expected
await b.close();
if (unexpected.length) { console.error("Браузер қателері:", unexpected); process.exit(1); }
console.log("Smoke: бәрі өтті.");
