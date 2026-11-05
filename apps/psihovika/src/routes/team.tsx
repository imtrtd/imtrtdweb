import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { createTeam, joinTeam, listMyTeams, listNotes, addNote } from "@/lib/cms/server";
import {
  readActiveTeam,
  subscribeActiveTeam,
  writeActiveTeam,
  type ActiveTeam,
} from "@/lib/cms/active-team";
import type { TeamNote, TeamRow } from "@/lib/cms/types";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/team")({
  head: () => ({ meta: [{ title: "Команда — psy" }] }),
  component: TeamPage,
});

function TeamPage() {
  const { user, isPending } = useCurrentUserState();
  const active = useSyncExternalStore(subscribeActiveTeam, readActiveTeam, () => null);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [notes, setNotes] = useState<TeamNote[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refreshTeams() {
    try {
      const rows = await listMyTeams();
      setTeams(rows);
      if (active && !rows.some((t) => t.id === active.id)) writeActiveTeam(null);
      if (!active && rows[0]) writeActiveTeam(rows[0]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось загрузить команды.");
    }
  }

  async function refreshNotes(team: ActiveTeam | null) {
    if (!team) {
      setNotes([]);
      return;
    }
    try {
      const rows = await listNotes({ data: { teamId: team.id } });
      setNotes(rows);
    } catch {
      setNotes([]);
    }
  }

  useEffect(() => {
    if (!user) return;
    void refreshTeams();
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    void refreshNotes(active);
  }, [user?.id, active?.id]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const team = await createTeam({ data: { name } });
      writeActiveTeam(team);
      setName("");
      await refreshTeams();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не создалось.");
    } finally {
      setBusy(false);
    }
  }

  async function onJoin(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const team = await joinTeam({ data: { code } });
      writeActiveTeam(team);
      setCode("");
      await refreshTeams();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не вступили.");
    } finally {
      setBusy(false);
    }
  }

  async function onNote(event: FormEvent) {
    event.preventDefault();
    if (!active) return;
    setBusy(true);
    setError(null);
    try {
      await addNote({
        data: {
          teamId: active.id,
          body: note,
        },
      });
      setNote("");
      await refreshNotes(active);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Заметка не отправилась.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-xs uppercase tracking-widest text-ox">Совместная работа</p>
        <h1 className="mt-3 font-serif text-5xl text-balance rise-in">Команда</h1>
        <p className="mt-4 max-w-xl text-pretty text-muted">
          Создайте рабочую группу с коллегой: общий код приглашения, правки методик в админке и лента заметок.
        </p>

        {isPending ? <div className="mt-8 h-12 w-48 animate-pulse bg-line" /> : null}

        {!isPending && !user ? (
          <div className="mt-8 border border-line bg-sheet p-5">
            <p>Чтобы работать вдвоём, войдите в аккаунт.</p>
            <Button className="mt-4" asChild>
              <Link to="/login">Войти или зарегистрироваться</Link>
            </Button>
          </div>
        ) : null}

        {!isPending && user ? (
          <div className="mt-8 flex flex-col gap-6">
            <section className="grid gap-4 sm:grid-cols-2">
              <form onSubmit={(e) => void onCreate(e)} className="border border-line bg-sheet p-4">
                <h2 className="font-serif text-2xl">Новая команда</h2>
                <label className="mt-3 block">
                  <span className="text-sm text-muted">Название</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 h-12 w-full border border-line bg-paper px-4 text-ink focus:border-ox focus:outline-none"
                    placeholder="Супервизия / клиника"
                  />
                </label>
                <Button className="mt-4" type="submit" disabled={busy}>
                  Создать
                </Button>
              </form>
              <form onSubmit={(e) => void onJoin(e)} className="border border-line bg-sheet p-4">
                <h2 className="font-serif text-2xl">Код коллеги</h2>
                <label className="mt-3 block">
                  <span className="text-sm text-muted">Приглашение</span>
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="mt-1 h-12 w-full border border-line bg-paper px-4 uppercase tracking-widest text-ink focus:border-ox focus:outline-none"
                    placeholder="ABCD2345"
                  />
                </label>
                <Button className="mt-4" type="submit" variant="line" disabled={busy}>
                  Войти в команду
                </Button>
              </form>
            </section>

            {error ? <p className="text-sm text-ox">{error}</p> : null}

            <section className="border border-line p-4">
              <h2 className="font-serif text-2xl">Ваши команды</h2>
              {teams.length === 0 ? (
                <p className="mt-3 text-sm text-muted">Пока пусто — создайте или вступите по коду.</p>
              ) : (
                <ul className="mt-4 flex flex-col gap-2">
                  {teams.map((team) => {
                    const on = active?.id === team.id;
                    return (
                      <li key={team.id} className="flex flex-wrap items-center justify-between gap-3 border border-line bg-sheet px-4 py-3">
                        <div>
                          <p className="font-medium">{team.name}</p>
                          <p className="text-xs uppercase tracking-widest text-muted">
                            {team.role} · код {team.invite_code}
                          </p>
                        </div>
                        <Button
                          size="md"
                          variant={on ? "primary" : "line"}
                          onClick={() => writeActiveTeam(team)}
                        >
                          {on ? "Активна" : "Выбрать"}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {active ? (
              <section className="border border-line bg-sheet p-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="font-serif text-2xl">Заметки · {active.name}</h2>
                    <p className="mt-1 text-sm text-muted">Код для коллеги: {active.invite_code}</p>
                  </div>
                  <Button variant="line" asChild>
                    <Link to="/admin">Админка контента</Link>
                  </Button>
                </div>
                <form onSubmit={(e) => void onNote(e)} className="mt-4 flex flex-col gap-3">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    placeholder="Что обсудили, какую методику правите, что проверить…"
                    className="w-full border border-line bg-paper px-4 py-3 text-ink focus:border-ox focus:outline-none"
                  />
                  <Button type="submit" disabled={busy || !note.trim()}>
                    Отправить коллеге
                  </Button>
                </form>
                <ul className="mt-6 flex flex-col gap-3">
                  {notes.map((item) => (
                    <li key={item.id} className="border-t border-line pt-3 text-sm">
                      <p className="text-xs uppercase tracking-widest text-muted">
                        {item.author_name ?? "участник"}
                        {item.method_id ? ` · ${item.method_id}` : ""}
                      </p>
                      <p className="mt-1 text-pretty">{item.body}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : null}
      </main>
    </Shell>
  );
}
