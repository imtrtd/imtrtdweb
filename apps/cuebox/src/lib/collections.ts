import type { Collection } from "@/lib/types";

export function folderPath(
  collections: { id: string; name: string; parentId?: string | null }[],
  id: string,
): string {
  const parts: string[] = [];
  let cursor: string | null | undefined = id;
  let guard = 0;
  while (cursor && guard < 6) {
    const node = collections.find((c) => c.id === cursor);
    if (!node) break;
    parts.unshift(node.name);
    cursor = node.parentId;
    guard += 1;
  }
  return parts.join(" / ");
}

export function collectionSubtreeIds(
  rootId: string,
  collections: Collection[],
): Set<string> {
  const ids = new Set<string>([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const collection of collections) {
      if (
        collection.parentId &&
        ids.has(collection.parentId) &&
        !ids.has(collection.id)
      ) {
        ids.add(collection.id);
        grew = true;
      }
    }
  }
  return ids;
}

export function sortCollectionsByDepth(
  collections: Collection[],
): Collection[] {
  const byId = new Map(collections.map((c) => [c.id, c]));
  function depth(collection: Collection): number {
    let d = 0;
    let cursor = collection.parentId ?? null;
    while (cursor && d < 8) {
      d += 1;
      cursor = byId.get(cursor)?.parentId ?? null;
    }
    return d;
  }
  return [...collections].sort(
    (a, b) => depth(a) - depth(b) || a.name.localeCompare(b.name, "ru"),
  );
}

/** Matches the cloud API: parent chain length >= 5 means a 6th level. */
export function parentChainLength(
  collections: Collection[],
  parentId: string,
): number {
  let depth = 1;
  let cursor: string | null | undefined = collections.find(
    (c) => c.id === parentId,
  )?.parentId;
  while (cursor && depth < 6) {
    depth += 1;
    cursor = collections.find((c) => c.id === cursor)?.parentId;
  }
  return depth;
}

export function knownCollectionId(
  collections: Collection[],
  collectionId?: string | null,
): string | null {
  if (!collectionId) return null;
  return collections.some((c) => c.id === collectionId) ? collectionId : null;
}
