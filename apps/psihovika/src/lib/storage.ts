import type { Depth } from "@/lib/depth";

export type Hist = { id: string; at: number; answers: number[]; depth?: Depth };

const DEPTHS: Depth[] = ["touch", "work", "deep"];

export type Saved = { fav: string[]; history: Hist[] };

const KEY = "seans.v1";
const EMPTY: Saved = { fav: [], history: [] };

function read(): Saved {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const p = JSON.parse(raw) as Partial<Saved>;
    const fav = Array.isArray(p.fav) ? p.fav.filter((x) => typeof x === "string") : [];
    const history = Array.isArray(p.history)
      ? p.history
          .filter(
            (h): h is Hist =>
              Boolean(h) &&
              typeof h.id === "string" &&
              typeof h.at === "number" &&
              Array.isArray(h.answers) &&
              h.answers.every((n) => typeof n === "number"),
          )
          .map((h) => ({
            ...h,
            depth: DEPTHS.includes(h.depth as Depth) ? (h.depth as Depth) : undefined,
          }))
          .slice(0, 40)
      : [];
    return { fav, history };
  } catch {
    return EMPTY;
  }
}

let mem: Saved = EMPTY;
let booted = false;
const listeners = new Set<() => void>();

function boot() {
  if (booted || typeof window === "undefined") return;
  mem = read();
  booted = true;
}

function persist() {
  localStorage.setItem(KEY, JSON.stringify(mem));
  listeners.forEach((l) => l());
}

export function subscribe(l: () => void) {
  boot();
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getSnapshot() {
  boot();
  return mem;
}

export function getServerSnapshot() {
  return EMPTY;
}

export function toggleFav(id: string) {
  boot();
  const fav = mem.fav.includes(id) ? mem.fav.filter((x) => x !== id) : [...mem.fav, id];
  mem = { ...mem, fav };
  persist();
}

export function pushHistory(entry: Hist) {
  boot();
  const history = [entry, ...mem.history].slice(0, 40);
  mem = { ...mem, history };
  persist();
}

export function removeHistory(at: number) {
  boot();
  mem = { ...mem, history: mem.history.filter((h) => h.at !== at) };
  persist();
}

export function clearHistory() {
  boot();
  mem = { ...mem, history: [] };
  persist();
}

export function latestFor(id: string) {
  return getSnapshot().history.find((h) => h.id === id);
}

const VIEW = "seans-view";
let lastTaken: { entry: Hist; at: number } | null = null;

export function stageView(entry: Hist) {
  lastTaken = { entry, at: Date.now() };
  sessionStorage.setItem(VIEW, JSON.stringify(entry));
}

export function takeView(id: string): Hist | null {
  if (lastTaken && lastTaken.entry.id === id && Date.now() - lastTaken.at < 1500) {
    return lastTaken.entry;
  }
  lastTaken = null;
  const raw = sessionStorage.getItem(VIEW);
  if (!raw) return null;
  sessionStorage.removeItem(VIEW);
  try {
    const entry = JSON.parse(raw) as Hist;
    if (entry.id !== id || !Array.isArray(entry.answers)) return null;
    lastTaken = { entry, at: Date.now() };
    return entry;
  } catch {
    return null;
  }
}

export function draftKey(id: string, depth: Depth = "work") {
  return `seans-draft:${id}:${depth}`;
}
