@AGENTS.md

# ӘдебиетLab — жоба ережелері

Толық ТЗ жоба иесінде (`adebietlab-prompt.md`). Бұл MVP: 1–5 кезеңнің негізгі бөлігі. Құжаттар: `README.md`, `docs/`.

## Технологиялар
Next.js 16 App Router (`cacheComponents` өшірулі — барлық бет cookie оқиды), TypeScript strict, Tailwind 4 (`@utility` арқылы `card`, `btn-*`, `chip`, `field`, `label`, `tag`), PostgreSQL (`postgres`), zod 4, Vitest.

## Папкалар
- `src/app/kiru` — кіру/тіркелу; `src/app/oqushy` — оқушы; `src/app/mugalim` — мұғалім; `src/app/api/chat` — чат.
- `src/lib/ai/` — ЖИ-мен сөйлесетін ЖАЛҒЫЗ жер (`index.ts`), промпттар (`prompts/`, қазақша), zod схемалары, демо (`mock.ts`).
- `src/lib/poem.ts`, `grading.ts`, `safety.ts` — ЖИ-сіз ережелер, тестпен бекітілген.
- `db/schema.sql` — схема (`app` схемасы); `scripts/seed*.ts` — демо деректер.

## Командалар
```
npm run lint && npm run typecheck && npm test && npm run build
npm run db:setup     # схема + демо деректер (бәрін өшіреді)
npm run ai:eval      # ЖИ тест кестесі → docs/ai-eval-results.md
npm run smoke        # іске қосылған серверде браузерлік сценарий
```

## Ережелер
- Әр бет пен әр server action ішінде `requireRole(...)`. Браузер дерекқорға тікелей шықпайды.
- Мұғалім деректері `teacher_id`/`class_id` арқылы тексеріледі (`ownClass`, `ownSet`, `ownSubmission`).
- ЖИ жауабы әрқашан zod арқылы өтеді. Модель атауы кодта емес, `AI_MODEL`-де.
- Чат мәтіні сақталмайды. Чатқа келген әр пайдаланушы хабары `checkMessage` арқылы өтеді.
- Шығарма мәтінін жадтан жазба. Авторлық құқықтағы шығармаға мәтін салма. Дәйексөз тек `src/lib/quotes.ts`-те, әрқайсысының дереккөзі жазулы.
- Беттің тақырыбы — беттің аты (`PageHead title`), ұран емес.
- Түсті тек токенмен жаз (`bg-surface`, `bg-accent-soft`, `text-on-color`…): `bg-white` пен hex қараңғы режимді бұзады.
- Қозғалыс тек `@media (prefers-reduced-motion: no-preference)` ішінде, тек `opacity`/`translate`/`scale`/`rotate`: `filter: blur`, `backdrop-filter` және SVG сүзгісі әлсіз телефонды қатырады. Бет ауысуы — `PageTransition`, түрі сілтеменің `data-nav` атрибутында (`tab`, `forward`, `back`). View Transitions API әдейі алынды: ескі беттің суретін түсіру әр басуға 0,3–0,5 с қосатын. Тақырып сөздері `SplitText`, бастапқы мөлдірлік 0 емес (LCP кешікпеуі үшін).
- Алғашқы нұсқаулық — `Tour` (қадамдары `oqushy/layout.tsx`, `mugalim/layout.tsx`-те). Дыбыс — `Sfx.tsx`-тегі `sfx`, бүкіл сайтқа бір тыңдаушы `SoundEffects`; әдепкіде өшірулі.
- Сервер әрекетінің формасындағы батырма — `Submit` (күту белгісі). Әр әрекеттің нәтижесі бетте хабармен көрінуі керек.
- Бекітілмеген жинақ сыныпқа берілмейді (`assignSet` тексереді).
- Бет файлынан `default`/`metadata`-дан басқа экспорт жасама — көмекші компоненттер `src/components`-те.
- Пайдаланушыға көрінетін мәтін — қазақша. Сан жұрнағын (4-еуі, 6-ның) динамикалық жазба: «Табылған байланыс: 4 / 6».
- React 19 әрекеттен кейін форманы тазалайды: қате қайтарсаң, құпия емес өрістерді де қайтар.
- JUZ40 шрифты лицензиялы — репозиторийді ашық етпе.
