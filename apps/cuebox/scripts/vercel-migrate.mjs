import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyPrismaEnv } from "./prisma-env.mjs";

// Preview deployments share the production database, and any branch whose
// migration history differs from production would wedge it, so only the
// production build applies migrations.
const environment = process.env.VERCEL_ENV;
const { usedFallback } = applyPrismaEnv();

if (environment && environment !== "production") {
  console.log(`Skipping prisma migrate deploy on a ${environment} deployment.`);
  process.exit(0);
}

if (usedFallback || process.env.CUEBOX_PRISMA_UNPOOLED_FALLBACK === "1") {
  console.log(
    "Skipping prisma migrate deploy: DATABASE_URL_UNPOOLED is not set. Add the Neon direct URL to Vercel Production.",
  );
  process.exit(0);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const isWindows = process.platform === "win32";
const localBin = path.join(
  root,
  "node_modules",
  ".bin",
  isWindows ? "prisma.cmd" : "prisma",
);
const prisma = existsSync(localBin) ? localBin : "prisma";

const result = spawnSync(prisma, ["migrate", "deploy"], {
  cwd: root,
  stdio: "inherit",
  shell: isWindows,
  env: process.env,
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
