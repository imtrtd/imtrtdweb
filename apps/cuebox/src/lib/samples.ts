import type { AiModel, ItemKind, VariableDef } from "@/lib/types";

export interface SamplePrompt {
  id: string;
  kind: ItemKind;
  title: string;
  /** Short blurb shown on the catalog card instead of the raw body */
  description?: string;
  body: string;
  category: string;
  tags: string[];
  models: AiModel[];
  variableDefs?: VariableDef[];
}

export const SAMPLE_CATEGORIES = [
  "Письмо",
  "Код",
  "Маркетинг",
  "Обучение",
  "Аналитика",
  "Продукт",
  "Творчество",
] as const;

export const SAMPLE_PROMPTS: SamplePrompt[] = [
  {
    id: "sample-reverb-plate-vocal",
    kind: "prompt",
    title: "Local reverb on vocal",
    category: "Код",
    tags: ["audio", "reverb", "preset"],
    models: ["Copilot", "Claude", "ChatGPT"],
    body: `Build a local reverb preset for a vocal.

Plugin: {{plugin}}
Source: {{source}}
Target vibe: {{vibe}}
Decay: {{decay}}
Pre-delay: {{predelay}}
Tone: {{tone}}

Return:
1. exact parameter suggestions
2. gain staging notes
3. what to automate in the chorus`,
    variableDefs: [
      { key: "plugin", label: "Plugin", type: "text", defaultValue: "Valhalla Room" },
      { key: "source", label: "Source", type: "text", defaultValue: "lead vocal" },
      {
        key: "vibe",
        label: "Vibe",
        type: "dropdown",
        options: ["tight", "wide", "lush", "dark"],
        defaultValue: "lush",
      },
      { key: "decay", label: "Decay", type: "text", defaultValue: "1.8s" },
      { key: "predelay", label: "Pre-delay", type: "text", defaultValue: "35ms" },
      { key: "tone", label: "Tone", type: "text", defaultValue: "soft top, trimmed lows" },
    ],
  },
  {
    id: "sample-drive-drum-bus",
    kind: "prompt",
    title: "Drive on drum bus",
    category: "Код",
    tags: ["audio", "drive", "distortion", "preset"],
    models: ["Copilot", "Claude", "ChatGPT"],
    body: `Design a drive preset for a drum bus.

Plugin: {{plugin}}
Material: {{source}}
Style: {{style}}
Drive amount: {{drive}}
Blend: {{mix}}
Goal: {{goal}}

Explain which frequencies to protect and how to keep the transients alive.`,
    variableDefs: [
      { key: "plugin", label: "Plugin", type: "text", defaultValue: "Decapitator" },
      { key: "source", label: "Source", type: "text", defaultValue: "drum bus" },
      {
        key: "style",
        label: "Style",
        type: "dropdown",
        options: ["subtle glue", "punchy", "crunchy", "parallel smash"],
        defaultValue: "punchy",
      },
      { key: "drive", label: "Drive", type: "text", defaultValue: "3.5" },
      { key: "mix", label: "Mix", type: "text", defaultValue: "35%" },
      { key: "goal", label: "Goal", type: "text", defaultValue: "more density without harsh cymbals" },
    ],
  },
  {
    id: "sample-write-email",
    kind: "prompt",
    title: "Деловое письмо",
    category: "Письмо",
    tags: ["email", "business"],
    models: ["ChatGPT", "Claude"],
    body: `Напиши деловое письмо.

Получатель: {{recipient}}
Цель: {{goal}}
Тон: {{tone}}
Ключевые факты:
{{facts}}

Сделай письмо коротким, конкретным и с чётким CTA.`,
    variableDefs: [
      { key: "recipient", label: "Кому", type: "text" },
      { key: "goal", label: "Цель", type: "text" },
      {
        key: "tone",
        label: "Тон",
        type: "dropdown",
        options: ["нейтральный", "дружелюбный", "строго официальный"],
        defaultValue: "нейтральный",
      },
      { key: "facts", label: "Факты", type: "text" },
    ],
  },
  {
    id: "sample-rewrite",
    kind: "prompt",
    title: "Переписать яснее",
    category: "Письмо",
    tags: ["rewrite", "clarity"],
    models: ["ChatGPT", "Claude", "Gemini"],
    body: `Перепиши текст яснее и короче, сохранив смысл.

Стиль: {{style}}
Текст:
{{text}}`,
    variableDefs: [
      {
        key: "style",
        label: "Стиль",
        type: "dropdown",
        options: ["простой", "деловой", "для соцсетей"],
        defaultValue: "простой",
      },
      { key: "text", label: "Текст", type: "text" },
    ],
  },
  {
    id: "sample-code-review",
    kind: "prompt",
    title: "Code review",
    category: "Код",
    tags: ["code-review", "engineering"],
    models: ["ChatGPT", "Claude", "Copilot", "DeepSeek"],
    body: `Сделай code review.

Стек: {{stack}}
Фокус: {{focus}}

Код:
{{code}}

Формат ответа:
1) Вердикт
2) Риски по приоритету
3) Конкретные правки`,
    variableDefs: [
      { key: "stack", label: "Стек", type: "text", defaultValue: "TypeScript" },
      {
        key: "focus",
        label: "Фокус",
        type: "dropdown",
        options: ["корректность", "безопасность", "производительность", "читаемость"],
        defaultValue: "корректность",
      },
      { key: "code", label: "Код", type: "text" },
    ],
  },
  {
    id: "sample-tests",
    kind: "prompt",
    title: "Сгенерировать тесты",
    category: "Код",
    tags: ["tests", "qa"],
    models: ["ChatGPT", "Claude", "DeepSeek"],
    body: `Напиши {{type}} тесты для:

{{target}}

Учти edge cases и опиши setup.`,
    variableDefs: [
      {
        key: "type",
        label: "Тип тестов",
        type: "dropdown",
        options: ["unit", "integration", "e2e"],
        defaultValue: "unit",
      },
      { key: "target", label: "Цель", type: "text" },
    ],
  },
  {
    id: "sample-bugfix",
    kind: "prompt",
    title: "Найти причину бага",
    category: "Код",
    tags: ["debug"],
    models: ["ChatGPT", "Claude", "Gemini"],
    body: `Помоги найти причину бага.

Симптом: {{symptom}}
Ожидание: {{expected}}
Контекст:
{{context}}

Дай 3 гипотезы и план проверки.`,
  },
  {
    id: "sample-landing",
    kind: "prompt",
    title: "Лендинг: структура",
    category: "Маркетинг",
    tags: ["landing", "copy"],
    models: ["ChatGPT", "Claude", "Gemini"],
    body: `Собери структуру лендинга для продукта.

Продукт: {{product}}
Аудитория: {{audience}}
Оффер: {{offer}}

Дай блоки hero → benefits → social proof → CTA.`,
  },
  {
    id: "sample-ad",
    kind: "prompt",
    title: "Рекламные тексты",
    category: "Маркетинг",
    tags: ["ads"],
    models: ["ChatGPT", "Grok", "Gemini"],
    body: `Сгенерируй 5 вариантов рекламного текста.

Платформа: {{platform}}
Продукт: {{product}}
УТП: {{usp}}
Длина: {{length}}`,
    variableDefs: [
      {
        key: "platform",
        type: "dropdown",
        options: ["Meta", "Google", "TikTok", "LinkedIn"],
        defaultValue: "Meta",
      },
      { key: "product", type: "text" },
      { key: "usp", type: "text" },
      {
        key: "length",
        type: "dropdown",
        options: ["короткий", "средний", "длинный"],
        defaultValue: "короткий",
      },
    ],
  },
  {
    id: "sample-seo",
    kind: "prompt",
    title: "SEO-бриф статьи",
    category: "Маркетинг",
    tags: ["seo", "content"],
    models: ["ChatGPT", "Perplexity", "Claude"],
    body: `Составь SEO-бриф.

Тема: {{topic}}
Ключевой запрос: {{keyword}}
Аудитория: {{audience}}

Включи H1/H2, интент, FAQ и внутренние ссылки.`,
  },
  {
    id: "sample-tutor",
    kind: "prompt",
    title: "Объясни как репетитор",
    category: "Обучение",
    tags: ["learn", "explain"],
    models: ["ChatGPT", "Claude", "Gemini"],
    body: `Объясни тему {{topic}} на уровне {{level}}.

Используй аналогии, мини-пример и проверку понимания (3 вопроса).`,
    variableDefs: [
      { key: "topic", type: "text" },
      {
        key: "level",
        type: "dropdown",
        options: ["школьник", "студент", "специалист"],
        defaultValue: "студент",
      },
    ],
  },
  {
    id: "sample-quiz",
    kind: "prompt",
    title: "Квиз по теме",
    category: "Обучение",
    tags: ["quiz"],
    models: ["ChatGPT", "Claude"],
    body: `Составь квиз из {{count}} вопросов по теме {{topic}}.

Формат: вопрос, 4 варианта, правильный ответ, короткое пояснение.`,
    variableDefs: [
      { key: "topic", type: "text" },
      {
        key: "count",
        type: "dropdown",
        options: ["5", "10", "15"],
        defaultValue: "5",
      },
    ],
  },
  {
    id: "sample-summary",
    kind: "prompt",
    title: "Саммари документа",
    category: "Аналитика",
    tags: ["summary"],
    models: ["ChatGPT", "Claude", "Gemini", "Perplexity"],
    body: `Сделай структурированное саммари.

Документ:
{{document}}

Формат: TL;DR, ключевые тезисы, риски, следующие шаги.`,
  },
  {
    id: "sample-compare",
    kind: "prompt",
    title: "Сравнить варианты",
    category: "Аналитика",
    tags: ["decision"],
    models: ["ChatGPT", "Claude"],
    body: `Сравни варианты решения.

Контекст: {{context}}
Варианты:
{{options}}
Критерии: {{criteria}}

Дай таблицу и рекомендацию.`,
  },
  {
    id: "sample-prd",
    kind: "prompt",
    title: "Черновик PRD",
    category: "Продукт",
    tags: ["prd", "product"],
    models: ["ChatGPT", "Claude"],
    body: `Напиши черновик PRD.

Фича: {{feature}}
Пользователь: {{user}}
Проблема: {{problem}}
Метрика успеха: {{metric}}

Секции: problem, goals, requirements, non-goals, risks.`,
  },
  {
    id: "sample-user-story",
    kind: "prompt",
    title: "User stories",
    category: "Продукт",
    tags: ["agile"],
    models: ["ChatGPT", "Claude", "Copilot"],
    body: `Сгенерируй user stories для {{feature}}.

Формат: As a… I want… So that…
Плюс acceptance criteria.`,
  },
  {
    id: "sample-story",
    kind: "prompt",
    title: "Короткий рассказ",
    category: "Творчество",
    tags: ["story"],
    models: ["ChatGPT", "Claude", "Grok"],
    body: `Напиши короткий рассказ.

Жанр: {{genre}}
Герой: {{hero}}
Конфликт: {{conflict}}
Объём: ~400 слов.`,
    variableDefs: [
      {
        key: "genre",
        type: "dropdown",
        options: ["sci-fi", "детектив", "фэнтези", "драма"],
        defaultValue: "sci-fi",
      },
      { key: "hero", type: "text" },
      { key: "conflict", type: "text" },
    ],
  },
  {
    id: "sample-brainstorm",
    kind: "prompt",
    title: "Мозговой штурм идей",
    category: "Творчество",
    tags: ["ideas"],
    models: ["ChatGPT", "Gemini", "Grok"],
    body: `Дай 12 идей по запросу: {{topic}}.

Группируй по смелости: безопасные / средние / смелые.`,
  },
  {
    id: "sample-tip-vars",
    kind: "tip",
    title: "Как писать переменные",
    category: "Обучение",
    tags: ["craft", "variables"],
    models: ["Other"],
    body: `Используйте {{variable}} или {variable}.

Типы в Cuebox: text, dropdown, toggle, date.
Задавайте defaultValue — так промпт заполняется быстрее.`,
  },
  {
    id: "sample-task-readme",
    kind: "task",
    title: "Собрать README",
    category: "Код",
    tags: ["docs"],
    models: ["ChatGPT", "Claude", "Copilot"],
    body: `Общая задача:

1. Опиши продукт {{product}}
2. Добавь установку и запуск
3. Опиши модель данных
4. Вынеси open questions в конец`,
  },
  {
    id: "sample-chat-brand",
    kind: "chat",
    title: "Пример чата: нейминг",
    category: "Продукт",
    tags: ["brand", "chat"],
    models: ["ChatGPT", "Claude"],
    body: "Короткий пример сохранённого чата про название продукта.",
  },
  {
    id: "sample-meeting-notes",
    kind: "prompt",
    title: "Заметки со встречи",
    category: "Аналитика",
    tags: ["meeting"],
    models: ["ChatGPT", "Claude", "Gemini"],
    body: `Преврати транскрипт в заметки.

Транскрипт:
{{transcript}}

Формат: decisions, action items (owner + due), open questions.`,
  },
];
