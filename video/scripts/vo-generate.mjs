// Voiceover in the owner's cloned voice: ELEVENLABS_API_KEY=… node scripts/vo-generate.mjs ./ [01,02,…]
// Reads voiceover.md, keeps the emotion tags, turns {n} markers into beat times from ElevenLabs' character
// timestamps (TEXT_ONLY=1 refreshes only the subtitle pieces), and writes public/vo/vo-XX.mp3 plus src/vo.json: { "05": { "dur": 7.9, "beats": [1.2, 2.8, 4.6] } }.
// TAKES=0,0,0.3 makes one take per listed stability (and per voice in VOICE_ID=a,b) into public/vo/takes/vo-XX-tN.mp3 and src/vo-takes.json
// instead (eleven_v3 differs from take to take); scripts/vo-pick.py then keeps the liveliest correct take.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const root = process.argv[2] ?? "./";
const voices = (process.env.VOICE_ID ?? "0MYarTVVCNzVkLKyDiWU").split(","); // with TAKES, several voices can be compared
const takes = process.env.TAKES?.split(",").map(Number);
const stabilities = takes ?? [Number(process.env.STABILITY ?? 0.5)]; // 0 creative … 1 robust
const only = process.argv[3]?.split(",");
const lines = [...readFileSync(root + "voiceover.md", "utf8").matchAll(/^\| vo-(\d\d) \| [^|]+ \| (.+) \|$/gm)].map((m) => [m[1], m[2].trim()]);
const jsonFile = root + (takes ? "src/vo-takes.json" : "src/vo.json");
let out = {};
try { out = JSON.parse(readFileSync(jsonFile, "utf8")); } catch {}
if (takes) mkdirSync(root + "public/vo/takes", { recursive: true });

for (const [id, raw] of lines) {
  if (only && !only.includes(id)) continue;
  // remember which word each {n} sits on, then send the text without markers
  const marks = [...raw.matchAll(/\{(\d+)\}\s*([^\s{[]+)/g)].map((m) => ({ n: Number(m[1]), word: m[2].replace(/[«».,!?—:…]/g, "") }));
  const text = raw.replace(/\{\d+\}/g, "");
  // subtitle pieces: what is said from one beat to the next, without the emotion tags
  const say = raw.split(/\{\d+\}/).map((s) => s.replace(/\[[^\]]*\]\s*/g, "").trim()).filter(Boolean);
  if (process.env.TEXT_ONLY) { out[id] = { ...out[id], say }; continue; }
  const results = [];
  const runs = takes ? voices.flatMap((voice) => stabilities.map((stability) => ({ voice, stability }))) : [{ voice: voices[0], stability: stabilities[0] }];
  for (const [k, { voice, stability }] of runs.entries()) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}/with-timestamps?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "content-type": "application/json", "xi-api-key": process.env.ELEVENLABS_API_KEY },
      body: JSON.stringify({ text, model_id: "eleven_v3", language_code: "kk", voice_settings: { stability, similarity_boost: 0.9 } }),
    });
    if (!res.ok) throw new Error(`vo-${id}: ${res.status} ${await res.text()}`);
    const { audio_base64, alignment, normalized_alignment } = await res.json();
    const file = takes ? `${root}public/vo/takes/vo-${id}-t${k + 1}.mp3` : `${root}public/vo/vo-${id}.mp3`;
    writeFileSync(file, Buffer.from(audio_base64, "base64"));
    const dur = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString());
    const al = alignment ?? normalized_alignment;
    const said = al.characters.join("");
    let from = 0;
    const beats = marks.map(({ word }) => {
      // the whole word first (so «Әдебиетті» does not land on an earlier «Әдебиет»), then its start
      let i = said.indexOf(word, from);
      if (i < 0) i = said.indexOf(word.slice(0, 5), from);
      if (i < 0) return null;
      from = i + 1;
      return Math.round(al.character_start_times_seconds[i] * 100) / 100;
    });
    results.push({ take: k + 1, voice, stability, file: file.slice(root.length), dur, beats, say });
    console.log(id, takes ? `t${k + 1}` : "", dur.toFixed(1), beats.join(" "));
  }
  out[id] = takes ? results : { dur: results[0].dur, beats: results[0].beats, say };
}
writeFileSync(jsonFile, JSON.stringify(out, null, 2) + "\n");
