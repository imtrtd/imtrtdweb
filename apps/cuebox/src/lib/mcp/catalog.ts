import { EXPLORE_PROMPTS } from "@/lib/explore-catalog";
import { applyPlaceholders, extractPlaceholders } from "@/lib/types";

const SEARCH_LIMIT = 8;

export interface PromptSearchResult {
  id: string;
  title: string;
  url: string;
}

export function publicBaseUrl(): string {
  const configured = process.env.CUEBOX_PUBLIC_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const vercelHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercelHost) return `https://${vercelHost.replace(/\/$/, "")}`;

  return "http://localhost:3000";
}

export function promptUrl(id: string): string {
  return `${publicBaseUrl()}/explore#prompt-${encodeURIComponent(id)}`;
}

function normalize(value: string): string {
  return value
    .toLocaleLowerCase("ru")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function promptScore(query: string, prompt: (typeof EXPLORE_PROMPTS)[number]) {
  const title = normalize(prompt.title);
  const category = normalize(prompt.category);
  const description = normalize(prompt.description ?? "");
  const tags = normalize(prompt.tags.join(" "));
  const body = normalize(prompt.body);
  const tokens = normalize(query).split(/\s+/).filter(Boolean);

  if (!tokens.length) return 0;

  return tokens.reduce((score, token) => {
    if (title === token) return score + 24;
    if (title.includes(token)) score += 12;
    if (category.includes(token)) score += 8;
    if (tags.includes(token)) score += 6;
    if (description.includes(token)) score += 4;
    if (body.includes(token)) score += 1;
    return score;
  }, 0);
}

export function searchPrompts(query: string): PromptSearchResult[] {
  return EXPLORE_PROMPTS.map((prompt) => ({
    prompt,
    score: promptScore(query, prompt),
  }))
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || a.prompt.title.localeCompare(b.prompt.title, "ru"),
    )
    .slice(0, SEARCH_LIMIT)
    .map(({ prompt }) => ({
      id: prompt.id,
      title: prompt.title,
      url: promptUrl(prompt.id),
    }));
}

export function getPrompt(id: string) {
  return EXPLORE_PROMPTS.find((prompt) => prompt.id === id) ?? null;
}

export function fillPrompt(id: string, values: Record<string, string>) {
  const prompt = getPrompt(id);
  if (!prompt) return null;

  const variables = prompt.variableDefs ?? [];
  const resolvedValues = Object.fromEntries(
    variables.map((variable) => [
      variable.key,
      values[variable.key] ?? variable.defaultValue ?? "",
    ]),
  );
  const filledPrompt = applyPlaceholders(prompt.body, resolvedValues);
  const unresolved = extractPlaceholders(filledPrompt);

  return {
    id: prompt.id,
    title: prompt.title,
    category: prompt.category,
    tags: prompt.tags,
    models: prompt.models,
    variables,
    values: resolvedValues,
    filledPrompt,
    unresolved,
    url: promptUrl(prompt.id),
  };
}
