"use client";

import { AiFoldersBar } from "@/components/AiFoldersBar";
import { useLibrary } from "@/lib/library-context";
import { KIND_LABELS, KIND_ORDER, type ItemKind } from "@/lib/types";

export function Toolbar({
  onCreate,
  onImportClick,
}: {
  onCreate: (kind?: ItemKind) => void;
  onImportClick: () => void;
}) {
  const {
    query,
    setQuery,
    kindFilter,
    setKindFilter,
    tagFilter,
    setTagFilter,
    sort,
    setSort,
    exportJson,
    filteredItems,
    items,
    allTags,
  } = useLibrary();

  async function handleExport() {
    try {
      const json = await exportJson();
      const blob = new Blob([json], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cuebox-library-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Экспорт не удался");
    }
  }

  return (
    <section className="toolbar" aria-label="Фильтры библиотеки">
      <AiFoldersBar />

      <div className="toolbar-row">
        <label className="search-field">
          <span className="sr-only">Поиск</span>
          <span className="search-icon" aria-hidden>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor">
              <circle cx="7" cy="7" r="4.5" strokeWidth="1.5" />
              <path
                d="M10.5 10.5 14 14"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <input
            id="library-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по названию, тексту, тегам, моделям…"
            type="search"
          />
        </label>

        <div className="toolbar-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => void handleExport()}
          >
            Экспорт
          </button>
          <button type="button" className="btn btn-ghost" onClick={onImportClick}>
            Импорт
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onCreate("prompt")}
          >
            Новый элемент
          </button>
        </div>
      </div>

      <div className="toolbar-row toolbar-meta">
        <div className="kind-tabs" role="tablist" aria-label="Тип">
          <button
            type="button"
            role="tab"
            aria-selected={kindFilter === "all"}
            className={kindFilter === "all" ? "kind-tab active" : "kind-tab"}
            onClick={() => setKindFilter("all")}
          >
            Все
          </button>
          {KIND_ORDER.map((kind) => (
            <button
              key={kind}
              type="button"
              role="tab"
              aria-selected={kindFilter === kind}
              className={kindFilter === kind ? "kind-tab active" : "kind-tab"}
              onClick={() => setKindFilter(kind)}
            >
              {KIND_LABELS[kind]}
            </button>
          ))}
        </div>

        <div className="toolbar-side">
          <label className="sort-field">
            <span>Сортировка</span>
            <select
              value={sort}
              onChange={(e) =>
                setSort(
                  e.target.value as
                    | "updated"
                    | "created"
                    | "title"
                    | "usage",
                )
              }
            >
              <option value="updated">По обновлению</option>
              <option value="created">По созданию</option>
              <option value="title">По названию</option>
              <option value="usage">По использованию</option>
            </select>
          </label>

          <p className="count-line">
            {filteredItems.length} из {items.length}
          </p>
        </div>
      </div>

      {allTags.length ? (
        <div className="tag-filter" aria-label="Теги">
          <button
            type="button"
            className={tagFilter === "all" ? "tag-chip active" : "tag-chip"}
            onClick={() => setTagFilter("all")}
          >
            Все теги
          </button>
          {allTags.slice(0, 12).map((tag) => (
            <button
              key={tag}
              type="button"
              className={tagFilter === tag ? "tag-chip active" : "tag-chip"}
              onClick={() => setTagFilter(tagFilter === tag ? "all" : tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      ) : null}

      <p className="kbd-hint">
        <kbd>/</kbd> поиск · <kbd>N</kbd> создать · <kbd>C</kbd> копировать ·{" "}
        <kbd>D</kbd> дублировать · <kbd>E</kbd> изменить · <kbd>F</kbd> избранное
      </p>
    </section>
  );
}
