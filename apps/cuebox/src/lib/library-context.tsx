"use client";

import { useSession } from "next-auth/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  apiCreateCollection,
  apiCreateItem,
  apiDeleteCollection,
  apiDeleteItem,
  apiExportItems,
  apiImportItems,
  apiListCollections,
  apiListItems,
  apiUpdateCollection,
  apiUpdateItem,
} from "@/lib/api";
import {
  collectionSubtreeIds,
  knownCollectionId,
  sortCollectionsByDepth,
} from "@/lib/collections";
import { SEED_COLLECTIONS, SEED_ITEMS } from "@/lib/seed";
import {
  createCollection as createLocalCollection,
  createItem,
  deleteCollectionTree,
  deleteItem,
  exportLibraryJson,
  importLibraryJson,
  loadCollections,
  loadLibrary,
  mergeLibraryItems,
  renameCollection as renameLocalCollection,
  saveCollections,
  saveLibrary,
  updateItem,
} from "@/lib/storage";
import type {
  Collection,
  ItemDraft,
  ItemKind,
  LibraryItem,
} from "@/lib/types";

type SortMode = "updated" | "created" | "title" | "usage";

interface LibraryState {
  mode: "local" | "cloud";
  items: LibraryItem[];
  collections: Collection[];
  ready: boolean;
  loading: boolean;
  query: string;
  kindFilter: ItemKind | "all";
  collectionFilter: string | "all" | "none";
  tagFilter: string | "all";
  favoritesOnly: boolean;
  showArchived: boolean;
  sort: SortMode;
  allTags: string[];
  setQuery: (value: string) => void;
  setKindFilter: (value: ItemKind | "all") => void;
  setCollectionFilter: (value: string | "all" | "none") => void;
  setTagFilter: (value: string | "all") => void;
  setFavoritesOnly: (value: boolean) => void;
  setShowArchived: (value: boolean) => void;
  setSort: (value: SortMode) => void;
  addItem: (draft: ItemDraft) => Promise<LibraryItem>;
  editItem: (
    id: string,
    patch: Partial<ItemDraft> & {
      favorite?: boolean;
      archived?: boolean;
      incrementCopy?: boolean;
    },
  ) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  duplicateItem: (id: string) => Promise<LibraryItem | null>;
  toggleFavorite: (id: string) => Promise<void>;
  toggleArchived: (id: string) => Promise<void>;
  recordCopy: (id: string) => Promise<void>;
  resetToSeed: () => void;
  exportJson: () => Promise<string>;
  importJson: (raw: string) => Promise<void>;
  refresh: () => Promise<void>;
  importLocalToCloud: () => Promise<number>;
  addCollection: (
    name: string,
    parentId?: string | null,
  ) => Promise<Collection | null>;
  renameCollection: (id: string, name: string) => Promise<void>;
  removeCollection: (id: string) => Promise<void>;
  filteredItems: LibraryItem[];
  localItemCount: number;
}

const LibraryContext = createContext<LibraryState | null>(null);

type UiSnapshot = {
  query: string;
  kindFilter: ItemKind | "all";
  collectionFilter: string | "all" | "none";
  tagFilter: string | "all";
  favoritesOnly: boolean;
  showArchived: boolean;
  sort: SortMode;
};

let uiSnapshot: UiSnapshot = {
  query: "",
  kindFilter: "all",
  collectionFilter: "all",
  tagFilter: "all",
  favoritesOnly: false,
  showArchived: false,
  sort: "updated",
};

const uiListeners = new Set<() => void>();

function subscribeUi(listener: () => void) {
  uiListeners.add(listener);
  return () => uiListeners.delete(listener);
}

function patchUi(patch: Partial<UiSnapshot>) {
  uiSnapshot = { ...uiSnapshot, ...patch };
  for (const listener of uiListeners) listener();
}

function useUiState() {
  return useSyncExternalStore(subscribeUi, () => uiSnapshot, () => uiSnapshot);
}

function peekLocalCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    return loadLibrary().length;
  } catch {
    return 0;
  }
}

