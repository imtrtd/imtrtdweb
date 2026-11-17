/**
 * /komandir — command builder. A command is a list of steps (open a link or an app, run an iOS
 * Shortcut, call, SMS, e-mail, copy / speak / show / ask text, vibrate, wait) that run one after
 * another. Everything lives in this browser's localStorage; nothing is sent anywhere.
 *
 * Browsers only allow some actions inside a tap (new windows, clipboard, the first speech). When a
 * step is refused outside a tap, the run pauses on a button that repeats the step inside one.
 */

type StepKind =
  | "openURL"
  | "openApp"
  | "runShortcut"
  | "call"
  | "message"
  | "email"
  | "copyText"
  | "speak"
  | "showText"
  | "askInput"
  | "vibrate"
  | "wait";

type Step = { id: string; kind: StepKind; text: string; detail: string; extra: string; number: number };
type Command = { id: string; name: string; steps: Step[]; createdAt: string; runCount: number; lastRunAt?: string };

type Field = {
  key: "text" | "detail" | "extra" | "number";
  label: string;
  placeholder?: string;
  type?: "url" | "tel" | "email" | "number";
  area?: boolean;
  vars?: boolean;
  note?: string;
};

type Kind = { title: string; summary: string; group: string; fields: Field[]; note?: string; needsText?: boolean };

const STORE = "imtrtd-komandir";
const ACCENT = "imtrtd-accent";

const GROUPS = ["Сайты и приложения", "Связь", "Текст", "Устройство и время"];

const KINDS: Record<StepKind, Kind> = {
  openURL: {
    title: "Открыть ссылку",
    summary: "Сайт в новой вкладке",
    group: GROUPS[0],
    needsText: true,
    fields: [{ key: "text", label: "Адрес", placeholder: "https://example.com", type: "url", vars: true, note: "Без https:// — добавится сам." }],
  },
  openApp: {
    title: "Открыть приложение",
    summary: "Telegram, Карты, Заметки…",
    group: GROUPS[0],
    needsText: true,
    fields: [{ key: "text", label: "Ссылка-схема", placeholder: "tg://", note: "Выберите выше или впишите свою. Работает на iPhone." }],
  },
  runShortcut: {
    title: "Быстрая команда",
    summary: "Запустить команду из «Быстрых команд» iOS",
    group: GROUPS[0],
    needsText: true,
    fields: [
      { key: "text", label: "Название команды", placeholder: "Точно как в «Быстрых командах»" },
      { key: "detail", label: "Текст на вход", placeholder: "Необязательно", vars: true },
    ],
  },
  call: {
    title: "Позвонить",
    summary: "Набрать номер",
    group: GROUPS[1],
    needsText: true,
    fields: [{ key: "text", label: "Номер", placeholder: "+380 00 000 00 00", type: "tel" }],
  },
  message: {
    title: "Сообщение",
    summary: "SMS или iMessage с готовым текстом",
    group: GROUPS[1],
    fields: [
      { key: "text", label: "Получатель", placeholder: "+380 00 000 00 00", type: "tel", note: "Можно оставить пустым и выбрать в «Сообщениях»." },
      { key: "detail", label: "Текст", area: true, vars: true },
    ],
  },
  email: {
    title: "Письмо",
    summary: "Почта с темой и текстом",
    group: GROUPS[1],
    fields: [
      { key: "text", label: "Кому", placeholder: "name@example.com", type: "email" },
      { key: "detail", label: "Тема", vars: true },
      { key: "extra", label: "Текст", area: true, vars: true },
    ],
  },
  copyText: {
    title: "Скопировать",
    summary: "Текст в буфер обмена",
    group: GROUPS[2],
    needsText: true,
    fields: [{ key: "text", label: "Текст", area: true, vars: true }],
  },
  speak: {
    title: "Произнести",
    summary: "Озвучить текст голосом",
    group: GROUPS[2],
    needsText: true,
    fields: [{ key: "text", label: "Текст", area: true, vars: true }],
  },
  showText: {
    title: "Показать",
    summary: "Сообщение и кнопка «Дальше»",
    group: GROUPS[2],
    needsText: true,
    fields: [{ key: "text", label: "Текст", area: true, vars: true }],
  },
  askInput: {
    title: "Спросить",
    summary: "Ответ попадёт в {{ввод}}",
    group: GROUPS[2],
    fields: [{ key: "text", label: "Вопрос", placeholder: "Что записать?" }],
  },
  vibrate: {
    title: "Вибрация",
    summary: "Короткий отклик",
    group: GROUPS[3],
    fields: [],
    note: "Работает на Android. iPhone не даёт сайтам вибрировать — шаг пропустится.",
  },
  wait: {
    title: "Пауза",
    summary: "Подождать перед следующим шагом",
    group: GROUPS[3],
    fields: [{ key: "number", label: "Секунд", type: "number" }],
  },
};

