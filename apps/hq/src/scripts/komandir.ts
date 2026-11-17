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

const GROUPS = ["Sites and apps", "People", "Text", "Device and time"];

const KINDS: Record<StepKind, Kind> = {
  openURL: {
    title: "Open a link",
    summary: "A site, in a new tab",
    group: GROUPS[0],
    needsText: true,
    fields: [{ key: "text", label: "Address", placeholder: "https://example.com", type: "url", vars: true, note: "Skip the https://. It will cope." }],
  },
  openApp: {
    title: "Open an app",
    summary: "Telegram, Maps, Notes…",
    group: GROUPS[0],
    needsText: true,
    fields: [{ key: "text", label: "URL scheme", placeholder: "tg://", note: "Pick one above or type your own. iPhone only." }],
  },
  runShortcut: {
    title: "Shortcut",
    summary: "Run one from the iOS Shortcuts app",
    group: GROUPS[0],
    needsText: true,
    fields: [
      { key: "text", label: "Shortcut name", placeholder: "Exactly as in Shortcuts" },
      { key: "detail", label: "Input text", placeholder: "Optional", vars: true },
    ],
  },
  call: {
    title: "Call",
    summary: "Dial a number",
    group: GROUPS[1],
    needsText: true,
    fields: [{ key: "text", label: "Number", placeholder: "+380 00 000 00 00", type: "tel" }],
  },
  message: {
    title: "Message",
    summary: "SMS or iMessage, pre-written",
    group: GROUPS[1],
    fields: [
      { key: "text", label: "To", placeholder: "+380 00 000 00 00", type: "tel", note: "Leave empty to pick someone in Messages." },
      { key: "detail", label: "Text", area: true, vars: true },
    ],
  },
  email: {
    title: "Email",
    summary: "Subject and body, ready to go",
    group: GROUPS[1],
    fields: [
      { key: "text", label: "To", placeholder: "name@example.com", type: "email" },
      { key: "detail", label: "Subject", vars: true },
      { key: "extra", label: "Body", area: true, vars: true },
    ],
  },
  copyText: {
    title: "Copy",
    summary: "Text to the clipboard",
    group: GROUPS[2],
    needsText: true,
    fields: [{ key: "text", label: "Text", area: true, vars: true }],
  },
  speak: {
    title: "Speak",
    summary: "Read text aloud",
    group: GROUPS[2],
    needsText: true,
    fields: [{ key: "text", label: "Text", area: true, vars: true }],
  },
  showText: {
    title: "Show",
    summary: "A note and a Next button",
    group: GROUPS[2],
    needsText: true,
    fields: [{ key: "text", label: "Text", area: true, vars: true }],
  },
  askInput: {
    title: "Ask",
    summary: "The answer lands in {{input}}",
    group: GROUPS[2],
    fields: [{ key: "text", label: "Question", placeholder: "What should I note?" }],
  },
  vibrate: {
    title: "Vibrate",
    summary: "A short buzz",
    group: GROUPS[3],
    fields: [],
    note: "Android only. iPhone does not let websites buzz, so the step is skipped.",
  },
  wait: {
    title: "Wait",
    summary: "Pause before the next step",
    group: GROUPS[3],
    fields: [{ key: "number", label: "Seconds", type: "number" }],
  },
};

const APPS: [string, string][] = [
  ["Shortcuts", "shortcuts://"],
  ["Maps", "maps://"],
  ["Music", "music://"],
  ["Notes", "mobilenotes://"],
  ["Calendar", "calshow://"],
  ["Photos", "photos-redirect://"],
  ["Mail", "message://"],
  ["Files", "shareddocuments://"],
  ["Weather", "weather://"],
  ["App Store", "itms-apps://apps.apple.com"],
  ["Telegram", "tg://"],
  ["WhatsApp", "whatsapp://"],
  ["Instagram", "instagram://"],
  ["YouTube", "youtube://"],
  ["Spotify", "spotify://"],
];

