import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  messagesToJson,
  modelsToJson,
  presetToJson,
  serializeItem,
  tagsToJson,
  variableDefsToJson,
  variantsToJson,
} from "@/lib/item-mapper";
import { requireUserId } from "@/lib/session";
import type { LibraryItem } from "@/lib/types";
import { KIND_ORDER } from "@/lib/types";

const KIND_SET = new Set<string>(KIND_ORDER);
const MAX_IMPORT_ITEMS = 500;
const MAX_IMPORT_BYTES = 8 * 1024 * 1024;
const MAX_TITLE_LENGTH = 300;
const MAX_BODY_LENGTH = 100_000;
const IMPORT_TRANSACTION_MAX_WAIT_MS = 5_000;
const IMPORT_TRANSACTION_TIMEOUT_MS = 20_000;

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_IMPORT_BYTES) {
    return NextResponse.json({ error: "Файл импорта слишком большой" }, { status: 413 });
  }

  try {
    const payload = (await request.json()) as {
      items?: LibraryItem[];
      replace?: boolean;
    };
    const items = payload.items;
    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: "Ожидался массив items" },
        { status: 400 },
      );
    }

    if (items.length > MAX_IMPORT_ITEMS) {
      return NextResponse.json(
        { error: `Импорт ограничен ${MAX_IMPORT_ITEMS} записями за раз` },
        { status: 413 },
      );
    }

    const validItems = items.filter((item) => {
      const title = item.title?.trim() ?? "";
      const body = item.body?.trim() ?? title;
      return (
        Boolean(item.kind && KIND_SET.has(item.kind)) &&
        title.length > 0 &&
        title.length <= MAX_TITLE_LENGTH &&
        body.length <= MAX_BODY_LENGTH
      );
    });

    if (validItems.length !== items.length) {
      return NextResponse.json(
        { error: "Импорт содержит недопустимые или слишком большие записи" },
        { status: 400 },
      );
    }

    const incomingCollectionIds = Array.from(
      new Set(
        validItems
          .map((item) => item.collectionId)
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const validCollectionIds = new Set(
      incomingCollectionIds.length
        ? (
            await prisma.collection.findMany({
              where: { userId, id: { in: incomingCollectionIds } },
              select: { id: true },
            })
          ).map((collection) => collection.id)
        : [],
    );

    const created = await prisma.$transaction(
      async (tx) => {
        if (payload.replace) {
          await tx.libraryItem.deleteMany({ where: { userId } });
        }

        const imported = [];
        for (const item of validItems) {
          const title = item.title.trim();
          const collectionId =
            item.collectionId && validCollectionIds.has(item.collectionId)
              ? item.collectionId
              : null;

          const row = await tx.libraryItem.create({
            data: {
              userId,
              kind: item.kind,
              title,
              body: (item.body ?? title).trim(),
              tags: tagsToJson(item.tags),
              messages: messagesToJson(item.messages),
              favorite: Boolean(item.favorite),
              archived: Boolean(item.archived),
              copyCount: item.copyCount ?? 0,
              lastUsedAt: item.lastUsedAt ? new Date(item.lastUsedAt) : null,
              models: modelsToJson(item.models),
              variableDefs: variableDefsToJson(item.variableDefs),
              variants: variantsToJson(item.variants),
              activeVariantId: item.activeVariantId ?? null,
              preset: presetToJson(item.preset),
              collectionId,
              createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
              updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
            },
          });
          imported.push(serializeItem(row));
        }
        return imported;
      },
      {
        maxWait: IMPORT_TRANSACTION_MAX_WAIT_MS,
        timeout: IMPORT_TRANSACTION_TIMEOUT_MS,
      },
    );

    return NextResponse.json({ items: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Импорт не удался" }, { status: 500 });
  }
}
