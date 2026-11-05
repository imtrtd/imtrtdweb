import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSyncExternalStore } from "react";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { getTest, TESTS } from "@/data/catalog";
import { DEPTHS, passageOf, scorePassage } from "@/lib/depth";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { clearHistory, getServerSnapshot, getSnapshot, removeHistory, stageView, subscribe } from "@/lib/storage";

export const Route = createFileRoute("/history")({
  head: () => ({ meta: [{ title: "Кабинет — ПсихоВика" }] }),
  component: HistoryPage,
});

function HistoryPage() {
  const saved = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const user = useCurrentUser();
  const navigate = useNavigate();
  const when = new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" });
  const methods = new Set(saved.history.map((entry) => entry.id)).size;
  const kept = TESTS.filter((test) => saved.fav.includes(test.id));

  return (
    <Shell>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-xs uppercase tracking-widest text-ox">Только этот браузер</p>
        <h1 className="mt-3 font-serif text-5xl text-balance">Кабинет</h1>
        {user && !user.isDevFallback ? (
          <div className="mt-4 border border-line bg-sheet p-4">
            <UserButton />
          </div>
        ) : null}
        <p className="mt-4 text-pretty">
          История прохождений и отложенные методики остаются в этом браузере. Вход нужен, чтобы кабинет знал, кто вы. Сами ответы на другой телефон пока не переезжают.
        </p>

        <dl className="mt-8 grid grid-cols-3 gap-3">
          <div className="border border-line bg-sheet p-4">
            <dt className="text-xs uppercase tracking-widest text-muted">Прохождения</dt>
            <dd className="mt-2 font-serif text-4xl tabular-nums">{saved.history.length}</dd>
          </div>
          <div className="border border-line bg-sheet p-4">
            <dt className="text-xs uppercase tracking-widest text-muted">Методики</dt>
            <dd className="mt-2 font-serif text-4xl tabular-nums">{methods}</dd>
          </div>
          <div className="border border-line bg-sheet p-4">
            <dt className="text-xs uppercase tracking-widest text-muted">Отложенные</dt>
            <dd className="mt-2 font-serif text-4xl tabular-nums">{kept.length}</dd>
          </div>
        </dl>

        <h2 className="mt-10 font-serif text-3xl">История</h2>
        {saved.history.length === 0 ? (
          <div className="mt-4 border border-line bg-sheet p-6">
            <h3 className="font-serif text-2xl">Пока пусто</h3>
            <p className="mt-2 text-pretty">
              Откройте методику и выберите касание, разбор или глубину. Итог появится здесь.
            </p>
          </div>
        ) : (
          <>
            <ul className="mt-4 flex flex-col gap-3">
              {saved.history.map((entry) => {
                const test = getTest(entry.id);
                const depth = entry.depth ?? "work";
                const passage = test ? passageOf(test, depth) : null;
                const scored =
                  test && passage && entry.answers.length === passage.items.length
                    ? scorePassage(test, passage, entry.answers)
                    : null;
                const label =
                  scored?.score.total?.title ??
                  scored?.score.dims.slice().sort((a, b) => b.pct - a.pct)[0]?.name ??
                  "Итог";
                const depthTitle = DEPTHS.find((item) => item.id === depth)?.title ?? "Разбор";
                return (
                  <li key={`${entry.id}-${entry.at}`} className="border border-line bg-sheet p-4">
                    <p className="text-sm tabular-nums text-muted">
                      {when.format(entry.at)} · {depthTitle}
                    </p>
                    <h3 className="mt-1 font-serif text-2xl">{test?.title ?? "Методика обновлена"}</h3>
                    <p className="mt-1 text-pretty">{test && scored ? label : "Пункты изменились, пройдите заново."}</p>
                    {scored?.watch ? <p className="mt-1 text-sm text-muted">Самонаблюдение: {scored.watch.title}</p> : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {test && scored ? (
                        <Button
                          variant="line"
                          onClick={() => {
                            stageView(entry);
                            navigate({ to: "/m/$id", params: { id: entry.id } });
                          }}
                        >
                          Открыть итог
                        </Button>
                      ) : null}
                      <Button variant="ghost" onClick={() => removeHistory(entry.at)}>
                        Убрать
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <Button className="mt-4" variant="ghost" onClick={() => clearHistory()}>
              Очистить историю
            </Button>
          </>
        )}

        <h2 className="mt-10 font-serif text-3xl">Отложенные</h2>
        {kept.length === 0 ? (
          <p className="mt-3 text-pretty text-muted">Звезда на карточке кладёт методику сюда, не начиная прохождение.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {kept.map((test) => (
              <li key={test.id}>
                <Link to="/m/$id" params={{ id: test.id }} className="block border border-line bg-sheet p-4 hover:border-ox">
                  <span className="text-xs uppercase tracking-widest text-muted">{test.category}</span>
                  <span className="mt-1 block font-serif text-2xl">{test.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </Shell>
  );
}
