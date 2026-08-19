import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeItem } from "@/lib/item-mapper";
import { requireUserId } from "@/lib/session";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await prisma.libraryItem.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(rows.map(serializeItem));
}
