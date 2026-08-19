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
import type {
  AiModel,
  AudioPluginPresetMeta,
  ChatMessage,
  ItemKind,
  PromptVariant,
  VariableDef,
} from "@/lib/types";
import { KIND_ORDER } from "@/lib/types";

const KIND_SET = new Set<string>(KIND_ORDER);

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await prisma.libraryItem.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  try {
    const body = (await request.json()) as {
      kind?: ItemKind;
      title?: string;
      body?: string;
      tags?: string[];
      messages?: ChatMessage[] | null;
      favorite?: boolean;
      archived?: boolean;
      collectionId?: string | null;
      models?: AiModel[];
      variableDefs?: VariableDef[];
      variants?: PromptVariant[];
      activeVariantId?: string | null;
      preset?: AudioPluginPresetMeta;
      incrementCopy?: boolean;
    };

    if (body.kind !== undefined && !KIND_SET.has(body.kind)) {
      return NextResponse.json({ error: "Некорректный тип" }, { status: 400 });
    }

    if (body.collectionId) {
      const collection = await prisma.collection.findFirst({
        where: { id: body.collectionId, userId },
      });
      if (!collection) {
        return NextResponse.json(
          { error: "Коллекция не найдена" },
          { status: 400 },
        );
      }
    }

    const row = await prisma.libraryItem.update({
      where: { id },
      data: {
        kind: body.kind ?? undefined,
        title: body.title !== undefined ? body.title.trim() : undefined,
        body: body.body !== undefined ? body.body.trim() : undefined,
        tags: body.tags !== undefined ? tagsToJson(body.tags) : undefined,
        messages:
          body.messages !== undefined
            ? messagesToJson(body.messages ?? undefined)
            : undefined,
        favorite: body.favorite !== undefined ? body.favorite : undefined,
        archived: body.archived !== undefined ? body.archived : undefined,
        collectionId:
          body.collectionId !== undefined ? body.collectionId : undefined,
        models: body.models !== undefined ? modelsToJson(body.models) : undefined,
        variableDefs:
          body.variableDefs !== undefined
            ? variableDefsToJson(body.variableDefs)
            : undefined,
        variants:
          body.variants !== undefined ? variantsToJson(body.variants) : undefined,
        activeVariantId:
          body.activeVariantId !== undefined ? body.activeVariantId : undefined,
        preset: body.preset !== undefined ? presetToJson(body.preset) : undefined,
        ...(body.incrementCopy
          ? {
              copyCount: { increment: 1 },
              lastUsedAt: new Date(),
            }
          : {}),
      },
    });

    return NextResponse.json({ item: serializeItem(row) });
  } catch {
    return NextResponse.json({ error: "Не удалось обновить" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await prisma.libraryItem.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  await prisma.libraryItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
