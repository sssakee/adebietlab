"""Keeps the best take of each voiceover line: python3 scripts/vo-pick.py ./ REFERENCE_RECORDING
Reads src/vo-takes.json (from TAKES=… node scripts/vo-generate.mjs, each take with "heard" = speech-to-text),
scores every take and writes public/vo/vo-XX.mp3 (mastered) and src/vo.json.
  1. words: the take must say the script (word error rate from "heard"); the fewest errors win outright
  2. life: pitch movement and loudness contrast (a flat read moves the pitch little)
  3. likeness: timbre (MFCC average) close to the owner's own recording
Mastering: rumble cut, less mud, more presence (the clone sounds blurry), gentle compression, −16 LUFS."""
import json, os, re, subprocess, sys, numpy as np

root, ref = sys.argv[1], sys.argv[2]
SR = 16000
TEMPO = float(os.environ.get("TEMPO", 1.08))  # a lively read, still natural
PAUSE = 0.32  # longest pause kept, seconds

def load(f):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", f, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)

def pitch(x, hop=160, win=640, fmin=70, fmax=400):
    out = []
    tmin, tmax = SR // fmax, SR // fmin
    for s in range(0, len(x) - win, hop):
        fr = x[s:s + win] - x[s:s + win].mean()
        if np.sqrt((fr ** 2).mean()) < 0.01: continue
        d = np.array([((fr[:win - t] - fr[t:]) ** 2).sum() for t in range(1, tmax)])
        cm = d / (np.cumsum(d) / np.arange(1, len(d) + 1) + 1e-9)
        c = np.where(cm[tmin:] < 0.15)[0]
        if len(c): out.append(SR / (c[0] + tmin + 1))
    v = np.array(out)
    st = 12 * np.log2(v / np.median(v))
    return st.std(), np.percentile(st, 95) - np.percentile(st, 5)

