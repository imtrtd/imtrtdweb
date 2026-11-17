/* /apps/cuebox — local-first Cuebox: prompts in AI-service folders, {{variables}} filled before use,
   copy or open with the prompt prefilled, favourites, search, JSON import/export. localStorage only. */
import { copyText, download, esc, store, toast } from "./apps-common";

type Prompt = {
  id: string;
  title: string;
  folder: string;
  body: string;
  tags: string[];
  favorite: boolean;
  uses: number;
  updatedAt: string;
  lastUsedAt: string | null;
};

type Folder = { id: string; name: string; url: string; prefill?: (q: string) => string };
const FOLDERS: Folder[] = [
  { id: "chatgpt", name: "ChatGPT", url: "https://chatgpt.com/", prefill: (q) => `https://chatgpt.com/?q=${encodeURIComponent(q)}` },
  { id: "claude", name: "Claude", url: "https://claude.ai/new", prefill: (q) => `https://claude.ai/new?q=${encodeURIComponent(q)}` },
  { id: "perplexity", name: "Perplexity", url: "https://www.perplexity.ai/", prefill: (q) => `https://www.perplexity.ai/search?q=${encodeURIComponent(q)}` },
  { id: "gemini", name: "Gemini", url: "https://gemini.google.com/app" },
  { id: "copilot", name: "Copilot", url: "https://copilot.microsoft.com/" },
  { id: "grok", name: "Grok", url: "https://grok.com/" },
  { id: "deepseek", name: "DeepSeek", url: "https://chat.deepseek.com/" },
  { id: "other", name: "Без папки", url: "" },
];
const folderById = (id: string) => FOLDERS.find((f) => f.id === id) ?? FOLDERS[FOLDERS.length - 1];

const KEY = "imtrtd-cuebox";
const now = () => new Date().toISOString();
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);

const SEED: Omit<Prompt, "id" | "updatedAt" | "lastUsedAt" | "uses" | "favorite">[] = [
  {
    title: "Ревью текста для сайта",
    folder: "claude",
    tags: ["тексты", "сайт"],
    body: "Ты — редактор. Прочитай текст для страницы «{{страница}}» и предложи правки.\n\nАудитория: {{аудитория}}\nТон: {{тон:спокойный, по делу}}\n\nТекст:\n{{текст}}\n\nВерни: 1) три главные проблемы, 2) исправленный текст, 3) один вариант заголовка.",
  },
  {
    title: "Бриф на сайт из переписки",
    folder: "chatgpt",
    tags: ["клиенты", "бриф"],
    body: "Вот переписка с клиентом:\n{{переписка}}\n\nСобери из неё бриф: цель сайта, что посетитель должен сделать на первом экране, страницы, языки, сроки, чего не хватает. Отдельным списком — вопросы, которые надо задать клиенту.",
  },
  {
    title: "Подпись к посту в Instagram",
    folder: "chatgpt",
    tags: ["соцсети"],
    body: "Напиши подпись к посту о {{о чём пост}} для аккаунта {{аккаунт:@imtryingtodesign}}.\nДлина — до 300 знаков, без эмодзи-гирлянд, в конце — один вопрос к читателю. Три варианта.",
  },
  {
    title: "Разобраться в теме за 10 минут",
    folder: "perplexity",
    tags: ["исследование"],
    body: "Объясни {{тема}} так, чтобы я за 10 минут понял главное. Дай: суть в двух фразах, 5 ключевых понятий, частые ошибки и 3 источника, которым можно доверять.",
  },
  {
    title: "Ревью pull request",
    folder: "claude",
    tags: ["код"],
    body: "Сделай ревью изменений. Язык: {{язык:TypeScript}}.\nСначала — ошибки и риски (с номерами строк), потом — упрощения. Мелочи стиля не перечисляй.\n\n{{diff}}",
  },
];

function seed(): Prompt[] {
  const t = now();
  return SEED.map((s, i) => ({ ...s, id: uid(), favorite: i === 0, uses: 0, updatedAt: t, lastUsedAt: null }));
}

