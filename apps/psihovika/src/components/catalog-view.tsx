import { Link, useNavigate } from "@tanstack/react-router";
import { Star, ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { PATHS, TESTS, filterTests, minutesOfTest, sortTests, type HomeSearch } from "@/data/catalog";
import { CATEGORY_ORDER, SCHOOL_ORDER } from "@/data/build";
import { FIDELITY_LABEL, metaFor } from "@/data/refs";
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
        "h-11 shrink-0 rounded-full px-4 text-sm",
        active ? "bg-ink text-paper" : "border border-line bg-sheet text-ink",
      )}
    >
      {children}
    </button>
  );
}

export function CatalogView({ search }: { search: HomeSearch }) {
  const navigate = useNavigate();
  const saved = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const shown = sortTests(filterTests(TESTS, search, saved.fav), search.sort);
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
    const pool = shown.length ? shown : TESTS;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    navigate({ to: "/m/$id", params: { id: pick.id } });
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16">
      <section className="grid gap-8 border-b border-line py-10 lg:grid-cols-[1.4fr_0.6fr] lg:items-end">
        <div className="rise-in">
          <p className="text-xs uppercase tracking-widest text-ox">Психоанализ · терапия · скрининг</p>
          <h1 className="mt-3 max-w-xl font-serif text-5xl leading-none text-balance sm:text-6xl">psy</h1>
          <p className="mt-5 max-w-xl text-lg text-pretty">
            {TESTS.length} методик на русском, от трёх минут до получаса. Публичные шкалы — с первоисточниками и официальным подсчётом;
            учебные профили помечены отдельно.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button size="lg" onClick={surprise}>
              Случайная методика
            </Button>
            <Button size="lg" variant="line" onClick={() => patch({ only: "gold", cat: "all" })}>
              Только публичные шкалы
            </Button>
          </div>
        </div>
        <div className="rise-in border border-line bg-sheet/90 p-5" style={{ animationDelay: "0.08s" }}>
          <p className="font-serif text-5xl tabular-nums leading-none">{TESTS.length}</p>
          <p className="mt-2 text-sm text-muted">методик в этом браузере, без отправки ответов на сервер</p>
          <p className="mt-4 text-sm text-pretty">
            Нет бланков MMPI, Бека, MBTI и Маслач — их нельзя честно выложить. Есть PHQ-9, GAD-7, PCL-5, IPIP и учебные конструкты с явной отсылкой к авторам.
          </p>
        </div>
      </section>

      <section className="stagger grid gap-3 py-8 sm:grid-cols-2">
        {PATHS.map((path) => (
          <Link key={path.id} to="/m/$id" params={{ id: path.id }} className="border border-line bg-sheet/90 p-4 transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-ox">
            <p className="text-xs uppercase tracking-widest text-ox">{path.kicker}</p>
            <h2 className="mt-2 font-serif text-2xl text-balance">{path.title}</h2>
            <p className="mt-2 text-sm text-muted text-pretty">{path.text}</p>
          </Link>
        ))}
      </section>

      <div className="sticky top-[var(--shell-header-h,3.5rem)] z-20 -mx-4 border-y border-line bg-paper/95 px-4 py-3 backdrop-blur">
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
            className="h-12 w-full border border-line bg-sheet px-4 text-base text-ink placeholder:text-muted focus:border-ox focus:outline-none"
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
            <Chip key={item.id} active={search.only === item.id} onClick={() => patch({ only: item.id })}>
              {item.label}
            </Chip>
          ))}
          {DURS.map((item) => (
            <Chip key={item.id} active={search.dur === item.id} onClick={() => patch({ dur: item.id })}>
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
            className="h-11 border border-line bg-sheet px-3 text-base text-ink"
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
            className="h-11 border border-line bg-sheet px-3 text-base text-ink"
          >
            {SORTS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <button type="button" className="h-11 px-3 text-sm text-muted" onClick={() => navigate({ to: "/", search: { q: "", cat: "all", school: "all", dur: "all", sort: "marked", only: "all" } })}>
            Сбросить
          </button>
        </div>
          </>
        ) : null}
      </div>

      <p className="py-4 text-sm text-muted tabular-nums">
        Показано {shown.length} из {TESTS.length}
      </p>

      {shown.length === 0 ? (
        <div className="border border-line bg-sheet p-6">
          <h2 className="font-serif text-3xl">Ничего не нашлось</h2>
          <p className="mt-2 max-w-lg text-pretty">Снимите фильтр или спросите иначе: «вина», «сон», «юнгианский», «DASS».</p>
          <Button className="mt-4" variant="line" onClick={() => navigate({ to: "/", search: { q: "", cat: "all", school: "all", dur: "all", sort: "marked", only: "all" } })}>
            Показать всё
          </Button>
        </div>
      ) : (
        <ul className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((test) => {
            const fav = saved.fav.includes(test.id);
            const meta = metaFor(test);
            return (
              <li key={test.id} className="relative border border-line bg-sheet/90 transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-ox">
                <Link to="/m/$id" params={{ id: test.id }} className="flex h-full flex-col p-4 pr-14">
                  <p className="text-xs uppercase tracking-widest text-muted">{test.school}</p>
                  <h2 className="mt-3 font-serif text-2xl leading-tight text-balance">{test.title}</h2>
                  <p className="mt-2 flex-1 text-sm text-muted text-pretty">{test.lead}</p>
                  <p className="mt-4 text-sm tabular-nums">
                    {test.items.length} вопросов · около {minutesOfTest(test)} мин
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-widest text-muted">Касание · Разбор · Глубина</p>
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
