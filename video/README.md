# ӘдебиетLab — промо-видео (Remotion)

1920×1080, 30 кадр/с. Сценарий — `SCRIPT.md`, диктор мәтіні — `voiceover.md`, сахналар мен уақыт — `src/timeline.ts`, сурет — `src/Promo.tsx`.

```
cd video && npm install
npm run studio        # браузерде алдын ала қарау
npm run render        # дыбыс пен әуенді жасап, out/adebietlab.mp4 шығарады
```

- **Сайттың клиптері** (`public/clips`, `src/clips.json`) — сайттың өзі, тірі: `npm run db:setup && npm run build && npm start`, сосын `npm run record` (бір клип: `node record.mjs karta`; оқушы деректерін өзгертетін клипті қайта түсірерде алдымен `db:setup` пен `node record.mjs setup,АТЫ`). Терезе 1920×1080, бет 1.5 есе үлкейтілген: сайт 1280 енді экрандағыдай орналасады, кадр Full HD. Әр клипке басу сәттері (`marks`), көрсеткіш жолы, теру уақыты, бос сәттер (`idle`) жазылады; соңында `public/wall` суреттері мен қараңғы режим кадры шығады.
- **Уақыт**: `src/timeline.ts`-те әр басу диктордың қай сөзіне түсетіні жазылған. `npm run plan` әр сахнаның клипі дауысқа қалай сыйғанын көрсетеді (`rate` > 2 болса, әрекет тым жылдам; `shown` < 1 болса, соңы көрінбейді). `npm run stills -- /tmp/x 300 900` — жеке кадрларды тексеру.
- **Диктор** (`public/vo`, `src/vo.json`) — ElevenLabs, «Qazaq Diktor (studio)» дауысы (`VOICE_ID=2YvtOwa2zyqr6E5340Kx`, eleven_v3, kk). Бірнеше нұсқа: `ELEVENLABS_API_KEY=… TAKES=0,0.5 node scripts/vo-generate.mjs ./`, сосын ең жақсысын таңдап өңдеу: `TAKES_JSON=src/vo-takes.json PICK=03:2 python3 scripts/vo-pick.py ./ -` (сөз қатесі, интонация; `PICK` — құлақпен таңдалғаны). Нұсқалар репозиторийге кірмейді.
- **Әуен** (`public/music.wav`, репозиторийде жоқ) — `scripts/music.ts` синтездейді: сайттың домбыра әуені (`src/lib/music.ts`), 6/8, серпіліс пен тыныш тұс `timeline.ts`-тегі сахналарға байланған. Лицензия керек емес.
- **Дыбыс эффектілері** (`public/sfx`) — `scripts/sfx.ts`.
- **Браузер**: `remotion.config.ts` Playwright-тың chrome-headless-shell-ін қолданады, басқа жерде `REMOTION_BROWSER` арқылы беріңіз.
- Remotion лицензиясы: жеке адам мен 3 адамға дейінгі компанияға тегін, үлкен компанияға ақылы лицензия керек.
