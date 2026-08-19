import type { Collection, ItemDraft, LibraryItem } from "@/lib/types";

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(
      (data as { error?: string }).error ?? `HTTP ${res.status}`,
    );
  }
  return data;
}

export async function apiListItems(includeArchived = true): Promise<LibraryItem[]> {
  const qs = includeArchived ? "?archived=1" : "";
  const res = await fetch(`/api/items${qs}`, { cache: "no-store" });
  const data = await parseJson<{ items: LibraryItem[] }>(res);
  return data.items;
}

export async function apiCreateItem(draft: ItemDraft): Promise<LibraryItem> {
  const res = await fetch("/api/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  });
  const data = await parseJson<{ item: LibraryItem }>(res);
  return data.item;
}

export async function apiUpdateItem(
  id: string,
  patch: Partial<ItemDraft> & {
    favorite?: boolean;
    archived?: boolean;
    incrementCopy?: boolean;
  },
): Promise<LibraryItem> {
  const res = await fetch(`/api/items/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const data = await parseJson<{ item: LibraryItem }>(res);
  return data.item;
}

export async function apiDeleteItem(id: string): Promise<void> {
  const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
  await parseJson<{ ok: boolean }>(res);
}

export async function apiImportItems(
  items: LibraryItem[],
  replace = false,
): Promise<LibraryItem[]> {
  const res = await fetch("/api/items/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items, replace }),
  });
  const data = await parseJson<{ items: LibraryItem[] }>(res);
  return data.items;
}

export async function apiExportItems(): Promise<LibraryItem[]> {
  const res = await fetch("/api/items/export", { cache: "no-store" });
  return parseJson<LibraryItem[]>(res);
}

export async function apiListCollections(): Promise<Collection[]> {
  const res = await fetch("/api/collections", { cache: "no-store" });
  const data = await parseJson<{ collections: Collection[] }>(res);
  return data.collections;
}

export async function apiCreateCollection(
  name: string,
  parentId?: string | null,
): Promise<Collection> {
  const res = await fetch("/api/collections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, parentId: parentId ?? null }),
  });
  const data = await parseJson<{ collection: Collection }>(res);
  return data.collection;
}

export async function apiUpdateCollection(
  id: string,
  name: string,
): Promise<Collection> {
  const res = await fetch(`/api/collections/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const data = await parseJson<{ collection: Collection }>(res);
  return data.collection;
}

export async function apiDeleteCollection(id: string): Promise<void> {
  const res = await fetch(`/api/collections/${id}`, { method: "DELETE" });
  await parseJson<{ ok: boolean }>(res);
}
