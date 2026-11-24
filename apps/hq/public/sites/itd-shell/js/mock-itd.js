/* I/TD Shell — web preview: window.itd without Electron.
   Loaded before projects.js/bg.js/app.js in shell.html. Everything is simulated: a small virtual
   disk, a fake app list, settings in this browser's localStorage. Nothing is launched or written
   outside the page. Actions that would touch Windows go to the host page as a toast. */
(() => {
  'use strict';
  const KEY = 'itd-shell-preview:state';
  const PIN = 'itd-shell-preview:pin';
  const HOME = 'C:\\Users\\guest';
  const now = Date.now();
  const day = 864e5;
  const host = (type, data) => { try { parent.postMessage({ itdPreview: type, ...data }, location.origin); } catch { /* standalone */ } };
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* private mode */ } }
  };

  /* ---------------------------------------------------------------- settings */
  let state = {};
  try { state = JSON.parse(store.get(KEY) || '{}') || {}; } catch { state = {}; }
  const merge = (base, patch) => {
    for (const [k, v] of Object.entries(patch || {})) {
      if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) merge(base[k], v);
      else base[k] = v;
    }
    return base;
  };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const persist = () => {
    let s = JSON.stringify(state);
    /* a picked wallpaper can be big; keep the rest of the settings if it does not fit */
    if (s.length > 3e6 && state.wallpaper && /^data:/.test(state.wallpaper.image || '')) { const c = clone(state); c.wallpaper.image = ''; s = JSON.stringify(c); }
    store.set(KEY, s);
  };

  /* ---------------------------------------------------------------- virtual disk */
  const svg = (body, bg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400"><rect width="640" height="400" fill="${bg}"/>${body}</svg>`);
  const spiral = svg(Array.from({ length: 14 }, (_, i) => `<circle cx="320" cy="200" r="${12 + i * 14}" fill="none" stroke="hsl(${260 + i * 7} 100% ${60 + i}%)" stroke-opacity="${1 - i / 16}" stroke-width="2" stroke-dasharray="${8 + i * 3} ${6 + i}"/>`).join(''), '#0a0a0f');
  const grid = svg(Array.from({ length: 21 }, (_, i) => `<path d="M${i * 32} 0V400M0 ${i * 20}H640" stroke="#b28dff" stroke-opacity=".18"/>`).join('') + '<text x="320" y="214" fill="#d8ff00" font-family="monospace" font-size="42" text-anchor="middle">I/TD</text>', '#0d0b14');

  const NOTES = [
    '# I/TD Shell 1.1 — что нового', '',
    '* Своя панель задач (AppBar): живой список окон Windows по событиям, без опроса.',
    '* Область уведомлений на панели I/TD: настоящие значки программ, подсказки,',
    '  левый, правый и двойной клик доходят до программы; больше 8 значков —',
    '  старые сворачиваются за стрелку у часов.',
    '* Экран блокировки с PIN: хеш с солью, пауза после 5 неверных попыток.',
    '* Клавиша Win открывает меню «Пуск» через нативного помощника itd-native.exe.',
    '* Команды терминала, «Открыть в Windows», свойства ярлыков, запуск от администратора.', '',
    'Это превью: диск, программы и окна ненастоящие, настройки живут в этом браузере.'
  ].join('\n');

  const F = (name, size, extra = {}) => ({ name, size, mtime: extra.mtime || now - Math.round(Math.random() * 40) * day, ...extra });
  const D = (name, kids = [], extra = {}) => ({ name, dir: true, kids, mtime: extra.mtime || now - Math.round(Math.random() * 90) * day });
  const tree = D('C:', [
    D('Program Files', [D('I-TD Shell', [F('ITD Shell.exe', 182e6), F('resources.pak', 9.4e6)]), D('Mozilla Firefox'), D('Brave'), D('Blender Foundation')]),
    D('Users', [D('guest', [
      D('Desktop', [F('I-TD Shell.lnk', 1630), F('readme.txt', 412, { text: 'Это рабочий стол превью.\nПравый клик по значкам — меню, перетаскивание — порядок.' })]),
      D('Documents', [F('что нового в 1.1.md', NOTES.length, { text: NOTES, mtime: now - 3600e3 }), F('заметки.md', 640, { text: '- обои: шейдер «спираль»\n- акцент: лайм\n- док: Figma, Терминал, Telegram\n- PIN: потом' }), F('смета.xlsx', 38211), F('бриф.pdf', 412880)]),
      D('Downloads', [F('ITD-Shell-1.1.0-win-x64.zip', 98.4e6, { mtime: now - 7200e3 }), F('wallpaper-grid.svg', 2210, { image: grid })]),
      D('Pictures', [F('neon-spiral.svg', 4120, { image: spiral }), F('grid.svg', 2210, { image: grid }), D('Screenshots', [F('2026-11-24 15-48.png', 812400)])]),
      D('Music'), D('Videos'),
      D('Projects', [D('itd-shell', [F('main.js', 59521, { text: "'use strict';\n\n/* I/TD Shell 1.1 — main process.\n   Runs over Explorer (overlay mode). */\n\nconst { app, BrowserWindow } = require('electron');\n…" }), F('package.json', 684, { text: '{\n  "name": "itd-shell",\n  "productName": "I/TD Shell",\n  "version": "1.1.0"\n}' }), D('renderer'), D('tools')])])
    ])]),
    D('Windows', [D('System32'), D('Fonts')])
  ]);
  const disk2 = D('D:', [D('Media', [F('showreel.mp4', 1.2e9)]), D('Backup', [F('state.json', 2710, { text: '{ "accent": "violet" }' })])]);

  const norm = (p) => {
    let s = String(p || '').replace(/\//g, '\\').replace(/\\+/g, '\\').trim();
    if (/^[a-z]:$/i.test(s)) s += '\\';
    if (s.length > 3) s = s.replace(/\\$/, '');
    return s;
  };
  const join = (a, b) => (a.endsWith('\\') ? a + b : a + '\\' + b);
  const parentOf = (p) => { if (/^[a-z]:\\$/i.test(p)) return null; const i = p.lastIndexOf('\\'); return i <= 2 ? p.slice(0, 3) : p.slice(0, i); };
  /* a registry entry under Projects that is not drawn here: give it a believable folder */
  const synth = (name) => D(name, [F('README.md', 1840, { text: '# ' + name + '\n\nЗаглушка проекта в превью I/TD Shell.' }), F('package.json', 512, { text: '{\n  "name": "' + name.toLowerCase().replace(/\W+/g, '-') + '"\n}' }), D('src'), D('public')]);
  function find(p) {
    const path = norm(p);
    const m = /^([a-z]):\\?(.*)$/i.exec(path);
    if (!m) return null;
    let node = m[1].toUpperCase() === 'C' ? tree : m[1].toUpperCase() === 'D' ? disk2 : null;
    if (!node) return null;
    const parts = m[2] ? m[2].split('\\') : [];
    for (let i = 0; i < parts.length; i++) {
      let next = (node.kids || []).find((k) => k.name.toLowerCase() === parts[i].toLowerCase());
      if (!next && node.dir && /\\users\\guest\\(projects|nextcloud)$/i.test(norm(m[1] + ':\\' + parts.slice(0, i).join('\\')))) { next = synth(parts[i]); node.kids.push(next); }
      if (!next) return null;
      node = next;
    }
    return node;
  }
  const extOf = (n) => { const i = n.lastIndexOf('.'); return i > 0 ? n.slice(i + 1).toLowerCase() : ''; };

  /* ---------------------------------------------------------------- programs */
  const SM = 'C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs\\';
  const APPS = [
    ['Блокнот', 'Стандартные'], ['Калькулятор', 'Microsoft Store', true], ['Paint', 'Стандартные'], ['Терминал', 'Microsoft Store', true], ['Параметры', 'Microsoft Store', true],
    ['Проводник', 'Стандартные'], ['Microsoft Edge'], ['Firefox'], ['Brave'], ['Telegram'], ['Discord'], ['Steam'], ['Figma'], ['FigJam'], ['Notion'],
    ['Visual Studio Code'], ['Docker Desktop'], ['GitKraken'], ['PowerToys'], ['WinRAR'], ['OBS Studio'], ['Spotify'], ['Blender'], ['Audacity'], ['VLC'], ['Ollama'], ['Яндекс Музыка']
  ].map(([name, folder, store_]) => ({ name, path: store_ ? 'shell:AppsFolder\\' + name : SM + (folder ? folder + '\\' : '') + name + '.lnk', mtime: store_ ? null : now - Math.round(Math.random() * 200) * day, folder: folder || null, store: !!store_ }));
  APPS.push({ name: 'I-TD Shell', path: join(HOME, 'Desktop\\I-TD Shell.lnk'), mtime: now - day, folder: 'Рабочий стол' });
  const nameOf = (t) => { const s = String(t || ''); const a = APPS.find((x) => x.path === s); if (a) return a.name; if (/^https?:/i.test(s)) return s.replace(/^https?:\/\//, '').replace(/\/$/, ''); return s.split(/[\\/]/).pop() || s; };

  let load = 0.31;
  const listeners = {};
  const on = (ch) => (cb) => { (listeners[ch] ||= []).push(cb); return () => { listeners[ch] = listeners[ch].filter((f) => f !== cb); }; };
  const emit = (ch, payload) => (listeners[ch] || []).forEach((f) => { try { f(payload); } catch (e) { console.error(e); } });

  const SYS = { lock: 'Заблокировать', sleep: 'Сон', restart: 'Перезагрузка', shutdown: 'Выключение', signout: 'Выход из системы', settings: 'Параметры Windows', sound: 'Параметры звука', network: 'Параметры сети', taskmgr: 'Диспетчер задач', explorer: 'Проводник Windows', control: 'Панель управления' };
  const ok = (title, sub) => { host('toast', { title, sub }); return { ok: true }; };

  window.itd = {
    stateLoad: async () => clone(state),
    stateSet: async (patch) => {
      merge(state, patch && typeof patch === 'object' ? patch : {});
      persist();
      if (patch && ('accent' in patch || 'accentCustom' in patch)) host('accent', { accent: state.accent, accentCustom: state.accentCustom });
      return clone(state);
    },
    stateFlush: async () => true,
    stateReset: async () => { state = {}; persist(); host('accent', { accent: 'violet' }); return {}; },
    statePath: async () => 'localStorage → ' + KEY,

    list: async (target) => {
      const path = norm(target || HOME);
      const node = find(path);
      if (!node || !node.dir) return { ok: false, error: 'Нет такой папки', path };
      return { ok: true, path, parent: parentOf(path), truncated: false,
        entries: (node.kids || []).map((k) => ({ name: k.name, path: join(path, k.name), dir: !!k.dir, size: k.dir ? null : k.size, mtime: k.mtime })) };
    },
    places: async () => [
      { group: 'Места', items: [{ name: 'Домашняя папка', path: HOME }, { name: 'Рабочий стол', path: join(HOME, 'Desktop') }, { name: 'Документы', path: join(HOME, 'Documents') }, { name: 'Загрузки', path: join(HOME, 'Downloads') }, { name: 'Изображения', path: join(HOME, 'Pictures') }, { name: 'Проекты', path: join(HOME, 'Projects') }] },
      { group: 'Диски', items: [{ name: 'Локальный диск (C:)', path: 'C:\\' }, { name: 'Данные (D:)', path: 'D:\\' }] }
    ],
    preview: async (target) => {
      const node = find(target);
      if (!node) return { kind: 'none' };
      if (node.dir) return { kind: 'dir', mtime: node.mtime };
      const ext = extOf(node.name);
      if (node.text != null) return { kind: 'text', text: node.text, size: node.size, mtime: node.mtime, ext, cut: false };
      if (node.image) return { kind: 'image', url: node.image, size: node.size, mtime: node.mtime, ext };
      return { kind: 'file', size: node.size, mtime: node.mtime, ext };
    },
    exists: async (target) => !!find(target),
    disks: async () => [
      { root: 'C:\\', letter: 'C:', total: 1e12, free: 3.71e11, used: 6.29e11 },
      { root: 'D:\\', letter: 'D:', total: 2e12, free: 1.24e12, used: 7.6e11 }
    ],
    metrics: async () => {
      load = Math.min(0.92, Math.max(0.06, load + (Math.random() - 0.5) * 0.12));
      const total = 32e9, used = 14.2e9 + Math.random() * 1.1e9;
      return { load, cores: 16, cpu: 'Preview CPU · 16 потоков', mem: { total, free: total - used, used }, uptime: Math.round((performance.now() / 1000) + 5 * 3600) };
    },

    open: async (target) => ok('Открыть: ' + nameOf(target), 'В превью программы и файлы не запускаются.'),
    reveal: async (target) => !!ok('Показать в Проводнике', nameOf(target)),
    apps: async () => clone(APPS),
    link: async (target) => ({ kind: 'lnk', path: target, target: 'C:\\Program Files\\' + nameOf(target).replace(/\.lnk$/i, '') + '\\app.exe', args: '', cwd: 'C:\\Program Files\\' + nameOf(target).replace(/\.lnk$/i, ''), description: 'Ярлык из превью' }),
    revealTarget: async (target) => !!ok('Расположение файла', nameOf(target)),
    runAs: async (target) => ok('От имени администратора: ' + nameOf(target), 'Здесь Windows показала бы окно UAC.'),
    icons: async (items) => { const o = {}; for (const it of items || []) o[it.key] = null; return o; },
    system: async (id) => {
      if (id === 'lock') { host('lock'); return true; }
      host('toast', { title: SYS[id] || 'Системная команда', sub: id === 'shutdown' || id === 'restart' || id === 'sleep' || id === 'signout' ? 'В превью компьютер остаётся включённым.' : 'В Windows здесь открылось бы системное окно.' });
      return true;
    },
    copy: async (text) => { try { await navigator.clipboard.writeText(String(text ?? '')); } catch { /* not allowed */ } return true; },
    info: async () => ({ version: (document.documentElement.dataset.version || '1.1.0'), electron: 'web preview', user: 'guest', computer: 'ITD-PREVIEW', home: HOME, hotkey: 'Alt+Space', startHotkey: 'Control+Alt+Space', winKey: 'off', autostarted: false, statePath: 'localStorage → ' + KEY }),
    autostart: async (v) => { if (typeof v === 'boolean') host('toast', { title: v ? 'Автозапуск включён' : 'Автозапуск выключен', sub: 'В превью — только переключатель.' }); return typeof v === 'boolean' ? v : !!(state.behavior && state.behavior.autostart); },
    winKey: async (v) => { if (typeof v === 'boolean' && v) host('toast', { title: 'Клавиша Win', sub: 'В браузере её не перехватить. В превью «Пуск» — Ctrl+Alt+Space или кнопка I/TD.' }); return 'off'; },
    terminal: async (kind, cwd, admin) => ok((admin ? 'Терминал (админ)' : 'Терминал') + (kind ? ' · ' + kind : ''), cwd || HOME),
    folders: async (v) => (typeof v === 'boolean' ? v : !!(state.behavior && state.behavior.folders)),
    taskbar: async (v) => { if (typeof v === 'boolean') host('taskbar', { on: v }); return typeof v === 'boolean' ? v : true; },
    lockNow: () => host('lock'),
    lockInfo: async () => { const p = store.get(PIN); return { has: !!p, len: p ? p.length : 4 }; },
    lockSet: async (oldPin, newPin) => {
      const cur = store.get(PIN) || '';
      if (cur && String(oldPin) !== cur) return { ok: false, err: 'old' };
      if (newPin === '' || newPin == null) { store.set(PIN, null); return { ok: true, has: false }; }
      if (!/^\d{4,8}$/.test(String(newPin))) return { ok: false, err: 'format' };
      store.set(PIN, String(newPin));
      return { ok: true, has: true };
    },
    explorerAt: async (target) => !!ok('Проводник Windows', norm(target || HOME)),
    pickImage: () => new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*';
      input.addEventListener('change', () => {
        const file = input.files && input.files[0];
        if (!file) return resolve(null);
        const r = new FileReader();
        r.onload = () => resolve({ path: file.name, url: String(r.result) });
        r.onerror = () => resolve(null);
        r.readAsDataURL(file);
      });
      input.click();
    }),

    applyWindow: async () => true,
    minimize: () => host('minimize'),
    quit: () => host('toast', { title: 'Выход отключён', sub: 'Это превью; закройте вкладку, если нужно.' }),

    onPalette: on('palette:open'),
    onStart: on('start:open'),
    onStartToggle: on('start:toggle'),
    onOpenPath: on('explorer:open'),
    onHidden: on('shell:hidden')
  };

  /* events from the host page (taskbar buttons, global shortcuts) */
  addEventListener('message', (e) => {
    if (e.origin !== location.origin || !e.data || typeof e.data.itdEvent !== 'string') return;
    emit(e.data.itdEvent, e.data.payload);
  });
  /* the shell's global shortcuts, while focus is inside this frame */
  addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.altKey && e.ctrlKey) { e.preventDefault(); emit('start:toggle'); }
    else if (e.code === 'Space' && e.altKey) { e.preventDefault(); emit('palette:open'); }
  }, true);
})();
