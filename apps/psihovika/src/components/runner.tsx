import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { minutesOfTest, relatedTests } from "@/data/catalog";
import { SCALES, type Test } from "@/data/build";
import type { Piece } from "@/lib/scoring";
import { DEPTHS, passageOf, scorePassage, type Depth } from "@/lib/depth";
import { resultFileName, resultPrompt } from "@/lib/prompt";
import { Diagrams } from "@/components/diagrams";
import {
  draftKey,
  getServerSnapshot,
  getSnapshot,
  pushHistory,
  subscribe,
  takeView,
  toggleFav,
  type Hist,
} from "@/lib/storage";
import { CrisisNote } from "@/components/crisis";
import { SourceCard } from "@/components/source-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { FIDELITY_LABEL, metaFor } from "@/data/refs";
import { Star } from "lucide-react";

type Phase = "intro" | "ask" | "done";

function Meter({ piece }: { piece: Piece }) {
  return (
    <p className="mt-3 text-sm tabular-nums text-muted">
      {piece.shown} из {piece.max}
    </p>
  );
}

export function Runner({ test }: { test: Test }) {
  const saved = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [phase, setPhase] = useState<Phase>("intro");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => Array(test.items.length).fill(null));
  const [depth, setDepth] = useState<Depth>("work");
  const [draftDepth, setDraftDepth] = useState<Depth | null>(null);
  const [copied, setCopied] = useState<"prompt" | "file" | null>(null);
  const [review, setReview] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const started = useRef<number | null>(null);
  const done = useRef(false);
  const fav = saved.fav.includes(test.id);
  const past = saved.history.find((entry) => {
    if (entry.id !== test.id) return false;
    const next = entry.depth ?? "work";
    return entry.answers.length === passageOf(test, next).items.length;
  });
  const passage = passageOf(test, depth);
  const last = passage.items.length - 1;

  useEffect(() => {
    done.current = false;
    setPhase("intro");
    setStep(0);
    setDepth("work");
    setAnswers(Array(passageOf(test, "work").items.length).fill(null));
    setReview(false);
    setDraftDepth(null);
    setSavedAt(null);
    started.current = null;
    const view = takeView(test.id);
    if (view) {
      const next = view.depth ?? "work";
      if (view.answers.length === passageOf(test, next).items.length) {
        setDepth(next);
        setAnswers(view.answers);
        setSavedAt(view.at);
        setReview(true);
        setPhase("done");
        return;
      }
    }
    const found = (["touch", "work", "deep"] as Depth[]).find((item) => {
      try {
        const raw = sessionStorage.getItem(draftKey(test.id, item));
        if (!raw) return false;
        const parsed = JSON.parse(raw) as { answers?: (number | null)[] };
        return Array.isArray(parsed.answers) && parsed.answers.length === passageOf(test, item).items.length;
      } catch {
        return false;
      }
    });
    setDraftDepth(found ?? null);
  }, [test.id]);

  useEffect(() => {
    if (phase !== "ask") return;
    sessionStorage.setItem(draftKey(test.id, depth), JSON.stringify({ step, answers }));
  }, [phase, step, answers, test.id, depth]);

  useEffect(() => {
    if (phase === "intro") return;
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [phase, step]);

  useEffect(() => {
    if (phase !== "ask" || started.current == null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  function begin(next: Depth, fromDraft: boolean) {
    const run = passageOf(test, next);
    setDepth(next);
    if (fromDraft) {
      try {
        const raw = sessionStorage.getItem(draftKey(test.id, next));
        if (raw) {
          const parsed = JSON.parse(raw) as { step?: number; answers?: (number | null)[] };
          if (Array.isArray(parsed.answers) && parsed.answers.length === run.items.length) {
            setAnswers(parsed.answers);
            setStep(Math.min(parsed.step ?? 0, run.items.length - 1));
          }
        }
      } catch {
        /* start fresh */
      }
    } else {
      setAnswers(Array(run.items.length).fill(null));
      setStep(0);
      sessionStorage.removeItem(draftKey(test.id, next));
    }
    started.current = Date.now();
    setNow(Date.now());
    done.current = false;
    setReview(false);
    setPhase("ask");
  }

  function openPast(entry: Hist) {
    const next = entry.depth ?? "work";
    if (entry.answers.length !== passageOf(test, next).items.length) return;
    setDepth(next);
    setAnswers(entry.answers);
    setSavedAt(entry.at);
    setReview(true);
    setPhase("done");
  }

  function finish(nextAnswers: (number | null)[]) {
    if (done.current) return;
    if (nextAnswers.some((v) => v == null)) return;
    done.current = true;
    const numeric = nextAnswers as number[];
    const at = Date.now();
    setAnswers(numeric);
    setSavedAt(at);
    sessionStorage.removeItem(draftKey(test.id, depth));
    pushHistory({ id: test.id, at, answers: numeric, depth });
    setPhase("done");
  }

  function choose(value: number) {
    const at = step;
    const next = answers.slice();
    next[at] = value;
    setAnswers(next);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const go = () => {
      if (at >= last) finish(next);
      else setStep((s) => (s === at ? at + 1 : s));
    };
    if (reduce) return;
    window.setTimeout(go, 220);
  }

  const elapsed =
    started.current && now ? Math.max(0, Math.round((now - started.current) / 1000)) : 0;
  const mins = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const secs = String(elapsed % 60).padStart(2, "0");

  if (phase === "ask") {
    const item = passage.items[step];
    const opts = item?.opts ?? SCALES[test.scale].opts;
    const picked = answers[step];
    return (
      <main className="mx-auto flex min-h-[calc(100dvh-8rem)] max-w-3xl flex-col px-4 pb-28 pt-6">
        <p className="text-xs uppercase tracking-widest text-muted">
          {test.category} · {passage.title} · вопрос {step + 1} из {passage.items.length}
        </p>
          <div
          className="mt-3 h-1 overflow-hidden bg-line"
          role="progressbar"
          aria-valuenow={step + 1}
          aria-valuemin={1}
          aria-valuemax={passage.items.length}
        >
          <div
            className="progress-fill h-1 bg-ox"
            style={{ width: `${((step + 1) / passage.items.length) * 100}%` }}
          />
        </div>
        <p className="mt-3 text-sm tabular-nums text-muted">{mins}:{secs}</p>
        <fieldset className="mt-8 rise-in" key={step}>
          <legend className="font-serif text-3xl leading-tight text-balance sm:text-4xl">{item.text}</legend>
          <div className="mt-6 flex flex-col gap-2">
            {opts.map((opt) => {
              const on = picked === opt.v;
              return (
                <button
                  key={opt.v}
                  type="button"
                  aria-pressed={on}
                  onClick={() => choose(opt.v)}
                  className={cn(
                    "min-h-12 border px-4 py-3 text-left text-base transition-colors duration-200",
                    on ? "border-ox bg-ox text-oxink" : "border-line bg-sheet text-ink hover:border-ox",
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </fieldset>
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
            <Button
              variant="ghost"
              onClick={() => {
                if (step === 0) setPhase("intro");
                else setStep((s) => Math.max(0, s - 1));
              }}
            >
              Назад
            </Button>
            <Button
              disabled={picked == null}
              onClick={() => {
                if (picked == null) return;
                if (step >= last) finish(answers);
                else setStep((s) => s + 1);
              }}
            >
              {step >= last ? "К итогу" : "Дальше"}
            </Button>
          </div>
        </div>
      </main>
    );
  }

  if (phase === "done") {
    const numeric = answers.map((v) => v ?? 0);
    const { score, watch } = scorePassage(test, passage, numeric);
    const ranked = [...score.dims].sort((a, b) => b.pct - a.pct);
    const top = ranked[0];
    const second = ranked[1];
    const close = Boolean(top && second && top.pct - second.pct <= 8);
    const drawn = score.dims.length
      ? score.dims
      : score.total
        ? [{ ...score.total, name: test.scoreName ?? "Итог" }]
        : [];
    const at = savedAt ?? Date.now();
    const prompt = resultPrompt(test, score, at, { depth: passage.title, note: passage.note, watch });

    async function copyPrompt() {
      try {
        await navigator.clipboard.writeText(prompt);
        setCopied("prompt");
      } catch {
        setCopied(null);
      }
    }

    function downloadPrompt() {
      const blob = new Blob([prompt], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = resultFileName(test.id);
      link.click();
      URL.revokeObjectURL(url);
      setCopied("file");
    }

    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-xs uppercase tracking-widest text-ox">{test.school}</p>
        <h1 className="mt-2 font-serif text-4xl text-balance sm:text-5xl">{test.title}</h1>
        <p className="mt-2 text-sm text-muted">{passage.title}</p>
        {score.total ? (
          <section className="mt-8 border border-line bg-sheet p-5">
            <p className="text-xs uppercase tracking-widest text-muted">{test.scoreName ?? "Индекс самонаблюдения"}</p>
            <h2 className="mt-2 font-serif text-4xl text-balance">{score.total.title}</h2>
            <Meter piece={score.total} />
            <p className="mt-4 text-pretty">{score.total.text}</p>
            {!test.gold ? (
              <p className="mt-3 text-sm text-muted text-pretty">
                Индекс от 0 до 100 внутри этой учебной методики. Это не норма по населению и не диагноз.
              </p>
            ) : (
              <p className="mt-3 text-sm text-muted text-pretty">Подсчёт как в исходной публичной шкале. Скрининг не заменяет беседу.</p>
            )}
            {passage.mode !== "official" || watch ? <p className="mt-3 text-sm text-pretty">{passage.note}</p> : null}
          </section>
        ) : null}

        {test.shape === "profile" && top ? (
          <section className="mt-4 border border-line p-5">
            <h2 className="font-serif text-3xl text-balance">
              {top.pct < 42
                ? "Нет одного громкого полюса"
                : close
                  ? `Сильнее звучат «${top.name}» и «${second?.name}»`
                  : `Сейчас ближе «${top.name}»`}
            </h2>
            <p className="mt-2 text-pretty">
              {top.pct < 42
                ? "Смотрите рисунок целиком: разница между полюсами небольшая."
                : "Полюс описывает теперешний способ, не паспорт и не приговор. В другой связи рисунок может сдвинуться."}
            </p>
          </section>
        ) : null}

        <Diagrams pieces={drawn} gold={test.gold && passage.mode !== "slice"} />

        {watch ? (
          <section className="mt-4 border border-line bg-sheet p-5">
            <p className="text-xs uppercase tracking-widest text-muted">Вне балла шкалы</p>
            <h2 className="mt-2 font-serif text-3xl text-balance">{watch.title}</h2>
            <Meter piece={watch} />
            <p className="mt-4 text-pretty">{watch.text}</p>
          </section>
        ) : null}

        {score.dims.length > 0 ? (
          <section className="mt-4 flex flex-col gap-6 border border-line bg-sheet p-5">
            <h2 className="font-serif text-3xl">Как это читается</h2>
            {score.dims.map((dim) => (
              <div key={dim.id}>
                <p className="font-medium">{dim.name}</p>
                <p className="text-sm text-ox">{dim.title}</p>
                <p className="mt-1 text-sm tabular-nums text-muted">
                  {dim.shown} из {dim.max}
                </p>
                <p className="mt-2 text-pretty">{dim.text}</p>
              </div>
            ))}
          </section>
        ) : null}

        <div className="mt-4">
          <SourceCard meta={metaFor(test)} source={test.source} />
        </div>
        {test.warn ? (
          <section className="mt-4 border border-line p-5">
            <p className="text-pretty">{test.warn}</p>
          </section>
        ) : null}

        <div className="mt-4">
          <CrisisNote hot={score.crisis} />
        </div>

        <section className="mt-4 border border-line p-5">
          <h2 className="font-serif text-3xl">Промпт для ИИ</h2>
          <p className="mt-2 text-pretty">
            Готовый текст для Grok или другого чата: баллы, чтение методики и просьба не ставить диагноз. Можно скопировать или скачать файлом. Итог уже лежит в кабинете этого браузера.
          </p>
          <textarea
            readOnly
            value={prompt}
            aria-label="Промпт для ИИ"
            className="mt-4 h-48 w-full resize-y border border-line bg-paper p-3 text-sm text-ink"
            onFocus={(event) => event.currentTarget.select()}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={() => void copyPrompt()}>{copied === "prompt" ? "Промпт скопирован" : "Скопировать промпт"}</Button>
            <Button variant="line" onClick={downloadPrompt}>
              {copied === "file" ? "Файл скачан" : "Скачать итог"}
            </Button>
            <Button variant="ghost" asChild>
              <Link to="/history">Кабинет</Link>
            </Button>
          </div>
        </section>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="line" onClick={() => toggleFav(test.id)}>
            {fav ? "В отложенных" : "Отложить"}
          </Button>
          <Button variant="ghost" onClick={() => setPhase("intro")}>
            Другая глубина
          </Button>
        </div>

        <Related test={test} />
      </main>
    );
  }

  const meta = metaFor(test);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-xs uppercase tracking-widest text-ox">
        {test.school} · {FIDELITY_LABEL[meta.fidelity]}
      </p>
      <div className="mt-2 flex items-start justify-between gap-3 rise-in">
        <h1 className="font-serif text-4xl text-balance sm:text-5xl">{test.title}</h1>
        <button
          type="button"
          aria-pressed={fav}
          aria-label={fav ? "Убрать из отложенных" : "Отложить методику"}
          onClick={() => toggleFav(test.id)}
          className="flex size-11 shrink-0 items-center justify-center"
        >
          <Star className={cn("size-5", fav ? "fill-ox text-ox" : "text-muted")} />
        </button>
      </div>
      <p className="mt-4 text-lg text-pretty">{test.lead}</p>
      <p className="mt-4 text-sm tabular-nums text-muted">
        {test.items.length} вопросов · около {minutesOfTest(test)} мин
        {meta.instrument ? ` · ${meta.instrument}` : ""}
      </p>
      <p className="mt-6 text-pretty">{test.frame}</p>
      {test.warn ? <p className="mt-4 border border-line bg-sheet p-4 text-pretty">{test.warn}</p> : null}
      <p className="mt-4 text-sm text-muted text-pretty">
        Ответы не уходят на сервер. Выберите глубину: итог, рисунок и промпт для ИИ сохранятся в кабинете этого браузера. Это не диагноз.
      </p>
      <div className="stagger mt-6 flex flex-col gap-3">
        {DEPTHS.map((item) => {
          const run = passageOf(test, item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => begin(item.id, false)}
              className="border border-line bg-sheet p-4 text-left transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-ox"
            >
              <span className="flex items-baseline justify-between gap-3">
                <span className="font-serif text-2xl">{item.title}</span>
                <span className="text-sm tabular-nums text-muted">
                  {run.items.length} вопросов · около {run.minutes} мин
                </span>
              </span>
              <span className="mt-2 block text-sm text-pretty text-muted">{run.note}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {draftDepth ? (
          <Button variant="line" onClick={() => begin(draftDepth, true)}>
            Продолжить «{DEPTHS.find((item) => item.id === draftDepth)?.title}»
          </Button>
        ) : null}
        {past ? (
          <Button variant="ghost" onClick={() => openPast(past)}>
            Прошлый итог
          </Button>
        ) : null}
      </div>
      <div className="mt-8">
        <SourceCard meta={meta} source={test.source} />
      </div>
      <div className="mt-4">
        <CrisisNote />
      </div>
      <Related test={test} />
    </main>
  );
}

function Related({ test }: { test: Test }) {
  const items = relatedTests(test);
  if (!items.length) return null;
  return (
    <section className="mt-10">
      <h2 className="font-serif text-2xl">Рядом по теме</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.id}>
            <Link to="/m/$id" params={{ id: item.id }} className="block border border-line bg-sheet p-4 hover:border-ox">
              <span className="text-xs uppercase tracking-widest text-muted">{item.category}</span>
              <span className="mt-1 block font-serif text-2xl">{item.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