const APPS: [string, string][] = [
  ["Быстрые команды", "shortcuts://"],
  ["Карты", "maps://"],
  ["Музыка", "music://"],
  ["Заметки", "mobilenotes://"],
  ["Календарь", "calshow://"],
  ["Фото", "photos-redirect://"],
  ["Почта", "message://"],
  ["Файлы", "shareddocuments://"],
  ["Погода", "weather://"],
  ["App Store", "itms-apps://apps.apple.com"],
  ["Telegram", "tg://"],
  ["WhatsApp", "whatsapp://"],
  ["Instagram", "instagram://"],
  ["YouTube", "youtube://"],
  ["Spotify", "spotify://"],
];

const VARS: [string, string][] = [
  ["{{дата}}", "сегодняшняя дата"],
  ["{{время}}", "текущее время"],
  ["{{буфер}}", "текст из буфера обмена"],
  ["{{ввод}}", "ответ из шага «Спросить»"],
];

// ---------- helpers ----------

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));

const plural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10;
  const m100 = n % 100;
  const w = m100 >= 11 && m100 <= 14 ? many : m10 === 1 ? one : m10 >= 2 && m10 <= 4 ? few : many;
  return `${n} ${w}`;
};
const stepsWord = (n: number) => (n ? plural(n, "шаг", "шага", "шагов") : "нет шагов");

type Props = Record<string, unknown>;
function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props = {}, ...kids: (Node | string | null | false | undefined)[]): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "class") n.className = String(v);
    else if (k === "text") n.textContent = String(v);
    else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v as EventListener);
    else if (k in n && typeof v !== "string") (n as unknown as Props)[k] = v;
    else n.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of kids) if (c !== null && c !== false && c !== undefined) n.append(c);
  return n;
}

const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("stop", "AbortError"));
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("stop", "AbortError"));
    });
  });

const newStep = (kind: StepKind, init: Partial<Step> = {}): Step => ({
  id: uid(),
  kind,
  text: "",
  detail: "",
  extra: "",
  number: kind === "wait" ? 3 : 0,
  ...init,
});

const isReady = (s: Step) => !KINDS[s.kind].needsText || s.text.trim() !== "";

function describe(s: Step): string {
  if (!isReady(s)) return "Нужно заполнить";
  switch (s.kind) {
    case "openApp":
      return APPS.find(([, v]) => v === s.text)?.[0] ?? s.text;
    case "runShortcut":
      return `«${s.text}»`;
    case "message":
      return [s.text, s.detail].filter(Boolean).join(" · ") || "Получатель и текст — в «Сообщениях»";
    case "email":
      return [s.text, s.detail].filter(Boolean).join(" · ") || "Пустое письмо";
    case "askInput":
      return `${s.text || "Введите текст"} → {{ввод}}`;
    case "wait":
      return plural(s.number, "секунда", "секунды", "секунд");
    case "vibrate":
      return "Короткий отклик";
    default:
      return s.text;
  }
}

// ---------- storage ----------

function load(): Command[] {
  try {
    const v = JSON.parse(localStorage.getItem(STORE) || "[]");
    return Array.isArray(v) ? v.filter((c) => c && typeof c.id === "string" && Array.isArray(c.steps)) : [];
  } catch {
    return [];
  }
}
let commands = load();
let storageOk = true;
function save() {
  try {
    localStorage.setItem(STORE, JSON.stringify(commands));
    storageOk = true;
  } catch {
    storageOk = false; // private mode: kept for this visit only
  }
  renderList();
}
const byId = (id: string) => commands.find((c) => c.id === id);
const byName = (name: string) => commands.find((c) => c.name.toLocaleLowerCase("ru") === name.toLocaleLowerCase("ru"));
const runLink = (c: Command) => `${location.origin}/komandir?run=${encodeURIComponent(c.name)}`;

// ---------- templates ----------

const templates = (): Command[] =>
  [
    {
      name: "Доброе утро",
      steps: [newStep("speak", { text: "Доброе утро! Сегодня {{дата}}, сейчас {{время}}." }), newStep("openApp", { text: "weather://" })],
    },
    {
      name: "Быстрая заметка",
      steps: [
        newStep("askInput", { text: "Что записать?" }),
        newStep("copyText", { text: "{{дата}}, {{время}}: {{ввод}}" }),
        newStep("showText", { text: "Скопировано. Вставьте в Заметках." }),
        newStep("openApp", { text: "mobilenotes://" }),
      ],
    },
    {
      name: "Еду домой",
      steps: [newStep("message", { detail: "Выезжаю, скоро буду. Отправлено в {{время}}." }), newStep("openApp", { text: "maps://" })],
    },
    {
      name: "Перерыв",
      steps: [
        newStep("speak", { text: "Время сделать перерыв." }),
        newStep("wait", { number: 60 }),
        newStep("vibrate"),
        newStep("showText", { text: "Перерыв окончен. Возвращаемся к делам." }),
      ],
    },
    {
      name: "Отчёт за день",
      steps: [newStep("askInput", { text: "Что сделано сегодня?" }), newStep("email", { detail: "Отчёт за {{дата}}", extra: "{{ввод}}" })],
    },
    {
      name: "Найти из буфера",
      steps: [newStep("openURL", { text: "https://www.google.com/search?q={{буфер}}" })],
    },
    { name: "Позвонить близким", steps: [newStep("call")] },
  ].map((t) => ({ id: uid(), createdAt: new Date().toISOString(), runCount: 0, ...t }));