def mfcc_mean(x, n=13):
    fr = x[: len(x) // 160 * 160]
    frames = np.lib.stride_tricks.sliding_window_view(fr, 400)[::160] * np.hamming(400)
    pw = np.abs(np.fft.rfft(frames, 512)) ** 2
    keep = pw.sum(1) > np.percentile(pw.sum(1), 40)  # speech frames only
    mel = lambda f: 2595 * np.log10(1 + f / 700)
    pts = 700 * (10 ** (np.linspace(mel(60), mel(7600), 28) / 2595) - 1)
    bins = np.floor(513 * pts / SR).astype(int)
    fb = np.zeros((26, 257))
    for i in range(26):
        a, b, c = bins[i], bins[i + 1], bins[i + 2]
        fb[i, a:b] = (np.arange(a, b) - a) / max(1, b - a)
        fb[i, b:c] = (c - np.arange(b, c)) / max(1, c - b)
    lm = np.log(pw[keep] @ fb.T + 1e-10)
    dct = np.cos(np.pi / 26 * (np.arange(26) + 0.5)[None, :] * np.arange(n)[:, None])
    return (lm @ dct.T)[:, 1:].mean(0)

SAME = {"30-дан": "отыздан", "11": "он бір", "12": "он екі", "pin": "пин", "lab": "лаб", "әдебиетlab": "әдебиет лаб"}

def words(s):
    s = re.sub(r"\[[^\]]*\]", " ", s.lower())
    s = " ".join(SAME.get(w, w) for w in s.replace("«", " ").replace("»", " ").split())
    return re.sub(r"[^\w\s-]", " ", s).replace("-", " ").split()

def wer(a, b):
    d = np.arange(len(b) + 1)
    for i, w in enumerate(a, 1):
        prev, d[0] = d.copy(), i
        for j, v in enumerate(b, 1): d[j] = min(prev[j] + 1, d[j - 1] + 1, prev[j - 1] + (w != v))
    return d[-1] / max(1, len(a))

script = dict(re.findall(r"^\| vo-(\d\d) \| [^|]+ \| (.+) \|$", open(root + "voiceover.md").read(), re.M))
takes = json.load(open(root + os.environ.get("TAKES_JSON", "src/vo-takes.json")))
ref_t = mfcc_mean(load(ref)) if ref != "-" else None  # "-": no reference, likeness is not scored
PICK = dict(p.split(":") for p in os.environ.get("PICK", "").split(",") if p)  # "06:2,14:1" = take chosen by ear
final, scored = {}, {}
for id, ts in sorted(takes.items()):
    rows = []
    for t in ts:
        x = load(root + t["file"])
        sd, rng = pitch(x)
        e = 20 * np.log10(np.sqrt((x[: len(x) // 800 * 800].reshape(-1, 800) ** 2).mean(1)) + 1e-6)
        rows.append(dict(t=t, err=wer(words(re.sub(r"\{\d+\}", "", script[id])), words(t.get("heard", ""))) if t.get("heard") else 0.0,
                         life=sd + rng / 8 + e[e > -40].std() / 6, like=-np.linalg.norm(mfcc_mean(x) - ref_t) if ref_t is not None else 0.0, ok=None not in t["beats"]))
    scored[id] = rows
# one voice for the whole film: the one whose correct takes sound most like the owner
voices = {t["voice"] for ts in takes.values() for t in ts if "voice" in t}
if os.environ.get("VOICE"):  # a voice chosen by ear (or by the numbers below, printed for the record)
    voices = voices | {os.environ["VOICE"]}
if len(voices) > 1:
    like = {v: np.mean([r["like"] for rows in scored.values() for r in rows if r["t"].get("voice") == v and r["err"] < 0.2] or [-99]) for v in voices}
    print("likeness by voice:", {v: round(x, 2) for v, x in like.items()})
    keep = os.environ.get("VOICE") or max(like, key=like.get)
    scored = {id: [r for r in rows if r["t"].get("voice") == keep] for id, rows in scored.items()}
for id, rows in sorted(scored.items()):
    med = np.median([r["t"]["dur"] for r in rows])
    good = [r for r in rows if r["ok"] and r["t"]["dur"] < 1.4 * med] or rows
    best_err = min(r["err"] for r in good)
    good = [r for r in good if r["err"] <= best_err + 0.04]
    z = lambda k, r: (r[k] - np.mean([g[k] for g in good])) / (np.std([g[k] for g in good]) + 1e-6)
    pick = max(good, key=lambda r: z("life", r) + 0.8 * z("like", r))
    if id in PICK: pick = next(r for r in rows if str(r["t"]["take"]) == PICK[id])
    for r in rows: print(f"{id} t{r['t']['take']} s{r['t']['stability']} err {r['err']:.2f} life {r['life']:.2f} like {r['like']:.2f} {'<-' if r is pick else ''}")
    # tighten: trim the silence in front, shorten long pauses, then a touch faster (rubberband keeps the pitch)
    sr = 44100
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", root + pick["t"]["file"], "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).copy()
    hop = sr // 100
    env = 20 * np.log10(np.sqrt((x[: len(x) // hop * hop].reshape(-1, hop) ** 2).mean(1)) + 1e-7)
    loud = np.where(env > env.max() - 42)[0]
    start, stop = max(0, loud[0] - 8) * hop, min(len(x), (loud[-1] + 25) * hop)
    pieces, cuts, prev = [], [], start  # cuts: (original time, seconds removed so far)
    removed = 0.0
    quiet = env <= env.max() - 42
    i = loud[0]
    while i < loud[-1]:
        if quiet[i]:
            j = i
            while j < len(quiet) and quiet[j]: j += 1
            if (j - i) / 100 > PAUSE + 0.12:
                a, b2 = (i + int(PAUSE * 50)) * hop, (j - int(PAUSE * 50)) * hop
                pieces.append(x[prev:a]); removed += (b2 - a) / sr; cuts.append((b2 / sr, removed)); prev = b2
            i = j
        else: i += 1
    pieces.append(x[prev:stop])
    fade = int(0.012 * sr)
    for k in range(1, len(pieces)):  # short crossfades over every cut
        pieces[k][:fade] *= np.linspace(0, 1, fade); pieces[k - 1][-fade:] *= np.linspace(1, 0, fade)
    y = np.concatenate(pieces)
    def remap(t):  # a beat's time in the tightened clip
        if t is None: return None
        r = max([rm for (c, rm) in cuts if c <= t] or [0.0])
        return round(max(0.0, (t - start / sr - r) / TEMPO), 2)
    tmp = f"/tmp/vo-{id}.f32"
    y.astype(np.float32).tofile(tmp)
    out = f"{root}public/vo/vo-{id}.mp3"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(sr), "-ac", "1", "-i", tmp, "-af",
                    f"rubberband=tempo={TEMPO}:transients=smooth:detector=soft:window=standard,"
                    "highpass=f=75,equalizer=f=280:t=q:w=1.2:g=-2.5,equalizer=f=3600:t=q:w=1.4:g=3,equalizer=f=9000:t=h:w=0.7:g=1.5,"
                    "deesser=i=0.35,acompressor=threshold=-20dB:ratio=3:attack=6:release=90:makeup=2,loudnorm=I=-16:TP=-1.5:LRA=9,apad=pad_dur=0.2",
                    "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "256k", out], check=True)
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out], capture_output=True).stdout)
    final[id] = dict(dur=round(dur, 3), beats=[remap(b) for b in pick["t"]["beats"]], say=pick["t"]["say"], take=pick["t"]["take"], voice=pick["t"].get("voice"))
json.dump(final, open(root + "src/vo.json", "w"), ensure_ascii=False, indent=2)
print("wrote", len(final), "lines")
