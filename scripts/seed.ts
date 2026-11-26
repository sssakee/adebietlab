// npm run db:setup — recreates the schema and loads demo data.
import { readFileSync } from "node:fs";
import postgres from "postgres";
import { hashSecret } from "../src/lib/password";
import { mockGenerate } from "../src/lib/ai/mock";
import { WORKS, METHODS, DEMO_MATERIAL } from "./seed-data";

const sql = postgres(process.env.DATABASE_URL ?? "postgres://app:app@localhost:5432/adebietlab", {
  prepare: false,
  onnotice: () => {},
});

async function main() {
  await sql.unsafe(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"));
  await sql`set search_path = app`;

  for (const w of WORKS) await sql`insert into app.works ${sql(w as Record<string, unknown>, Object.keys(w) as never)}`;
  for (const m of METHODS) await sql`insert into app.methods ${sql(m)}`;

  const [teacher] = await sql`insert into app.profiles (role, full_name, email, password_hash)
    values ('teacher', 'Гүлнар Әлиқызы', 'demo@adebietlab.kz', ${hashSecret("demo1234")}) returning id`;
  const [cls] = await sql`insert into app.classes (teacher_id, name, grade, join_code)
    values (${teacher.id}, '7 «Ә»', 7, 'LAB7QA') returning id`;

  const students: Record<string, string> = {};
  for (const [name, points] of [["Айару", 42], ["Дана", 35], ["Мирас", 18]] as const) {
    const [s] = await sql`insert into app.profiles (role, full_name, pin_hash, points)
      values ('student', ${name}, ${hashSecret("1234")}, ${points}) returning id`;
    await sql`insert into app.class_members values (${cls.id}, ${s.id})`;
    students[name] = s.id;
  }

  const [kozy] = await sql`select id from app.works where slug = 'kozy-korpesh'`;
  const [qys] = await sql`select id from app.works where slug = 'abai-qys'`;
  const [bloom] = await sql`select id from app.methods where slug = 'bloom'`;

  // Lab assignment: character map + «Егер...» on «Қозы Көрпеш – Баян сұлу».
  const nextFriday = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  await sql`insert into app.assignments (class_id, kind, work_id, lab_tools, due_at, ai_mode)
    values (${cls.id}, 'lab', ${kozy.id}, ${["char_map", "egerde"]}, ${nextFriday}, 'limited')`;

  // Approved task set from the demo material, assigned to the class.
  const gen = mockGenerate({ methodSlug: "bloom", material: DEMO_MATERIAL, count: 6, level: "B" });
  const [set] = await sql`insert into app.task_sets (teacher_id, method_id, work_id, title, material_text, grade, objective, level, status, ai_note)
    values (${teacher.id}, ${bloom.id}, ${qys.id}, '«Қыс» өлеңіндегі кейіптеу', ${DEMO_MATERIAL}, 7, 'Өлеңдегі кейіптеуді табу және түсіндіру', 'B', 'approved', ${gen.note}) returning id`;
  for (const [i, t] of gen.tasks.entries())
    await sql`insert into app.tasks (set_id, position, type, prompt, options, answer_key, criteria, points, source_ref)
      values (${set.id}, ${i}, ${t.type}, ${t.prompt}, ${sql.json(t.options)}, ${sql.json(t.answer_key)}, ${t.criteria}, ${t.points}, ${t.source_ref})`;
  await sql`insert into app.assignments (class_id, kind, set_id, due_at, ai_mode) values (${cls.id}, 'tasks', ${set.id}, ${nextFriday}, 'limited')`;

  // Some lab progress so the dashboards are not empty.
  const lab = (student: string, work: string, kind: string, data: object, result: object, shared = false) =>
    sql`insert into app.lab_works (student_id, work_id, kind, data, result, shared)
      values (${students[student]}, ${work}, ${kind}, ${sql.json(data as never)}, ${sql.json(result as never)}, ${shared}) returning id`;

  await lab("Айару", qys.id, "olen", { meter: "11", rhyme: "а-а-б-а" }, { meter_ok: true, rhyme_ok: true });
  await lab("Мирас", qys.id, "olen", { meter: "11", rhyme: "а-б-а-б" }, { meter_ok: true, rhyme_ok: false });
  await lab(
    "Айару",
    kozy.id,
    "char_map",
    {
      edges: [
        { from: "sarybai", to: "karabai", evidence: "Екі бай балаларын туылмай тұрып атастырады." },
        { from: "sarybai", to: "kozy", evidence: "Сарыбай — Қозының әкесі." },
        { from: "karabai", to: "bayan", evidence: "Қарабай — Баянның әкесі." },
        { from: "kozy", to: "bayan", evidence: "Әкелері уәделескен атастырылған жар." },
      ],
    },
    { found: 4, total: 6, missing: ["kodar|kozy", "bayan|kodar"] },
  );
  const [d] = await lab("Дана", kozy.id, "egerde", { prediction: "Қозы мен Баян ерте қосылып, Қодармен қақтығыс болмас еді.", evidence: "Қарабайдың көшіп кететін эпизоды", checklist: [true, true, false] }, {}, true);
  const [m] = await lab("Мирас", kozy.id, "egerde", { prediction: "Бәрібір сынақ болар еді: Қодар Баянды жеңіл бермес еді.", evidence: "Қодардың Баянға қызығуы", checklist: [true, false, true] }, {}, true);
  await lab("Айару", kozy.id, "egerde", { prediction: "Егер Қарабай уәдесінде тұрғанда, Қозы мен Баян ерте қосылар еді. Бірақ Қодар Баянға қызығатындықтан, қақтығыс бәрібір болар еді, тек басқаша аяқталуы мүмкін еді.", evidence: "Қарабайдың уәдесінен тайып, көшіп кеткен эпизоды", checklist: [true, true, true] }, {}, true);
  await sql`insert into app.lab_votes values (${d.id}, ${students["Айару"]}), (${d.id}, ${students["Мирас"]}), (${m.id}, ${students["Айару"]})`;

  console.log("Дерекқор дайын. Мұғалім: demo@adebietlab.kz / demo1234. Сынып коды: LAB7QA, оқушылар: Айару, Дана, Мирас (PIN 1234).");
  await sql.end();
}

main().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