// ---------- list ----------

const listEl = $<HTMLUListElement>("[data-km-list]");
const emptyEl = $("[data-km-empty]");
const storeNote = $("[data-km-storage]");

function renderList() {
  emptyEl.hidden = commands.length > 0;
  listEl.hidden = commands.length === 0;
  storeNote.hidden = storageOk;
  listEl.replaceChildren(
    ...commands.map((c, i) => {
      const run = el(
        "button",
        { type: "button", class: "km-tile", "aria-label": `Запустить «${c.name}», ${stepsWord(c.steps.length)}`, onclick: () => openRun(c.id, true) },
        el("span", { class: "km-n", text: String(i + 1).padStart(2, "0") }),
        el("span", { class: "km-mono", text: c.name.trim().slice(0, 2) || "—" }),
        el("span", { class: "km-name", text: c.name }),
        el("span", { class: "km-meta", text: stepsWord(c.steps.length) }),
      );
      const edit = el("button", { type: "button", class: "km-edit", "aria-label": `Изменить «${c.name}»`, text: "Изменить", onclick: () => openEditor(c) });
      return el("li", {}, run, edit);
    }),
  );
}

// ---------- dialogs ----------

const editorDlg = $<HTMLDialogElement>("[data-km-editor]");
const pickerDlg = $<HTMLDialogElement>("[data-km-picker]");
const runDlg = $<HTMLDialogElement>("[data-km-run]");
const tplDlg = $<HTMLDialogElement>("[data-km-templates]");

// a tap on the backdrop closes a sheet (not while a command runs; the editor asks first if changed)
for (const d of [pickerDlg, runDlg, tplDlg]) {
  d.addEventListener("click", (e) => {
    if (e.target === d && d.dataset.lock !== "1") d.close();
  });
}
editorDlg.addEventListener("click", (e) => {
  if (e.target === editorDlg) closeEditor();
});

function sheetHead(label: string, title: string, close: () => void) {
  return el(
    "header",
    { class: "km-sheet-head" },
    el("div", {}, el("p", { class: "label sec-index", text: label }), el("h2", { class: "km-sheet-title", text: title })),
    el("button", { type: "button", class: "km-x", "aria-label": "Закрыть", text: "×", onclick: close }),
  );
}

// ---------- editor ----------

let draft: Command | null = null;
let original = "";
let isNew = false;

function openEditor(c?: Command, fresh = false) {
  isNew = !c || fresh;
  draft = structuredClone(c ?? { id: uid(), name: "", steps: [], createdAt: new Date().toISOString(), runCount: 0 });
  original = JSON.stringify(draft);
  renderEditor();
  editorDlg.showModal();
  if (isNew && !draft.name) editorDlg.querySelector<HTMLInputElement>("[data-km-name]")?.focus();
}

const dirty = () => draft !== null && JSON.stringify(draft) !== original;

function closeEditor(force = false) {
  if (!force && dirty() && !confirm("Закрыть без сохранения?")) return;
  editorDlg.close();
  draft = null;
}
editorDlg.addEventListener("cancel", (e) => {
  e.preventDefault();
  closeEditor();
});

function insertAt(input: HTMLInputElement | HTMLTextAreaElement, token: string) {
  const s = input.selectionStart ?? input.value.length;
  const e = input.selectionEnd ?? input.value.length;
  input.value = input.value.slice(0, s) + token + input.value.slice(e);
  input.setSelectionRange(s + token.length, s + token.length);
  input.focus();
  input.dispatchEvent(new Event("input"));
}

