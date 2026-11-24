/* I/TD Shell — taskbar: open windows of Windows, start/search buttons, small tray and clock. */
(() => {
  'use strict';
  const tb = window.tb;
  const $ = (id) => document.getElementById(id);
  const host = $('tbTasks');
  const nodes = new Map();

  function setAccent(s) {
    if (!s || !s.accent) return;
    const root = document.documentElement.style;
    if (s.accent === 'custom' && /^#[0-9a-f]{6}$/i.test(s.accentCustom || '')) {
      const n = parseInt(s.accentCustom.slice(1), 16);
      document.body.dataset.accent = 'custom';
      root.setProperty('--signal', s.accentCustom);
      root.setProperty('--sig-rgb', ((n >> 16) & 255) + ' ' + ((n >> 8) & 255) + ' ' + (n & 255));
    } else {
      root.removeProperty('--signal'); root.removeProperty('--sig-rgb');
      document.body.dataset.accent = s.accent === 'custom' ? 'violet' : s.accent;
    }
  }
  tb.state().then(setAccent).catch(() => {});
  tb.onAccent(setAccent);

  function make(w) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'task'; b.setAttribute('role', 'listitem');
    b.addEventListener('click', () => tb.act(b.dataset.h));
    b.addEventListener('auxclick', (e) => { if (e.button === 1) tb.close(b.dataset.h); });
    b.addEventListener('contextmenu', (e) => { e.preventDefault(); tb.menu(b.dataset.h); });
    const label = document.createElement('span');
    b.append(document.createElement('i'), label);
    return b;
  }
  function paint(b, w, fg) {
    b.dataset.h = w.h;
    b.title = w.title + (w.name ? ' — ' + w.name : '');
    b.classList.toggle('fg', w.h === fg && !w.min);
    b.classList.toggle('min', !!w.min);
    b.classList.toggle('fl', !!w.fl && w.h !== fg);
    const key = w.icon || ('ph:' + (w.name || w.title).slice(0, 2));
    if (b.dataset.icon !== key) {
      b.dataset.icon = key;
      let ic;
      if (w.icon) { ic = document.createElement('img'); ic.src = w.icon; ic.alt = ''; }
      else { ic = document.createElement('i'); ic.className = 'ph'; ic.textContent = (w.name || w.title).slice(0, 2); }
      b.firstChild.replaceWith(ic);
    }
    const label = b.lastChild;
    if (label.textContent !== w.title) label.textContent = w.title;
  }
  tb.onList((data) => {
    const list = (data && data.w) || [];
    const seen = new Set();
    list.forEach((w, i) => {
      seen.add(w.h);
      let b = nodes.get(w.h);
      if (!b) { b = make(w); nodes.set(w.h, b); }
      paint(b, w, data.fg);
      if (host.children[i] !== b) host.insertBefore(b, host.children[i] || null);
    });
    for (const [h, b] of nodes) if (!seen.has(h)) { b.remove(); nodes.delete(h); }
  });

  /* ---- notification area: icons hosted by the native helper ---- */
  const notify = $('tbNotify'), more = $('tbMore');
  const trayNodes = new Map();
  const TRAY_FOLD = 8;           // more than this: the rest folds behind the chevron
  let trayOpen = false, trayList = [];
  function trayPaint() {
    const fold = trayList.length > TRAY_FOLD;
    more.hidden = !fold;
    more.classList.toggle('open', trayOpen);
    more.setAttribute('aria-expanded', String(trayOpen));
    const seen = new Set();
    trayList.forEach((t, i) => {
      seen.add(t.id);
      let b = trayNodes.get(t.id);
      if (!b) {
        b = document.createElement('button');
        b.type = 'button'; b.className = 'tray-ic'; b.setAttribute('role', 'listitem');
        b.append(document.createElement('img'));
        b.addEventListener('click', (e) => { if (e.detail < 2) tb.trayClick(b.dataset.id, 'l', e.screenX, e.screenY); });
        b.addEventListener('dblclick', (e) => tb.trayClick(b.dataset.id, 'd', e.screenX, e.screenY));
        b.addEventListener('contextmenu', (e) => { e.preventDefault(); tb.trayClick(b.dataset.id, 'r', e.screenX, e.screenY); });
        trayNodes.set(t.id, b);
      }
      b.dataset.id = t.id;
      b.title = t.tip || '';
      b.setAttribute('aria-label', t.tip || 'Значок');
      const img = b.firstChild;
      if (t.icon && img.getAttribute('src') !== t.icon) img.src = t.icon;
      img.alt = '';
      b.classList.toggle('noimg', !t.icon);
      /* newest icons stay visible next to the clock; older ones fold away first */
      b.hidden = fold && !trayOpen && i < trayList.length - TRAY_FOLD;
      if (notify.children[i] !== b) notify.insertBefore(b, notify.children[i] || null);
    });
    for (const [id, b] of trayNodes) if (!seen.has(id)) { b.remove(); trayNodes.delete(id); }
  }
  if (tb.onTray) tb.onTray((list) => { trayList = Array.isArray(list) ? list : []; trayPaint(); });
  more.addEventListener('click', () => { trayOpen = !trayOpen; trayPaint(); });

  $('tbStart').addEventListener('click', () => tb.start());
  $('tbSearch').addEventListener('click', () => tb.search());
  $('tbDesk').addEventListener('click', () => tb.desktop());
  $('tbSound').addEventListener('click', () => tb.system('sound'));
  $('tbNet').addEventListener('click', () => tb.system('network'));
  $('tbClock').addEventListener('click', () => tb.system('settings'));

  const pad = (n) => String(n).padStart(2, '0');
  const DAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  function tick() {
    const d = new Date();
    $('tbTime').textContent = pad(d.getHours()) + ':' + pad(d.getMinutes());
    $('tbDate').textContent = DAYS[d.getDay()] + ' ' + pad(d.getDate()) + '.' + pad(d.getMonth() + 1);
  }
  tick(); setInterval(tick, 5000);
})();
