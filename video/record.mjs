// Records the real site as video clips for the promo: node video/record.mjs [setup,clip,…]
// Needs a running site with fresh demo data (npm run db:setup && npm run build && npm start).
// With a list, only those run ("setup" = the class activity first; "wall" = the dark-mode still; "none" = only
// recompute idle spans and wall stills of the clips already there).
// Chromium's screencast only gives frames at css-pixel size, so the window is 1920×1080 at zoom 1.5:
// the site lays out as on a 1280-wide screen and every frame is sharp full HD.
// Writes video/public/clips/NAME.mp4 and video/src/clips.json: per clip its length, the cursor path,
// the marks (the moments the voice points at: `pre` = the cursor sets off, `at` = the click, `end` = last
// frame that still belongs to it) and boxes of things the film draws on, all in seconds and frame pixels.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const root = new URL("./", import.meta.url).pathname;
const only = process.argv[2]?.split(",");
const metaFile = root + "src/clips.json";
let meta = {};
try { meta = JSON.parse(readFileSync(metaFile, "utf8")); } catch {}
mkdirSync(root + "public/clips", { recursive: true });

const b = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const newPage = async ({ phone = false, dark = false } = {}) => {
  const c = await b.newContext({ viewport: phone ? { width: 588, height: 1272 } : { width: 1920, height: 1080 }, deviceScaleFactor: 1, hasTouch: phone, reducedMotion: "no-preference", colorScheme: dark ? "dark" : "light" });
  await c.addInitScript(() => {
    localStorage.setItem("al_music", "off");
    const z = () => (document.documentElement ? (document.documentElement.style.zoom = "1.5") : requestAnimationFrame(z));
    z(); document.addEventListener("DOMContentLoaded", z);
    // mock AI answers carry a "(Демо режим…)" note; the film shows the interface, not the demo label.
    // Answers stream in, so this keeps watching the page.
    const clean = () => {
      for (const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); w.nextNode();) {
        const n = w.currentNode;
        if (!n.data.includes("Демо режим")) continue;
        // only write when it changes: writing the same text is a mutation too, and would loop
        const v = n.data.replace(/\s*\(Демо режим[^)]*\)?/g, "").replace(/^\s*Демо режим[^.]*\.\s*/, "");
        if (v !== n.data) n.data = v;
        if (!v.trim() && n.parentElement && n.parentElement.childNodes.length === 1) n.parentElement.style.display = "none";
      }
    };
    document.addEventListener("DOMContentLoaded", () => new MutationObserver(clean).observe(document.body, { subtree: true, childList: true, characterData: true }));
  });
  return c.newPage();
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// mock AI answers carry a "(Демо режим…)" note; the film shows the interface, not the demo label
const undemo = (p) => p.evaluate(() => {
  for (const el of document.querySelectorAll("p, div, span, li")) for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.includes("(Демо режим")) n.textContent = n.textContent.replace(/\s*\(Демо режим[^)]*\)/g, "");
  for (const el of document.querySelectorAll("main p, main div")) if (/^\s*Демо режим/.test(el.textContent) && el.children.length < 3) el.style.display = "none";
}).catch(() => {});
const skipTour = async (p) => { const s = p.locator("text=Өткізу"); if (await s.count()) await s.first().click(); };
const student = async (name, opts) => {
  const p = await newPage(opts);
  await p.goto(base + "/kiru"); await p.fill("#code", "LAB7QA"); await p.fill("#name", name); await p.fill("#pin", "1234");
  await p.click("text=Зертханаға кіру"); await p.waitForURL(/oqushy/); await skipTour(p);
  return p;
};
const teacher = async () => {
  const p = await newPage();
  await p.goto(base + "/kiru"); await p.fill("#email", "demo@adebietlab.kz"); await p.fill("#password", "demo1234"); await p.press("#password", "Enter");
  await p.waitForURL(/mugalim/); await skipTour(p);
  return p;
};

