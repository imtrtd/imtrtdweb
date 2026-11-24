/* I/TD Shell web preview — the host page plays main.js: it routes the shell, the taskbar and the
   lock screen frames, keeps a made-up window list and tray, and turns Windows-only actions into toasts. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const W = 1440, H = 900;
  const frame = $('frame'), screen = $('screen'), shell = $('shell'), tb = $('tb'), lock = $('lock');
  const toasts = $('toasts'), menu = $('trayMenu');
  const ORIGIN = location.origin;
  const STATE = 'itd-shell-preview:state';

  /* ?bare: only the screen, fitted to the window (an embed on /apps/shell, screenshots) */
  const bare = new URLSearchParams(location.search).has('bare');
  if (bare) document.documentElement.classList.add('bare');

  /* ---------------------------------------------------------------- scale the 1440×900 screen */
  let scaleK = 1;
  function fit() {
    const full = bare || document.fullscreenElement === frame;
    const k = full ? Math.min(innerWidth / W, innerHeight / H) : frame.clientWidth / W;
    scaleK = k || 1;
    screen.style.transform = 'scale(' + k + ')';
    if (full) {
      frame.style.height = '';
      screen.style.left = Math.round((innerWidth - W * k) / 2) + 'px';
      screen.style.top = Math.round((innerHeight - H * k) / 2) + 'px';
    } else {
      frame.style.height = Math.round(H * k) + 'px';
      screen.style.left = '0'; screen.style.top = '0';
    }
  }
  new ResizeObserver(fit).observe(frame);
  addEventListener('resize', fit);
  document.addEventListener('fullscreenchange', fit);
  fit();

  /* ---------------------------------------------------------------- messaging */
  const send = (target, ch, payload) => { try { target.contentWindow.postMessage({ itdEvent: ch, payload }, ORIGIN); } catch { /* frame not ready */ } };

  function toast(title, sub) {
    const t = document.createElement('div');
    t.className = 'toast';
    const b = document.createElement('b'); b.textContent = title; t.append(b);
    if (sub) { const s = document.createElement('small'); s.textContent = sub; t.append(s); }
    toasts.append(t);
    while (toasts.children.length > 3) toasts.firstChild.remove();
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 220); }, 3400);
  }

  /* ---------------------------------------------------------------- accent */
  let accent = { accent: 'violet' };
  try { const s = JSON.parse(localStorage.getItem(STATE) || '{}'); if (s && s.accent) accent = { accent: s.accent, accentCustom: s.accentCustom }; } catch { /* default */ }

  /* ---------------------------------------------------------------- windows on the taskbar */
  /* '1' is the shell itself (the full-screen iframe); the rest are made-up app windows drawn by
     apps.js on top of it. They start minimised, like programs already running in the background. */
  const windows = [
    { h: '1', title: 'I/TD Shell', name: 'I/TD' },
    { h: '2', title: 'Проводник — Projects', name: 'Проводник' },
    { h: '3', title: 'Telegram', name: 'Telegram' },
    { h: '4', title: 'Figma — imtrtd · Design System', name: 'Figma' }
  ];
  let fg = '1', nextH = 10;
  const mins = new Set(['2', '3', '4']);
  const order = [];            /* app windows, bottom to top */
  const SCREEN_H = 852;        /* the area above the taskbar */
  const win = (h) => windows.find((x) => x.h === h);
  const pushList = () => send(tb, 'tb:list', { fg, w: windows.map(({ h, title, name }) => ({ h, title, name, min: mins.has(h) })) });
  const topVisible = () => { for (let i = order.length - 1; i >= 0; i--) if (!mins.has(order[i])) return order[i]; return null; };

  /* the focused shell is a full-screen window: it covers the app windows until one is brought back */
  function restack() {
    order.forEach((h, i) => { const w = win(h); if (w && w.el) w.el.style.zIndex = String(10 + i); });
    shell.style.zIndex = fg === '1' ? '150' : '1';
    for (const w of windows) if (w.el) w.el.classList.toggle('fg', w.h === fg);
  }

  let shellAway = false;
  function shellShow(on, focus = true) {
    shellAway = !on;
    shell.classList.toggle('away', shellAway);
    send(shell, 'shell:hidden', shellAway);
    if (on) { mins.delete('1'); fg = '1'; if (focus) try { shell.contentWindow.focus(); } catch { /* ignore */ } }
    else { mins.add('1'); if (fg === '1') fg = topVisible(); }
    restack(); pushList();
  }

  const appCtx = { toast: (t, s) => toast(t, s) };
  const place = (w) => { Object.assign(w.el.style, { left: w.x + 'px', top: w.y + 'px', width: w.w + 'px', height: w.hgt + 'px' }); };
  function build(w) {
    const [ww, hh] = window.ITD_APPS ? window.ITD_APPS.size(w.name) : [520, 400];
    const n = order.length;
    w.w = ww; w.hgt = hh;
    w.x = Math.max(0, Math.min(120 + (n % 5) * 44, W - ww));
    w.y = Math.max(0, Math.min(40 + (n % 5) * 36, SCREEN_H - hh));
    const btn = (cls, label, run, text) => { const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.setAttribute('aria-label', label); b.title = label; b.textContent = text; b.addEventListener('click', (e) => { e.stopPropagation(); run(); }); return b; };
    const el = document.createElement('div');
    el.className = 'appwin'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', w.title);
    const bar = document.createElement('div'); bar.className = 'aw-title';
    const ic = document.createElement('i'); ic.textContent = w.name.slice(0, 2).toUpperCase();
    const tt = document.createElement('b'); tt.textContent = w.title;
    bar.append(ic, tt, btn('mn', 'Свернуть', () => minWin(w.h), '–'), btn('mx', 'Развернуть', () => { el.classList.toggle('max'); }, '□'), btn('x', 'Закрыть', () => closeWin(w.h), '×'));
    const body = document.createElement('div'); body.className = 'aw-body';
    try { body.append(window.ITD_APPS ? window.ITD_APPS.make(w.name, appCtx, w.tip) : document.createTextNode(w.title)); } catch (err) { console.error(err); body.textContent = w.title; }
    const grip = document.createElement('i'); grip.className = 'aw-grip'; grip.setAttribute('aria-hidden', 'true');
    el.append(bar, body, grip);
    el.addEventListener('pointerdown', () => { if (fg !== w.h) focusWin(w.h); }, true);
    bar.addEventListener('dblclick', (e) => { if (!e.target.closest('button')) el.classList.toggle('max'); });
    /* drag by the title bar, resize by the corner grip; pointer moves are in page pixels, the screen is scaled */
    const track = (start, apply) => (e) => {
      if (e.button !== 0 || e.target.closest('button') || el.classList.contains('max')) return;
      e.preventDefault();
      const sx = e.clientX, sy = e.clientY, o = start();
      const move = (ev) => { apply(o, (ev.clientX - sx) / scaleK, (ev.clientY - sy) / scaleK); place(w); };
      const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); };
      addEventListener('pointermove', move); addEventListener('pointerup', up);
    };
    bar.addEventListener('pointerdown', track(() => ({ x: w.x, y: w.y }), (o, dx, dy) => { w.x = Math.round(Math.min(W - 80, Math.max(80 - w.w, o.x + dx))); w.y = Math.round(Math.min(SCREEN_H - 36, Math.max(0, o.y + dy))); }));
    grip.addEventListener('pointerdown', track(() => ({ w: w.w, h: w.hgt }), (o, dx, dy) => { w.w = Math.round(Math.max(360, o.w + dx)); w.hgt = Math.round(Math.max(240, o.h + dy)); }));
    w.el = el;
    screen.append(el);
    place(w);
  }
  function focusWin(h) {
    if (h === '1') { shellShow(true); return; }
    const w = win(h);
    if (!w) return;
    if (!w.el) build(w);
    mins.delete(h); w.el.hidden = false;
    const i = order.indexOf(h); if (i >= 0) order.splice(i, 1);
    order.push(h); fg = h;
    restack(); pushList();
  }
  function minWin(h) {
    if (h === '1') { shellShow(false); return; }
    const w = win(h);
    mins.add(h); if (w && w.el) w.el.hidden = true;
    if (fg === h) fg = topVisible() || (shellAway ? null : '1');
    restack(); pushList();
  }
  function closeWin(h) {
    if (h === '1') { toast('Оболочку не закрыть', 'Это превью; закройте вкладку, если нужно.'); return; }
    const i = windows.findIndex((x) => x.h === h);
    if (i < 1) return;
    const [w] = windows.splice(i, 1);
    if (w.el) w.el.remove();
    const j = order.indexOf(h); if (j >= 0) order.splice(j, 1);
    mins.delete(h);
    if (fg === h) fg = topVisible() || (shellAway ? null : '1');
    restack(); pushList();
  }
  /* focus moving into the shell frame (a click on it) makes the shell the foreground window again */
  addEventListener('blur', () => setTimeout(() => { if (document.activeElement === shell && fg !== '1') { fg = '1'; restack(); pushList(); } }, 0));
  let deskSaved = null;
  function showDesktop() {
    const visible = order.filter((h) => !mins.has(h));
    if (!shellAway || visible.length) {
      deskSaved = { shell: !shellAway, wins: visible };
      visible.forEach(minWin);
      if (!shellAway) shellShow(false);
    } else if (deskSaved) {
      if (deskSaved.shell) shellShow(true, !deskSaved.wins.length);
      deskSaved.wins.forEach(focusWin);
      deskSaved = null;
    } else shellShow(true);
  }

  function focusShell(then) {
    if (shellAway) shellShow(true);
    try { shell.contentWindow.focus(); } catch { /* ignore */ }
    setTimeout(then, 30);
  }

  /* ---------------------------------------------------------------- tray */
  const POOL = [
    ['tg', 'Telegram', '#2aabee'], ['ds', 'Discord', '#5865f2'], ['st', 'Steam', '#1b2838'], ['od', 'OneDrive — синхронизировано', '#0a74da'],
    ['ts', 'Tailscale — подключено', '#5b5b5b'], ['bt', 'Bluetooth', '#1e88e5'], ['df', 'Безопасность Windows', '#2e7d32'], ['nv', 'NVIDIA', '#76b900'],
    ['db', 'Dropbox — актуально', '#0061ff'], ['sp', 'Spotify', '#1db954'], ['ol', 'Ollama', '#f2f2f2'], ['dk', 'Docker Desktop — работает', '#1d63ed'],
    ['ic', 'iCloud', '#3693f3'], ['pt', 'PowerToys', '#6b4fbb'], ['ob', 'OBS Studio', '#302e31'], ['nx', 'Nextcloud', '#0082c9']
  ];
  const icon = (mono, bg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect x="2" y="2" width="28" height="28" rx="8" fill="${bg}"/><text x="16" y="21" font-family="Arial,sans-serif" font-weight="700" font-size="13" text-anchor="middle" fill="${bg === '#f2f2f2' ? '#111' : '#fff'}">${mono.toUpperCase()}</text></svg>`);
  let tray = POOL.slice(0, 11).map(([id, tip, bg]) => ({ id, tip, icon: icon(id, bg) }));
  const pushTray = () => send(tb, 'tb:tray', tray);
  const shortName = (tip) => tip.split(' — ')[0];

  function trayMenu(t) {
    menu.replaceChildren();
    const p = document.createElement('p'); p.textContent = shortName(t.tip); menu.append(p);
    const item = (label, run) => { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'menuitem'); b.textContent = label; b.addEventListener('click', () => { menu.hidden = true; run(); }); menu.append(b); };
    item('Открыть ' + shortName(t.tip), () => openWindowFor(t));
    item('Скрыть значок', () => { tray = tray.filter((x) => x.id !== t.id); pushTray(); toast('Значок убран', shortName(t.tip) + ' исчез с панели, как при выходе программы.'); });
    item('Выход', () => { tray = tray.filter((x) => x.id !== t.id); pushTray(); closeWindowsOf(t); toast(shortName(t.tip) + ' закрыт', 'Программа завершилась, её значок ушёл из трея.'); });
    menu.hidden = false;
    menu.querySelector('button').focus();
  }
  function openWindowFor(t) {
    const name = shortName(t.tip);
    let w = windows.find((x) => x.name === name);
    if (!w) { w = { h: String(nextH++), title: name, name, tip: t.tip }; windows.push(w); }
    focusWin(w.h);
  }
  function closeWindowsOf(t) {
    const name = shortName(t.tip);
    windows.filter((x) => x.h !== '1' && x.name === name).forEach((x) => closeWin(x.h));
  }
  addEventListener('pointerdown', (e) => { if (!menu.hidden && !menu.contains(e.target)) menu.hidden = true; });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') menu.hidden = true; });

  /* ---------------------------------------------------------------- lock screen */
  function lockShow() {
    const q = new URLSearchParams({ a: accent.accent || 'violet' });
    if (accent.accent === 'custom' && accent.accentCustom) q.set('c', accent.accentCustom);
    lock.src = 'lock.html?' + q;
    lock.hidden = false;
    lock.addEventListener('load', () => { try { lock.contentWindow.focus(); } catch { /* ignore */ } }, { once: true });
  }
  function lockHide() { lock.hidden = true; lock.removeAttribute('src'); try { shell.contentWindow.focus(); } catch { /* ignore */ } }

  /* ---------------------------------------------------------------- actions */
  const SYS = { sound: ['Параметры звука', 'В Windows открылось бы окно звука.'], network: ['Параметры сети', 'В Windows открылось бы окно сети.'], settings: ['Дата и время', 'В Windows открылись бы «Параметры».'] };
  const actions = {
    /* like show() in main.js: the shell window gets focus first, then the event */
    start() { focusShell(() => send(shell, 'start:toggle')); },
    search() { focusShell(() => send(shell, 'palette:open')); },
    lock: lockShow,
    'tray-add'() {
      const next = POOL.find(([id]) => !tray.some((t) => t.id === id));
      if (!next) { toast('Больше нечего добавить', 'Все 16 значков уже на панели.'); return; }
      tray.push({ id: next[0], tip: next[1], icon: icon(next[0], next[2]) }); pushTray();
      toast('Новый значок: ' + shortName(next[1]), tray.length > 8 ? 'Старые значки свёрнуты за стрелку у часов.' : 'Он встал рядом с часами.');
    },
    'tray-del'() { const t = tray.pop(); pushTray(); if (t) toast('Значок убран', shortName(t.tip)); },
    full() { if (document.fullscreenElement) document.exitFullscreen(); else if (frame.requestFullscreen) frame.requestFullscreen().catch(() => toast('Полный экран недоступен', 'Браузер не разрешил.')); },
    reset() {
      if (!confirm('Reset the preview? Accent, wallpaper, PIN and other settings made here are cleared.')) return;
      for (const k of Object.keys(localStorage)) if (k.startsWith('itd-shell-preview:')) localStorage.removeItem(k);
      location.reload();
    }
  };
  for (const b of document.querySelectorAll('[data-do]')) b.addEventListener('click', () => actions[b.dataset.do] && actions[b.dataset.do]());

  addEventListener('message', (e) => {
    if (e.origin !== ORIGIN || !e.data || typeof e.data.itdPreview !== 'string') return;
    const m = e.data;
    switch (m.itdPreview) {
      case 'toast': toast(String(m.title || ''), m.sub ? String(m.sub) : ''); break;
      case 'accent': accent = { accent: m.accent || 'violet', accentCustom: m.accentCustom }; send(tb, 'tb:accent', accent); break;
      case 'minimize': shellShow(false); break;
      case 'lock': lockShow(); break;
      case 'lock:done': lockHide(); break;
      case 'taskbar':
        tb.hidden = !m.on; shell.classList.toggle('full', !m.on);
        toast(m.on ? 'Панель I/TD включена' : 'Панель I/TD выключена', m.on ? 'Панель Explorer спрятана.' : 'В Windows вернулась бы панель Explorer.');
        break;
      case 'tb:ready': pushList(); pushTray(); send(tb, 'tb:accent', accent); break;
      case 'tb:act': {
        const h = m.h;
        if (h === '1') { if (shellAway || fg !== '1') shellShow(true); else shellShow(false); break; }
        if (fg === h && !mins.has(h)) minWin(h); else focusWin(h);
        break;
      }
      case 'tb:close': closeWin(m.h); break;
      case 'tb:menu': { const w = windows.find((x) => x.h === m.h); toast('Меню окна' + (w ? ': ' + w.title : ''), 'Здесь было бы системное меню окна.'); break; }
      case 'tb:start': actions.start(); break;
      case 'tb:search': actions.search(); break;
      case 'tb:desktop': showDesktop(); break;
      case 'tb:system': { const s = SYS[m.id]; toast(s ? s[0] : 'Система', s ? s[1] : ''); break; }
      case 'tb:trayClick': {
        const t = tray.find((x) => x.id === m.id);
        if (!t) break;
        if (m.btn === 'r') trayMenu(t);
        else if (m.btn === 'd') openWindowFor(t);
        else toast('Клик дошёл: ' + shortName(t.tip), 'Левый клик. Правый — меню программы, двойной — её окно.');
        break;
      }
    }
  });

  /* the taskbar may have said "ready" before this script listened: push again once it has loaded */
  const tbInit = () => { pushList(); pushTray(); send(tb, 'tb:accent', accent); };
  tb.addEventListener('load', tbInit);
  restack();
  /* ?open=figma (or explorer, telegram): that window is in front from the start, e.g. a direct link to the design system */
  {
    const want = (new URLSearchParams(location.search).get('open') || '').toLowerCase();
    const alias = { figma: 'Figma', explorer: 'Проводник', telegram: 'Telegram' };
    const w = want && windows.find((x) => x.h !== '1' && x.name === alias[want]);
    if (w) setTimeout(() => focusWin(w.h), 300);
  }
  try { if (tb.contentDocument && tb.contentDocument.readyState === 'complete') tbInit(); } catch { /* not yet */ }

  /* global shortcuts while focus is on the host page */
  addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.altKey && e.ctrlKey) { e.preventDefault(); actions.start(); }
    else if (e.code === 'Space' && e.altKey) { e.preventDefault(); actions.search(); }
  });
})();