function normalize(p: Partial<Prompt> & Record<string, unknown>): Prompt | null {
  const body = String(p.body ?? p.content ?? p.text ?? p.prompt ?? "").trim();
  const title = String(p.title ?? p.name ?? "").trim() || body.split("\n")[0].slice(0, 60);
  if (!body) return null;
  const folderRaw = String(p.folder ?? p.collection ?? p.model ?? "other").toLowerCase();
  const folder = FOLDERS.some((f) => f.id === folderRaw) ? folderRaw : FOLDERS.find((f) => f.name.toLowerCase() === folderRaw)?.id ?? "other";
  const tags = Array.isArray(p.tags) ? p.tags.map((x) => String(x).trim()).filter(Boolean).slice(0, 12) : [];
  return {
    id: typeof p.id === "string" && p.id ? p.id : uid(),
    title: title.slice(0, 120),
    folder,
    body: body.slice(0, 20000),
    tags,
    favorite: Boolean(p.favorite),
    uses: Number(p.uses ?? p.copyCount ?? 0) || 0,
    updatedAt: typeof p.updatedAt === "string" ? p.updatedAt : now(),
    lastUsedAt: typeof p.lastUsedAt === "string" ? p.lastUsedAt : null,
  };
}

let items: Prompt[] = (() => {
  const saved = store.get<unknown>(KEY, null);
  if (!Array.isArray(saved)) return seed();
  return saved.map((x) => normalize(x as Prompt)).filter((x): x is Prompt => !!x);
})();
const save = () => store.set(KEY, items);
save();
if (!store.ok) document.querySelector<HTMLElement>("[data-cb-storage]")!.hidden = false;

/* variables: {{name}} or {{name:default}} — names may be Cyrillic and contain spaces */
const VAR_RE = /\{\{\s*([^{}:]+?)\s*(?::\s*([^{}]*?))?\s*\}\}/g;
function vars(body: string) {
  const out = new Map<string, string>();
  for (const m of body.matchAll(VAR_RE)) if (!out.has(m[1])) out.set(m[1], m[2] ?? "");
  return out;
}
const fill = (body: string, values: Map<string, string>) => body.replace(VAR_RE, (_m, name: string, def?: string) => values.get(name.trim()) || def || "");

/* ---------- list ---------- */
const listEl = document.querySelector<HTMLUListElement>("[data-cb-list]")!;
const emptyEl = document.querySelector<HTMLElement>("[data-cb-empty]")!;
const foldersEl = document.querySelector<HTMLElement>("[data-cb-folders]")!;
const qEl = document.querySelector<HTMLInputElement>("[data-cb-q]")!;
let current = "all";

function counts() {
  const c: Record<string, number> = { all: items.length, fav: items.filter((p) => p.favorite).length };
  for (const p of items) c[p.folder] = (c[p.folder] ?? 0) + 1;
  return c;
}
function renderFolders() {
  const c = counts();
  const list = [{ id: "all", name: "Все" }, { id: "fav", name: "★ Избранное" }, ...FOLDERS.filter((f) => c[f.id] || f.id === current)];
  foldersEl.innerHTML = list
    .map((f) => `<button type="button" data-folder="${f.id}" aria-pressed="${f.id === current}">${esc(f.name)}<span class="n">${c[f.id] ?? 0}</span></button>`)
    .join("");
}
foldersEl.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-folder]");
  if (!b) return;
  current = b.dataset.folder!;
  render();
});
qEl.addEventListener("input", () => renderList());

function highlight(body: string) {
  return esc(body).replace(/\{\{[^{}]+\}\}/g, (m) => `<mark>${m}</mark>`);
}
function renderList() {
  const q = qEl.value.trim().toLowerCase();
  const shown = items
    .filter((p) => (current === "all" ? true : current === "fav" ? p.favorite : p.folder === current))
    .filter((p) => !q || `${p.title}\n${p.body}\n${p.tags.join(" ")}`.toLowerCase().includes(q))
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || (b.lastUsedAt ?? b.updatedAt).localeCompare(a.lastUsedAt ?? a.updatedAt));
  listEl.innerHTML = shown
    .map((p) => {
      const f = folderById(p.folder);
      const n = vars(p.body).size;
      return `<li data-id="${p.id}">
  <div class="cb-meta"><span class="label text-signal">${esc(f.name)}${n ? ` · ${n} перем.` : ""}</span>
    <button type="button" class="cb-star" data-act="fav" aria-pressed="${p.favorite}" aria-label="${p.favorite ? "Убрать из избранного" : "В избранное"}">${p.favorite ? "★" : "☆"}</button></div>
  <h3 class="cb-title">${esc(p.title)}</h3>
  <p class="cb-body">${highlight(p.body)}</p>
  ${p.tags.length ? `<ul class="cb-tags">${p.tags.map((t) => `<li class="chip">${esc(t)}</li>`).join("")}</ul>` : "<span></span>"}
  <div class="cb-acts">
    <button type="button" class="btn btn-primary" data-act="use">${n ? "Заполнить" : "Копировать"}</button>
    ${f.url ? `<button type="button" class="btn btn-ghost" data-act="open">${esc(f.name)} ↗</button>` : ""}
    <button type="button" class="btn btn-ghost" data-act="edit">Изменить</button>
  </div>
</li>`;
    })
    .join("");
  emptyEl.hidden = shown.length > 0;
  emptyEl.querySelector("[data-cb-empty-note]")!.textContent = q ? "Ничего не нашлось — попробуйте другой запрос." : current === "all" ? "Добавьте первый промпт." : "В этой папке пока нет промптов.";
}
function render() {
  renderFolders();
  renderList();
}

