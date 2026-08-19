import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureAiFolders } from "@/lib/ensure-ai-folders";
import { serializeCollection } from "@/lib/item-mapper";
import { requireUserId } from "@/lib/session";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureAiFolders(userId);

  const rows = await prisma.collection.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    collections: rows.map(serializeCollection),
  });
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      parentId?: string | null;
      externalUrl?: string | null;
    };
    const name = body.name?.trim() ?? "";
    if (!name) {
      return NextResponse.json(
        { error: "Укажите название коллекции" },
        { status: 400 },
      );
    }

    let externalUrl: string | null = null;
    if (typeof body.externalUrl === "string" && body.externalUrl.trim()) {
      try {
        const parsed = new URL(body.externalUrl.trim());
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          return NextResponse.json(
            { error: "Ссылка должна начинаться с http(s)://" },
            { status: 400 },
          );
        }
        externalUrl = parsed.toString();
      } catch {
        return NextResponse.json(
          { error: "Некорректная внешняя ссылка" },
          { status: 400 },
        );
      }
    }

    if (body.parentId) {
      const parent = await prisma.collection.findFirst({
        where: { id: body.parentId, userId },
      });
      if (!parent) {
        return NextResponse.json(
          { error: "Родительская папка не найдена" },
          { status: 400 },
        );
      }
      // Cap nesting at 5 levels (PromptCodex-style)
      let depth = 1;
      let cursor: string | null = parent.parentId;
      while (cursor && depth < 6) {
        const next = await prisma.collection.findFirst({
          where: { id: cursor, userId },
          select: { parentId: true },
        });
        if (!next) break;
        depth += 1;
        cursor = next.parentId;
      }
      if (depth >= 5) {
        return NextResponse.json(
          { error: "Максимум 5 уровней вложенности папок" },
          { status: 400 },
        );
      }
    }

    const row = await prisma.collection.create({
      data: {
        userId,
        name,
        parentId: body.parentId ?? null,
        externalUrl,
      },
    });

    return NextResponse.json(
      { collection: serializeCollection(row) },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "Не удалось создать коллекцию" },
      { status: 500 },
    );
  }
}
