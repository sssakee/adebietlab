// Voiceover in the owner's cloned voice: ELEVENLABS_API_KEY=… node scripts/vo-generate.mjs ./ [01,02,…]
// Reads voiceover.md, keeps the emotion tags, turns {n} markers into beat times from ElevenLabs' character
// timestamps (TEXT_ONLY=1 refreshes only the subtitle pieces), and writes public/vo/vo-XX.mp3 plus src/vo.json: { "05": { "dur": 7.9, "beats": [1.2, 2.8, 4.6] } }.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const root = process.argv[2] ?? "./";
const voice = process.env.VOICE_ID ?? "0MYarTVVCNzVkLKyDiWU";
const stability = Number(process.env.STABILITY ?? 0.5); // 0 creative … 1 robust; 0.5 lets the tags colour the voice
const only = process.argv[3]?.split(",");
const lines = [...readFileSync(root + "voiceover.md", "utf8").matchAll(/^\| vo-(\d\d) \| [^|]+ \| (.+) \|$/gm)].map((m) => [m[1], m[2].trim()]);
let out = {};
try { out = JSON.parse(readFileSync(root + "src/vo.json", "utf8")); } catch {}

for (const [id, raw] of lines) {
  if (only && !only.includes(id)) continue;
  // remember which word each {n} sits on, then send the text without markers
  const marks = [...raw.matchAll(/\{(\d+)\}\s*([^\s{[]+)/g)].map((m) => ({ n: Number(m[1]), word: m[2].replace(/[«».,!?—:]/g, "") }));
  const text = raw.replace(/\{\d+\}/g, "");
  // subtitle pieces: what is said from one beat to the next, without the emotion tags
  const say = raw.split(/\{\d+\}/).map((s) => s.replace(/\[[^\]]*\]\s*/g, "").trim()).filter(Boolean);
  if (process.env.TEXT_ONLY) { out[id] = { ...out[id], say }; continue; }
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}/with-timestamps?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "content-type": "application/json", "xi-api-key": process.env.ELEVENLABS_API_KEY },
    body: JSON.stringify({ text, model_id: "eleven_v3", language_code: "kk", voice_settings: { stability, similarity_boost: 0.9 } }),
  });
  if (!res.ok) throw new Error(`vo-${id}: ${res.status} ${await res.text()}`);
  const { audio_base64, alignment, normalized_alignment } = await res.json();
  const file = `${root}public/vo/vo-${id}.mp3`;
  writeFileSync(file, Buffer.from(audio_base64, "base64"));
  const dur = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString());
  const al = alignment ?? normalized_alignment;
  const said = al.characters.join("");
  let from = 0;
  const beats = marks.map(({ word }) => {
    const i = said.indexOf(word.slice(0, 5), from);
    if (i < 0) return null;
    from = i + 1;
    return Math.round(al.character_start_times_seconds[i] * 100) / 100;
  });
  out[id] = { dur, beats, say };
  console.log(id, dur.toFixed(1), beats.join(" "));
}
writeFileSync(root + "src/vo.json", JSON.stringify(out, null, 2) + "\n");