function fieldEl(step: Step, f: Field, onChange: () => void) {
  const id = `f-${step.id}-${f.key}`;
  const value = f.key === "number" ? String(step.number) : step[f.key];
  const input = f.area
    ? el("textarea", { id, class: "field km-area", rows: 3, placeholder: f.placeholder ?? "" })
    : el("input", {
        id,
        class: "field",
        type: f.type === "number" ? "number" : f.type === "url" ? "url" : f.type === "email" ? "email" : f.type === "tel" ? "tel" : "text",
        inputmode: f.type === "number" ? "numeric" : f.type === "tel" ? "tel" : f.type === "url" ? "url" : f.type === "email" ? "email" : undefined,
        min: f.type === "number" ? "1" : undefined,
        max: f.type === "number" ? "3600" : undefined,
        placeholder: f.placeholder ?? "",
        autocapitalize: f.type ? "off" : undefined,
        autocomplete: "off",
        spellcheck: f.type ? "false" : undefined,
      });
  input.value = value;
  input.addEventListener("input", () => {
    if (f.key === "number") step.number = Math.min(3600, Math.max(1, Math.round(Number(input.value) || 1)));
    else step[f.key] = input.value;
    onChange();
  });
  const vars =
    f.vars &&
    el(
      "div",
      { class: "km-vars", role: "group", "aria-label": "Вставить переменную" },
      ...VARS.map(([t, hint]) => el("button", { type: "button", class: "km-var", title: hint, text: t, onclick: () => insertAt(input, t) })),
    );
  return el(
    "div",
    { class: "km-field" },
    el("label", { class: "label km-field-label", for: id, text: f.label }),
    input,
    vars,
    f.note && el("p", { class: "km-note", text: f.note }),
  );
}

function stepCard(step: Step, index: number, total: number) {
  const k = KINDS[step.kind];
  const sub = el("p", { class: "km-step-sub", text: describe(step) });
  const refresh = () => {
    sub.textContent = describe(step);
    sub.classList.toggle("is-warn", !isReady(step));
  };
  refresh();

  const move = (to: number) => {
    if (!draft) return;
    const [s] = draft.steps.splice(index, 1);
    draft.steps.splice(to, 0, s);
    renderEditor(step.id);
  };
  const remove = () => {
    if (!draft) return;
    draft.steps.splice(index, 1);
    renderEditor();
  };

  const body = el("div", { class: "km-step-body" });
  if (step.kind === "openApp") {
    const sel = el(
      "select",
      { class: "field", "aria-label": "Приложение" },
      el("option", { value: "", text: "Выберите приложение…" }),
      ...APPS.map(([name, scheme]) => el("option", { value: scheme, text: name })),
    );
    sel.value = APPS.some(([, s]) => s === step.text) ? step.text : "";
    sel.addEventListener("change", () => {
      if (!sel.value) return;
      step.text = sel.value;
      const inp = body.querySelector<HTMLInputElement>(`#f-${CSS.escape(step.id)}-text`);
      if (inp) inp.value = sel.value;
      refresh();
    });
    body.append(el("div", { class: "km-field" }, el("span", { class: "label km-field-label", text: "Приложение" }), sel));
  }
  for (const f of k.fields) body.append(fieldEl(step, f, refresh));
  if (k.note) body.append(el("p", { class: "km-note", text: k.note }));

  return el(
    "li",
    { class: "km-step", "data-step": step.id },
    el(
      "div",
      { class: "km-step-head" },
      el("span", { class: "km-step-n", text: String(index + 1).padStart(2, "0") }),
      el("div", { class: "km-step-titles" }, el("p", { class: "km-step-title", text: k.title }), sub),
      el(
        "div",
        { class: "km-step-tools" },
        el("button", { type: "button", class: "km-tool", "aria-label": "Выше", text: "↑", disabled: index === 0, onclick: () => move(index - 1) }),
        el("button", { type: "button", class: "km-tool", "aria-label": "Ниже", text: "↓", disabled: index === total - 1, onclick: () => move(index + 1) }),
        el("button", { type: "button", class: "km-tool km-tool-del", "aria-label": `Удалить шаг ${index + 1}`, text: "×", onclick: remove }),
      ),
    ),
    body,
  );
}

