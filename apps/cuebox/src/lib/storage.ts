import { AI_FOLDER_SEEDS } from "./ai-folders";
import { collectionSubtreeIds, parentChainLength } from "./collections";
import { isPromptCodexExport, promptCodexToItems } from "./promptcodex";
import {
  COLLECTIONS_KEY,
  SEED_COLLECTIONS,
  SEED_ITEMS,
  STORAGE_KEY,
} from "./seed";
import type { Collection, ItemDraft, LibraryItem } from "./types";

function nowIso(): string {
  return new Date().toISOString();
}

export function createId(prefix = "item"): string {
  const webCrypto = globalThis.crypto;
  let uuid: string;
  if (typeof webCrypto?.randomUUID === "function") {
    uuid = webCrypto.randomUUID();
  } else if (typeof webCrypto?.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    webCrypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  } else {
    uuid = `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
  }
  return `${prefix}-${uuid}`;
}

function normalizeItem(item: LibraryItem): LibraryItem {
  return {
    ...item,
    tags: normalizeTags(item.tags ?? []),
    favorite: Boolean(item.favorite),
    archived: Boolean(item.archived),
    copyCount: item.copyCount ?? 0,
    lastUsedAt: item.lastUsedAt ?? null,
    models: item.models ?? [],
    preset: item.preset ?? {},
    variableDefs: item.variableDefs ?? [],
    variants: item.variants ?? [],
    activeVariantId: item.activeVariantId ?? null,
    collectionId: item.collectionId ?? null,
  };
}

export function loadLibrary(): LibraryItem[] {
  if (typeof window === "undefined") {
    return SEED_ITEMS.map(normalizeItem);
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = SEED_ITEMS.map(normalizeItem);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as LibraryItem[];
    if (!Array.isArray(parsed)) {
      return SEED_ITEMS.map(normalizeItem);
    }
    return parsed.map(normalizeItem);
  } catch {
    return SEED_ITEMS.map(normalizeItem);
  }
}

export function saveLibrary(items: LibraryItem[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function createItem(draft: ItemDraft): LibraryItem {
  const stamp = nowIso();
  return normalizeItem({
    id: createId(),
    kind: draft.kind,
    title: draft.title.trim(),
    body: draft.body.trim(),
    tags: normalizeTags(draft.tags),
    messages: draft.messages,
    favorite: Boolean(draft.favorite),
    archived: Boolean(draft.archived),
    copyCount: 0,
    lastUsedAt: null,
    models: draft.models ?? [],
    preset: draft.preset ?? {},
    variableDefs: draft.variableDefs ?? [],
    variants: draft.variants ?? [],
    activeVariantId: draft.activeVariantId ?? null,
    collectionId: draft.collectionId ?? null,
    createdAt: stamp,
    updatedAt: stamp,
  });
}

export function updateItem(
  items: LibraryItem[],
  id: string,
  patch: Partial<ItemDraft> & {
    favorite?: boolean;
    archived?: boolean;
    incrementCopy?: boolean;
  },
): LibraryItem[] {
  return items.map((item) => {
    if (item.id !== id) return item;
    const next = {
      ...item,
      ...patch,
      title: patch.title !== undefined ? patch.title.trim() : item.title,
      body: patch.body !== undefined ? patch.body.trim() : item.body,
      tags: patch.tags !== undefined ? normalizeTags(patch.tags) : item.tags,
      updatedAt: nowIso(),
    };
    if (patch.incrementCopy) {
      next.copyCount = (item.copyCount ?? 0) + 1;
      next.lastUsedAt = nowIso();
    }
    delete (next as { incrementCopy?: boolean }).incrementCopy;
    return normalizeItem(next);
  });
}

export function deleteItem(items: LibraryItem[], id: string): LibraryItem[] {
  return items.filter((item) => item.id !== id);
}

export function exportLibraryJson(items: LibraryItem[]): string {
  return JSON.stringify(items, null, 2);
}

export function importLibraryJson(raw: string): LibraryItem[] {
  const parsed: unknown = JSON.parse(raw);
  if (isPromptCodexExport(parsed)) {
    return promptCodexToItems(parsed).map(normalizeItem);
  }
  if (!Array.isArray(parsed)) {
    throw new Error(
      "Ожидался массив элементов библиотеки или экспорт PromptCodex",
    );
  }
  return (parsed as LibraryItem[]).map(normalizeItem);
}

/** Incoming items win on id conflict; everything else is kept. */
export function mergeLibraryItems(
  current: LibraryItem[],
  incoming: LibraryItem[],
): LibraryItem[] {
  const byId = new Map(incoming.map((item) => [item.id, item]));
  const merged = current.map((item) => byId.get(item.id) ?? item);
  const existing = new Set(current.map((item) => item.id));
  return [...incoming.filter((item) => !existing.has(item.id)), ...merged];
}

function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tag of tags) {
    const clean = tag.trim().toLowerCase();
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    result.push(clean);
  }
  return result;
}

export function itemPlainText(item: LibraryItem): string {
  if (item.kind === "chat" && item.messages?.length) {
    return item.messages
      .map((m) => `${m.role.toUpperCase()}:\n${m.content}`)
      .join("\n\n");
  }
  if (item.activeVariantId) {
    const variant = item.variants.find((v) => v.id === item.activeVariantId);
    if (variant) return variant.body;
  }
  return item.body;
}

function normalizeCollection(collection: Collection): Collection {
  return {
    ...collection,
    parentId: collection.parentId ?? null,
    slug: collection.slug ?? null,
    externalUrl: collection.externalUrl ?? null,
  };
}

function ensureLocalAiFolders(collections: Collection[]): Collection[] {
  const have = new Set(
    collections.map((c) => c.slug).filter((slug): slug is string => Boolean(slug)),
  );
  const missing = AI_FOLDER_SEEDS.filter((seed) => !have.has(seed.slug));
  if (!missing.length) return collections.map(normalizeCollection);
  const stamp = nowIso();
  return [
    ...collections.map(normalizeCollection),
    ...missing.map((seed) =>
      normalizeCollection({
        id: `local-folder-${seed.slug}`,
        name: seed.name,
        slug: seed.slug,
        externalUrl: seed.externalUrl,
        parentId: null,
        createdAt: stamp,
        updatedAt: stamp,
      }),
    ),
  ];
}

export function loadCollections(): Collection[] {
  if (typeof window === "undefined") {
    return SEED_COLLECTIONS.map(normalizeCollection);
  }

  try {
    const raw = window.localStorage.getItem(COLLECTIONS_KEY);
    if (!raw) {
      const seeded = SEED_COLLECTIONS.map(normalizeCollection);
      window.localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      const seeded = SEED_COLLECTIONS.map(normalizeCollection);
      window.localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const next = ensureLocalAiFolders(parsed as Collection[]);
    if (next.length !== (parsed as Collection[]).length) {
      window.localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(next));
    }
    return next;
  } catch {
    const seeded = SEED_COLLECTIONS.map(normalizeCollection);
    window.localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

export function saveCollections(collections: Collection[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(collections));
}

export function createCollection(
  collections: Collection[],
  name: string,
  parentId?: string | null,
): Collection {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Укажите название папки");
  }
  if (parentId) {
    const parent = collections.find((c) => c.id === parentId);
    if (!parent) {
      throw new Error("Родительская папка не найдена");
    }
    if (parentChainLength(collections, parentId) >= 5) {
      throw new Error("Максимум 5 уровней вложенности папок");
    }
  }
  const stamp = nowIso();
  return normalizeCollection({
    id: createId("folder"),
    name: trimmed,
    parentId: parentId ?? null,
    slug: null,
    externalUrl: null,
    createdAt: stamp,
    updatedAt: stamp,
  });
}

export function renameCollection(
  collections: Collection[],
  id: string,
  name: string,
): Collection[] {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Укажите название папки");
  }
  const stamp = nowIso();
  return collections.map((collection) =>
    collection.id === id
      ? { ...collection, name: trimmed, updatedAt: stamp }
      : collection,
  );
}

export function deleteCollectionTree(
  collections: Collection[],
  id: string,
): { collections: Collection[]; removedIds: Set<string> } {
  const removedIds = collectionSubtreeIds(id, collections);
  return {
    collections: collections.filter((c) => !removedIds.has(c.id)),
    removedIds,
  };
}
