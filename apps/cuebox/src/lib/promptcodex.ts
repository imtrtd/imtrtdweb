import type {
  AiModel,
  LibraryItem,
  PromptVariant,
  VariableDef,
  VariableType,
} from "./types";

export interface PromptCodexVariable {
  name?: string;
  description?: string;
  displayOrder?: number;
  id?: string;
  optionsValue?: string;
  typeRawValue?: string;
  defaultValue?: string;
}

export interface PromptCodexVariant {
  id?: string;
  body?: string;
  displayOrder?: number;
}

export interface PromptCodexPrompt {
  id?: string;
  title?: string;
  description?: string;
  categoryId?: string;
  categoryName?: string;
  tags?: string[];
  variables?: PromptCodexVariable[];
  variants?: PromptCodexVariant[];
  isFavorite?: boolean;
  isArchived?: boolean;
  isPinned?: boolean;
  copyCount?: number;
  createdDate?: string;
  modifiedDate?: string;
}

export interface PromptCodexExport {
  version?: number;
  exportDate?: string;
  prompts?: PromptCodexPrompt[];
  globalVariables?: PromptCodexVariable[];
  tags?: string[];
}

/** PromptCodex categories, mapped onto the Russian catalog names Cuebox uses. */
export const PROMPTCODEX_CATEGORIES: Record<string, string> = {
  "builtin.designUX": "Дизайн",
  "builtin.social": "Соцсети",
  "builtin.businessStrategy": "Бизнес",
  "builtin.translation": "Перевод",
  "builtin.dataAnalytics": "Аналитика",
  "builtin.coding": "Код",
  "builtin.marketing": "Маркетинг",
  "builtin.productivity": "Продуктивность",
  "builtin.writing": "Письмо",
  "builtin.education": "Обучение",
  "builtin.creative": "Творчество",
};

export const PROMPTCODEX_FALLBACK_CATEGORY = "Другое";

const MODEL_BY_TAG = new Map<string, AiModel>([
  ["chatgpt", "ChatGPT"],
  ["claude", "Claude"],
  ["gemini", "Gemini"],
  ["copilot", "Copilot"],
  ["perplexity", "Perplexity"],
  ["grok", "Grok"],
  ["deepseek", "DeepSeek"],
]);

const VARIABLE_TYPE_BY_RAW: Record<string, VariableType> = {
  string: "text",
  text: "text",
  number: "text",
  bool: "toggle",
  boolean: "toggle",
  toggle: "toggle",
  date: "date",
  options: "dropdown",
  dropdown: "dropdown",
};

/** PromptCodex writes inline defaults as `{{name:some default}}`. */
const PLACEHOLDER_WITH_DEFAULT = /\{\{\s*([a-zA-Z0-9_.-]+)\s*:\s*([^{}]*?)\s*\}\}/g;

export function isPromptCodexExport(value: unknown): value is PromptCodexExport {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Array.isArray((value as PromptCodexExport).prompts)
  );
}

/**
 * Rewrites `{{name:default}}` to `{{name}}` so Cuebox's placeholder engine can
 * fill it, and returns the defaults that were inlined in the body.
 */
function extractInlineDefaults(body: string): {
  body: string;
  defaults: Record<string, string>;
} {
  const defaults: Record<string, string> = {};
  const rewritten = body.replace(
    PLACEHOLDER_WITH_DEFAULT,
    (_match, key: string, defaultValue: string) => {
      defaults[key] = defaultValue;
      return `{{${key}}}`;
    },
  );
  return { body: rewritten, defaults };
}

function splitOptions(optionsValue: string | undefined): string[] {
  if (!optionsValue) return [];
  return optionsValue
    .split(/[\n,]/)
    .map((option) => option.trim())
    .filter(Boolean);
}

function toVariableDefs(
  variables: PromptCodexVariable[],
  inlineDefaults: Record<string, string>,
  globalDefaults: Record<string, string>,
): VariableDef[] {
  return [...variables]
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
    .map((variable) => {
      const key = (variable.name ?? "").trim();
      if (!key) return null;
      const options = splitOptions(variable.optionsValue);
      const raw = (variable.typeRawValue ?? "").toLowerCase();
      const type: VariableType = options.length
        ? "dropdown"
        : VARIABLE_TYPE_BY_RAW[raw] ?? "text";
      const def: VariableDef = {
        key,
        label: variable.description?.trim() || key,
        type,
        defaultValue:
          variable.defaultValue ??
          inlineDefaults[key] ??
          globalDefaults[key] ??
          "",
      };
      if (options.length) def.options = options;
      return def;
    })
    .filter((def): def is VariableDef => def !== null);
}

function splitTagsAndModels(tags: string[]): {
  tags: string[];
  models: AiModel[];
} {
  const plain: string[] = [];
  const models: AiModel[] = [];
  for (const tag of tags) {
    const model = MODEL_BY_TAG.get(tag.trim().toLowerCase());
    if (model) {
      if (!models.includes(model)) models.push(model);
    } else {
      plain.push(tag);
    }
  }
  return { tags: plain, models };
}

export function promptCodexCategory(prompt: PromptCodexPrompt): string {
  if (prompt.categoryId && PROMPTCODEX_CATEGORIES[prompt.categoryId]) {
    return PROMPTCODEX_CATEGORIES[prompt.categoryId];
  }
  return PROMPTCODEX_FALLBACK_CATEGORY;
}

export function promptCodexToItem(prompt: PromptCodexPrompt): LibraryItem {
  const variants = [...(prompt.variants ?? [])].sort(
    (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
  );
  const primary = extractInlineDefaults(variants[0]?.body ?? "");
  const createdAt = prompt.createdDate ?? new Date().toISOString();
  const updatedAt = prompt.modifiedDate ?? createdAt;

  const extraVariants: PromptVariant[] = variants.slice(1).map((variant, i) => ({
    id: variant.id ?? `pc-variant-${prompt.id ?? "item"}-${i + 2}`,
    name: `Вариант ${i + 2}`,
    body: extractInlineDefaults(variant.body ?? "").body,
    createdAt,
  }));

  const { tags, models } = splitTagsAndModels(prompt.tags ?? []);

  return {
    id: prompt.id ? `pc-${prompt.id}` : `pc-${createdAt}-${prompt.title ?? ""}`,
    kind: "prompt",
    title: prompt.title?.trim() || "Без названия",
    body: primary.body,
    tags,
    favorite: Boolean(prompt.isFavorite),
    archived: Boolean(prompt.isArchived),
    copyCount: prompt.copyCount ?? 0,
    lastUsedAt: null,
    models,
    variableDefs: toVariableDefs(prompt.variables ?? [], primary.defaults, {}),
    variants: extraVariants,
    activeVariantId: null,
    collectionId: null,
    createdAt,
    updatedAt,
  };
}

export function promptCodexToItems(data: PromptCodexExport): LibraryItem[] {
  const globalDefaults: Record<string, string> = {};
  for (const variable of data.globalVariables ?? []) {
    const key = variable.name?.trim();
    if (key && variable.defaultValue) globalDefaults[key] = variable.defaultValue;
  }

  return (data.prompts ?? []).map((prompt) => {
    const item = promptCodexToItem(prompt);
    if (!Object.keys(globalDefaults).length) return item;
    return {
      ...item,
      variableDefs: item.variableDefs.map((def) =>
        def.defaultValue ? def : { ...def, defaultValue: globalDefaults[def.key] ?? "" },
      ),
    };
  });
}