function renderEditor(focusStep?: string) {
  if (!draft) return;
  const d = draft;
  const nameInput = el("input", {
    class: "field km-name-input",
    "data-km-name": true,
    placeholder: "Например: Доброе утро",
    maxlength: 60,
    autocomplete: "off",
    "aria-label": "Название команды",
  });
  nameInput.value = d.name;
  const saveBtn = el("button", { type: "button", class: "btn btn-primary", text: isNew ? "Создать" : "Сохранить" });
  const syncSave = () => (saveBtn.disabled = d.name.trim() === "");
  nameInput.addEventListener("input", () => {
    d.name = nameInput.value;
    syncSave();
  });
  syncSave();
  saveBtn.addEventListener("click", () => {
    const name = d.name.trim();
    if (!name) return;
    const clash = commands.find((c) => c.id !== d.id && c.name.toLocaleLowerCase("ru") === name.toLocaleLowerCase("ru"));
    if (clash && !confirm(`Команда «${name}» уже есть. Ссылка запуска по имени откроет первую из них. Сохранить всё равно?`)) return;
    d.name = name;
    const i = commands.findIndex((c) => c.id === d.id);
    if (i >= 0) commands[i] = d;
    else commands.push(d);
    save();
    closeEditor(true);
  });

  const extra: HTMLElement[] = [];
  if (!isNew) {
    const copy = el("button", { type: "button", class: "btn btn-ghost", text: "Скопировать ссылку" });
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(runLink(d));
        copy.textContent = "Скопировано";
      } catch {
        prompt("Ссылка для запуска:", runLink(d));
      }
    });
    const del = el("button", {
      type: "button",
      class: "btn km-danger",
      text: "Удалить команду",
      onclick: () => {
        if (!confirm(`Удалить «${d.name}»? Это нельзя отменить.`)) return;
        commands = commands.filter((c) => c.id !== d.id);
        save();
        closeEditor(true);
      },
    });
    extra.push(
      el(
        "section",
        { class: "km-block" },
        el("p", { class: "label sec-index", text: "Запуск" }),
        el("p", {
          class: "km-note",
          text: "Ссылка открывает эту команду. Её можно положить на экран «Домой», в закладки или в «Быстрые команды» — действием «Открыть URL».",
        }),
        el("div", { class: "km-row" }, copy, del),
      ),
    );
  }

  editorDlg.replaceChildren(
    el(
      "div",
      { class: "km-sheet" },
      sheetHead(isNew ? "Новая команда" : "Команда", isNew ? "Собрать команду" : d.name || "Без названия", () => closeEditor()),
      el(
        "div",
        { class: "km-sheet-body" },
        el("label", { class: "label km-field-label", text: "Название" }, nameInput),
        el(
          "section",
          { class: "km-block" },
          el("p", { class: "label sec-index", text: `Шаги · ${d.steps.length}` }),
          d.steps.length
            ? el("ol", { class: "km-steps" }, ...d.steps.map((s, i) => stepCard(s, i, d.steps.length)))
            : el("p", { class: "km-note", text: "Шагов пока нет. Добавьте первый — например, «Открыть ссылку» или «Произнести»." }),
          el("button", { type: "button", class: "btn btn-ghost km-add", text: "+ Добавить шаг", onclick: openPicker }),
        ),
        ...extra,
      ),
      el(
        "footer",
        { class: "km-sheet-foot" },
        el("button", { type: "button", class: "btn btn-ghost", text: "Отмена", onclick: () => closeEditor() }),
        saveBtn,
      ),
    ),
  );
  if (focusStep) editorDlg.querySelector(`[data-step="${CSS.escape(focusStep)}"]`)?.scrollIntoView({ block: "nearest" });
}

// ---------- step picker ----------

function openPicker() {
  pickerDlg.replaceChildren(
    el(
      "div",
      { class: "km-sheet km-sheet-sm" },
      sheetHead("Шаг", "Что сделать?", () => pickerDlg.close()),
      el(
        "div",
        { class: "km-sheet-body" },
        ...GROUPS.map((g) =>
          el(
            "section",
            { class: "km-block" },
            el("p", { class: "label sec-index", text: g }),
            el(
              "ul",
              { class: "km-kinds" },
              ...(Object.keys(KINDS) as StepKind[])
                .filter((k) => KINDS[k].group === g)
                .map((k) =>
                  el(
                    "li",
                    {},
                    el(
                      "button",
                      {
                        type: "button",
                        class: "km-kind",
                        onclick: () => {
                          if (!draft) return;
                          const s = newStep(k);
                          draft.steps.push(s);
                          pickerDlg.close();
                          renderEditor(s.id);
                          editorDlg.querySelector<HTMLElement>(`[data-step="${CSS.escape(s.id)}"] .field`)?.focus();
                        },
                      },
                      el("span", { class: "km-kind-title", text: KINDS[k].title }),
                      el("span", { class: "km-kind-sub", text: KINDS[k].summary }),
                    ),
                  ),
                ),
            ),
          ),
        ),
      ),
    ),
  );
  pickerDlg.showModal();
}

// ---------- templates ----------

function openTemplates() {
  const list = templates();
  tplDlg.replaceChildren(
    el(
      "div",
      { class: "km-sheet km-sheet-sm" },
      sheetHead("Шаблоны", "С чего начать", () => tplDlg.close()),
      el(
        "div",
        { class: "km-sheet-body" },
        el("p", { class: "km-note", text: "Шаблон откроется в редакторе — поменяйте что нужно и сохраните." }),
        el(
          "ul",
          { class: "km-kinds" },
          ...list.map((t) =>
            el(
              "li",
              {},
              el(
                "button",
                {
                  type: "button",
                  class: "km-kind",
                  onclick: () => {
                    tplDlg.close();
                    openEditor(t, true);
                  },
                },
                el("span", { class: "km-kind-title", text: t.name }),
                el("span", { class: "km-kind-sub", text: t.steps.map((s) => KINDS[s.kind].title).join(" → ") }),
              ),
            ),
          ),
        ),
      ),
    ),
  );
  tplDlg.showModal();
}

// ---------- runner ----------

type Status = "wait" | "run" | "done" | "skip" | "fail";

