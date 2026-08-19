import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeCollection } from "@/lib/item-mapper";
import { requireUserId } from "@/lib/session";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await prisma.collection.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  const body = (await request.json()) as { name?: string };
  const name = body.name?.trim() ?? "";
  if (!name) {
    return NextResponse.json(
      { error: "Укажите название коллекции" },
      { status: 400 },
    );
  }

  const row = await prisma.collection.update({
    where: { id },
    data: { name },
  });

  return NextResponse.json({
    collection: serializeCollection(row),
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await prisma.collection.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  await prisma.collection.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