function sortByName(collections: Collection[]): Collection[] {
  return [...collections].sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const authed = Boolean(session?.user?.id);
  const mode: "local" | "cloud" = authed ? "cloud" : "local";

  const [items, setItems] = useState<LibraryItem[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localItemCount, setLocalItemCount] = useState(0);
  const ui = useUiState();

  useEffect(() => {
    const local = loadLibrary();
    const localCollections = loadCollections();
    /* eslint-disable react-hooks/set-state-in-effect -- intentional local hydration */
    setItems(local);
    setCollections(localCollections);
    setLocalItemCount(local.length);
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const refresh = useCallback(async () => {
    if (status === "loading") return;
    setLoading(true);
    try {
      if (authed) {
        const [cloudItems, cloudCollections] = await Promise.all([
          apiListItems(true),
          apiListCollections(),
        ]);
        setItems(cloudItems);
        setCollections(cloudCollections);
        setLocalItemCount(peekLocalCount());
      } else {
        const local = loadLibrary();
        setItems(local);
        setCollections(loadCollections());
        setLocalItemCount(local.length);
      }
      setReady(true);
    } catch {
      const local = loadLibrary();
      setItems(local);
      setCollections(loadCollections());
      setLocalItemCount(local.length);
      setReady(true);
    } finally {
      setLoading(false);
    }
  }, [authed, status]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional remote/local hydration
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (mode !== "local" || !ready) return;
    saveLibrary(items);
  }, [items, mode, ready]);

  useEffect(() => {
    if (mode !== "local" || !ready) return;
    saveCollections(collections);
  }, [collections, mode, ready]);

  const addItem = useCallback(
    async (draft: ItemDraft) => {
      if (mode === "cloud") {
        const item = await apiCreateItem(draft);
        setItems((prev) => [item, ...prev]);
        return item;
      }
      const item = createItem(draft);
      setItems((prev) => [item, ...prev]);
      return item;
    },
    [mode],
  );

  const editItem = useCallback(
    async (
      id: string,
      patch: Partial<ItemDraft> & {
        favorite?: boolean;
        archived?: boolean;
        incrementCopy?: boolean;
      },
    ) => {
      if (mode === "cloud") {
        const item = await apiUpdateItem(id, patch);
        setItems((prev) => prev.map((row) => (row.id === id ? item : row)));
        return;
      }
      setItems((prev) => updateItem(prev, id, patch));
    },
    [mode],
  );

  const removeItem = useCallback(
    async (id: string) => {
      if (mode === "cloud") {
        await apiDeleteItem(id);
        setItems((prev) => prev.filter((row) => row.id !== id));
        return;
      }
      setItems((prev) => deleteItem(prev, id));
    },
    [mode],
  );

  const duplicateItem = useCallback(
    async (id: string) => {
      const current = items.find((item) => item.id === id);
      if (!current) return null;
      return addItem({
        kind: current.kind,
        title: `${current.title} (копия)`,
        body: current.body,
        tags: current.tags,
        messages: current.messages,
        models: current.models,
        preset: current.preset,
        variableDefs: current.variableDefs,
        variants: current.variants,
        activeVariantId: current.activeVariantId,
        collectionId: current.collectionId,
        archived: false,
        favorite: false,
      });
    },
    [addItem, items],
  );

  const toggleFavorite = useCallback(
    async (id: string) => {
      const current = items.find((item) => item.id === id);
      if (!current) return;
      await editItem(id, { favorite: !current.favorite });
    },
    [editItem, items],
  );

  const toggleArchived = useCallback(
    async (id: string) => {
      const current = items.find((item) => item.id === id);
      if (!current) return;
      await editItem(id, { archived: !current.archived });
    },
    [editItem, items],
  );

  const recordCopy = useCallback(
    async (id: string) => {
      await editItem(id, { incrementCopy: true });
    },
    [editItem],
  );

  const resetToSeed = useCallback(() => {
    if (mode === "cloud") return;
    setItems(SEED_ITEMS);
    setCollections(SEED_COLLECTIONS);
    saveLibrary(SEED_ITEMS);
    saveCollections(SEED_COLLECTIONS);
    patchUi({
      collectionFilter: "all",
      tagFilter: "all",
      favoritesOnly: false,
      showArchived: false,
      query: "",
    });
  }, [mode]);

  const exportJson = useCallback(async () => {
    if (mode === "cloud") {
      const cloud = await apiExportItems();
      return exportLibraryJson(cloud);
    }
    return exportLibraryJson(items);
  }, [items, mode]);

  const importJson = useCallback(
    async (raw: string) => {
      const parsed = importLibraryJson(raw);
      if (mode === "cloud") {
        await apiImportItems(parsed, false);
        await refresh();
        return;
      }
      setItems((prev) => mergeLibraryItems(prev, parsed));
    },
    [mode, refresh],
  );

  const importLocalToCloud = useCallback(async () => {
    if (mode !== "cloud") return 0;
    const localItems = loadLibrary();
    const localCollections = loadCollections();
    if (!localItems.length) return 0;

    const cloudCollections = await apiListCollections();
    const idMap = new Map<string, string>();
    for (const local of sortCollectionsByDepth(localCollections)) {
      const bySlug = local.slug
        ? cloudCollections.find((c) => c.slug === local.slug)
        : undefined;
      if (bySlug) {
        idMap.set(local.id, bySlug.id);
        continue;
      }
      const parentId = local.parentId
        ? (idMap.get(local.parentId) ?? null)
        : null;
      const created = await apiCreateCollection(local.name, parentId);
      idMap.set(local.id, created.id);
      cloudCollections.push(created);
    }

    const remapped = localItems.map((item) => ({
      ...item,
      collectionId: item.collectionId
        ? (idMap.get(item.collectionId) ?? null)
        : null,
    }));
    const created = await apiImportItems(remapped, false);
    await refresh();
    return created.length;
  }, [mode, refresh]);

  const addCollection = useCallback(
    async (name: string, parentId?: string | null) => {
      if (mode === "cloud") {
        const collection = await apiCreateCollection(name, parentId);
        setCollections((prev) => sortByName([...prev, collection]));
        return collection;
      }
      const collection = createLocalCollection(collections, name, parentId);
      setCollections((prev) => sortByName([...prev, collection]));
      return collection;
    },
    [collections, mode],
  );

  const renameCollection = useCallback(
    async (id: string, name: string) => {
      if (mode === "cloud") {
        const updated = await apiUpdateCollection(id, name);
        setCollections((prev) =>
          prev.map((row) => (row.id === id ? updated : row)),
        );
        return;
      }
      setCollections((prev) => renameLocalCollection(prev, id, name));
    },
    [mode],
  );

  const removeCollection = useCallback(
    async (id: string) => {
      const removedIds = collectionSubtreeIds(id, collections);
      if (mode === "cloud") {
        await apiDeleteCollection(id);
      } else {
        setCollections((prev) => deleteCollectionTree(prev, id).collections);
      }
      if (mode === "cloud") {
        setCollections((prev) => prev.filter((c) => !removedIds.has(c.id)));
      }
      setItems((prev) =>
        prev.map((item) =>
          item.collectionId && removedIds.has(item.collectionId)
            ? { ...item, collectionId: null }
            : item,
        ),
      );
      if (
        ui.collectionFilter !== "all" &&
        ui.collectionFilter !== "none" &&
        removedIds.has(ui.collectionFilter)
      ) {
        patchUi({ collectionFilter: "all" });
      }
    },
    [collections, mode, ui.collectionFilter],
  );

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      if (item.archived) continue;
      for (const tag of item.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return [...counts.keys()].sort((a, b) => {
      const diff = (counts.get(b) ?? 0) - (counts.get(a) ?? 0);
      return diff !== 0 ? diff : a.localeCompare(b, "ru");
    });
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = ui.query.trim().toLowerCase();
    const subtree =
      ui.collectionFilter !== "all" && ui.collectionFilter !== "none"
        ? collectionSubtreeIds(ui.collectionFilter, collections)
        : null;
    const list = items.filter((item) => {
      if (!ui.showArchived && item.archived) return false;
      if (ui.showArchived && !item.archived) return false;
      if (ui.kindFilter !== "all" && item.kind !== ui.kindFilter) return false;
      if (ui.favoritesOnly && !item.favorite) return false;
      if (ui.tagFilter !== "all" && !item.tags.includes(ui.tagFilter)) {
        return false;
      }
      const folderId = knownCollectionId(collections, item.collectionId);
      if (ui.collectionFilter === "none" && folderId) return false;
      if (subtree && (!folderId || !subtree.has(folderId))) return false;
      if (!q) return true;
      const haystack = [
        item.title,
        item.body,
        item.tags.join(" "),
        item.models.join(" "),
        item.preset?.plugin ?? "",
        item.preset?.pluginType ?? "",
        ...(item.messages?.map((m) => m.content) ?? []),
      ]
        .join("\n")
        .toLowerCase();
      return haystack.includes(q);
    });

    return [...list].sort((a, b) => {
      if (ui.sort === "title") {
        return a.title.localeCompare(b.title, "ru");
      }
      if (ui.sort === "usage") {
        return (b.copyCount ?? 0) - (a.copyCount ?? 0);
      }
      const left = ui.sort === "created" ? a.createdAt : a.updatedAt;
      const right = ui.sort === "created" ? b.createdAt : b.updatedAt;
      return right.localeCompare(left);
    });
  }, [collections, items, ui]);

  const value: LibraryState = {
    mode,
    items,
    collections,
    ready,
    loading,
    query: ui.query,
    kindFilter: ui.kindFilter,
    collectionFilter: ui.collectionFilter,
    tagFilter: ui.tagFilter,
    favoritesOnly: ui.favoritesOnly,
    showArchived: ui.showArchived,
    sort: ui.sort,
    allTags,
    setQuery: (query) => patchUi({ query }),
    setKindFilter: (kindFilter) => patchUi({ kindFilter }),
    setCollectionFilter: (collectionFilter) => patchUi({ collectionFilter }),
    setTagFilter: (tagFilter) => patchUi({ tagFilter }),
    setFavoritesOnly: (favoritesOnly) => patchUi({ favoritesOnly }),
    setShowArchived: (showArchived) => patchUi({ showArchived }),
    setSort: (sort) => patchUi({ sort }),
    addItem,
    editItem,
    removeItem,
    duplicateItem,
    toggleFavorite,
    toggleArchived,
    recordCopy,
    resetToSeed,
    exportJson,
    importJson,
    refresh,
    importLocalToCloud,
    addCollection,
    renameCollection,
    removeCollection,
    filteredItems,
    localItemCount,
  };

  return (
    <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
  );
}

export function useLibrary(): LibraryState {
  const ctx = useContext(LibraryContext);
  if (!ctx) {
    throw new Error("useLibrary must be used within LibraryProvider");
  }
  return ctx;
}