class Stopped extends Error {}

let active: { stop: () => void } | null = null;

function openRun(id: string, autostart: boolean) {
  const found = byId(id);
  if (!found) return;
  const c: Command = found;
  active?.stop();

  const statuses = new Map<string, Status>(c.steps.map((s) => [s.id, "wait"]));
  const errors = new Map<string, string>();
  let running = false;
  let input = "";
  let ctrl = new AbortController();
  let pending: ((v: string | null) => void) | null = null;

  const bar = el("div", { class: "km-bar" }, el("span", {}));
  const state = el("p", { class: "label km-state", role: "status", "aria-live": "polite" });
  const stepsList = el("ol", { class: "km-run-steps" });
  const promptBox = el("div", { class: "km-prompt", hidden: true });
  const mainBtn = el("button", { type: "button", class: "btn btn-primary" });

  const paint = () => {
    const done = [...statuses.values()].filter((s) => s === "done" || s === "skip").length;
    (bar.firstChild as HTMLElement).style.width = `${c.steps.length ? (done / c.steps.length) * 100 : 100}%`;
    stepsList.replaceChildren(
      ...c.steps.map((s, i) => {
        const st = statuses.get(s.id) ?? "wait";
        const mark = { wait: "", run: "…", done: "✓", skip: "—", fail: "!" }[st];
        const word = { wait: "ожидает", run: "выполняется", done: "готово", skip: "пропущен", fail: "ошибка" }[st];
        return el(
          "li",
          { class: `km-run-step is-${st}` },
          el("span", { class: "km-step-n", text: String(i + 1).padStart(2, "0") }),
          el(
            "div",
            { class: "km-step-titles" },
            el("p", { class: "km-step-title", text: KINDS[s.kind].title }),
            el("p", { class: "km-step-sub", text: errors.get(s.id) ?? describe(s) }),
          ),
          el("span", { class: "km-mark", "aria-label": word, text: mark }),
        );
      }),
    );
  };

  const setMain = (label: string, fn: () => void) => {
    mainBtn.textContent = label;
    mainBtn.onclick = fn;
  };

  /** Pause on a card. With `input`, returns the typed text; with `action`, runs it inside the tap. */
  const ask = (message: string, opts: { input?: boolean; ok?: string; action?: () => void | Promise<void> } = {}) =>
    new Promise<string | null>((resolve) => {
      const field = opts.input ? el("input", { class: "field", autocomplete: "off", "aria-label": message }) : null;
      const ok = el("button", { type: "button", class: "btn btn-primary", text: opts.ok ?? "Дальше" });
      const stop = el("button", { type: "button", class: "btn btn-ghost", text: "Остановить" });
      const finish = (v: string | null) => {
        pending = null;
        promptBox.hidden = true;
        promptBox.replaceChildren();
        resolve(v);
      };
      pending = finish;
      ok.addEventListener("click", async () => {
        try {
          await opts.action?.();
        } catch {
          /* the step itself reports */
        }
        finish(field ? field.value : "");
      });
      field?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") ok.click();
      });
      stop.addEventListener("click", () => finish(null));
      promptBox.replaceChildren(el("p", { class: "km-prompt-text", text: message }), ...(field ? [field] : []), el("div", { class: "km-row" }, ok, stop));
      promptBox.hidden = false;
      (field ?? ok).focus();
    });

  const resolveVars = async (t: string) => {
    if (!t.includes("{{")) return t;
    const now = new Date();
    let r = t
      .replaceAll("{{дата}}", now.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }))
      .replaceAll("{{время}}", now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }))
      .replaceAll("{{ввод}}", input);
    if (r.includes("{{буфер}}")) {
      let clip = "";
      try {
        clip = await navigator.clipboard.readText();
      } catch {
        clip = (await ask("Браузер не дал прочитать буфер обмена. Вставьте текст сюда:", { input: true })) ?? "";
      }
      r = r.replaceAll("{{буфер}}", clip);
    }
    return r;
  };

  const openExternal = async (url: string) => {
    if (/^https?:/i.test(url)) {
      const w = window.open(url, "_blank");
      if (w) {
        w.opener = null;
        return;
      }
      const v = await ask("Браузер не открыл вкладку сам. Нажмите, чтобы открыть:", {
        ok: "Открыть",
        action: () => {
          window.open(url, "_blank");
        },
      });
      if (v === null) throw new Stopped();
      return;
    }
    // app schemes, tel:, sms:, mailto: — the page stays, the system takes over
    location.href = url;
    await sleep(900, ctrl.signal);
  };

  const speak = (text: string) =>
    new Promise<boolean>((resolve) => {
      if (!("speechSynthesis" in window)) return resolve(false);
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ru-RU";
      const voice = speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith("ru"));
      if (voice) u.voice = voice;
      let started = false;
      const end = () => resolve(true);
      u.onstart = () => (started = true);
      u.onend = end;
      u.onerror = () => resolve(started);
      ctrl.signal.addEventListener("abort", () => speechSynthesis.cancel());
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
      // iOS refuses speech that did not start from a tap: report it so the run can ask for one
      setTimeout(() => {
        if (!started && !speechSynthesis.speaking) {
          speechSynthesis.cancel();
          resolve(false);
        }
      }, 1500);
    });

  const perform = async (s: Step): Promise<Status> => {
    if (!isReady(s)) throw new Error("Шаг не заполнен — откройте команду и допишите его.");
    switch (s.kind) {
      case "openURL": {
        let u = (await resolveVars(s.text)).trim();
        if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) u = "https://" + u;
        const enc = u.replace(/\s/g, "%20");
        try {
          new URL(enc);
        } catch {
          throw new Error("Некорректная ссылка.");
        }
        await openExternal(enc);
        return "done";
      }
      case "openApp":
        await openExternal(s.text.trim());
        return "done";
      case "runShortcut": {
        const q = new URLSearchParams({ name: s.text.trim() });
        const t = await resolveVars(s.detail);
        if (t) {
          q.set("input", "text");
          q.set("text", t);
        }
        await openExternal(`shortcuts://run-shortcut?${q.toString().replace(/\+/g, "%20")}`);
        return "done";
      }
      case "call":
        await openExternal(`tel:${s.text.replace(/[^\d+]/g, "")}`);
        return "done";
      case "message": {
        const body = await resolveVars(s.detail);
        const to = s.text.replace(/[^\d+]/g, "");
        await openExternal(body ? `sms:${to}&body=${encodeURIComponent(body)}` : `sms:${to}`);
        return "done";
      }
      case "email": {
        const q: string[] = [];
        const subject = await resolveVars(s.detail);
        const body = await resolveVars(s.extra);
        if (subject) q.push(`subject=${encodeURIComponent(subject)}`);
        if (body) q.push(`body=${encodeURIComponent(body)}`);
        await openExternal(`mailto:${encodeURIComponent(s.text.trim()).replace(/%40/g, "@")}${q.length ? "?" + q.join("&") : ""}`);
        return "done";
      }
      case "copyText": {
        const t = await resolveVars(s.text);
        try {
          await navigator.clipboard.writeText(t);
        } catch {
          const v = await ask("Браузер просит подтвердить копирование:", { ok: "Скопировать", action: () => navigator.clipboard.writeText(t) });
          if (v === null) throw new Stopped();
        }
        return "done";
      }
      case "speak": {
        const t = await resolveVars(s.text);
        if (!("speechSynthesis" in window)) throw new Error("Этот браузер не умеет озвучивать текст.");
        if (await speak(t)) return "done";
        const tap: { spoken?: Promise<boolean> } = {};
        const v = await ask("Браузер ждёт нажатия, чтобы включить звук:", {
          ok: "Озвучить",
          action: () => {
            tap.spoken = speak(t);
          },
        });
        if (v === null) throw new Stopped();
        await tap.spoken;
        return "done";
      }
      case "showText": {
        const v = await ask(await resolveVars(s.text));
        if (v === null) throw new Stopped();
        return "done";
      }
      case "askInput": {
        const v = await ask(s.text.trim() || "Введите текст", { input: true, ok: "Продолжить" });
        if (v === null) throw new Stopped();
        input = v;
        return "done";
      }
      case "vibrate":
        return "vibrate" in navigator && navigator.vibrate(200) ? "done" : "skip";
      case "wait":
        await sleep(Math.max(1, s.number) * 1000, ctrl.signal);
        return "done";
    }
  };

  const finish = (text: string) => {
    running = false;
    runDlg.dataset.lock = "0";
    state.textContent = text;
    setMain("Запустить снова", start);
    paint();
  };

  async function start() {
    if (running) return;
    running = true;
    runDlg.dataset.lock = "1";
    ctrl = new AbortController();
    input = "";
    c.steps.forEach((s) => statuses.set(s.id, "wait"));
    errors.clear();
    setMain("Остановить", stop);
    c.runCount = (c.runCount || 0) + 1;
    c.lastRunAt = new Date().toISOString();
    save();

    for (const [i, s] of c.steps.entries()) {
      if (!running) return;
      statuses.set(s.id, "run");
      state.textContent = `Шаг ${i + 1} из ${c.steps.length}`;
      paint();
      try {
        statuses.set(s.id, await perform(s));
      } catch (e) {
        if (e instanceof Stopped || (e instanceof DOMException && e.name === "AbortError")) {
          statuses.set(s.id, "wait");
          return finish("Остановлено");
        }
        statuses.set(s.id, "fail");
        errors.set(s.id, e instanceof Error ? e.message : "Не получилось.");
        return finish(`Ошибка на шаге ${i + 1}`);
      }
      paint();
    }
    finish(c.steps.length ? "Готово" : "В команде нет шагов");
  }

  function stop() {
    if (!running) return;
    ctrl.abort();
    pending?.(null);
    running = false;
  }

  active = { stop };

  runDlg.replaceChildren(
    el(
      "div",
      { class: "km-sheet km-sheet-sm" },
      sheetHead("Выполнение", c.name, () => {
        stop();
        runDlg.close();
      }),
      el("div", { class: "km-sheet-body" }, state, bar, promptBox, stepsList),
      el(
        "footer",
        { class: "km-sheet-foot" },
        el("button", {
          type: "button",
          class: "btn btn-ghost",
          text: "Изменить",
          onclick: () => {
            stop();
            runDlg.close();
            openEditor(c);
          },
        }),
        mainBtn,
      ),
    ),
  );
  runDlg.onclose = () => {
    stop();
    active = null;
  };
  runDlg.oncancel = (e) => {
    if (running) {
      e.preventDefault();
      stop();
    }
  };
  state.textContent = c.steps.length ? stepsWord(c.steps.length) : "В команде нет шагов";
  setMain("Запустить", start);
  paint();
  runDlg.showModal();
  if (autostart && c.steps.length) void start();
}

