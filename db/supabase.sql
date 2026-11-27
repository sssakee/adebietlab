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

-- Built-in methods have owner_id null; a teacher's own methods are visible only to that teacher.
create table methods (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  instructions text not null,
  example text not null default '',
  owner_id uuid references profiles on delete cascade
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

-- Lab tool results. kind: 'olen' | 'char_map' | 'egerde' | 'zheli' (оқиға желісі).
create table lab_works (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles on delete cascade,
  work_id uuid not null references works,
  kind text not null check (kind in ('olen', 'char_map', 'egerde', 'zheli')),
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

-- Failed sign-ins per account and per IP (src/lib/limit.ts). The app also creates it on first use.
create table login_attempts (
  key text primary key,
  fails int not null default 0,
  reset_at timestamptz not null
);

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'app' loop
    execute format('alter table app.%I enable row level security', t);
  end loop;
end $$;

-- Демо деректер (npm run db:setup нәтижесі)
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;
INSERT INTO app.profiles VALUES ('64a91de3-b909-413c-a9d3-7cbb984701d9', 'teacher', 'Гүлнар Әлиқызы', 'demo@adebietlab.kz', 'df8cac8e11167f62542d70cbbe65a908:928a80f5d8c6102894f554d1c47c914bce147f8d062beb62ed9cd4b0cab7cb7d', NULL, 0, '2026-11-27 05:37:55.593164+00');
INSERT INTO app.profiles VALUES ('b01a4da6-0db5-4ddd-959a-9f808525edac', 'student', 'Айару', NULL, NULL, 'a57e1709a33d4f5f5057b78f25f73fd1:7232913a9a2216209e6fbedca0a24120e9b7d331de7d2929e3e323533c908de0', 42, '2026-11-27 05:37:55.6381+00');
INSERT INTO app.profiles VALUES ('c1877440-0f25-4190-8b5e-43e84d8db82b', 'student', 'Дана', NULL, NULL, 'e7165f96e9bcb5c1c4768403e8afa361:5f0b2689b6b81167d9e0cdaf56067214de4b8500cd1e53c2a6387ef475891be8', 35, '2026-11-27 05:37:55.667394+00');
INSERT INTO app.profiles VALUES ('5e921b35-7fb3-4a7f-b1ef-70f8e71b767f', 'student', 'Мирас', NULL, NULL, 'c9079823ab4baa5b29cc80a2831a8a78:324b79c40c9a9ad5e35f846766b0901e00c7f3c93dd071b86524172e5529ed88', 18, '2026-11-27 05:37:55.694665+00');
INSERT INTO app.classes VALUES ('aa4617aa-1830-4ee6-a1ae-34eac4d6973e', '64a91de3-b909-413c-a9d3-7cbb984701d9', '7 «Ә»', 7, 'LAB7QA', '2026-11-27 05:37:55.595763+00');
INSERT INTO app.methods VALUES ('5cfaa04e-a024-4dc0-93c2-4f761b40712b', 'bloom', 'Блум таксономиясы бойынша сұрақтар', 'Білу, түсіну, қолдану, талдау, жинақтау, бағалау деңгейіндегі сұрақтар.', 'Сұрақтарды төменгі деңгейден (білу) жоғарғы деңгейге (бағалау) қарай орналастыр. Білу деңгейіне жабық сұрақ, жоғары деңгейлерге ашық сұрақ жаса. Әр сұрақтың шартына деңгейін жаз.', '', NULL);
INSERT INTO app.methods VALUES ('74fe6996-2245-4294-ad62-a441d1be39bc', 'test', 'Тест және сәйкестендіру', 'Бір жауапты тест, сәйкестендіру, бос орынды толтыру, ретке қою.', 'Тек жабық тапсырмалар жаса: single_choice, matching, fill_blank, ordering. Әр тестте 4 нұсқа, біреуі ғана дұрыс. Дұрыс емес нұсқалар сенімді, бірақ мәтінге қайшы болсын.', '', NULL);
INSERT INTO app.methods VALUES ('3e4c213a-c3b4-4e0d-b128-45fc94a17705', 'sinkvein', 'Синквейн', 'Кейіпкерге не ұғымға бес жолдық өлең құрастыру.', 'Бір open тапсырма жаса: 1-жол — зат есім, 2-жол — екі сын есім, 3-жол — үш етістік, 4-жол — төрт сөзден тұратын сөйлем, 5-жол — бір синоним. Критерийде әр жолдың талабын жаз. Қаласаң, бір fill_blank тапсырмасын қос.', '', NULL);
INSERT INTO app.methods VALUES ('b4303b0f-b7e8-4b7c-993f-30af2c88b623', 'venn', 'Венн диаграммасы', 'Екі кейіпкерді, екі шығарманы немесе екі бейнені салыстыру.', 'Материалдан салыстыруға болатын екі нысанды тап. Ұқсастық пен айырмашылықты табуға арналған open тапсырма және бір matching тапсырмасын (белгі → кейіпкер) жаса.', '', NULL);
INSERT INTO app.works VALUES ('26b01680-fdf1-4835-a054-f7bd3ee18e82', 'abai-qys', 'Қыс', 'Абай Құнанбайұлы', '1845–1904', 'Өлең', '{5,6,7}', 'Абай қысты ақ киімді, ақ сақалды қарт бейнесінде кейіптеп суреттейді.', 'Ақ киімді, денелі, ақ сақалды,
Соқыр, мылқау, танымас тірі жанды.
Үсті-басы ақ қырау, түсі суық,
Басқан жері сықырлап, келіп қалды.', 'ТЗ-да тексерілген үзінді (1-шумақ). Толық мәтінді сенімді басылымнан қосыңыз.', true, '{"poem": {"lines": ["Ақ киімді, денелі, ақ сақалды,", "Соқыр, мылқау, танымас тірі жанды.", "Үсті-басы ақ қырау, түсі суық,", "Басқан жері сықырлап, келіп қалды."], "meter": "11", "rhyme": "а-а-б-а"}}');
INSERT INTO app.works VALUES ('701ee98a-2cf6-4196-9038-80e242934716', 'abai-gylym', 'Ғылым таппай мақтанба', 'Абай Құнанбайұлы', '1845–1904', 'Өлең', '{8,9}', '', NULL, NULL, true, '{}');
INSERT INTO app.works VALUES ('fd7a6606-d40d-4b33-b1c2-af750f50a433', 'abai-qara-soz', 'Қара сөздер', 'Абай Құнанбайұлы', '1845–1904', 'Проза', '{9,10,11}', '', NULL, NULL, true, '{}');
INSERT INTO app.works VALUES ('1870516b-669b-4228-ba16-0835454ef662', 'altynsarin-kel', 'Кел, балалар, оқылық', 'Ыбырай Алтынсарин', '1841–1889', 'Өлең', '{5}', '', NULL, NULL, true, '{}');
INSERT INTO app.works VALUES ('37961d14-4af6-4335-b536-3d14dd5bcc96', 'baitursynuly-qyryq', 'Қырық мысал', 'Ахмет Байтұрсынұлы', '1872–1937', 'Мысал', '{5,6}', '', NULL, NULL, true, '{}');
INSERT INTO app.works VALUES ('e3a67bb3-b488-4f40-b51c-f1639f374c6b', 'zhumabaev-olender', 'Өлеңдері', 'Мағжан Жұмабаев', '1893–1938', 'Өлең', '{9,10,11}', '', NULL, NULL, true, '{}');
INSERT INTO app.works VALUES ('71648ca3-e462-4879-8b51-d616c9bd2834', 'shakarim-olender', 'Өлеңдері', 'Шәкәрім Құдайбердіұлы', '1858–1931', 'Өлең', '{9,10,11}', '', NULL, NULL, true, '{}');
INSERT INTO app.works VALUES ('48381300-f3d2-4fc6-a855-ebfcb8230aa7', 'kozy-korpesh', 'Қозы Көрпеш – Баян сұлу', 'Халық ауыз әдебиеті', NULL, 'Лиро-эпостық жыр', '{7}', 'Қозы Көрпеш пен Баян сұлудың махаббаты туралы қазақтың лиро-эпостық жыры.', NULL, NULL, true, '{"egerde": {"question": "Егер Қарабай уәдесінде тұрғанда, оқиға қалай өрбір еді?", "checklist": ["Болжам кейіпкердің мінезіне сай", "Жырдан дәлел келтірдім", "Оқиғаның соңын түсіндірдім"]}, "timeline": [{"id": "e1", "text": "Сарыбай мен Қарабай балаларын туылмай тұрып атастырады", "element": "экспозиция"}, {"id": "e2", "text": "Сарыбай қайтыс болып, Қарабай уәдесінен тайып, елін көшіріп кетеді", "element": "байланыс"}, {"id": "e3", "text": "Қозы Көрпеш ер жетіп, Баянды іздеп шығады", "element": "шиеленіс"}, {"id": "e4", "text": "Қодар Қозы Көрпешті өлтіреді", "element": "шарықтау шегі"}, {"id": "e5", "text": "Баян Қодардан кек алып, Қозының басында өзі де қаза табады", "element": "шешім"}], "reference": [{"to": "karabai", "from": "sarybai", "label": "құда болуға уәделесті"}, {"to": "kozy", "from": "sarybai", "label": "әкесі"}, {"to": "bayan", "from": "karabai", "label": "әкесі"}, {"to": "bayan", "from": "kozy", "label": "атастырылған жар"}, {"to": "bayan", "from": "kodar", "label": "Баянға қызығады"}, {"to": "kozy", "from": "kodar", "label": "өліміне себепкер"}], "characters": [{"x": 140, "y": 50, "id": "sarybai", "kind": "secondary", "name": "Сарыбай", "note": "бай"}, {"x": 460, "y": 50, "id": "karabai", "kind": "secondary", "name": "Қарабай", "note": "бай"}, {"x": 140, "y": 180, "id": "kozy", "kind": "main", "name": "Қозы Көрпеш", "note": "басты кейіпкер"}, {"x": 460, "y": 180, "id": "bayan", "kind": "main", "name": "Баян сұлу", "note": "басты кейіпкер"}, {"x": 300, "y": 290, "id": "kodar", "kind": "antagonist", "name": "Қодар", "note": "қарсы кейіпкер"}]}');
INSERT INTO app.works VALUES ('5c22c560-7989-4f5e-b7db-5319e2eb5575', 'qyz-zhibek', 'Қыз Жібек', 'Халық ауыз әдебиеті', NULL, 'Лиро-эпостық жыр', '{7,8}', '', NULL, NULL, true, '{}');
INSERT INTO app.works VALUES ('9e17a7cf-a326-4cf1-8899-eb594f2ae0fc', 'er-targyn', 'Ер Тарғын', 'Халық ауыз әдебиеті', NULL, 'Батырлар жыры', '{6,7}', '', NULL, NULL, true, '{}');
INSERT INTO app.works VALUES ('4990495d-347f-4265-ad1e-825bb82af7cc', 'alpamys', 'Алпамыс батыр', 'Халық ауыз әдебиеті', NULL, 'Батырлар жыры', '{6,7}', '', NULL, NULL, true, '{}');
INSERT INTO app.works VALUES ('3547443d-3a5d-4111-bb6e-3fa5fd6dd57b', 'er-tostik', 'Ер Төстік', 'Халық ауыз әдебиеті', NULL, 'Ертегі', '{5}', '', NULL, NULL, true, '{}');
INSERT INTO app.works VALUES ('77f93538-98ab-487a-979e-9dda1c2102de', 'aldar-kose', 'Алдар Көсе туралы ертегілер', 'Халық ауыз әдебиеті', NULL, 'Ертегі', '{5}', '', NULL, NULL, true, '{}');
INSERT INTO app.works VALUES ('0ede02b8-3c23-4e42-93d0-383ece4c38e1', 'auezov-kokserek', 'Көксерек', 'Мұхтар Әуезов', '1897–1961', 'Әңгіме', '{7,8}', '', NULL, NULL, false, '{}');
INSERT INTO app.works VALUES ('91d439fc-77cc-48ef-a7ef-7fa7006c154b', 'auezov-abai-zholy', 'Абай жолы', 'Мұхтар Әуезов', '1897–1961', 'Роман-эпопея', '{10,11}', '', NULL, NULL, false, '{}');
INSERT INTO app.works VALUES ('d81d511c-87d2-4614-bf32-f90b790d2fa8', 'zhumadilov-kozykuren', 'Қозыкүрең', 'Қабдеш Жұмаділов', NULL, 'Әңгіме', '{6,7}', '', NULL, NULL, false, '{}');
INSERT INTO app.task_sets VALUES ('36397011-2cd0-40e1-96d7-43fda2281439', '64a91de3-b909-413c-a9d3-7cbb984701d9', '5cfaa04e-a024-4dc0-93c2-4f761b40712b', '26b01680-fdf1-4835-a054-f7bd3ee18e82', '«Қыс» өлеңіндегі кейіптеу', 'Ақ киімді, денелі, ақ сақалды,
Соқыр, мылқау, танымас тірі жанды.
Үсті-басы ақ қырау, түсі суық,
Басқан жері сықырлап, келіп қалды.
Абай бұл өлеңде қысты ақ киімді, ақ сақалды қарт бейнесінде суреттейді. Ақын табиғат құбылысын адамға ұқсатып, кейіптеу тәсілін қолданады. Өлең он бір буынды қара өлең өлшемімен жазылған.', 7, 'Өлеңдегі кейіптеуді табу және түсіндіру', 'B', 'approved', true, 'Демо режим: тапсырмалар ЖИ-сіз, ережемен жасалды (AI_MOCK=true).', '2026-11-27 05:37:55.700579+00');
INSERT INTO app.assignments VALUES ('f1137f23-959b-4da9-bfa6-81b74c0411e7', 'aa4617aa-1830-4ee6-a1ae-34eac4d6973e', 'lab', NULL, '48381300-f3d2-4fc6-a855-ebfcb8230aa7', '{char_map,egerde}', '2026-12-04', 'limited', '2026-11-27 05:37:55.698386+00');
INSERT INTO app.assignments VALUES ('46f5a50e-17f7-4a00-88b1-608aec31bbb1', 'aa4617aa-1830-4ee6-a1ae-34eac4d6973e', 'tasks', '36397011-2cd0-40e1-96d7-43fda2281439', NULL, '{}', '2026-12-04', 'limited', '2026-11-27 05:37:55.715994+00');
INSERT INTO app.class_members VALUES ('aa4617aa-1830-4ee6-a1ae-34eac4d6973e', 'b01a4da6-0db5-4ddd-959a-9f808525edac');
INSERT INTO app.class_members VALUES ('aa4617aa-1830-4ee6-a1ae-34eac4d6973e', 'c1877440-0f25-4190-8b5e-43e84d8db82b');
INSERT INTO app.class_members VALUES ('aa4617aa-1830-4ee6-a1ae-34eac4d6973e', '5e921b35-7fb3-4a7f-b1ef-70f8e71b767f');
INSERT INTO app.lab_works VALUES ('6f6c29d7-bd9b-4e2a-bc97-b55aa02f5f1f', 'b01a4da6-0db5-4ddd-959a-9f808525edac', '26b01680-fdf1-4835-a054-f7bd3ee18e82', 'olen', '{"meter": "11", "rhyme": "а-а-б-а"}', '{"meter_ok": true, "rhyme_ok": true}', NULL, false, '2026-11-27 05:37:55.717464+00');
INSERT INTO app.lab_works VALUES ('abdbda54-586e-4f79-9fbe-67888b295868', '5e921b35-7fb3-4a7f-b1ef-70f8e71b767f', '26b01680-fdf1-4835-a054-f7bd3ee18e82', 'olen', '{"meter": "11", "rhyme": "а-б-а-б"}', '{"meter_ok": true, "rhyme_ok": false}', NULL, false, '2026-11-27 05:37:55.718832+00');
INSERT INTO app.lab_works VALUES ('7e903334-29be-4fc4-b2d1-a994952baf73', 'b01a4da6-0db5-4ddd-959a-9f808525edac', '48381300-f3d2-4fc6-a855-ebfcb8230aa7', 'char_map', '{"edges": [{"to": "karabai", "from": "sarybai", "evidence": "Екі бай балаларын туылмай тұрып атастырады."}, {"to": "kozy", "from": "sarybai", "evidence": "Сарыбай — Қозының әкесі."}, {"to": "bayan", "from": "karabai", "evidence": "Қарабай — Баянның әкесі."}, {"to": "bayan", "from": "kozy", "evidence": "Әкелері уәделескен атастырылған жар."}]}', '{"found": 4, "total": 6, "missing": ["kodar|kozy", "bayan|kodar"]}', NULL, false, '2026-11-27 05:37:55.719898+00');
INSERT INTO app.lab_works VALUES ('18e1aa4a-9136-4cbe-a40f-c9f9da95836a', 'c1877440-0f25-4190-8b5e-43e84d8db82b', '48381300-f3d2-4fc6-a855-ebfcb8230aa7', 'egerde', '{"evidence": "Қарабайдың көшіп кететін эпизоды", "checklist": [true, true, false], "prediction": "Қозы мен Баян ерте қосылып, Қодармен қақтығыс болмас еді."}', '{}', NULL, true, '2026-11-27 05:37:55.720731+00');
INSERT INTO app.lab_works VALUES ('df06cd5e-c22f-40f4-8875-a382cb075a00', '5e921b35-7fb3-4a7f-b1ef-70f8e71b767f', '48381300-f3d2-4fc6-a855-ebfcb8230aa7', 'egerde', '{"evidence": "Қодардың Баянға қызығуы", "checklist": [true, false, true], "prediction": "Бәрібір сынақ болар еді: Қодар Баянды жеңіл бермес еді."}', '{}', NULL, true, '2026-11-27 05:37:55.721544+00');
INSERT INTO app.lab_works VALUES ('4c6d19f2-4b96-4034-9235-2f5f82b86253', 'b01a4da6-0db5-4ddd-959a-9f808525edac', '48381300-f3d2-4fc6-a855-ebfcb8230aa7', 'egerde', '{"evidence": "Қарабайдың уәдесінен тайып, көшіп кеткен эпизоды", "checklist": [true, true, true], "prediction": "Егер Қарабай уәдесінде тұрғанда, Қозы мен Баян ерте қосылар еді. Бірақ Қодар Баянға қызығатындықтан, қақтығыс бәрібір болар еді, тек басқаша аяқталуы мүмкін еді."}', '{}', NULL, true, '2026-11-27 05:37:55.722464+00');
INSERT INTO app.lab_votes VALUES ('18e1aa4a-9136-4cbe-a40f-c9f9da95836a', 'b01a4da6-0db5-4ddd-959a-9f808525edac');
INSERT INTO app.lab_votes VALUES ('18e1aa4a-9136-4cbe-a40f-c9f9da95836a', '5e921b35-7fb3-4a7f-b1ef-70f8e71b767f');
INSERT INTO app.lab_votes VALUES ('df06cd5e-c22f-40f4-8875-a382cb075a00', 'b01a4da6-0db5-4ddd-959a-9f808525edac');
INSERT INTO app.tasks VALUES ('97e57087-4ddd-4167-a4e5-b94de89d894f', '36397011-2cd0-40e1-96d7-43fda2281439', 0, 'fill_blank', 'Бос орынды толтыр: «Ақ киімді, денелі, ақ ____,»', '[]', '["сақалды"]', 'Мәтіндегі сөз дәл жазылса — толық балл.', 2, '1-сөйлем');
INSERT INTO app.tasks VALUES ('d2f6c4bc-3f9c-455b-8b0b-1e16ca7ca32a', '36397011-2cd0-40e1-96d7-43fda2281439', 1, 'single_choice', 'Төмендегі сөздердің қайсысы материалда кездеседі?', '["ғарыш", "танымас", "компьютер", "мұхит"]', '1', 'Дұрыс нұсқа таңдалса — 1 балл.', 1, '2-сөйлем');
INSERT INTO app.tasks VALUES ('008251c9-a349-45e2-86cf-9b0e88b1fb65', '36397011-2cd0-40e1-96d7-43fda2281439', 2, 'ordering', 'Сөйлемдерді мәтіндегі ретімен орналастыр.', '["Басқан жері сықырлап, келіп қалды.", "Үсті-басы ақ қырау, түсі суық,", "Соқыр, мылқау, танымас тірі жанды.", "Ақ киімді, денелі, ақ сақалды,"]', '[3, 2, 1, 0]', 'Рет толық дұрыс болса — толық балл.', 3, '1–4-сөйлемдер');
INSERT INTO app.tasks VALUES ('b9c82e26-ab88-46a5-ab11-c3b339c1d276', '36397011-2cd0-40e1-96d7-43fda2281439', 3, 'open', 'Түсіну: материалдың негізгі ойын өз сөзіңмен 2–3 сөйлеммен түсіндір.', '[]', NULL, 'Негізгі ой дұрыс анықталды (2), өз сөзімен жазылды (1), мәтінге сілтеме бар (1).', 4, 'бүкіл мәтін');
INSERT INTO app.tasks VALUES ('126d0879-8834-4fdf-8709-6c0aa948dd02', '36397011-2cd0-40e1-96d7-43fda2281439', 4, 'open', 'Талдау: автор осы ойды қалай жеткізеді? Мәтіннен бір мысал келтір.', '[]', NULL, 'Тәсіл аталды (2), мәтіннен мысал келтірілді (2).', 4, 'бүкіл мәтін');
INSERT INTO app.tasks VALUES ('5e321f57-2c83-4f49-aa71-665c0da62e26', '36397011-2cd0-40e1-96d7-43fda2281439', 5, 'open', 'Бағалау: мәтіндегі ойға келісесің бе? Неге? Пікіріңді дәлелде.', '[]', NULL, 'Пікір анық (1), кемінде бір дәлел бар (2), мәтінге сүйенген (1).', 4, 'бүкіл мәтін');
set search_path = app, public;
-- The app's tables live in schema app; the pooler may drop the client's search_path option.
alter role current_user in database postgres set search_path = "$user", public, extensions, app;
