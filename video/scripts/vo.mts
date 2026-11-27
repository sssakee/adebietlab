// Voiceover with ElevenLabs (Eleven v3, Kazakh): npx tsx scripts/vo.mts [voiceId]
// Reads the lines from voiceover.md, writes public/vo/vo-XX.mp3 and src/vo.json (seconds per scene).
// The key comes from ELEVENLABS_API_KEY, or the environment's network secret adds the header itself.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const API = "https://api.elevenlabs.io/v1";
const headers: Record<string, string> = { "content-type": "application/json" };
if (process.env.ELEVENLABS_API_KEY) headers["xi-api-key"] = process.env.ELEVENLABS_API_KEY;
const voice = process.argv[2] ?? process.env.VOICE_ID;
if (!voice) throw new Error("Дауыс id-ін беріңіз: npx tsx scripts/vo.mts <voiceId>");
const only = process.argv[3]; // optional: one scene id to redo

const root = new URL("..", import.meta.url).pathname;
const lines = [...readFileSync(root + "voiceover.md", "utf8").matchAll(/^\| vo-(\d\d) \| [^|]+ \| (.+) \|$/gm)].map((m) => [m[1], m[2].trim()] as const);
mkdirSync(root + "public/vo", { recursive: true });
const durations: Record<string, number> = JSON.parse(readFileSync(root + "src/vo.json", "utf8"));

for (const [id, text] of lines) {
  if (only && id !== only) continue;
  const res = await fetch(`${API}/text-to-speech/${voice}?output_format=mp3_44100_128`, {
    method: "POST", headers,
    body: JSON.stringify({ text, model_id: "eleven_v3", language_code: "kk", voice_settings: { stability: 0.4, similarity_boost: 0.8 } }),
  });
  if (!res.ok) throw new Error(`vo-${id}: ${res.status} ${await res.text()}`);
  const file = `${root}public/vo/vo-${id}.mp3`;
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  durations[id] = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString());
  console.log(`vo-${id}: ${durations[id].toFixed(1)} s`);
}
writeFileSync(root + "src/vo.json", JSON.stringify(durations, null, 2) + "\n");