// ---------- export / import ----------

function exportAll() {
  const blob = new Blob([JSON.stringify({ app: "komandir", version: 1, commands }, null, 2)], { type: "application/json" });
  const a = el("a", { href: URL.createObjectURL(blob), download: `komandir-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const kindsList = Object.keys(KINDS) as StepKind[];
const str = (v: unknown, max = 2000) => (typeof v === "string" ? v.slice(0, max) : "");

async function importFile(file: File) {
  try {
    const data = JSON.parse(await file.text());
    const list: unknown[] = Array.isArray(data) ? data : Array.isArray(data?.commands) ? data.commands : [];
    const clean: Command[] = list
      .filter((c): c is Record<string, unknown> => !!c && typeof c === "object")
      .map((c) => ({
        id: uid(),
        name: str(c.name, 60).trim() || "Без названия",
        createdAt: new Date().toISOString(),
        runCount: 0,
        steps: (Array.isArray(c.steps) ? c.steps : [])
          .filter((s: unknown): s is Record<string, unknown> => !!s && typeof s === "object" && kindsList.includes((s as Step).kind))
          .slice(0, 50)
          .map((s: Record<string, unknown>) =>
            newStep(s.kind as StepKind, {
              text: str(s.text),
              detail: str(s.detail),
              extra: str(s.extra),
              number: Math.min(3600, Math.max(1, Number(s.number) || 3)),
            }),
          ),
      }));
    if (!clean.length) return alert("В файле нет команд.");
    if (!confirm(`Добавить ${plural(clean.length, "команду", "команды", "команд")} из файла?`)) return;
    commands = [...commands, ...clean].slice(0, 200);
    save();
  } catch {
    alert("Не получилось прочитать файл. Нужен JSON, сохранённый кнопкой «Экспорт».");
  }
}

// ---------- wiring ----------

document.querySelectorAll("[data-km-new]").forEach((b) => b.addEventListener("click", () => openEditor()));
document.querySelectorAll("[data-km-tpl]").forEach((b) => b.addEventListener("click", openTemplates));
$("[data-km-export]").addEventListener("click", exportAll);
const fileInput = $<HTMLInputElement>("[data-km-file]");
$("[data-km-import]").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  const f = fileInput.files?.[0];
  if (f) void importFile(f);
  fileInput.value = "";
});

// accent (shared with the site and /launcher: same key)
const picks = document.querySelectorAll<HTMLButtonElement>("[data-accent-pick]");
const paintAccent = () => {
  const cur = document.documentElement.dataset.accent || "violet";
  picks.forEach((b) => b.setAttribute("aria-checked", String(b.dataset.accentPick === cur)));
};
picks.forEach((b) =>
  b.addEventListener("click", () => {
    const a = b.dataset.accentPick!;
    if (a === "violet") delete document.documentElement.dataset.accent;
    else document.documentElement.dataset.accent = a;
    try {
      localStorage.setItem(ACCENT, a);
    } catch {
      /* not persisted */
    }
    paintAccent();
  }),
);

// voices load late in some browsers; asking once warms the list
if ("speechSynthesis" in window) speechSynthesis.getVoices();

renderList();
paintAccent();

// /komandir?run=<name or id>: open the command ready to start (a tap starts it, so the browser
// allows sound, new tabs and the clipboard)
const want = new URLSearchParams(location.search).get("run");
if (want) {
  const c = byId(want) ?? byName(want);
  if (c) openRun(c.id, false);
  else {
    $("[data-km-missing]").hidden = false;
    $("[data-km-missing-name]").textContent = want;
  }
  history.replaceState(null, "", location.pathname);
}
