import { SCALES, type Band, type Read, type Test } from "@/data/build";

export type Piece = {
  id?: string;
  name?: string;
  title: string;
  text: string;
  raw: number;
  shown: number;
  max: number;
  unit: "pct" | "raw";
  pct: number;
  hot?: boolean;
};

export type Score = {
  total: Piece | null;
  dims: Piece[];
  crisis: boolean;
};

function pctOf(raw: number, min: number, max: number) {
  if (max <= min) return 0;
  return Math.max(0, Math.min(100, Math.round(((raw - min) / (max - min)) * 100)));
}

function matchRaw(bands: Band[], score: number) {
  const sorted = [...bands].sort((a, b) => a.max - b.max);
  return sorted.find((b) => score <= b.max) ?? sorted[sorted.length - 1];
}

function fromRead(read: Read, pct: number) {
  if (pct <= 35) return { title: read.lowTitle ?? "Слабо выражено", text: read.low };
  if (pct <= 66) return { title: read.midTitle ?? "Выражено частично", text: read.mid };
  return { title: read.highTitle ?? "Выражено отчётливо", text: read.high };
}

export function optionsFor(test: Test, index: number) {
  return test.items[index]?.opts ?? SCALES[test.scale].opts;
}

function bounds(test: Test, item: Test["items"][number]) {
  if (item.opts) {
    const vs = item.opts.map((o) => o.v);
    return { min: Math.min(...vs), max: Math.max(...vs) };
  }
  const scale = SCALES[test.scale];
  return { min: scale.min, max: scale.max };
}

function coded(test: Test, item: Test["items"][number], answer: number) {
  const { min, max } = bounds(test, item);
  if (item.rev) return min + max - answer;
  return answer;
}

export function scoreTest(test: Test, answers: number[]): Score {
  const rows = test.items.map((item, i) => ({
    item,
    raw: coded(test, item, answers[i] ?? 0),
  }));

  const dims: Piece[] = (test.dims ?? []).map((dim) => {
    const subset = rows.filter((r) => r.item.dim === dim.id);
    const raw = subset.reduce((a, r) => a + r.raw, 0);
    const min = subset.reduce((a, r) => a + bounds(test, r.item).min, 0);
    const max = subset.reduce((a, r) => a + bounds(test, r.item).max, 0);
    const pct = pctOf(raw, min, max);
    const table = test.dimRaw?.[dim.id];
    if (table) {
      const shown = raw * (test.dimMultiply ?? 1);
      const band = matchRaw(table, shown);
      return {
        id: dim.id,
        name: dim.title,
        title: band.title,
        text: band.text,
        raw,
        shown,
        max: Math.max(...table.map((b) => b.max)),
        unit: "raw" as const,
        pct,
        hot: band.hot,
      };
    }
    const band = fromRead(
      {
        low: dim.low ?? "",
        mid: dim.mid ?? "",
        high: dim.high ?? "",
        lowTitle: dim.lowTitle,
        midTitle: dim.midTitle,
        highTitle: dim.highTitle,
      },
      pct,
    );
    return {
      id: dim.id,
      name: dim.title,
      title: band.title,
      text: band.text,
      raw,
      shown: pct,
      max: 100,
      unit: "pct" as const,
      pct,
    };
  });

  let total: Piece | null = null;
  if (test.rawBands) {
    const raw = rows.reduce((a, r) => a + r.raw, 0);
    const shown = raw * (test.totalMultiply ?? 1);
    const band = matchRaw(test.rawBands, shown);
    const min = rows.reduce((a, r) => a + bounds(test, r.item).min, 0);
    const max = rows.reduce((a, r) => a + bounds(test, r.item).max, 0);
    total = {
      title: band.title,
      text: band.text,
      raw,
      shown,
      max: Math.max(...test.rawBands.map((b) => b.max)),
      unit: "raw",
      pct: pctOf(raw, min, max),
      hot: band.hot,
    };
  } else if (test.read && test.shape !== "profile") {
    const raw = rows.reduce((a, r) => a + r.raw, 0);
    const min = rows.reduce((a, r) => a + bounds(test, r.item).min, 0);
    const max = rows.reduce((a, r) => a + bounds(test, r.item).max, 0);
    const pct = pctOf(raw, min, max);
    const band = fromRead(test.read, pct);
    total = {
      title: band.title,
      text: band.text,
      raw,
      shown: pct,
      max: 100,
      unit: "pct",
      pct,
    };
  }

  const crisis =
    test.items.some((item, i) => Boolean(item.crisis) && (answers[i] ?? 0) > 0) ||
    Boolean(total?.hot) ||
    dims.some((d) => d.hot);

  return { total, dims, crisis };
}

export function barWidth(piece: Piece) {
  if (piece.max <= 0) return 0;
  if (piece.unit === "pct") return piece.pct;
  return Math.max(0, Math.min(100, Math.round((piece.shown / piece.max) * 100)));
}
