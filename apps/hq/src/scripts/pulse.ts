/* /apps/pulse — PULSEBOX: 4 NES-style channels (2 pulse, triangle, noise), 16 steps × 4 bars.
   Melodic steps hold a MIDI note, the noise channel 1 kick / 2 snare / 3 hat; 0 = empty.
   Web Audio with a look-ahead scheduler; the song is saved to localStorage on every change. */
import { download, store, toast } from "./apps-common";

type Song = {
  name: string;
  bpm: number;
  duty: [number, number];
  level: [number, number, number, number]; // 1 hi, 0.45 lo
  mute: [boolean, boolean, boolean, boolean];
  bars: number[][][]; // [bar][channel][step]
};

const KEY = "imtrtd-pulse";
const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const noteName = (m: number) => `${NAMES[m % 12]}${Math.floor(m / 12) - 1}`;
const DRUMS = ["", "Бочка", "Малый", "Хэт"];
const DRUM_SHORT = ["", "K", "S", "H"];

/* ---------- songs (original) ---------- */
function parse(line: string): number[] {
  return line
    .trim()
    .split(/\s+/)
    .map((t) => {
      if (t === "-") return 0;
      if (t === "k") return 1;
      if (t === "s") return 2;
      if (t === "h") return 3;
      const m = /^([A-G]#?)(\d)$/.exec(t);
      if (!m) return 0;
      return NAMES.indexOf(m[1]) + (Number(m[2]) + 1) * 12;
    });
}
const bar = (a: string, b: string, c: string, d: string) => [parse(a), parse(b), parse(c), parse(d)];
const empty = () => [0, 1, 2, 3].map(() => [0, 1, 2, 3].map(() => Array(16).fill(0)));

const SONGS: Record<string, () => Song> = {
  night: () => ({
    name: "Night Market",
    bpm: 116,
    duty: [0.5, 0.25],
    level: [1, 1, 1, 1],
    mute: [false, false, false, false],
    bars: [
      bar("A4 - C5 - E5 - D5 C5 - - A4 - G4 - A4 -", "E4 - - - E4 - - - A4 - - - E4 - - -", "A2 - A2 - A3 - A2 - A2 - A2 - G2 - G2 -", "k - h - s - h - k k h - s - h h"),
      bar("A4 - C5 - E5 - G5 - F5 E5 - D5 - - C5 -", "E4 - - - G4 - - - C5 - - - A4 - - -", "F2 - F2 - F3 - F2 - G2 - G2 - G3 - G2 -", "k - h - s - h - k k h - s - h h"),
      bar("F4 - A4 - C5 - B4 A4 - - G4 - E4 - G4 -", "C4 - - - F4 - - - E4 - - - D4 - - -", "F2 - F2 - C3 - F2 - E2 - E2 - E3 - E2 -", "k - h - s - h - k k h - s - h h"),
      bar("A4 - - - E5 - D5 - C5 - B4 - A4 - - -", "E4 - - - C4 - - - E4 - - - E4 - - -", "A2 - A2 - E3 - A2 - A2 - - - A2 - E2 -", "k - h - s - h - k - s - s s s s"),
    ],
  }),
  boss: () => ({
    name: "Boss Door",
    bpm: 148,
    duty: [0.125, 0.5],
    level: [1, 0.45, 1, 1],
    mute: [false, false, false, false],
    bars: [
      bar("E5 - E5 - D#5 - E5 - G5 - - - F#5 - E5 -", "- - B4 - - - B4 - - - B4 - - - B4 -", "E2 E2 E3 E2 E2 E2 E3 E2 E2 E2 E3 E2 E2 E2 E3 E2", "k h s h k k s h k h s h k k s h"),
      bar("B4 - B4 - A#4 - B4 - D5 - - - C5 - B4 -", "- - F#4 - - - F#4 - - - F#4 - - - F#4 -", "B1 B1 B2 B1 B1 B1 B2 B1 B1 B1 B2 B1 B1 B1 B2 B1", "k h s h k k s h k h s h k k s h"),
      bar("E5 - G5 - B5 - G5 - F#5 - D5 - B4 - - -", "- - G4 - - - G4 - - - A4 - - - A4 -", "C2 C2 C3 C2 C2 C2 C3 C2 D2 D2 D3 D2 D2 D2 D3 D2", "k h s h k k s h k h s h k k s s"),
      bar("E5 - - - D#5 - - - E5 - - - - - - -", "- - B4 - - - B4 - B4 - B4 - B4 - B4 -", "E2 E2 E3 E2 E2 E2 E3 E2 E2 - E2 - E2 - E2 -", "k - s - k - s - k k s - s s s s"),
    ],
  }),
  river: () => ({
    name: "River",
    bpm: 92,
    duty: [0.25, 0.125],
    level: [1, 0.45, 1, 0.45],
    mute: [false, false, false, false],
    bars: [
      bar("F#5 - - - E5 - D5 - - - A4 - - - - -", "D4 - F#4 - A4 - F#4 - D4 - F#4 - A4 - F#4 -", "D2 - - - - - - - A2 - - - - - - -", "k - - - h - - - s - - - h - - h"),
      bar("G5 - - - F#5 - E5 - - - B4 - - - - -", "E4 - G4 - B4 - G4 - E4 - G4 - B4 - G4 -", "E2 - - - - - - - B2 - - - - - - -", "k - - - h - - - s - - - h - - h"),
      bar("A5 - - - G5 - F#5 - E5 - D5 - E5 - - -", "F#4 - A4 - C#5 - A4 - E4 - G4 - B4 - G4 -", "F#2 - - - - - - - A2 - - - - - - -", "k - - - h - - - s - - - h - h h"),
      bar("F#5 - - - - - - - D5 - - - - - - -", "D4 - F#4 - A4 - F#4 - D4 - F#4 - A4 - - -", "D2 - - - - - - - D2 - - - - - - -", "k - - - h - - - s - - - - - - -"),
    ],
  }),
  blank: () => ({ name: "Пустой лист", bpm: 120, duty: [0.5, 0.25], level: [1, 1, 1, 1], mute: [false, false, false, false], bars: empty() }),
};

function valid(s: unknown): s is Song {
  const x = s as Song;
  return !!x && Array.isArray(x.bars) && x.bars.length === 4 && x.bars.every((b) => Array.isArray(b) && b.length === 4 && b.every((c) => Array.isArray(c) && c.length === 16)) && typeof x.bpm === "number";
}
let song: Song = (() => {
  const saved = store.get<{ key: string; song: Song } | null>(KEY, null);
  return saved && valid(saved.song) ? saved.song : SONGS.night();
})();
let songKey = store.get<{ key: string } | null>(KEY, null)?.key ?? "night";
const save = () => store.set(KEY, { key: songKey, song });

/* ---------- audio ---------- */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
const waves = new Map<number, PeriodicWave>();
const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
if (!AC) document.querySelector<HTMLElement>("[data-pb-noaudio]")!.hidden = false;

function audio() {
  if (!AC) return null;
  if (!ctx) {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    let r = 1;
    for (let i = 0; i < d.length; i++) {
      // NES-style LFSR noise
      const bit = (r ^ (r >> 1)) & 1;
      r = (r >> 1) | (bit << 14);
      d[i] = r & 1 ? 1 : -1;
    }
  }
  void ctx.resume();
  return ctx;
}
function pulseWave(c: AudioContext, duty: number) {
  let w = waves.get(duty);
  if (w) return w;
  const n = 64;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  for (let k = 1; k < n; k++) real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
  w = c.createPeriodicWave(real, imag);
  waves.set(duty, w);
  return w;
}
const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const VOL = [0.16, 0.11, 0.24, 0.2];

function voice(ch: number, val: number, t: number, len: number) {
  const c = ctx!;
  const g = c.createGain();
  g.connect(master!);
  const v = VOL[ch] * song.level[ch];
  if (ch === 3) {
    const s = c.createBufferSource();
    s.buffer = noiseBuf;
    const f = c.createBiquadFilter();
    const dur = val === 1 ? 0.16 : val === 2 ? 0.14 : 0.05;
    f.type = val === 1 ? "lowpass" : val === 2 ? "bandpass" : "highpass";
    f.frequency.value = val === 1 ? 180 : val === 2 ? 1800 : 7000;
    s.connect(f);
    f.connect(g);
    g.gain.setValueAtTime(v * (val === 1 ? 2.6 : 1), t);
    g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
    if (val === 1) {
      const o = c.createOscillator();
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      const og = c.createGain();
      og.gain.setValueAtTime(v * 2.2, t);
      og.gain.exponentialRampToValueAtTime(1e-4, t + 0.14);
      o.connect(og);
      og.connect(master!);
      o.start(t);
      o.stop(t + 0.15);
    }
    s.start(t);
    s.stop(t + dur + 0.02);
    return;
  }
  const o = c.createOscillator();
  if (ch === 2) o.type = "triangle";
  else o.setPeriodicWave(pulseWave(c, song.duty[ch]));
  o.frequency.value = hz(val);
  o.connect(g);
  const end = t + len * 0.92;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(v, t + 0.004);
  g.gain.setValueAtTime(v, end - 0.02);
  g.gain.linearRampToValueAtTime(0, end);
  o.start(t);
  o.stop(end + 0.01);
}

/* note length: until the next filled step in the same channel (max 4 steps) */
function steps16(barIdx: number, ch: number, step: number) {
  const row = song.bars[barIdx][ch];
  let n = 1;
  while (n < 4 && step + n < 16 && row[step + n] === 0) n++;
  return n;
}

let playing = false;
let curBar = 0; // bar being edited / looped
let playBar = 0;
let playStep = 0;
let nextTime = 0;
let timer = 0;
let mode: "loop" | "song" = "loop";
const stepDur = () => 60 / song.bpm / 4;

function schedule() {
  const c = ctx!;
  while (nextTime < c.currentTime + 0.12) {
    const b = playBar;
    const s = playStep;
    for (let ch = 0; ch < 4; ch++) {
      const val = song.bars[b][ch][s];
      if (val && !song.mute[ch]) voice(ch, val, nextTime, ch === 3 ? stepDur() : steps16(b, ch, s) * stepDur());
    }
    const at = nextTime;
    window.setTimeout(() => showPlayhead(b, s), Math.max(0, (at - c.currentTime) * 1000));
    nextTime += stepDur();
    playStep++;
    if (playStep === 16) {
      playStep = 0;
      if (mode === "song") playBar = (playBar + 1) % 4;
      else playBar = curBar;
    }
  }
}
function start() {
  const c = audio();
  if (!c) return;
  playing = true;
  playBar = curBar;
  playStep = 0;
  nextTime = c.currentTime + 0.05;
  schedule();
  timer = window.setInterval(schedule, 25);
  playBtn.textContent = "■ Стоп";
  playBtn.setAttribute("aria-pressed", "true");
}
function stop() {
  playing = false;
  clearInterval(timer);
  playBtn.textContent = "▶ Играть";
  playBtn.setAttribute("aria-pressed", "false");
  document.querySelectorAll(".pb-steps .now").forEach((n) => n.classList.remove("now"));
  status();
}

/* ---------- UI ---------- */
const playBtn = document.querySelector<HTMLButtonElement>("[data-pb-play]")!;
const statusEl = document.querySelector<HTMLElement>("[data-pb-status]")!;
const bpmEl = document.querySelector<HTMLElement>("[data-pb-bpm]")!;
const songSel = document.querySelector<HTMLSelectElement>("[data-pb-song]")!;
const rowsSteps = [0, 1, 2, 3].map((ch) => document.querySelector<HTMLElement>(`[data-steps="${ch}"]`)!);
const pens = [0, 1, 2, 3].map((ch) => document.querySelector<HTMLSelectElement>(`[data-pen="${ch}"]`)!);

const RANGES = [
  [57, 88], // A3–E6
  [52, 81], // E3–A5
  [33, 60], // A1–C4
];
pens.forEach((sel, ch) => {
  if (ch === 3) sel.innerHTML = [1, 2, 3].map((d) => `<option value="${d}">${DRUMS[d]}</option>`).join("");
  else {
    const [lo, hi] = RANGES[ch];
    let html = "";
    for (let m = hi; m >= lo; m--) html += `<option value="${m}">${noteName(m)}</option>`;
    sel.innerHTML = html;
    sel.value = String(ch === 0 ? 69 : ch === 1 ? 64 : 45);
  }
});

rowsSteps.forEach((row, ch) => {
  row.innerHTML = Array.from({ length: 16 }, (_, i) => `<button type="button" data-step="${i}" aria-label="Шаг ${i + 1}"></button>`).join("");
  let paint: boolean | null = null;
  const apply = (btn: HTMLButtonElement) => {
    const i = Number(btn.dataset.step);
    const cur = song.bars[curBar][ch][i];
    const pen = Number(pens[ch].value);
    const next = paint ? pen : 0;
    if (cur === next) return;
    song.bars[curBar][ch][i] = next;
    if (next && ctx && !playing) voice(ch, next, ctx.currentTime, ch === 3 ? stepDur() : stepDur() * 2);
    paintCell(btn, ch, next);
    save();
    paintBars();
  };
  row.addEventListener("pointerdown", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-step]");
    if (!btn) return;
    e.preventDefault();
    audio();
    const cur = song.bars[curBar][ch][Number(btn.dataset.step)];
    paint = cur === 0 || cur !== Number(pens[ch].value);
    apply(btn);
    row.setPointerCapture?.(e.pointerId);
  });
  row.addEventListener("pointermove", (e) => {
    if (paint === null) return;
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const btn = el?.closest<HTMLButtonElement>("[data-step]");
    if (btn && row.contains(btn)) apply(btn);
  });
  const end = () => (paint = null);
  row.addEventListener("pointerup", end);
  row.addEventListener("pointercancel", end);
  row.addEventListener("keydown", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-step]");
    if (!btn || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault();
    e.stopPropagation();
    const cur = song.bars[curBar][ch][Number(btn.dataset.step)];
    paint = cur === 0;
    apply(btn);
    paint = null;
  });
});

