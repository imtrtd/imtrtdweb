/* I/TD Shell — web preview: window.lock without Electron. The preview PIN lives in this
   browser's localStorage in plain text: it guards nothing, it only shows how the screen behaves. */
(() => {
  'use strict';
  const PIN = 'itd-shell-preview:pin';
  const pin = () => { try { return localStorage.getItem(PIN) || ''; } catch { return ''; } };
  let fails = 0, until = 0;
  window.lock = {
    info: async () => ({ has: !!pin(), len: pin().length || 4 }),
    verify: async (v) => {
      const now = Date.now();
      if (now < until) return { ok: false, wait: Math.ceil((until - now) / 1000) };
      if (!pin() || String(v) === pin()) { fails = 0; return { ok: true, wait: 0 }; }
      fails += 1;
      if (fails >= 5) { const secs = Math.min(300, 30 * Math.pow(2, fails - 5)); until = now + secs * 1000; return { ok: false, wait: secs }; }
      return { ok: false, wait: 0 };
    },
    done: () => { try { parent.postMessage({ itdPreview: 'lock:done' }, location.origin); } catch { /* standalone */ } }
  };
})();
