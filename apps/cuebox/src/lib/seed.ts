import { AI_FOLDER_SEEDS } from "./ai-folders";
import type { Collection, LibraryItem } from "./types";

export const STORAGE_KEY = "cuebox.library.v1";
export const COLLECTIONS_KEY = "cuebox.collections.v1";

const SEED_STAMP = "2026-08-05T09:00:00.000Z";

export const SEED_COLLECTIONS: Collection[] = [
  {
    id: "local-folder-presets",
    name: "Presets",
    slug: "presets",
    parentId: null,
    createdAt: SEED_STAMP,
    updatedAt: SEED_STAMP,
  },
  ...AI_FOLDER_SEEDS.map((seed) => ({
    id: `local-folder-${seed.slug}`,
    name: seed.name,
    slug: seed.slug,
    externalUrl: seed.externalUrl,
    parentId: null,
    createdAt: SEED_STAMP,
    updatedAt: SEED_STAMP,
  })),
];

export const SEED_ITEMS: LibraryItem[] = [
  {
    id: "seed-preset-1",
    kind: "prompt",
    title: "Local reverb / drive preset",
    body: `Set up a local reverb or drive chain.

Source: {{source}}
Plugin: {{plugin}}
Effect type: {{effect_type}}
Goal: {{goal}}
Tempo: {{tempo}}

Return practical settings, gain staging advice, and one safer alternative if the effect is too aggressive.`,
    tags: ["audio", "preset", "reverb", "drive"],
    favorite: true,
    archived: false,
    copyCount: 0,
    models: ["Copilot", "Claude"],
    preset: {
      plugin: "Valhalla VintageVerb",
      pluginType: "reverb",
      source: "lead vocal",
      bpm: "124",
      key: "A minor",
    },
    variableDefs: [
      { key: "source", label: "Source", type: "text", defaultValue: "lead vocal" },
      { key: "plugin", label: "Plugin", type: "text", defaultValue: "Valhalla VintageVerb" },
      {
        key: "effect_type",
        label: "Effect type",
        type: "dropdown",
        options: ["reverb", "overdrive", "distortion"],
        defaultValue: "reverb",
      },
      { key: "goal", label: "Goal", type: "text", defaultValue: "wider but still upfront" },
      { key: "tempo", label: "Tempo", type: "text", defaultValue: "124 BPM" },
    ],
    variants: [],
    collectionId: "local-folder-presets",
    createdAt: "2026-08-05T10:00:00.000Z",
    updatedAt: "2026-08-05T10:00:00.000Z",
  },
  {
    id: "seed-prompt-1",
    kind: "prompt",
    title: "Редактор кода: ревью PR",
    body: `Ты — senior-инженер. Проведи ревью pull request.

Контекст:
- Язык / стек: {{stack}}
- Цель изменений: {{goal}}

Правила:
1. Сначала краткий вердикт (approve / request changes / needs discussion).
2. Затем список рисков по приоритету.
3. Предложи конкретные правки с примерами кода.
4. Не переписывай весь PR — только точечные улучшения.`,
    tags: ["code-review", "engineering"],
    favorite: true,
    archived: false,
    copyCount: 0,
    models: ["ChatGPT", "Claude", "Copilot"],
    variableDefs: [
      { key: "stack", label: "Стек", type: "text", defaultValue: "TypeScript" },
      { key: "goal", label: "Цель", type: "text" },
    ],
    variants: [],
    collectionId: "local-folder-chatgpt",
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
  },
  {
    id: "seed-tip-1",
    kind: "tip",
    title: "Как писать переменные в промпте",
    body: `Используйте явные плейсхолдеры вида {{variable}} — так проще искать и подставлять значения.

Типы переменных Cuebox (как в PromptCodex): text, dropdown, toggle, date.`,
    tags: ["craft", "templates"],
    favorite: false,
    archived: false,
    copyCount: 0,
    models: ["Other"],
    variableDefs: [],
    variants: [],
    createdAt: "2026-08-02T12:00:00.000Z",
    updatedAt: "2026-08-02T12:00:00.000Z",
  },
  {
    id: "seed-task-1",
    kind: "task",
    title: "Набросать структуру README",
    body: `Общая задача для ИИ-ассистента:

1. Прочитать описание продукта Cuebox.
2. Составить оглавление README (установка, запуск, модель данных, roadmap).
3. Написать черновик на русском, короткий и практичный.
4. Вынести открытые вопросы в конец.`,
    tags: ["docs", "bootstrap"],
    favorite: false,
    archived: false,
    copyCount: 0,
    models: ["ChatGPT", "Claude"],
    variableDefs: [],
    variants: [],
    collectionId: "local-folder-claude",
    createdAt: "2026-08-03T09:30:00.000Z",
    updatedAt: "2026-08-03T09:30:00.000Z",
  },
  {
    id: "seed-chat-1",
    kind: "chat",
    title: "Имя и позиционирование продукта",
    body: "Короткий общий чат про бренд Cuebox — библиотека промптов и чатов.",
    tags: ["brand", "product"],
    favorite: true,
    archived: false,
    copyCount: 0,
    models: ["ChatGPT", "Claude"],
    variableDefs: [],
    variants: [],
    messages: [
      {
        role: "user",
        content:
          "Нужно имя для приложения, которое хранит промпты, подсказки, задачи и чаты с ИИ. Хочу короткое и запоминающееся.",
      },
      {
        role: "assistant",
        content:
          "Cuebox — «коробка подсказок». Коротко, легко произносится, сразу намекает на коллекцию готовых cues для работы с ИИ.",
      },
      {
        role: "user",
        content: "Ок, берём Cuebox. Какой однострочный слоган?",
      },
      {
        role: "assistant",
        content:
          "Cuebox — личная библиотека промптов, задач и чатов с ИИ.",
      },
    ],
    collectionId: "local-folder-chatgpt",
    createdAt: "2026-08-04T15:00:00.000Z",
    updatedAt: "2026-08-04T15:20:00.000Z",
  },
];
