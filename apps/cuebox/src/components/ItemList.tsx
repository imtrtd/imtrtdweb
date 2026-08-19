"use client";

import { useLibrary } from "@/lib/library-context";
import { itemPlainText } from "@/lib/storage";
import { KIND_LABELS, type LibraryItem } from "@/lib/types";

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

export function ItemList({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (item: LibraryItem) => void;
}) {
  const { filteredItems, ready, toggleFavorite, recordCopy } = useLibrary();

  if (!ready) {
    return <div className="list-empty">Загрузка библиотеки…</div>;
  }

  if (!filteredItems.length) {
    return (
      <div className="list-empty">
        <p>Ничего не найдено.</p>
        <p className="muted">Измените фильтр или создайте новый элемент.</p>
      </div>
    );
  }

  return (
    <ul className="item-list" role="listbox" aria-label="Элементы библиотеки">
      {filteredItems.map((item, index) => {
        const active = item.id === selectedId;
        return (
          <li key={item.id}>
            <button
              type="button"
              role="option"
              aria-selected={active}
              className={active ? "item-row active" : "item-row"}
              style={{ animationDelay: `${Math.min(index, 12) * 0.035}s` }}
              onClick={() => onSelect(item)}
            >
              <div className="item-row-top">
                <span className={`kind-badge kind-${item.kind}`}>
                  {KIND_LABELS[item.kind]}
                </span>
                <span className="item-date">{formatDate(item.updatedAt)}</span>
              </div>
              <div className="item-row-title">{item.title}</div>
              <p className="item-row-preview">{item.body}</p>
              <div className="item-row-bottom">
                <div className="tag-row">
                  {item.preset?.plugin ? (
                    <span className="tag">{item.preset.plugin}</span>
                  ) : null}
                  {item.preset?.pluginType && item.preset.pluginType !== "other" ? (
                    <span className="tag">{item.preset.pluginType}</span>
                  ) : null}
                  {item.archived ? (
                    <span className="tag">архив</span>
                  ) : null}
                  {(item.copyCount ?? 0) > 0 ? (
                    <span className="tag">{`×${item.copyCount}`}</span>
                  ) : null}
                  {item.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="row-ops">
                  <span
                    className="row-copy"
                    role="button"
                    tabIndex={0}
                    aria-label="Копировать"
                    onClick={(e) => {
                      e.stopPropagation();
                      void (async () => {
                        try {
                          await navigator.clipboard.writeText(
                            itemPlainText(item),
                          );
                          await recordCopy(item.id);
                        } catch {
                          /* clipboard may be blocked */
                        }
                      })();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        e.currentTarget.click();
                      }
                    }}
                  >
                    ⎘
                  </span>
                  <span
                    className={item.favorite ? "fav on" : "fav"}
                    role="button"
                    tabIndex={0}
                    aria-label={
                      item.favorite ? "Убрать из избранного" : "В избранное"
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(item.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleFavorite(item.id);
                      }
                    }}
                  >
                    ★
                  </span>
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
