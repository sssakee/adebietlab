# ӘдебиетLab — промо-видео (Remotion)

1920×1080, 30 кадр/с. Сценарий — `SCRIPT.md`, диктор мәтіні — `voiceover.md`.

```
cd video && npm install
npm run studio        # браузерде алдын ала қарау
npm run render        # әуенді жасап, out/adebietlab.mp4 шығарады
```

- **Экрандар** (`public/shots`) — сайттың өзі, демо деректермен: `npm run db:setup && npm run build && npm start`, сосын `node video/capture.mjs`. Демо ЖИ жауабындағы «(Демо режим…)» белгісі түсірерде алынады.
- **Әуен** (`public/music.wav`, репозиторийде жоқ) — сайттың өз домбыра әуені (`src/lib/music.ts`), `scripts/music.ts` файлға синтездейді. Лицензия керек емес.
- **Диктор** (`public/vo`, `src/vo.json`) — ElevenLabs: `npx tsx scripts/vo.mts <voiceId> [сахна]`. Кілт ортаның network secret-інде не `ELEVENLABS_API_KEY`-де. Сахна ұзақтығы дауысқа қарай өзі есептеледі.
- **Браузер**: `remotion.config.ts` Playwright-тың chrome-headless-shell-ін қолданады, басқа жерде `REMOTION_BROWSER` арқылы беріңіз.
- Remotion лицензиясы: жеке адам мен 3 адамға дейінгі компанияға тегін, үлкен компанияға ақылы лицензия керек.