/** Records what `fn` does on page `p` as clip `name`. */
async function clip(name, p, fn) {
  if (only && !only.includes(name)) return;
  const dir = `/tmp/clip-${name}`; rmSync(dir, { recursive: true, force: true }); mkdirSync(dir);
  const cdp = await p.context().newCDPSession(p);
  const frames = [];
  cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
    frames.push(metadata.timestamp); writeFileSync(`${dir}/${String(frames.length).padStart(5, "0")}.jpg`, Buffer.from(data, "base64"));
    cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  });
  await undemo(p);
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 95, everyNthFrame: 1 });
  await p.evaluate(() => document.body.style.setProperty("--rec", String(Math.random()))); // force a first frame
  while (!frames.length) await sleep(10);
  const t0 = frames[0];
  const now = () => Date.now() / 1000 - t0;
  const vp = p.viewportSize();
  let pos = { x: vp.width * 0.72, y: vp.height * 0.7 };
  const cursor = [{ t: 0, x: pos.x, y: pos.y }];
  const marks = [], boxes = {}, keys = []; // keys: when typing runs, for the keystroke sound
  let open = null;
  const glide = async (to, ms = 650) => {
    const from = pos, n = Math.max(8, Math.round(ms / 16)), start = now();
    for (let i = 1; i <= n; i++) {
      const e = i / n, k = e < 0.5 ? 4 * e * e * e : 1 - (-2 * e + 2) ** 3 / 2; // ease in-out, as the film draws it
      await p.mouse.move(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k);
      await sleep(16);
    }
    pos = to;
    cursor.push({ t: start, x: from.x, y: from.y }, { t: now(), x: to.x, y: to.y });
  };
  const target = async (sel) => {
    const l = typeof sel === "string" ? p.locator(sel).first() : sel.first();
    await l.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
    await sleep(250);
    const bb = await l.boundingBox();
    if (!bb) throw new Error(`no box: ${sel}`);
    return { l, bb, c: { x: bb.x + Math.min(bb.width / 2, 160), y: bb.y + bb.height / 2 } };
  };
  const at = () => { if (open && open.at === undefined) open.at = now(); };
  const k = {
    /** a moment the voice points at; the next action is its click */
    mark: (label) => { if (open && open.end === undefined) open.end = now(); open = { label, pre: now() }; marks.push(open); },
    /** nothing after this belongs to the open mark (page loads, scrolling back) */
    end: () => { if (open && open.end === undefined) open.end = now(); },
    /** the click that follows is the moment (not the one before it) */
    at: () => { if (open) delete open.at; },
    move: async (sel) => { const { c } = await target(sel); await glide(c); },
    click: async (sel, { wait = 900 } = {}) => {
      const { l, c } = await target(sel);
      await glide(c); at();
      cursor.push({ t: now(), x: c.x, y: c.y, click: true });
      await p.mouse.down(); await sleep(70); await p.mouse.up();
      await sleep(wait); await undemo(p);
      return l;
    },
    type: async (sel, text, { delay = 45, wait = 600 } = {}) => {
      await k.click(sel, { wait: 200 });
      const from = now();
      await p.keyboard.type(text, { delay });
      keys.push({ from: Math.round(from * 100) / 100, to: Math.round(now() * 100) / 100, n: text.length });
      await sleep(wait);
    },
    select: async (sel, value, { wait = 700 } = {}) => {
      const { l, c } = await target(sel);
      await glide(c); at(); cursor.push({ t: now(), x: c.x, y: c.y, click: true });
      await l.selectOption(value); await sleep(wait);
    },
    scroll: async (dy, ms = 900) => { at(); await p.evaluate((d) => window.scrollBy({ top: d, behavior: "smooth" }), dy); await sleep(ms); },
    wait: (ms) => sleep(ms),
    goto: async (path) => { k.end(); await p.goto(base + path); await p.waitForLoadState("networkidle").catch(() => {}); await sleep(500); await undemo(p); },
    box: async (key, sel) => {
      const l = typeof sel === "string" ? p.locator(sel).first() : sel.first();
      const bb = await l.boundingBox().catch(() => null);
      if (bb) boxes[key] = { t: now(), x: Math.round(bb.x), y: Math.round(bb.y), w: Math.round(bb.width), h: Math.round(bb.height) };
      else console.log("  ! no box", name, key);
    },
    page: p,
  };
  try { await fn(k); } catch (e) { console.log("✗", name, String(e).split("\n")[0]); }
  await sleep(1200);
  const dur = now();
  await cdp.send("Page.stopScreencast"); await sleep(100);
  if (open && open.end === undefined) open.end = dur;
  for (const m of marks) if (m.at === undefined) m.at = m.pre;
  // frames arrive only when the page changes: hold each until the next one
  const list = frames.map((t, i) => `file '${dir}/${String(i + 1).padStart(5, "0")}.jpg'\nduration ${((frames[i + 1] ?? t0 + dur) - t).toFixed(4)}`).join("\n");
  writeFileSync(`${dir}/list.txt`, list + `\nfile '${dir}/${String(frames.length).padStart(5, "0")}.jpg'\n`);
  const out = `${root}public/clips/${name}.mp4`;
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", `${dir}/list.txt`, "-vf", `fps=30,scale=${vp.width}:${vp.height}`, "-c:v", "libx264", "-preset", "slow", "-crf", "14", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out]);
  const r = (x) => Math.round(x * 100) / 100;
  meta[name] = { w: vp.width, h: vp.height, dur: r(dur), marks: marks.map((m) => ({ label: m.label, pre: r(m.pre), at: r(m.at), end: r(m.end) })), cursor: cursor.map((c) => ({ ...c, t: r(c.t), x: Math.round(c.x), y: Math.round(c.y) })), keys, boxes };
  writeFileSync(metaFile, JSON.stringify(meta, null, 1));
  console.log("•", name, `${dur.toFixed(1)}s`, frames.length, "frames", marks.map((m) => `${m.label}@${m.at.toFixed(1)}`).join(" "));
  await cdp.detach().catch(() => {});
}

