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
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;
INSERT INTO app.profiles VALUES ('710b8aac-27c5-4e24-90ea-f1c8da92f59a', 'teacher', 'Гүлнар Әлиқызы', 'demo@adebietlab.kz', '85170c34b5b710d813829bd8be2b0efa:7b2ceb45fe19f0a8f270dcf66b5ee3315e9ebc0c447b9654ef54c0ea02383a16', NULL, 0, '2026-11-26 22:59:55.04017+00');
INSERT INTO app.profiles VALUES ('fd70178a-b90d-42d7-8b25-452684e93ead', 'student', 'Айару', NULL, NULL, 'eb1c3404d29cf396fb16dbfd1975b136:d9fcadb46affd6f6e9cd54e3efdb7338a768c18bbc1a1b957237d64f45a195d8', 42, '2026-11-26 22:59:55.085692+00');
INSERT INTO app.profiles VALUES ('26820203-e2b8-4e0f-9b27-794bd73f76a7', 'student', 'Дана', NULL, NULL, '5e4dbde27182fc0b8154b4a7adedd768:92109f5ba46f9f86a57d110a8ada0f976e8cec6e22422dbe18c5c7d351be2ecd', 35, '2026-11-26 22:59:55.139975+00');
INSERT INTO app.profiles VALUES ('912b4b11-7883-44f3-b6b3-43a84c6eaccc', 'student', 'Мирас', NULL, NULL, 'f17d37a3fae096ec9c5c0e59589a3d9e:316cb0254925f69d3f04aab9110c64ddf2c3b169568c792963dff2eed48b1a75', 18, '2026-11-26 22:59:55.19805+00');
INSERT INTO app.classes VALUES ('9793eafd-e613-4e84-a381-2d4d6df6d9c6', '710b8aac-27c5-4e24-90ea-f1c8da92f59a', '7 «Ә»', 7, 'LAB7QA', '2026-11-26 22:59:55.042858+00');
INSERT INTO app.methods VALUES ('689cc9f2-a95a-4f67-b1c7-0385aa487c8a', 'bloom', 'Блум таксономиясы бойынша сұрақтар', 'Білу, түсіну, қолдану, талдау, жинақтау, бағалау деңгейіндегі сұрақтар.', 'Сұрақтарды төменгі деңгейден (білу) жоғарғы деңгейге (бағалау) қарай орналастыр. Білу деңгейіне жабық сұрақ, жоғары деңгейлерге ашық сұрақ жаса. Әр сұрақтың шартына деңгейін жаз.', '', NULL);
INSERT INTO app.methods VALUES ('6c83e1c0-ec50-4828-8047-33ccb8a14611', 'test', 'Тест және сәйкестендіру', 'Бір жауапты тест, сәйкестендіру, бос орынды толтыру, ретке қою.', 'Тек жабық тапсырмалар жаса: single_choice, matching, fill_blank, ordering. Әр тестте 4 нұсқа, біреуі ғана дұрыс. Дұрыс емес нұсқалар сенімді, бірақ мәтінге қайшы болсын.', '', NULL);
INSERT INTO app.methods VALUES ('04ded45f-1386-4827-99d3-f43d5fff3759', 'sinkvein', 'Синквейн', 'Кейіпкерге не ұғымға бес жолдық өлең құрастыру.', 'Бір open тапсырма жаса: 1-жол — зат есім, 2-жол — екі сын есім, 3-жол — үш етістік, 4-жол — төрт сөзден тұратын сөйлем, 5-жол — бір синоним. Критерийде әр жолдың талабын жаз. Қаласаң, бір fill_blank тапсырмасын қос.', '', NULL);
INSERT INTO app.methods VALUES ('2d099b5a-2f45-4296-a5b2-5cf5b86b2a55', 'venn', 'Венн диаграммасы', 'Екі кейіпкерді, екі шығарманы немесе екі бейнені салыстыру.', 'Материалдан салыстыруға болатын екі нысанды тап. Ұқсастық пен айырмашылықты табуға арналған open тапсырма және бір matching тапсырмасын (белгі → кейіпкер) жаса.', '', NULL);
INSERT INTO app.works VALUES ('27da0c8b-3f3f-480c-9a32-43e0f3d20a22', 'abai-qys', 'Қыс', 'Абай Құнанбайұлы', '1845–1904', 'Өлең', '{5,6,7}', 'Абай қысты ақ киімді, ақ сақалды қарт бейнесінде кейіптеп суреттейді.', 'Ақ киімді, денелі, ақ сақалды,
Соқыр, мылқау, танымас тірі жанды.
Үсті-басы ақ қырау, түсі суық,
Басқан жері сықырлап, келіп қалды.', 'ТЗ-да тексерілген үзінді (1-шумақ). Толық мәтінді сенімді басылымнан қосыңыз.', true, '{"poem": {"lines": ["Ақ киімді, денелі, ақ сақалды,", "Соқыр, мылқау, танымас тірі жанды.", "Үсті-басы ақ қырау, түсі суық,", "Басқан жері сықырлап, келіп қалды."], "meter": "11", "rhyme": "а-а-б-а"}}');
INSERT INTO app.works VALUES ('6142816f-1336-4bd5-8739-3b4ea345c898', 'abai-gylym', 'Ғылым таппай мақтанба', 'Абай Құнанбайұлы', '1845–1904', 'Өлең', '{8,9}', '', NULL, NULL, true, '{}');
INSERT INTO app.works VALUES ('3302ee0d-fc94-45dc-9fde-c7632a0cf8d1', 'abai-qara-soz', 'Қара сөздер', 'Абай Құнанбайұлы', '1845–1904', 'Проза', '{9,10,11}', '', NULL, NULL, true, '{}');
INSERT INTO app.works VALUES ('3d35ff52-6a4d-4ddd-943a-2c1ea2d43da1', 'altynsarin-kel', 'Кел, балалар, оқылық', 'Ыбырай Алтынсарин', '1841–1889', 'Өлең', '{5}', '', NULL, NULL, true, '{}');
INSERT INTO app.works VALUES ('96f12c0e-20fb-4431-a90e-03303597615f', 'baitursynuly-qyryq', 'Қырық мысал', 'Ахмет Байтұрсынұлы', '1872–1937', 'Мысал', '{5,6}', '', NULL, NULL, true, '{}');
INSERT INTO app.works VALUES ('88f7485d-8797-4381-a50c-f3c6208a70d3', 'zhumabaev-olender', 'Өлеңдері', 'Мағжан Жұмабаев', '1893–1938', 'Өлең', '{9,10,11}', '', NULL, NULL, true, '{}');
INSERT INTO app.works VALUES ('f8afe924-8933-4bde-80a0-c45ab4776f50', 'shakarim-olender', 'Өлеңдері', 'Шәкәрім Құдайбердіұлы', '1858–1931', 'Өлең', '{9,10,11}', '', NULL, NULL, true, '{}');
INSERT INTO app.works VALUES ('a73ddb5a-d30d-41f9-9fd4-719d0678496a', 'kozy-korpesh', 'Қозы Көрпеш – Баян сұлу', 'Халық ауыз әдебиеті', NULL, 'Лиро-эпостық жыр', '{7}', 'Қозы Көрпеш пен Баян сұлудың махаббаты туралы қазақтың лиро-эпостық жыры.', NULL, NULL, true, '{"egerde": {"question": "Егер Қарабай уәдесінде тұрғанда, оқиға қалай өрбір еді?", "checklist": ["Болжам кейіпкердің мінезіне сай", "Жырдан дәлел келтірдім", "Оқиғаның соңын түсіндірдім"]}, "timeline": [{"id": "e1", "text": "Сарыбай мен Қарабай балаларын туылмай тұрып атастырады", "element": "экспозиция"}, {"id": "e2", "text": "Сарыбай қайтыс болып, Қарабай уәдесінен тайып, елін көшіріп кетеді", "element": "байланыс"}, {"id": "e3", "text": "Қозы Көрпеш ер жетіп, Баянды іздеп шығады", "element": "шиеленіс"}, {"id": "e4", "text": "Қодар Қозы Көрпешті өлтіреді", "element": "шарықтау шегі"}, {"id": "e5", "text": "Баян Қодардан кек алып, Қозының басында өзі де қаза табады", "element": "шешім"}], "reference": [{"to": "karabai", "from": "sarybai", "label": "құда болуға уәделесті"}, {"to": "kozy", "from": "sarybai", "label": "әкесі"}, {"to": "bayan", "from": "karabai", "label": "әкесі"}, {"to": "bayan", "from": "kozy", "label": "атастырылған жар"}, {"to": "bayan", "from": "kodar", "label": "Баянға қызығады"}, {"to": "kozy", "from": "kodar", "label": "өліміне себепкер"}], "characters": [{"x": 140, "y": 50, "id": "sarybai", "kind": "secondary", "name": "Сарыбай", "note": "бай"}, {"x": 460, "y": 50, "id": "karabai", "kind": "secondary", "name": "Қарабай", "note": "бай"}, {"x": 140, "y": 180, "id": "kozy", "kind": "main", "name": "Қозы Көрпеш", "note": "басты кейіпкер"}, {"x": 460, "y": 180, "id": "bayan", "kind": "main", "name": "Баян сұлу", "note": "басты кейіпкер"}, {"x": 300, "y": 290, "id": "kodar", "kind": "antagonist", "name": "Қодар", "note": "қарсы кейіпкер"}]}');
INSERT INTO app.works VALUES ('919a7082-fee1-4334-aeef-c78c348f3810', 'qyz-zhibek', 'Қыз Жібек', 'Халық ауыз әдебиеті', NULL, 'Лиро-эпостық жыр', '{7,8}', '', NULL, NULL, true, '{}');
INSERT INTO app.works VALUES ('515ad505-8fbb-44e6-9d05-5604d12a1a42', 'er-targyn', 'Ер Тарғын', 'Халық ауыз әдебиеті', NULL, 'Батырлар жыры', '{6,7}', '', NULL, NULL, true, '{}');
INSERT INTO app.works VALUES ('8bd50e30-b15f-458e-b082-7a3ad8354372', 'alpamys', 'Алпамыс батыр', 'Халық ауыз әдебиеті', NULL, 'Батырлар жыры', '{6,7}', '', NULL, NULL, true, '{}');
INSERT INTO app.works VALUES ('0432d8a4-430b-4a49-8b88-1e4638667fec', 'er-tostik', 'Ер Төстік', 'Халық ауыз әдебиеті', NULL, 'Ертегі', '{5}', '', NULL, NULL, true, '{}');
INSERT INTO app.works VALUES ('63838c15-acff-4f8a-8e25-c7e9be4ed115', 'aldar-kose', 'Алдар Көсе туралы ертегілер', 'Халық ауыз әдебиеті', NULL, 'Ертегі', '{5}', '', NULL, NULL, true, '{}');
INSERT INTO app.works VALUES ('e1130a50-039d-4350-a59e-da8365b717e3', 'auezov-kokserek', 'Көксерек', 'Мұхтар Әуезов', '1897–1961', 'Әңгіме', '{7,8}', '', NULL, NULL, false, '{}');
INSERT INTO app.works VALUES ('17e19b72-36cc-4bf4-b688-b94421eac396', 'auezov-abai-zholy', 'Абай жолы', 'Мұхтар Әуезов', '1897–1961', 'Роман-эпопея', '{10,11}', '', NULL, NULL, false, '{}');
INSERT INTO app.works VALUES ('813a7995-27e4-423d-b474-dea5499748cd', 'zhumadilov-kozykuren', 'Қозыкүрең', 'Қабдеш Жұмаділов', NULL, 'Әңгіме', '{6,7}', '', NULL, NULL, false, '{}');
INSERT INTO app.task_sets VALUES ('5882a956-d407-482b-9c6b-b9c3881809e5', '710b8aac-27c5-4e24-90ea-f1c8da92f59a', '689cc9f2-a95a-4f67-b1c7-0385aa487c8a', '27da0c8b-3f3f-480c-9a32-43e0f3d20a22', '«Қыс» өлеңіндегі кейіптеу', 'Ақ киімді, денелі, ақ сақалды,
Соқыр, мылқау, танымас тірі жанды.
Үсті-басы ақ қырау, түсі суық,
Басқан жері сықырлап, келіп қалды.
Абай бұл өлеңде қысты ақ киімді, ақ сақалды қарт бейнесінде суреттейді. Ақын табиғат құбылысын адамға ұқсатып, кейіптеу тәсілін қолданады. Өлең он бір буынды қара өлең өлшемімен жазылған.', 7, 'Өлеңдегі кейіптеуді табу және түсіндіру', 'B', 'approved', true, 'Демо режим: тапсырмалар ЖИ-сіз, ережемен жасалды (AI_MOCK=true).', '2026-11-26 22:59:55.206492+00');
INSERT INTO app.assignments VALUES ('96995dc3-376b-49d4-bcba-d9702fec91bf', '9793eafd-e613-4e84-a381-2d4d6df6d9c6', 'lab', NULL, 'a73ddb5a-d30d-41f9-9fd4-719d0678496a', '{char_map,egerde}', '2026-12-03', 'limited', '2026-11-26 22:59:55.203768+00');
INSERT INTO app.assignments VALUES ('f1c706f0-b90f-4eb5-a6bc-87bb9c4be133', '9793eafd-e613-4e84-a381-2d4d6df6d9c6', 'tasks', '5882a956-d407-482b-9c6b-b9c3881809e5', NULL, '{}', '2026-12-03', 'limited', '2026-11-26 22:59:55.222674+00');
INSERT INTO app.class_members VALUES ('9793eafd-e613-4e84-a381-2d4d6df6d9c6', 'fd70178a-b90d-42d7-8b25-452684e93ead');
INSERT INTO app.class_members VALUES ('9793eafd-e613-4e84-a381-2d4d6df6d9c6', '26820203-e2b8-4e0f-9b27-794bd73f76a7');
INSERT INTO app.class_members VALUES ('9793eafd-e613-4e84-a381-2d4d6df6d9c6', '912b4b11-7883-44f3-b6b3-43a84c6eaccc');
INSERT INTO app.lab_works VALUES ('c0bc5e00-8fd5-4d9d-843e-eb31bc7fec13', 'fd70178a-b90d-42d7-8b25-452684e93ead', '27da0c8b-3f3f-480c-9a32-43e0f3d20a22', 'olen', '{"meter": "11", "rhyme": "а-а-б-а"}', '{"meter_ok": true, "rhyme_ok": true}', NULL, false, '2026-11-26 22:59:55.223973+00');
INSERT INTO app.lab_works VALUES ('48e60ee6-950e-4998-abf7-41d917cfd840', '912b4b11-7883-44f3-b6b3-43a84c6eaccc', '27da0c8b-3f3f-480c-9a32-43e0f3d20a22', 'olen', '{"meter": "11", "rhyme": "а-б-а-б"}', '{"meter_ok": true, "rhyme_ok": false}', NULL, false, '2026-11-26 22:59:55.225424+00');
INSERT INTO app.lab_works VALUES ('ab1cfcf4-b182-4019-8b95-1dbf4d060a93', 'fd70178a-b90d-42d7-8b25-452684e93ead', 'a73ddb5a-d30d-41f9-9fd4-719d0678496a', 'char_map', '{"edges": [{"to": "karabai", "from": "sarybai", "evidence": "Екі бай балаларын туылмай тұрып атастырады."}, {"to": "kozy", "from": "sarybai", "evidence": "Сарыбай — Қозының әкесі."}, {"to": "bayan", "from": "karabai", "evidence": "Қарабай — Баянның әкесі."}, {"to": "bayan", "from": "kozy", "evidence": "Әкелері уәделескен атастырылған жар."}]}', '{"found": 4, "total": 6, "missing": ["kodar|kozy", "bayan|kodar"]}', NULL, false, '2026-11-26 22:59:55.226312+00');
INSERT INTO app.lab_works VALUES ('da83b808-8cf3-4367-9a55-c2b01b3e7811', '26820203-e2b8-4e0f-9b27-794bd73f76a7', 'a73ddb5a-d30d-41f9-9fd4-719d0678496a', 'egerde', '{"evidence": "Қарабайдың көшіп кететін эпизоды", "checklist": [true, true, false], "prediction": "Қозы мен Баян ерте қосылып, Қодармен қақтығыс болмас еді."}', '{}', NULL, true, '2026-11-26 22:59:55.22733+00');
INSERT INTO app.lab_works VALUES ('ea6c5a8e-1d32-43e3-a9f1-8623b19910e1', '912b4b11-7883-44f3-b6b3-43a84c6eaccc', 'a73ddb5a-d30d-41f9-9fd4-719d0678496a', 'egerde', '{"evidence": "Қодардың Баянға қызығуы", "checklist": [true, false, true], "prediction": "Бәрібір сынақ болар еді: Қодар Баянды жеңіл бермес еді."}', '{}', NULL, true, '2026-11-26 22:59:55.228119+00');
INSERT INTO app.lab_works VALUES ('a79fb97b-6d3d-4be0-acf6-38604800c2ed', 'fd70178a-b90d-42d7-8b25-452684e93ead', 'a73ddb5a-d30d-41f9-9fd4-719d0678496a', 'egerde', '{"evidence": "Қарабайдың уәдесінен тайып, көшіп кеткен эпизоды", "checklist": [true, true, true], "prediction": "Егер Қарабай уәдесінде тұрғанда, Қозы мен Баян ерте қосылар еді. Бірақ Қодар Баянға қызығатындықтан, қақтығыс бәрібір болар еді, тек басқаша аяқталуы мүмкін еді."}', '{}', NULL, true, '2026-11-26 22:59:55.229665+00');
INSERT INTO app.lab_votes VALUES ('da83b808-8cf3-4367-9a55-c2b01b3e7811', 'fd70178a-b90d-42d7-8b25-452684e93ead');
INSERT INTO app.lab_votes VALUES ('da83b808-8cf3-4367-9a55-c2b01b3e7811', '912b4b11-7883-44f3-b6b3-43a84c6eaccc');
INSERT INTO app.lab_votes VALUES ('ea6c5a8e-1d32-43e3-a9f1-8623b19910e1', 'fd70178a-b90d-42d7-8b25-452684e93ead');
INSERT INTO app.tasks VALUES ('ed0455c4-441e-4a5e-9273-1f2bd875cd15', '5882a956-d407-482b-9c6b-b9c3881809e5', 0, 'fill_blank', 'Бос орынды толтыр: «Ақ киімді, денелі, ақ ____,»', '[]', '["сақалды"]', 'Мәтіндегі сөз дәл жазылса — толық балл.', 2, '1-сөйлем');
INSERT INTO app.tasks VALUES ('c0ca25d1-59be-408b-9d4c-43034cce1c51', '5882a956-d407-482b-9c6b-b9c3881809e5', 1, 'single_choice', 'Төмендегі сөздердің қайсысы материалда кездеседі?', '["ғарыш", "танымас", "компьютер", "мұхит"]', '1', 'Дұрыс нұсқа таңдалса — 1 балл.', 1, '2-сөйлем');
INSERT INTO app.tasks VALUES ('d7987088-d9d4-43f1-8f60-d7724c08e6c9', '5882a956-d407-482b-9c6b-b9c3881809e5', 2, 'ordering', 'Сөйлемдерді мәтіндегі ретімен орналастыр.', '["Басқан жері сықырлап, келіп қалды.", "Үсті-басы ақ қырау, түсі суық,", "Соқыр, мылқау, танымас тірі жанды.", "Ақ киімді, денелі, ақ сақалды,"]', '[3, 2, 1, 0]', 'Рет толық дұрыс болса — толық балл.', 3, '1–4-сөйлемдер');
INSERT INTO app.tasks VALUES ('35c34d66-2429-409c-a8e8-242cb36702fe', '5882a956-d407-482b-9c6b-b9c3881809e5', 3, 'open', 'Түсіну: материалдың негізгі ойын өз сөзіңмен 2–3 сөйлеммен түсіндір.', '[]', NULL, 'Негізгі ой дұрыс анықталды (2), өз сөзімен жазылды (1), мәтінге сілтеме бар (1).', 4, 'бүкіл мәтін');
INSERT INTO app.tasks VALUES ('92b9a1b5-be3b-4ef1-bdc8-1fa5a0edb40d', '5882a956-d407-482b-9c6b-b9c3881809e5', 4, 'open', 'Талдау: автор осы ойды қалай жеткізеді? Мәтіннен бір мысал келтір.', '[]', NULL, 'Тәсіл аталды (2), мәтіннен мысал келтірілді (2).', 4, 'бүкіл мәтін');
INSERT INTO app.tasks VALUES ('4c300687-1719-40bf-9375-aadb40d0e997', '5882a956-d407-482b-9c6b-b9c3881809e5', 5, 'open', 'Бағалау: мәтіндегі ойға келісесің бе? Неге? Пікіріңді дәлелде.', '[]', NULL, 'Пікір анық (1), кемінде бір дәлел бар (2), мәтінге сүйенген (1).', 4, 'бүкіл мәтін');
set search_path = app, public;
-- The app's tables live in schema app; the pooler may drop the client's search_path option.
alter role current_user in database postgres set search_path = "$user", public, extensions, app;
