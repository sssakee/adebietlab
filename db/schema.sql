-- ӘдебиетLab schema. Re-runnable: drops and recreates everything.
-- The browser never talks to the database: all access goes through the Next.js server,
-- which checks the role on every request (src/lib/auth.ts). RLS is still enabled on every
-- table with no policies, so Supabase's public anon/REST access sees nothing.

drop schema if exists app cascade;
create schema app;
set search_path = app, public;

create table profiles (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('teacher', 'student')),
  full_name text not null,
  email text unique,               -- teachers only
  password_hash text,              -- teachers only
  pin_hash text,                   -- students only (4-digit PIN, hashed)
  points int not null default 0,
  created_at timestamptz not null default now()
);

create table classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references profiles on delete cascade,
  name text not null,
  grade int not null check (grade between 5 and 11),
  join_code text not null unique check (join_code ~ '^[A-Z0-9]{6}$'),
  created_at timestamptz not null default now()
);

create table class_members (
  class_id uuid not null references classes on delete cascade,
  student_id uuid not null references profiles on delete cascade,
  primary key (class_id, student_id)
);

create table works (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  author text not null,
  author_years text,
  genre text not null,
  grades int[] not null default '{}',
  summary text not null default '',
  text text,                       -- only public-domain texts from a checked source
  text_source text,
  is_public_domain boolean not null default false,
  lab jsonb not null default '{}'  -- data for lab tools (poem lines, characters, reference map, «Егер...» question)
);

create table methods (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  instructions text not null
);

create table task_sets (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references profiles on delete cascade,
  method_id uuid not null references methods,
  work_id uuid references works,
  title text not null,
  material_text text not null,
  grade int not null,
  objective text not null default '',
  level text not null check (level in ('A', 'B', 'C')),
  status text not null default 'draft' check (status in ('draft', 'approved')),
  ai_generated boolean not null default true,
  ai_note text not null default '',
  created_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references task_sets on delete cascade,
  position int not null,
  type text not null,
  prompt text not null,
  options jsonb not null default '[]',
  answer_key jsonb,
  criteria text not null,
  points int not null,
  source_ref text not null default ''
);

-- kind 'tasks' → a task set; kind 'lab' → lab tools on a work.
create table assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes on delete cascade,
  kind text not null check (kind in ('tasks', 'lab')),
  set_id uuid references task_sets on delete cascade,
  work_id uuid references works,
  lab_tools text[] not null default '{}',
  due_at date,
  ai_mode text not null default 'limited' check (ai_mode in ('off', 'limited', 'full')),
  created_at timestamptz not null default now(),
  check ((kind = 'tasks' and set_id is not null) or (kind = 'lab' and work_id is not null))
);

create table submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments on delete cascade,
  student_id uuid not null references profiles on delete cascade,
  answers jsonb not null default '{}',
  auto_scores jsonb not null default '{}',     -- task id → points (closed tasks)
  ai_suggestions jsonb not null default '{}',  -- task id → { suggested_score, feedback }
  teacher_scores jsonb not null default '{}',  -- task id → points (open tasks)
  feedback text not null default '',
  status text not null default 'submitted' check (status in ('submitted', 'graded')),
  used_ai_hint boolean not null default false,
  submitted_at timestamptz not null default now(),
  unique (assignment_id, student_id)
);

-- Lab tool results. kind: 'olen' | 'char_map' | 'egerde'.
create table lab_works (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles on delete cascade,
  work_id uuid not null references works,
  kind text not null check (kind in ('olen', 'char_map', 'egerde')),
  data jsonb not null default '{}',
  result jsonb not null default '{}',
  teacher_scores int[],            -- «Егер...»: 3 criteria × 0–2
  shared boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (student_id, work_id, kind)
);

create table lab_votes (
  lab_work_id uuid not null references lab_works on delete cascade,
  student_id uuid not null references profiles on delete cascade,
  primary key (lab_work_id, student_id)
);

-- Chat content is not stored at all: the teacher never reads it and nothing expires.
-- Only counters for the daily limit and token cost, plus the "used AI hint" mark.
create table ai_usage (
  user_id uuid not null references profiles on delete cascade,
  day date not null default current_date,
  requests int not null default 0,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  primary key (user_id, day)
);

create table ai_hints (
  assignment_id uuid not null references assignments on delete cascade,
  student_id uuid not null references profiles on delete cascade,
  primary key (assignment_id, student_id)
);

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'app' loop
    execute format('alter table app.%I enable row level security', t);
  end loop;
end $$;
