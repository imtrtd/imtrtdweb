"use client";

import { useMemo } from "react";
import { AiServiceIcon } from "@/components/AiServiceIcon";
import { AI_FOLDER_SEEDS } from "@/lib/ai-folders";
import { useLibrary } from "@/lib/library-context";
import type { Collection } from "@/lib/types";

function folderSlug(collection: Collection): string | null {
  if (collection.slug) return collection.slug;
  const match = AI_FOLDER_SEEDS.find(
    (s) => s.name.toLowerCase() === collection.name.toLowerCase(),
  );
  return match?.slug ?? null;
}

function sortFolders(folders: Collection[]): Collection[] {
  return [...folders].sort((a, b) => {
    const aiA = AI_FOLDER_SEEDS.findIndex((s) => s.slug === a.slug);
    const aiB = AI_FOLDER_SEEDS.findIndex((s) => s.slug === b.slug);
    const rank = (folder: Collection, aiIndex: number) => {
      if (aiIndex >= 0) return aiIndex;
      if (folder.slug === "presets") return 50;
      return 100;
    };
    const diff = rank(a, aiA) - rank(b, aiB);
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name, "ru");
  });
}

export function FolderSidebar() {
  const {
    items,
    collections,
    collectionFilter,
    favoritesOnly,
    showArchived,
    setCollectionFilter,
    setFavoritesOnly,
    setShowArchived,
    addCollection,
    renameCollection,
    removeCollection,
  } = useLibrary();

  const counts = useMemo(() => {
    // Build a parent lookup once: O(collections)
    const parentOf = new Map<string, string | null>(
      collections.map((c) => [c.id, c.parentId ?? null]),
    );

    const active = items.filter((item) => !item.archived);
    const byFolder = new Map<string, number>();

    // For each active item walk its ancestor chain: O(items * depth)
    for (const item of active) {
      let cur: string | null | undefined = item.collectionId;
      let guard = 0;
      while (cur && parentOf.has(cur) && guard < 8) {
        byFolder.set(cur, (byFolder.get(cur) ?? 0) + 1);
        cur = parentOf.get(cur);
        guard += 1;
      }
    }

    return {
      all: active.length,
      favorites: active.filter((item) => item.favorite).length,
      archived: items.filter((item) => item.archived).length,
      none: active.filter((item) => !item.collectionId).length,
      byFolder,
    };
  }, [collections, items]);

  const allActive =
    collectionFilter === "all" && !favoritesOnly && !showArchived;
  const favoritesActive = favoritesOnly && !showArchived;
  const archiveActive = showArchived;
  const noneActive =
    collectionFilter === "none" && !favoritesOnly && !showArchived;

  function selectSmart(
    next: "all" | "favorites" | "archive" | "none",
  ) {
    if (next === "favorites") {
      setCollectionFilter("all");
      setFavoritesOnly(true);
      setShowArchived(false);
      return;
    }
    if (next === "archive") {
      setCollectionFilter("all");
      setFavoritesOnly(false);
      setShowArchived(true);
      return;
    }
    setCollectionFilter(next);
    setFavoritesOnly(false);
    setShowArchived(false);
  }

  function selectFolder(id: string) {
    setCollectionFilter(id);
    setFavoritesOnly(false);
    setShowArchived(false);
  }

  async function handleAdd(parentId?: string | null) {
    const name = window.prompt(
      parentId ? "Название вложенной папки" : "Название папки",
    );
    if (!name?.trim()) return;
    try {
      const created = await addCollection(name.trim(), parentId);
      if (created) selectFolder(created.id);
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Не удалось создать папку",
      );
    }
  }

  async function handleRename(collection: Collection) {
    const name = window.prompt("Новое название папки", collection.name);
    if (!name?.trim() || name.trim() === collection.name) return;
    try {
      await renameCollection(collection.id, name.trim());
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Не удалось переименовать",
      );
    }
  }

  async function handleDelete(collection: Collection) {
    if (!window.confirm(`Удалить папку «${collection.name}» и вложенные?`)) {
      return;
    }
    try {
      await removeCollection(collection.id);
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Не удалось удалить папку",
      );
    }
  }

  const roots = sortFolders(
    collections.filter((c) => !c.parentId),
  );

  return (
    <aside className="folder-pane" aria-label="Папки">
      <div className="pane-label">Папки</div>
      <nav className="folder-nav">
        <button
          type="button"
          className={allActive ? "folder-row active" : "folder-row"}
          onClick={() => selectSmart("all")}
        >
          <span className="folder-ico" aria-hidden>
            ▦
          </span>
          <span className="folder-name">Все</span>
          <span className="folder-count">{counts.all}</span>
        </button>
        <button
          type="button"
          className={favoritesActive ? "folder-row active" : "folder-row"}
          onClick={() => selectSmart("favorites")}
        >
          <span className="folder-ico" aria-hidden>
            ★
          </span>
          <span className="folder-name">Избранное</span>
          <span className="folder-count">{counts.favorites}</span>
        </button>
        <button
          type="button"
          className={noneActive ? "folder-row active" : "folder-row"}
          onClick={() => selectSmart("none")}
        >
          <span className="folder-ico" aria-hidden>
            ○
          </span>
          <span className="folder-name">Без папки</span>
          <span className="folder-count">{counts.none}</span>
        </button>
        <button
          type="button"
          className={archiveActive ? "folder-row active" : "folder-row"}
          onClick={() => selectSmart("archive")}
        >
          <span className="folder-ico" aria-hidden>
            ▭
          </span>
          <span className="folder-name">Архив</span>
          <span className="folder-count">{counts.archived}</span>
        </button>

        <div className="folder-section-head">
          <span>Коллекции</span>
          <button
            type="button"
            className="folder-add"
            onClick={() => void handleAdd(null)}
          >
            + Папка
          </button>
        </div>

        {roots.length ? (
          <ul className="folder-tree">
            {roots.map((folder) => (
              <FolderNode
                key={folder.id}
                folder={folder}
                collections={collections}
                depth={0}
                activeId={
                  !favoritesOnly && !showArchived && collectionFilter !== "all"
                    ? collectionFilter
                    : null
                }
                counts={counts.byFolder}
                onSelect={selectFolder}
                onAddChild={(id) => void handleAdd(id)}
                onRename={(c) => void handleRename(c)}
                onDelete={(c) => void handleDelete(c)}
              />
            ))}
          </ul>
        ) : (
          <p className="folder-empty">Пока нет папок — создайте первую.</p>
        )}
      </nav>
    </aside>
  );
}

