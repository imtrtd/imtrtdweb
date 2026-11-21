import { Link, useNavigate } from "@tanstack/react-router";
import { Star, ChevronDown, ChevronUp } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  PATHS,
  TESTS,
  filterTests,
  minutesOfTest,
  sortTests,
  type HomeSearch,
} from "@/data/catalog";
import { CATEGORY_ORDER, SCHOOL_ORDER, type Test } from "@/data/build";
import { FIDELITY_LABEL, metaFor } from "@/data/refs";
import { BRAND } from "@/lib/brand";
import { getServerSnapshot, getSnapshot, subscribe, toggleFav } from "@/lib/storage";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";

const DURS = [
  { id: "all", label: "Любая длина" },
  { id: "short", label: "До 8 мин" },
  { id: "mid", label: "9–15 мин" },
  { id: "long", label: "16–30 мин" },
];

const SORTS = [
  { id: "marked", label: "Сначала признанные" },
  { id: "school", label: "Психоанализ впереди" },
  { id: "short", label: "Сначала короткие" },
  { id: "long", label: "Сначала длинные" },
  { id: "az", label: "По алфавиту" },
];

const ONLY = [
  { id: "all", label: "Все" },
  { id: "focus", label: "Глубинная работа" },
  { id: "gold", label: "Публичные шкалы" },
  { id: "saved", label: "Отложенные" },
];

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-11 shrink-0 rounded-full px-4 text-sm transition-[transform,background-color,box-shadow] duration-300 hover:-translate-y-0.5",
        active
          ? "bg-ink text-paper shadow-[0_10px_24px_-12px_rgb(var(--shadow-rgb)/0.9)]"
          : "float-glass text-ink",
      )}
    >
      {children}
    </button>
  );
}

/** Pointer position inside the nearest card -> --x / --y, which the spotlight in .float-card reads. */
function spotlight(e: ReactPointerEvent<HTMLElement>) {
  const card = (e.target as HTMLElement).closest<HTMLElement>(".float-card");
  if (!card) return;
  const r = card.getBoundingClientRect();
  card.style.setProperty("--x", `${e.clientX - r.left}px`);
  card.style.setProperty("--y", `${e.clientY - r.top}px`);
}

