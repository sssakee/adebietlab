// Tables added after the first release. Created on first use, so the live database (Supabase) needs
// no manual migration; db/schema.sql has the same definitions for a fresh setup.
import "server-only";
import { sql } from "./db";

const DDL = `
create table if not exists app.points_log (
  student_id uuid not null references app.profiles on delete cascade,
  points int not null,
  reason text not null default '',
  at timestamptz not null default now()
);
create index if not exists points_log_at on app.points_log (at);
create table if not exists app.quiz_results (
  student_id uuid not null references app.profiles on delete cascade,
  quiz text not null,
  best int not null default 0,
  total int not null,
  updated_at timestamptz not null default now(),
  primary key (student_id, quiz)
);
create table if not exists app.words (
  student_id uuid not null references app.profiles on delete cascade,
  word text not null,
  meaning text not null,
  source text not null default 'sozdik',
  added_at timestamptz not null default now(),
  primary key (student_id, word)
);
create table if not exists app.reading_plans (
  student_id uuid primary key references app.profiles on delete cascade,
  plan jsonb not null,
  created_at timestamptz not null default now()
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'lab_works_kind_check' and pg_get_constraintdef(oid) like '%soni%') then
    alter table app.lab_works drop constraint if exists lab_works_kind_check;
    alter table app.lab_works add constraint lab_works_kind_check check (kind in ('olen', 'char_map', 'egerde', 'zheli', 'soni', 'hat'));
  end if;
end $$;
alter table app.points_log enable row level security;
alter table app.quiz_results enable row level security;
alter table app.words enable row level security;
alter table app.reading_plans enable row level security;
`;

let ready: Promise<unknown> | undefined;

/** Runs once per server process; a failure is retried on the next request. */
export const ensureFeatures = () =>
  (ready ??= sql.unsafe(DDL).simple().catch((e) => {
    ready = undefined;
    throw e;
  }));
