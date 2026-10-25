// Renders guide pictures: real mini-app screens (with MOCK data, no network/secrets) and Telegram-style example chats.
// Usage: NODE_PATH=/path/to/node_modules node capture.cjs   (needs playwright-core + Chrome; ffmpeg for GIFs)
const { chromium } = require("playwright-core");
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "public/guide-media");
const FR = "/tmp/guide-frames";
fs.mkdirSync(OUT, { recursive: true }); fs.rmSync(FR, { recursive: true, force: true }); fs.mkdirSync(FR, { recursive: true });
const APP = fs.readFileSync(path.join(ROOT, "src/app.html"), "utf8");
const MOCK = "file://" + path.join(__dirname, "mock.html");
const NOW = Date.parse("2026-10-25T16:20:00Z"); // 18:20 Kyiv
const H = (h, m = 0, day = 25) => Date.parse(`2026-10-${day}T${String(h - 2).padStart(2, "0")}:${String(m).padStart(2, "0")}:00Z`); // Kyiv -> UTC (UTC+2)

const THEMES = {
  light: { bg_color: "#ffffff", secondary_bg_color: "#efeff4", section_bg_color: "#ffffff", text_color: "#000000", hint_color: "#8e8e93", link_color: "#2481cc", button_color: "#2481cc", button_text_color: "#ffffff", destructive_text_color: "#e53935", accent_text_color: "#2481cc", section_separator_color: "#e3e3e8", subtitle_text_color: "#8e8e93" },
  dark: { bg_color: "#1c1c1e", secondary_bg_color: "#000000", section_bg_color: "#1c1c1e", text_color: "#ffffff", hint_color: "#98989e", link_color: "#5eb5f7", button_color: "#3e88f7", button_text_color: "#ffffff", destructive_text_color: "#ff453a", accent_text_color: "#5eb5f7", section_separator_color: "#38383a", subtitle_text_color: "#98989e" },
};
const tasks = [
  { id: 1, text: "Подготовить ссылки: инст и сайты ивентов (город + кол-во подписчиков)", due_at: H(19), creator_name: "Pseudo", done: 0 },
  { id: 2, text: "Текст рассылки в Инстаграм от имени владельца", due_at: H(19), creator_name: "Pseudo", done: 0 },
  { id: 3, text: "Тату-флеши (эскизы) в хэллоуинской теме без явной привязки к празднику", due_at: H(19), creator_name: "Pseudo", done: 0 },
  { id: 5, text: "Рассылка Хэллоуин-ивента (окно 19:00–20:00)", due_at: H(20), creator_name: "Pseudo", done: 0 },
  { id: 7, text: "Сеанс Оля, эскиз розы на предплечье", due_at: H(14, 0, 26), creator_name: "Pseudo", done: 0 },
  { id: 8, text: "Заказать новые картриджи", due_at: null, assignee_name: "Pseudo", creator_name: "Pseudo", done: 0 },
  { id: 4, text: "Афиша для прикрепления к рассылке", due_at: H(19), creator_name: "Pseudo", done: 1, done_at: H(18, 21) },
];
const DATA = {
  ok: true, is_admin: true, now: NOW, tasks,
  lists: [
    { id: 3, name: "Закупка расходников", items: [{ id: 31, text: "иглы 3RL", done: 1 }, { id: 32, text: "чёрная краска", done: 0 }, { id: 33, text: "плёнка", done: 0 }, { id: 34, text: "перчатки M", done: 0 }] },
    { id: 2, name: "Идеи флешей", items: [{ id: 21, text: "ворон на ветке", done: 0 }, { id: 22, text: "мотылёк с луной", done: 1 }, { id: 23, text: "свеча с дымом", done: 0 }] },
  ],
  settings: { antispam: 1, antilink: 1, newbie_hours: 24, antiflood: 1, flood_limit: 6, warn_limit: 3, clean_service: 1, clean_settings: 1, ai_enabled: 1, welcome_enabled: 1, welcome_text: "Привет, {name}! Добро пожаловать в {chat} 👋" },
};
const BOOT = { ok: true, user: { id: 1, name: "Pseudo" }, chats: [{ id: -1001, title: "Главная", is_forum: true, is_admin: true }], preferred: null, tz: "Europe/Kiev" };

