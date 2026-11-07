import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { TESTS } from "@/data/catalog";
import { FIDELITY_LABEL, metaFor } from "@/data/refs";
import {
  ensureEditorWorkspace,
  listSiteContent,
  saveSiteContent,
} from "@/lib/cms/server";
import type { ContentOverride, TeamRow } from "@/lib/cms/types";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/cn";

export const Route = createFileRoute("/editor")({
  head: () => ({ meta: [{ title: `Редактор — ${BRAND}` }] }),
  component: EditorPage,
});

function EditorPage() {
  const { user, isPending } = useCurrentUserState();
  const [workspace, setWorkspace] = useState<TeamRow | null>(null);
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState(TESTS[0]?.id ?? "phq9");
  const [overrides, setOverrides] = useState<ContentOverride[]>([]);
  const [title, setTitle] = useState("");
  const [lead, setLead] = useState("");
  const [source, setSource] = useState("");
  const [warn, setWarn] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [booting, setBooting] = useState(false);

  const base = useMemo(() => TESTS.find((t) => t.id === selectedId) ?? TESTS[0], [selectedId]);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return TESTS;
    return TESTS.filter((t) =>
      `${t.title} ${t.id} ${t.school} ${t.source}`.toLowerCase().includes(needle),
    );
  }, [q]);

  useEffect(() => {
    if (!base) return;
    const ov = overrides.find((o) => o.method_id === base.id);
    setTitle(ov?.title ?? base.title);
    setLead(ov?.lead ?? base.lead);
    setSource(ov?.source ?? base.source);
    setWarn(ov?.warn ?? base.warn ?? "");
    setNotes(ov?.notes ?? "");
    setSaved(false);
  }, [base?.id, overrides]);

  useEffect(() => {
    if (!user) {
      setWorkspace(null);
      return;
    }
    setBooting(true);
    setError(null);
    void (async () => {
      try {
        const team = await ensureEditorWorkspace();
        setWorkspace(team);
        const rows = await listSiteContent();
        setOverrides(rows);
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Не удалось открыть редактор. Нужна база данных (Neon).",
        );
      } finally {
        setBooting(false);
      }
    })();
  }, [user?.id]);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!base) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await saveSiteContent({
        data: {
          patch: {
            methodId: base.id,
            title: title.trim(),
            lead: lead.trim(),
            source: source.trim(),
            warn: warn.trim() || undefined,
            notes: notes.trim() || undefined,
          },
        },
      });
      const rows = await listSiteContent();
      setOverrides(rows);
      setSaved(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не сохранилось.");
    } finally {
      setBusy(false);
    }
  }

  const meta = base ? metaFor(base) : null;

  return (
    <Shell>
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-xs uppercase tracking-widest text-ox">Сайт</p>
        <h1 className="mt-3 font-serif text-5xl rise-in">Редактор</h1>
        <p className="mt-4 max-w-2xl text-pretty text-muted">
          Правки здесь попадают в публичный каталог. Базовый текст остаётся эталоном; пустые поля
          не перезаписывают оригинал.
        </p>

        {isPending || booting ? <div className="mt-8 h-12 w-40 animate-pulse bg-line" /> : null}

        {!isPending && !user ? (
          <div className="mt-8 border border-line bg-sheet p-5">
            <p>Редактор доступен после входа.</p>
            <Button className="mt-4" asChild>
              <Link to="/login">Войти</Link>
            </Button>
          </div>
        ) : null}

        {error && !base ? <p className="mt-6 text-sm text-ox">{error}</p> : null}

        {!isPending && !booting && user && base ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.4fr]">
            <aside className="border border-line bg-sheet p-4">
              <p className="text-xs uppercase tracking-widest text-muted">
                Публичный контент
                {workspace ? ` · ${workspace.name}` : ""}
              </p>
              <label className="mt-3 block">
                <span className="sr-only">Поиск</span>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="PHQ, привязанность…"
                  className="h-11 w-full border border-line bg-paper px-3 text-sm focus:border-ox focus:outline-none"
                />
              </label>
              <ul className="mt-3 max-h-[28rem] overflow-y-auto">
                {filtered.map((test) => {
                  const on = test.id === selectedId;
                  const patched = overrides.some((o) => o.method_id === test.id);
                  return (
                    <li key={test.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(test.id)}
                        className={cn(
                          "flex w-full flex-col items-start border-b border-line px-2 py-3 text-left text-sm",
                          on ? "bg-haze text-ink" : "text-muted hover:text-ink",
                        )}
                      >
                        <span className="font-medium text-ink">{test.title}</span>
                        <span className="mt-1 text-xs uppercase tracking-widest">
                          {test.id}
                          {patched ? " · на сайте" : ""}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>

            <form onSubmit={(e) => void onSave(e)} className="border border-line p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-widest text-ox">
                    {meta ? FIDELITY_LABEL[meta.fidelity] : base.school}
                  </p>
                  <h2 className="mt-2 font-serif text-3xl">{base.id}</h2>
                </div>
                <Button variant="line" asChild>
                  <Link to="/m/$id" params={{ id: base.id }}>
                    Открыть на сайте
                  </Link>
                </Button>
              </div>

              <label className="mt-5 block">
                <span className="text-sm text-muted">Заголовок</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 h-12 w-full border border-line bg-sheet px-4 focus:border-ox focus:outline-none"
                />
              </label>
              <label className="mt-4 block">
                <span className="text-sm text-muted">Лид</span>
                <textarea
                  value={lead}
                  onChange={(e) => setLead(e.target.value)}
                  rows={3}
                  className="mt-1 w-full border border-line bg-sheet px-4 py-3 focus:border-ox focus:outline-none"
                />
              </label>
              <label className="mt-4 block">
                <span className="text-sm text-muted">Источник / первоисточник</span>
                <textarea
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  rows={4}
                  className="mt-1 w-full border border-line bg-sheet px-4 py-3 focus:border-ox focus:outline-none"
                />
              </label>
              <label className="mt-4 block">
                <span className="text-sm text-muted">Предупреждение</span>
                <textarea
                  value={warn}
                  onChange={(e) => setWarn(e.target.value)}
                  rows={2}
                  className="mt-1 w-full border border-line bg-sheet px-4 py-3 focus:border-ox focus:outline-none"
                />
              </label>
              <label className="mt-4 block">
                <span className="text-sm text-muted">Внутренняя заметка редактора</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Что сверить с бланком, перевод, пороги…"
                  className="mt-1 w-full border border-line bg-sheet px-4 py-3 focus:border-ox focus:outline-none"
                />
              </label>

              {meta?.citations[0] ? (
                <p className="mt-4 text-sm text-muted text-pretty">
                  Эталонная ссылка: {meta.citations[0].authors} ({meta.citations[0].year}).{" "}
                  {meta.citations[0].title}.
                </p>
              ) : null}

              {error ? <p className="mt-3 text-sm text-ox">{error}</p> : null}
              {saved ? <p className="mt-3 text-sm text-muted">Сохранено на сайте.</p> : null}

              <div className="mt-5 flex flex-wrap gap-3">
                <Button type="submit" disabled={busy}>
                  {busy ? "Сохраняю…" : "Опубликовать правку"}
                </Button>
                <Button type="button" variant="ghost" asChild>
                  <Link to="/admin">Командная админка</Link>
                </Button>
              </div>
            </form>
          </div>
        ) : null}
      </main>
    </Shell>
  );
}
