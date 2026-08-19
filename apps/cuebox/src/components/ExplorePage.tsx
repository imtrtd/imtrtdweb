"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { AuthStatus } from "@/components/AuthStatus";
import { SiteNav } from "@/components/SiteNav";
import {
  EXPLORE_CATEGORIES,
  EXPLORE_COUNTS,
  EXPLORE_PROMPTS,
} from "@/lib/explore-catalog";
import { useLibrary } from "@/lib/library-context";
import { KIND_LABELS, type ItemDraft } from "@/lib/types";

const CATEGORY_META: Record<
  string,
  { blurb: string; tone: string; icon: string }
> = {
  Письмо: {
    blurb: "Письма, переписки и ясный тон.",
    tone: "tone-blue",
    icon: "✉",
  },
  Код: {
    blurb: "Ревью, отладка и технические задачи.",
    tone: "tone-green",
    icon: "</>",
  },
  Маркетинг: {
    blurb: "Кампании, офферы и позиционирование.",
    tone: "tone-amber",
    icon: "◆",
  },
  Обучение: {
    blurb: "Объяснения, планы и учебные материалы.",
    tone: "tone-ink",
    icon: "◎",
  },
  Аналитика: {
    blurb: "Сводка данных и выводы без шума.",
    tone: "tone-teal",
    icon: "▤",
  },
  Продукт: {
    blurb: "Спеки, UX и продуктовые решения.",
    tone: "tone-forest",
    icon: "▣",
  },
  Творчество: {
    blurb: "Идеи, сценарии и свободный стиль.",
    tone: "tone-clay",
    icon: "✧",
  },
  Дизайн: {
    blurb: "Дизайн-системы, токены, критика и UX-исследования.",
    tone: "tone-teal",
    icon: "◈",
  },
  Соцсети: {
    blurb: "Посты, форматы платформ и вовлечение.",
    tone: "tone-blue",
    icon: "◉",
  },
  Бизнес: {
    blurb: "Стратегия, аудит и оценка возможностей.",
    tone: "tone-forest",
    icon: "▲",
  },
  Перевод: {
    blurb: "Локализация и адаптация текста.",
    tone: "tone-amber",
    icon: "⇄",
  },
  Продуктивность: {
    blurb: "Рабочие процессы, отчёты и коммуникация.",
    tone: "tone-ink",
    icon: "◇",
  },
  Другое: {
    blurb: "Всё, что не попало в другие категории.",
    tone: "tone-clay",
    icon: "◌",
  },
};

const FALLBACK_META = CATEGORY_META["Другое"];