async function appShot(browser, tab, theme, file) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "ru-RU", timezoneId: "Europe/Kyiv" });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(NOW);
  await page.addInitScript((tp) => {
    const noop = () => {};
    window.Telegram = { WebApp: { initData: "mock", initDataUnsafe: {}, themeParams: tp, ready: noop, expand: noop, setHeaderColor: noop, setBackgroundColor: noop, HapticFeedback: { impactOccurred: noop, notificationOccurred: noop } } };
    document.addEventListener("DOMContentLoaded", () => { for (const [k, v] of Object.entries(tp)) document.documentElement.style.setProperty("--tg-theme-" + k.replace(/_/g, "-"), v); document.body.style.background = tp.secondary_bg_color; });
  }, THEMES[theme]);
  await page.route("**/*", (r) => {
    const u = new URL(r.request().url());
    if (u.hostname === "telegram.org") return r.fulfill({ status: 200, contentType: "text/javascript", body: "" });
    if (u.pathname === "/api/bootstrap") return r.fulfill({ json: BOOT });
    if (u.pathname.startsWith("/api/")) return r.fulfill({ json: DATA });
    return r.fulfill({ status: 200, contentType: "text/html", body: APP });
  });
  await page.goto("http://mock.local/app");
  await page.waitForSelector("#main .card");
  if (tab !== "lists") { await page.click(`#tabs [data-tab="${tab}"]`); await page.waitForTimeout(100); }
  await page.screenshot({ path: path.join(OUT, file) });
  await ctx.close();
}

async function mockShot(page, scene, step, file, h = 640) {
  await page.setViewportSize({ width: 390, height: h });
  await page.goto(`${MOCK}?scene=${scene}&step=${step}&h=${h}` + (scene === "panel" ? "&img=" + encodeURIComponent("file://" + path.join(OUT, "app-tasks.png")) : ""));
  await page.screenshot({ path: file });
}

function gif(name, frames, fps, width = 360) {
  // frames: [[png, holdFrames], ...] -> concat list with durations, palette-optimized GIF
  const list = path.join(FR, name + ".txt");
  fs.writeFileSync(list, frames.map(([f, n]) => `file '${f}'\nduration ${(n / fps).toFixed(3)}`).join("\n") + `\nfile '${frames[frames.length - 1][0]}'\n`);
  const out = path.join(OUT, name + ".gif");
  const vf = `fps=${fps},scale=${width}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`;
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, "-vf", vf, "-loop", "0", out]);
  console.log(name + ".gif", (fs.statSync(out).size / 1024).toFixed(0) + " KB");
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || "/usr/bin/google-chrome", args: ["--lang=ru-RU"], env: { ...process.env, LANG: "ru_RU.UTF-8", LANGUAGE: "ru" } });
  for (const tab of ["lists", "tasks", "reminders", "settings"]) await appShot(browser, tab, "light", `app-${tab}.png`);
  await appShot(browser, "tasks", "dark", "app-tasks-dark.png");

  const ctx = await browser.newContext({ deviceScaleFactor: 2, locale: "ru-RU" });
  const page = await ctx.newPage();
  for (const [scene, h] of [["reminder", 380], ["task", 420], ["tasks", 640], ["list", 640], ["ask", 420], ["poll", 470], ["topics", 470]]) await mockShot(page, scene, 0, path.join(OUT, `chat-${scene}.png`), h);

  // GIF 1: typing a list -> bot checklist
  const n = Math.ceil(301 / 14) + 1; const f1 = [];
  for (let s = 0; s <= n + 6; s++) { const f = `${FR}/plan-${String(s).padStart(3, "0")}.png`; await mockShot(page, "plan", s, f, 700); f1.push([f, s === n ? 6 : s > n && s < n + 5 ? 2 : s === n + 6 ? 40 : 1]); }
  // the last plan frame doubles as a still picture
  fs.copyFileSync(f1[f1.length - 1][0], path.join(OUT, "chat-plan.png"));
  gif("gif-plan", f1, 10);
  // GIF 2: pressing a ✅ button
  const f2 = [];
  for (const [s, hold] of [[0, 12], [1, 6], [2, 12], [3, 22]]) { const f = `${FR}/done-${s}.png`; await mockShot(page, "done", s, f, 640); f2.push([f, hold]); }
  gif("gif-done", f2, 10);
  // GIF 3: opening the Panel
  const f3 = [];
  for (const [s, hold] of [[0, 12], [1, 6], [2, 2], [3, 30]]) { const f = `${FR}/panel-${s}.png`; await mockShot(page, "panel", s, f, 700); f3.push([f, hold]); }
  gif("gif-panel", f3, 10);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