function paintCell(btn: HTMLButtonElement, ch: number, val: number) {
  btn.classList.toggle("on", val > 0);
  const label = val ? (ch === 3 ? DRUM_SHORT[val] : noteName(val)) : "";
  btn.textContent = label;
  btn.setAttribute("aria-pressed", String(val > 0));
  btn.title = val ? (ch === 3 ? DRUMS[val] : noteName(val)) : "";
}
function paintGrid() {
  rowsSteps.forEach((row, ch) => row.querySelectorAll<HTMLButtonElement>("[data-step]").forEach((b, i) => paintCell(b, ch, song.bars[curBar][ch][i])));
  document.querySelectorAll<HTMLElement>("[data-ch]").forEach((r) => r.classList.toggle("muted", song.mute[Number(r.dataset.ch)]));
  document.querySelectorAll<HTMLButtonElement>("[data-duty]").forEach((b) => (b.textContent = `${song.duty[Number(b.dataset.duty)] * 100}%`));
  document.querySelectorAll<HTMLButtonElement>("[data-level]").forEach((b) => {
    const lo = song.level[Number(b.dataset.level)] < 1;
    b.textContent = lo ? "LO" : "HI";
    b.classList.toggle("lo", lo);
  });
  document.querySelectorAll<HTMLButtonElement>("[data-mute]").forEach((b) => b.setAttribute("aria-pressed", String(song.mute[Number(b.dataset.mute)])));
  bpmEl.textContent = String(song.bpm);
  paintBars();
  status();
}
function paintBars() {
  document.querySelectorAll<HTMLButtonElement>("[data-bar]").forEach((b) => {
    const i = Number(b.dataset.bar);
    b.setAttribute("aria-pressed", String(i === curBar));
    const has = song.bars[i].some((c) => c.some(Boolean));
    b.innerHTML = `Такт ${i + 1}${has ? '<span class="pb-bars-dot" aria-hidden="true">•</span>' : ""}`;
  });
}
function status(b = curBar) {
  statusEl.textContent = `${song.name.toUpperCase()} · BAR ${b + 1}/4 · ${mode === "loop" ? "LOOP" : "SONG"}`;
}
function showPlayhead(b: number, s: number) {
  if (!playing) return;
  if (mode === "song" && b !== curBar) {
    curBar = b;
    paintGrid();
  }
  status(b);
  rowsSteps.forEach((row) => row.querySelectorAll<HTMLButtonElement>("[data-step]").forEach((el, i) => el.classList.toggle("now", i === s)));
}

