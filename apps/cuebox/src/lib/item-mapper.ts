import type { LibraryItem as DbItem, Collection as DbCollection } from "@prisma/client";
import type {
  AiModel,
  AudioPluginPresetMeta,
  ChatMessage,
  Collection,
  LibraryItem,
  PromptVariant,
  VariableDef,
} from "@/lib/types";

function parseJsonArray<T>(raw: string | null | undefined, fallback: T[] = []): T[] {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function parseJsonObject<T extends object>(
  raw: string | null | undefined,
  fallback: T,
): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as T;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : fallback;
  } catch {
    return fallback;
  }
}

export function serializeItem(row: DbItem): LibraryItem {
  return {
    id: row.id,
    kind: row.kind as LibraryItem["kind"],
    title: row.title,
    body: row.body,
    tags: parseJsonArray<string>(row.tags),
    messages: row.messages ? parseJsonArray<ChatMessage>(row.messages) : undefined,
    favorite: row.favorite,
    archived: row.archived,
    copyCount: row.copyCount,
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    models: parseJsonArray<AiModel>(row.models),
    preset: parseJsonObject<AudioPluginPresetMeta>(row.preset, {}),
    variableDefs: parseJsonArray<VariableDef>(row.variableDefs),
    variants: parseJsonArray<PromptVariant>(row.variants),
    activeVariantId: row.activeVariantId,
    collectionId: row.collectionId ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializeCollection(row: DbCollection): Collection {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parentId ?? null,
    slug: row.slug ?? null,
    externalUrl: row.externalUrl ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function tagsToJson(tags: string[] | undefined): string {
  return JSON.stringify(
    (tags ?? [])
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function messagesToJson(
  messages: ChatMessage[] | undefined,
): string | null {
  if (!messages?.length) return null;
  return JSON.stringify(messages);
}

export function modelsToJson(models: AiModel[] | undefined): string {
  return JSON.stringify(models ?? []);
}

export function variableDefsToJson(defs: VariableDef[] | undefined): string {
  return JSON.stringify(defs ?? []);
}

export function variantsToJson(variants: PromptVariant[] | undefined): string {
  return JSON.stringify(variants ?? []);
}

export function presetToJson(
  preset: AudioPluginPresetMeta | undefined,
): string {
  return JSON.stringify(preset ?? {});
}
