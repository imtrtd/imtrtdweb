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

export async function GET(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const includeArchived = searchParams.get("archived") === "1";

  const rows = await prisma.libraryItem.findMany({
    where: {
      userId,
      ...(includeArchived ? {} : { archived: false }),
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ items: rows.map(serializeItem) });
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      kind?: ItemKind;
      title?: string;
      body?: string;
      tags?: string[];
      messages?: ChatMessage[];
      favorite?: boolean;
      archived?: boolean;
      collectionId?: string | null;
      models?: AiModel[];
      variableDefs?: VariableDef[];
      variants?: PromptVariant[];
      activeVariantId?: string | null;
      preset?: AudioPluginPresetMeta;
    };

    const kind = body.kind;
    const title = body.title?.trim() ?? "";
    const text = body.body?.trim() ?? "";

    if (!kind || !KIND_SET.has(kind)) {
      return NextResponse.json({ error: "Некорректный тип" }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ error: "Укажите название" }, { status: 400 });
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

    const row = await prisma.libraryItem.create({
      data: {
        userId,
        kind,
        title,
        body: text || title,
        tags: tagsToJson(body.tags),
        messages: messagesToJson(body.messages),
        favorite: Boolean(body.favorite),
        archived: Boolean(body.archived),
        collectionId: body.collectionId ?? null,
        models: modelsToJson(body.models),
        variableDefs: variableDefsToJson(body.variableDefs),
        variants: variantsToJson(body.variants),
        activeVariantId: body.activeVariantId ?? null,
        preset: presetToJson(body.preset),
      },
    });

    return NextResponse.json({ item: serializeItem(row) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Не удалось создать" }, { status: 500 });
  }
}
