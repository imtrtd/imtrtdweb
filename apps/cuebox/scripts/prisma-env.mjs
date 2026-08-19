/**
 * Prisma schema requires both DATABASE_URL and DATABASE_URL_UNPOOLED.
 * Vercel often has the first set and the second missing or empty, which
 * makes generate/migrate/runtime fail with P1012.
 *
 * Copy the pooled URL when the unpooled one is absent so Prisma can start.
 * Production migrations still skip when this fallback is used, because
 * migrate deploy should not run over a pooler URL.
 */
export function applyPrismaEnv() {
  const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
  const unpooled = process.env.DATABASE_URL_UNPOOLED?.trim() ?? "";

  if (unpooled) {
    return { usedFallback: false };
  }

  if (!databaseUrl) {
    return { usedFallback: false, missingDatabaseUrl: true };
  }

  process.env.DATABASE_URL_UNPOOLED = databaseUrl;
  process.env.CUEBOX_PRISMA_UNPOOLED_FALLBACK = "1";
  console.log(
    "DATABASE_URL_UNPOOLED is empty; using DATABASE_URL so Prisma can run.",
  );
  return { usedFallback: true };
}
