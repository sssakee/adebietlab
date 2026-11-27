// How each scene's clicks fit the voice: npx tsx scripts/plan-report.ts
import { planScene } from "../src/Promo";
import { LENGTHS, SCENES } from "../src/timeline";
SCENES.forEach((s, i) => s.segs && console.log(s.id, JSON.stringify(planScene(s, LENGTHS[i]).report)));