listEl.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-act]");
  if (!b) return;
  const p = items.find((x) => x.id === b.closest<HTMLElement>("[data-id]")!.dataset.id);
  if (!p) return;
  const act = b.dataset.act;
  if (act === "fav") {
    p.favorite = !p.favorite;
    save();
    render();
  } else if (act === "edit") openEditor(p);
  else if (act === "use" || act === "open") {
    if (vars(p.body).size) openUse(p, act === "open");
    else void deliver(p, p.body, act === "open");
  }
});

/* ---------- use: fill variables, copy / open ---------- */
async function deliver(p: Prompt, text: string, open: boolean) {
  p.uses += 1;
  p.lastUsedAt = now();
  save();
  const f = folderById(p.folder);
  if (open && f.url) {
    if (f.prefill && text.length < 6000) {
      window.open(f.prefill(text), "_blank", "noopener");
      toast(`Открыто в ${f.name}`);
    } else {
      await copyText(text);
      window.open(f.url, "_blank", "noopener");
      toast(`Скопировано — вставьте в ${f.name}`);
    }
  } else {
    toast((await copyText(text)) ? "Скопировано" : "Не удалось скопировать");
  }
  renderList();
}

const useDlg = document.querySelector<HTMLDialogElement>("[data-cb-use]")!;
function openUse(p: Prompt, openAfter: boolean) {
  const v = vars(p.body);
  const f = folderById(p.folder);
  useDlg.innerHTML = `<form class="ap-sheet" method="dialog">
  <div class="ap-sheet-head"><div><p class="label text-signal">Переменные · ${v.size}</p><h2 class="ap-sheet-title">${esc(p.title)}</h2></div><button type="button" class="ap-x" data-x aria-label="Закрыть">×</button></div>
  <div class="ap-sheet-body">
    ${[...v.entries()]
      .map(
        ([name, def], i) =>
          `<label class="ap-field"><span class="label">${esc(name)}</span>${
            /текст|переписка|diff|код/i.test(name) ? `<textarea class="field" rows="4" data-var="${esc(name)}" ${i === 0 ? "autofocus" : ""}>${esc(def)}</textarea>` : `<input class="field" data-var="${esc(name)}" value="${esc(def)}" ${i === 0 ? "autofocus" : ""} />`
          }</label>`,
      )
      .join("")}
    <div class="ap-field"><span class="label text-mute">Что получится</span><div class="cb-preview" data-preview></div></div>
  </div>
  <div class="ap-sheet-foot">
    <button type="button" class="btn btn-ghost" data-go="copy">Копировать</button>
    ${f.url ? `<button type="button" class="btn ${openAfter ? "btn-primary" : "btn-ghost"}" data-go="open">Открыть в ${esc(f.name)} ↗</button>` : ""}
    ${openAfter ? "" : `<button type="button" class="btn btn-primary" data-go="copy-close">Копировать и закрыть</button>`}
  </div>
</form>`;
  const values = () => new Map([...useDlg.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("[data-var]")].map((el) => [el.dataset.var!, el.value]));
  const preview = useDlg.querySelector<HTMLElement>("[data-preview]")!;
  const upd = () => (preview.textContent = fill(p.body, values()));
  useDlg.addEventListener("input", upd);
  upd();
  useDlg.querySelector("[data-x]")!.addEventListener("click", () => useDlg.close());
  useDlg.querySelectorAll<HTMLButtonElement>("[data-go]").forEach((b) =>
    b.addEventListener("click", () => {
      const text = fill(p.body, values());
      const go = b.dataset.go;
      void deliver(p, text, go === "open");
      if (go !== "copy") useDlg.close();
    }),
  );
  useDlg.showModal();
}

