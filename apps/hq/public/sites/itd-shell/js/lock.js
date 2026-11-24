'use strict';

(function () {
  const $ = (id) => document.getElementById(id);
  const q = new URLSearchParams(location.search);
  const cover = q.get('m') === 'cover';
  const accent = q.get('a') || 'violet';
  document.body.dataset.accent = accent;
  if (accent === 'custom' && /^#[0-9a-f]{6}$/i.test(q.get('c') || '')) {
    const hex = q.get('c');
    const n = parseInt(hex.slice(1), 16);
    document.documentElement.style.setProperty('--signal', hex);
    document.documentElement.style.setProperty('--sig-rgb', ((n >> 16) & 255) + ' ' + ((n >> 8) & 255) + ' ' + (n & 255));
  }
  if (cover) { document.body.classList.add('cover'); return; }

  const pinEl = $('lkPin'), hint = $('lkHint'), stateEl = $('lkState');
  let has = false, len = 4, v = '', busy = false, waitUntil = 0, timer = null;

  function tick() {
    const d = new Date(), p = (n) => String(n).padStart(2, '0');
    $('lkClock').innerHTML = p(d.getHours()) + '<i>:</i>' + p(d.getMinutes());
    $('lkDate').textContent = d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
  }
  tick(); setInterval(tick, 1000);

  function buildDots() {
    pinEl.textContent = '';
    if (!has) return;
    for (let i = 0; i < len; i++) { const s = document.createElement('span'); s.className = 'dot'; pinEl.appendChild(s); }
  }
  function paint() { [...pinEl.children].forEach((d, i) => d.classList.toggle('on', i < v.length)); }
  function say(t) { hint.textContent = t; }

  function countdown() {
    clearInterval(timer);
    timer = setInterval(() => {
      const left = Math.ceil((waitUntil - Date.now()) / 1000);
      if (left <= 0) { clearInterval(timer); say('введите PIN'); stateEl.textContent = 'LOCKED'; return; }
      say('подождите ' + left + ' с'); stateEl.textContent = 'WAIT ' + left;
    }, 250);
  }

  async function submit() {
    if (busy) return; busy = true;
    let r = { ok: false, wait: 0 };
    try { r = await window.lock.verify(v); } catch { /* keep */ }
    if (r.ok) {
      say(''); stateEl.textContent = 'OK';
      document.body.classList.add('out');
      setTimeout(() => window.lock.done(), 700);
      return;
    }
    pinEl.classList.add('shake'); say(r.wait ? 'подождите ' + r.wait + ' с' : 'неверно');
    if (r.wait) { waitUntil = Date.now() + r.wait * 1000; countdown(); }
    setTimeout(() => { pinEl.classList.remove('shake'); v = ''; paint(); busy = false; if (!r.wait) say('введите PIN'); }, 600);
  }

  addEventListener('keydown', (e) => {
    if (busy || Date.now() < waitUntil) return;
    if (!has) { if (e.key.length === 1 || e.key === 'Enter' || e.key === ' ') submit(); return; }
    if (/^\d$/.test(e.key) && v.length < 8) { v += e.key; paint(); if (v.length >= len) setTimeout(submit, 160); }
    else if (e.key === 'Backspace') { v = v.slice(0, -1); paint(); }
    else if (e.key === 'Escape') { v = ''; paint(); }
    else if (e.key === 'Enter' && v.length) submit();
  });
  addEventListener('mousedown', () => { if (!has && !busy) submit(); });

  window.lock.info().then((i) => {
    has = !!(i && i.has); len = (i && i.len) || 4; buildDots();
    say(has ? 'введите PIN' : 'нажмите любую клавишу');
  }).catch(() => { has = false; say('нажмите любую клавишу'); });
})();
