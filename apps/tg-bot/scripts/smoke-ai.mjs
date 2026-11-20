#!/usr/bin/env node
/**
 * One-shot Workers AI call through the AI binding (same path as the bot).
 * Spins up a tiny Worker with `wrangler dev` so the deploy API token works
 * even when it lacks Workers AI REST (/ai/run) permission.
 *
 * Needs CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID.
 * Optional: AI_MODEL (defaults to @cf/openai/gpt-oss-20b in smoke wrangler config).
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const token = process.env.CLOUDFLARE_API_TOKEN?.trim();

if (!accountId || !token) {
  console.error("smoke-ai: set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN");
  process.exit(1);
}

const model = process.env.AI_MODEL?.trim();
const env = {
  ...process.env,
  CLOUDFLARE_ACCOUNT_ID: accountId,
  CLOUDFLARE_API_TOKEN: token,
};

const wranglerBin = path.join(root, "node_modules", ".bin", "wrangler");
const config = path.join(root, "scripts", "smoke-ai.wrangler.jsonc");
const port = 18787;

const args = [
  "dev",
  "--config",
  config,
  "--port",
  String(port),
  "--ip",
  "127.0.0.1",
  "--show-interactive-dev-session=false",
];
if (model) args.push("--var", `AI_MODEL:${model}`);

const child = spawn(wranglerBin, args, {
  cwd: root,
  env,
  stdio: ["ignore", "pipe", "pipe"],
});

let ready = false;
let logs = "";
const onData = (buf) => {
  const s = buf.toString();
  logs += s;
  if (/Ready on|Local:|http:\/\/127\.0\.0\.1/.test(s)) ready = true;
};
child.stdout.on("data", onData);
child.stderr.on("data", onData);

function stop() {
  if (!child.killed) {
    child.kill("SIGTERM");
  }
}

process.on("exit", stop);
process.on("SIGINT", () => {
  stop();
  process.exit(130);
});

const deadline = Date.now() + 120_000;
while (!ready && Date.now() < deadline) {
  if (child.exitCode != null) {
    console.error("smoke-ai: wrangler exited early\n", logs.slice(-3000));
    process.exit(1);
  }
  await new Promise((r) => setTimeout(r, 250));
}
if (!ready) {
  stop();
  console.error("smoke-ai: wrangler did not become ready\n", logs.slice(-3000));
  process.exit(1);
}

try {
  const res = await fetch(`http://127.0.0.1:${port}/`);
  const body = await res.text();
  let json;
  try {
    json = JSON.parse(body);
  } catch {
    stop();
    console.error(`smoke-ai: non-JSON HTTP ${res.status}: ${body.slice(0, 500)}`);
    console.error(logs.slice(-2000));
    process.exit(1);
  }
  if (!res.ok || !json?.ok || !json?.text) {
    stop();
    console.error(
      `smoke-ai: failed HTTP ${res.status}`,
      JSON.stringify(json, null, 2).slice(0, 2000),
    );
    console.error(logs.slice(-2000));
    process.exit(1);
  }
  console.log(
    `smoke-ai: ${json.model} ok (${String(json.text).slice(0, 80).replace(/\s+/g, " ")})`,
  );
  stop();
  // Give wrangler a moment to exit cleanly.
  await new Promise((r) => setTimeout(r, 500));
  process.exit(0);
} catch (error) {
  stop();
  console.error("smoke-ai: fetch failed", error);
  console.error(logs.slice(-3000));
  process.exit(1);
}
