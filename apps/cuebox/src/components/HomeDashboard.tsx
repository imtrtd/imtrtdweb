"use client";

import { useMemo } from "react";
import { useLibrary } from "@/lib/library-context";
import { KIND_LABELS, type AiModel, type LibraryItem } from "@/lib/types";

const SERVICE_ORDER: AiModel[] = [
  "ChatGPT",
  "Claude",
  "Gemini",
  "Copilot",
  "Perplexity",
  "Grok",
  "DeepSeek",
];

function relativeTime(iso?: string | null) {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const days = Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
  if (days === 0) return "сегодня";
  if (days === 1) return "1 день";
  if (days < 5) return `${days} дня`;
  return `${days} дн.`;
}

function countWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function HomeDashboard({
  onOpenItem,
  onOpenLibrary,
  onCreate,
}: {
  onOpenItem: (item: LibraryItem) => void;
  onOpenLibrary: () => void;
  onCreate: () => void;
}) {
  const {
    items,
    ready,
    collections,
    setFavoritesOnly,
    setKindFilter,
    setQuery,
    setCollectionFilter,
    setShowArchived,
  } = useLibrary();

  const stats = useMemo(() => {
    const active = items.filter((i) => !i.archived);
    let copies = 0;
    let chars = 0;
    let words = 0;
    for (const item of active) {
      copies += item.copyCount ?? 0;
      chars += item.body.length;
      words += countWords(item.body);
      if (item.messages) {
        for (const m of item.messages) {
          chars += m.content.length;
          words += countWords(m.content);
        }
      }
    }
    return {
      prompts: active.length,
      copies,
      chars,
      words,
    };
  }, [items]);

  const services = useMemo(() => {
    const counts = new Map<AiModel, number>();
    for (const item of items) {
      if (item.archived) continue;
      for (const model of item.models) {
        counts.set(model, (counts.get(model) ?? 0) + 1);
      }
    }
    return SERVICE_ORDER.map((model) => ({
      model,
      count: counts.get(model) ?? 0,
    })).filter((s) => s.count > 0);
  }, [items]);

  const lastUsed = useMemo(() => {
    return (
      [...items]
        .filter((i) => !i.archived && i.lastUsedAt)
        .sort(
          (a, b) =>
            new Date(b.lastUsedAt!).getTime() -
            new Date(a.lastUsedAt!).getTime(),
        )[0] ?? null
    );
  }, [items]);

  const favorites = useMemo(
    () => items.filter((i) => i.favorite && !i.archived).slice(0, 6),
    [items],
  );

  const recentlyUsed = useMemo(
    () =>
      [...items]
        .filter((i) => !i.archived && i.lastUsedAt)
        .sort(
          (a, b) =>
            new Date(b.lastUsedAt!).getTime() -
            new Date(a.lastUsedAt!).getTime(),
        )
        .slice(0, 5),
    [items],
  );

  const mostUsed = useMemo(
    () =>
      [...items]
        .filter((i) => !i.archived && (i.copyCount ?? 0) > 0)
        .sort((a, b) => (b.copyCount ?? 0) - (a.copyCount ?? 0))
        .slice(0, 5),
    [items],
  );

  if (!ready) {
    return (
      <div className="home-dashboard" aria-busy="true">
        <section className="stat-grid" aria-label="Загрузка статистики">
          <div className="stat-card tone-blue skeleton-pulse" />
          <div className="stat-card tone-green skeleton-pulse" />
          <div className="stat-card tone-amber skeleton-pulse" />
          <div className="stat-card tone-ink skeleton-pulse" />
        </section>
        <div className="empty-strip skeleton-pulse">
          <p>Собираем обзор библиотеки…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-dashboard">
      <section className="stat-grid" aria-label="Статистика библиотеки">
        <article className="stat-card tone-blue">
          <span className="stat-icon" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M7 3.5h7.2L19 8.3V20a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 20V5A1.5 1.5 0 0 1 7.5 3.5" />
              <path d="M14 3.5V8h5" />
            </svg>
          </span>
          <strong className="stat-value">{stats.prompts}</strong>
          <span className="stat-label">Всего промптов</span>
        </article>
        <article className="stat-card tone-green">
          <span className="stat-icon" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <rect x="8" y="7" width="11" height="13" rx="2" />
              <path d="M6 16V6a2 2 0 0 1 2-2h8" />
            </svg>
          </span>
          <strong className="stat-value">{stats.copies}</strong>
          <span className="stat-label">Всего копирований</span>
        </article>
        <article className="stat-card tone-amber">
          <span className="stat-icon" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M5 19V5h3.2c1.8 0 3.1 1.2 3.1 2.9S10 10.8 8.2 10.8H5" />
              <path d="M14 19v-7.5c0-1.7 1.1-2.9 2.8-2.9H19" />
            </svg>
          </span>
          <strong className="stat-value">{stats.chars.toLocaleString("ru-RU")}</strong>
          <span className="stat-label">Символов</span>
        </article>
        <article className="stat-card tone-ink">
          <span className="stat-icon" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M5 7h14M5 12h10M5 17h12" />
            </svg>
          </span>
          <strong className="stat-value">{stats.words.toLocaleString("ru-RU")}</strong>
          <span className="stat-label">Слов</span>
        </article>
      </section>

      {services.length > 0 ? (
        <section className="home-section" aria-labelledby="top-services-title">
          <div className="section-head">
            <h2 id="top-services-title">Топ сервисы</h2>
            <button type="button" className="text-link" onClick={onOpenLibrary}>
              В библиотеку
            </button>
          </div>
          <div className="service-row">
            {services.map((service, index) => (
              <button
                key={service.model}
                type="button"
                className={`service-tile service-${service.model.toLowerCase()}`}
                style={{ animationDelay: `${0.05 * index}s` }}
                onClick={() => {
                  const match = collections.find(
                    (c) =>
                      c.name === service.model ||
                      c.slug === service.model.toLowerCase(),
                  );
                  setKindFilter("all");
                  setFavoritesOnly(false);
                  setShowArchived(false);
                  if (match) {
                    setCollectionFilter(match.id);
                    setQuery("");
                  } else {
                    setCollectionFilter("all");
                    setQuery(service.model);
                  }
                  onOpenLibrary();
                }}
              >
                <span className="service-badge">{service.count}</span>
                <span className="service-mark" aria-hidden>
                  {service.model.slice(0, 1)}
                </span>
                <span className="service-name">{service.model}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {lastUsed ? (
        <section className="home-section" aria-labelledby="last-used-title">
          <div className="section-head">
            <h2 id="last-used-title">Последний</h2>
          </div>
          <button
            type="button"
            className="last-used-card"
            onClick={() => onOpenItem(lastUsed)}
          >
            <div>
              <strong>{lastUsed.title}</strong>
              <p>
                <span>{KIND_LABELS[lastUsed.kind]}</span>
                {lastUsed.models[0] ? (
                  <span className="inline-model">{lastUsed.models[0]}</span>
                ) : null}
              </p>
            </div>
            <span className="chevron" aria-hidden>
              →
            </span>
          </button>
        </section>
      ) : null}

      <section className="home-section" aria-labelledby="favorites-title">
        <div className="section-head">
          <h2 id="favorites-title">Избранное</h2>
          <button
            type="button"
            className="text-link"
            onClick={() => {
              setFavoritesOnly(true);
              onOpenLibrary();
            }}
          >
            Все ★
          </button>
        </div>
        {favorites.length ? (
          <div className="favorites-grid">
            {favorites.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className="favorite-card"
                style={{ animationDelay: `${0.04 * index}s` }}
                onClick={() => onOpenItem(item)}
              >
                <strong>{item.title}</strong>
                <span className="favorite-meta">
                  {item.models[0] ?? KIND_LABELS[item.kind]}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-strip">
            <p>Пока нет избранного — отметьте ★ в библиотеке.</p>
            <button type="button" className="btn btn-ghost" onClick={onCreate}>
              Создать промпт
            </button>
          </div>
        )}
      </section>

      <div className="home-lists">
        <section className="home-section list-panel" aria-labelledby="recent-title">
          <div className="section-head">
            <h2 id="recent-title">Недавние</h2>
          </div>
          {recentlyUsed.length ? (
            <ul className="usage-list">
              {recentlyUsed.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => onOpenItem(item)}>
                    <span>
                      <strong>{item.title}</strong>
                      <em>{KIND_LABELS[item.kind]}</em>
                    </span>
                    <span className="usage-meta">{relativeTime(item.lastUsedAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-inline">Скопируйте промпт — он появится здесь.</p>
          )}
        </section>

        <section className="home-section list-panel" aria-labelledby="most-title">
          <div className="section-head">
            <h2 id="most-title">Популярные</h2>
          </div>
          {mostUsed.length ? (
            <ul className="usage-list">
              {mostUsed.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => onOpenItem(item)}>
                    <span>
                      <strong>{item.title}</strong>
                      <em>{KIND_LABELS[item.kind]}</em>
                    </span>
                    <span className="usage-meta">×{item.copyCount ?? 0}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-inline">Статистика появится после копирований.</p>
          )}
        </section>
      </div>
    </div>
  );
}