/* ---------- editor ---------- */
const edDlg = document.querySelector<HTMLDialogElement>("[data-cb-editor]")!;
function openEditor(p?: Prompt) {
  const isNew = !p;
  const d = p ?? { id: "", title: "", folder: current !== "all" && current !== "fav" ? current : "chatgpt", body: "", tags: [], favorite: false, uses: 0, updatedAt: now(), lastUsedAt: null };
  edDlg.innerHTML = `<form class="ap-sheet" novalidate>
  <div class="ap-sheet-head"><div><p class="label text-signal">${isNew ? "Новый промпт" : "Редактор"}</p><h2 class="ap-sheet-title">${isNew ? "Что сохранить?" : esc(d.title)}</h2></div><button type="button" class="ap-x" data-x aria-label="Закрыть">×</button></div>
  <div class="ap-sheet-body">
    <label class="ap-field"><span class="label">Название</span><input class="field" name="title" value="${esc(d.title)}" maxlength="120" required /></label>
    <label class="ap-field"><span class="label">Папка</span><select class="field" name="folder">${FOLDERS.map((f) => `<option value="${f.id}" ${f.id === d.folder ? "selected" : ""}>${esc(f.name)}</option>`).join("")}</select></label>
    <label class="ap-field"><span class="label">Текст промпта</span><textarea class="field ap-area" name="body" rows="10" required>${esc(d.body)}</textarea></label>
    <div class="ap-field"><span class="label text-mute">Переменные</span><div class="cb-vars" data-vars></div></div>
    <label class="ap-field"><span class="label">Теги через запятую</span><input class="field" name="tags" value="${esc(d.tags.join(", "))}" /></label>
    <p class="ap-note" data-err hidden></p>
  </div>
  <div class="ap-sheet-foot">
    ${isNew ? "" : `<button type="button" class="btn ap-danger" data-del>Удалить</button><span class="ap-spacer"></span>`}
    <button type="button" class="btn btn-ghost" data-x>Отмена</button>
    <button type="submit" class="btn btn-primary">Сохранить</button>
  </div>
</form>`;
  const form = edDlg.querySelector("form")!;
  const varsEl = edDlg.querySelector<HTMLElement>("[data-vars]")!;
  const showVars = () => {
    const v = vars((form.elements.namedItem("body") as HTMLTextAreaElement).value);
    varsEl.innerHTML = v.size ? [...v.entries()].map(([n, def]) => `<span class="chip">${esc(n)}${def ? ` = ${esc(def)}` : ""}</span>`).join("") : `<span class="ap-note">Нет. Добавьте {{имя}} или {{имя:по умолчанию}} в текст.</span>`;
  };
  form.addEventListener("input", showVars);
  showVars();
  edDlg.querySelectorAll("[data-x]").forEach((b) => b.addEventListener("click", () => edDlg.close()));
  edDlg.querySelector("[data-del]")?.addEventListener("click", () => {
    if (!confirm(`Удалить «${d.title}»?`)) return;
    items = items.filter((x) => x.id !== d.id);
    save();
    edDlg.close();
    render();
    toast("Удалено");
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const g = (n: string) => (form.elements.namedItem(n) as HTMLInputElement).value.trim();
    const err = edDlg.querySelector<HTMLElement>("[data-err]")!;
    if (!g("body")) {
      err.hidden = false;
      err.textContent = "Добавьте текст промпта.";
      return;
    }
    const next = normalize({ ...d, id: d.id || uid(), title: g("title"), folder: g("folder"), body: g("body"), tags: g("tags").split(",").map((t) => t.trim()).filter(Boolean), updatedAt: now() })!;
    items = isNew ? [next, ...items] : items.map((x) => (x.id === d.id ? next : x));
    save();
    edDlg.close();
    render();
    toast("Сохранено");
  });
  edDlg.showModal();
  (form.elements.namedItem(isNew ? "title" : "body") as HTMLElement).focus();
}
document.querySelectorAll("[data-cb-new]").forEach((b) => b.addEventListener("click", () => openEditor()));

/* ---------- import / export ---------- */
document.querySelector("[data-cb-export]")!.addEventListener("click", () => {
  download(`cuebox-${new Date().toISOString().slice(0, 10)}.json`, { app: "cuebox-web", version: 1, exportedAt: now(), items });
  toast(`Экспорт: ${items.length}`);
});
const fileEl = document.querySelector<HTMLInputElement>("[data-cb-file]")!;
document.querySelector("[data-cb-import]")!.addEventListener("click", () => fileEl.click());
fileEl.addEventListener("change", async () => {
  const file = fileEl.files?.[0];
  fileEl.value = "";
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const raw: unknown[] = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : Array.isArray(data?.prompts) ? data.prompts : [];
    const incoming = raw.map((x) => normalize(x as Prompt)).filter((x): x is Prompt => !!x);
    if (!incoming.length) return toast("В файле нет промптов");
    const known = new Set(items.map((x) => x.id));
    const added = incoming.map((x) => (known.has(x.id) ? { ...x, id: uid() } : x));
    items = [...added, ...items];
    save();
    current = "all";
    render();
    toast(`Добавлено: ${added.length}`);
  } catch {
    toast("Не удалось прочитать файл");
  }
});

render();
