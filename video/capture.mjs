// Captures the real site for the video: node video/capture.mjs on a running server with fresh demo
// data (npm run db:setup && npm run build && npm start). Shots land in video/public/shots.
import { chromium } from "playwright-core";
const base = process.env.BASE_URL ?? "http://localhost:3000";
const out = new URL("./public/shots/", import.meta.url).pathname;
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const page = async (w = 1440, h = 900, mobile = false) => {
  const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: mobile ? 3 : 2, isMobile: mobile, hasTouch: mobile, reducedMotion: "reduce", colorScheme: "light" });
  await c.addInitScript(() => { localStorage.setItem("al_music", "off"); });
  return c.newPage();
};
const undemo = (p) => p.evaluate(() => { for (const el of document.querySelectorAll("p, div, span")) for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.includes("(Демо режим")) n.textContent = n.textContent.replace(/\s*\(Демо режим[^)]*\)/g, ""); });
const shot = async (p, name, full = false) => { await p.waitForTimeout(700); await undemo(p); await p.screenshot({ path: out + name + ".png", fullPage: full }); console.log("•", name); };
const skipTour = async (p) => { const s = p.locator("text=Өткізу"); if (await s.count()) await s.first().click(); };

// sign-in page, filled in
const k = await page();
await k.goto(base + "/kiru");
await shot(k, "kiru-empty");
await k.fill("#code", "LAB7QA"); await k.fill("#name", "Айару"); await k.fill("#pin", "1234");
await shot(k, "kiru");

// student
const st = await page();
await st.goto(base + "/kiru");
await st.fill("#code", "LAB7QA"); await st.fill("#name", "Айару"); await st.fill("#pin", "1234");
await st.click("text=Зертханаға кіру"); await st.waitForURL(/oqushy/);
await st.waitForTimeout(800); await shot(st, "tour");
await skipTour(st);
await shot(st, "st-home"); await shot(st, "st-home-full", true);
for (const [path, name, full] of [
  ["/oqushy/shygarmalar", "works", true],
  ["/oqushy/shygarmalar/abai-qys", "work", true],
  ["/oqushy/zertkhana", "tools", true],
  ["/oqushy/zertkhana/karta/kozy-korpesh", "karta", false],
  ["/oqushy/zertkhana/zheli/kozy-korpesh", "zheli", false],
  ["/oqushy/baige", "baige", false],
  ["/oqushy/kartochka", "kartochka", false],
  ["/oqushy/sozdik", "sozdik", false],
  ["/oqushy/adebi-karta", "adebi-karta", false],
  ["/oqushy/tarih", "tarih", false],
  ["/oqushy/suhbat", "suhbat-list", false],
]) { await st.goto(base + path); await shot(st, name, full); }

await st.goto(base + "/oqushy/zertkhana/olen/abai-qys");
await st.click("text=Буындарды көрсету"); await shot(st, "olen");
await st.click("text=11 буынды (қара өлең өлшемі)"); await st.click("label:has-text('а-а-б-а')"); await st.click("text=Тексеру");
await st.waitForSelector("text=Ұйқас түрі дұрыс"); await shot(st, "olen-checked", true);

await st.goto(base + "/oqushy/suhbat");
await st.locator("main a[href^='/oqushy/suhbat/']").first().click(); await st.waitForURL(/suhbat\/.+/);
await shot(st, "suhbat-empty");
const q = st.locator("main button").filter({ hasText: "?" }).first();
if (await q.count()) { await q.click(); await st.waitForTimeout(4000); }
await shot(st, "suhbat");

await st.goto(base + "/oqushy/shygarmalar/abai-qys");
await st.click("text=Сұрағың бар ма?");
await st.fill("#chat-input", "Бұл өлеңде қандай көркемдік тәсіл бар?"); await st.press("#chat-input", "Enter");
await st.waitForTimeout(5000); await shot(st, "chat");

const ph = await page(390, 844, true);
await ph.goto(base + "/kiru");
await ph.fill("#code", "LAB7QA"); await ph.fill("#name", "Мирас"); await ph.fill("#pin", "1234");
await ph.click("text=Зертханаға кіру"); await ph.waitForURL(/oqushy/); await skipTour(ph);
await shot(ph, "phone-home");

// a little class activity, so results and analytics are not empty
for (const [name, radio, essay] of [["Айару", 1, true], ["Дана", 0, true], ["Мирас", 1, false]]) {
  const s = await page();
  await s.goto(base + "/kiru"); await s.fill("#code", "LAB7QA"); await s.fill("#name", name); await s.fill("#pin", "1234");
  await s.click("text=Зертханаға кіру"); await s.waitForURL(/oqushy/); await skipTour(s);
  await s.goto(base + "/oqushy/tapsyrmalar"); await s.click("main a:has-text('кейіптеу')");
  await s.fill("input[type=text][name^=t_], input:not([type])[name^=t_]", radio ? "сақалды" : "суық");
  await s.locator("input[type=radio][name^=t_]").nth(radio).check();
  const sel = s.locator("select[name^=t_]"); const n = await sel.count();
  for (let i = 0; i < n; i++) await sel.nth(i).selectOption(String(radio ? n - i : i + 1));
  for (const ta of await s.locator("textarea[name^=t_]").all()) await ta.fill(essay ? "Абай қысты ақ сақалды қарт адамға теңеп, кейіптеу тәсілін қолданады. «Ақ киімді, денелі, ақ сақалды» деген жолдар қыстың суық әрі қатал екенін көрсетеді." : "Қыс суық.");
  await s.click("text=Тапсыру"); await s.waitForSelector("text=Нәтижем");
  if (name === "Айару") await shot(s, "st-result", true);
  await s.goto(base + "/oqushy/zertkhana/zheli/kozy-korpesh");
  const els = ["экспозиция", "байланыс", "шиеленіс", "шарықтау шегі", "шешім"];
  for (const [i, x] of (await s.locator("select[id^=el-]").all()).entries()) await x.selectOption(radio ? els[Math.min(i, 4)] : "байланыс");
  await s.click("button:has-text('Тексеру')"); await s.waitForTimeout(800);
  await s.context().close();
}

// teacher
const t = await page();
await t.goto(base + "/kiru"); await t.fill("#email", "demo@adebietlab.kz"); await t.fill("#password", "demo1234"); await t.press("#password", "Enter"); await t.waitForURL(/mugalim/);
await skipTour(t);
for (const [path, name, full] of [
  ["/mugalim", "t-home", true],
  ["/mugalim/synyptar", "t-classes", false],
  ["/mugalim/zhasau", "t-create", true],
  ["/mugalim/bank", "t-bank", false],
  ["/mugalim/natizheler", "t-results", false],
  ["/mugalim/analitika", "t-analytics", true],
]) { await t.goto(base + path); await shot(t, name, full); }
await t.goto(base + "/mugalim/bank"); await t.locator("main a[href^='/mugalim/bank/']").first().click(); await t.waitForURL(/bank\/.+/);
await shot(t, "t-set", true);
await b.close();
