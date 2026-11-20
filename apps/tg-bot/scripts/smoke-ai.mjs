#!/usr/bin/env node
/**
 * One-shot Workers AI call for the bot's configured model.
 * Catches request-shape mismatches (e.g. reasoning_effort) before deploy.
 *
 * Needs CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID.
 * Optional: AI_MODEL (default @cf/openai/gpt-oss-20b).
 */
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
const model = (process.env.AI_MODEL?.trim() || "@cf/openai/gpt-oss-20b");

if (!accountId || !token) {
  console.error("smoke-ai: set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN");
  process.exit(1);
}

const body = {
  messages: [
    { role: "system", content: "Reply with exactly the word OK and nothing else." },
    { role: "user", content: "ping" },
  ],
  max_tokens: 64,
  temperature: 0,
  ...(model.startsWith("@cf/openai/gpt-oss-") ? { reasoning_effort: "low" } : {}),
};

const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
const res = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

const raw = await res.text();
let payload;
try {
  payload = JSON.parse(raw);
} catch {
  console.error(`smoke-ai: non-JSON HTTP ${res.status}: ${raw.slice(0, 500)}`);
  process.exit(1);
}

if (!res.ok || payload?.success === false) {
  console.error(`smoke-ai: HTTP ${res.status}`, JSON.stringify(payload, null, 2).slice(0, 2000));
  process.exit(1);
}

function extractText(data) {
  const result = data?.result ?? data;
  if (typeof result === "string") return result.trim();
  if (typeof result?.response === "string") return result.response.trim();
  if (typeof result?.output_text === "string") return result.output_text.trim();
  const content = result?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  return "";
}

const text = extractText(payload);
if (!text) {
  console.error("smoke-ai: empty model text", JSON.stringify(payload, null, 2).slice(0, 2000));
  process.exit(1);
}

console.log(`smoke-ai: ${model} ok (${text.slice(0, 80).replace(/\s+/g, " ")})`);
