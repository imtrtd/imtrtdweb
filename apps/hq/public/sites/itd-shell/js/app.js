/* I/TD Shell 1.1.0 — renderer: desktop and widgets, projects, explorer, search palette,
   start menu and personalization. Settings live in state.json, handled by the main process. */
(() => {
  'use strict';
  const BOOT_T0 = Date.now();

  const api = window.itd;
  const $ = (selector, root = document) => root.querySelector(selector);
  const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (fn) => setTimeout(fn, 16);
  const every = (ms, fn) => (typeof setInterval === 'function' ? setInterval(fn, ms) : 0);

  function el(tag, attrs, ...kids) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs || {})) {
      if (value == null || value === false) continue;
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value === true ? '' : String(value));
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) node.append(kid);
    return node;
  }

  /* replaceChildren that skips empty slots (a bare null would render as the text "null") */
  const fill = (node, ...kids) => node && node.replaceChildren(...kids.flat().filter((kid) => kid != null && kid !== false));

  function toast(title, text, isError) {
    const node = el('div', { class: isError ? 'toast error' : 'toast' }, el('b', { text: title }), text ? ' ' + text : '');
    $('#toasts').append(node);
    setTimeout(() => node.remove(), 4200);
  }

  const initials = (name) => {
    const words = String(name).replace(/[^\p{L}\p{N} ]/gu, ' ').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return '··';
    return (words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2)).toUpperCase();
  };

  /* ---------------------------------------------------------------- settings (state.json) */

  const DEFAULTS = {
    accent: 'violet',
    accentCustom: '#b28dff',
    accentsUser: [],
    wallpaper: { kind: 'gradient', mode: 0, running: false, quality: 0.5, grain: false, dim: 0.38, gradient: 0, solid: '#0a0a0f', image: null, fit: 'cover' },
    window: { mode: 'work', onTop: false, cut: true, density: 'normal', zoom: 1 },
    fonts: { display: '', sans: '', mono: '' },
    icons: { size: 'medium' },
    widgets: { clock: true, system: true, disks: true, notes: false, recent: true, battery: false },
    behavior: { autostart: false, startView: 'desktop', boot: true, motion: true, winKey: true, folders: false, taskbar: false, lockOnStart: false, lockIdle: 0, lockNative: false },
    explorer: { sort: 'name', dir: 1, group: 'none', mode: 'table' },
    home: { sort: 'index', dir: 1, group: 'none', mode: 'tiles' },
    launcher: { sort: 'name', dir: 1, group: 'letter', mode: 'tiles', side: 'all' },
    windows: {},
    deskIcons: { pos: {}, hidden: [], extra: [] },
    dockPins: [],
    dockHidden: [],
    startPins: [],
    notes: '',
    history: [],
    view: 'desktop',
    explorerPath: null
  };

  let S = JSON.parse(JSON.stringify(DEFAULTS));

  const merge = (base, patch) => {
    const out = { ...base };
    for (const [key, value] of Object.entries(patch || {})) {
      if (value && typeof value === 'object' && !Array.isArray(value) && base[key] && typeof base[key] === 'object' && !Array.isArray(base[key])) out[key] = { ...base[key], ...value };
      else if (value !== undefined) out[key] = value;
    }
    return out;
  };

  /* Every setting change goes straight to state.json; the renderer keeps no second copy. */
  function save(patch) {
    S = merge(S, patch);
    try { const p = api.stateSet(patch); if (p && p.catch) p.catch(() => {}); } catch { /* settings are a convenience */ }
    return S;
  }

  /* ---------------------------------------------------------------- accent, wallpaper, fonts, chrome */

  const ACCENTS = {
    violet: { name: 'Фиолетовый', hex: '#b28dff', hue: 262 },
    lime: { name: 'Лаймовый', hex: '#d8ff00', hue: 70 },
    magenta: { name: 'Маджента', hex: '#ff2bd6', hue: 312 },
    cyan: { name: 'Циан', hex: '#2ee9ff', hue: 187 }
  };

  const GRADIENTS = [
    { name: 'Подъём', css: 'linear-gradient(180deg, #1c1c27 0%, #0a0a0f 100%)' },
    { name: 'Ядро', css: 'radial-gradient(900px 520px at 50% 42%, rgb(123 92 255 / 0.30), transparent 70%), #0a0a0f' },
    { name: 'Срез', css: 'linear-gradient(140deg, #0a0a0f 0%, #14141c 48%, #1c1c27 100%)' }
  ];

  const bg = window.ITD_BG || null;
  let bgReady = false;
  let lastQuality = null;
  let shellHidden = false;

  /* A profile that still has the old factory shader (never retuned) becomes a still gradient. */
  function migrateQuiet() {
    const w = S.wallpaper || {};
    const factory = w.kind === 'shader' && Number(w.mode) === 0 && Number(w.quality) === 0.75 && w.running !== false && !w.grain && !w.image;
    if (factory) save({ wallpaper: { kind: 'gradient', running: true } });
  }

  /* The hue of a custom accent, so the shader follows any colour the user picks. */
  function hueOf(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
    if (!m) return 262;
    const n = parseInt(m[1], 16);
    const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    if (!d) return 262;
    let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return Math.round((h * 60 + 360) % 360);
  }

  /* User accents: up to USER_MAX saved colours, each applied as the 'custom' accent. */
  const HEX = /^#[0-9a-f]{6}$/i;
  const USER_MAX = 8;
  const userAccents = () => [...new Set((Array.isArray(S.accentsUser) ? S.accentsUser : []).filter((h) => HEX.test(h)).map((h) => h.toLowerCase()))];
  const isUserOn = (hex) => S.accent === 'custom' && String(S.accentCustom || '').toLowerCase() === hex;

  function addUserAccent(hex) {
    hex = String(hex || '').toLowerCase();
    if (!HEX.test(hex)) return;
    const list = userAccents();
    if (!list.includes(hex)) {
      if (list.length >= USER_MAX) { toast('Своих цветов уже ' + USER_MAX + '.', 'Уберите один, чтобы добавить новый.', true); return; }
      save({ accentsUser: [...list, hex] });
      toast('Цвет добавлен.', hex + ' — в панели акцентов, в «Пуске» и в «Вид».');
    }
    renderAccentBar();
    setAccent('custom', hex);
  }

  function removeUserAccent(hex) {
    save({ accentsUser: userAccents().filter((h) => h !== hex) });
    renderAccentBar();
    markAccent();
    if (document.body.dataset.view === 'settings') renderSettings();
  }

  /* pressed state of the accent bar: system colours by id, user colours by hex */
  function markAccent() {
    const box = $('#accents');
    const hex = String(S.accentCustom || '').toLowerCase();
    if (box) for (const button of box.children) {
      if (button.dataset.accent) button.setAttribute('aria-pressed', String(button.dataset.accent === S.accent && (!button.dataset.hex || button.dataset.hex === hex)));
    }
  }

  function setAccent(id, hex) {
    const custom = id === 'custom';
    if (!custom && !ACCENTS[id]) id = 'violet';
    const color = custom ? String(hex || S.accentCustom || '#b28dff').toLowerCase() : ACCENTS[id].hex;
    document.body.dataset.accent = id;
    if (custom) document.body.style.setProperty('--signal', color);
    else document.body.style.removeProperty('--signal');
    save(custom ? { accent: id, accentCustom: color } : { accent: id });
    markAccent();
    if (bgReady) bg.set({ hue: custom ? hueOf(color) : ACCENTS[id].hue });
    if (document.body.dataset.view === 'settings') renderSettings();
  }

  function shaderLive() {
    const w = S.wallpaper;
    return w.kind === 'shader' && w.running !== false && !shellHidden && document.body.dataset.maxed !== 'on';
  }

  function ensureBackground() {
    if (bgReady || !bg) return bgReady;
    try { bgReady = !!bg.init($('#bg')); } catch { bgReady = false; }
    if (!bgReady) document.body.classList.add('no-webgl');
    else bg.set({ energy: 0.2, fps: 30 });
    return bgReady;
  }

  function applyWallpaper() {
    const w = S.wallpaper;
    const shader = w.kind === 'shader';
    if (shader) ensureBackground();
    document.body.dataset.wallpaper = w.kind || 'gradient';
    const live = shaderLive();
    document.body.dataset.live = live ? 'on' : 'off';
    const canvas = $('#bg');
    if (canvas) canvas.style.display = live && bgReady ? 'block' : 'none';
    const wall = $('#wall');
    if (wall) {
      let css = '';
      if (w.kind === 'gradient') css = (GRADIENTS[w.gradient] || GRADIENTS[0]).css;
      else if (w.kind === 'solid') css = w.solid || '#0a0a0f';
      else if (w.kind === 'image' && w.image) css = 'url("' + w.image + '")';
      wall.style.background = css;
      wall.style.display = shader ? 'none' : 'block';
      wall.dataset.fit = w.kind === 'image' ? (w.fit || 'cover') : 'none';
    }
    const dim = $('#dim');
    if (dim) dim.style.opacity = String(Math.max(0, Math.min(0.9, Number(w.dim) || 0)));
    const grain = $('#grain');
    if (grain) grain.style.display = w.grain ? 'block' : 'none';
    if (bgReady) {
      bg.set({ mode: Number(w.mode) || 0, running: live, fps: 30 });
      const q = Math.max(0.2, Math.min(1, Number(w.quality) || 0.5));
      if (q !== lastQuality) { lastQuality = q; bg.quality(q); }
    }
  }

  function setWallpaper(patch) {
    save({ wallpaper: patch });
    applyWallpaper();
    if (document.body.dataset.view === 'settings') renderSettings();
  }

  function initWallpaper() {
    if (S.wallpaper.kind === 'shader') ensureBackground();
    applyWallpaper();
  }

  /* Bundled faces ship in renderer/fonts. "Авто" keeps them; a pick replaces the head of the stack.
     Anything else has to already be installed — nothing is downloaded. */
  const BUNDLED_FONTS = ['Space Grotesk', 'Unbounded', 'Geist', 'Geist Mono'];
  const FONT_SETS = {
    display: { label: 'Заголовки', brand: 'Space Grotesk', list: ['Space Grotesk', 'Unbounded', 'Geist', 'Segoe UI Semibold', 'Segoe UI', 'Arial Black', 'Verdana', 'Tahoma'], tail: 'Arial, "Arimo", sans-serif' },
    sans: { label: 'Текст', brand: 'Geist', list: ['Geist', 'Segoe UI', 'Arial', 'Calibri', 'Verdana', 'Tahoma'], tail: 'Arial, "Arimo", "Segoe UI", sans-serif' },
    mono: { label: 'Моно', brand: 'Geist Mono', list: ['Geist Mono', 'Cascadia Mono', 'Consolas', 'Courier New', 'Lucida Console'], tail: 'ui-monospace, Consolas, monospace' }
  };

  const quoteFont = (name) => '"' + String(name).replace(/"/g, '') + '"';

  const hasFont = (name) => {
    if (BUNDLED_FONTS.includes(name)) return true;
    try { return !!(document.fonts && document.fonts.check && document.fonts.check('14px "' + name + '"')); } catch { return false; }
  };

  function warmFonts() {
    if (!document.fonts || !document.fonts.load) return;
    for (const name of BUNDLED_FONTS) document.fonts.load('16px ' + quoteFont(name)).catch(() => {});
  }

  function applyFonts() {
    for (const [slot, set] of Object.entries(FONT_SETS)) {
      const pick = String(S.fonts[slot] || '').trim();
      const head = pick || set.brand;
      document.body.style.setProperty('--' + slot, (head ? quoteFont(head) + ', ' : '') + set.tail);
    }
  }

  function applyChrome() {
    const w = S.window;
    document.body.dataset.density = w.density || 'normal';
    document.body.dataset.cut = w.cut === false ? 'off' : 'on';
    document.body.dataset.icons = (S.icons && S.icons.size) || 'medium';
    document.body.classList[S.behavior.motion === false ? 'add' : 'remove']('no-motion');
  }

  const ICON_REQ = { small: 96, medium: 128, large: 192 };
  const iconRequestSize = () => ICON_REQ[(S.icons && S.icons.size) || 'medium'] || 128;

  /* ---------------------------------------------------------------- data */

  const STATUS = { live: 'Активен', paused: 'На паузе', offline: 'Не в сети' };
  const CATEGORY = { AI: 'ИИ', APP: 'Приложения', BRAND: 'Бренды', BROWSER: 'Браузеры', EXPERIMENT: 'Эксперименты', PLATFORM: 'Платформы', PRODUCT: 'Продукты', REPO: 'Репозитории', SYSTEM: 'Система', WEB: 'Веб' };

  /* Two registry entries can share a title (a repository and a product); only the first keeps the plain key. */
  const projectKeys = new Set();
  const projectKey = (title, index) => { const k = 'project:' + title; if (!projectKeys.has(k)) { projectKeys.add(k); return k; } return k + '#' + index; };
  const projects = (Array.isArray(window.ITD_PROJECTS) ? window.ITD_PROJECTS : []).map((p, index) => ({
    key: projectKey(p.title, index),
    kind: 'project',
    index,
    title: p.title,
    desc: p.description || '',
    category: p.category || 'APP',
    stack: p.stack || '',
    access: p.access || '',
    status: STATUS[p.status] ? p.status : 'live',
    local: p.local || null,
    url: p.url || null,
    target: p.local || p.url || null,
    app: p.app || null,
    sub: CATEGORY[p.category] || 'Проект'
  }));

  let apps = [];
  let info = { version: '1.1.0', hotkey: null, startHotkey: null, home: null, user: '', computer: '', statePath: '' };
  let history = [];
  let lockHas = false;
  try { if (api.lockInfo) api.lockInfo().then((i) => { lockHas = !!(i && i.has); }).catch(() => {}); } catch { /* no lock */ }

  function record(item) {
    if (!item.target) return;
    const found = history.find((h) => h.key === item.key);
    if (found) { found.count += 1; found.last = Date.now(); found.target = item.target; }
    else history.push({ key: item.key, title: item.title, target: item.target, kind: item.kind, sub: item.sub || '', count: 1, last: Date.now() });
    history = history.sort((a, b) => b.last - a.last).slice(0, 60);
    save({ history });
    renderDesktop();
  }

  async function launch(item) {
    /* A registry entry may name a Windows program instead of a path ("Калькулятор"). */
    if (item && !item.target && item.app) {
      const a = apps.find((x) => x.title === item.app);
      if (a) item = { ...item, target: a.target };
    }
    if (!item || !item.target) { toast('Не открыто.', 'У этой записи нет пути и ссылки.', true); return false; }
    let result = await api.open(item.target);
    if (!result.ok && item.url && item.url !== item.target) result = await api.open(item.url);
    if (!result.ok) { toast('Не открыто.', result.error || 'Неизвестная ошибка.', true); return false; }
    record(item);
    return true;
  }

  /* ---------------------------------------------------------------- native icons and tints */

  const CAT_COLOR = { AI: '#b28dff', APP: '#2ee9ff', BRAND: '#ff2bd6', BROWSER: '#ffc629', EXPERIMENT: '#ff7a4d', PLATFORM: '#8fa8ff', PRODUCT: '#d8ff00', REPO: '#3dff9e', SYSTEM: '#c8cedb', WEB: '#ff6b9a' };
  const icons = new Map();
  const asked = new Set();

  const projectOf = (item) => (item.kind === 'project' && item.category ? item : projects.find((p) => p.key === item.key)) || null;

  /* The dominant colour of an icon, lifted to a lightness that reads on ink. */
  function tintOf(url) {
    return new Promise((resolve) => {
      if (typeof Image !== 'function') { resolve(null); return; }
      const image = new Image();
      image.onerror = () => resolve(null);
      image.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = 16;
          const g = canvas.getContext('2d', { willReadFrequently: true });
          g.drawImage(image, 0, 0, 16, 16);
          const d = g.getImageData(0, 0, 16, 16).data;
          let r = 0, gr = 0, b = 0, w = 0;
          for (let i = 0; i < d.length; i += 4) {
            const max = Math.max(d[i], d[i + 1], d[i + 2]), min = Math.min(d[i], d[i + 1], d[i + 2]);
            const sat = max ? (max - min) / max : 0;
            const k = (d[i + 3] / 255) * sat * sat;
            r += d[i] * k; gr += d[i + 1] * k; b += d[i + 2] * k; w += k;
          }
          if (w < 4) { resolve(null); return; }
          r /= w * 255; gr /= w * 255; b /= w * 255;
          const max = Math.max(r, gr, b), min = Math.min(r, gr, b), delta = max - min;
          if (delta < 0.12) { resolve(null); return; }
          let hue = max === r ? ((gr - b) / delta) % 6 : max === gr ? (b - r) / delta + 2 : (r - gr) / delta + 4;
          hue = Math.round((hue * 60 + 360) % 360);
          resolve('hsl(' + hue + ' 92% 70%)');
        } catch { resolve(null); }
      };
      image.src = url;
    });
  }

  /* A steady colour per name, for programs whose icon Windows cannot give. */
  function nameColor(name) {
    let h = 0;
    for (const ch of String(name || '')) h = (h * 31 + ch.codePointAt(0)) % 360;
    return 'hsl(' + h + ' 78% 70%)';
  }

  function tile(item, extra) {
    const project = projectOf(item);
    return el('span', { class: 'tile' + (extra ? ' ' + extra : ''), 'aria-hidden': 'true', 'data-ik': item.key, 'data-base': project ? CAT_COLOR[project.category] : nameColor(item.title), text: initials(item.title) });
  }

  function paint(node) {
    const hit = icons.get(node.dataset.ik);
    if (hit && hit.url && !node.classList.contains('has-icon')) {
      node.replaceChildren(el('img', { src: hit.url, alt: '', draggable: 'false' }));
      node.classList.add('has-icon');
    }
    const color = (hit && hit.color) || node.dataset.base || null;
    const host = node.closest('[data-tint]') || node;
    if (color) host.style.setProperty('--c', color);
    else host.style.removeProperty('--c');
  }

  const paintAll = () => document.querySelectorAll('[data-ik]').forEach(paint);

  async function requestIcons(items) {
    const batch = [];
    for (const item of items) {
      if (!item || !item.key || asked.has(item.key)) continue;
      asked.add(item.key);
      const project = projectOf(item);
      const file = project ? project.local : (item.target && !/^https?:/i.test(item.target) ? item.target : null);
      if (!project && !file) continue;
      batch.push({ key: item.key, path: file, title: item.title, project: !!project, app: project ? project.app || null : null });
    }
    for (let i = 0; i < batch.length; i += 40) {
      let found = {};
      try { found = (await api.icons(batch.slice(i, i + 40), iconRequestSize())) || {}; } catch { found = {}; }
      for (const [key, url] of Object.entries(found)) icons.set(key, { url: url || null, color: url ? await tintOf(url) : null });
      paintAll();
    }
  }

  const iconQueue = new Map();
  let iconWatch = null;

  function onScreen(node) {
    if (typeof node.getBoundingClientRect !== 'function') return true;
    let rect;
    try { rect = node.getBoundingClientRect(); } catch { return true; }
    if (!rect || (rect.width === 0 && rect.height === 0)) return false;
    const height = typeof innerHeight === 'number' ? innerHeight : 800;
    return rect.bottom > -240 && rect.top < height + 240;
  }

  function ensureIconWatch() {
    if (iconWatch || typeof IntersectionObserver !== 'function') return iconWatch;
    iconWatch = new IntersectionObserver((entries) => {
      const batch = [];
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        iconWatch.unobserve(entry.target);
        const item = iconQueue.get(entry.target.dataset.ik);
        if (item) batch.push(item);
      }
      if (batch.length) requestIcons(batch);
    }, { rootMargin: '240px' });
    return iconWatch;
  }

  function withIcons(items) {
    paintAll();
    const wanted = new Map();
    for (const item of items) if (item && item.key) wanted.set(item.key, item);
    const now = [];
    const later = [];
    document.querySelectorAll('[data-ik]').forEach((node) => {
      const item = wanted.get(node.dataset.ik);
      if (!item || asked.has(item.key)) return;
      iconQueue.set(item.key, item);
      if (onScreen(node)) now.push(item);
      else later.push(node);
    });
    if (now.length) requestIcons(now);
    const watch = ensureIconWatch();
    if (watch) later.forEach((node) => watch.observe(node));
    else if (later.length) requestIcons(later.map((node) => iconQueue.get(node.dataset.ik)).filter(Boolean));
  }

  /* ---------------------------------------------------------------- sorting and grouping */

  const sizeFmt = (bytes) => {
    if (bytes == null) return '—';
    const units = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'];
    let value = bytes, unit = 0;
    while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit++; }
    return (unit ? value.toFixed(value < 10 ? 1 : 0) : String(value)) + ' ' + units[unit];
  };
  const timeFmt = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const stamp = (ms) => (ms ? timeFmt.format(new Date(ms)) : '—');

  const SORTS = {
    explorer: [['name', 'Имя'], ['mtime', 'Изменён'], ['size', 'Размер'], ['type', 'Тип']],
    home: [['index', 'Номер'], ['name', 'Имя'], ['type', 'Категория'], ['status', 'Состояние']],
    launcher: [['name', 'Имя'], ['type', 'Папка'], ['mtime', 'Установлена']]
  };
  const GROUPS_FOR = {
    explorer: [['none', 'Без групп'], ['type', 'Тип'], ['letter', 'Буква'], ['date', 'Дата'], ['size', 'Размер']],
    home: [['none', 'Без групп'], ['type', 'Категория'], ['status', 'Состояние'], ['letter', 'Буква']],
    launcher: [['none', 'Без групп'], ['letter', 'Буква'], ['type', 'Папка']]
  };
  const MODES = [['table', 'Таблица'], ['tiles', 'Плитки'], ['icons', 'Значки']];

  const nameOf = (item) => String(item.name || item.title || '');
  const typeOf = (item) => {
    if (item.kind === 'project') return CATEGORY[item.category] || item.category || 'Проект';
    if (item.kind === 'app') return item.store ? 'Приложения Windows' : (item.folder || 'Меню «Пуск»');
    if (item.dir) return 'Папка';
    const dot = nameOf(item).lastIndexOf('.');
    const ext = dot > 0 ? nameOf(item).slice(dot + 1).toUpperCase() : '';
    return ext ? ext + '-файл' : 'Файл';
  };

  const collator = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' });

  function sortList(list, sort, dir) {
    const out = [...list];
    const by = {
      name: (a, b) => collator.compare(nameOf(a), nameOf(b)),
      index: (a, b) => (a.index || 0) - (b.index || 0),
      mtime: (a, b) => (a.mtime || 0) - (b.mtime || 0),
      size: (a, b) => (a.size || 0) - (b.size || 0),
      type: (a, b) => collator.compare(typeOf(a), typeOf(b)) || collator.compare(nameOf(a), nameOf(b)),
      status: (a, b) => collator.compare(STATUS[a.status] || '', STATUS[b.status] || '') || collator.compare(nameOf(a), nameOf(b))
    };
    const fn = by[sort] || by.name;
    out.sort((a, b) => {
      /* Explorer keeps folders above files whatever the column, the way Windows does. */
      if (a.dir !== b.dir && (a.dir === true || b.dir === true)) return a.dir ? -1 : 1;
      return fn(a, b) * (dir < 0 ? -1 : 1);
    });
    return out;
  }

  const DAY = 86400000;
  function dateBucket(ms) {
    if (!ms) return { key: 'none', label: 'Без даты', order: 9 };
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    if (ms >= midnight) return { key: 'today', label: 'Сегодня', order: 0 };
    if (ms >= midnight - DAY) return { key: 'yd', label: 'Вчера', order: 1 };
    if (ms >= midnight - 7 * DAY) return { key: 'week', label: 'На этой неделе', order: 2 };
    if (ms >= new Date(now.getFullYear(), now.getMonth(), 1).getTime()) return { key: 'month', label: 'В этом месяце', order: 3 };
    return { key: 'older', label: 'Раньше', order: 4 };
  }

  function sizeBucket(item) {
    if (item.dir) return { key: 'dir', label: 'Папки', order: 0 };
    const size = item.size || 0;
    if (!size) return { key: 'zero', label: 'Пустые', order: 1 };
    if (size < 100 * 1024) return { key: 'xs', label: 'До 100 КБ', order: 2 };
    if (size < 10 * 1024 * 1024) return { key: 'sm', label: 'До 10 МБ', order: 3 };
    if (size < 1024 * 1024 * 1024) return { key: 'md', label: 'До 1 ГБ', order: 4 };
    return { key: 'lg', label: 'Больше 1 ГБ', order: 5 };
  }

  const GROUPERS = {
    type: (item) => { const v = typeOf(item); return { key: 't:' + v, label: v, order: item.dir ? 0 : item.kind === 'app' && !item.folder && !item.store ? 0 : 1 }; },
    letter: (item) => {
      const ch = nameOf(item).trim().charAt(0).toUpperCase();
      const ok = /[A-ZА-ЯЁ]/.test(ch);
      return { key: 'l:' + (ok ? ch : '#'), label: ok ? ch : '#', order: ok ? 1 : 0 };
    },
    date: (item) => dateBucket(item.mtime),
    size: (item) => sizeBucket(item),
    status: (item) => ({ key: 's:' + item.status, label: STATUS[item.status] || item.status, order: ['live', 'paused', 'offline'].indexOf(item.status) })
  };

  /* Returns [{key, label, items}] — one bucket when grouping is off. */
  function groupList(list, group) {
    const fn = GROUPERS[group];
    if (!fn) return [{ key: 'all', label: null, items: list }];
    const map = new Map();
    for (const item of list) {
      const b = fn(item);
      if (!map.has(b.key)) map.set(b.key, { key: b.key, label: b.label, order: b.order == null ? 5 : b.order, items: [] });
      map.get(b.key).items.push(item);
    }
    return [...map.values()].sort((a, b) => a.order - b.order || collator.compare(a.label, b.label));
  }

  const collapsed = new Set();
  const toggleGroup = (key, redraw) => { if (collapsed.has(key)) collapsed.delete(key); else collapsed.add(key); redraw(); };

  function seg(items, current, onpick, aria) {
    return el('div', { class: 'seg', role: 'group', 'aria-label': aria || null },
      items.map(([id, label]) => el('button', { type: 'button', class: 'seg-btn', 'aria-pressed': String(id === current), text: label, onclick: () => onpick(id) })));
  }

  /* The toolbar shared by the explorer and the project registry. */
  function renderTools(host, which, cfg, redraw) {
    if (!host) return;
    const set = (patch) => { save({ [which]: patch }); redraw(); };
    fill(host,
      el('span', { class: 'label', text: 'Сортировка' }),
      seg(SORTS[which], cfg.sort, (id) => set(id === cfg.sort ? { dir: -cfg.dir } : { sort: id, dir: 1 }), 'Сортировка'),
      el('button', { type: 'button', class: 'sq', 'aria-label': cfg.dir < 0 ? 'По убыванию' : 'По возрастанию', text: cfg.dir < 0 ? '↓' : '↑', onclick: () => set({ dir: -cfg.dir }) }),
      el('span', { class: 'tools-gap' }),
      el('span', { class: 'label', text: 'Группы' }),
      seg(GROUPS_FOR[which], cfg.group, (id) => set({ group: id }), 'Группировка'),
      el('span', { class: 'tools-gap' }),
      el('span', { class: 'label', text: 'Вид' }),
      seg(MODES, cfg.mode, (id) => set({ mode: id }), 'Режим отображения')
    );
  }

  function groupHead(bucket, redraw, span) {
    const open = !collapsed.has(bucket.key);
    const head = el('button', {
      type: 'button', class: 'grp-head', 'aria-expanded': String(open),
      onclick: () => toggleGroup(bucket.key, redraw)
    },
    el('span', { class: 'grp-sign', 'aria-hidden': 'true', text: open ? '–' : '+' }),
    el('span', { class: 'grp-name label', text: bucket.label }),
    el('small', { text: String(bucket.items.length) }));
    if (!span) return head;
    const row = el('tr', { class: 'grp' }, el('td', { colspan: '3' }, head));
    return row;
  }

  /* ---------------------------------------------------------------- views */

  const VIEWS = ['desktop', 'apps', 'home', 'explorer', 'settings'];

  /* Opens and focuses a window; "desktop" shows the desktop (minimises every window). */
  function setView(name) {
    if (!VIEWS.includes(name)) name = 'desktop';
    if (name === 'desktop') { showDesktop(); return; }
    openWin(name);
    save({ view: name });
    if (name === 'apps') {
      renderApps();
      const q = $('#appsQ');
      if (q && q.focus && !launcher.query) q.focus();
    }
    if (name === 'home') {
      if (!homeReady) { homeReady = true; renderHome(); }
      else withIcons(projects);
    }
    if (name === 'explorer') {
      if (!placesReady) { placesReady = true; renderPlaces().catch(() => {}); }
      if (!ex.path) navigate(S.explorerPath || info.home);
    }
    if (name === 'settings') renderSettings();
  }

  let homeReady = false;
  let placesReady = false;

  /* ---------------------------------------------------------------- windows
     Programs, projects, files and personalization are windows over a live desktop:
     drag by the title bar, resize from any edge, minimise to the top bar, maximise,
     snap to a half by dragging to a side, to full screen by dragging to the top. */

  const WIN_IDS = ['apps', 'home', 'explorer', 'settings'];
  const WIN_MIN = { w: 560, h: 340 };
  const wm = { order: [], drag: null, peek: null };

  const winEl = (id) => $('#win-' + id);
  const within = (root, sel) => (root && typeof root.querySelector === 'function' ? root.querySelector(sel) : null);
  const withinAll = (root, sel) => (root && typeof root.querySelectorAll === 'function' ? [...root.querySelectorAll(sel)] : []);
  const setClass = (node, cls, on) => { if (node && node.classList) { if (on) node.classList.add(cls); else node.classList.remove(cls); } };
  const topWin = () => wm.order[wm.order.length - 1] || null;

  function rectOf(node) {
    if (!node || typeof node.getBoundingClientRect !== 'function') return null;
    try { const r = node.getBoundingClientRect(); return r && (r.width || r.height) ? r : null; } catch { return null; }
  }

  function areaRect() {
    const r = rectOf($('#wins'));
    if (r) return r;
    const w = typeof innerWidth === 'number' ? innerWidth : 1440;
    const h = typeof innerHeight === 'number' ? innerHeight : 900;
    return { left: 0, top: 44, width: w, height: h - 44, right: w, bottom: h };
  }

  function winRec(id) {
    const saved = (S.windows && S.windows[id]) || {};
    return { state: 'closed', max: false, snap: '', x: null, y: null, w: null, h: null, ...saved };
  }

  /* The renderer's merge is one level deep, so the whole record goes every time. */
  function saveWin(id, patch) {
    const rec = { ...winRec(id), ...patch };
    save({ windows: { [id]: rec } });
    return rec;
  }

  function defaultRect(id) {
    const a = areaRect();
    const i = WIN_IDS.indexOf(id);
    const w = Math.min(Math.max(WIN_MIN.w, Math.round(a.width * 0.74)), a.width - 24);
    const h = Math.min(Math.max(WIN_MIN.h, Math.round(a.height * 0.82)), a.height - 16);
    return { x: Math.round((a.width - w) / 2 + (i - 1.5) * 28), y: Math.max(8, Math.round((a.height - h) / 2 + (i - 1.5) * 22)), w, h };
  }

  /* Keeps a window reachable: at least 120 px of the title bar stays on screen. */
  function clampRect(r) {
    const a = areaRect();
    const minW = Math.min(WIN_MIN.w, a.width), minH = Math.min(WIN_MIN.h, a.height);
    const w = Math.max(minW, Math.min(Number(r.w) || minW, a.width));
    const h = Math.max(minH, Math.min(Number(r.h) || minH, a.height));
    const x = Math.min(Math.max(Number(r.x) || 0, 120 - w), a.width - 120);
    const y = Math.min(Math.max(Number(r.y) || 0, 0), a.height - 40);
    return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
  }

  function setRect(node, r) {
    if (!node || !node.style) return;
    node.style.left = r.x + 'px';
    node.style.top = r.y + 'px';
    node.style.width = r.w + 'px';
    node.style.height = r.h + 'px';
  }

  function place(id) {
    const node = winEl(id);
    if (!node) return;
    let rec = winRec(id);
    if (rec.x == null || rec.w == null) rec = saveWin(id, defaultRect(id));
    node.dataset.state = rec.state;
    node.dataset.max = rec.max ? 'on' : 'off';
    node.dataset.snap = rec.snap || '';
    setRect(node, clampRect(rec));
    const maxBtn = within(node, '[data-act="max"]');
    if (maxBtn) { maxBtn.textContent = rec.max ? '❐' : '□'; maxBtn.setAttribute('aria-label', rec.max ? 'Восстановить' : 'Развернуть'); }
  }

  function stack() {
    wm.order = wm.order.filter((id) => winRec(id).state === 'open');
    wm.order.forEach((id, i) => { const node = winEl(id); if (node && node.style) node.style.zIndex = String(10 + i); });
    const top = topWin();
    for (const id of WIN_IDS) setClass(winEl(id), 'focused', id === top);
    document.body.dataset.view = top || 'desktop';
    document.body.dataset.maxed = WIN_IDS.some((id) => { const r = winRec(id); return r.state === 'open' && r.max; }) ? 'on' : 'off';
    renderTaskbar();
    applyWallpaper();
  }

  function focusWin(id) {
    if (winRec(id).state !== 'open') return;
    wm.order = wm.order.filter((x) => x !== id);
    wm.order.push(id);
    stack();
  }

  function openWin(id) {
    const node = winEl(id);
    const was = winRec(id).state;
    saveWin(id, { state: 'open' });
    place(id);
    wm.order = wm.order.filter((x) => x !== id);
    wm.order.push(id);
    wm.peek = null;
    if (node && was !== 'open') { setClass(node, 'win-in', false); void node.offsetWidth; setClass(node, 'win-in', true); }
    stack();
  }

  function minWin(id) { saveWin(id, { state: 'min' }); place(id); stack(); }
  function closeWin(id) { saveWin(id, { state: 'closed' }); place(id); stack(); }
  function toggleMax(id) { const r = winRec(id); saveWin(id, { max: !r.max, snap: '' }); place(id); focusWin(id); stack(); }
  function snapWin(id, side) { saveWin(id, { snap: side, max: false }); place(id); focusWin(id); }
  function centerWin(id) { const d = defaultRect(id); const r = winRec(id); saveWin(id, { max: false, snap: '', x: Math.round((areaRect().width - (r.w || d.w)) / 2), y: d.y }); place(id); focusWin(id); }

  /* Like Win+D: minimise everything, and a second press brings the same windows back. */
  function showDesktop() {
    const open = WIN_IDS.filter((id) => winRec(id).state === 'open');
    if (open.length) {
      wm.peek = [...wm.order];
      open.forEach((id) => saveWin(id, { state: 'min' }));
    } else if (wm.peek && wm.peek.length) {
      for (const id of wm.peek) if (winRec(id).state === 'min') { saveWin(id, { state: 'open' }); wm.order.push(id); }
      wm.peek = null;
    }
    WIN_IDS.forEach(place);
    stack();
    pollSystem();
    pollDisks();
    pollBattery();
  }

  /* The section buttons in the top bar are the taskbar: a dot under each open or minimised window. */
  function renderTaskbar() {
    const nav = $('.bar-nav');
    if (!nav) return;
    const top = topWin();
    for (const button of nav.children) {
      const id = button.dataset.view;
      if (!id) continue;
      const st = id === 'desktop' ? (top ? 'closed' : 'open') : winRec(id).state;
      button.dataset.state = st;
      if (id === top || (id === 'desktop' && !top)) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    }
  }

  function taskClick(id) {
    if (id === 'desktop') { showDesktop(); return; }
    const r = winRec(id);
    if (r.state === 'open' && topWin() === id) minWin(id);
    else setView(id);
  }

  function winTitle(id) {
    const node = winEl(id);
    const t = within(node, '.win-title');
    return t ? t.textContent : id;
  }

  function winMenu(event, id) {
    const r = winRec(id);
    menu(event, [
      { head: winTitle(id) },
      r.state !== 'open' ? { label: 'Открыть', icon: '→', run: () => setView(id) } : { label: 'Свернуть', icon: '–', run: () => minWin(id) },
      { label: r.max ? 'Восстановить' : 'Развернуть', icon: r.max ? '❐' : '□', hint: 'Двойной щелчок', run: () => { if (r.state !== 'open') setView(id); toggleMax(id); } },
      { label: 'Привязать слева', icon: '◧', run: () => { if (r.state !== 'open') setView(id); snapWin(id, 'left'); } },
      { label: 'Привязать справа', icon: '◨', run: () => { if (r.state !== 'open') setView(id); snapWin(id, 'right'); } },
      { label: 'По центру', icon: '◇', run: () => { if (r.state !== 'open') setView(id); centerWin(id); } },
      '-',
      { label: 'Свернуть все окна', icon: '▭', run: showDesktop },
      r.state !== 'closed' ? { label: 'Закрыть', icon: '×', danger: true, run: () => closeWin(id) } : null
    ]);
  }

  function showSnapHint(kind) {
    const hint = $('#snapHint');
    if (hint) hint.dataset.snap = kind || '';
  }

  function startDrag(event, id) {
    if (event.button !== 0) return;
    if (event.target && event.target.closest && event.target.closest('.win-btn')) return;
    const node = winEl(id);
    const rec = winRec(id);
    const a = areaRect();
    focusWin(id);
    let start = { x: node.offsetLeft, y: node.offsetTop, w: node.offsetWidth, h: node.offsetHeight };
    const restore = !!(rec.max || rec.snap);
    if (restore) {
      /* Pulling a maximised window restores its size and keeps the grab point under the pointer. */
      const prev = clampRect(rec);
      const ratio = Math.max(0, Math.min(1, (event.clientX - a.left - start.x) / (start.w || 1)));
      start = { x: Math.round(event.clientX - a.left - prev.w * ratio), y: Math.max(0, Math.round(event.clientY - a.top - 18)), w: prev.w, h: prev.h };
    }
    wm.drag = { id, kind: 'move', sx: event.clientX, sy: event.clientY, start, restore, moved: false, rect: null, snap: '' };
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* capture is a convenience */ }
  }

  function startResize(event, id, dir) {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    const node = winEl(id);
    focusWin(id);
    wm.drag = { id, kind: 'size', dir, sx: event.clientX, sy: event.clientY, start: { x: node.offsetLeft, y: node.offsetTop, w: node.offsetWidth, h: node.offsetHeight }, moved: false, rect: null };
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* capture is a convenience */ }
  }

  function onWinMove(event) {
    const d = wm.drag;
    if (!d) return;
    const dx = event.clientX - d.sx, dy = event.clientY - d.sy;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) < 4) return;
    const node = winEl(d.id);
    const a = areaRect();
    if (!d.moved) {
      d.moved = true;
      setClass(document.body, 'wm-busy', true);
      if (d.restore) { node.dataset.max = 'off'; node.dataset.snap = ''; }
    }
    if (d.kind === 'move') {
      const r = clampRect({ x: d.start.x + dx, y: d.start.y + dy, w: d.start.w, h: d.start.h });
      setRect(node, r);
      d.rect = r;
      const px = event.clientX - a.left, py = event.clientY - a.top;
      d.snap = py <= 2 ? 'max' : px <= 2 ? 'left' : px >= a.width - 3 ? 'right' : '';
      showSnapHint(d.snap);
      return;
    }
    let { x, y, w, h } = d.start;
    if (d.dir.includes('e')) w = d.start.w + dx;
    if (d.dir.includes('s')) h = d.start.h + dy;
    if (d.dir.includes('w')) { w = d.start.w - dx; x = d.start.x + dx; }
    if (d.dir.includes('n')) { h = d.start.h - dy; y = d.start.y + dy; }
    const minW = Math.min(WIN_MIN.w, a.width), minH = Math.min(WIN_MIN.h, a.height);
    if (w < minW) { if (d.dir.includes('w')) x -= minW - w; w = minW; }
    if (h < minH) { if (d.dir.includes('n')) y -= minH - h; h = minH; }
    if (y < 0) { h += y; y = 0; }
    if (x + w > a.width && d.dir.includes('e')) w = a.width - x;
    if (y + h > a.height && d.dir.includes('s')) h = a.height - y;
    d.rect = { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
    setRect(node, d.rect);
  }

  function onWinUp() {
    const d = wm.drag;
    if (!d) return;
    wm.drag = null;
    setClass(document.body, 'wm-busy', false);
    showSnapHint('');
    if (!d.moved || !d.rect) return;
    if (d.kind === 'move' && d.snap === 'max') saveWin(d.id, { ...d.rect, max: true, snap: '' });
    else if (d.kind === 'move' && d.snap) saveWin(d.id, { ...d.rect, max: false, snap: d.snap });
    else saveWin(d.id, { ...d.rect, max: false, snap: '' });
    place(d.id);
    stack();
  }

  function initWindows() {
    for (const id of WIN_IDS) {
      const node = winEl(id);
      if (!node || typeof node.addEventListener !== 'function') continue;
      for (const dir of ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']) {
        const handle = el('i', { class: 'rz rz-' + dir, 'data-dir': dir, 'aria-hidden': 'true' });
        handle.addEventListener('pointerdown', (event) => startResize(event, id, dir));
        node.append(handle);
      }
      node.addEventListener('pointerdown', () => { if (topWin() !== id) focusWin(id); }, true);
      const bar = within(node, '.win-bar');
      if (bar) {
        bar.addEventListener('pointerdown', (event) => startDrag(event, id));
        bar.addEventListener('dblclick', (event) => { if (!(event.target.closest && event.target.closest('.win-btn'))) toggleMax(id); });
        bar.addEventListener('contextmenu', (event) => winMenu(event, id));
      }
      for (const button of withinAll(node, '.win-btn')) {
        button.addEventListener('click', () => {
          const act = button.dataset.act;
          if (act === 'min') minWin(id);
          else if (act === 'max') toggleMax(id);
          else closeWin(id);
        });
      }
    }
    /* Restore what was open last time, in the order it was stacked. */
    for (const id of WIN_IDS) {
      place(id);
      if (winRec(id).state === 'open') wm.order.push(id);
    }
    const last = S.view;
    if (wm.order.includes(last)) { wm.order = wm.order.filter((x) => x !== last); wm.order.push(last); }
    document.addEventListener('pointermove', onWinMove);
    document.addEventListener('pointerup', onWinUp);
    document.addEventListener('pointercancel', onWinUp);
    if (typeof addEventListener === 'function') addEventListener('resize', () => { WIN_IDS.forEach(place); layoutDeskIcons(); });
    stack();
  }

  /* ---------------------------------------------------------------- context menu */

  const ctx = { open: false };

  /* items: { label, icon, hint, run, danger, disabled } | '-' | { head } */
  function menu(event, items) {
    if (event && event.preventDefault) event.preventDefault();
    if (event && event.stopPropagation) event.stopPropagation();
    const box = $('#ctx');
    if (!box) return;
    const list = [];
    for (const it of items) {
      if (!it) continue;
      if (it === '-' && (!list.length || list[list.length - 1] === '-')) continue;
      list.push(it);
    }
    while (list.length && list[list.length - 1] === '-') list.pop();
    fill(box, list.map((it) => {
      if (it === '-') return el('hr', { class: 'ctx-sep' });
      if (it.head) return el('div', { class: 'ctx-head label', text: it.head });
      return el('button', {
        type: 'button', role: 'menuitem', class: 'ctx-item' + (it.danger ? ' ctx-danger' : ''), disabled: it.disabled ? true : null,
        onclick: () => { closeMenu(); if (it.run) it.run(); }
      },
      el('span', { class: 'ctx-ico', 'aria-hidden': 'true', text: it.icon || '' }),
      el('span', { class: 'ctx-label', text: it.label }),
      it.hint ? el('kbd', { text: it.hint }) : null);
    }));
    box.hidden = false;
    ctx.open = true;
    const vw = typeof innerWidth === 'number' ? innerWidth : 1440;
    const vh = typeof innerHeight === 'number' ? innerHeight : 900;
    const x = event && event.clientX != null ? event.clientX : vw / 2;
    const y = event && event.clientY != null ? event.clientY : vh / 2;
    const r = rectOf(box) || { width: 260, height: 300 };
    box.style.left = Math.max(4, Math.min(x, vw - r.width - 4)) + 'px';
    box.style.top = Math.max(4, Math.min(y, vh - r.height - 4)) + 'px';
    const first = within(box, '.ctx-item:not([disabled])');
    if (first && first.focus) first.focus();
  }

  function closeMenu() {
    if (!ctx.open) return;
    ctx.open = false;
    const box = $('#ctx');
    if (box) box.hidden = true;
  }

  function menuKey(event) {
    const box = $('#ctx');
    if (event.key === 'Escape') { event.preventDefault(); closeMenu(); return; }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const items = withinAll(box, '.ctx-item:not([disabled])');
    if (!items.length) return;
    const at = items.indexOf(document.activeElement);
    const next = items[(at + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length];
    if (next && next.focus) next.focus();
  }

  /* Pins and desktop shortcuts keep a small copy of the item, so they survive a re-index. */
  const snap = (item) => ({
    key: item.key, title: item.title, kind: item.kind || 'app', sub: item.sub || '',
    target: item.target || null, url: item.url || null, category: item.category || null, folder: item.folder || null, store: !!item.store
  });

  const dockPinned = (key) => (S.dockPins || []).some((p) => p.key === key);
  const startPinned = (key) => (S.startPins || []).some((p) => p.key === key);
  const onDesk = (key) => deskItems().some((p) => p.key === key);

  function pinDock(item, on) {
    const pins = (S.dockPins || []).filter((p) => p.key !== item.key);
    if (on) pins.push(snap(item));
    save({ dockPins: pins, dockHidden: (S.dockHidden || []).filter((k) => k !== item.key) });
    renderDesktop();
    toast(on ? 'Закреплено в доке.' : 'Откреплено.', item.title);
  }

  function pinStart(item, on) {
    const pins = (S.startPins || []).filter((p) => p.key !== item.key);
    if (on) pins.unshift(snap(item));
    save({ startPins: pins });
    if (start.open) renderStart();
    toast(on ? 'Закреплено в «Пуске».' : 'Убрано из «Пуска».', item.title);
  }

  async function runAsAdmin(item) {
    let result = null;
    try { result = await api.runAs(item.target); } catch (error) { result = { ok: false, error: String(error && error.message) }; }
    if (!result || !result.ok) toast('Не запущено.', (result && result.error) || 'Неизвестная ошибка.', true);
    else record(item);
  }

  async function linkProps(item) {
    let info = null;
    try { info = await api.link(item.target); } catch { info = null; }
    if (!info) { toast('Не найдено.', item.target || item.title, true); return; }
    const lines = [
      'Ярлык: ' + info.path,
      'Объект: ' + (info.target || '—'),
      info.args ? 'Аргументы: ' + info.args : null,
      info.cwd ? 'Рабочая папка: ' + info.cwd : null,
      info.description ? 'Описание: ' + info.description : null
    ].filter(Boolean);
    askConfirm(item.title, lines.join('\n'), () => api.revealTarget(item.target), 'Расположение файла', 'Свойства ярлыка');
  }

  /* One menu for every place a program, project, file or shortcut shows up. */
  function itemMenu(event, item, opts = {}) {
    const target = item.target || '';
    const isUrl = /^https?:/i.test(target);
    const isStore = /^shell:/i.test(target);
    const isLocal = !!target && !isUrl && !isStore;
    const isLink = isLocal && /\.lnk$/i.test(target);
    const elevate = isLocal && /\.(exe|lnk|bat|cmd)$/i.test(target);
    const docked = dockPinned(item.key);
    const desk = onDesk(item.key);
    const started = startPinned(item.key);
    const open = () => { if (opts.before) opts.before(); if (item.dir) openEntry(item); else launch(item); };
    menu(event, [
      { head: item.title },
      { label: item.dir ? 'Открыть папку' : 'Открыть', icon: '→', hint: 'Enter', run: open },
      elevate ? { label: 'Запуск от имени администратора', icon: '⛨', run: () => { if (opts.before) opts.before(); runAsAdmin(item); } } : null,
      item.url && item.url !== target ? { label: 'Открыть ссылку', icon: '↗', run: () => launch({ ...item, target: item.url }) } : null,
      '-',
      isLocal ? { label: 'Показать в «Файлах»', icon: '▤', run: () => { if (opts.before) opts.before(); showInExplorer(target); } } : null,
      isLocal ? { label: isLink ? 'Расположение файла' : 'Показать в Windows', icon: '⌕', run: () => api.revealTarget(target) } : null,
      isLink ? { label: 'Свойства ярлыка', icon: 'ⓘ', run: () => linkProps(item) } : null,
      '-',
      item.dir ? null : { label: docked ? 'Открепить из дока' : 'Закрепить в доке', icon: '◆', run: () => pinDock(item, !docked) },
      item.dir ? null : { label: started ? 'Убрать из «Пуска»' : 'Закрепить в «Пуске»', icon: '◇', run: () => pinStart(item, !started) },
      { label: desk ? 'Убрать со стола' : 'Добавить на стол', icon: '▦', run: () => (desk ? removeFromDesk(item) : addToDesk(item)) },
      '-',
      target ? { label: 'Копировать путь', icon: '⧉', run: () => { api.copy(target); toast('Скопировано.', target); } } : null,
      { label: 'Копировать название', icon: '⧉', run: () => { api.copy(item.title); toast('Скопировано.', item.title); } },
      ...(opts.extra || [])
    ]);
  }

  /* Text fields get the usual edit menu. */
  function textMenu(event, field) {
    const has = field.selectionStart !== field.selectionEnd;
    const exec = (cmd) => { field.focus(); try { document.execCommand(cmd); } catch { /* not supported */ } };
    menu(event, [
      { label: 'Вырезать', icon: '✂', hint: 'Ctrl X', disabled: !has || field.readOnly, run: () => exec('cut') },
      { label: 'Копировать', icon: '⧉', hint: 'Ctrl C', disabled: !has, run: () => exec('copy') },
      { label: 'Вставить', icon: '⎘', hint: 'Ctrl V', disabled: field.readOnly, run: () => exec('paste') },
      '-',
      { label: 'Выделить всё', icon: '▭', hint: 'Ctrl A', run: () => { field.focus(); if (field.select) field.select(); } }
    ]);
  }

  /* ---------------------------------------------------------------- launcher (the Programs window) */

  const launcher = { query: '', sel: null };
  const SIDE_FIXED = [['all', 'Все программы'], ['recent', 'Недавние'], ['dock', 'В доке'], ['desk', 'На рабочем столе'], ['store', 'Приложения Windows']];

  function launcherList(side) {
    if (side === 'recent') {
      const keys = history.filter((h) => h.kind === 'app').map((h) => h.key);
      return keys.map((k) => apps.find((a) => a.key === k)).filter(Boolean);
    }
    if (side === 'dock') return (S.dockPins || []).map((p) => apps.find((a) => a.key === p.key) || p);
    if (side === 'desk') return deskItems();
    if (side === 'store') return apps.filter((a) => a.store);
    if (side && side.startsWith('f:')) { const f = side.slice(2); return apps.filter((a) => a.folder === f && !a.store); }
    return apps;
  }

  function launcherFolders() {
    const counts = new Map();
    for (const a of apps) if (a.folder && !a.store && a.folder !== 'Рабочий стол') counts.set(a.folder, (counts.get(a.folder) || 0) + 1);
    return [...counts.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1] || collator.compare(a[0], b[0])).slice(0, 14);
  }

  function selectApp(key) {
    launcher.sel = key;
    for (const card of document.querySelectorAll('#appsGrid .acard')) card.setAttribute('aria-selected', String(card.dataset.key === key));
  }

  function moveAppSel(node, dir) {
    const cards = [...document.querySelectorAll('#appsGrid .acard')];
    const i = cards.indexOf(node);
    if (i < 0) return;
    let next = null;
    if (dir === 'left') next = cards[i - 1];
    else if (dir === 'right') next = cards[i + 1];
    else {
      const r = rectOf(node);
      if (!r) return;
      const cx = r.left + r.width / 2;
      const rows = cards.map((c) => ({ c, q: rectOf(c) })).filter((x) => x.q && (dir === 'down' ? x.q.top > r.top + 4 : x.q.top < r.top - 4));
      if (rows.length) {
        const rowTop = dir === 'down' ? Math.min(...rows.map((x) => x.q.top)) : Math.max(...rows.map((x) => x.q.top));
        next = rows.filter((x) => Math.abs(x.q.top - rowTop) < 4)
          .sort((a, b) => Math.abs(a.q.left + a.q.width / 2 - cx) - Math.abs(b.q.left + b.q.width / 2 - cx))[0].c;
      }
    }
    if (next) { next.focus(); selectApp(next.dataset.key); if (next.scrollIntoView) next.scrollIntoView({ block: 'nearest' }); }
  }

  function dragItem(event, item) {
    try {
      event.dataTransfer.setData('application/x-itd-item', JSON.stringify(snap(item)));
      event.dataTransfer.setData('text/plain', item.target || item.title);
      event.dataTransfer.effectAllowed = 'copyLink';
    } catch { /* drag without data */ }
  }

  function appCard(item, i, mode) {
    const sub = item.store ? 'Приложение Windows' : item.kind === 'app' ? (item.folder || 'Меню «Пуск»') : (item.sub || '');
    const node = el('button', {
      type: 'button', class: 'acard', role: 'listitem', 'data-tint': true, 'data-key': item.key, title: item.title,
      'aria-selected': String(launcher.sel === item.key), draggable: 'true',
      onclick: () => selectApp(item.key),
      ondblclick: () => launch(item),
      oncontextmenu: (event) => { selectApp(item.key); itemMenu(event, item); },
      ondragstart: (event) => dragItem(event, item),
      onkeydown: (event) => {
        const dirs = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
        if (event.key === 'Enter') { event.preventDefault(); launch(item); }
        else if (dirs[event.key]) { event.preventDefault(); moveAppSel(event.currentTarget, dirs[event.key]); }
        else if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
          const r = rectOf(event.currentTarget);
          itemMenu({ preventDefault() {}, clientX: r ? r.left + 24 : 200, clientY: r ? r.bottom - 8 : 200 }, item);
        }
      }
    },
    el('span', { class: 'acard-glow', 'aria-hidden': 'true' }),
    tile(item, 'tile-app'),
    el('span', { class: 'acard-name', text: item.title }),
    mode === 'icons' ? null : el('span', { class: 'acard-sub label', text: sub }),
    dockPinned(item.key) ? el('i', { class: 'acard-pin', title: 'В доке', 'aria-label': 'В доке' }) : null);
    node.style.setProperty('--i', i);
    return node;
  }

  function renderApps() {
    const grid = $('#appsGrid');
    if (!grid) return;
    const cfg = S.launcher;
    const side = $('#appsSide');
    const count = (id) => launcherList(id).length;
    if (side) {
      const pick = (id) => () => { save({ launcher: { side: id } }); renderApps(); };
      fill(side,
        el('div', { class: 'label', text: 'Подборки' }),
        el('div', { class: 'side-list' }, SIDE_FIXED.map(([id, name]) => sideButton(name, count(id), cfg.side === id, pick(id)))),
        el('div', { class: 'label', text: 'Папки «Пуска»' }),
        el('div', { class: 'side-list' }, launcherFolders().map(([f, n]) => sideButton(f, n, cfg.side === 'f:' + f, pick('f:' + f))))
      );
    }
    renderTools($('#appsTools'), 'launcher', cfg, renderApps);

    const query = launcher.query.trim().toLowerCase();
    let source = launcherList(cfg.side);
    let buckets;
    if (query) {
      const ranked = source.map((item) => ({ item, s: score(query, item.title) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).map((x) => x.item);
      buckets = [{ key: 'q', label: null, items: ranked }];
      source = ranked;
    } else {
      buckets = groupList(sortList(source, cfg.sort, cfg.dir), cfg.group);
    }
    grid.dataset.mode = cfg.mode;
    const kids = [];
    let i = 0;
    for (const bucket of buckets) {
      if (bucket.label) kids.push(groupHead(bucket, renderApps, false));
      if (collapsed.has(bucket.key)) continue;
      for (const item of bucket.items) kids.push(appCard(item, i++, cfg.mode));
    }
    if (!kids.length) kids.push(el('p', { class: 'muted', text: query ? 'Ничего не найдено.' : apps.length ? 'В этой подборке пусто.' : 'Индекс программ ещё строится.' }));
    fill(grid, kids);
    const counter = $('#appsCount');
    if (counter) counter.textContent = source.length + ' из ' + apps.length;
    withIcons(source);
  }

  /* ---------------------------------------------------------------- desktop shortcuts
     Shortcuts from the Windows desktop, plus anything added from a menu or dragged here.
     Drag to arrange, drop on the dock to pin, double-click to open, right-click for the menu. */

  const CELL = { w: 100, h: 108 };
  const desk = { sel: null, drag: null };

  function deskItems() {
    const d = S.deskIcons || {};
    const hidden = new Set(d.hidden || []);
    const out = [];
    const seen = new Set();
    for (const it of [...apps.filter((a) => a.folder === 'Рабочий стол'), ...(d.extra || [])]) {
      if (!it || !it.key || seen.has(it.key) || hidden.has(it.key)) continue;
      seen.add(it.key);
      out.push(it);
    }
    return out;
  }

  function saveDesk(patch) {
    const d = S.deskIcons || {};
    save({ deskIcons: { pos: { ...(d.pos || {}) }, hidden: [...(d.hidden || [])], extra: [...(d.extra || [])], ...patch } });
  }

  function addToDesk(item, at) {
    const d = S.deskIcons || {};
    const extra = (d.extra || []).filter((p) => p.key !== item.key);
    const fromWindows = apps.some((a) => a.key === item.key && a.folder === 'Рабочий стол');
    if (!fromWindows) extra.push(snap(item));
    const pos = { ...(d.pos || {}) };
    if (at) pos[item.key] = at; else delete pos[item.key];
    saveDesk({ extra, hidden: (d.hidden || []).filter((k) => k !== item.key), pos });
    renderDeskIcons();
    toast('На рабочем столе.', item.title);
  }

  /* Taking a shortcut off the shell's desktop never deletes the file on the Windows desktop. */
  function removeFromDesk(item) {
    const d = S.deskIcons || {};
    const fromWindows = apps.some((a) => a.key === item.key && a.folder === 'Рабочий стол');
    const pos = { ...(d.pos || {}) };
    delete pos[item.key];
    saveDesk({
      extra: (d.extra || []).filter((p) => p.key !== item.key),
      hidden: fromWindows ? [...new Set([...(d.hidden || []), item.key])] : (d.hidden || []),
      pos
    });
    if (desk.sel === item.key) desk.sel = null;
    renderDeskIcons();
    toast('Убрано со стола.', fromWindows ? 'Файл на рабочем столе Windows не тронут.' : item.title);
  }

  /* Auto layout fills columns from the top-left, like the Windows desktop; the clock moves right. */
  function autoSlots(n) {
    const a = rectOf($('#deskIcons'));
    const height = a ? a.height : 820;
    const rows = Math.max(1, Math.floor((height - 32) / CELL.h));
    const out = [];
    for (let i = 0; i < n; i++) out.push({ x: 16 + Math.floor(i / rows) * CELL.w, y: 16 + (i % rows) * CELL.h });
    return { slots: out, cols: n ? Math.ceil(n / rows) : 0 };
  }

  function layoutDeskIcons() {
    const box = $('#deskIcons');
    if (!box) return;
    const items = deskItems();
    const { slots, cols } = autoSlots(items.length);
    const pos = (S.deskIcons && S.deskIcons.pos) || {};
    const a = rectOf(box);
    let autoIndex = 0;
    for (const node of box.children || []) {
      const key = node.dataset && node.dataset.key;
      const item = items.find((x) => x.key === key);
      if (!item) continue;
      let p = pos[key];
      if (!p) p = slots[autoIndex++];
      else if (a) p = { x: Math.max(0, Math.min(p.x, a.width - CELL.w)), y: Math.max(0, Math.min(p.y, a.height - CELL.h)) };
      if (node.style) { node.style.left = p.x + 'px'; node.style.top = p.y + 'px'; }
    }
    /* Only shortcuts still in the automatic columns push the clock aside. */
    const auto = items.filter((x) => !pos[x.key]).length;
    const autoCols = auto ? Math.ceil(auto / Math.max(1, cols ? Math.ceil(items.length / cols) : 1)) : 0;
    document.body.style.setProperty('--desk-gutter', (autoCols ? autoCols * CELL.w + 8 : 0) + 'px');
  }

  function renderDeskIcons() {
    const box = $('#deskIcons');
    if (!box) return;
    const items = deskItems();
    fill(box, items.map((item) => {
      const node = el('button', {
        type: 'button', class: 'dicon', 'data-tint': true, 'data-key': item.key, title: item.target || item.title,
        'aria-selected': String(desk.sel === item.key),
        onclick: () => selectDesk(item.key),
        ondblclick: () => launch(item),
        oncontextmenu: (event) => { selectDesk(item.key); itemMenu(event, item, { extra: ['-', { label: 'Упорядочить значки', icon: '▦', run: arrangeDesk }] }); },
        onkeydown: (event) => {
          if (event.key === 'Enter') { event.preventDefault(); launch(item); }
          else if (event.key === 'Delete') { event.preventDefault(); removeFromDesk(item); }
        }
      },
      tile(item, 'tile-desk'),
      el('span', { class: 'dicon-name', text: item.title }));
      node.addEventListener('pointerdown', (event) => deskDown(event, item));
      return node;
    }));
    layoutDeskIcons();
    withIcons(items);
  }

  function selectDesk(key) {
    desk.sel = key;
    const box = $('#deskIcons');
    if (box) for (const node of box.children || []) node.setAttribute('aria-selected', String(node.dataset.key === key));
  }

  function arrangeDesk() {
    saveDesk({ pos: {} });
    renderDeskIcons();
  }

  function deskDown(event, item) {
    if (event.button !== 0) return;
    const node = event.currentTarget;
    desk.drag = { item, node, sx: event.clientX, sy: event.clientY, ox: node.offsetLeft, oy: node.offsetTop, moved: false };
    try { node.setPointerCapture(event.pointerId); } catch { /* capture is a convenience */ }
  }

  function deskMove(event) {
    const d = desk.drag;
    if (!d) return;
    const dx = event.clientX - d.sx, dy = event.clientY - d.sy;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) < 5) return;
    if (!d.moved) { d.moved = true; setClass(d.node, 'dragging', true); selectDesk(d.item.key); }
    d.node.style.left = (d.ox + dx) + 'px';
    d.node.style.top = (d.oy + dy) + 'px';
    const dock = rectOf($('#dock'));
    setClass($('#dock'), 'drop-on', !!dock && event.clientX >= dock.left && event.clientX <= dock.right && event.clientY >= dock.top && event.clientY <= dock.bottom);
  }

  function deskUp(event) {
    const d = desk.drag;
    if (!d) return;
    desk.drag = null;
    setClass(d.node, 'dragging', false);
    setClass($('#dock'), 'drop-on', false);
    if (!d.moved) return;
    const dock = rectOf($('#dock'));
    if (dock && event.clientX >= dock.left && event.clientX <= dock.right && event.clientY >= dock.top && event.clientY <= dock.bottom) {
      if (!dockPinned(d.item.key)) pinDock(d.item, true);
      layoutDeskIcons();
      return;
    }
    const a = rectOf($('#deskIcons'));
    const x = Math.round((d.ox + event.clientX - d.sx) / 4) * 4;
    const y = Math.round((d.oy + event.clientY - d.sy) / 4) * 4;
    const pos = { ...((S.deskIcons && S.deskIcons.pos) || {}) };
    pos[d.item.key] = a ? { x: Math.max(0, Math.min(x, a.width - CELL.w)), y: Math.max(0, Math.min(y, a.height - CELL.h)) } : { x, y };
    saveDesk({ pos });
    layoutDeskIcons();
  }

  /* Programs, projects and files dragged from a window land on the desktop or the dock. */
  function dropData(event) {
    try {
      const raw = event.dataTransfer && event.dataTransfer.getData('application/x-itd-item');
      const item = raw ? JSON.parse(raw) : null;
      return item && typeof item.key === 'string' && typeof item.title === 'string' ? item : null;
    } catch { return null; }
  }

  const dragHasItem = (event) => !!(event.dataTransfer && [...(event.dataTransfer.types || [])].includes('application/x-itd-item'));

  function initDesk() {
    const area = $('#deskArea');
    if (!area || typeof area.addEventListener !== 'function') return;
    document.addEventListener('pointermove', deskMove);
    document.addEventListener('pointerup', deskUp);
    document.addEventListener('pointercancel', deskUp);
    area.addEventListener('dragover', (event) => {
      if (!dragHasItem(event) || (event.target.closest && event.target.closest('.win'))) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      const dock = event.target.closest && event.target.closest('#dock');
      setClass($('#dock'), 'drop-on', !!dock);
      setClass(area, 'drop-on', !dock);
    });
    area.addEventListener('dragleave', (event) => { if (event.target === area) { setClass(area, 'drop-on', false); setClass($('#dock'), 'drop-on', false); } });
    area.addEventListener('drop', (event) => {
      setClass(area, 'drop-on', false);
      setClass($('#dock'), 'drop-on', false);
      if (event.target.closest && event.target.closest('.win')) return;
      const item = dropData(event);
      if (!item) return;
      event.preventDefault();
      if (event.target.closest && event.target.closest('#dock')) { if (!dockPinned(item.key)) pinDock(item, true); return; }
      const a = rectOf($('#deskIcons'));
      addToDesk(item, a ? { x: Math.max(0, Math.round(event.clientX - a.left - CELL.w / 2)), y: Math.max(0, Math.round(event.clientY - a.top - 36)) } : null);
    });
    area.addEventListener('dragend', () => { setClass(area, 'drop-on', false); setClass($('#dock'), 'drop-on', false); });
    document.addEventListener('dragend', () => { setClass(area, 'drop-on', false); setClass($('#dock'), 'drop-on', false); });

    /* Right-click on an empty part of the desktop. */
    const view = $('#view-desktop');
    const icons = $('#deskIcons');
    const deskMenu = (event) => {
      if (event.target.closest && event.target.closest('button, a, input, textarea, .dicon, .card, .dock')) return;
      const hidden = ((S.deskIcons && S.deskIcons.hidden) || []).length;
      menu(event, [
        { head: 'Рабочий стол' },
        { label: 'Программы', icon: '▦', hint: 'Ctrl 2', run: () => setView('apps') },
        { label: 'Проекты', icon: '◆', hint: 'Ctrl 3', run: () => setView('home') },
        { label: 'Файлы', icon: '▤', hint: 'Ctrl 4', run: () => setView('explorer') },
        '-',
        { label: 'Упорядочить значки', icon: '▦', run: arrangeDesk },
        hidden ? { label: 'Вернуть убранные ярлыки (' + hidden + ')', icon: '↺', run: () => { saveDesk({ hidden: [] }); renderDeskIcons(); } } : null,
        { label: 'Свернуть все окна', icon: '▭', run: showDesktop },
        '-',
        { label: 'Следующие обои', icon: '◐', run: () => setWallpaper({ kind: 'shader', mode: ((Number(S.wallpaper.mode) || 0) + 1) % 9, running: true }) },
        { label: 'Персонализация', icon: '✦', hint: 'Ctrl 5', run: () => setView('settings') },
        { label: 'Поиск', icon: '⌕', hint: 'Ctrl K', run: openPalette }
      ]);
    };
    if (view && view.addEventListener) view.addEventListener('contextmenu', deskMenu);
    if (icons && icons.addEventListener) {
      icons.addEventListener('contextmenu', (event) => { if (event.target === icons) deskMenu(event); });
      icons.addEventListener('pointerdown', (event) => { if (event.target === icons) selectDesk(null); });
    }
  }

  function desktopLive() {
    return document.body.dataset.maxed !== 'on' && !shellHidden;
  }

  /* ---------------------------------------------------------------- desktop and widgets */

  const dateFmt = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
  const barFmt = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });

  function tick() {
    const now = new Date();
    const time = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    const clock = $('#deskClock');
    if (clock) clock.textContent = time;
    const date = $('#deskDate');
    if (date) date.textContent = '01 · ' + dateFmt.format(now);
    const bar = $('#barClock');
    if (bar) bar.textContent = barFmt.format(now).replace('.', '') + ' · ' + time;
    const wall = $('#wClockBig');
    if (wall) wall.textContent = time;
  }

  function card(title, body, extra) {
    return el('section', { class: 'card' + (extra ? ' ' + extra : '') }, el('div', { class: 'label', text: title }), body);
  }

  function bar(label, value, text) {
    const ratio = Math.max(0, Math.min(1, value || 0));
    const meter = el('i', { class: 'meter-fill' });
    meter.style.width = (ratio * 100).toFixed(1) + '%';
    return el('div', { class: 'meter-row' },
      el('span', { class: 'label', text: label }),
      el('span', { class: 'meter' }, meter),
      el('b', { class: 'meter-val', text: text }));
  }

  function renderWidgets() {
    const host = $('#widgets');
    if (!host) return;
    const w = S.widgets;
    const clock = $('#wClock');
    if (clock) clock.hidden = !w.clock;

    const cards = [];
    if (w.system) cards.push(card('Система', el('div', { id: 'wSystem', class: 'meters' }, el('p', { class: 'muted', text: 'Опрос…' }))));
    if (w.disks) cards.push(card('Диски', el('div', { id: 'wDisks', class: 'meters' }, el('p', { class: 'muted', text: 'Опрос…' }))));
    if (w.battery) cards.push(card('Батарея', el('div', { id: 'wBattery', class: 'meters' }, el('p', { class: 'muted', text: 'Нет данных' }))));
    if (w.notes) {
      const area = el('textarea', { id: 'wNotes', class: 'notes', rows: '5', placeholder: 'Заметка остаётся в state.json', spellcheck: 'false' });
      area.value = S.notes || '';
      area.addEventListener('input', () => save({ notes: area.value }));
      cards.push(card('Заметки', area));
    }
    if (w.recent) cards.push(card('Недавнее', el('div', { id: 'recent' })));
    cards.push(card('Сборка', el('dl', { class: 'meta', id: 'buildMeta' })));
    fill(host, cards);

    renderRecent();
    renderBuildMeta();
    pollSystem();
    pollDisks();
    pollBattery();
  }

  function renderRecent() {
    const recent = $('#recent');
    if (!recent) return;
    const latest = history.slice(0, 5);
    const kids = latest.length ? latest.map((item) => el('button', { type: 'button', class: 'rec', 'data-tint': true, onclick: () => launch(item) },
      tile(item, 'tile-sm'), el('span', { class: 'rec-title', text: item.title }), el('span', { class: 'chip', text: item.sub || '' })))
      : [el('p', { class: 'muted', text: 'Пока пусто. Здесь появится то, что запущено из оболочки.' })];
    fill(recent, kids);
    withIcons(latest);
  }

  function renderDesktop() {
    renderRecent();
    const dock = $('#dock');
    if (!dock) return;
    dock.replaceChildren();
    /* Pinned first, then what is launched most, then registry entries that exist on this machine. */
    const hidden = new Set(S.dockHidden || []);
    const pins = (S.dockPins || []).filter((p) => p && p.key);
    const seen = new Set(pins.map((p) => p.key));
    const auto = [];
    for (const item of [...[...history].sort((a, b) => b.count - a.count), ...projects.filter((p) => p.local)]) {
      if (auto.length + pins.length >= 9) break;
      if (seen.has(item.key) || hidden.has(item.key)) continue;
      seen.add(item.key);
      auto.push(item);
    }
    const docked = [...pins, ...auto];
    docked.forEach((item, i) => {
      const pinned = i < pins.length;
      const button = el('button', {
        type: 'button', title: item.title, 'aria-label': item.title, 'data-tint': true, class: pinned ? 'pinned' : null,
        draggable: 'true', ondragstart: (event) => dragItem(event, item),
        onclick: () => launch(item),
        oncontextmenu: (event) => itemMenu(event, item, {
          extra: pinned ? [] : ['-', { label: 'Убрать из дока', icon: '×', run: () => { save({ dockHidden: [...hidden, item.key] }); renderDesktop(); } }]
        })
      }, tile(item, 'tile-dock'));
      button.style.setProperty('--i', i);
      dock.append(button);
    });
    dock.append(el('button', {
      type: 'button', class: 'dock-more', 'aria-label': 'Все программы', title: 'Все программы', text: '+', onclick: () => setView('apps'),
      oncontextmenu: (event) => menu(event, [
        { head: 'Док' },
        { label: 'Все программы', icon: '▦', run: () => setView('apps') },
        hidden.size ? { label: 'Вернуть убранные (' + hidden.size + ')', icon: '↺', run: () => { save({ dockHidden: [] }); renderDesktop(); } } : null,
        pins.length ? { label: 'Открепить всё', icon: '×', danger: true, run: () => { save({ dockPins: [] }); renderDesktop(); } } : null
      ])
    }));
    withIcons([...history.slice(0, 5), ...docked]);
  }

  function renderBuildMeta() {
    const node = $('#buildMeta');
    if (!node) return;
    const combo = (value, fallback) => (value ? value.replace('Control', 'Ctrl').replace(/\+/g, ' ') : fallback);
    const rows = [
      ['Версия', 'v' + info.version],
      ['Режим', 'Поверх Explorer'],
      ['Поиск', combo(info.hotkey, 'Ctrl K (клавиша занята)')],
      ['Пуск', (info.winKey === 'on' || info.winKey === 'starting' ? 'Win · ' : '') + combo(info.startHotkey, 'только кнопка I/TD')],
      ['Реестр', projects.length + ' записей'],
      ['Программы', apps.length ? String(apps.length) : 'индекс строится']
    ];
    fill(node, rows.map(([k, v]) => el('div', null, el('dt', { class: 'label', text: k }), el('dd', { text: v }))));
  }

  let lastMetrics = null;
  async function pollSystem() {
    const box = $('#wSystem');
    if (!desktopLive() || !box || !S.widgets.system) return;
    let m = null;
    try { m = await api.metrics(); } catch { m = null; }
    if (!m) { fill(box, el('p', { class: 'muted', text: 'Нет данных' })); return; }
    lastMetrics = m;
    const load = m.load == null ? 0 : m.load;
    const memRatio = m.mem.total ? m.mem.used / m.mem.total : 0;
    const hours = Math.floor(m.uptime / 3600);
    fill(box,
      bar('Процессор', load, m.load == null ? '—' : Math.round(load * 100) + '%'),
      bar('Память', memRatio, sizeFmt(m.mem.used) + ' / ' + sizeFmt(m.mem.total)),
      el('p', { class: 'muted small', text: m.cores + ' ядер · в работе ' + hours + ' ч' })
    );
  }

  async function pollDisks() {
    const box = $('#wDisks');
    if (!desktopLive() || !box || !S.widgets.disks) return;
    let list = [];
    try { list = (await api.disks()) || []; } catch { list = []; }
    if (!list.length) { fill(box, el('p', { class: 'muted', text: 'Диски не прочитаны' })); return; }
    fill(box, list.map((d) => bar(d.letter, d.total ? d.used / d.total : 0, sizeFmt(d.free) + ' своб.')));
  }

  async function pollBattery() {
    const box = $('#wBattery');
    if (!desktopLive() || !box || !S.widgets.battery) return;
    const nav = typeof navigator === 'object' ? navigator : null;
    const getter = nav && (nav.getBattery || nav.getBattery);
    if (!getter) { fill(box, el('p', { class: 'muted', text: 'На этом компьютере батареи нет или она недоступна.' })); return; }
    try {
      const b = await getter.call(nav);
      fill(box,
        bar('Заряд', b.level, Math.round(b.level * 100) + '%'),
        el('p', { class: 'muted small', text: b.charging ? 'Заряжается' : 'От батареи' }));
    } catch {
      fill(box, el('p', { class: 'muted', text: 'Батарея недоступна.' }));
    }
  }

  /* ---------------------------------------------------------------- projects */

  const home = { status: 'all', cat: 'all', sel: projects[0] || null };

  const homeList = () => projects.filter((p) => (home.status === 'all' || p.status === home.status) && (home.cat === 'all' || p.category === home.cat));

  function sideButton(label, count, active, onclick, color) {
    let swatch = null;
    if (color) { swatch = el('i', { class: 'sw', 'aria-hidden': 'true' }); swatch.style.background = color; }
    return el('button', { type: 'button', class: 'side-item', 'aria-pressed': String(active), onclick },
      el('span', { class: 'side-name' }, swatch, label), count == null ? null : el('small', { text: String(count) }));
  }

  function stateBadge(status) {
    return el('span', { class: 'state label ' + status }, el('i', { 'aria-hidden': 'true' }), STATUS[status]);
  }

  function projectCard(p, i, mode) {
    const common = {
      type: 'button', 'data-tint': true, 'aria-pressed': String(p === home.sel),
      onclick: () => { if (home.sel === p) return; home.sel = p; markSelected(); renderInspector(); },
      ondblclick: () => launch(p),
      oncontextmenu: (event) => { if (home.sel !== p) { home.sel = p; markSelected(); renderInspector(); } itemMenu(event, p); },
      draggable: 'true',
      ondragstart: (event) => dragItem(event, p)
    };
    let node;
    if (mode === 'icons') {
      node = el('button', { ...common, class: 'pcard pcard-icon' },
        el('span', { class: 'pcard-top' }, tile(p), stateBadge(p.status)),
        el('span', { class: 'pcard-title', text: p.title }));
    } else if (mode === 'table') {
      node = el('button', { ...common, class: 'pcard pcard-row' },
        el('span', { class: 'pcard-top' }, tile(p, 'tile-sm')),
        el('span', { class: 'pcard-title', text: p.title }),
        el('span', { class: 'pcard-num label', text: CATEGORY[p.category] || p.category }),
        stateBadge(p.status));
    } else {
      node = el('button', { ...common, class: 'pcard' },
        el('span', { class: 'pcard-top' }, tile(p), stateBadge(p.status)),
        el('span', { class: 'pcard-num label', text: String(p.index + 1).padStart(2, '0') + ' · ' + (CATEGORY[p.category] || p.category) }),
        el('span', { class: 'pcard-title', text: p.title }),
        el('span', { class: 'pcard-desc', text: p.desc }),
        el('span', { class: 'pcard-tags' }, p.stack ? el('span', { class: 'chip', text: p.stack }) : null, p.access ? el('span', { class: 'chip', text: p.access }) : null));
    }
    node.style.setProperty('--i', i);
    return node;
  }

  function markSelected() {
    document.querySelectorAll('#grid .pcard').forEach((node) => {
      node.setAttribute('aria-pressed', String(node.dataset.pk === (home.sel && home.sel.key)));
    });
  }

  function renderHome() {
    const count = (fn) => projects.filter(fn).length;
    const statusBox = $('#fStatus');
    if (statusBox) fill(statusBox,
      sideButton('Все', projects.length, home.status === 'all', () => { home.status = 'all'; renderHome(); }),
      Object.keys(STATUS).map((s) => sideButton(STATUS[s], count((p) => p.status === s), home.status === s, () => { home.status = s; renderHome(); }))
    );
    const cats = Object.keys(CATEGORY).filter((c) => projects.some((p) => p.category === c));
    const catBox = $('#fCat');
    if (catBox) fill(catBox,
      sideButton('Все', projects.length, home.cat === 'all', () => { home.cat = 'all'; renderHome(); }),
      cats.map((c) => sideButton(CATEGORY[c], count((p) => p.category === c), home.cat === c, () => { home.cat = c; renderHome(); }, CAT_COLOR[c]))
    );

    const cfg = S.home;
    renderTools($('#homeTools'), 'home', cfg, renderHome);

    const list = sortList(homeList(), cfg.sort, cfg.dir);
    if (!list.includes(home.sel)) home.sel = list[0] || null;
    const counter = $('#homeCount');
    if (counter) counter.textContent = list.length + ' из ' + projects.length;

    const grid = $('#grid');
    if (!grid) return;
    grid.dataset.mode = cfg.mode;
    const kids = [];
    if (!list.length) kids.push(el('p', { class: 'muted', text: 'Под эти фильтры ничего не подходит.' }));
    let i = 0;
    for (const bucket of groupList(list, cfg.group)) {
      if (bucket.label) kids.push(groupHead(bucket, renderHome, false));
      if (collapsed.has(bucket.key)) continue;
      for (const p of bucket.items) {
        const node = projectCard(p, i++, cfg.mode);
        node.dataset.pk = p.key;
        kids.push(node);
      }
    }
    fill(grid, kids);
    renderInspector();
    withIcons(list);
  }

  function renderInspector() {
    const box = $('#inspector');
    if (!box) return;
    const p = home.sel;
    if (!p) { fill(box, el('span', { class: 'label', text: 'Инспектор' }), el('p', { text: 'Ничего не выбрано.' })); return; }
    const rows = [['Стек', p.stack || '—'], ['Доступ', p.access || '—'], ['Путь', p.local || '—'], ['Ссылка', p.url || '—'], ['Состояние', STATUS[p.status]]];
    box.setAttribute('data-tint', '');
    fill(box,
      el('span', { class: 'label', text: 'Инспектор · ' + String(p.index + 1).padStart(2, '0') + ' / ' + projects.length }),
      tile(p, 'tile-lg'),
      el('h2', { text: p.title }),
      el('p', { text: p.desc }),
      el('button', { type: 'button', class: 'btn btn-primary btn-wide', onclick: () => launch(p) }, el('span', { text: 'Открыть проект' }), el('span', { 'aria-hidden': 'true', text: '→' })),
      p.local ? el('button', { type: 'button', class: 'btn', onclick: () => showInExplorer(p.local) }, 'Показать в проводнике') : null,
      el('dl', { class: 'meta' }, rows.map(([k, v]) => el('div', null, el('dt', { class: 'label', text: k }), el('dd', { text: v }))))
    );
    paintAll();
  }

  /* ---------------------------------------------------------------- explorer */

  const ex = { path: null, parent: null, entries: [], sel: null, back: [], filter: '' };

  async function navigate(target, remember = true) {
    const result = await api.list(target);
    if (!result.ok) { toast('Не открыто.', result.error + ': ' + result.path, true); return false; }
    if (remember && ex.path && ex.path !== result.path) ex.back.push(ex.path);
    ex.path = result.path;
    ex.parent = result.parent;
    ex.entries = result.entries.map((e) => ({ ...e, kind: 'file', key: 'file:' + e.path, title: e.name, target: e.path, sub: e.dir ? 'Папка' : 'Файл' }));
    ex.sel = null;
    ex.filter = '';
    const filterBox = $('#exFilter');
    if (filterBox) filterBox.value = '';
    save({ explorerPath: ex.path });
    renderExplorer();
    if (result.truncated) toast('Показано не всё.', 'В папке больше 3000 объектов.');
    return true;
  }

  async function showInExplorer(target) {
    const data = await api.preview(target);
    if (data.kind === 'none') { toast('Не найдено.', target, true); return; }
    setView('explorer');
    if (data.kind === 'dir') { await navigate(target); return; }
    const sep = Math.max(target.lastIndexOf('\\'), target.lastIndexOf('/'));
    if (await navigate(target.slice(0, sep + 1))) {
      const name = target.slice(sep + 1).toLowerCase();
      const entry = ex.entries.find((e) => e.name.toLowerCase() === name);
      if (entry) selectEntry(entry);
    }
  }

  function openEntry(entry) {
    if (entry.dir) navigate(entry.path);
    else launch({ key: 'file:' + entry.path, kind: 'file', title: entry.name, target: entry.path, sub: 'Файл' });
  }

  function selectEntry(entry) {
    ex.sel = entry;
    const rows = $('#rows');
    if (rows) for (const row of rows.children) {
      const on = row.dataset.path === entry.path;
      row.setAttribute('aria-selected', String(on));
      if (on) row.scrollIntoView({ block: 'nearest' });
    }
    renderPreview();
  }

  function renderCrumbs() {
    const box = $('#crumbs');
    if (!box || !ex.path) return;
    box.replaceChildren();
    const parts = ex.path.split(/[\\/]+/).filter(Boolean);
    let acc = '';
    parts.forEach((part, i) => {
      acc = i === 0 ? part + '\\' : acc + (acc.endsWith('\\') ? '' : '\\') + part;
      const here = acc;
      if (i) box.append(el('span', { 'aria-hidden': 'true', text: '/' }));
      box.append(el('button', { type: 'button', text: part, onclick: () => navigate(here) }));
    });
  }

  /* Clicking a column heading sorts by it, and clicking it again flips the direction. */
  function renderHead() {
    const head = $('#exHead');
    if (!head) return;
    const cfg = S.explorer;
    const cols = [['name', 'Имя', ''], ['mtime', 'Изменён', ''], ['size', 'Размер', 'num']];
    fill(head, cols.map(([id, label, cls]) => el('th', { scope: 'col', class: cls || null, 'aria-sort': cfg.sort === id ? (cfg.dir < 0 ? 'descending' : 'ascending') : 'none' },
      el('button', {
        type: 'button', class: 'col-btn',
        onclick: () => { save({ explorer: cfg.sort === id ? { dir: -cfg.dir } : { sort: id, dir: 1 } }); renderExplorer(); }
      }, el('span', { text: label }), el('i', { 'aria-hidden': 'true', text: cfg.sort === id ? (cfg.dir < 0 ? '↓' : '↑') : '' })))));
  }

  function fileRow(entry, i, mode) {
    const row = el('tr', {
      tabindex: '0', 'data-path': entry.path, 'aria-selected': String(ex.sel === entry),
      onclick: () => selectEntry(entry),
      ondblclick: () => openEntry(entry),
      oncontextmenu: (event) => { if (ex.sel !== entry) selectEntry(entry); itemMenu(event, entry); },
      draggable: 'true',
      ondragstart: (event) => dragItem(event, entry),
      onkeydown: (event) => {
        if (event.key === 'Enter') { event.preventDefault(); openEntry(entry); }
        else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          const next = event.key === 'ArrowDown' ? event.currentTarget.nextElementSibling : event.currentTarget.previousElementSibling;
          if (next) { next.focus(); next.click(); }
        }
      }
    },
    el('td', { 'data-tint': true }, mode === 'table'
      ? el('span', { class: entry.dir ? 'ico dir' : 'ico', 'aria-hidden': 'true' })
      : tile(entry, entry.dir ? 'tile-dir' : ''), el('span', { class: 'fname', text: entry.name })),
    el('td', { text: entry.dir ? 'Папка' : stamp(entry.mtime) }),
    el('td', { class: 'num', text: entry.dir ? '—' : sizeFmt(entry.size) }));
    row.style.setProperty('--i', i);
    return row;
  }

  function renderExplorer() {
    if (!ex.path) return;
    renderCrumbs();
    renderHead();
    const cfg = S.explorer;
    renderTools($('#exTools'), 'explorer', cfg, renderExplorer);
    const list = $('#exList');
    if (list) list.dataset.mode = cfg.mode;

    const back = $('#exBack'); if (back) back.disabled = !ex.back.length;
    const up = $('#exUp'); if (up) up.disabled = !ex.parent;
    for (const item of document.querySelectorAll('#places .side-item')) {
      if (item.dataset.path === ex.path) item.setAttribute('aria-current', 'true');
      else item.removeAttribute('aria-current');
    }

    const needle = ex.filter.trim().toLowerCase();
    const matched = needle ? ex.entries.filter((e) => e.name.toLowerCase().includes(needle)) : ex.entries;
    const sorted = sortList(matched, cfg.sort, cfg.dir).slice(0, 1500);

    const rows = $('#rows');
    const kids = [];
    let i = 0;
    for (const bucket of groupList(sorted, cfg.group)) {
      if (bucket.label) kids.push(groupHead(bucket, renderExplorer, true));
      if (collapsed.has(bucket.key)) continue;
      for (const entry of bucket.items) kids.push(fileRow(entry, i++, cfg.mode));
    }
    fill(rows, kids);

    const empty = $('#exEmpty');
    if (empty) {
      empty.hidden = sorted.length > 0;
      empty.textContent = needle ? 'По этому фильтру ничего нет.' : 'Папка пуста.';
    }
    const status = $('#exStatus');
    if (status) status.textContent = sorted.length + ' объектов' + (ex.sel ? ' · выбран 1' : '');
    renderPreview();
    if (cfg.mode !== 'table') withIcons(sorted.slice(0, 60));
  }

  async function renderPreview() {
    const box = $('#preview');
    if (!box) return;
    const entry = ex.sel;
    if (!entry) {
      fill(box, el('span', { class: 'label accent', text: 'Просмотр' }), el('p', { class: 'muted', text: 'Выберите файл или папку в списке.' }));
      return;
    }
    const data = await api.preview(entry.path);
    if (ex.sel !== entry) return;
    let body = null;
    if (data.kind === 'text') body = el('pre', { text: data.text + (data.cut ? '\n…' : '') });
    else if (data.kind === 'image') body = el('img', { src: data.url, alt: entry.name });
    const rows = [['Тип', entry.dir ? 'Папка' : (data.ext ? data.ext.toUpperCase() : 'Файл')], ['Размер', entry.dir ? '—' : sizeFmt(data.size)], ['Изменён', stamp(data.mtime)]];
    fill(box,
      el('span', { class: 'label accent', text: 'Просмотр' }),
      el('h2', { text: entry.name }),
      body,
      el('dl', { class: 'meta' }, rows.map(([k, v]) => el('div', null, el('dt', { class: 'label', text: k }), el('dd', { text: v })))),
      el('button', { type: 'button', class: 'btn btn-primary', onclick: () => openEntry(entry) }, 'Открыть →')
    );
    const status = $('#exStatus');
    if (status) status.textContent = $('#rows').children.length + ' объектов · выбран 1';
  }

  async function renderPlaces() {
    const groups = await api.places();
    const box = $('#places');
    if (!box) return;
    box.replaceChildren();
    for (const group of groups) {
      box.append(el('div', { class: 'label', text: group.group }));
      box.append(el('div', { class: 'side-list' }, group.items.map((item) =>
        el('button', { type: 'button', class: 'side-item', 'data-path': item.path, onclick: () => navigate(item.path) }, el('span', { text: item.name })))));
    }
  }

  /* ---------------------------------------------------------------- confirm dialog */

  let confirmAction = null;

  function askConfirm(title, text, onYes, yesLabel, tag) {
    const box = $('#confirm');
    if (!box) { onYes(); return; }
    confirmAction = onYes;
    box.dataset.kind = tag ? 'info' : 'warn';
    const tagNode = $('#cfTag');
    if (tagNode) tagNode.textContent = tag || 'Подтверждение';
    $('#cfTitle').textContent = title;
    $('#cfText').textContent = text;
    const ok = $('#cfOk');
    if (ok) ok.textContent = yesLabel || 'Да';
    box.hidden = false;
    if (ok && ok.focus) ok.focus();
  }

  function closeConfirm() {
    confirmAction = null;
    const box = $('#confirm');
    if (box) box.hidden = true;
  }

  /* ---------------------------------------------------------------- palette */

  const SCOPES = [['all', 'Всё'], ['app', 'Программы'], ['project', 'Проекты'], ['command', 'Команды']];
  const GROUPS = { calc: 'Расчёт', path: 'Путь', recent: 'Недавнее', app: 'Программы', project: 'Проекты', command: 'Команды' };
  const pal = { open: false, scope: 'all', items: [], index: 0 };

  const sys = (id, title) => ({ key: 'cmd:' + id, kind: 'command', title, sub: 'Система', desc: 'Системная команда Windows.', run: () => api.system(id) });

  /* Shutting the machine down, restarting it or signing out always asks first. */
  const guarded = (id, title, question) => ({
    key: 'cmd:' + id, kind: 'command', title, sub: 'Питание', desc: 'Запрашивает подтверждение.',
    run: () => askConfirm(title, question, () => api.system(id), title)
  });

  const POWER = [
    { id: 'lock', title: 'Заблокировать', confirm: null },
    { id: 'sleep', title: 'Сон', confirm: null },
    { id: 'logoff', title: 'Выйти из системы', confirm: 'Все несохранённые программы будут закрыты. Выйти из системы?' },
    { id: 'restart', title: 'Перезагрузить', confirm: 'Компьютер перезагрузится сейчас же. Продолжить?' },
    { id: 'shutdown', title: 'Выключить', confirm: 'Компьютер выключится сейчас же. Продолжить?' }
  ];

  async function runTerminal(kind, cwd, admin) {
    let r = null;
    try { r = await api.terminal(kind, cwd || null, !!admin); } catch (error) { r = { ok: false, error: String(error && error.message) }; }
    if (!r || !r.ok) toast('Не удалось открыть терминал.', (r && r.error) || '', true);
    else if (admin) toast('Запрошены права администратора.', 'Подтвердите окно Windows.');
    return r;
  }
  function term(kind, title, admin) {
    return { key: 'cmd:term-' + kind + (admin ? '-admin' : ''), kind: 'command', title, sub: 'Терминал', desc: (admin ? 'С правами администратора. ' : '') + 'Откроется в домашней папке.', run: () => runTerminal(kind, null, admin) };
  }

  const commands = [
    { key: 'cmd:view-desktop', kind: 'command', title: 'Рабочий стол', sub: 'Раздел', desc: 'Перейти на рабочий стол оболочки.', run: () => setView('desktop') },
    { key: 'cmd:view-apps', kind: 'command', title: 'Программы', sub: 'Окно', desc: 'Лаунчер всех установленных программ.', run: () => setView('apps') },
    { key: 'cmd:view-home', kind: 'command', title: 'Проекты', sub: 'Окно', desc: 'Открыть реестр проектов.', run: () => setView('home') },
    { key: 'cmd:view-explorer', kind: 'command', title: 'Файлы', sub: 'Окно', desc: 'Открыть встроенный просмотр файлов.', run: () => setView('explorer') },
    { key: 'cmd:show-desktop', kind: 'command', title: 'Свернуть все окна', sub: 'Окна', desc: 'Показать рабочий стол или вернуть окна.', run: () => showDesktop() },
    { key: 'cmd:view-settings', kind: 'command', title: 'Персонализация', sub: 'Окно', desc: 'Акцент, обои, шрифты, виджеты, поведение.', run: () => setView('settings') },
    { key: 'cmd:grok', kind: 'command', title: 'Grok', sub: 'Сайты', desc: 'Открыть grok.com в браузере по умолчанию (боты: Санни, Инста, Бот).', run: () => { try { api.open('https://grok.com'); } catch { /* none */ } } },
    { key: 'cmd:lock', kind: 'command', title: 'Заблокировать', sub: 'Оболочка', desc: 'Экран блокировки I/TD (Ctrl+Alt+L).', run: () => { try { api.lockNow(); } catch { /* none */ } } },
    { key: 'cmd:start', kind: 'command', title: 'Меню «Пуск»', sub: 'Оболочка', desc: 'Открыть меню I/TD.', run: () => openStart() },
    { key: 'cmd:accent-save', kind: 'command', title: 'Акцент: добавить в свои', sub: 'Вид', desc: 'Сохранить текущий произвольный цвет в набор своих акцентов.', run: () => { if (S.accent === 'custom') addUserAccent(S.accentCustom); else { setView('settings'); toast('Сначала выберите цвет.', '«Вид → Произвольный», потом «Добавить в свои».'); } } },
    ...Object.entries(ACCENTS).map(([id, a]) => ({ key: 'cmd:accent-' + id, kind: 'command', title: 'Акцент: ' + a.name, sub: 'Вид', desc: 'Сменить акцентный цвет оболочки.', run: () => setAccent(id) })),
    ...['Туман', 'Свечение', 'Сетка', 'Сияние', 'Контуры', 'Ромбы', 'Поток', 'Звёзды', 'Чернила'].map((name, mode) => ({ key: 'cmd:wall-' + mode, kind: 'command', title: 'Обои: ' + name, sub: 'Обои', desc: 'Переключить режим шейдера обоев.', run: () => setWallpaper({ kind: 'shader', mode, running: true }) })),
    { key: 'cmd:wall-pause', kind: 'command', title: 'Обои: пауза или запуск', sub: 'Обои', desc: 'Остановить или продолжить анимацию обоев.', run: () => setWallpaper({ running: !S.wallpaper.running }) },
    term('cmd', 'Командная строка', false), term('powershell', 'PowerShell', false), term('wt', 'Терминал Windows', false),
    term('cmd', 'Командная строка (администратор)', true), term('powershell', 'PowerShell (администратор)', true),
    { key: 'cmd:term-here', kind: 'command', title: 'Терминал в текущей папке', sub: 'Терминал', desc: 'PowerShell в папке, открытой в «Файлах».', run: () => runTerminal('powershell', ex.path) },
    sys('taskmgr', 'Диспетчер задач'),
    sys('settings', 'Параметры Windows'),
    sys('sound', 'Параметры звука'),
    sys('display', 'Параметры экрана'),
    sys('network', 'Параметры сети'),
    sys('personalize', 'Персонализация Windows'),
    sys('explorer', 'Открыть окно Explorer'),
    ...POWER.map((p) => (p.confirm ? guarded(p.id, p.title, p.confirm) : sys(p.id, p.title === 'Заблокировать' ? 'Заблокировать компьютер' : p.title))),
    { key: 'cmd:minimize', kind: 'command', title: 'Свернуть оболочку', sub: 'Оболочка', desc: 'Свернуть окно оболочки.', run: () => api.minimize() },
    { key: 'cmd:quit', kind: 'command', title: 'Выйти из оболочки', sub: 'Оболочка', desc: 'Закрыть I/TD Shell. Explorer продолжит работать.', run: () => api.quit() }
  ];

  function score(query, text) {
    const t = text.toLowerCase();
    const at = t.indexOf(query);
    if (at === 0) return 100 - t.length * 0.01;
    if (at > 0) return (/[\s\-_.]/.test(t[at - 1]) ? 80 : 60) - at * 0.1;
    let from = 0, gaps = 0;
    for (const ch of query) {
      const found = t.indexOf(ch, from);
      if (found < 0) return 0;
      gaps += found - from;
      from = found + 1;
    }
    return Math.max(1, 40 - gaps);
  }

  function calc(source) {
    const s = source.replace(/,/g, '.').replace(/\s+/g, '');
    if (!/^[\d.+\-*/()%]+$/.test(s) || !/[+\-*/%]/.test(s.slice(1))) return null;
    let i = 0;
    const factor = () => {
      if (s[i] === '-') { i++; return -factor(); }
      if (s[i] === '+') { i++; return factor(); }
      if (s[i] === '(') { i++; const v = expr(); if (s[i] !== ')') throw new Error('paren'); i++; return v; }
      const m = /^(\d+\.?\d*|\.\d+)/.exec(s.slice(i));
      if (!m) throw new Error('number');
      i += m[0].length;
      return parseFloat(m[0]);
    };
    const term = () => {
      let v = factor();
      while (s[i] === '*' || s[i] === '/' || s[i] === '%') {
        const op = s[i++];
        const r = factor();
        v = op === '*' ? v * r : op === '/' ? v / r : v % r;
      }
      return v;
    };
    function expr() {
      let v = term();
      while (s[i] === '+' || s[i] === '-') { const op = s[i++]; const r = term(); v = op === '+' ? v + r : v - r; }
      return v;
    }
    try {
      const value = expr();
      if (i !== s.length || !Number.isFinite(value)) return null;
      return Math.round(value * 1e10) / 1e10;
    } catch { return null; }
  }

  function search(raw, scopeOverride) {
    const scope = scopeOverride || pal.scope;
    const query = raw.trim().toLowerCase();
    const want = (kind) => scope === 'all' || scope === kind;
    const out = [];

    if (!query) {
      if (scope === 'all') for (const h of history.slice(0, 6)) out.push({ ...h, group: 'recent', desc: h.target });
      if (want('command')) for (const c of commands.slice(0, scope === 'command' ? commands.length : 3)) out.push({ ...c, group: 'command' });
      if (scope === 'app') for (const a of apps.slice(0, 40)) out.push({ ...a, group: 'app' });
      if (scope === 'project') for (const p of projects.slice(0, 40)) out.push({ ...p, group: 'project' });
      return out;
    }

    if (scope === 'all') {
      const value = calc(raw);
      if (value != null) out.push({ key: 'calc', kind: 'calc', group: 'calc', title: '= ' + String(value).replace('.', ','), sub: 'Enter копирует', desc: raw.trim() + ' = ' + value, run: () => { api.copy(String(value)); toast('Скопировано.', String(value)); } });
      if (/^[a-z]:[\\/]/i.test(raw.trim())) {
        const target = raw.trim();
        out.push({ key: 'path', kind: 'path', group: 'path', title: target, sub: 'В проводнике', desc: 'Открыть этот путь во встроенном проводнике.', run: () => showInExplorer(target) });
      }
    }

    const boost = (item) => { const h = history.find((x) => x.key === item.key); return h ? Math.min(15, h.count * 3) : 0; };
    const rank = (list, group, limit) => list
      .map((item) => ({ item, s: Math.max(score(query, item.title), item.desc && group !== 'app' ? score(query, item.desc) * 0.35 : 0) }))
      .filter((x) => x.s > 0)
      .map((x) => ({ ...x, s: x.s + boost(x.item) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, limit)
      .map((x) => ({ ...x.item, group }));

    const wide = scope !== 'all';
    if (want('app')) out.push(...rank(apps, 'app', wide ? 40 : 6));
    if (want('project')) out.push(...rank(projects, 'project', wide ? 40 : 6));
    if (want('command')) out.push(...rank(commands, 'command', wide ? 40 : 5));
    return out;
  }

  function renderScopes() {
    fill($('#scopes'), SCOPES.map(([id, name]) =>
      el('button', { type: 'button', class: 'scope', 'aria-pressed': String(pal.scope === id), text: name, onclick: () => { pal.scope = id; renderScopes(); renderResults(); $('#q').focus(); } })));
  }

  function renderResults() {
    pal.items = search($('#q').value);
    pal.index = Math.min(pal.index, Math.max(0, pal.items.length - 1));
    const box = $('#results');
    box.replaceChildren();
    let group = null;
    pal.items.forEach((item, i) => {
      if (item.group !== group) { group = item.group; box.append(el('div', { class: 'pal-group label', text: GROUPS[group] || group })); }
      box.append(el('button', {
        type: 'button', class: 'res', 'aria-selected': String(i === pal.index), tabindex: '-1',
        onmousemove: () => { if (pal.index !== i) { pal.index = i; markResult(); } },
        onclick: () => { pal.index = i; runSelected(); }
      },
      item.kind === 'command' || item.kind === 'calc' || item.kind === 'path'
        ? el('span', { class: 'res-ini', 'aria-hidden': 'true', text: '→' })
        : tile(item, 'tile-sm'),
      el('span', { class: 'res-title', text: item.title }),
      el('span', { class: 'res-sub', text: item.sub || '' })));
    });
    if (!pal.items.length) box.append(el('p', { class: 'muted', text: 'Ничего не найдено. Поиск по файлам появится в следующей сборке.' }));
    $('#palCount').textContent = pal.items.length + ' результатов';
    renderDetail();
    withIcons(pal.items.filter((item) => item.target));
  }

  function markResult() {
    const buttons = document.querySelectorAll('#results .res');
    buttons.forEach((button, i) => {
      button.setAttribute('aria-selected', String(i === pal.index));
      if (i === pal.index) button.scrollIntoView({ block: 'nearest' });
    });
    renderDetail();
  }

  function renderDetail() {
    const box = $('#detail');
    const item = pal.items[pal.index];
    if (!item) { fill(box, el('span', { class: 'label', text: 'I/TD Shell' }), el('p', { text: 'Начните печатать: название программы, проекта, команды, путь к папке или пример вроде 12*4.' })); return; }
    const rows = [];
    if (item.target) rows.push(['Путь', item.target]);
    if (item.kind === 'project') { rows.push(['Состояние', STATUS[item.status]]); if (item.stack) rows.push(['Стек', item.stack]); }
    box.setAttribute('data-tint', '');
    box.style.removeProperty('--c');
    fill(box,
      el('span', { class: 'label accent', text: (GROUPS[item.group] || '') + (item.sub ? ' · ' + item.sub : '') }),
      item.target ? tile(item, 'tile-lg') : null,
      el('h2', { text: item.title }),
      item.desc && item.desc !== item.target ? el('p', { text: item.desc }) : null,
      rows.length ? el('dl', { class: 'meta' }, rows.map(([k, v]) => el('div', null, el('dt', { class: 'label', text: k }), el('dd', { text: v })))) : null
    );
    box.querySelectorAll('[data-ik]').forEach(paint);
  }

  async function runSelected(reveal) {
    const item = pal.items[pal.index];
    if (!item) return;
    closePalette();
    if (reveal && item.target && !/^https?:/i.test(item.target)) { showInExplorer(item.target); return; }
    if (item.run) { await item.run(); return; }
    await launch(item);
  }

  function openPalette() {
    closeStart();
    pal.open = true;
    pal.index = 0;
    $('#palette').hidden = false;
    const input = $('#q');
    input.value = '';
    renderScopes();
    renderResults();
    input.focus();
  }

  function closePalette() {
    pal.open = false;
    $('#palette').hidden = true;
  }

  function paletteKey(event) {
    if (event.key === 'Escape') { event.preventDefault(); closePalette(); }
    else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!pal.items.length) return;
      const step = event.key === 'ArrowDown' ? 1 : -1;
      pal.index = (pal.index + step + pal.items.length) % pal.items.length;
      markResult();
    } else if (event.key === 'Enter') { event.preventDefault(); runSelected(false); }
    else if (event.key.toLowerCase() === 'o' && event.ctrlKey) { event.preventDefault(); runSelected(true); }
    else if (event.key === 'Tab') {
      event.preventDefault();
      const at = SCOPES.findIndex(([id]) => id === pal.scope);
      pal.scope = SCOPES[(at + (event.shiftKey ? SCOPES.length - 1 : 1)) % SCOPES.length][0];
      pal.index = 0;
      renderScopes();
      renderResults();
    }
  }

  /* ---------------------------------------------------------------- start menu */

  const START_TABS = [['pinned', 'Закреплённое'], ['all', 'Все программы'], ['projects', 'Проекты']];
  const start = { open: false, tab: 'pinned', query: '' };

  const pinnedItems = () => {
    const out = [];
    const seen = new Set();
    for (const p of S.startPins || []) {
      if (!p || !p.key || seen.has(p.key)) continue;
      seen.add(p.key);
      out.push(p);
    }
    for (const h of [...history].sort((a, b) => b.count - a.count || b.last - a.last)) {
      if (seen.has(h.key)) continue;
      seen.add(h.key);
      out.push(h);
      if (out.length >= 12) break;
    }
    for (const p of projects) {
      if (out.length >= 18) break;
      if (!p.target || seen.has(p.key)) continue;
      seen.add(p.key);
      out.push(p);
    }
    return out;
  };

  function startTile(item) {
    return el('button', {
      type: 'button', class: 'stile', 'data-tint': true, title: item.title,
      onclick: () => { closeStart(); if (item.run) item.run(); else launch(item); },
      oncontextmenu: (event) => { if (!item.run) itemMenu(event, item, { before: closeStart }); }
    },
    tile(item, 'tile-start'),
    el('span', { class: 'stile-name', text: item.title }),
    el('span', { class: 'stile-sub label', text: item.sub || '' }));
  }

  function startRow(item) {
    return el('button', {
      type: 'button', class: 'srow', 'data-tint': true,
      onclick: () => { closeStart(); if (item.run) item.run(); else launch(item); },
      oncontextmenu: (event) => { if (!item.run && item.target) itemMenu(event, item, { before: closeStart }); }
    },
    tile(item, 'tile-sm'),
    el('span', { class: 'srow-name', text: item.title }),
    el('span', { class: 'srow-sub label', text: item.sub || '' }));
  }

  function renderStart() {
    const list = $('#startList');
    if (!list) return;
    const tabs = $('#startTabs');
    if (tabs) fill(tabs, START_TABS.map(([id, name]) => el('button', {
      type: 'button', class: 'start-tab', role: 'tab', 'aria-selected': String(start.tab === id && !start.query), text: name,
      onclick: () => { start.tab = id; start.query = ''; const q = $('#startQ'); if (q) q.value = ''; renderStart(); }
    })));

    const alpha = $('#startAlpha');
    const count = $('#startCount');
    const query = start.query.trim();

    /* Typing in the menu reuses the palette's ranking. */
    if (query) {
      if (alpha) alpha.hidden = true;
      const items = search(query, 'all').filter((item) => item.group !== 'recent');
      fill(list, items.length ? items.map(startRow) : [el('p', { class: 'muted', text: 'Ничего не найдено.' })]);
      if (count) count.textContent = items.length + ' результатов';
      withIcons(items.filter((i) => i.target));
      return;
    }

    if (start.tab === 'pinned') {
      if (alpha) alpha.hidden = true;
      const items = pinnedItems();
      fill(list, el('div', { class: 'stiles' }, items.length ? items.map(startTile) : el('p', { class: 'muted', text: 'Пока пусто: запустите что-нибудь из поиска.' })));
      if (count) count.textContent = items.length + ' плиток';
      withIcons(items);
      return;
    }

    if (start.tab === 'projects') {
      if (alpha) alpha.hidden = true;
      const items = sortList(projects, 'name', 1);
      fill(list, items.map(startRow));
      if (count) count.textContent = items.length + ' проектов';
      withIcons(items.slice(0, 40));
      return;
    }

    /* Все программы: A–Z, А–Я and # buckets with a jump bar. */
    const items = apps;
    const buckets = groupList(sortList(items, 'name', 1), 'letter');
    const kids = [];
    for (const bucket of buckets) {
      kids.push(el('div', { class: 'start-letter label', id: 'L' + bucket.key.replace(/[^0-9A-Za-zА-Яа-яЁё]/g, ''), text: bucket.label }));
      for (const item of bucket.items) kids.push(startRow(item));
    }
    fill(list, kids.length ? kids : [el('p', { class: 'muted', text: 'Индекс программ пуст.' })]);
    if (alpha) {
      alpha.hidden = false;
      fill(alpha, buckets.map((bucket) => el('button', {
        type: 'button', class: 'alpha', text: bucket.label,
        onclick: () => { const head = $('#L' + bucket.key.replace(/[^0-9A-Za-zА-Яа-яЁё]/g, '')); if (head && head.scrollIntoView) head.scrollIntoView({ block: 'start' }); }
      })));
    }
    if (count) count.textContent = items.length + ' программ';
    withIcons(items.slice(0, 40));
  }

  function renderStartSide() {
    const quick = $('#startQuick');
    if (quick) {
      const swatches = el('div', { class: 'accents accents-wide' }, Object.entries(ACCENTS).map(([id, a]) => {
        const sw = el('i', { 'aria-hidden': 'true' });
        sw.style.background = a.hex;
        return el('button', { type: 'button', 'aria-label': 'Акцент: ' + a.name, 'aria-pressed': String(S.accent === id), onclick: () => { setAccent(id); renderStartSide(); } }, sw);
      }), userAccents().map((h) => {
        const sw = el('i', { 'aria-hidden': 'true' });
        sw.style.background = h;
        return el('button', { type: 'button', 'aria-label': 'Свой акцент ' + h, title: h, 'aria-pressed': String(isUserOn(h)), onclick: () => { setAccent('custom', h); renderStartSide(); } }, sw);
      }));
      fill(quick,
        swatches,
        el('button', { type: 'button', class: 'btn btn-quick', onclick: () => { setWallpaper({ kind: 'shader', mode: ((Number(S.wallpaper.mode) || 0) + 1) % 5, running: true }); } }, 'Сменить обои'),
        el('button', { type: 'button', class: 'btn btn-quick', onclick: () => { setWallpaper({ running: !S.wallpaper.running }); } }, S.wallpaper.running ? 'Пауза обоев' : 'Запустить обои'),
        el('button', { type: 'button', class: 'btn btn-quick', onclick: () => { closeStart(); setView('settings'); } }, 'Персонализация →')
      );
    }
    const power = $('#startPower');
    if (power) fill(power, POWER.map((p) => el('button', {
      type: 'button', class: 'pwr' + (p.confirm ? ' pwr-warn' : ''),
      onclick: () => {
        if (!p.confirm) { closeStart(); api.system(p.id); return; }
        closeStart();
        askConfirm(p.title, p.confirm, () => api.system(p.id), p.title);
      }
    }, el('span', { text: p.title }), el('span', { class: 'accent', 'aria-hidden': 'true', text: '→' }))));
  }

  function openStart() {
    closePalette();
    start.open = true;
    start.query = '';
    const box = $('#start');
    if (box) box.hidden = false;
    const button = $('#btnStart');
    if (button) button.setAttribute('aria-expanded', 'true');
    const q = $('#startQ');
    if (q) { q.value = ''; }
    const user = $('#startUser');
    if (user) user.textContent = info.user || '—';
    const pc = $('#startPc');
    if (pc) pc.textContent = info.computer || '';
    renderStartSide();
    renderStart();
    if (q && q.focus) q.focus();
  }

  function closeStart() {
    start.open = false;
    const box = $('#start');
    if (box) box.hidden = true;
    const button = $('#btnStart');
    if (button) button.setAttribute('aria-expanded', 'false');
  }

  const toggleStart = () => (start.open ? closeStart() : openStart());

  /* ---------------------------------------------------------------- personalization */

  const SET_SECTIONS = [
    ['accent', 'Акцент'], ['wallpaper', 'Обои'], ['window', 'Окно'],
    ['fonts', 'Шрифты'], ['icons', 'Иконки'], ['widgets', 'Виджеты'],
    ['behavior', 'Поведение'], ['reset', 'Сброс']
  ];
  let setSection = 'accent';

  const field = (label, hint, ...controls) => el('div', { class: 'field' },
    el('span', { class: 'label', text: label }),
    el('div', { class: 'field-ctl' }, controls),
    hint ? el('p', { class: 'muted small', text: hint }) : null);

  function sw(label, on, onchange, hint) {
    return el('div', { class: 'field field-sw' },
      el('button', { type: 'button', class: 'switch', role: 'switch', 'aria-checked': String(!!on), onclick: () => onchange(!on) }, el('i', { 'aria-hidden': 'true' })),
      el('span', { class: 'sw-text' }, el('b', { text: label }), hint ? el('span', { class: 'muted small', text: hint }) : null));
  }

  function rng(label, min, max, step, value, onchange, fmt) {
    const out = el('b', { class: 'rng-val', text: fmt(value) });
    const input = el('input', { type: 'range', min: String(min), max: String(max), step: String(step), 'aria-label': label });
    input.value = String(value);
    input.addEventListener('input', () => { out.textContent = fmt(Number(input.value)); });
    input.addEventListener('change', () => onchange(Number(input.value)));
    return field(label, null, input, out);
  }

  function colorPick(label, value, onchange) {
    const input = el('input', { type: 'color', 'aria-label': label });
    input.value = value || '#b28dff';
    input.addEventListener('change', () => onchange(input.value));
    return field(label, null, input, el('code', { class: 'code', text: value || '' }));
  }

  function settingsAccent() {
    const swatches = el('div', { class: 'swatches' }, Object.entries(ACCENTS).map(([id, a]) => {
      const box = el('i', { 'aria-hidden': 'true' });
      box.style.background = a.hex;
      return el('button', { type: 'button', class: 'swatch', 'aria-pressed': String(S.accent === id), onclick: () => setAccent(id) }, box, el('span', { class: 'label', text: a.name }));
    }));
    const mine = userAccents();
    const userBox = mine.length
      ? el('div', { class: 'uswatches' }, mine.map((h) => {
        const box = el('i', { 'aria-hidden': 'true' });
        box.style.background = h;
        return el('div', { class: 'uswatch-wrap' },
          el('button', { type: 'button', class: 'uswatch', 'aria-pressed': String(isUserOn(h)), 'aria-label': 'Свой акцент ' + h, onclick: () => setAccent('custom', h) }, box, el('code', { text: h })),
          el('button', { type: 'button', class: 'uswatch-x', 'aria-label': 'Убрать ' + h, title: 'Убрать', onclick: () => removeUserAccent(h) }, '×'));
      }))
      : el('p', { class: 'muted small', text: 'Пока пусто. Выберите цвет ниже и нажмите «Добавить в свои».' });
    const pick = el('input', { type: 'color', 'aria-label': 'Произвольный цвет акцента' });
    pick.value = S.accentCustom || '#b28dff';
    pick.addEventListener('change', () => setAccent('custom', pick.value));
    const full = mine.length >= USER_MAX;
    return [
      field('Цвет системы', 'Один акцент за раз: индексы, ссылки и стрелки. Волосяные линии остаются фиолетовыми.', swatches),
      field('Свои цвета', 'До ' + USER_MAX + ' цветов. Они же в панели акцентов сверху (правый клик — убрать) и в «Пуске».', userBox),
      field('Произвольный', full ? 'Свои цвета заполнены: уберите один, чтобы сохранить новый.' : 'Цвет применяется сразу; «Добавить в свои» сохраняет его в набор.', pick,
        el('button', { type: 'button', class: 'btn', disabled: full, onclick: () => addUserAccent(pick.value) }, 'Добавить в свои'),
        el('code', { class: 'code', text: S.accentCustom || '' })),
      el('p', { class: 'muted small', text: 'Текущий: ' + (S.accent === 'custom' ? (userAccents().includes(String(S.accentCustom).toLowerCase()) ? 'свой ' : 'произвольный ') + S.accentCustom : (ACCENTS[S.accent] || ACCENTS.violet).name) })
    ];
  }

  const WALL_MODES = [['0', 'Туман'], ['1', 'Свечение'], ['2', 'Сетка'], ['3', 'Сияние'], ['4', 'Контуры'], ['5', 'Ромбы'], ['6', 'Поток'], ['7', 'Звёзды'], ['8', 'Чернила']];
  const WALL_KINDS = [['shader', 'Шейдер'], ['gradient', 'Градиент'], ['solid', 'Цвет'], ['image', 'Изображение']];
  const FITS = [['cover', 'Заполнить'], ['contain', 'Вписать'], ['repeat', 'Замостить']];

  function settingsWallpaper() {
    const w = S.wallpaper;
    const out = [field('Источник', null, seg(WALL_KINDS, w.kind, (id) => setWallpaper({ kind: id }), 'Источник обоев'))];
    if (w.kind === 'shader') {
      out.push(field('Режим шейдера', 'Живой фон рисуется 30 раз в секунду и только пока открыт стол. На других разделах и при сворачивании кадр останавливается.',
        seg(WALL_MODES, String(w.mode), (id) => setWallpaper({ mode: Number(id) }), 'Режим шейдера')));
      out.push(sw('Анимация', w.running, (on) => setWallpaper({ running: on }), 'Пауза экономит заряд и кадры.'));
      out.push(rng('Качество', 0.2, 1, 0.05, Number(w.quality) || 0.75, (v) => setWallpaper({ quality: v }), (v) => Math.round(v * 100) + '%'));
      if (!bgReady) out.push(el('p', { class: 'muted small', text: 'WebGL недоступен: шейдер заменён статическим фоном.' }));
    } else if (w.kind === 'gradient') {
      out.push(field('Пресет', null, seg(GRADIENTS.map((g, i) => [String(i), g.name]), String(w.gradient), (id) => setWallpaper({ gradient: Number(id) }), 'Градиент')));
    } else if (w.kind === 'solid') {
      out.push(colorPick('Цвет фона', w.solid, (hex) => setWallpaper({ solid: hex })));
    } else {
      out.push(field('Файл', w.image ? 'Выбрано: ' + decodeURI(String(w.image).replace(/^file:\/\/\//, '')) : 'Файл не выбран.',
        el('button', { type: 'button', class: 'btn', onclick: async () => { const picked = await api.pickImage(); if (picked) setWallpaper({ image: picked.url }); } }, 'Выбрать изображение'),
        w.image ? el('button', { type: 'button', class: 'btn', onclick: () => setWallpaper({ image: null }) }, 'Убрать') : null));
      out.push(field('Подгонка', null, seg(FITS, w.fit, (id) => setWallpaper({ fit: id }), 'Подгонка изображения')));
    }
    out.push(rng('Затемнение', 0, 0.9, 0.02, Number(w.dim) || 0, (v) => setWallpaper({ dim: v }), (v) => Math.round(v * 100) + '%'));
    out.push(sw('Зерно', w.grain, (on) => setWallpaper({ grain: on }), 'Ретро-слой поверх фона, непрозрачность 5,5%.'));
    return out;
  }

  const WIN_MODES = [['work', 'Рабочая область'], ['full', 'Полный экран'], ['window', 'Окно']];
  const DENSITY = [['compact', 'Компактно'], ['normal', 'Обычно'], ['roomy', 'Просторно']];

  function settingsWindow() {
    const w = S.window;
    const apply = (patch) => { save({ window: patch }); applyChrome(); try { api.applyWindow(S.window); } catch { /* window stays as is */ } renderSettings(); };
    return [
      field('Режим окна', 'Рабочая область оставляет панель задач Windows видимой.', seg(WIN_MODES, w.mode, (id) => apply({ mode: id }), 'Режим окна')),
      sw('Поверх всех окон', w.onTop, (on) => apply({ onTop: on })),
      sw('Срезанные углы', w.cut !== false, (on) => { save({ window: { cut: on } }); applyChrome(); renderSettings(); }, 'Срез 10px по верхнему правому и нижнему левому углу.'),
      field('Плотность', null, seg(DENSITY, w.density || 'normal', (id) => { save({ window: { density: id } }); applyChrome(); renderSettings(); }, 'Плотность интерфейса')),
      rng('Масштаб интерфейса', 0.8, 1.5, 0.05, Number(w.zoom) || 1, (v) => apply({ zoom: v }), (v) => Math.round(v * 100) + '%')
    ];
  }

  function settingsFonts() {
    const out = [el('p', { class: 'muted small', text: 'Space Grotesk, Unbounded, Geist и Geist Mono встроены в оболочку и работают без интернета, остальные берутся из системы. Точка означает, что шрифт найден.' })];
    for (const [slot, set] of Object.entries(FONT_SETS)) {
      const options = [['', 'Авто']].concat(set.list.map((name) => [name, name + (hasFont(name) ? ' ·' : '')]));
      out.push(field(set.label, 'Сейчас: ' + (S.fonts[slot] || 'авто'), seg(options, S.fonts[slot] || '', (id) => { save({ fonts: { [slot]: id } }); applyFonts(); renderSettings(); }, set.label)));
      const custom = el('input', { type: 'text', placeholder: 'Своё имя шрифта', 'aria-label': 'Своё имя шрифта для ' + set.label });
      custom.value = S.fonts[slot] || '';
      custom.addEventListener('change', () => { save({ fonts: { [slot]: custom.value.trim() } }); applyFonts(); renderSettings(); });
      out.push(field('Вручную', null, custom));
    }
    return out;
  }

  const ICON_SIZES = [['small', 'Мелкие'], ['medium', 'Средние'], ['large', 'Крупные']];

  function settingsIcons() {
    return [
      field('Размер иконок', 'Относится к плиткам на карточках, в доке, в меню «Пуск» и в проводнике.',
        seg(ICON_SIZES, (S.icons && S.icons.size) || 'medium', (id) => {
          save({ icons: { size: id } });
          applyChrome();
          asked.clear();
          icons.clear();
          renderDesktop();
          if (homeReady) renderHome();
          renderSettings();
        }, 'Размер иконок')),
      el('p', { class: 'muted small', text: 'Иконки запрашиваются у Windows с запасом: ' + iconRequestSize() + ' px.' })
    ];
  }

  const WIDGET_LIST = [
    ['clock', 'Часы и дата', 'Крупные часы на рабочем столе.'],
    ['system', 'Система', 'Загрузка процессора и памяти, опрос раз в 8 секунд и только на столе.'],
    ['disks', 'Диски', 'Занято и свободно по буквам дисков.'],
    ['notes', 'Заметки', 'Текст сохраняется в state.json.'],
    ['recent', 'Недавнее', 'Последнее, что открывалось из оболочки.'],
    ['battery', 'Батарея', 'Показывается, если система отдаёт заряд.']
  ];

  function settingsWidgets() {
    return WIDGET_LIST.map(([id, label, hint]) => sw(label, S.widgets[id], (on) => { save({ widgets: { [id]: on } }); renderWidgets(); renderSettings(); }, hint));
  }

  const START_VIEWS = [['desktop', 'Стол'], ['apps', 'Программы'], ['home', 'Проекты'], ['explorer', 'Файлы'], ['settings', 'Вид']];

  function lockPinField() {
    const oldIn = el('input', { type: 'password', inputmode: 'numeric', maxlength: '8', placeholder: 'Текущий PIN', 'aria-label': 'Текущий PIN' });
    const newIn = el('input', { type: 'password', inputmode: 'numeric', maxlength: '8', placeholder: 'Новый PIN, 4–8 цифр', 'aria-label': 'Новый PIN' });
    const ERR = { old: 'Текущий PIN неверный.', format: 'PIN: только цифры, от 4 до 8.', write: 'Не удалось записать PIN.', locked: 'Сначала разблокируйте экран.', denied: 'Нет доступа.' };
    async function apply(next) {
      let r = { ok: false, err: 'write' };
      try { r = await api.lockSet(oldIn.value, next); } catch { /* keep */ }
      if (r.ok) { lockHas = !!r.has; toast(r.has ? 'PIN сохранён.' : 'PIN убран.', r.has ? 'Он хранится в отдельном файле в виде хеша.' : 'Экран блокировки откроется любой клавишей.'); renderSettings(); }
      else toast('PIN не изменён.', ERR[r.err] || '', true);
    }
    const kids = [];
    if (lockHas) kids.push(oldIn);
    kids.push(newIn, el('button', { type: 'button', class: 'btn', onclick: () => apply(newIn.value) }, lockHas ? 'Сменить' : 'Задать'));
    if (lockHas) kids.push(el('button', { type: 'button', class: 'btn', onclick: () => apply('') }, 'Убрать PIN'));
    return field('PIN экрана блокировки', null, ...kids);
  }

  function settingsBehavior() {
    const b = S.behavior;
    return [
      sw('Запускать вместе с Windows', b.autostart, async (on) => {
        let result = on;
        try { result = await api.autostart(on); } catch { result = false; }
        save({ behavior: { autostart: !!result } });
        toast(result ? 'Автозапуск включён.' : 'Автозапуск выключен.', 'Это единственная системная запись, которую делает оболочка.');
        renderSettings();
      }, 'По умолчанию выключено. Пишется только в запись автозапуска текущего пользователя.'),
      sw('Клавиша Win открывает меню I/TD', b.winKey !== false, async (on) => {
        let st = 'off';
        try { st = api.winKey ? await api.winKey(on) : 'off'; } catch { st = 'error'; }
        save({ behavior: { winKey: on } });
        toast(on ? (st === 'error' || st === 'missing' ? 'Не удалось перехватить Win.' : 'Win открывает меню I/TD.') : 'Win снова открывает «Пуск» Windows.', 'Сочетания Win+E, Win+R, Win+D работают как обычно.');
        renderSettings();
      }, 'Одиночное нажатие Win открывает меню оболочки. Ничего не меняет в системе.'),
      sw('Своя панель задач вместо панели Windows', !!b.taskbar, async (on) => {
        let ok = false;
        try { ok = api.taskbar ? await api.taskbar(on) : false; } catch { ok = false; }
        save({ behavior: { taskbar: on } });
        toast(on ? 'Панель задач I/TD включена.' : 'Панель задач Windows вернулась.', on ? 'Открытые окна, Win-меню, поиск, часы. Колёсиком по окну — закрыть.' : '', false);
        renderSettings();
      }, 'Прячет панель Windows, пока оболочка запущена. При закрытии или сбое оболочки панель Windows возвращается сама.'),
      sw('Блокировать при запуске Windows', !!b.lockOnStart, (on) => { save({ behavior: { lockOnStart: on } }); renderSettings(); }, 'После автовхода сразу показывается экран блокировки I/TD. Работает вместе с автозапуском.'),
      field('Блокировать при простое', null, seg([['0', 'Выкл'], ['5', '5 мин'], ['15', '15 мин'], ['30', '30 мин']], String(b.lockIdle || 0), (id) => { save({ behavior: { lockIdle: Number(id) } }); renderSettings(); }, 'Блокировка при простое')),
      sw('Ещё и замок Windows под экраном I/TD', !!b.lockNative, (on) => { save({ behavior: { lockNative: on } }); renderSettings(); }, 'Выключено: только экран I/TD. Включено: ещё и настоящая блокировка Windows (потом спросит пароль Windows).'),
      lockPinField(),
      field('Экран блокировки', null, el('button', { type: 'button', class: 'btn', onclick: () => { try { api.lockNow(); } catch { /* none */ } } }, 'Заблокировать сейчас'), el('span', { class: 'hint', text: 'Ctrl+Alt+L' })),
      sw('Открывать папки в I/TD вместо Проводника', !!b.folders, async (on) => {
        let ok = false;
        try { ok = api.folders ? await api.folders(on) : false; } catch { ok = false; }
        save({ behavior: { folders: on && ok } });
        toast(on ? (ok ? 'Папки открываются в I/TD.' : 'Не удалось переназначить папки.') : 'Папки снова открывает Проводник.', on ? 'Двойной щелчок по папке и Win+E ведут сюда. Только для вашей учётной записи.' : 'Прежнее действие по умолчанию восстановлено.', on && !ok);
        renderSettings();
      }, 'Двойной щелчок по папке, Win+E и «Открыть папку» из программ. Пишется только в HKCU, выключается здесь же или удалением программы.'),
      field('Открывать при старте', null, seg(START_VIEWS, b.startView, (id) => { save({ behavior: { startView: id } }); renderSettings(); }, 'Раздел при старте')),
      sw('Экран загрузки', b.boot !== false, (on) => { save({ behavior: { boot: on } }); renderSettings(); }),
      sw('Анимации', b.motion !== false, (on) => { save({ behavior: { motion: on } }); applyChrome(); renderSettings(); }, 'Выключение убирает все переходы, как prefers-reduced-motion.')
    ];
  }

  function settingsReset() {
    return [
      el('p', { text: 'Настройки лежат в одном файле. Сброс возвращает значения по умолчанию и не удаляет историю запусков.' }),
      field('Файл настроек', null, el('code', { class: 'code', text: info.statePath || 'state.json' }),
        el('button', { type: 'button', class: 'btn', onclick: () => { api.copy(info.statePath || ''); toast('Скопировано.', 'Путь к state.json'); } }, 'Копировать путь')),
      el('button', {
        type: 'button', class: 'btn', onclick: () => askConfirm('Сбросить настройки?', 'Акцент, обои, окно, шрифты, виджеты и поведение вернутся к стандартным.', async () => {
          try { const fresh = await api.stateReset(); S = merge(DEFAULTS, fresh || {}); } catch { S = JSON.parse(JSON.stringify(DEFAULTS)); }
          history = Array.isArray(S.history) ? S.history : [];
          setAccent(S.accent, S.accentCustom);
          applyFonts();
          applyChrome();
          applyWallpaper();
          renderWidgets();
          renderDesktop();
          renderHome();
          renderSettings();
          toast('Сброшено.', 'Настройки вернулись к стандартным.');
        }, 'Сбросить')
      }, 'Сбросить к стандартным')
    ];
  }

  const SET_BODIES = {
    accent: settingsAccent, wallpaper: settingsWallpaper, window: settingsWindow,
    fonts: settingsFonts, icons: settingsIcons, widgets: settingsWidgets,
    behavior: settingsBehavior, reset: settingsReset
  };

  function renderSettings() {
    const nav = $('#setNav');
    if (nav) fill(nav,
      el('div', { class: 'label', text: 'Разделы' }),
      el('div', { class: 'side-list' }, SET_SECTIONS.map(([id, name]) =>
        sideButton(name, null, setSection === id, () => { setSection = id; renderSettings(); }))));
    const title = $('#setTitle');
    const found = SET_SECTIONS.find(([id]) => id === setSection) || SET_SECTIONS[0];
    if (title) title.textContent = found[1];
    const hint = $('#setHint');
    if (hint) hint.textContent = 'state.json';
    const body = $('#setBody');
    if (body) fill(body, (SET_BODIES[setSection] || settingsAccent)());
  }

  /* ---------------------------------------------------------------- wiring */

  function globalKey(event) {
    if (ctx.open) { menuKey(event); return; }
    if (confirmAction) {
      if (event.key === 'Escape') { event.preventDefault(); closeConfirm(); }
      else if (event.key === 'Enter') { event.preventDefault(); const run = confirmAction; closeConfirm(); run(); }
      return;
    }
    if (pal.open) { paletteKey(event); return; }
    const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement && document.activeElement.tagName);
    if (start.open) {
      if (event.key === 'Escape') { event.preventDefault(); closeStart(); return; }
      if (event.key === 'Enter' && typing) { event.preventDefault(); const first = document.querySelectorAll('#startList .srow')[0]; if (first && first.click) first.click(); return; }
      if (!typing && event.key === 'Tab') {
        event.preventDefault();
        const at = START_TABS.findIndex(([id]) => id === start.tab);
        start.tab = START_TABS[(at + 1) % START_TABS.length][0];
        renderStart();
        return;
      }
    }
    if ((event.ctrlKey && event.key.toLowerCase() === 'k') || (!typing && event.key === '/')) { event.preventDefault(); openPalette(); return; }
    if (!typing && (event.key === 'F1' || (event.ctrlKey && event.key === ' '))) { event.preventDefault(); toggleStart(); return; }
    if (event.ctrlKey && ['1', '2', '3', '4', '5'].includes(event.key)) { event.preventDefault(); setView(VIEWS[Number(event.key) - 1]); return; }
    const focused = topWin();
    if (focused && event.ctrlKey && !event.shiftKey && event.key.toLowerCase() === 'w') { event.preventDefault(); closeWin(focused); return; }
    if (focused && event.ctrlKey && event.key.toLowerCase() === 'm') { event.preventDefault(); minWin(focused); return; }
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'd') { event.preventDefault(); showDesktop(); return; }
    /* Typing anywhere in the Programs window goes straight into its search. */
    if (focused === 'apps' && !typing && !event.ctrlKey && !event.altKey && !event.metaKey && event.key.length === 1 && event.key !== ' ') {
      const q = $('#appsQ');
      if (q && q.focus) q.focus();
      return;
    }
    if (!focused && desk.sel && !typing) {
      const item = deskItems().find((x) => x.key === desk.sel);
      if (item && event.key === 'Enter') { event.preventDefault(); launch(item); return; }
      if (item && event.key === 'Delete') { event.preventDefault(); removeFromDesk(item); return; }
    }
    if (document.body.dataset.view === 'explorer' && !typing) {
      if (event.key === 'Backspace' && ex.parent) { event.preventDefault(); navigate(ex.parent); }
      else if (event.key === 'Enter' && ex.sel && document.activeElement.tagName !== 'TR' && document.activeElement.tagName !== 'BUTTON') { event.preventDefault(); openEntry(ex.sel); }
    }
  }

  function renderAccentBar() {
    const box = $('#accents');
    if (!box) return;
    const buttons = Object.entries(ACCENTS).map(([id, a]) => {
      const swatch = el('i', { 'aria-hidden': 'true' });
      swatch.style.background = a.hex;
      return el('button', { type: 'button', 'data-accent': id, 'aria-label': 'Акцент: ' + a.name, 'aria-pressed': 'false', onclick: () => setAccent(id) }, swatch);
    });
    const mine = userAccents().map((h) => {
      const swatch = el('i', { 'aria-hidden': 'true' });
      swatch.style.background = h;
      return el('button', { type: 'button', 'data-accent': 'custom', 'data-hex': h, 'aria-label': 'Свой акцент ' + h, title: h + ' · правый клик — убрать', 'aria-pressed': 'false',
        onclick: () => setAccent('custom', h), oncontextmenu: (event) => { event.preventDefault(); removeUserAccent(h); } }, swatch);
    });
    const custom = el('input', { type: 'color', class: 'accent-custom', 'aria-label': 'Произвольный акцент', title: 'Произвольный цвет' });
    custom.value = S.accentCustom || '#b28dff';
    custom.addEventListener('change', () => setAccent('custom', custom.value));
    const add = el('button', { type: 'button', class: 'accent-add', 'aria-label': 'Добавить текущий цвет в свои', title: 'Добавить текущий цвет в свои', hidden: userAccents().length >= USER_MAX,
      onclick: () => addUserAccent(S.accent === 'custom' ? S.accentCustom : custom.value) }, '+');
    fill(box, buttons, mine, custom, add);
    markAccent();
  }

  async function init() {
    try { const loaded = await api.stateLoad(); if (loaded) S = merge(DEFAULTS, loaded); } catch { /* defaults */ }
    history = Array.isArray(S.history) ? S.history : [];
    migrateQuiet();
    if (api.onHidden) api.onHidden((hidden) => { shellHidden = !!hidden; applyWallpaper(); });

    renderAccentBar();
    warmFonts();
    applyFonts();
    applyChrome();
    initWallpaper();
    setAccent(S.accent, S.accentCustom);
    tick();
    every(1000, tick);
    every(8000, pollSystem);
    every(60000, pollDisks);
    every(60000, pollBattery);

    const nav = $('.bar-nav');
    if (nav) for (const button of nav.children) {
      button.addEventListener('click', () => taskClick(button.dataset.view));
      button.addEventListener('contextmenu', (event) => { if (button.dataset.view === 'desktop') menu(event, [{ head: 'Рабочий стол' }, { label: 'Свернуть все окна', icon: '▭', run: showDesktop }]); else winMenu(event, button.dataset.view); });
    }
    initWindows();
    initDesk();
    document.addEventListener('contextmenu', (event) => {
      const field = event.target && event.target.closest && event.target.closest('input[type="text"], input[type="search"], input:not([type]), textarea');
      if (field) { textMenu(event, field); return; }
      if (!event.defaultPrevented) event.preventDefault();
    });
    document.addEventListener('pointerdown', (event) => { if (ctx.open && !(event.target.closest && event.target.closest('#ctx'))) closeMenu(); }, true);
    document.addEventListener('wheel', () => closeMenu(), { passive: true, capture: true });
    if (typeof addEventListener === 'function') addEventListener('blur', closeMenu);
    const appsQ = $('#appsQ');
    if (appsQ) {
      appsQ.addEventListener('input', () => { launcher.query = appsQ.value; renderApps(); });
      appsQ.addEventListener('keydown', (event) => {
        const first = document.querySelectorAll('#appsGrid .acard')[0];
        if (event.key === 'Enter' && first) { event.preventDefault(); const item = apps.find((a) => a.key === first.dataset.key) || deskItems().find((a) => a.key === first.dataset.key); if (item) launch(item); }
        else if (event.key === 'ArrowDown' && first) { event.preventDefault(); first.focus(); selectApp(first.dataset.key); }
        else if (event.key === 'Escape' && appsQ.value) { event.preventDefault(); event.stopPropagation(); appsQ.value = ''; launcher.query = ''; renderApps(); }
      });
    }
    $('#openPalette').addEventListener('click', openPalette);
    $('#deskSearch').addEventListener('click', openPalette);
    $('#deskExplorer').addEventListener('click', () => setView('apps'));
    const deskStart = $('#deskStart');
    if (deskStart) deskStart.addEventListener('click', toggleStart);
    const btnStart = $('#btnStart');
    if (btnStart) btnStart.addEventListener('click', toggleStart);
    const startClose = $('#startClose');
    if (startClose) startClose.addEventListener('click', closeStart);
    const startQ = $('#startQ');
    if (startQ) startQ.addEventListener('input', () => { start.query = startQ.value; renderStart(); });
    const startBox = $('#start');
    if (startBox) startBox.addEventListener('mousedown', (event) => { if (event.target === event.currentTarget) closeStart(); });
    const cfOk = $('#cfOk');
    if (cfOk) cfOk.addEventListener('click', () => { const run = confirmAction; closeConfirm(); if (run) run(); });
    const cfNo = $('#cfNo');
    if (cfNo) cfNo.addEventListener('click', closeConfirm);
    $('#btnMin').addEventListener('click', () => api.minimize());
    $('#btnQuit').addEventListener('click', () => api.quit());
    $('#q').addEventListener('input', () => { pal.index = 0; renderResults(); });
    $('#palette').addEventListener('mousedown', (event) => { if (event.target === event.currentTarget) closePalette(); });
    $('#exBack').addEventListener('click', () => { const prev = ex.back.pop(); if (prev) navigate(prev, false); });
    $('#exUp').addEventListener('click', () => { if (ex.parent) navigate(ex.parent); });
    $('#exFilter').addEventListener('input', (event) => { ex.filter = event.target.value; ex.sel = null; renderExplorer(); });
    document.addEventListener('keydown', globalKey);
    api.onPalette(openPalette);
    if (api.onStart) api.onStart(openStart);
    if (api.onOpenPath) api.onOpenPath((target) => { if (typeof target === 'string' && target) showInExplorer(target); });
    { const c = $('#exCmd'); if (c) c.addEventListener('click', () => runTerminal('cmd', ex.path)); }
    { const c = $('#exPs'); if (c) c.addEventListener('click', () => runTerminal('powershell', ex.path)); }
    { const c = $('#exWin'); if (c) c.addEventListener('click', () => api.explorerAt && api.explorerAt(ex.path)); }
    if (api.onStartToggle) api.onStartToggle(() => { if (start.open) closeStart(); else openStart(); });

    try { info = { ...info, ...(await api.info()) }; } catch { /* keep defaults */ }
    const combo = (value, fallback) => (value ? value.replace('Control', 'Ctrl').replace(/\+/g, ' ') : fallback);
    $('#hotkeyHint').textContent = combo(info.hotkey, 'Ctrl K');
    $('#hintHotkey').textContent = combo(info.hotkey, 'Ctrl K');
    const hintStart = $('#hintStart');
    if (hintStart) hintStart.textContent = combo(info.startHotkey, 'кнопка I/TD');
    const startHint = $('#startHint');
    if (startHint) startHint.textContent = combo(info.startHotkey, 'кнопка I/TD');

    renderWidgets();
    renderDesktop();
    setView(S.behavior.startView || 'desktop');
    try { api.applyWindow(S.window); } catch { /* window stays as is */ }
    try { const auto = await api.autostart(); if (!!auto !== !!S.behavior.autostart) save({ behavior: { autostart: !!auto } }); } catch { /* keep */ }
    if (S.behavior.boot === false) $('#boot').classList.add('done');
    else {
      const hold = (info.autostarted ? 2800 : 1400) - (Date.now() - BOOT_T0);
      setTimeout(() => $('#boot').classList.add('done'), Math.max(0, hold));
    }

    try {
      const found = await api.apps();
      apps = found.map((a) => ({ key: 'app:' + a.name, kind: 'app', title: a.name, name: a.name, target: a.path, mtime: a.mtime || null, folder: a.folder || '', store: !!a.store, sub: a.store ? 'Приложение Windows' : 'Программа', desc: '' }));
    } catch { apps = []; }
    renderBuildMeta();
    renderDeskIcons();
    if (winRec('apps').state !== 'closed') renderApps();
    if (pal.open) renderResults();
    if (start.open) renderStart();
  }

  init().catch((error) => {
    $('#boot').classList.add('done');
    toast('Сбой запуска.', String(error && error.message), true);
  });
})();