/** Hero: a few real methods hover over the headline and lean toward the pointer. */
function FloatStage({ tests }: { tests: Test[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const picks = (
    tests.filter((t) => t.gold).length >= 3 ? tests.filter((t) => t.gold) : tests
  ).slice(0, 3);

  function lean(e: ReactPointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--px", String(((e.clientX - r.left) / r.width - 0.5) * 2));
    el.style.setProperty("--py", String(((e.clientY - r.top) / r.height - 0.5) * 2));
  }
  function settle() {
    ref.current?.style.setProperty("--px", "0");
    ref.current?.style.setProperty("--py", "0");
  }
  const slots = [
    { cls: "lg:left-0 lg:top-2 lg:w-[62%]", d: 26, bob: "10s", delay: "0s", tilt: "-1.2deg" },
    {
      cls: "lg:right-0 lg:top-[7.5rem] lg:w-[58%]",
      d: 38,
      bob: "12s",
      delay: "-3s",
      tilt: "1.4deg",
    },
    {
      cls: "lg:left-[10%] lg:top-[16.5rem] lg:w-[60%]",
      d: 18,
      bob: "11s",
      delay: "-6s",
      tilt: "-0.8deg",
    },
  ];
  return (
    <div
      ref={ref}
      onPointerMove={lean}
      onPointerLeave={settle}
      className="relative grid gap-3 lg:block lg:h-[27rem]"
      style={{ ["--px" as string]: 0, ["--py" as string]: 0 }}
    >
      {picks.map((test, i) => {
        const slot = slots[i];
        return (
          <div
            key={test.id}
            className={cn("float-bob lg:absolute", slot.cls)}
            style={{
              ["--bob" as string]: slot.bob,
              ["--bob-delay" as string]: slot.delay,
              ["--tilt" as string]: slot.tilt,
            }}
          >
            <div className="float-depth" style={{ ["--d" as string]: slot.d }}>
              <Link
                to="/m/$id"
                params={{ id: test.id }}
                onPointerMove={spotlight}
                className="float-card float-lift block p-4 backdrop-blur-sm"
              >
                <p className="text-[0.7rem] uppercase tracking-widest text-ox">{test.school}</p>
                <p className="mt-1.5 font-serif text-xl leading-tight text-balance">{test.title}</p>
                <p className="mt-2 text-xs tabular-nums text-muted">
                  {test.items.length} вопросов · около {minutesOfTest(test)} мин
                </p>
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CatalogView({
  search,
  tests = TESTS,
}: {
  search: HomeSearch;
  /** Catalog with site_content overlays when DB is available. */
  tests?: Test[];
}) {
  const navigate = useNavigate();
  const saved = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const shown = sortTests(filterTests(tests, search, saved.fav), search.sort);
  const [filtersOpen, setFiltersOpen] = useState(true);

  useEffect(() => {
    if (sessionStorage.getItem("psihovika-filters") === "0") setFiltersOpen(false);
  }, []);

  function toggleFilters() {
    setFiltersOpen((open) => {
      const next = !open;
      sessionStorage.setItem("psihovika-filters", next ? "1" : "0");
      return next;
    });
  }

  function patch(partial: Partial<HomeSearch>) {
    navigate({ to: "/", search: { ...search, ...partial } });
  }

  function surprise() {
    const pool = shown.length ? shown : tests;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    navigate({ to: "/m/$id", params: { id: pick.id } });
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16">
      <section className="grid gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-6 lg:py-16">
        <div className="rise-in">
          <p className="float-glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs uppercase tracking-widest text-ox">
            <span className="size-1.5 rounded-full bg-ox" aria-hidden />
            Психоанализ · терапия · скрининг
          </p>
          <h1 className="mt-5 max-w-2xl font-serif text-[clamp(2.3rem,11vw,3rem)] leading-[0.95] text-balance sm:text-6xl lg:text-7xl">
            {BRAND}
          </h1>
          <p className="mt-6 max-w-xl text-lg text-pretty text-ink/90">
            {tests.length} методик на русском, от трёх минут до получаса. Публичные шкалы — с
            первоисточниками и официальным подсчётом; учебные профили помечены отдельно.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" onClick={surprise}>
              Случайная методика
            </Button>
            <Button size="lg" variant="line" onClick={() => patch({ only: "gold", cat: "all" })}>
              Только публичные шкалы
            </Button>
          </div>
          <dl className="float-glass mt-8 grid max-w-xl grid-cols-3 gap-px overflow-hidden rounded-2xl text-center">
            <div className="px-3 py-3.5">
              <dt className="text-[0.7rem] uppercase tracking-widest text-muted">Методик</dt>
              <dd className="mt-0.5 font-serif text-3xl tabular-nums leading-none">
                {tests.length}
              </dd>
            </div>
            <div className="border-x border-line/70 px-3 py-3.5">
              <dt className="text-[0.7rem] uppercase tracking-widest text-muted">Публичных</dt>
              <dd className="mt-0.5 font-serif text-3xl tabular-nums leading-none">
                {tests.filter((t) => t.gold).length}
              </dd>
            </div>
            <div className="px-3 py-3.5">
              <dt className="text-[0.7rem] uppercase tracking-widest text-muted">На сервер</dt>
              <dd className="mt-0.5 font-serif text-3xl leading-none">0</dd>
            </div>
          </dl>
          <p className="mt-4 max-w-xl text-sm text-muted text-pretty">
            Ответы остаются в этом браузере. Бланков MMPI, Бека, MBTI и Маслач нет — их нельзя
            честно выложить. Есть PHQ-9, GAD-7, PCL-5, IPIP и учебные конструкты с явной отсылкой к
            авторам.
          </p>
        </div>
        <FloatStage tests={tests} />
      </section>

      <section className="stagger grid gap-4 pb-10 sm:grid-cols-2" onPointerMove={spotlight}>
        {PATHS.map((path) => (
          <Link
            key={path.id}
            to="/m/$id"
            params={{ id: path.id }}
            className="float-card p-4 float-lift"
          >
            <p className="text-xs uppercase tracking-widest text-ox">{path.kicker}</p>
            <h2 className="mt-2 font-serif text-2xl text-balance">{path.title}</h2>
            <p className="mt-2 text-sm text-muted text-pretty">{path.text}</p>
          </Link>
        ))}
      </section>

      <div
        className={cn(
          "float-glass float-glass-strong top-[var(--shell-header-h,4.5rem)] z-20 rounded-[1.4rem] px-4 py-3",
          filtersOpen ? "lg:sticky" : "sticky",
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted">
            Фильтры
            {!filtersOpen ? <span className="tabular-nums"> · {shown.length}</span> : null}
          </p>
          <button
            type="button"
            aria-expanded={filtersOpen}
            onClick={toggleFilters}
            className="inline-flex h-11 items-center gap-1 px-3 text-sm text-ink"
          >
            {filtersOpen ? "Свернуть" : "Развернуть"}
            {filtersOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
        </div>
        {filtersOpen ? (
          <>
            <label className="mt-2 block">
              <span className="sr-only">Поиск методики</span>
              <input
                value={search.q}
                onChange={(e) => patch({ q: e.target.value })}
                placeholder="Поиск: стыд, привязанность, PHQ, сон"
                className="h-12 w-full float-input px-4 text-base text-ink placeholder:text-muted focus:outline-none"
              />
            </label>
            <div className="chiprow mt-3 flex gap-2 overflow-x-auto">
              <Chip active={search.cat === "all"} onClick={() => patch({ cat: "all" })}>
                Все темы
              </Chip>
              {CATEGORY_ORDER.map((cat) => (
                <Chip key={cat} active={search.cat === cat} onClick={() => patch({ cat })}>
                  {cat}
                </Chip>
              ))}
            </div>
            <div className="chiprow mt-2 flex gap-2 overflow-x-auto">
              {ONLY.map((item) => (
                <Chip
                  key={item.id}
                  active={search.only === item.id}
                  onClick={() => patch({ only: item.id })}
                >
                  {item.label}
                </Chip>
              ))}
              {DURS.map((item) => (
                <Chip
                  key={item.id}
                  active={search.dur === item.id}
                  onClick={() => patch({ dur: item.id })}
                >
                  {item.label}
                </Chip>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="text-sm text-muted" htmlFor="school">
                Школа
              </label>
              <select
                id="school"
                value={search.school}
                onChange={(e) => patch({ school: e.target.value })}
                className="h-11 float-input px-3 text-base text-ink"
              >
                <option value="all">Все школы</option>
                {SCHOOL_ORDER.map((school) => (
                  <option key={school} value={school}>
                    {school}
                  </option>
                ))}
              </select>
              <label className="text-sm text-muted" htmlFor="sort">
                Порядок
              </label>
              <select
                id="sort"
                value={search.sort}
                onChange={(e) => patch({ sort: e.target.value })}
                className="h-11 float-input px-3 text-base text-ink"
              >
                {SORTS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="h-11 px-3 text-sm text-muted"
                onClick={() =>
                  navigate({
                    to: "/",
                    search: {
                      q: "",
                      cat: "all",
                      school: "all",
                      dur: "all",
                      sort: "marked",
                      only: "all",
                    },
                  })
                }
              >
                Сбросить
              </button>
            </div>
          </>
        ) : null}
      </div>

      <p className="px-1 py-5 text-sm text-muted tabular-nums">
        Показано {shown.length} из {tests.length}
      </p>

      {shown.length === 0 ? (
        <div className="float-card p-6">
          <h2 className="font-serif text-3xl">Ничего не нашлось</h2>
          <p className="mt-2 max-w-lg text-pretty">
            Снимите фильтр или спросите иначе: «вина», «сон», «юнгианский», «DASS».
          </p>
          <Button
            className="mt-4"
            variant="line"
            onClick={() =>
              navigate({
                to: "/",
                search: {
                  q: "",
                  cat: "all",
                  school: "all",
                  dur: "all",
                  sort: "marked",
                  only: "all",
                },
              })
            }
          >
            Показать всё
          </Button>
        </div>
      ) : (
        <ul className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3" onPointerMove={spotlight}>
          {shown.map((test) => {
            const fav = saved.fav.includes(test.id);
            const meta = metaFor(test);
            return (
              <li key={test.id} className="relative float-card float-lift">
                <Link
                  to="/m/$id"
                  params={{ id: test.id }}
                  className="flex h-full flex-col p-4 pr-14"
                >
                  <p className="text-xs uppercase tracking-widest text-muted">{test.school}</p>
                  <h2 className="mt-3 font-serif text-2xl leading-tight text-balance">
                    {test.title}
                  </h2>
                  <p className="mt-2 flex-1 text-sm text-muted text-pretty">{test.lead}</p>
                  <p className="mt-4 text-sm tabular-nums">
                    {test.items.length} вопросов · около {minutesOfTest(test)} мин
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-widest text-muted">
                    Касание · Разбор · Глубина
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-widest text-ox">
                    {FIDELITY_LABEL[meta.fidelity]}
                    {!test.gold ? ` · ${test.category}` : ""}
                  </p>
                </Link>
                <button
                  type="button"
                  aria-pressed={fav}
                  aria-label={fav ? "Убрать из отложенных" : "Отложить методику"}
                  onClick={() => toggleFav(test.id)}
                  className="absolute right-1 top-1 flex size-11 items-center justify-center"
                >
                  <Star className={cn("size-5", fav ? "fill-ox text-ox" : "text-muted")} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
