import type { AiModel } from "@/lib/types";

export interface AiFolderSeed {
  /** Stable slug used to detect already-seeded folders */
  slug: string;
  name: string;
  externalUrl: string;
  model: AiModel;
}

/** Top popular AI chat apps — seeded as folders with external links. */
export const AI_FOLDER_SEEDS: AiFolderSeed[] = [
  {
    slug: "chatgpt",
    name: "ChatGPT",
    externalUrl: "https://chatgpt.com",
    model: "ChatGPT",
  },
  {
    slug: "claude",
    name: "Claude",
    externalUrl: "https://claude.ai",
    model: "Claude",
  },
  {
    slug: "gemini",
    name: "Gemini",
    externalUrl: "https://gemini.google.com",
    model: "Gemini",
  },
  {
    slug: "copilot",
    name: "Copilot",
    externalUrl: "https://copilot.microsoft.com",
    model: "Copilot",
  },
  {
    slug: "perplexity",
    name: "Perplexity",
    externalUrl: "https://www.perplexity.ai",
    model: "Perplexity",
  },
  {
    slug: "grok",
    name: "Grok",
    externalUrl: "https://grok.com",
    model: "Grok",
  },
  {
    slug: "deepseek",
    name: "DeepSeek",
    externalUrl: "https://chat.deepseek.com",
    model: "DeepSeek",
  },
];
