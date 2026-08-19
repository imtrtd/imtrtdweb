export type ItemKind = "prompt" | "tip" | "task" | "chat";

export type VariableType = "text" | "dropdown" | "toggle" | "date";

export type AiModel =
  | "ChatGPT"
  | "Claude"
  | "Gemini"
  | "Copilot"
  | "Perplexity"
  | "Grok"
  | "DeepSeek"
  | "Other";

export type AudioPluginType =
  | "reverb"
  | "delay"
  | "compressor"
  | "eq"
  | "saturator"
  | "overdrive"
  | "distortion"
  | "chorus"
  | "flanger"
  | "phaser"
  | "filter"
  | "utility"
  | "instrument"
  | "other";

export const AUDIO_PLUGIN_TYPES: AudioPluginType[] = [
  "reverb",
  "delay",
  "compressor",
  "eq",
  "saturator",
  "overdrive",
  "distortion",
  "chorus",
  "flanger",
  "phaser",
  "filter",
  "utility",
  "instrument",
  "other",
];


export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface VariableDef {
  key: string;
  label?: string;
  type: VariableType;
  options?: string[];
  defaultValue?: string;
}

export interface PromptVariant {
  id: string;
  name: string;
  body: string;
  createdAt: string;
}

export interface AudioPluginPresetMeta {
  plugin?: string;
  pluginType?: AudioPluginType;
  source?: string;
  bpm?: string;
  key?: string;
}

export interface LibraryItem {
  id: string;
  kind: ItemKind;
  title: string;
  body: string;
  tags: string[];
  /** For kind === "chat" — optional structured transcript */
  messages?: ChatMessage[];
  favorite: boolean;
  archived: boolean;
  copyCount: number;
  lastUsedAt?: string | null;
  models: AiModel[];
  preset?: AudioPluginPresetMeta;
  variableDefs: VariableDef[];
  variants: PromptVariant[];
  activeVariantId?: string | null;
  collectionId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Collection {
  id: string;
  name: string;
  parentId?: string | null;
  slug?: string | null;
  externalUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ItemDraft = Omit<
  LibraryItem,
  "id" | "createdAt" | "updatedAt" | "favorite" | "copyCount" | "lastUsedAt"
> & {
  favorite?: boolean;
  archived?: boolean;
  copyCount?: number;
  lastUsedAt?: string | null;
};

export const KIND_LABELS: Record<ItemKind, string> = {
  prompt: "Промпт",
  tip: "Подсказка",
  task: "Задача",
  chat: "Чат",
};

export const KIND_ORDER: ItemKind[] = ["prompt", "tip", "task", "chat"];

export const AI_MODELS: AiModel[] = [
  "ChatGPT",
  "Claude",
  "Gemini",
  "Copilot",
  "Perplexity",
  "Grok",
  "DeepSeek",
  "Other",
];

export const VARIABLE_TYPES: VariableType[] = [
  "text",
  "dropdown",
  "toggle",
  "date",
];

/** Supports PromptCodex-style {var} and Cuebox {{var}} */
const PLACEHOLDER_RE = /\{\{?\s*([a-zA-Z0-9_.-]+)\s*\}?\}/g;

export function extractPlaceholders(text: string): string[] {
  const found = new Set<string>();
  const re = new RegExp(PLACEHOLDER_RE.source, "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    found.add(match[1]);
  }
  return [...found];
}

export function applyPlaceholders(
  text: string,
  values: Record<string, string>,
): string {
  return text.replace(
    new RegExp(PLACEHOLDER_RE.source, "g"),
    (_, key: string) => values[key] ?? `{{${key}}}`,
  );
}

export function effectiveBody(item: LibraryItem): string {
  if (item.activeVariantId) {
    const variant = item.variants.find((v) => v.id === item.activeVariantId);
    if (variant) return variant.body;
  }
  return item.body;
}

export function createVariableDefsFromBody(body: string): VariableDef[] {
  return extractPlaceholders(body).map((key) => ({
    key,
    label: key,
    type: "text" as const,
    defaultValue: "",
  }));
}
