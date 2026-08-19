import { AI_FOLDER_SEEDS } from "@/lib/ai-folders";
import { prisma } from "@/lib/db";

/** Idempotently create top AI service folders with external links for a user. */
export async function ensureAiFolders(userId: string): Promise<void> {
  const existing = await prisma.collection.findMany({
    where: {
      userId,
      slug: { in: AI_FOLDER_SEEDS.map((s) => s.slug) },
    },
    select: { slug: true },
  });
  const have = new Set(existing.map((row) => row.slug).filter(Boolean));
  const missing = AI_FOLDER_SEEDS.filter((seed) => !have.has(seed.slug));
  if (!missing.length) return;

  await prisma.collection.createMany({
    data: missing.map((seed) => ({
      userId,
      name: seed.name,
      slug: seed.slug,
      externalUrl: seed.externalUrl,
      parentId: null,
    })),
  });
}