const VARS: [string, string][] = [
  ["{{date}}", "today"],
  ["{{time}}", "now"],
  ["{{clipboard}}", "whatever you copied last"],
  ["{{input}}", "the answer from an Ask step"],
];

// ---------- helpers ----------

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const stepsWord = (n: number) => (n ? plural(n, "step", "steps") : "no steps");

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
  if (!isReady(s)) return "Needs filling in";
  switch (s.kind) {
    case "openApp":
      return APPS.find(([, v]) => v === s.text)?.[0] ?? s.text;
    case "runShortcut":
      return `“${s.text}”`;
    case "message":
      return [s.text, s.detail].filter(Boolean).join(" · ") || "Recipient and text: in Messages";
    case "email":
      return [s.text, s.detail].filter(Boolean).join(" · ") || "A blank email";
    case "askInput":
      return `${s.text || "Type a question"} → {{input}}`;
    case "wait":
      return plural(s.number, "second", "seconds");
    case "vibrate":
      return "A short buzz";
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
const byName = (name: string) => commands.find((c) => c.name.toLocaleLowerCase() === name.toLocaleLowerCase());
const runLink = (c: Command) => `${location.origin}/komandir?run=${encodeURIComponent(c.name)}`;

// ---------- templates ----------

const templates = (): Command[] =>
  [
    {
      name: "Good morning",
      steps: [newStep("speak", { text: "Good morning. It is {{date}}, {{time}}. Coffee first." }), newStep("openApp", { text: "weather://" })],
    },
    {
      name: "Quick note",
      steps: [
        newStep("askInput", { text: "What should I note?" }),
        newStep("copyText", { text: "{{date}}, {{time}}: {{input}}" }),
        newStep("showText", { text: "Copied. Paste it into Notes." }),
        newStep("openApp", { text: "mobilenotes://" }),
      ],
    },
    {
      name: "Heading home",
      steps: [newStep("message", { detail: "On my way. Sent at {{time}}, give or take traffic." }), newStep("openApp", { text: "maps://" })],
    },
    {
      name: "Break",
      steps: [
        newStep("speak", { text: "Break time. The screen will still be here." }),
        newStep("wait", { number: 60 }),
        newStep("vibrate"),
        newStep("showText", { text: "Break over. Back to it." }),
      ],
    },
    {
      name: "Daily report",
      steps: [newStep("askInput", { text: "What got done today?" }), newStep("email", { detail: "Report for {{date}}", extra: "{{input}}" })],
    },
    {
      name: "Search the clipboard",
      steps: [newStep("openURL", { text: "https://www.google.com/search?q={{clipboard}}" })],
    },
    { name: "Call family", steps: [newStep("call")] },
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
        { type: "button", class: "km-tile", "aria-label": `Run “${c.name}”, ${stepsWord(c.steps.length)}`, onclick: () => openRun(c.id, true) },
        el("span", { class: "km-n", text: String(i + 1).padStart(2, "0") }),
        el("span", { class: "km-mono", text: c.name.trim().slice(0, 2) || "—" }),
        el("span", { class: "km-name", text: c.name }),
        el("span", { class: "km-meta", text: stepsWord(c.steps.length) }),
      );
      const edit = el("button", { type: "button", class: "km-edit", "aria-label": `Edit “${c.name}”`, text: "Edit", onclick: () => openEditor(c) });
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
    el("button", { type: "button", class: "km-x", "aria-label": "Close", text: "×", onclick: close }),
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
  if (!force && dirty() && !confirm("Close without saving?")) return;
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
      { class: "km-vars", role: "group", "aria-label": "Insert a variable" },
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
      { class: "field", "aria-label": "App" },
      el("option", { value: "", text: "Pick an app…" }),
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
    body.append(el("div", { class: "km-field" }, el("span", { class: "label km-field-label", text: "App" }), sel));
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
        el("button", { type: "button", class: "km-tool", "aria-label": "Move up", text: "↑", disabled: index === 0, onclick: () => move(index - 1) }),
        el("button", { type: "button", class: "km-tool", "aria-label": "Move down", text: "↓", disabled: index === total - 1, onclick: () => move(index + 1) }),
        el("button", { type: "button", class: "km-tool km-tool-del", "aria-label": `Delete step ${index + 1}`, text: "×", onclick: remove }),
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
    placeholder: "Say, Good morning",
    maxlength: 60,
    autocomplete: "off",
    "aria-label": "Command name",
  });
  nameInput.value = d.name;
  const saveBtn = el("button", { type: "button", class: "btn btn-primary", text: isNew ? "Create" : "Save" });
  const syncSave = () => (saveBtn.disabled = d.name.trim() === "");
  nameInput.addEventListener("input", () => {
    d.name = nameInput.value;
    syncSave();
  });
  syncSave();
  saveBtn.addEventListener("click", () => {
    const name = d.name.trim();
    if (!name) return;
    const clash = commands.find((c) => c.id !== d.id && c.name.toLocaleLowerCase() === name.toLocaleLowerCase());
    if (clash && !confirm(`“${name}” already exists. A run link by name opens the first one. Save anyway?`)) return;
    d.name = name;
    const i = commands.findIndex((c) => c.id === d.id);
    if (i >= 0) commands[i] = d;
    else commands.push(d);
    save();
    closeEditor(true);
  });

  const extra: HTMLElement[] = [];
  if (!isNew) {
    const copy = el("button", { type: "button", class: "btn btn-ghost", text: "Copy run link" });
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(runLink(d));
        copy.textContent = "Copied";
      } catch {
        prompt("Run link:", runLink(d));
      }
    });
    const del = el("button", {
      type: "button",
      class: "btn km-danger",
      text: "Delete command",
      onclick: () => {
        if (!confirm(`Delete “${d.name}”? There is no undo.`)) return;
        commands = commands.filter((c) => c.id !== d.id);
        save();
        closeEditor(true);
      },
    });
    extra.push(
      el(
        "section",
        { class: "km-block" },
        el("p", { class: "label sec-index", text: "Run link" }),
        el("p", {
          class: "km-note",
          text: "Opens this command. Put it on the Home Screen, in bookmarks, or in Shortcuts as an Open URL action.",
        }),
        el("div", { class: "km-row" }, copy, del),
      ),
    );
  }

  editorDlg.replaceChildren(
    el(
      "div",
      { class: "km-sheet" },
      sheetHead(isNew ? "New command" : "Command", isNew ? "Build a command" : d.name || "Untitled", () => closeEditor()),
      el(
        "div",
        { class: "km-sheet-body" },
        el("label", { class: "label km-field-label", text: "Name" }, nameInput),
        el(
          "section",
          { class: "km-block" },
          el("p", { class: "label sec-index", text: `Steps · ${d.steps.length}` }),
          d.steps.length
            ? el("ol", { class: "km-steps" }, ...d.steps.map((s, i) => stepCard(s, i, d.steps.length)))
            : el("p", { class: "km-note", text: "No steps yet. Start with Open a link, or Speak if you like being talked to." }),
          el("button", { type: "button", class: "btn btn-ghost km-add", text: "+ Add a step", onclick: openPicker }),
        ),
        ...extra,
      ),
      el(
        "footer",
        { class: "km-sheet-foot" },
        el("button", { type: "button", class: "btn btn-ghost", text: "Cancel", onclick: () => closeEditor() }),
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
      sheetHead("Step", "What should happen?", () => pickerDlg.close()),
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
      sheetHead("Templates", "Somewhere to start", () => tplDlg.close()),
      el(
        "div",
        { class: "km-sheet-body" },
        el("p", { class: "km-note", text: "Opens in the editor. Change what you like, then save." }),
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
        const word = { wait: "waiting", run: "running", done: "done", skip: "skipped", fail: "failed" }[st];
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
      const ok = el("button", { type: "button", class: "btn btn-primary", text: opts.ok ?? "Next" });
      const stop = el("button", { type: "button", class: "btn btn-ghost", text: "Stop" });
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
    // English names; the Russian ones of the first version still work
    const date = now.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    const time = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    let r = t
      .replaceAll("{{date}}", date).replaceAll("{{дата}}", date)
      .replaceAll("{{time}}", time).replaceAll("{{время}}", time)
      .replaceAll("{{input}}", input).replaceAll("{{ввод}}", input);
    if (r.includes("{{clipboard}}") || r.includes("{{буфер}}")) {
      let clip = "";
      try {
        clip = await navigator.clipboard.readText();
      } catch {
        clip = (await ask("The browser would not share the clipboard. Paste it here:", { input: true })) ?? "";
      }
      r = r.replaceAll("{{clipboard}}", clip).replaceAll("{{буфер}}", clip);
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
      const v = await ask("The browser wants a tap before opening a tab:", {
        ok: "Open",
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
      // the voice follows the text: Cyrillic is read in Russian, everything else in English
      const lang = /[\u0400-\u04FF]/.test(text) ? "ru" : "en";
      u.lang = lang === "ru" ? "ru-RU" : "en-GB";
      const voice = speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith(lang));
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
    if (!isReady(s)) throw new Error("This step is unfinished. Open the command and fill it in.");
    switch (s.kind) {
      case "openURL": {
        let u = (await resolveVars(s.text)).trim();
        if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) u = "https://" + u;
        const enc = u.replace(/\s/g, "%20");
        try {
          new URL(enc);
        } catch {
          throw new Error("That is not a link.");
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
          const v = await ask("The browser wants a tap before copying:", { ok: "Copy", action: () => navigator.clipboard.writeText(t) });
          if (v === null) throw new Stopped();
        }
        return "done";
      }
      case "speak": {
        const t = await resolveVars(s.text);
        if (!("speechSynthesis" in window)) throw new Error("This browser cannot speak.");
        if (await speak(t)) return "done";
        const tap: { spoken?: Promise<boolean> } = {};
        const v = await ask("The browser wants a tap before it makes noise:", {
          ok: "Speak",
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
        const v = await ask(s.text.trim() || "Type something", { input: true, ok: "Continue" });
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
    setMain("Run again", start);
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
    setMain("Stop", stop);
    c.runCount = (c.runCount || 0) + 1;
    c.lastRunAt = new Date().toISOString();
    save();

    for (const [i, s] of c.steps.entries()) {
      if (!running) return;
      statuses.set(s.id, "run");
      state.textContent = `Step ${i + 1} of ${c.steps.length}`;
      paint();
      try {
        statuses.set(s.id, await perform(s));
      } catch (e) {
        if (e instanceof Stopped || (e instanceof DOMException && e.name === "AbortError")) {
          statuses.set(s.id, "wait");
          return finish("Stopped");
        }
        statuses.set(s.id, "fail");
        errors.set(s.id, e instanceof Error ? e.message : "That did not work.");
        return finish(`Step ${i + 1} failed`);
      }
      paint();
    }
    finish(c.steps.length ? "Done" : "Nothing to run");
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
      sheetHead("Running", c.name, () => {
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
          text: "Edit",
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
  state.textContent = c.steps.length ? stepsWord(c.steps.length) : "Nothing to run";
  setMain("Run", start);
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
        name: str(c.name, 60).trim() || "Untitled",
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
    if (!clean.length) return alert("No commands in that file.");
    if (!confirm(`Add ${plural(clean.length, "command", "commands")} from the file?`)) return;
    commands = [...commands, ...clean].slice(0, 200);
    save();
  } catch {
    alert("Could not read that. It needs the JSON from Export.");
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
