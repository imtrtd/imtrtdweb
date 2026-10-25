// Time helpers: everything user-facing is in the configured zone (Europe/Kiev).

export interface LocalParts { y: number; mo: number; d: number; h: number; mi: number; wd: number }

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function partsFmt(tz: string): Intl.DateTimeFormat {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", weekday: "short",
    });
    fmtCache.set(tz, f);
  }
  return f;
}

const WD: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function localParts(ts: number, tz: string): LocalParts & { s: number } {
  const p: Record<string, string> = {};
  for (const x of partsFmt(tz).formatToParts(new Date(ts))) p[x.type] = x.value;
  return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute, s: +p.second, wd: WD[p.weekday] ?? 0 };
}

function offsetAt(ts: number, tz: string): number {
  const p = localParts(ts, tz);
  const asUtc = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s);
  return asUtc - Math.floor(ts / 1000) * 1000;
}

/** Convert a wall-clock time in tz to a UTC epoch (ms). */
export function zonedToUtc(y: number, mo: number, d: number, h: number, mi: number, tz: string): number {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  let ts = guess - offsetAt(guess, tz);
  const off2 = offsetAt(ts, tz);
  ts = guess - off2;
  return ts;
}

/** Parse "YYYY-MM-DD HH:MM" (or with "T") as wall-clock time in tz. Returns UTC ms or null. */
export function parseLocalDateTime(v: unknown, tz: string): number | null {
  const m = String(v ?? "").trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})/);
  if (!m) return null;
  const ts = zonedToUtc(+m[1], +m[2], +m[3], +m[4], +m[5], tz);
  return Number.isFinite(ts) ? ts : null;
}

/** Format a UTC ms timestamp as "YYYY-MM-DD HH:MM" in tz. */
export function fmtLocalIso(ts: number, tz: string): string {
  const p = localParts(ts, tz);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.y}-${pad(p.mo)}-${pad(p.d)} ${pad(p.h)}:${pad(p.mi)}`;
}

export function fmtDate(ts: number, tz: string, withYear = false): string {
  const p = localParts(ts, tz);
  const now = localParts(Date.now(), tz);
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${pad(p.d)}.${pad(p.mo)}${withYear || p.y !== now.y ? "." + p.y : ""}`;
  return `${date} ${pad(p.h)}:${pad(p.mi)}`;
}

const UNIT_MS: Array<[RegExp, number]> = [
  [/^(м|мин|минут[уы]?|minutes?|mins?|m)$/i, 60_000],
  [/^(ч|час|часа|часов|hours?|h)$/i, 3_600_000],
  [/^(д|дн|день|дня|дней|days?|d)$/i, 86_400_000],
  [/^(нед|неделю|недели|недель|weeks?|w)$/i, 7 * 86_400_000],
];

const WEEKDAYS: Array<[RegExp, number]> = [
  [/^(пн|понедельник)$/i, 1], [/^(вт|вторник)$/i, 2], [/^(ср|среду|среда)$/i, 3],
  [/^(чт|четверг)$/i, 4], [/^(пт|пятницу|пятница)$/i, 5], [/^(сб|субботу|суббота)$/i, 6],
  [/^(вс|воскресенье)$/i, 0],
];

export interface WhenResult { due: number | null; rest: string }

/**
 * Extract a due date/time from free Russian text.
 * Supports: "через 2 часа", "через 30 мин", "сегодня/завтра/послезавтра", "в пятницу",
 * "25.10", "25.10.2026", "2026-10-25", "18:30", "в 18:30". Date without time -> 09:00.
 */