playBtn.addEventListener("click", () => (playing ? stop() : start()));
document.querySelectorAll<HTMLButtonElement>("[data-bar]").forEach((b) =>
  b.addEventListener("click", () => {
    curBar = Number(b.dataset.bar);
    if (playing && mode === "loop") playBar = curBar;
    paintGrid();
  }),
);
document.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((b) =>
  b.addEventListener("click", () => {
    mode = b.dataset.mode as "loop" | "song";
    document.querySelectorAll("[data-mode]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    status();
  }),
);
document.querySelectorAll<HTMLButtonElement>("[data-bpm]").forEach((b) =>
  b.addEventListener("click", () => {
    song.bpm = Math.max(60, Math.min(200, song.bpm + Number(b.dataset.bpm)));
    bpmEl.textContent = String(song.bpm);
    save();
  }),
);
document.querySelectorAll<HTMLButtonElement>("[data-duty]").forEach((b) =>
  b.addEventListener("click", () => {
    const ch = Number(b.dataset.duty) as 0 | 1;
    const order = [0.125, 0.25, 0.5];
    song.duty[ch] = order[(order.indexOf(song.duty[ch]) + 1) % order.length];
    save();
    paintGrid();
  }),
);
document.querySelectorAll<HTMLButtonElement>("[data-level]").forEach((b) =>
  b.addEventListener("click", () => {
    const ch = Number(b.dataset.level);
    song.level[ch] = song.level[ch] < 1 ? 1 : 0.45;
    save();
    paintGrid();
  }),
);
document.querySelectorAll<HTMLButtonElement>("[data-mute]").forEach((b) =>
  b.addEventListener("click", () => {
    const ch = Number(b.dataset.mute);
    song.mute[ch] = !song.mute[ch];
    save();
    paintGrid();
  }),
);
songSel.value = songKey in SONGS ? songKey : "night";
songSel.addEventListener("change", () => {
  const dirty = JSON.stringify(song) !== JSON.stringify(SONGS[songKey]?.());
  if (dirty && !confirm("Загрузить другую песню? Текущие изменения пропадут — сначала можно сделать экспорт.")) {
    songSel.value = songKey;
    return;
  }
  songKey = songSel.value;
  song = SONGS[songKey]();
  curBar = 0;
  save();
  paintGrid();
});
document.querySelector("[data-pb-copy]")!.addEventListener("click", () => {
  const to = (curBar + 1) % 4;
  song.bars[to] = song.bars[curBar].map((c) => [...c]);
  save();
  curBar = to;
  paintGrid();
  toast(`Скопировано в такт ${to + 1}`);
});
document.querySelector("[data-pb-clear]")!.addEventListener("click", () => {
  song.bars[curBar] = [0, 1, 2, 3].map(() => Array(16).fill(0));
  save();
  paintGrid();
});
document.querySelector("[data-pb-export]")!.addEventListener("click", () => download(`pulse-${song.name.toLowerCase().replace(/\s+/g, "-")}.json`, { app: "pulse-web", version: 1, song }));
const fileEl = document.querySelector<HTMLInputElement>("[data-pb-file]")!;
document.querySelector("[data-pb-import]")!.addEventListener("click", () => fileEl.click());
fileEl.addEventListener("change", async () => {
  const f = fileEl.files?.[0];
  fileEl.value = "";
  if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    const s = data?.song ?? data;
    if (!valid(s)) return toast("Это не файл Pulse");
    song = { ...SONGS.blank(), ...s, name: String(s.name || "Импорт").slice(0, 40) };
    songKey = "import";
    curBar = 0;
    save();
    paintGrid();
    toast("Песня загружена");
  } catch {
    toast("Не удалось прочитать файл");
  }
});

addEventListener("keydown", (e) => {
  const tag = (e.target as HTMLElement).tagName;
  if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" || (e.target as HTMLElement).closest("[data-step]")) return;
  if (e.code === "Space") {
    e.preventDefault();
    playBtn.click();
  } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
    curBar = (curBar + (e.key === "ArrowRight" ? 1 : 3)) % 4;
    if (playing && mode === "loop") playBar = curBar;
    paintGrid();
  }
});
document.addEventListener("visibilitychange", () => document.hidden && playing && stop());

paintGrid();
