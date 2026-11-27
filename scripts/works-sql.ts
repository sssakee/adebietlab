// npm run db:works — builds db/works-update.sql: brings the works list of a live database (Supabase)
// up to date without touching anyone's data. Safe to run again: works are matched by slug.
import { writeFileSync } from "node:fs";
import { WORKS } from "./seed-data";

const cols = ["slug", "title", "author", "author_years", "genre", "grades", "summary", "text", "text_source", "read_url", "is_public_domain", "lab"];
const rows = WORKS.map((w) => JSON.stringify({ lab: {}, ...w })).join(",\n");
if (rows.includes("$works$")) throw new Error("a work contains the SQL quote tag $works$");

writeFileSync(
  new URL("../db/works-update.sql", import.meta.url),
  `-- Supabase → SQL Editor → осы файлдың бүкіл мазмұнын қойып → Run.
-- Шығармалар тізімін жаңартады; оқушы мен мұғалімнің деректеріне тимейді. Қайта жүргізуге болады.
-- Файлды npm run db:works қайта шығарады (дереккөзі: scripts/seed-data.ts).
alter table app.works add column if not exists read_url text;

insert into app.works (${cols.join(", ")})
select ${cols.join(", ")}
from jsonb_populate_recordset(null::app.works, $works$[
${rows}
]$works$)
on conflict (slug) do update set
  ${cols.filter((c) => c !== "slug").map((c) => `${c} = excluded.${c}`).join(",\n  ")};
`,
);
console.log(`db/works-update.sql дайын: ${WORKS.length} шығарма.`);