export function parseWhen(input: string, tz: string, now = Date.now()): WhenResult {
  let text = ` ${input} `;
  const cut = (re: RegExp): RegExpMatchArray | null => {
    const m = text.match(re);
    if (m) text = text.replace(m[0], " ");
    return m;
  };

  // Relative: через N <unit>
  const relRe = /\s(?:через|in)\s+(\d{1,4})\s*([a-zа-яё]+)(?=[\s,.!?]|$)/i;
  const rel = text.match(relRe);
  if (rel) {
    const unit = UNIT_MS.find(([re]) => re.test(rel[2]));
    if (unit) {
      text = text.replace(rel[0], " ");
      return { due: now + Number(rel[1]) * unit[1], rest: tidy(text) };
    }
  }
  const relOne = cut(/\s(?:через)\s+(час|минуту|день|неделю)(?=[\s,.!?]|$)/i);
  if (relOne) {
    const unit = UNIT_MS.find(([re]) => re.test(relOne[1]));
    if (unit) return { due: now + unit[1], rest: tidy(text) };
  }

  const today = localParts(now, tz);
  let y = today.y, mo = today.mo, d = today.d;
  let hasDate = false;

  const iso = cut(/\s(\d{4})-(\d{2})-(\d{2})(?=[\sT,.]|$)/);
  const dm = iso ? null : cut(/\s(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?(?=[\s,]|$)/);
  if (iso) { y = +iso[1]; mo = +iso[2]; d = +iso[3]; hasDate = true; }
  else if (dm) {
    d = +dm[1]; mo = +dm[2];
    if (dm[3]) y = dm[3].length === 2 ? 2000 + +dm[3] : +dm[3];
    else if (Date.UTC(y, mo - 1, d) < Date.UTC(today.y, today.mo - 1, today.d)) y += 1;
    hasDate = true;
  } else {
    const word = cut(/\s(сегодня|завтра|послезавтра|today|tomorrow)(?=[\s,.!?]|$)/i);
    if (word) {
      const add = /после/i.test(word[1]) ? 2 : /завтра|tomorrow/i.test(word[1]) ? 1 : 0;
      const t = new Date(Date.UTC(y, mo - 1, d + add));
      y = t.getUTCFullYear(); mo = t.getUTCMonth() + 1; d = t.getUTCDate(); hasDate = true;
    } else {
      const wdm = text.match(/\s(?:в|во)\s+([а-яё]+)(?=[\s,.!?]|$)/i);
      const wd = wdm ? WEEKDAYS.find(([re]) => re.test(wdm[1])) : undefined;
      if (wdm && wd) {
        text = text.replace(wdm[0], " ");
        let add = (wd[1] - today.wd + 7) % 7;
        if (add === 0) add = 7;
        const t = new Date(Date.UTC(y, mo - 1, d + add));
        y = t.getUTCFullYear(); mo = t.getUTCMonth() + 1; d = t.getUTCDate(); hasDate = true;
      }
    }
  }

  const tm = cut(/\s(?:в\s+|at\s+|T)?([01]?\d|2[0-3])[:.]([0-5]\d)(?=[\s,.!?]|$)/i);
  let h = 9, mi = 0;
  if (tm) { h = +tm[1]; mi = +tm[2]; }
  if (!hasDate && !tm) return { due: null, rest: input.trim() };
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return { due: null, rest: input.trim() };
  let due = zonedToUtc(y, mo, d, h, mi, tz);
  if (!hasDate && due <= now) {
    const t = new Date(Date.UTC(y, mo - 1, d + 1));
    due = zonedToUtc(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate(), h, mi, tz);
  }
  return { due, rest: tidy(text) };
}

function tidy(s: string): string {
  return s.replace(/\s{2,}/g, " ").replace(/\s+([,.!?])/g, "$1").trim().replace(/^[,.\-–—:]+\s*|\s*[,\-–—:]+$/g, "").trim();
}

/** Parse a moderation duration like "30m", "2ч", "1d". Returns seconds or null. */
export function parseDuration(s: string | undefined): number | null {
  if (!s) return null;
  const m = s.match(/^(\d{1,4})\s*(m|мин|м|h|ч|d|д|w|н)?$/i);
  if (!m) return null;
  const n = Number(m[1]);
  const u = (m[2] || "m").toLowerCase();
  const mult = /^(h|ч)$/.test(u) ? 3600 : /^(d|д)$/.test(u) ? 86400 : /^(w|н)$/.test(u) ? 604800 : 60;
  return n * mult;
}

export function humanDuration(sec: number): string {
  if (sec % 604800 === 0) return `${sec / 604800} нед.`;
  if (sec % 86400 === 0) return `${sec / 86400} дн.`;
  if (sec % 3600 === 0) return `${sec / 3600} ч.`;
  return `${Math.round(sec / 60)} мин.`;
}