// ---- a little class activity first, so results and analytics are not empty ----
if (!only || only.includes("setup")) {
  for (const [name, good] of [["Айару", true], ["Дана", false], ["Мирас", true]]) {
    const s = await student(name);
    await s.goto(base + "/oqushy/tapsyrmalar"); await s.click("main a:has-text('кейіптеу')");
    await s.fill("input[type=text][name^=t_], input:not([type])[name^=t_]", good ? "сақалды" : "суық");
    await s.locator("input[type=radio][name^=t_]").nth(good ? 1 : 0).check();
    const sel = s.locator("select[name^=t_]"); const n = await sel.count();
    for (let i = 0; i < n; i++) await sel.nth(i).selectOption(String(good ? n - i : i + 1));
    for (const ta of await s.locator("textarea[name^=t_]").all()) await ta.fill(good ? "Абай қысты ақ сақалды қарт адамға теңеп, кейіптеу тәсілін қолданады. «Ақ киімді, денелі, ақ сақалды» деген жолдар қыстың суық әрі қатал екенін көрсетеді." : "Қыс суық.");
    await s.click("text=Тапсыру"); await s.waitForSelector("text=Нәтижем");
    if (name !== "Айару") { // Айару does the plot line on camera
      await s.goto(base + "/oqushy/zertkhana/zheli/kozy-korpesh");
      const els = ["экспозиция", "байланыс", "шиеленіс", "шарықтау шегі", "шешім"];
      for (const [i, x] of (await s.locator("select[id^=el-]").all()).entries()) await x.selectOption(good ? els[Math.min(i, 4)] : "байланыс");
      await s.click("button:has-text('Тексеру')"); await sleep(600);
    }
    await s.context().close();
  }
  console.log("• setup");
}

// ---- the clips, in film order ----
{
  const t = await teacher();
  await clip("classes", t, async (k) => {
    await k.goto("/mugalim/synyptar");
    await k.box("code", "main :text('Сынып коды')");
    k.mark("open");
    await k.type("#cn", "8 «Б»", { delay: 90 });
    k.at();
    await k.click("button:has-text('Сынып ашу')", { wait: 1800 });
    await k.box("new", "main table tr:has-text('8 «Б»'), main :text('8 «Б»')");
  });
  await t.context().close();
}
{
  const p = await newPage();
  await p.goto(base + "/kiru"); await p.waitForTimeout(600);
  await clip("login", p, async (k) => {
    k.mark("type");
    await k.type("#code", "LAB7QA", { delay: 110 });
    await k.type("#name", "Айару", { delay: 110 });
    await k.type("#pin", "1234", { delay: 140 });
    k.mark("enter");
    await k.click("text=Зертханаға кіру", { wait: 2500 });
    await skipTour(p); await sleep(800);
  });
  await p.context().close();
}

