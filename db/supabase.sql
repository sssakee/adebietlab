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
  read_url text,                   -- where to read the full text: a library page, the text is linked, not copied
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
INSERT INTO app.profiles VALUES ('1442f526-716b-4e44-900c-fcf90d1052a7', 'teacher', 'Гүлнар Әлиқызы', 'demo@adebietlab.kz', '6faa555212091df78fa495c9f7e35824:ce3dabfae8993d2fdaace8f070f310f3704b898066a74b70407c39264955d646', NULL, 0, '2026-11-27 10:47:50.61676+00');
INSERT INTO app.profiles VALUES ('669f3c0b-f2a9-444d-a088-9262f5585962', 'student', 'Айару', NULL, NULL, 'ffbefc0bb7b8056c5499a276c9f259cd:22695d19f1f19542327dd2d389252d951df404893a434bae85a2cc86fabb1576', 42, '2026-11-27 10:47:50.673131+00');
INSERT INTO app.profiles VALUES ('ccd05675-d896-42ba-9f6e-345c4f132482', 'student', 'Дана', NULL, NULL, 'ead827d985775d2987ade36ae2277575:35df1e83b2b42e7dcd0c0381e7246be9f5380bd0e5ea1a315231f5963ca96252', 35, '2026-11-27 10:47:50.723591+00');
INSERT INTO app.profiles VALUES ('fb5e538c-0dd6-4521-b460-a2e23962bfae', 'student', 'Мирас', NULL, NULL, 'e623715d24cfbb2a00cd05e4178fdad9:d4af0cd148153a93eeb0bfb7398e2c69fefeeada9e79f2817ed8127928fdece6', 18, '2026-11-27 10:47:50.772639+00');
INSERT INTO app.classes VALUES ('a23b8391-a035-42ab-854d-f4110ba666f9', '1442f526-716b-4e44-900c-fcf90d1052a7', '7 «Ә»', 7, 'LAB7QA', '2026-11-27 10:47:50.619671+00');
INSERT INTO app.methods VALUES ('6e904ce4-0725-48fa-bfb1-cc53f6115a50', 'bloom', 'Блум таксономиясы бойынша сұрақтар', 'Білу, түсіну, қолдану, талдау, жинақтау, бағалау деңгейіндегі сұрақтар.', 'Сұрақтарды төменгі деңгейден (білу) жоғарғы деңгейге (бағалау) қарай орналастыр. Білу деңгейіне жабық сұрақ, жоғары деңгейлерге ашық сұрақ жаса. Әр сұрақтың шартына деңгейін жаз.', '', NULL);
INSERT INTO app.methods VALUES ('a000d292-c72e-4933-a079-c0049e120a1b', 'test', 'Тест және сәйкестендіру', 'Бір жауапты тест, сәйкестендіру, бос орынды толтыру, ретке қою.', 'Тек жабық тапсырмалар жаса: single_choice, matching, fill_blank, ordering. Әр тестте 4 нұсқа, біреуі ғана дұрыс. Дұрыс емес нұсқалар сенімді, бірақ мәтінге қайшы болсын.', '', NULL);
INSERT INTO app.methods VALUES ('04c346d9-edc1-41f8-9510-c6ea2f853d04', 'sinkvein', 'Синквейн', 'Кейіпкерге не ұғымға бес жолдық өлең құрастыру.', 'Бір open тапсырма жаса: 1-жол — зат есім, 2-жол — екі сын есім, 3-жол — үш етістік, 4-жол — төрт сөзден тұратын сөйлем, 5-жол — бір синоним. Критерийде әр жолдың талабын жаз. Қаласаң, бір fill_blank тапсырмасын қос.', '', NULL);
INSERT INTO app.methods VALUES ('933affe5-29e8-432a-b1c2-6e490db2348d', 'venn', 'Венн диаграммасы', 'Екі кейіпкерді, екі шығарманы немесе екі бейнені салыстыру.', 'Материалдан салыстыруға болатын екі нысанды тап. Ұқсастық пен айырмашылықты табуға арналған open тапсырма және бір matching тапсырмасын (белгі → кейіпкер) жаса.', '', NULL);
INSERT INTO app.works VALUES ('a387bda7-474f-4058-bfc0-1ce8bddff66e', 'abai-qys', 'Қыс', 'Абай Құнанбайұлы', '1845–1904', 'Өлең', '{5,6,7}', 'Абай қысты ақ киімді, ақ сақалды қарт бейнесінде кейіптеп суреттейді.', 'Ақ киімді, денелі, ақ сақалды,
Соқыр, мылқау, танымас тірі жанды.
Үсті-басы ақ қырау, түсі суық,
Басқан жері сықырлап, келіп қалды.', 'ТЗ-да тексерілген үзінді (1-шумақ). Толық мәтінді сенімді басылымнан қосыңыз.', 'https://adebiportal.kz/kz/authors/book/708', true, '{"poem": {"lines": ["Ақ киімді, денелі, ақ сақалды,", "Соқыр, мылқау, танымас тірі жанды.", "Үсті-басы ақ қырау, түсі суық,", "Басқан жері сықырлап, келіп қалды."], "meter": "11", "rhyme": "а-а-б-а"}}');
INSERT INTO app.works VALUES ('c3a9f365-7702-45dc-ac63-cef2fee1781b', 'abai-gylym', 'Ғылым таппай мақтанба', 'Абай Құнанбайұлы', '1845–1904', 'Өлең', '{8,9}', 'Абай жастарды білімсіз мақтанбауға шақырады. Өлеңде адамды аздыратын бес нәрседен (өсек, өтірік, мақтаншақтық, еріншектік, бекер мал шашу) аулақ болуға, бес нәрсеге (талап, еңбек, терең ой, қанағат, рақым) ұмтылуға кеңес беріледі.', NULL, NULL, 'https://adebiportal.kz/kz/authors/book/708', true, '{}');
INSERT INTO app.works VALUES ('b3b164f1-8f0a-49cb-a717-e2bbf6786970', 'abai-qara-soz', 'Қара сөздер', 'Абай Құнанбайұлы', '1845–1904', 'Проза', '{9,10,11}', 'Абайдың қырық бес ғақлиясы — адамгершілік, білім, еңбек, адамның мінезі мен қоғам туралы философиялық толғаныстар. Ақын қазақ қоғамының кемшілігін сынап, адам болудың жолын іздейді.', NULL, NULL, 'https://adebiportal.kz/kz/authors/book/708', true, '{}');
INSERT INTO app.works VALUES ('8951dfc4-56cc-48ac-a517-f22222ae3de6', 'altynsarin-kel', 'Кел, балалар, оқылық', 'Ыбырай Алтынсарин', '1841–1889', 'Өлең', '{5}', 'Ағартушы ақын балаларды оқуға, білім алуға шақырады. Өлеңде оқу — болашақтың кілті, білімді адам еліне пайдалы болады деген ой айтылады.', NULL, NULL, 'https://adebiportal.kz/kz/authors/book/1166', true, '{}');
INSERT INTO app.works VALUES ('02774c64-07e3-4d18-a7a1-8c65642581c9', 'baitursynuly-qyryq', 'Қырық мысал', 'Ахмет Байтұрсынұлы', '1872–1937', 'Мысал', '{5,6}', '1909 жылы жарық көрген мысалдар жинағы. Көбі И. А. Крылов мысалдарының еркін аудармасы. Жануарлар бейнесі арқылы қоғамдағы надандық, жалқаулық, озбырлық сынға алынып, халықты оянуға шақырады.', NULL, NULL, NULL, false, '{}');
INSERT INTO app.works VALUES ('23ccb24a-2c88-497b-8b75-f9cbb657b7bc', 'zhumabaev-olender', 'Өлеңдері', 'Мағжан Жұмабаев', '1893–1938', 'Өлең', '{9,10,11}', 'Мағжанның лирикасында табиғат, махаббат, туған жер мен елдің болашағы жырланады. Ақын өлеңге жаңа ырғақ пен бейнелі тіл әкелген.', NULL, NULL, NULL, false, '{}');
INSERT INTO app.works VALUES ('9814f8e3-08e7-422b-8ef0-d31fbccc2486', 'shakarim-olender', 'Өлеңдері', 'Шәкәрім Құдайбердіұлы', '1858–1931', 'Өлең', '{9,10,11}', 'Шәкәрімнің философиялық лирикасы. Ақын адамның ар-ожданы, ақиқат пен адалдық, білім мен еңбек туралы толғанады.', NULL, NULL, NULL, false, '{}');
INSERT INTO app.works VALUES ('95da7476-aec8-4753-bd7a-5fcd6780113a', 'kozy-korpesh', 'Қозы Көрпеш – Баян сұлу', 'Халық ауыз әдебиеті', NULL, 'Лиро-эпостық жыр', '{7}', 'Қозы Көрпеш пен Баян сұлудың махаббаты туралы қазақтың лиро-эпостық жыры. Сарыбай мен Қарабай балаларын туылмай тұрып атастырады. Сарыбай қайтыс болған соң Қарабай уәдесінен тайып, елін көшіріп кетеді. Ер жеткен Қозы Көрпеш Баянды іздеп табады, бірақ Қодардың қастығынан қаза табады. Баян Қодардан кек алып, Қозының басында өзі де көз жұмады.', NULL, NULL, 'https://adebiportal.kz/kz/authors/book/1093', true, '{"egerde": {"question": "Егер Қарабай уәдесінде тұрғанда, оқиға қалай өрбір еді?", "checklist": ["Болжам кейіпкердің мінезіне сай", "Жырдан дәлел келтірдім", "Оқиғаның соңын түсіндірдім"]}, "timeline": [{"id": "e1", "text": "Сарыбай мен Қарабай балаларын туылмай тұрып атастырады", "element": "экспозиция"}, {"id": "e2", "text": "Сарыбай қайтыс болып, Қарабай уәдесінен тайып, елін көшіріп кетеді", "element": "байланыс"}, {"id": "e3", "text": "Қозы Көрпеш ер жетіп, Баянды іздеп шығады", "element": "шиеленіс"}, {"id": "e4", "text": "Қодар Қозы Көрпешті өлтіреді", "element": "шарықтау шегі"}, {"id": "e5", "text": "Баян Қодардан кек алып, Қозының басында өзі де қаза табады", "element": "шешім"}], "reference": [{"to": "karabai", "from": "sarybai", "label": "құда болуға уәделесті"}, {"to": "kozy", "from": "sarybai", "label": "әкесі"}, {"to": "bayan", "from": "karabai", "label": "әкесі"}, {"to": "bayan", "from": "kozy", "label": "атастырылған жар"}, {"to": "bayan", "from": "kodar", "label": "Баянға қызығады"}, {"to": "kozy", "from": "kodar", "label": "өліміне себепкер"}], "characters": [{"x": 140, "y": 50, "id": "sarybai", "kind": "secondary", "name": "Сарыбай", "note": "бай"}, {"x": 460, "y": 50, "id": "karabai", "kind": "secondary", "name": "Қарабай", "note": "бай"}, {"x": 140, "y": 180, "id": "kozy", "kind": "main", "name": "Қозы Көрпеш", "note": "басты кейіпкер"}, {"x": 460, "y": 180, "id": "bayan", "kind": "main", "name": "Баян сұлу", "note": "басты кейіпкер"}, {"x": 300, "y": 290, "id": "kodar", "kind": "antagonist", "name": "Қодар", "note": "қарсы кейіпкер"}]}');
INSERT INTO app.works VALUES ('e139a63f-dc84-4641-85cb-2d3ffa347303', 'qyz-zhibek', 'Қыз Жібек', 'Халық ауыз әдебиеті', NULL, 'Лиро-эпостық жыр', '{7,8}', 'Төлеген алыс елге барып, Жібекті жар етіп таңдайды. Қайтар жолда Бекежан оны өлтіреді. Кейін Төлегеннің інісі Сансызбай Жібекті жаудан құтқарады. Жыр махаббатқа адалдықты, ерлікті жырлайды.', NULL, NULL, 'https://adebiportal.kz/kz/authors/book/1093', true, '{}');
INSERT INTO app.works VALUES ('705b2d46-0361-4450-a28d-3468c81e2562', 'er-targyn', 'Ер Тарғын', 'Халық ауыз әдебиеті', NULL, 'Батырлар жыры', '{6,7}', 'Ер Тарғын туралы батырлар жыры. Тарғын елін жаудан қорғайды, оның сүйіктісі Ақжүніс батырдың адал серігі ретінде суреттеледі. Жыр ерлікті, достықты, ар-намысты дәріптейді.', NULL, NULL, 'https://adebiportal.kz/kz/authors/book/1093', true, '{}');
INSERT INTO app.works VALUES ('66bb5502-a573-4c57-ac72-6176f4c7c330', 'alpamys', 'Алпамыс батыр', 'Халық ауыз әдебиеті', NULL, 'Батырлар жыры', '{6,7}', 'Алпамыс қалыңдығы Гүлбаршынды іздеп барып, Тайшық ханның әскерімен соғысады, тұтқынға түсіп, зынданда отырады. Еліне оралғанда оны Ұлтан құл билеп алғанын көріп, әділдікті қалпына келтіреді.', NULL, NULL, 'https://adebiportal.kz/kz/books/view/alpamys-batyr-men-qobylandy-batyr-zyrlary__4052', true, '{}');
INSERT INTO app.works VALUES ('4ef3ce7f-4465-4492-a8f0-54eb36f222b3', 'er-tostik', 'Ер Төстік', 'Халық ауыз әдебиеті', NULL, 'Ертегі', '{5}', 'Ер Төстік пен оның тұлпары Шалқұйрық туралы қиял-ғажайып ертегі. Төстік жер астына түсіп, қиын сынақтардан өтеді, Кенжекейді жар етіп, еліне оралады.', NULL, NULL, 'https://adebiportal.kz/kz/authors/book/1093', true, '{}');
INSERT INTO app.works VALUES ('e9fdb95b-08e8-4040-8e3a-93a19effac33', 'aldar-kose', 'Алдар Көсе туралы ертегілер', 'Халық ауыз әдебиеті', NULL, 'Ертегі', '{5}', 'Алдар Көсе — тапқыр, әзілқой кейіпкер. Ол сараң байлар мен мақтаншақтарды ақылымен алдап, кедейлерге қол ұшын береді. Ертегілер тапқырлықты, әділдікті дәріптейді.', NULL, NULL, 'https://adebiportal.kz/kz/authors/book/1093', true, '{}');
INSERT INTO app.works VALUES ('67ea4147-276b-410a-937e-1be9575b87c0', 'auezov-kokserek', 'Көксерек', 'Мұхтар Әуезов', '1897–1961', 'Әңгіме', '{7,8}', 'Бала Құрмаш апанынан әкелінген бөлтірікті асырайды. Көксерек есейген сайын жабайы табиғаты басым түсіп, ауылға зиян келтіреді. Әңгіме адам мен табиғат, жабайылық пен тәрбие туралы ойға жетелейді.', NULL, NULL, NULL, false, '{}');
INSERT INTO app.works VALUES ('9dd6b0e9-2fc4-4b5d-afa5-cc4261b82a48', 'auezov-abai-zholy', 'Абай жолы', 'Мұхтар Әуезов', '1897–1961', 'Роман-эпопея', '{10,11}', 'Абайдың балалық шағынан кемелденген шағына дейінгі өмір жолы суреттелетін роман-эпопея. Шығармада ХІХ ғасырдағы қазақ даласының тұрмысы, ел ішіндегі тартыс және ақынның рухани ізденісі бейнеленеді.', NULL, NULL, NULL, false, '{}');
INSERT INTO app.works VALUES ('013bc209-ab3d-4cc7-ad5a-257bf6a7c07b', 'zhumadilov-kozykuren', 'Қозыкүрең', 'Қабдеш Жұмаділов', NULL, 'Әңгіме', '{6,7}', '', NULL, NULL, NULL, false, '{}');
INSERT INTO app.works VALUES ('a5770941-bfd0-40df-b768-817f037e8550', 'kobylandy', 'Қобыланды батыр', 'Халық ауыз әдебиеті', NULL, 'Батырлар жыры', '{7,8}', 'Қазақтың қаһармандық эпосы. Қобыланды еліне қауіп төндірген Қазан ханға қарсы аттанып, оны жеңеді. Батырдың адал жары Құртқа, тұлпары Тайбурыл және жау жағындағы батыр қыз Қарлыға — жырдың есте қалатын бейнелері. Жыр ерлікті, елге адалдықты, сенім мен достықты дәріптейді.', NULL, NULL, 'https://adebiportal.kz/kz/books/view/kobilandi_batir_zhiri__972', true, '{}');
INSERT INTO app.works VALUES ('4f3cdb30-41bd-4f0b-8f76-f7b2d706c3d0', 'qambar', 'Қамбар батыр', 'Халық ауыз әдебиеті', NULL, 'Батырлар жыры', '{6,7}', 'Қамбар — аңшылықпен күн көріп, елге азық тауып берген жас батыр. Ол Әзімбай байдың ауылын жау шапқанда қорғап, ерлігімен танылады. Байдың қызы Назым жар таңдағанда байлық пен атаққа емес, Қамбардың ерлігі мен адалдығына қарайды.', NULL, NULL, 'https://adebiportal.kz/kz/authors/book/1093', true, '{}');
INSERT INTO app.works VALUES ('95470872-478c-44d8-9a52-d4d60380c4aa', 'er-edige', 'Ер Едіге', 'Халық ауыз әдебиеті', NULL, 'Батырлар жыры', '{8,9}', 'Алтын Орда дәуіріндегі тарихи тұлға Едіге би туралы эпостық жыр. Жырда Едігенің ақылы мен ерлігі, Тоқтамыс ханмен арадағы тартысы баяндалады. Шығармада тарих пен аңыз қатар өріледі.', NULL, NULL, 'https://adebiportal.kz/kz/authors/book/1093', true, '{}');
INSERT INTO app.works VALUES ('26f4dc9a-3a7c-4029-b97e-b33feea3620f', 'aiman-sholpan', 'Айман – Шолпан', 'Халық ауыз әдебиеті', NULL, 'Лиро-эпостық жыр', '{7,8}', 'Айман мен Шолпан есімді ақылды, батыл қыздар туралы лиро-эпостық жыр. Байлардың тәкаппарлығы мен бәсекесінен басталған оқиғада Айманның тапқырлығы шешуші рөл атқарады. Жыр әйелдің ақылы мен ар-намысын, сөзге беріктікті дәріптейді.', NULL, NULL, 'https://adebiportal.kz/kz/authors/book/1093', true, '{}');
INSERT INTO app.works VALUES ('efa654c1-86e2-4c05-be30-2e0ff5932368', 'kendebai', 'Керқұла атты Кендебай', 'Халық ауыз әдебиеті', NULL, 'Ертегі', '{5}', 'Батыр жігіт Кендебай мен оның ақылды тұлпары Керқұла туралы қиял-ғажайып ертегі. Кендебай алыс сапарға шығып, тұлпарының көмегімен қиын сынақтардан өтеді. Ертегі ерлікті, адалдықты және адам мен тұлпардың достығын дәріптейді.', NULL, NULL, 'https://adebiportal.kz/kz/authors/book/1093', true, '{}');
INSERT INTO app.works VALUES ('1e30425f-1e68-4a3e-88ba-1c389db3f9b2', 'ayaz-bi', 'Аяз би', 'Халық ауыз әдебиеті', NULL, 'Ертегі', '{5,6}', 'Кедей жігіт Аяз ақылы мен әділдігінің арқасында ханның кеңесшісі — би болады. Биік мәртебеге жетсе де, ол бұрынғы киімін сақтап, оған қарап өзінің бұрын кім болғанын еске алады. Ертегі адам қандай биікке жетсе де, өзінің кім екенін ұмытпауы керектігін үйретеді.', NULL, NULL, 'https://adebiportal.kz/kz/authors/book/1093', true, '{}');
INSERT INTO app.works VALUES ('26883b4a-5ca5-471a-927d-977dc0364f90', 'qorqyt', 'Қорқыт ата туралы аңыздар', 'Халық ауыз әдебиеті', NULL, 'Аңыз', '{5,6}', 'Қорқыт — қобызшы, жырау, ақылгөй ретінде белгілі аңыз кейіпкері. Ол ажалдан қашып, жер жүзін кезеді, бірақ қайда барса да көр қазып жатқан адамдарды көреді. Ақыры Сырдария жағасына оралып, қобыз тартады: күй тартылып тұрғанда ажал оған жақындай алмайды.', NULL, NULL, 'https://adebiportal.kz/kz/authors/book/1093', true, '{"timeline": [{"id": "e1", "text": "Қорқыт түсінде ажалының жақын екенін естиді", "element": "экспозиция"}, {"id": "e2", "text": "Ол ажалдан қашып, жер шетіне сапарға шығады", "element": "байланыс"}, {"id": "e3", "text": "Қайда барса да көр қазып жатқан адамдарды кездестіреді", "element": "шиеленіс"}, {"id": "e4", "text": "Сырдарияға оралып, судың бетіне кілем төсеп, тоқтамай қобыз тартады", "element": "шарықтау шегі"}, {"id": "e5", "text": "Ұйқы басқанда ажал жылан болып келіп, Қорқытты шағады", "element": "шешім"}]}');
INSERT INTO app.works VALUES ('7d4f2bfa-cb6f-4bb8-af40-7e4b4dd747a1', 'abai-kuz', 'Күз', 'Абай Құнанбайұлы', '1845–1904', 'Өлең', '{5,6}', 'Абай күздің суық, сұрғылт көрінісін ауыл тұрмысымен қатар суреттейді. Табиғаттың өзгеруі адамдардың, әсіресе киімі жұқа кедейлердің, күйіне әсер етеді. Өлеңде табиғат лирикасы мен әлеуметтік ой бірге өріледі.', NULL, NULL, 'https://adebiportal.kz/kz/authors/book/708', true, '{}');
INSERT INTO app.works VALUES ('614feca1-8677-4907-9a4d-d8917fb076f3', 'abai-zhazgyturu', 'Жазғытұры', 'Абай Құнанбайұлы', '1845–1904', 'Өлең', '{5,6}', 'Көктем келгенде табиғат пен ауылдың қалай жанданатыны суреттеледі. Қыстың суығы кетіп, мал төлдейді, жастар мен балалардың көңілі көтеріледі. Абай табиғат көрінісін адамның қуанышымен қатар береді.', NULL, NULL, 'https://adebiportal.kz/kz/authors/book/708', true, '{}');
INSERT INTO app.works VALUES ('e4f13b34-19a2-492e-b874-e788b5be4d70', 'abai-segiz-ayaq', 'Сегіз аяқ', 'Абай Құнанбайұлы', '1845–1904', 'Өлең', '{8,9}', 'Абай ойлап тапқан сегіз тармақты шумақпен жазылған өлең. Ақын қоғамдағы надандық пен жалқаулықты сынап, жастарды ойлануға, білім мен еңбекке шақырады.', NULL, NULL, 'https://adebiportal.kz/kz/authors/book/708', true, '{}');
INSERT INTO app.works VALUES ('176067f2-4e07-4963-9fd0-a70d1622b5ae', 'abai-eskendir', 'Ескендір', 'Абай Құнанбайұлы', '1845–1904', 'Поэма', '{9,10}', 'Ескендір патшаның шексіз жаулап алу құмарлығы туралы поэма. Ұстазы Аристотель оған адамның көзі ешқашан тоймайтынын, оны тек топырақ қана тойдыратынын түсіндіреді. Поэма тойымсыздық пен менмендікті сынайды.', NULL, NULL, 'https://adebiportal.kz/kz/authors/book/708', true, '{}');
INSERT INTO app.works VALUES ('0eb1cfd8-2dc7-4702-ae6d-d585b78f7292', 'altynsarin-oner', 'Өнер-білім бар жұрттар', 'Ыбырай Алтынсарин', '1841–1889', 'Өлең', '{5,6}', 'Ақын өнер мен білімнің арқасында басқа халықтардың қандай табысқа жеткенін айтып, қазақ жастарын оқуға, білім алуға шақырады. Өлең ағартушылық ойдың үлгісі.', NULL, NULL, 'https://adebiportal.kz/kz/authors/book/1166', true, '{}');
INSERT INTO app.works VALUES ('e63d81e0-d318-4d7a-91b7-b36c2e994d49', 'altynsarin-seitkul', 'Қыпшақ Сейітқұл', 'Ыбырай Алтынсарин', '1841–1889', 'Әңгіме', '{5}', 'Кедей Сейітқұл қолына кетпен алып, жер өңдейді, табанды еңбегінің арқасында тұрмысын түзейді. Әңгіме жалқаулық пен үмітсіздікке қарсы еңбектің жемісін көрсетеді.', NULL, NULL, 'https://adebiportal.kz/kz/authors/book/1166', true, '{}');
INSERT INTO app.works VALUES ('82a4d6b9-d094-4d5e-abb8-5e48cacffe3b', 'altynsarin-ake-bala', 'Әке мен бала', 'Ыбырай Алтынсарин', '1841–1889', 'Әңгіме', '{5}', 'Жолда келе жатқан әке жерде жатқан тағаны көріп, баласына алуды айтады, бала ерініп алмайды. Әке тағаны өзі алып, сатып, ақшасына шие алады да, шиені бір-бірлеп түсіріп отырады. Бала әр шиені еңкейіп теріп алады. Сонда әке бір рет еңкеюге ерінген адам кейін көп рет еңкейетінін түсіндіреді.', NULL, NULL, 'https://adebiportal.kz/kz/authors/book/1166', true, '{"timeline": [{"id": "e1", "text": "Әке мен бала жолда келе жатып, жерде жатқан тағаны көреді", "element": "экспозиция"}, {"id": "e2", "text": "Бала тағаны алуға ерінеді, әке оны өзі алады", "element": "байланыс"}, {"id": "e3", "text": "Әке тағаны сатып, ақшасына шие алады", "element": "шиеленіс"}, {"id": "e4", "text": "Әке шиені бір-бірлеп түсіреді, бала әрқайсысын еңкейіп теріп алады", "element": "шарықтау шегі"}, {"id": "e5", "text": "Әке бір рет еңкеюге ерінген адам көп рет еңкейетінін түсіндіреді", "element": "шешім"}]}');
INSERT INTO app.works VALUES ('92b5d7d5-fda0-40bd-863f-f84948a96a11', 'makhambet-ereuil', 'Ереуіл атқа ер салмай', 'Махамбет Өтемісұлы', '1803–1846', 'Өлең', '{8,9}', 'Махамбет батырлықты, ел бостандығы үшін күресті жырлайды. Ақынның ойынша, атқа қонбай, қару алмай, жанқиярлықсыз жаудан кек алу мүмкін емес. Өлеңнің ырғағы шапшаң, екпінді, жыраулық поэзияның дәстүрін көрсетеді.', NULL, NULL, 'https://adebiportal.kz/kz/authors/view/1143', true, '{}');
INSERT INTO app.works VALUES ('de94a5f0-b315-4433-832f-018dee9dfbd7', 'toraigyrov-qamar', 'Қамар сұлу', 'Сұлтанмахмұт Торайғыров', '1893–1920', 'Роман', '{10,11}', 'Қамар есімді қыздың сүйгеніне қосыла алмай, еркінен тыс күйеуге берілуі мен қайғылы тағдыры суреттелетін роман. Шығармада әйел теңдігі мәселесі көтеріліп, ескі салттың зардабы сынға алынады.', NULL, NULL, 'https://adebiportal.kz/kz/authors/view/1157', true, '{}');
INSERT INTO app.works VALUES ('6d43cd34-8a93-435e-bc38-30d21a97187a', 'toraigyrov-shakirt', 'Шәкірт ойы', 'Сұлтанмахмұт Торайғыров', '1893–1920', 'Өлең', '{9,10}', 'Жас ақынның оқу мен білімге құштарлығы, халқына қызмет етсем деген арманы жырланады. Өлеңде шәкірттің алдағы жолы мен кедергілері туралы толғанысы бар.', NULL, NULL, 'https://adebiportal.kz/kz/authors/view/1157', true, '{}');
INSERT INTO app.works VALUES ('1fc5e9ea-a038-4988-aaab-600ca41896f0', 'zhambyl-leningrad', 'Ленинградтық өрендерім', 'Жамбыл Жабаев', '1846–1945', 'Өлең', '{7,8}', '1941 жылы, соғыс кезінде жазылған өлең. Жамбыл қоршауда қалған Ленинград қорғаушыларына қолдау білдіріп, оларды өз балаларындай көреді. Өлең Отанды қорғаудағы ерлікті және халықтар достығын жырлайды.', NULL, NULL, 'https://adebiportal.kz/kz/authors/book/1175', true, '{}');
INSERT INTO app.works VALUES ('3ca1e853-a681-4b61-8ac1-672488ff22c0', 'shortanbai-zar-zaman', 'Зар заман', 'Шортанбай Қанайұлы', '1818–1881', 'Толғау', '{9,10}', 'Ақын өз дәуірін «зар заман» деп атап, елдің бұрынғы еркіндігінен айырылғанына, адамгершіліктің азғанына күйінеді. Толғау зар заман әдебиетінің көрнекті үлгісі.', NULL, NULL, 'https://adebiportal.kz/kz/books/view/1036', true, '{}');
INSERT INTO app.works VALUES ('a9a21859-a392-4fa5-9fad-e22d01f19800', 'murat-ush-qiyan', 'Үш қиян', 'Мұрат Мөңкеұлы', '1843–1906', 'Толғау', '{9,10}', 'Ақын ата-бабадан қалған кең өлкелердің қолдан кеткеніне күйінеді, тарихи жерлерді еске алып, елдің болашағына алаңдайды. Толғау зар заман әдебиетінің ірі үлгісі.', NULL, NULL, 'https://adebiportal.kz/kz/authors/view/1017', true, '{}');
INSERT INTO app.task_sets VALUES ('635708d3-5d87-49b3-8e4e-9b61759323b5', '1442f526-716b-4e44-900c-fcf90d1052a7', '6e904ce4-0725-48fa-bfb1-cc53f6115a50', 'a387bda7-474f-4058-bfc0-1ce8bddff66e', '«Қыс» өлеңіндегі кейіптеу', 'Ақ киімді, денелі, ақ сақалды,
Соқыр, мылқау, танымас тірі жанды.
Үсті-басы ақ қырау, түсі суық,
Басқан жері сықырлап, келіп қалды.
Абай бұл өлеңде қысты ақ киімді, ақ сақалды қарт бейнесінде суреттейді. Ақын табиғат құбылысын адамға ұқсатып, кейіптеу тәсілін қолданады. Өлең он бір буынды қара өлең өлшемімен жазылған.', 7, 'Өлеңдегі кейіптеуді табу және түсіндіру', 'B', 'approved', true, 'Демо режим: тапсырмалар ЖИ-сіз, ережемен жасалды (AI_MOCK=true).', '2026-11-27 10:47:50.780996+00');
INSERT INTO app.assignments VALUES ('05116ee9-546f-482a-b6be-733f4191bad6', 'a23b8391-a035-42ab-854d-f4110ba666f9', 'lab', NULL, '95da7476-aec8-4753-bd7a-5fcd6780113a', '{char_map,egerde}', '2026-12-04', 'limited', '2026-11-27 10:47:50.777681+00');
INSERT INTO app.assignments VALUES ('52f85dd9-3686-49c0-9c44-4028efac96ca', 'a23b8391-a035-42ab-854d-f4110ba666f9', 'tasks', '635708d3-5d87-49b3-8e4e-9b61759323b5', NULL, '{}', '2026-12-04', 'limited', '2026-11-27 10:47:50.790149+00');
INSERT INTO app.class_members VALUES ('a23b8391-a035-42ab-854d-f4110ba666f9', '669f3c0b-f2a9-444d-a088-9262f5585962');
INSERT INTO app.class_members VALUES ('a23b8391-a035-42ab-854d-f4110ba666f9', 'ccd05675-d896-42ba-9f6e-345c4f132482');
INSERT INTO app.class_members VALUES ('a23b8391-a035-42ab-854d-f4110ba666f9', 'fb5e538c-0dd6-4521-b460-a2e23962bfae');
INSERT INTO app.lab_works VALUES ('d2eed879-f3a4-4aa4-951d-e800dc44c810', '669f3c0b-f2a9-444d-a088-9262f5585962', 'a387bda7-474f-4058-bfc0-1ce8bddff66e', 'olen', '{"meter": "11", "rhyme": "а-а-б-а"}', '{"meter_ok": true, "rhyme_ok": true}', NULL, false, '2026-11-27 10:47:50.792106+00');
INSERT INTO app.lab_works VALUES ('f8312a4e-258e-4c92-af1d-ff126025d4f1', 'fb5e538c-0dd6-4521-b460-a2e23962bfae', 'a387bda7-474f-4058-bfc0-1ce8bddff66e', 'olen', '{"meter": "11", "rhyme": "а-б-а-б"}', '{"meter_ok": true, "rhyme_ok": false}', NULL, false, '2026-11-27 10:47:50.793724+00');
INSERT INTO app.lab_works VALUES ('cf950032-fcbe-4c25-bb9d-bf8ec88e04ff', '669f3c0b-f2a9-444d-a088-9262f5585962', '95da7476-aec8-4753-bd7a-5fcd6780113a', 'char_map', '{"edges": [{"to": "karabai", "from": "sarybai", "evidence": "Екі бай балаларын туылмай тұрып атастырады."}, {"to": "kozy", "from": "sarybai", "evidence": "Сарыбай — Қозының әкесі."}, {"to": "bayan", "from": "karabai", "evidence": "Қарабай — Баянның әкесі."}, {"to": "bayan", "from": "kozy", "evidence": "Әкелері уәделескен атастырылған жар."}]}', '{"found": 4, "total": 6, "missing": ["kodar|kozy", "bayan|kodar"]}', NULL, false, '2026-11-27 10:47:50.794791+00');
INSERT INTO app.lab_works VALUES ('48cca399-b1d0-4827-b298-cabbf0b6bac0', 'ccd05675-d896-42ba-9f6e-345c4f132482', '95da7476-aec8-4753-bd7a-5fcd6780113a', 'egerde', '{"evidence": "Қарабайдың көшіп кететін эпизоды", "checklist": [true, true, false], "prediction": "Қозы мен Баян ерте қосылып, Қодармен қақтығыс болмас еді."}', '{}', NULL, true, '2026-11-27 10:47:50.795718+00');
INSERT INTO app.lab_works VALUES ('c95d36e1-44bd-4832-b0af-231013fbad12', 'fb5e538c-0dd6-4521-b460-a2e23962bfae', '95da7476-aec8-4753-bd7a-5fcd6780113a', 'egerde', '{"evidence": "Қодардың Баянға қызығуы", "checklist": [true, false, true], "prediction": "Бәрібір сынақ болар еді: Қодар Баянды жеңіл бермес еді."}', '{}', NULL, true, '2026-11-27 10:47:50.796606+00');
INSERT INTO app.lab_works VALUES ('7278ff00-106e-4b6c-a131-5f4e65a1b766', '669f3c0b-f2a9-444d-a088-9262f5585962', '95da7476-aec8-4753-bd7a-5fcd6780113a', 'egerde', '{"evidence": "Қарабайдың уәдесінен тайып, көшіп кеткен эпизоды", "checklist": [true, true, true], "prediction": "Егер Қарабай уәдесінде тұрғанда, Қозы мен Баян ерте қосылар еді. Бірақ Қодар Баянға қызығатындықтан, қақтығыс бәрібір болар еді, тек басқаша аяқталуы мүмкін еді."}', '{}', NULL, true, '2026-11-27 10:47:50.797812+00');
INSERT INTO app.lab_votes VALUES ('48cca399-b1d0-4827-b298-cabbf0b6bac0', '669f3c0b-f2a9-444d-a088-9262f5585962');
INSERT INTO app.lab_votes VALUES ('48cca399-b1d0-4827-b298-cabbf0b6bac0', 'fb5e538c-0dd6-4521-b460-a2e23962bfae');
INSERT INTO app.lab_votes VALUES ('c95d36e1-44bd-4832-b0af-231013fbad12', '669f3c0b-f2a9-444d-a088-9262f5585962');
INSERT INTO app.tasks VALUES ('2e2da0c0-40ab-4140-8ca7-3977fb106ae5', '635708d3-5d87-49b3-8e4e-9b61759323b5', 0, 'fill_blank', 'Бос орынды толтыр: «Ақ киімді, денелі, ақ ____,»', '[]', '["сақалды"]', 'Мәтіндегі сөз дәл жазылса — толық балл.', 2, '1-сөйлем');
INSERT INTO app.tasks VALUES ('823b075e-897d-420d-b277-11eaac997d2f', '635708d3-5d87-49b3-8e4e-9b61759323b5', 1, 'single_choice', 'Төмендегі сөздердің қайсысы материалда кездеседі?', '["ғарыш", "танымас", "компьютер", "мұхит"]', '1', 'Дұрыс нұсқа таңдалса — 1 балл.', 1, '2-сөйлем');
INSERT INTO app.tasks VALUES ('2505c6f4-3675-4a8a-af9e-2684494925cb', '635708d3-5d87-49b3-8e4e-9b61759323b5', 2, 'ordering', 'Сөйлемдерді мәтіндегі ретімен орналастыр.', '["Басқан жері сықырлап, келіп қалды.", "Үсті-басы ақ қырау, түсі суық,", "Соқыр, мылқау, танымас тірі жанды.", "Ақ киімді, денелі, ақ сақалды,"]', '[3, 2, 1, 0]', 'Рет толық дұрыс болса — толық балл.', 3, '1–4-сөйлемдер');
INSERT INTO app.tasks VALUES ('2f2f3a14-875b-4ae1-aef7-b6711317b9df', '635708d3-5d87-49b3-8e4e-9b61759323b5', 3, 'open', 'Түсіну: материалдың негізгі ойын өз сөзіңмен 2–3 сөйлеммен түсіндір.', '[]', NULL, 'Негізгі ой дұрыс анықталды (2), өз сөзімен жазылды (1), мәтінге сілтеме бар (1).', 4, 'бүкіл мәтін');
INSERT INTO app.tasks VALUES ('604aef85-d249-4d98-ac03-2dab9efa6f02', '635708d3-5d87-49b3-8e4e-9b61759323b5', 4, 'open', 'Талдау: автор осы ойды қалай жеткізеді? Мәтіннен бір мысал келтір.', '[]', NULL, 'Тәсіл аталды (2), мәтіннен мысал келтірілді (2).', 4, 'бүкіл мәтін');
INSERT INTO app.tasks VALUES ('e6c9aea3-e46d-41c7-b34b-fceb002d4f6f', '635708d3-5d87-49b3-8e4e-9b61759323b5', 5, 'open', 'Бағалау: мәтіндегі ойға келісесің бе? Неге? Пікіріңді дәлелде.', '[]', NULL, 'Пікір анық (1), кемінде бір дәлел бар (2), мәтінге сүйенген (1).', 4, 'бүкіл мәтін');
set search_path = app, public;
-- The app's tables live in schema app; the pooler may drop the client's search_path option.
alter role current_user in database postgres set search_path = "$user", public, extensions, app;
