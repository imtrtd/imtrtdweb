import { CATEGORY_ORDER, SCHOOL_ORDER, SCALES, minutesOf, type Test } from "@/data/build";
import { scoreTest } from "@/lib/scoring";
import { partAnalysis } from "@/data/part-analysis";
import { partClinical } from "@/data/part-clinical";
import { partDepth } from "@/data/part-depth";
import { partLife } from "@/data/part-life";

export const TESTS: Test[] = [...partAnalysis, ...partDepth, ...partClinical, ...partLife];

export type HomeSearch = {
  q: string;
  cat: string;
  school: string;
  dur: string;
  sort: string;
  only: string;
};

export const DEFAULT_SEARCH: HomeSearch = {
  q: "",
  cat: "all",
  school: "all",
  dur: "all",
  sort: "marked",
  only: "all",
};

function boundsOf(test: Test, item: Test["items"][number]) {
  if (item.opts?.length) {
    const vs = item.opts.map((o) => o.v);
    return [Math.min(...vs), Math.max(...vs)] as const;
  }
  const scale = SCALES[test.scale];
  return [scale.min, scale.max] as const;
}

function assertCatalog(tests: Test[]) {
  const errors: string[] = [];
  const ids = new Set<string>();
  const cats = new Set<string>(CATEGORY_ORDER);
  const schools = new Set<string>(SCHOOL_ORDER);
  if (tests.length < 100) errors.push(`count ${tests.length}`);
  for (const t of tests) {
    if (ids.has(t.id)) errors.push(`dup ${t.id}`);
    ids.add(t.id);
    if (!cats.has(t.category)) errors.push(`cat ${t.id}`);
    if (!schools.has(t.school)) errors.push(`school ${t.id} ${t.school}`);
    if (t.items.length < 4) errors.push(`short ${t.id}`);
    const seen = new Set<string>();
    const dimIds = new Set((t.dims ?? []).map((d) => d.id));
    for (const item of t.items) {
      if (!item.text || item.text.trim().length < 8) errors.push(`item ${t.id}`);
      if (seen.has(item.text)) errors.push(`dup item ${t.id}`);
      seen.add(item.text);
      if (item.dim && !dimIds.has(item.dim)) errors.push(`dim ${t.id}.${item.dim}`);
      if ((t.shape === "profile" || t.dims) && !item.dim) errors.push(`undim ${t.id}`);
    }
    if (t.shape === "index" && !t.read && !t.rawBands) errors.push(`noread ${t.id}`);
    if (t.shape === "profile") {
      if (!t.dims?.length) errors.push(`nodims ${t.id}`);
      for (const d of t.dims ?? []) {
        if (!d.low || !d.mid || !d.high) errors.push(`dimtext ${t.id}.${d.id}`);
        const n = t.items.filter((i) => i.dim === d.id).length;
        if (n < 3) errors.push(`dimn ${t.id}.${d.id} ${n}`);
      }
    }
    if (t.shape === "clinical" && !t.rawBands && !t.dimRaw) errors.push(`nobands ${t.id}`);
    for (const key of Object.keys(t.dimRaw ?? {})) {
      if (!dimIds.has(key)) errors.push(`rawdim ${t.id}.${key}`);
    }
    const lo = t.items.map((item) => boundsOf(t, item)[0]);
    const hi = t.items.map((item) => boundsOf(t, item)[1]);
    try {
      const a = scoreTest(t, lo);
      const b = scoreTest(t, hi);
      if (t.rawBands && !a.total) errors.push(`total ${t.id}`);
      if (t.shape === "index" && !b.total) errors.push(`index ${t.id}`);
      if (t.dims && a.dims.length !== t.dims.length) errors.push(`dscore ${t.id}`);
    } catch (error) {
      errors.push(`score ${t.id} ${error instanceof Error ? error.message : "err"}`);
    }
  }
  if (errors.length) throw new Error(`Каталог методик:\n${errors.slice(0, 40).join("\n")}`);
}

assertCatalog(TESTS);

const byId = new Map(TESTS.map((t) => [t.id, t]));

export function getTest(id: string) {
  return byId.get(id);
}

export function minutesOfTest(test: Test) {
  return minutesOf(test.items.length);
}

export function filterTests(tests: Test[], s: HomeSearch, fav: string[]) {
  const q = s.q.trim().toLowerCase();
  return tests.filter((t) => {
    if (s.cat !== "all" && t.category !== s.cat) return false;
    if (s.school !== "all" && t.school !== s.school) return false;
    const m = minutesOfTest(t);
    if (s.dur === "short" && m > 8) return false;
    if (s.dur === "mid" && (m < 9 || m > 15)) return false;
    if (s.dur === "long" && m < 16) return false;
    if (s.only === "focus" && !t.focus) return false;
    if (s.only === "gold" && !t.gold) return false;
    if (s.only === "saved" && !fav.includes(t.id)) return false;
    if (!q) return true;
    const blob = `${t.title} ${t.lead} ${t.category} ${t.school} ${t.source}`.toLowerCase();
    return blob.includes(q);
  });
}

export function sortTests(list: Test[], sort: string) {
  const rank = (school: string) => {
    const i = SCHOOL_ORDER.indexOf(school as (typeof SCHOOL_ORDER)[number]);
    return i < 0 ? 99 : i;
  };
  return [...list].sort((a, b) => {
    if (sort === "az") return a.title.localeCompare(b.title, "ru");
    if (sort === "short") return minutesOfTest(a) - minutesOfTest(b) || a.title.localeCompare(b.title, "ru");
    if (sort === "long") return minutesOfTest(b) - minutesOfTest(a) || a.title.localeCompare(b.title, "ru");
    if (sort === "school") return rank(a.school) - rank(b.school) || b.weight - a.weight;
    return b.weight - a.weight || a.title.localeCompare(b.title, "ru");
  });
}

export function relatedTests(test: Test, n = 3) {
  return TESTS.filter((t) => t.id !== test.id && (t.category === test.category || t.school === test.school))
    .sort((a, b) => Number(b.category === test.category) - Number(a.category === test.category) || b.weight - a.weight)
    .slice(0, n);
}

export const PATHS = [
  {
    id: "att-profile",
    kicker: "Отношения",
    title: "Как вы держитесь за другого",
    text: "Четыре стиля привязанности. Ведущий полюс не паспорт.",
  },
  {
    id: "def-immature",
    kicker: "Защиты",
    title: "Что включается вместо чувства",
    text: "Отрицание, отыгрывание, обесценивание. По Вайланту, учебные пункты.",
  },
  {
    id: "phq9",
    kicker: "Клиника",
    title: "Настроение за две недели",
    text: "PHQ-9. Публичная шкала, которой пользуются врачи.",
  },
  {
    id: "ipip-50",
    kicker: "Черты",
    title: "Пять черт без типа",
    text: "Маркеры Голдберга, общественное достояние. Около двадцати минут.",
  },
] as const;
