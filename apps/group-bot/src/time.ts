/** Offset (ms) of a time zone at a given UTC instant: local = utc + offset. */
function tzOffset(utcMs: number, tz: string): number {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const p: Record<string, number> = {};
  for (const x of f.formatToParts(new Date(utcMs))) if (x.type !== "literal") p[x.type] = Number(x.value);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second) - Math.floor(utcMs / 1000) * 1000;
}

/** Local wall time in tz -> UTC ms. */
export function zonedToUtc(y: number, mo: number, d: number, h: number, mi: number, tz: string): number {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  let t = guess - tzOffset(guess, tz);
  t = guess - tzOffset(t, tz);
  return t;
}

export function localParts(utcMs: number, tz: string) {
  const local = new Date(utcMs + tzOffset(utcMs, tz));
  return { y: local.getUTCFullYear(), mo: local.getUTCMonth() + 1, d: local.getUTCDate(), h: local.getUTCHours(), mi: local.getUTCMinutes() };
}

export function fmtLocal(utcMs: number, tz: string): string {
  const p = localParts(utcMs, tz);
  const t = localParts(Date.now(), tz);
  const pad = (n: number) => String(n).padStart(2, "0");
  const hm = `${pad(p.h)}:${pad(p.mi)}`;
  if (p.y === t.y && p.mo === t.mo && p.d === t.d) return `сегодня ${hm}`;
  return `${pad(p.d)}.${pad(p.mo)} ${hm}`;
}

const UNIT: Record<string, number> = { м: 60_000, мин: 60_000, минут: 60_000, минуту: 60_000, минуты: 60_000, m: 60_000, min: 60_000,
  ч: 3600_000, час: 3600_000, часа: 3600_000, часов: 3600_000, h: 3600_000, д: 86400_000, день: 86400_000, дня: 86400_000, дней: 86400_000, d: 86400_000 };

/**
 * Parse the time part of /remind. Supports:
 *  "18:30 текст", "завтра 9:00 текст", "31.10 18:30 текст", "через 15 мин текст", "через 2 ч текст", "через час текст".
 */
export function parseRemind(input: string, tz: string, now = Date.now()): { at: number; text: string } | null {
  const s = input.trim();
  let m = s.match(/^через\s+(\d+)?\s*([a-zа-яё]+)\.?\s+([\s\S]+)$/i);
  if (m) {
    const n = m[1] ? Number(m[1]) : 1;
    const u = UNIT[m[2].toLowerCase()];
    if (!u || n <= 0 || n > 366 * 24 * 60) return null;
    return { at: now + n * u, text: m[3].trim() };
  }
  m = s.match(/^(?:(завтра)\s+|(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?\s+)?(\d{1,2})[:.](\d{2})\s+([\s\S]+)$/i);
  if (!m) return null;
  const h = Number(m[5]), mi = Number(m[6]);
  if (h > 23 || mi > 59) return null;
  const t = localParts(now, tz);
  let at: number;
  if (m[2]) {
    let y = m[4] ? Number(m[4]) : t.y;
    if (y < 100) y += 2000;
    at = zonedToUtc(y, Number(m[3]), Number(m[2]), h, mi, tz);
    if (!m[4] && at <= now) at = zonedToUtc(y + 1, Number(m[3]), Number(m[2]), h, mi, tz);
  } else {
    const day = m[1] ? localParts(now + 86400_000, tz) : t;
    at = zonedToUtc(day.y, day.mo, day.d, h, mi, tz);
    if (!m[1] && at <= now) {
      const nx = localParts(now + 86400_000, tz);
      at = zonedToUtc(nx.y, nx.mo, nx.d, h, mi, tz);
    }
  }
  if (!(at > now)) return null;
  return { at, text: m[7].trim() };
}