const st = await student("Айару");
await clip("home", st, async (k) => {
  await k.goto("/oqushy");
  k.mark("stats");
  await k.move("main :text('ашылым')"); await k.wait(1400);
  k.mark("levels");
  await k.click("nav a:has-text('Жетістіктер'), aside a:has-text('Жетістіктер')", { wait: 1600 });
  await k.box("levels", "main");
  k.mark("plan");
  await k.click("nav a:has-text('Басты бет'), aside a:has-text('Басты бет')", { wait: 1000 });
  k.at();
  await k.click("button:has-text('Жоспар құру')", { wait: 2600 });
  await k.box("plan", "main :text('Жеке оқу жоспары')");
});
await clip("works", st, async (k) => {
  await k.goto("/oqushy/shygarmalar");
  k.mark("list");
  await k.type("main input", "Абай", { delay: 120, wait: 900 });
  await k.click("main a[href*='/shygarmalar/abai-qys']", { wait: 1500 });
  k.mark("word");
  await k.move("button:has-text('кейіптеп')"); await k.wait(700);
  k.mark("meaning");
  await k.click("button:has-text('кейіптеп')", { wait: 1600 });
  k.mark("save");
  await k.click("button:has-text('Сөздігіме қосу')", { wait: 1600 });
});
await clip("olen", st, async (k) => {
  await k.goto("/oqushy/zertkhana/olen/abai-qys");
  k.mark("syllables");
  await k.click("text=Буындарды көрсету", { wait: 1800 });
  await k.box("tags", "text=11 буын");
  k.mark("rhyme");
  await k.click("text=Ұйқасты белгілеу", { wait: 1800 });
  k.mark("check");
  await k.click("text=11 буынды (қара өлең өлшемі)", { wait: 400 });
  await k.click("label:has-text('а-а-б-а')", { wait: 400 });
  await k.click("text=Тексеру", { wait: 2000 });
  await k.box("ok", "text=Ұйқас түрі дұрыс");
});
await clip("karta", st, async (k) => {
  await k.goto("/oqushy/zertkhana/karta/kozy-korpesh");
  k.mark("map");
  await k.box("map", "main :text('Кейіпкер картасы')");
  await k.move("main :text('Қозы Көрпеш') >> nth=1"); await k.wait(600);
  await k.move("main :text('Баян сұлу') >> nth=1"); await k.wait(900);
  k.mark("egeri");
  await k.type("#prediction", "Қозы мен Баян ерте қосылар еді, бірақ Қодар бәрібір кек сақтар еді.", { delay: 28 });
  await k.goto("/oqushy/zertkhana/zheli/kozy-korpesh");
  // off camera: the events start shuffled; put them in order but one, so on camera one move finishes it
  const up = (text) => k.page.locator(`button[aria-label='«${text}» жоғары']`).click();
  for (let i = 0; i < 4; i++) await up("Сарыбай мен Қарабай балаларын туылмай тұрып атастырады");
  for (let i = 0; i < 2; i++) await up("Қозы Көрпеш ер жетіп, Баянды іздеп шығады");
  await up("Баян Қодардан кек алып, Қозының басында өзі де қаза табады");
  // and the first three elements chosen: on camera only the last move, two choices and the check
  for (const [id, el] of [["e1", "экспозиция"], ["e2", "байланыс"], ["e3", "шиеленіс"]]) await k.page.selectOption(`#el-${id}`, el);
  await sleep(400);
  k.mark("plot");
  await k.click("button[aria-label='«Қодар Қозы Көрпешті өлтіреді» жоғары']", { wait: 500 });
  await k.select("#el-e4", "шарықтау шегі", { wait: 300 });
  await k.select("#el-e5", "шешім", { wait: 300 });
  await k.click("button:has-text('Тексеру')", { wait: 2200 });
});
await clip("suhbat", st, async (k) => {
  await k.goto("/oqushy/suhbat");
  k.mark("abai");
  await k.click("main a[href^='/oqushy/suhbat/']", { wait: 1800 });
  // There is no AI key here: the site's demo answer would only greet. Abai's answer is written as the persona
  // prompt asks: a quote only from checked text (src/lib/quotes.ts, «Ғылым таппай мақтанба»), the rest to the book.
  await k.page.evaluate((answer) => {
    const f = window.fetch;
    window.fetch = (u, o) => (o?.method === "POST" && String(u).startsWith("/api/chat")
      ? Promise.resolve(new Response(new ReadableStream({ async start(c) {
          for (const w of answer.split(/(?<= )/)) { c.enqueue(new TextEncoder().encode(w)); await new Promise((r) => setTimeout(r, 55)); }
          c.close();
        } }), { headers: { "Content-Type": "text/plain; charset=utf-8" } }))
      : f(u, o));
  }, "Шырағым, «Ғылым таппай мақтанба» өлеңімде жастарға былай дедім: «Бес нәрседен қашық бол, бес нәрсеге асық бол, адам болам десеңіз». Ол қандай нәрселер екенін өлеңнің өзінен оқып тап.");
  k.mark("ask");
  await k.click(k.page.locator("main button").filter({ hasText: "?" }).nth(1), { wait: 5500 });
  await k.goto("/oqushy/shygarmalar/abai-qys");
  k.mark("helper");
  await k.click("text=Сұрағың бар ма?", { wait: 600 });
  await k.type("#chat-input", "Бұл өлеңде қандай көркемдік тәсіл бар?", { delay: 35, wait: 200 });
  await k.page.keyboard.press("Enter"); await k.wait(4500);
  await k.box("panel", "#chat-panel");
});
await clip("creative", st, async (k) => {
  await k.goto("/oqushy/shygarmashylyq/kozy-korpesh");
  await k.page.locator("#soni-text").scrollIntoViewIfNeeded(); await k.wait(400);
  k.mark("write");
  await k.type("#soni-text", "Сол кезде Қарабай уәдесінде тұрып, екі жасты қосады. Қодар ашуын басып, елден кетеді. Қозы мен Баян ұзақ әрі бақытты өмір сүреді.", { delay: 22 });
  await k.click("button:has-text('Сақтау')", { wait: 1500 });
  k.mark("feedback");
  await k.click("button:has-text('ЖИ пікірін алу')", { wait: 1200 });
  await k.scroll(300, 1400); // the whole answer in view
  await k.box("fb", "main :text('ЖИ пікірі')");
  k.mark("voice");
  await k.move("button:has-text('Дауыспен айту')"); await k.wait(1500);
});
await clip("zhattau", st, async (k) => {
  await k.goto("/oqushy/zhattau");
  k.mark("levels");
  for (const lvl of ["1. Әр төртінші сөз", "2. Әр екінші сөз", "3. Бас әріптері", "4. Толық жасырын"]) await k.click(`button:has-text('${lvl}')`, { wait: 750 });
  await k.goto("/oqushy/kartochka");
  k.mark("card");
  const labels = k.page.locator("label:has(input[name=theme])");
  for (let i = 1; i < 4; i++) await k.click(labels.nth(i), { wait: 650 });
  k.mark("share");
  await k.click("button:has-text('Бөлісу')", { wait: 1500 });
});
await clip("world", st, async (k) => {
  await k.goto("/oqushy/adebi-karta");
  k.mark("map");
  await k.click("button[aria-label^='Мұхтар Әуезов:']", { wait: 1300 }); // pins on the map: the map stays in view
  await k.click("button[aria-label^='Ыбырай Алтынсарин:']", { wait: 1300 });
  await k.goto("/oqushy/tarih");
  k.mark("history");
  await k.scroll(500, 1400); await k.scroll(500, 1400);
});
await clip("baige", st, async (k) => {
  await k.goto("/oqushy/baige");
  k.mark("quiz");
  await k.click("main a:has-text('Бастау'), main button:has-text('Бастау')", { wait: 1500 });
  // the right answer when the question is the one recorded for the film, else the first option
  const right = k.page.locator("main label", { hasText: "Халық ауыз әдебиеті" });
  await k.click((await right.count()) ? right : k.page.locator("main label"), { wait: 500 });
  await k.click("button:has-text('Келесі'), button:has-text('Тексеру')", { wait: 1000 });
  await k.goto("/oqushy/baige");
  k.mark("streak");
  await k.move("main :text('Тізбек')"); await k.wait(1200);
  k.mark("rating");
  await k.scroll(380, 1200);
  await k.move("main :text('Айару (сен)')"); await k.wait(1200);
});
await st.context().close();
{
  const ph = await student("Мирас", { phone: true });
  await clip("phone", ph, async (k) => { await k.goto("/oqushy"); k.mark("top"); await k.wait(900); await k.scroll(700, 1500); await k.scroll(700, 1500); });
  await ph.context().close();
}
{
  const t = await teacher();
  await clip("results", t, async (k) => {
    await k.goto("/mugalim/natizheler");
    k.mark("table");
    await k.box("table", "main table");
    await k.move("main table tr:has-text('Айару')"); await k.wait(1000);
    k.mark("grade");
    await k.click("text=Бағалау", { wait: 1200 });
    await k.click("text=ЖИ-ден ұсыныс балы", { wait: 2500 });
    k.mark("analytics");
    await k.click("nav a:has-text('Аналитика'), aside a:has-text('Аналитика')", { wait: 2500 });
  });
  await clip("teacher", t, async (k) => {
    await k.goto("/mugalim/zhasau");
    k.mark("material");
    const v = await k.page.locator("#work option", { hasText: "«Қыс»" }).first().getAttribute("value");
    await k.select("#work", v);
    await k.type("#title", "Абай, «Қыс»: кейіптеу", { delay: 45 });
    await k.select("#grade", "6", { wait: 300 });
    await k.click(k.page.locator("label:has(input[name=method_id])").nth(0), { wait: 700 });
    k.mark("generate");
    await k.click("button:has-text('Тапсырма жасау')", { wait: 800 });
    await k.page.waitForURL(/bank\/.+/, { timeout: 30000 }); await k.wait(1500); await undemo(k.page);
    k.mark("approve");
    await k.click("button:has-text('Бекіту')", { wait: 1500 });
    k.mark("assign");
    await k.select("#ai", "limited", { wait: 500 });
    await k.click("button:has-text('Сыныпқа жіберу')", { wait: 1800 });
  });
  await t.context().close();
}
// ---- stills for the film's picture wall: one frame from the end of each clip, and the dark mode ----
mkdirSync(root + "public/wall", { recursive: true });
if (!only || only.includes("wall")) {
  const d = await student("Айару", { dark: true });
  await d.goto(base + "/oqushy"); await sleep(1200); await undemo(d);
  await d.screenshot({ path: root + "public/wall/dark.jpg", type: "jpeg", quality: 90 });
  await d.context().close();
}
// idle: spans where the page stands still and the cursor too (a server answer on its way): the film shortens them
const moving = (m) => m.cursor.slice(1).flatMap((c, i) => (c.t > m.cursor[i].t && (c.x !== m.cursor[i].x || c.y !== m.cursor[i].y) ? [[m.cursor[i].t, c.t]] : []));
for (const [name, m] of Object.entries(meta)) {
  const log = spawnSync("ffmpeg", ["-v", "info", "-i", `${root}public/clips/${name}.mp4`, "-vf", "freezedetect=n=-80dB:d=0.4", "-map", "0:v", "-f", "null", "-"], { encoding: "utf8" }).stderr;
  const r = (x) => Math.round(x * 100) / 100;
  const ends = [...log.matchAll(/freeze_end: ([\d.]+)/g)].map((x) => Number(x[1]));
  let idle = [...log.matchAll(/freeze_start: ([\d.]+)/g)].map((x, i) => [Number(x[1]), ends[i] ?? m.dur]);
  idle = idle.reduce((a, s) => (a.length && s[0] - a.at(-1)[1] < 0.05 ? (a.at(-1)[1] = s[1], a) : [...a, s]), []); // one long freeze can come in parts
  for (const [a, b] of [...moving(m), ...m.keys.map((k) => [k.from, k.to])]) idle = idle.flatMap(([x, y]) => (b <= x || a >= y ? [[x, y]] : [[x, a], [b, y]].filter(([p, q]) => q - p >= 0.4)));
  m.idle = idle.map(([a, b]) => [r(a), r(b)]);
}
writeFileSync(metaFile, JSON.stringify(meta, null, 1));
for (const [name, m] of Object.entries(meta)) {
  if (name === "phone") continue;
  const last = m.marks.at(-1);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", String(Math.max(0, last.end - 0.2)), "-i", `${root}public/clips/${name}.mp4`, "-frames:v", "1", "-vf", "scale=960:-1", "-q:v", "3", `${root}public/wall/${name}.jpg`]);
}
await b.close();
