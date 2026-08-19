import {
  promptCodexCategory,
  promptCodexToItem,
  type PromptCodexPrompt,
} from "./promptcodex";
import { PROMPTCODEX_CATALOG } from "./promptcodex-catalog";
import { SAMPLE_PROMPTS, type SamplePrompt } from "./samples";

function toSample(prompt: PromptCodexPrompt): SamplePrompt {
  const item = promptCodexToItem(prompt);
  return {
    id: item.id,
    kind: "prompt",
    title: item.title,
    description: prompt.description?.trim() || undefined,
    body: item.body,
    category: promptCodexCategory(prompt),
    tags: item.tags,
    models: item.models,
    variableDefs: item.variableDefs,
  };
}

/** Built-in samples plus the imported PromptCodex library. */
export const EXPLORE_PROMPTS: SamplePrompt[] = [
  ...SAMPLE_PROMPTS,
  ...PROMPTCODEX_CATALOG.map(toSample),
];

export const EXPLORE_COUNTS: Map<string, number> = EXPLORE_PROMPTS.reduce(
  (counts, prompt) => counts.set(prompt.category, (counts.get(prompt.category) ?? 0) + 1),
  new Map<string, number>(),
);

/** Busiest categories first, so the catalog leads with what it actually has. */
export const EXPLORE_CATEGORIES: string[] = [...EXPLORE_COUNTS.entries()]
  .sort(([aName, aCount], [bName, bCount]) =>
    bCount - aCount || aName.localeCompare(bName, "ru"),
  )
  .map(([name]) => name);
