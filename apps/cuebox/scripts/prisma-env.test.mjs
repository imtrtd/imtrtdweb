import assert from "node:assert/strict";
import { applyPrismaEnv } from "./prisma-env.mjs";

const originalUrl = process.env.DATABASE_URL;
const originalUnpooled = process.env.DATABASE_URL_UNPOOLED;
const originalFallback = process.env.CUEBOX_PRISMA_UNPOOLED_FALLBACK;

function restore() {
  for (const [key, value] of [
    ["DATABASE_URL", originalUrl],
    ["DATABASE_URL_UNPOOLED", originalUnpooled],
    ["CUEBOX_PRISMA_UNPOOLED_FALLBACK", originalFallback],
  ]) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

try {
  delete process.env.CUEBOX_PRISMA_UNPOOLED_FALLBACK;

  process.env.DATABASE_URL = "postgresql://pooled.example/cuebox";
  process.env.DATABASE_URL_UNPOOLED = "postgresql://direct.example/cuebox";
  assert.deepEqual(applyPrismaEnv(), { usedFallback: false });
  assert.equal(
    process.env.DATABASE_URL_UNPOOLED,
    "postgresql://direct.example/cuebox",
  );

  process.env.DATABASE_URL_UNPOOLED = "   ";
  const fallback = applyPrismaEnv();
  assert.equal(fallback.usedFallback, true);
  assert.equal(
    process.env.DATABASE_URL_UNPOOLED,
    "postgresql://pooled.example/cuebox",
  );
  assert.equal(process.env.CUEBOX_PRISMA_UNPOOLED_FALLBACK, "1");

  delete process.env.DATABASE_URL;
  delete process.env.DATABASE_URL_UNPOOLED;
  delete process.env.CUEBOX_PRISMA_UNPOOLED_FALLBACK;
  assert.deepEqual(applyPrismaEnv(), {
    usedFallback: false,
    missingDatabaseUrl: true,
  });

  console.log("prisma-env tests passed");
} finally {
  restore();
}