export function ExplorePage() {
  const { status } = useSession();
  const { addItem, mode } = useLibrary();
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [imported, setImported] = useState<Record<string, boolean>>({});

  const counts = EXPLORE_COUNTS;

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EXPLORE_PROMPTS.filter((sample) => {
      if (category !== "all" && sample.category !== category) return false;
      if (!q) return true;
      return (
        sample.title.toLowerCase().includes(q) ||
        sample.body.toLowerCase().includes(q) ||
        (sample.description?.toLowerCase().includes(q) ?? false) ||
        sample.tags.some((t) => t.includes(q))
      );
    });
  }, [category, query]);

  async function handleImport(sampleId: string) {
    const sample = EXPLORE_PROMPTS.find((s) => s.id === sampleId);
    if (!sample) return;
    const draft: ItemDraft = {
      kind: sample.kind,
      title: sample.title,
      body: sample.body,
      tags: [...sample.tags, "sample", sample.category.toLowerCase()],
      models: sample.models,
      variableDefs: sample.variableDefs ?? [],
      variants: [],
      archived: false,
      favorite: false,
      collectionId: null,
      messages:
        sample.kind === "chat"
          ? [
              {
                role: "user",
                content: "Как назвать приложение для библиотеки промптов?",
              },
              {
                role: "assistant",
                content: "Cuebox — короткая «коробка подсказок» для ИИ.",
              },
            ]
          : undefined,
    };
    try {
      await addItem(draft);
      setImported((prev) => ({ ...prev, [sampleId]: true }));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Импорт не удался");
    }
  }

  const featured = CATEGORY_META[category] ?? FALLBACK_META;
  const featuredTitle = category === "all" ? "Каталог идей" : category;
  const featuredBlurb =
    category === "all"
      ? `Готовые промпты по категориям (${EXPLORE_PROMPTS.length}) — импорт в один клик.`
      : featured.blurb;

  return (
    <div className="app-shell explore-shell">
      <header className="site-header">
        <div className="brand-block">
          <div className="brand-row">
            <span className="brand-mark" aria-hidden>
              <svg viewBox="0 0 32 32" fill="none">
                <rect
                  x="4"
                  y="4"
                  width="24"
                  height="24"
                  rx="8"
                  fill="url(#cuebox-mark-explore)"
                />
                <path
                  d="M11 16.5h10M16 11.5v10"
                  stroke="#03121b"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient
                    id="cuebox-mark-explore"
                    x1="4"
                    y1="4"
                    x2="28"
                    y2="28"
                  >
                    <stop stopColor="#00e5ff" />
                    <stop offset="1" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
              </svg>
            </span>
            <p className="brand">
              <Link href="/" className="brand-link">
                Cuebox
              </Link>
            </p>
          </div>
          <p className="tagline">Explore — каталог готовых промптов</p>
        </div>

        <SiteNav active="explore" />

        <div className="header-actions">
          <Link href="/?view=library" className="btn btn-ghost">
            Библиотека
          </Link>
          <AuthStatus />
        </div>
      </header>

      {status !== "loading" && mode === "local" ? (
        <p className="sync-banner">
          Импорт идёт в локальную библиотеку браузера.{" "}
          <Link href="/register">Создайте аккаунт</Link>, чтобы сохранить в
          облаке.
        </p>
      ) : null}

      <section className="explore-hero" aria-label="Категория">
        <div className="explore-hero-orb" aria-hidden />
        <div className="explore-hero-copy">
          <p className="explore-kicker">Explore</p>
          <h1>{featuredTitle}</h1>
          <p>{featuredBlurb}</p>
        </div>
      </section>

      <section className="toolbar explore-toolbar">
        <div className="toolbar-row">
          <label className="search-field">
            <span className="sr-only">Поиск</span>
            <span className="search-icon" aria-hidden>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor">
                <circle cx="7" cy="7" r="4.5" strokeWidth="1.5" />
                <path d="M10.5 10.5 14 14" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по каталогу…"
              type="search"
            />
          </label>
        </div>
        <div className="kind-tabs">
          <button
            type="button"
            className={category === "all" ? "kind-tab active" : "kind-tab"}
            onClick={() => setCategory("all")}
          >
            Все
          </button>
          {EXPLORE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={category === cat ? "kind-tab active" : "kind-tab"}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {category === "all" ? (
        <div className="category-grid">
          {EXPLORE_CATEGORIES.map((cat, index) => {
            const meta = CATEGORY_META[cat] ?? FALLBACK_META;
            return (
              <button
                key={cat}
                type="button"
                className={`category-card ${meta.tone}`}
                style={{ animationDelay: `${0.05 * index}s` }}
                onClick={() => setCategory(cat)}
              >
                <span className="category-top">
                  <span className="category-icon" aria-hidden>
                    {meta.icon}
                  </span>
                  <span className="category-count">{counts.get(cat) ?? 0}</span>
                </span>
                <strong>{cat}</strong>
                <p>{meta.blurb}</p>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="explore-grid">
        {list.map((sample, index) => (
          <article
            key={sample.id}
            id={`prompt-${sample.id}`}
            className="explore-card"
            style={{ animationDelay: `${0.03 * index}s` }}
          >
            <div className="item-row-top">
              <span className={`kind-badge kind-${sample.kind}`}>
                {KIND_LABELS[sample.kind]}
              </span>
              <span className="item-date">{sample.category}</span>
            </div>
            <h3>{sample.title}</h3>
            <p className="item-row-preview">
              {sample.description ?? sample.body}
            </p>
            <div className="tag-row">
              {sample.models.map((model) => (
                <span key={model} className="tag model-tag">
                  {model}
                </span>
              ))}
              {sample.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))}
              {sample.variableDefs?.length ? (
                <span className="tag">{sample.variableDefs.length} перем.</span>
              ) : null}
            </div>
            <footer className="explore-card-foot">
              <button
                type="button"
                className="btn btn-primary"
                disabled={Boolean(imported[sample.id])}
                onClick={() => void handleImport(sample.id)}
              >
                {imported[sample.id] ? "Добавлено" : "Импортировать"}
              </button>
            </footer>
          </article>
        ))}
      </div>
    </div>
  );
}
