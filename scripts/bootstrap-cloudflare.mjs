#!/usr/bin/env node
/**
 * One-shot Cloudflare bootstrap for Phase 0 publish.
 * Requires: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID in env
 * Optional: ADMIN_TOKEN, EDITOR_TOKEN, RESEND_API_KEY
 *
 * Usage: node scripts/bootstrap-cloudflare.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

function run(cmd, args, opts = {}) {
	console.log(`\n> ${cmd} ${args.join(" ")}`);
	const result = spawnSync(cmd, args, {
		stdio: "inherit",
		encoding: "utf8",
		...opts,
	});
	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
	return result;
}

function runCapture(cmd, args) {
	const result = spawnSync(cmd, args, { encoding: "utf8" });
	if (result.status !== 0) {
		console.error(result.stderr || result.stdout);
		process.exit(result.status ?? 1);
	}
	return result.stdout;
}

const token = process.env.CLOUDFLARE_API_TOKEN;
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
if (!token || !account) {
	console.error(
		"Missing CLOUDFLARE_API_TOKEN or CLOUDFLARE_ACCOUNT_ID.\n" +
			"Add them to the environment (or GitHub Actions secrets) and retry.",
	);
	process.exit(1);
}

console.log("Creating D1 database (ignore error if it already exists)...");
const d1Out = runCapture("npx", ["wrangler", "d1", "create", "imtrtdweb"]);
console.log(d1Out);
const idMatch = d1Out.match(
	/database_id\s*=\s*"([0-9a-f-]{36})"|database_id['"]?\s*:\s*['"]([0-9a-f-]{36})['"]/i,
);
const databaseId = idMatch?.[1] || idMatch?.[2];

if (databaseId) {
	const path = "wrangler.jsonc";
	const src = readFileSync(path, "utf8");
	const next = src.replace(
		/"database_id"\s*:\s*"[^"]+"/,
		`"database_id": "${databaseId}"`,
	);
	if (next !== src) {
		writeFileSync(path, next);
		console.log(`Updated wrangler.jsonc database_id → ${databaseId}`);
	}
} else {
	console.log(
		"Could not parse new database_id (database may already exist). Continuing.",
	);
}

console.log("Ensuring R2 bucket exists...");
const r2 = spawnSync(
	"npx",
	["wrangler", "r2", "bucket", "create", "imtrtdweb-media"],
	{ encoding: "utf8" },
);
console.log(r2.stdout || r2.stderr || "R2 create finished");

run("npm", ["run", "db:migrate:remote"]);

for (const name of ["ADMIN_TOKEN", "EDITOR_TOKEN", "RESEND_API_KEY"]) {
	const value = process.env[name];
	if (!value) {
		console.log(`Skip secret ${name} (not set in env)`);
		continue;
	}
	const put = spawnSync("npx", ["wrangler", "secret", "put", name], {
		input: value,
		encoding: "utf8",
		stdio: ["pipe", "inherit", "inherit"],
	});
	if (put.status !== 0) {
		process.exit(put.status ?? 1);
	}
}

run("npm", ["run", "deploy"]);
console.log("\nPublish complete. Check workers.dev and imtryingtodesign.com");
