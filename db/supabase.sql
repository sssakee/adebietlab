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

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'app' loop
    execute format('alter table app.%I enable row level security', t);
  end loop;
end $$;

-- Демо деректер (npm run db:setup нәтижесі)
\restrict RnMvuDmDFMVpC7GuLhg7ekPRXAeZ7tnswyb4yX64GfXZRh6LK7OMBT69DdLJa96
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;
INSERT INTO app.profiles VALUES ('1f09ca39-a2aa-41e0-85a5-42a1b89df876', 'teacher', 'Гүлнар Әлиқызы', 'demo@adebietlab.kz', 'f74685b8278986ee26922eb40eff256a:125a9e4022c7dd37fc3c008d5c64c5126cb52ea5445aa41ede61a623fbece254', NULL, 0, '2026-11-26 21:25:48.542712+00');
INSERT INTO app.profiles VALUES ('af8f1fbc-168f-4441-bdeb-f8f3c6e44c97', 'student', 'Айару', NULL, NULL, '686b80c3c5e070e6ca8b67b59426bc70:48f723472bee23e39961f4e1e419ef62cf40b1ddf84a3dfbd7b4e79c261d56ee', 42, '2026-11-26 21:25:48.584367+00');
INSERT INTO app.profiles VALUES ('e76b79d0-bac3-459e-8357-a17c4b283bea', 'student', 'Дана', NULL, NULL, '8bd82cbf98f7a6cea8a7313463997f0a:b16e6ce32ce80db18db278ade0c0559c47b3f9c6fb8643c59ee86dd5446103dd', 35, '2026-11-26 21:25:48.621507+00');
INSERT INTO app.profiles VALUES ('9cff0c24-af26-4124-8c37-64fdb158515a', 'student', 'Мирас', NULL, NULL, 'f888c4cba7c17098f78814d04da93aad:16f9ca656cc7226b44103336d24261e3afdb9da0c50578dfd47836b66dd21617', 18, '2026-11-26 21:25:48.655112+00');
INSERT INTO app.classes VALUES ('3a7ef42a-67ca-49fc-8354-3bb405ee4430', '1f09ca39-a2aa-41e0-85a5-42a1b89df876', '7 «Ә»', 7, 'LAB7QA', '2026-11-26 21:25:48.545632+00');
INSERT INTO app.methods VALUES ('b1b77a98-e36b-43f4-b8c5-7b921d8b62ff', 'bloom', 'Блум таксономиясы бойынша сұрақтар', 'Білу, түсіну, қолдану, талдау, жинақтау, бағалау деңгейіндегі сұрақтар.', 'Сұрақтарды төменгі деңгейден (білу) жоғарғы деңгейге (бағалау) қарай орналастыр. Білу деңгейіне жабық сұрақ, жоғары деңгейлерге ашық сұрақ жаса. Әр сұрақтың шартына деңгейін жаз.', '', NULL);
INSERT INTO app.methods VALUES ('679229b5-e057-43a7-9fe2-0de30884ad61', 'test', 'Тест және сәйкестендіру', 'Бір жауапты тест, сәйкестендіру, бос орынды толтыру, ретке қою.', 'Тек жабық тапсырмалар жаса: single_choice, matching, fill_blank, ordering. Әр тестте 4 нұсқа, біреуі ғана дұрыс. Дұрыс емес нұсқалар сенімді, бірақ мәтінге қайшы болсын.', '', NULL);
INSERT INTO app.methods VALUES ('27a117f4-63e4-40b8-9eb6-b2f52095dddd', 'sinkvein', 'Синквейн', 'Кейіпкерге не ұғымға бес жолдық өлең құрастыру.', 'Бір open тапсырма жаса: 1-жол — зат есім, 2-жол — екі сын есім, 3-жол — үш етістік, 4-жол — төрт сөзден тұратын сөйлем, 5-жол — бір синоним. Критерийде әр жолдың талабын жаз. Қаласаң, бір fill_blank тапсырмасын қос.', '', NULL);
INSERT INTO app.methods VALUES ('77ce9a5f-55f6-4c97-9c52-fe56e9a7f3c8', 'venn', 'Венн диаграммасы', 'Екі кейіпкерді, екі шығарманы немесе екі бейнені салыстыру.', 'Материалдан салыстыруға болатын екі нысанды тап. Ұқсастық пен айырмашылықты табуға арналған open тапсырма және бір matching тапсырмасын (белгі → кейіпкер) жаса.', '', NULL);
INSERT INTO app.works VALUES ('850ad2b2-1d12-4df8-a1cd-7b61b13ee01a', 'abai-qys', 'Қыс', 'Абай Құнанбайұлы', '1845–1904', 'Өлең', '{5,6,7}', 'Абай қысты ақ киімді, ақ сақалды қарт бейнесінде кейіптеп суреттейді.', 'Ақ киімді, денелі, ақ сақалды,
Соқыр, мылқау, танымас тірі жанды.
Үсті-басы ақ қырау, түсі суық,
Басқан жері сықырлап, келіп қалды.', 'ТЗ-да тексерілген үзінді (1-шумақ). Толық мәтінді сенімді басылымнан қосыңыз.', true, '{"poem": {"lines": ["Ақ киімді, денелі, ақ сақалды,", "Соқыр, мылқау, танымас тірі жанды.", "Үсті-басы ақ қырау, түсі суық,", "Басқан жері сықырлап, келіп қалды."], "meter": "11", "rhyme": "а-а-б-а"}}');
INSERT INTO app.works VALUES ('c26ec475-12a6-41e6-82cc-c1acd06b12ca', 'abai-gylym', 'Ғылым таппай мақтанба', 'Абай Құнанбайұлы', '1845–1904', 'Өлең', '{8,9}', '', NULL, NULL, true, '{}');
INSERT INTO app.works VALUES ('84800c37-a3a2-46d8-85f5-69272f610490', 'abai-qara-soz', 'Қара сөздер', 'Абай Құнанбайұлы', '1845–1904', 'Проза', '{9,10,11}', '', NULL, NULL, true, '{}');
INSERT INTO app.works VALUES ('6197ce19-d437-4586-8d5a-e226f62ba6e1', 'altynsarin-kel', 'Кел, балалар, оқылық', 'Ыбырай Алтынсарин', '1841–1889', 'Өлең', '{5}', '', NULL, NULL, true, '{}');
INSERT INTO app.works VALUES ('d5c5857e-561c-4383-b714-c2a4760ae231', 'baitursynuly-qyryq', 'Қырық мысал', 'Ахмет Байтұрсынұлы', '1872–1937', 'Мысал', '{5,6}', '', NULL, NULL, true, '{}');
INSERT INTO app.works VALUES ('bc696c84-f728-4526-9ba2-4884c7194638', 'zhumabaev-olender', 'Өлеңдері', 'Мағжан Жұмабаев', '1893–1938', 'Өлең', '{9,10,11}', '', NULL, NULL, true, '{}');
INSERT INTO app.works VALUES ('fe28edd5-9d63-4b95-afab-7ef5a001b0ea', 'shakarim-olender', 'Өлеңдері', 'Шәкәрім Құдайбердіұлы', '1858–1931', 'Өлең', '{9,10,11}', '', NULL, NULL, true, '{}');
INSERT INTO app.works VALUES ('03552d52-5b10-46cc-870f-fb4de8327036', 'kozy-korpesh', 'Қозы Көрпеш – Баян сұлу', 'Халық ауыз әдебиеті', NULL, 'Лиро-эпостық жыр', '{7}', 'Қозы Көрпеш пен Баян сұлудың махаббаты туралы қазақтың лиро-эпостық жыры.', NULL, NULL, true, '{"egerde": {"question": "Егер Қарабай уәдесінде тұрғанда, оқиға қалай өрбір еді?", "checklist": ["Болжам кейіпкердің мінезіне сай", "Жырдан дәлел келтірдім", "Оқиғаның соңын түсіндірдім"]}, "timeline": [{"id": "e1", "text": "Сарыбай мен Қарабай балаларын туылмай тұрып атастырады", "element": "экспозиция"}, {"id": "e2", "text": "Сарыбай қайтыс болып, Қарабай уәдесінен тайып, елін көшіріп кетеді", "element": "байланыс"}, {"id": "e3", "text": "Қозы Көрпеш ер жетіп, Баянды іздеп шығады", "element": "шиеленіс"}, {"id": "e4", "text": "Қодар Қозы Көрпешті өлтіреді", "element": "шарықтау шегі"}, {"id": "e5", "text": "Баян Қодардан кек алып, Қозының басында өзі де қаза табады", "element": "шешім"}], "reference": [{"to": "karabai", "from": "sarybai", "label": "құда болуға уәделесті"}, {"to": "kozy", "from": "sarybai", "label": "әкесі"}, {"to": "bayan", "from": "karabai", "label": "әкесі"}, {"to": "bayan", "from": "kozy", "label": "атастырылған жар"}, {"to": "bayan", "from": "kodar", "label": "Баянға қызығады"}, {"to": "kozy", "from": "kodar", "label": "өліміне себепкер"}], "characters": [{"x": 140, "y": 50, "id": "sarybai", "kind": "secondary", "name": "Сарыбай", "note": "бай"}, {"x": 460, "y": 50, "id": "karabai", "kind": "secondary", "name": "Қарабай", "note": "бай"}, {"x": 140, "y": 180, "id": "kozy", "kind": "main", "name": "Қозы Көрпеш", "note": "басты кейіпкер"}, {"x": 460, "y": 180, "id": "bayan", "kind": "main", "name": "Баян сұлу", "note": "басты кейіпкер"}, {"x": 300, "y": 290, "id": "kodar", "kind": "antagonist", "name": "Қодар", "note": "қарсы кейіпкер"}]}');
INSERT INTO app.works VALUES ('e71f55b3-2f37-455f-ba09-d4860e278163', 'qyz-zhibek', 'Қыз Жібек', 'Халық ауыз әдебиеті', NULL, 'Лиро-эпостық жыр', '{7,8}', '', NULL, NULL, true, '{}');
INSERT INTO app.works VALUES ('4dd17a7e-fb56-47ab-b8b9-01f80c77731c', 'er-targyn', 'Ер Тарғын', 'Халық ауыз әдебиеті', NULL, 'Батырлар жыры', '{6,7}', '', NULL, NULL, true, '{}');
INSERT INTO app.works VALUES ('ebcf0433-9988-4cd4-9fdd-91ab0679d2d5', 'alpamys', 'Алпамыс батыр', 'Халық ауыз әдебиеті', NULL, 'Батырлар жыры', '{6,7}', '', NULL, NULL, true, '{}');
INSERT INTO app.works VALUES ('48e95754-c54f-454c-801d-45cd10e3312f', 'er-tostik', 'Ер Төстік', 'Халық ауыз әдебиеті', NULL, 'Ертегі', '{5}', '', NULL, NULL, true, '{}');
INSERT INTO app.works VALUES ('9b67d2df-6087-4176-9bc1-3a8de0a43ba9', 'aldar-kose', 'Алдар Көсе туралы ертегілер', 'Халық ауыз әдебиеті', NULL, 'Ертегі', '{5}', '', NULL, NULL, true, '{}');
INSERT INTO app.works VALUES ('0a703611-bdee-451a-a5ab-932e0c8843bd', 'auezov-kokserek', 'Көксерек', 'Мұхтар Әуезов', '1897–1961', 'Әңгіме', '{7,8}', '', NULL, NULL, false, '{}');
INSERT INTO app.works VALUES ('7e3d10a8-1713-4112-94af-48c26fd65dfa', 'auezov-abai-zholy', 'Абай жолы', 'Мұхтар Әуезов', '1897–1961', 'Роман-эпопея', '{10,11}', '', NULL, NULL, false, '{}');
INSERT INTO app.works VALUES ('87989fa4-9b85-42c5-aee5-3d0c6a089a6b', 'zhumadilov-kozykuren', 'Қозыкүрең', 'Қабдеш Жұмаділов', NULL, 'Әңгіме', '{6,7}', '', NULL, NULL, false, '{}');
INSERT INTO app.task_sets VALUES ('ffad3694-5ac7-4872-9edb-b277319d1e46', '1f09ca39-a2aa-41e0-85a5-42a1b89df876', 'b1b77a98-e36b-43f4-b8c5-7b921d8b62ff', '850ad2b2-1d12-4df8-a1cd-7b61b13ee01a', '«Қыс» өлеңіндегі кейіптеу', 'Ақ киімді, денелі, ақ сақалды,
Соқыр, мылқау, танымас тірі жанды.
Үсті-басы ақ қырау, түсі суық,
Басқан жері сықырлап, келіп қалды.
Абай бұл өлеңде қысты ақ киімді, ақ сақалды қарт бейнесінде суреттейді. Ақын табиғат құбылысын адамға ұқсатып, кейіптеу тәсілін қолданады. Өлең он бір буынды қара өлең өлшемімен жазылған.', 7, 'Өлеңдегі кейіптеуді табу және түсіндіру', 'B', 'approved', true, 'Демо режим: тапсырмалар ЖИ-сіз, ережемен жасалды (AI_MOCK=true).', '2026-11-26 21:25:48.661381+00');
INSERT INTO app.assignments VALUES ('542dcf24-e77e-4da9-b754-570d6d33c68c', '3a7ef42a-67ca-49fc-8354-3bb405ee4430', 'lab', NULL, '03552d52-5b10-46cc-870f-fb4de8327036', '{char_map,egerde}', '2026-12-03', 'limited', '2026-11-26 21:25:48.659317+00');
INSERT INTO app.assignments VALUES ('e4fa25d2-dca7-423e-abeb-ff3eb0aa65b2', '3a7ef42a-67ca-49fc-8354-3bb405ee4430', 'tasks', 'ffad3694-5ac7-4872-9edb-b277319d1e46', NULL, '{}', '2026-12-03', 'limited', '2026-11-26 21:25:48.667841+00');
INSERT INTO app.class_members VALUES ('3a7ef42a-67ca-49fc-8354-3bb405ee4430', 'af8f1fbc-168f-4441-bdeb-f8f3c6e44c97');
INSERT INTO app.class_members VALUES ('3a7ef42a-67ca-49fc-8354-3bb405ee4430', 'e76b79d0-bac3-459e-8357-a17c4b283bea');
INSERT INTO app.class_members VALUES ('3a7ef42a-67ca-49fc-8354-3bb405ee4430', '9cff0c24-af26-4124-8c37-64fdb158515a');
INSERT INTO app.lab_works VALUES ('d1a8d4a5-5c99-437f-a6d0-adce1203c286', 'af8f1fbc-168f-4441-bdeb-f8f3c6e44c97', '850ad2b2-1d12-4df8-a1cd-7b61b13ee01a', 'olen', '{"meter": "11", "rhyme": "а-а-б-а"}', '{"meter_ok": true, "rhyme_ok": true}', NULL, false, '2026-11-26 21:25:48.668918+00');
INSERT INTO app.lab_works VALUES ('c54e9773-89ec-4e00-b45b-af081e6ba6dc', '9cff0c24-af26-4124-8c37-64fdb158515a', '850ad2b2-1d12-4df8-a1cd-7b61b13ee01a', 'olen', '{"meter": "11", "rhyme": "а-б-а-б"}', '{"meter_ok": true, "rhyme_ok": false}', NULL, false, '2026-11-26 21:25:48.67046+00');
INSERT INTO app.lab_works VALUES ('fc4b8224-5201-4f16-a272-037cb131297c', 'af8f1fbc-168f-4441-bdeb-f8f3c6e44c97', '03552d52-5b10-46cc-870f-fb4de8327036', 'char_map', '{"edges": [{"to": "karabai", "from": "sarybai", "evidence": "Екі бай балаларын туылмай тұрып атастырады."}, {"to": "kozy", "from": "sarybai", "evidence": "Сарыбай — Қозының әкесі."}, {"to": "bayan", "from": "karabai", "evidence": "Қарабай — Баянның әкесі."}, {"to": "bayan", "from": "kozy", "evidence": "Әкелері уәделескен атастырылған жар."}]}', '{"found": 4, "total": 6, "missing": ["kodar|kozy", "bayan|kodar"]}', NULL, false, '2026-11-26 21:25:48.671423+00');
INSERT INTO app.lab_works VALUES ('3e499e8c-f322-4869-84db-e027cfeba982', 'e76b79d0-bac3-459e-8357-a17c4b283bea', '03552d52-5b10-46cc-870f-fb4de8327036', 'egerde', '{"evidence": "Қарабайдың көшіп кететін эпизоды", "checklist": [true, true, false], "prediction": "Қозы мен Баян ерте қосылып, Қодармен қақтығыс болмас еді."}', '{}', NULL, true, '2026-11-26 21:25:48.672257+00');
INSERT INTO app.lab_works VALUES ('db025fa2-2c3c-43e9-b71d-fcb374adb811', '9cff0c24-af26-4124-8c37-64fdb158515a', '03552d52-5b10-46cc-870f-fb4de8327036', 'egerde', '{"evidence": "Қодардың Баянға қызығуы", "checklist": [true, false, true], "prediction": "Бәрібір сынақ болар еді: Қодар Баянды жеңіл бермес еді."}', '{}', NULL, true, '2026-11-26 21:25:48.673019+00');
INSERT INTO app.lab_works VALUES ('6ed6fb36-199e-429f-8e4d-5e6fb1e64a9b', 'af8f1fbc-168f-4441-bdeb-f8f3c6e44c97', '03552d52-5b10-46cc-870f-fb4de8327036', 'egerde', '{"evidence": "Қарабайдың уәдесінен тайып, көшіп кеткен эпизоды", "checklist": [true, true, true], "prediction": "Егер Қарабай уәдесінде тұрғанда, Қозы мен Баян ерте қосылар еді. Бірақ Қодар Баянға қызығатындықтан, қақтығыс бәрібір болар еді, тек басқаша аяқталуы мүмкін еді."}', '{}', NULL, true, '2026-11-26 21:25:48.673611+00');
INSERT INTO app.lab_votes VALUES ('3e499e8c-f322-4869-84db-e027cfeba982', 'af8f1fbc-168f-4441-bdeb-f8f3c6e44c97');
INSERT INTO app.lab_votes VALUES ('3e499e8c-f322-4869-84db-e027cfeba982', '9cff0c24-af26-4124-8c37-64fdb158515a');
INSERT INTO app.lab_votes VALUES ('db025fa2-2c3c-43e9-b71d-fcb374adb811', 'af8f1fbc-168f-4441-bdeb-f8f3c6e44c97');
INSERT INTO app.tasks VALUES ('d0fe8dd1-6153-4b70-a481-770ddbfbf94b', 'ffad3694-5ac7-4872-9edb-b277319d1e46', 0, 'fill_blank', 'Бос орынды толтыр: «Ақ киімді, денелі, ақ ____,»', '[]', '["сақалды"]', 'Мәтіндегі сөз дәл жазылса — толық балл.', 2, '1-сөйлем');
INSERT INTO app.tasks VALUES ('bc4e4369-d9e7-4f81-9aaa-2b1d9379d6e1', 'ffad3694-5ac7-4872-9edb-b277319d1e46', 1, 'single_choice', 'Төмендегі сөздердің қайсысы материалда кездеседі?', '["ғарыш", "танымас", "компьютер", "мұхит"]', '1', 'Дұрыс нұсқа таңдалса — 1 балл.', 1, '2-сөйлем');
INSERT INTO app.tasks VALUES ('2ceef7aa-6d05-47bf-99a3-90ff26184446', 'ffad3694-5ac7-4872-9edb-b277319d1e46', 2, 'ordering', 'Сөйлемдерді мәтіндегі ретімен орналастыр.', '["Басқан жері сықырлап, келіп қалды.", "Үсті-басы ақ қырау, түсі суық,", "Соқыр, мылқау, танымас тірі жанды.", "Ақ киімді, денелі, ақ сақалды,"]', '[3, 2, 1, 0]', 'Рет толық дұрыс болса — толық балл.', 3, '1–4-сөйлемдер');
INSERT INTO app.tasks VALUES ('be8373f7-f6eb-4131-9b44-21e88bed92db', 'ffad3694-5ac7-4872-9edb-b277319d1e46', 3, 'open', 'Түсіну: материалдың негізгі ойын өз сөзіңмен 2–3 сөйлеммен түсіндір.', '[]', NULL, 'Негізгі ой дұрыс анықталды (2), өз сөзімен жазылды (1), мәтінге сілтеме бар (1).', 4, 'бүкіл мәтін');
INSERT INTO app.tasks VALUES ('2d1eecec-6294-4549-a2cd-177f15bc9348', 'ffad3694-5ac7-4872-9edb-b277319d1e46', 4, 'open', 'Талдау: автор осы ойды қалай жеткізеді? Мәтіннен бір мысал келтір.', '[]', NULL, 'Тәсіл аталды (2), мәтіннен мысал келтірілді (2).', 4, 'бүкіл мәтін');
INSERT INTO app.tasks VALUES ('78109ae4-e019-44fa-ad4a-f084d4ff88d4', 'ffad3694-5ac7-4872-9edb-b277319d1e46', 5, 'open', 'Бағалау: мәтіндегі ойға келісесің бе? Неге? Пікіріңді дәлелде.', '[]', NULL, 'Пікір анық (1), кемінде бір дәлел бар (2), мәтінге сүйенген (1).', 4, 'бүкіл мәтін');
\unrestrict RnMvuDmDFMVpC7GuLhg7ekPRXAeZ7tnswyb4yX64GfXZRh6LK7OMBT69DdLJa96
set search_path = app, public;
-- The app's tables live in schema app; the pooler may drop the client's search_path option.
alter role current_user in database postgres set search_path = "$user", public, extensions, app;
