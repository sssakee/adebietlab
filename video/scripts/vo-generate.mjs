// Voiceover in the owner's cloned voice: ELEVENLABS_API_KEY=… node scripts/vo-generate.mjs ./ [01,02,…]
// Reads voiceover.md (emotion tags stripped), writes public/vo/vo-XX.mp3 and src/vo.json.
// Settings the user picked: smooth (stability 1, no tags) and soft (stability 0.5, [softly]).
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
const root = process.argv[2], voice = "0MYarTVVCNzVkLKyDiWU", soft = new Set(["01","02","06","10","11"]);
const lines = [...readFileSync(root + "voiceover.md", "utf8").matchAll(/^\| vo-(\d\d) \| [^|]+ \| (.+) \|$/gm)].map(m => [m[1], m[2].replace(/\[[^\]]*\]\s*/g, "").trim()]);
const dur = JSON.parse(readFileSync(root + "src/vo.json", "utf8")), only = process.argv[3]?.split(",");
for (const [id, t] of lines) { if (only && !only.includes(id)) continue;
  const s = soft.has(id);
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, { method: "POST",
    headers: { "content-type": "application/json", "xi-api-key": process.env.ELEVENLABS_API_KEY },
    body: JSON.stringify({ text: s ? `[softly] ${t}` : t, model_id: "eleven_v3", language_code: "kk", voice_settings: { stability: s ? 0.5 : 1.0, similarity_boost: 0.9 } }) });
  if (!res.ok) throw new Error(id + " " + res.status + " " + await res.text());
  const f = `${root}public/vo/vo-${id}.mp3`; writeFileSync(f, Buffer.from(await res.arrayBuffer()));
  dur[id] = Number(execFileSync("ffprobe", ["-v","error","-show_entries","format=duration","-of","csv=p=0",f]).toString());
  console.log(id, s ? "soft" : "smooth", dur[id].toFixed(1));
}
writeFileSync(root + "src/vo.json", JSON.stringify(dur, null, 2) + "\n");
