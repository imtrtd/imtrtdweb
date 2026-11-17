/* Shared bits of the /apps pages: the accent switch (same key as the site) and a toast. */

const ACCENT = "imtrtd-accent";
const picks = document.querySelectorAll<HTMLButtonElement>("[data-accent-pick]");
function paint() {
  const cur = document.documentElement.dataset.accent || "violet";
  picks.forEach((b) => b.setAttribute("aria-checked", String(b.dataset.accentPick === cur)));
}
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
    paint();
    window.dispatchEvent(new Event("imtrtd-accent"));
  }),
);
paint();

const toastEl = document.querySelector<HTMLElement>("[data-ap-toast]");
let toastTimer = 0;
export function toast(text: string) {
  if (!toastEl) return;
  toastEl.textContent = text;
  toastEl.classList.add("is-on");
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove("is-on"), 1800);
}
(window as unknown as { apToast: typeof toast }).apToast = toast;

/* storage that never throws (private mode) */
export const store = {
  ok: (() => {
    try {
      const k = "__ap";
      localStorage.setItem(k, "1");
      localStorage.removeItem(k);
      return true;
    } catch {
      return false;
    }
  })(),
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* kept in memory for this visit */
    }
  },
};

export function download(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const t = document.createElement("textarea");
    t.value = text;
    t.setAttribute("readonly", "");
    t.style.position = "fixed";
    t.style.opacity = "0";
    document.body.append(t);
    t.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    t.remove();
    return ok;
  }
}

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
