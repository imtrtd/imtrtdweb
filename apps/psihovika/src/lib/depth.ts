import { SCALES, minutesOf, type Item, type Read, type Test } from "@/data/build";
import { scoreTest, type Piece, type Score } from "@/lib/scoring";

export type Depth = "touch" | "work" | "deep";

export const DEPTHS: { id: Depth; title: string; text: string }[] = [
  {
    id: "touch",
    title: "Касание",
    text: "Короткий срез, около нескольких минут. Пороги публичной шкалы здесь не считаются.",
  },
  {
    id: "work",
    title: "Разбор",
    text: "Вся методика, как она собрана. Для публичной шкалы это и есть её подсчёт.",
  },
  {
    id: "deep",
    title: "Глубина",
    text: "Все пункты и ещё четыре вопроса о том, как тема живёт в теле и с людьми. Они не входят в официальный балл.",
  },
];

const SLICE_READ: Read = {
  lowTitle: "На срезе тихо",
  midTitle: "На срезе заметно",
  highTitle: "На срезе громко",
  low: "Короткий проход почти не задевает эту тему. Это не «всё в порядке» и не официальный порог шкалы.",
  mid: "Тема звучит, но четырёх–шести пунктов мало, чтобы держать вывод. Имеет смысл пройти разбор.",
  high: "Даже короткий срез звучит отчётливо. Разбор покажет, это один полюс или вся картина.",
};

const WATCH_READ: Read = {
  lowTitle: "Почти не выходит за бланк",
  midTitle: "Уже видно рядом с бланком",
  highTitle: "Занимает тело и близких",
  low: "Четыре дополнительных пункта почти не задевают повседневность. Тема пока живёт в ответах, не в дне.",
  mid: "Тема выходит за анкету: её видно в теле, в сроках или с людьми. Это уточнение, не второй диагноз.",
  high: "Тема занимает отношения и тело, не только бланк. Имеет смысл вспомнить один конкретный эпизод, а не ускорять вывод.",
};

export type Passage = {
  depth: Depth;
  title: string;
  note: string;
  items: Item[];
  minutes: number;
  official: number;
  mode: "official" | "slice" | "deep";
};

function touchIndexes(test: Test) {
  const n = test.items.length;
  const crisis = test.items.flatMap((item, index) => (item.crisis ? [index] : []));
  if (n <= 6) return test.items.map((_, index) => index);
  const picked: number[] = [];
  if (test.dims?.length) {
    for (const dim of test.dims) {
      const idxs = test.items.flatMap((item, index) => (item.dim === dim.id ? [index] : []));
      if (!idxs.length) continue;
      picked.push(idxs[0]);
      if (idxs.length > 3) picked.push(idxs[Math.floor(idxs.length / 2)]);
    }
  } else {
    const target = Math.min(6, Math.max(4, Math.round(n * 0.35)));
    const step = (n - 1) / (target - 1);
    for (let k = 0; k < target; k++) picked.push(Math.round(k * step));
  }
  for (const index of crisis) picked.push(index);
  return [...new Set(picked)].sort((a, b) => a - b).slice(0, 10);
}

function deepItems(test: Test): Item[] {
  const title = test.title;
  const opts = SCALES.agree.opts;
  return [
    { text: `Про «${title}» можно сказать вслух человеку, которому есть доверие.`, opts },
    { text: `Когда поднимается «${title}», это заметно заранее, а не только после срыва.`, opts },
    { text: `«${title}» меняет поведение с близкими, а не только настроение наедине.`, opts },
    { text: `На «${title}» получается смотреть чуть дольше, чем удобно.`, opts },
  ];
}

export function passageOf(test: Test, depth: Depth): Passage {
  const meta = DEPTHS.find((item) => item.id === depth)!;
  if (depth === "deep") {
    const extra = deepItems(test);
    return {
      depth,
      title: meta.title,
      note: test.gold
        ? "Балл шкалы считается только по её пунктам. Четыре последних вопроса — самонаблюдение и в подсчёт не входят."
        : "Четыре последних вопроса не меняют индекс методики. Они про то, где тема живёт вне бланка.",
      items: [...test.items, ...extra],
      minutes: minutesOf(test.items.length + extra.length),
      official: test.items.length,
      mode: "deep",
    };
  }
  if (depth === "touch") {
    const indexes = touchIndexes(test);
    const same = indexes.length === test.items.length;
    return {
      depth,
      title: meta.title,
      note: same
        ? "В этой методике пунктов немного: касание совпадает с разбором."
        : "Это короткий срез. Пороги и нормы полной шкалы к нему не применяются.",
      items: indexes.map((index) => test.items[index]),
      minutes: minutesOf(indexes.length),
      official: indexes.length,
      mode: same ? "official" : "slice",
    };
  }
  return {
    depth,
    title: meta.title,
    note: test.gold ? "Полный бланк публичной шкалы, с её собственным подсчётом." : "Полный набор учебных пунктов этой методики.",
    items: test.items,
    minutes: minutesOf(test.items.length),
    official: test.items.length,
    mode: "official",
  };
}

function sliceTest(test: Test, items: Item[]): Test {
  const dims = (test.dims ?? [])
    .filter((dim) => items.some((item) => item.dim === dim.id))
    .map((dim) => ({
      ...dim,
      low: dim.low ?? "На коротком срезе этот полюс почти не звучит. Это не порог полной шкалы.",
      mid: dim.mid ?? "Полюс заметен, но среза мало, чтобы держать устойчивый вывод.",
      high: dim.high ?? "На срезе полюс звучит громко. Имеет смысл пройти разбор целиком.",
    }));
  return {
    ...test,
    items,
    shape: dims.length ? "profile" : "index",
    dims: dims.length ? dims : undefined,
    rawBands: undefined,
    dimRaw: undefined,
    gold: false,
    read: test.read ?? SLICE_READ,
  };
}

export function scorePassage(test: Test, passage: Passage, answers: number[]): { score: Score; watch: Piece | null } {
  if (passage.mode === "slice") {
    return { score: scoreTest(sliceTest(test, passage.items), answers), watch: null };
  }
  if (passage.mode === "deep") {
    const score = scoreTest(test, answers.slice(0, passage.official));
    const watchTest: Test = {
      ...test,
      items: passage.items.slice(passage.official),
      shape: "index",
      dims: undefined,
      rawBands: undefined,
      dimRaw: undefined,
      gold: false,
      read: WATCH_READ,
      scoreName: "Самонаблюдение",
    };
    const watchScore = scoreTest(watchTest, answers.slice(passage.official));
    return { score, watch: watchScore.total };
  }
  return { score: scoreTest(test, answers), watch: null };
}
