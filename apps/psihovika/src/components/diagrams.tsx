import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { barWidth, type Piece } from "@/lib/scoring";
import { cn } from "@/lib/cn";

type Kind = "bars" | "radar" | "rings";

type Row = {
  name: string;
  short: string;
  value: number;
  shown: number;
  max: number;
  title: string;
};

function shorten(name: string) {
  const clean = name.replace(/\s+/g, " ").trim();
  if (clean.length <= 18) return clean;
  const cut = clean.slice(0, 17);
  const space = cut.lastIndexOf(" ");
  return `${(space > 8 ? cut.slice(0, space) : cut).trim()}…`;
}

function rowsOf(pieces: Piece[]): Row[] {
  return pieces.map((piece) => {
    const name = piece.name ?? "Итог";
    return {
      name,
      short: shorten(name),
      value: barWidth(piece),
      shown: piece.shown,
      max: piece.max,
      title: piece.title,
    };
  });
}

function kindsFor(count: number): { id: Kind; label: string }[] {
  if (count >= 3) {
    return [
      { id: "bars", label: "Полосы" },
      { id: "radar", label: "Радар" },
      { id: "rings", label: "Кольца" },
    ];
  }
  if (count === 2) {
    return [
      { id: "bars", label: "Полосы" },
      { id: "rings", label: "Кольца" },
    ];
  }
  return [
    { id: "bars", label: "Полоса" },
    { id: "rings", label: "Кольцо" },
  ];
}

function Tip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload?: Row }[];
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="max-w-56 border border-line bg-sheet px-3 py-2 text-sm shadow-none">
      <p className="font-medium">{row.name}</p>
      <p className="text-ox">{row.title}</p>
      <p className="tabular-nums text-muted">
        {row.shown} из {row.max}
      </p>
    </div>
  );
}

function AxisTick({
  x = 0,
  y = 0,
  textAnchor = "middle",
  payload,
}: {
  x?: number;
  y?: number;
  textAnchor?: "start" | "middle" | "end" | "inherit";
  payload?: { value?: string };
}) {
  return (
    <text x={x} y={y} dy={4} textAnchor={textAnchor} fill="var(--color-ink)" fontSize={12}>
      {payload?.value ?? ""}
    </text>
  );
}

function Bars({ rows }: { rows: Row[] }) {
  const height = Math.max(180, rows.length * 44 + 24);
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 4 }}>
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis
            type="category"
            dataKey="short"
            width={108}
            tick={<AxisTick />}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<Tip />} cursor={{ fill: "var(--color-line)" }} />
          <Bar dataKey="value" fill="var(--color-ox)" barSize={12} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function RadarView({ rows }: { rows: Row[] }) {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={rows} cx="50%" cy="50%" outerRadius="68%">
          <PolarGrid stroke="var(--color-line)" />
          <PolarAngleAxis dataKey="short" tick={{ fill: "var(--color-ink)", fontSize: 12 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            dataKey="value"
            stroke="var(--color-ox)"
            fill="var(--color-ox)"
            fillOpacity={0.28}
            isAnimationActive={false}
          />
          <Tooltip content={<Tip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Rings({ rows }: { rows: Row[] }) {
  if (rows.length === 1) {
    const row = rows[0];
    const rest = Math.max(0, 100 - row.value);
    return (
      <div className="relative mx-auto h-64 w-full max-w-xs">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={[
                { n: row.value, k: "on" },
                { n: rest, k: "off" },
              ]}
              dataKey="n"
              innerRadius="72%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              stroke="none"
              isAnimationActive={false}
            >
              <Cell fill="var(--color-ox)" />
              <Cell fill="var(--color-line)" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
          <p className="font-serif text-4xl tabular-nums">{row.shown}</p>
          <p className="text-sm text-muted">из {row.max}</p>
          <p className="mt-1 text-sm text-ox">{row.title}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            data={rows}
            innerRadius="18%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
            cx="50%"
            cy="50%"
          >
            <RadialBar
              dataKey="value"
              background={{ fill: "var(--color-line)" }}
              fill="var(--color-ox)"
              cornerRadius={0}
              isAnimationActive={false}
            />
            <Tooltip content={<Tip />} />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-2 flex flex-col gap-1">
        {rows.map((row) => (
          <li key={row.name} className="flex items-baseline justify-between gap-3 text-sm">
            <span>{row.name}</span>
            <span className="shrink-0 tabular-nums text-muted">
              {row.shown} из {row.max}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Diagrams({ pieces, gold }: { pieces: Piece[]; gold?: boolean }) {
  const [mounted, setMounted] = useState(false);
  const kinds = kindsFor(pieces.length);
  const [kind, setKind] = useState<Kind>(kinds[0]?.id ?? "bars");
  const rows = rowsOf(pieces);
  const active = kinds.some((item) => item.id === kind) ? kind : kinds[0]?.id ?? "bars";

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!pieces.length) return null;

  return (
    <section className="mt-4 border border-line bg-sheet p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-serif text-3xl">Рисунок</h2>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Вид диаграммы">
          {kinds.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={active === item.id}
              onClick={() => setKind(item.id)}
              className={cn(
                "h-11 px-3 text-sm",
                active === item.id ? "bg-ox text-oxink" : "text-muted",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-2 text-sm text-muted text-pretty">
        {gold
          ? "Длина показывает долю от максимума исходной шкалы. Это скрининг, не диагноз."
          : "Длина показывает долю внутри этой методики, не норму по населению."}
      </p>
      <div className="mt-4" style={{ fontFamily: "var(--font-sans)" }} aria-hidden={!mounted}>
        {mounted ? (
          active === "radar" ? (
            <RadarView rows={rows} />
          ) : active === "rings" ? (
            <Rings rows={rows} />
          ) : (
            <Bars rows={rows} />
          )
        ) : (
          <div className="h-64 bg-paper" />
        )}
      </div>
    </section>
  );
}
