import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyPrismaEnv } from "./prisma-env.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const isWindows = process.platform === "win32";
const localBin = path.join(
  root,
  "node_modules",
  ".bin",
  isWindows ? "prisma.cmd" : "prisma",
);
const prisma = existsSync(localBin) ? localBin : "prisma";

applyPrismaEnv();

const result = spawnSync(prisma, ["generate"], {
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
