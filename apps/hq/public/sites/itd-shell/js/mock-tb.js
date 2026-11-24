/* I/TD Shell — web preview: window.tb (taskbar bridge) without Electron.
   The host page plays main.js: it sends the window list, tray icons and accent, and gets the clicks. */
(() => {
  'use strict';
  const host = (type, data) => { try { parent.postMessage({ itdPreview: type, ...data }, location.origin); } catch { /* standalone */ } };
  const listeners = {};
  const on = (ch) => (cb) => { (listeners[ch] ||= []).push(cb); return () => { listeners[ch] = listeners[ch].filter((f) => f !== cb); }; };
  addEventListener('message', (e) => {
    if (e.origin !== location.origin || !e.data || typeof e.data.itdEvent !== 'string') return;
    (listeners[e.data.itdEvent] || []).forEach((f) => { try { f(e.data.payload); } catch (err) { console.error(err); } });
  });
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('itd-shell-preview:state') || '{}') || {}; } catch { saved = {}; }
  window.tb = {
    state: async () => ({ accent: saved.accent || 'violet', accentCustom: saved.accentCustom }),
    act: (h) => host('tb:act', { h: String(h) }),
    close: (h) => host('tb:close', { h: String(h) }),
    menu: (h) => host('tb:menu', { h: String(h) }),
    start: () => host('tb:start'),
    search: () => host('tb:search'),
    desktop: () => host('tb:desktop'),
    system: (id) => host('tb:system', { id: String(id) }),
    trayClick: (id, btn) => host('tb:trayClick', { id: String(id), btn: String(btn) }),
    onList: on('tb:list'),
    onTray: on('tb:tray'),
    onAccent: on('tb:accent')
  };
  host('tb:ready');
})();