function FolderNode({
  folder,
  collections,
  depth,
  activeId,
  counts,
  onSelect,
  onAddChild,
  onRename,
  onDelete,
}: {
  folder: Collection;
  collections: Collection[];
  depth: number;
  activeId: string | "none" | null;
  counts: Map<string, number>;
  onSelect: (id: string) => void;
  onAddChild: (id: string) => void;
  onRename: (folder: Collection) => void;
  onDelete: (folder: Collection) => void;
}) {
  const children = sortFolders(
    collections.filter((c) => c.parentId === folder.id),
  );
  const slug = folderSlug(folder);
  const active = activeId === folder.id;

  return (
    <li>
      <div className={active ? "folder-row active" : "folder-row"}>
        <button
          type="button"
          className="folder-main"
          style={{ paddingLeft: `${0.55 + depth * 0.85}rem` }}
          onClick={() => onSelect(folder.id)}
          title={folder.name}
        >
          {slug && slug !== "presets" ? (
            <AiServiceIcon slug={slug} />
          ) : (
            <span className="folder-ico" aria-hidden>
              {folder.externalUrl ? "↗" : "▣"}
            </span>
          )}
          <span className="folder-name">{folder.name}</span>
          <span className="folder-count">{counts.get(folder.id) ?? 0}</span>
        </button>
        <span className="folder-ops">
          {folder.externalUrl ? (
            <a
              className="folder-op"
              href={folder.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={`Открыть ${folder.name}`}
              onClick={(e) => e.stopPropagation()}
            >
              ↗
            </a>
          ) : null}
          <button
            type="button"
            className="folder-op"
            title="Вложенная папка"
            onClick={() => onAddChild(folder.id)}
          >
            +
          </button>
          <button
            type="button"
            className="folder-op"
            title="Переименовать"
            onClick={() => onRename(folder)}
          >
            ✎
          </button>
          <button
            type="button"
            className="folder-op"
            title="Удалить"
            onClick={() => onDelete(folder)}
          >
            ×
          </button>
        </span>
      </div>
      {children.length ? (
        <ul className="folder-tree">
          {children.map((child) => (
            <FolderNode
              key={child.id}
              folder={child}
              collections={collections}
              depth={depth + 1}
              activeId={activeId}
              counts={counts}
              onSelect={onSelect}
              onAddChild={onAddChild}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
