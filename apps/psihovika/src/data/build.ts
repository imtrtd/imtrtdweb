export type ScaleId = "agree" | "freq" | "intensity" | "who" | "pcl";

export type Opt = { v: number; label: string };

export type Item = {
  text: string;
  rev?: boolean;
  dim?: string;
  crisis?: boolean;
  opts?: Opt[];
};

export type Band = { max: number; title: string; text: string; hot?: boolean };

export type Read = {
  low: string;
  mid: string;
  high: string;
  lowTitle?: string;
  midTitle?: string;
  highTitle?: string;
};

export type Dim = {
  id: string;
  title: string;
  low?: string;
  mid?: string;
  high?: string;
  lowTitle?: string;
  midTitle?: string;
  highTitle?: string;
};

export type Test = {
  id: string;
  title: string;
  lead: string;
  category: string;
  school: string;
  scale: ScaleId;
  shape: "index" | "profile" | "clinical";
  items: Item[];
  frame: string;
  source: string;
  focus: boolean;
  gold?: boolean;
  warn?: string;
  read?: Read;
  dims?: Dim[];
  rawBands?: Band[];
  dimRaw?: Record<string, Band[]>;
  dimMultiply?: number;
  totalMultiply?: number;
  weight: number;
  scoreName?: string;
};

export const FRAME =
  "Как это у вас устроено в последние месяцы. Не как хотелось бы выглядеть и не как в самый тяжёлый день, а как бывает чаще.";

export const SCALES: Record<ScaleId, { min: number; max: number; opts: Opt[] }> = {
  agree: {
    min: 1,
    max: 5,
    opts: [
      { v: 1, label: "Совсем не про меня" },
      { v: 2, label: "Скорее не про меня" },
      { v: 3, label: "Посередине" },
      { v: 4, label: "Скорее про меня" },
      { v: 5, label: "Точно про меня" },
    ],
  },
  freq: {
    min: 0,
    max: 3,
    opts: [
      { v: 0, label: "Ни разу" },
      { v: 1, label: "Несколько дней" },
      { v: 2, label: "Больше половины дней" },
      { v: 3, label: "Почти каждый день" },
    ],
  },
  intensity: {
    min: 0,
    max: 3,
    opts: [
      { v: 0, label: "Не было совсем" },
      { v: 1, label: "Иногда" },
      { v: 2, label: "Часто" },
      { v: 3, label: "Почти всё время" },
    ],
  },
  who: {
    min: 0,
    max: 5,
    opts: [
      { v: 5, label: "Всё время" },
      { v: 4, label: "Большую часть времени" },
      { v: 3, label: "Более половины времени" },
      { v: 2, label: "Менее половины времени" },
      { v: 1, label: "Время от времени" },
      { v: 0, label: "Никогда" },
    ],
  },
  pcl: {
    min: 0,
    max: 4,
    opts: [
      { v: 0, label: "Совсем нет" },
      { v: 1, label: "Слегка" },
      { v: 2, label: "Умеренно" },
      { v: 3, label: "Сильно" },
      { v: 4, label: "Крайне" },
    ],
  },
};

export const CATEGORY_ORDER = [
  "Защиты",
  "Структура личности",
  "Объектные отношения",
  "Юнг",
  "Эмоции",
  "Настроение",
  "Тревога",
  "Травма и тело",
  "Самооценка",
  "Черты",
  "Смысл",
  "Стресс и ресурс",
  "Импульс",
  "Близость",
  "Социальное",
  "Кабинет терапии",
  "Мышление",
] as const;

export const SCHOOL_ORDER = [
  "Психоанализ",
  "Юнгианский анализ",
  "Психотерапия",
  "Клинический скрининг",
  "Экзистенциальная",
  "КПТ и когнитивная",
  "Черты личности",
  "Отношения",
] as const;

const FOCUS = new Set(["Психоанализ", "Юнгианский анализ", "Психотерапия"]);

function defaultWeight(school: string, gold?: boolean) {
  if (gold) return 90;
  if (school === "Психоанализ") return 84;
  if (school === "Юнгианский анализ") return 78;
  if (school === "Психотерапия") return 74;
  if (school === "Экзистенциальная") return 68;
  return 46;
}

export type Spec = {
  id: string;
  title: string;
  lead: string;
  category: string;
  school: string;
  source: string;
  lines?: string[];
  items?: Item[];
  read?: Read;
  dims?: Dim[];
  shape?: Test["shape"];
  scale?: ScaleId;
  frame?: string;
  focus?: boolean;
  gold?: boolean;
  warn?: string;
  weight?: number;
  rawBands?: Band[];
  dimRaw?: Record<string, Band[]>;
  dimMultiply?: number;
  totalMultiply?: number;
  scoreName?: string;
};

function parseLine(line: string): Item {
  let rest = line.trim();
  let dim: string | undefined;
  const bar = rest.indexOf("|");
  if (bar > 0) {
    const maybe = rest.slice(0, bar);
    if (/^[a-z0-9]+$/.test(maybe)) {
      dim = maybe;
      rest = rest.slice(bar + 1).trim();
    }
  }
  const rev = rest.startsWith("~");
  if (rev) rest = rest.slice(1).trim();
  return { text: rest, rev: rev || undefined, dim };
}

export function make(s: Spec): Test {
  const items = s.items ?? (s.lines ?? []).map(parseLine);
  const shape = s.shape ?? (s.dims ? "profile" : "index");
  return {
    id: s.id,
    title: s.title,
    lead: s.lead,
    category: s.category,
    school: s.school,
    scale: s.scale ?? "agree",
    shape,
    items,
    frame: s.frame ?? FRAME,
    source: s.source,
    focus: s.focus ?? FOCUS.has(s.school),
    gold: s.gold,
    warn: s.warn,
    read: s.read,
    dims: s.dims,
    rawBands: s.rawBands,
    dimRaw: s.dimRaw,
    dimMultiply: s.dimMultiply,
    totalMultiply: s.totalMultiply,
    weight: s.weight ?? defaultWeight(s.school, s.gold),
    scoreName: s.scoreName,
  };
}

export function minutesOf(count: number) {
  return Math.min(30, Math.max(3, Math.round(count * 0.45 + 0.6)));
}
