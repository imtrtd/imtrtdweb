/* I/TD Shell web preview — what the made-up windows on the taskbar show.
   Figma opens the design system "imtrtd" (window.ITD_DS, ds-imtrtd.js) for review; the other apps
   get a minimal interface. Nothing here talks to a server or to the real apps. */
(() => {
  'use strict';
  const h = (tag, attrs, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'style') n.style.cssText = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : String(v));
    }
    for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) n.append(kid);
    return n;
  };

  /* ================================================================ Figma: the design system */
  function figma(ctx) {
    const ds = window.ITD_DS;
    if (!ds) return h('div', { class: 'app-empty', text: 'Дизайн-система не загружена.' });
    let theme = (ds.themes[0] && ds.themes[0].id) || 'violet';
    const byName = new Map(ds.colors.map((c) => [c.name, c]));
    const resolve = (v, depth = 0) => {
      if (v && typeof v === 'object') v = v[theme] != null ? v[theme] : Object.values(v)[0];
      const m = /^\{(.+)\}$/.exec(String(v));
      if (m && depth < 5 && byName.has(m[1])) return resolve(byName.get(m[1]).value, depth + 1);
      return String(v);
    };
    const themed = (v) => v && typeof v === 'object';
    const root = h('div', { class: 'fx' });
    const applyTheme = () => {
      root.style.setProperty('--ds-signal', resolve(byName.get('color-signal').value));
      for (const b of root.querySelectorAll('[data-theme-pick]')) b.setAttribute('aria-pressed', String(b.dataset.themePick === theme));
      for (const n of root.querySelectorAll('[data-tok]')) paintTok(n);
      if (selected) inspect(selected);
    };
    const paintTok = (n) => {
      const c = byName.get(n.dataset.tok);
      if (!c) return;
      const v = resolve(c.value);
      const sw = n.querySelector('.fx-sw'); if (sw) sw.style.background = v;
      const val = n.querySelector('.fx-val'); if (val) val.textContent = v;
    };

    /* contrast against ink, for the inspector */
    const rgb = (s) => {
      let m = /^#([0-9a-f]{3,8})$/i.exec(s);
      if (m) { let x = m[1]; if (x.length <= 4) x = x.split('').map((c) => c + c).join(''); return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16)); }
      m = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(s);
      return m ? [m[1], m[2], m[3]].map(Number) : null;
    };
    const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

    /* ---- inspector ---- */
    let selected = null;
    const insp = h('aside', { class: 'fx-right', 'aria-label': 'Инспектор' });
    function inspect(item) {
      selected = item;
      root.querySelectorAll('.fx-sel').forEach((n) => n.classList.remove('fx-sel'));
      if (item.node) item.node.classList.add('fx-sel');
      const rows = [];
      if (item.kind === 'color') {
        const c = byName.get(item.name);
        const v = resolve(c.value);
        const rc = rgb(v), ink = rgb('#0a0a0f');
        rows.push(h('div', { class: 'fx-insp-sw', style: 'background:' + v }));
        rows.push(h('dl', { class: 'fx-dl' },
          h('dt', { text: 'Значение' }), h('dd', { text: v }),
          themed(c.value) ? [h('dt', { text: 'По темам' }), h('dd', null, ds.themes.map((t) => h('span', { class: 'fx-th' }, h('i', { style: 'background:' + c.value[t.id] }), t.name.replace(/ \(.*\)/, '') + ' ' + c.value[t.id])))] : null,
          /^\{/.test(String(c.value)) ? [h('dt', { text: 'Ссылка' }), h('dd', { text: c.value })] : null,
          rc && ink ? [h('dt', { text: 'Контраст с ink' }), h('dd', { text: ratio(rc, ink).toFixed(1) + ':1' })] : null,
          h('dt', { text: 'Группа' }), h('dd', { text: c.group })));
        rows.push(h('p', { class: 'fx-usage', text: c.usage }));
        rows.push(h('button', { type: 'button', class: 'fx-btn', onclick: () => { try { navigator.clipboard.writeText(v); } catch { /* not allowed */ } ctx.toast('Скопировано', item.name + ': ' + v); } }, 'Копировать значение'));
      } else {
        rows.push(h('dl', { class: 'fx-dl' }, Object.entries(item.props).map(([k, v]) => [h('dt', { text: k }), h('dd', { text: String(v) })])));
        if (item.usage) rows.push(h('p', { class: 'fx-usage', text: item.usage }));
      }
      insp.replaceChildren(h('p', { class: 'fx-cap', text: item.kind === 'color' ? 'Цвет' : item.kindLabel || 'Токен' }), h('h3', { text: item.name }), ...rows.flat(Infinity).filter(Boolean));
    }
    const pick = (node, item) => { item.node = node; node.addEventListener('click', (e) => { e.stopPropagation(); inspect(item); }); return node; };

    /* ---- frames ---- */
    const frame = (id, title, ...body) => h('section', { class: 'fx-frame', id: 'fx-' + id, 'data-frame': id },
      h('p', { class: 'fx-frame-name', text: title }), h('div', { class: 'fx-board' }, body));

    const counts = { colors: ds.colors.length, styles: ds.typeGroups.reduce((a, g) => a + g.styles.length, 0), comps: ds.components.length };
    const overview = frame('overview', 'Обзор',
      h('div', { class: 'fx-ov' },
        h('img', { src: 'brand/logo-mark.svg', alt: 'Знак I/TD', width: 120, height: 122 }),
        h('div', null,
          h('p', { class: 'fx-k', text: 'Design system' }),
          h('h2', { class: 'fx-h', text: ds.name }),
          h('p', { class: 'fx-lead', text: 'Тёмная, квадратная, техничная, с одним громким акцентом. Только тёмная тема; углы не скругляются, а срезаются, как у знака I/TD; разделяют волосяные линии, а не тени.' }),
          h('div', { class: 'fx-stats' },
            [[counts.colors, 'цвета'], [counts.styles, 'стилей текста'], [ds.themes.length, 'темы акцента'], [counts.comps, 'компонентов']].map(([n, l]) => h('span', null, h('b', { text: String(n) }), l))),
          h('p', { class: 'fx-note', text: 'Токены синхронизированы ' + ds.synced + ' из imtrtdweb / apps/hq.' }))));

    const groups = ['Core', 'Practice', 'Retro', 'Retrowave'];
    const colors = frame('colors', 'Цвета',
      groups.map((g) => {
        const items = ds.colors.filter((c) => c.group === g);
        if (!items.length) return null;
        return [h('p', { class: 'fx-k', text: g + ' · ' + items.length }),
          h('div', { class: 'fx-swatches' }, items.map((c) => pick(h('button', { type: 'button', class: 'fx-tok', 'data-tok': c.name, title: c.usage },
            h('span', { class: 'fx-sw' }), h('span', { class: 'fx-name', text: c.name }), h('span', { class: 'fx-val' }), themed(c.value) ? h('span', { class: 'fx-tag', text: 'тема' }) : null),
          { kind: 'color', name: c.name })))];
      }));

    const famCss = (f) => ds.families[f] || 'inherit';
    const type = frame('type', 'Типографика',
      h('div', { class: 'fx-fams' }, Object.entries(ds.families).map(([k, v]) => h('div', null, h('p', { class: 'fx-k', text: k }), h('p', { class: 'fx-fam', style: 'font-family:' + v, text: v.split(',')[0].replace(/"/g, '') + ' — Aa Бб 0123' })))),
      ds.typeGroups.map((g) => [h('p', { class: 'fx-k', text: g.name }), g.styles.map((s) => {
        const px = /rem$/.test(s.fontSize) ? parseFloat(s.fontSize) * 16 : parseFloat(s.fontSize);
        const shown = Math.min(px, 72);
        const css = 'font-family:' + famCss(g.family) + ';font-size:' + shown + 'px;line-height:' + (typeof s.lineHeight === 'number' ? s.lineHeight : s.lineHeight) + ';font-weight:' + s.fontWeight + ';letter-spacing:' + (s.letterSpacing || 'normal') + (g.name === 'Mono' ? ';text-transform:uppercase' : '');
        return pick(h('div', { class: 'fx-type' },
          h('span', { class: 'fx-type-meta', text: s.name + ' · ' + s.fontSize + (shown < px ? ' (здесь ' + shown + 'px)' : '') }),
          h('span', { class: 'fx-type-sample', style: css, text: s.sample || s.name })),
        { kind: 'type', kindLabel: 'Стиль текста', name: s.name, props: { 'Семейство': g.family, 'Размер': s.fontSize, 'Интерлиньяж': s.lineHeight, 'Насыщенность': s.fontWeight, 'Трекинг': s.letterSpacing || '—' }, usage: s.usage });
      })]));

    const rem = (v) => (/rem$/.test(v) ? parseFloat(v) * 16 : parseFloat(v)) || 0;
    const space = frame('space', 'Отступы, радиусы, срезы',
      h('p', { class: 'fx-k', text: 'Отступы' }),
      h('div', { class: 'fx-bars' }, ds.spacing.map((s) => pick(h('div', { class: 'fx-bar' }, h('span', { class: 'fx-name', text: s.name }), h('i', { style: 'width:' + Math.min(rem(s.value), 112) * 3 + 'px' }), h('span', { class: 'fx-val', text: s.value })),
        { kind: 'space', kindLabel: 'Отступ', name: s.name, props: { 'Значение': s.value, 'px': rem(s.value) }, usage: s.usage }))),
      h('div', { class: 'fx-row' },
        h('div', null, h('p', { class: 'fx-k', text: 'Радиусы' }), h('div', { class: 'fx-shapes' }, ds.radius.map((r) => pick(h('div', { class: 'fx-shape' }, h('i', { style: 'border-radius:' + (r.value === '0' ? 0 : r.value) }), h('span', { class: 'fx-name', text: r.name })), { kind: 'radius', kindLabel: 'Радиус', name: r.name, props: { 'Значение': r.value }, usage: r.usage })))),
        h('div', null, h('p', { class: 'fx-k', text: 'Срезы углов' }), h('div', { class: 'fx-shapes' }, ds.cut.map((c) => {
          const v = rem(c.value) * 3;
          const clip = c.name === 'cut-lg' ? 'polygon(0 0, calc(100% - ' + v + 'px) 0, 100% ' + v + 'px, 100% 100%, 0 100%)' : 'polygon(0 0, calc(100% - ' + v + 'px) 0, 100% ' + v + 'px, 100% 100%, ' + v + 'px 100%, 0 calc(100% - ' + v + 'px))';
          return pick(h('div', { class: 'fx-shape' }, h('i', { style: 'clip-path:' + clip }), h('span', { class: 'fx-name', text: c.name + ' · ' + c.value + ' (×3)' })), { kind: 'cut', kindLabel: 'Срез', name: c.name, props: { 'Значение': c.value }, usage: c.usage });
        })))));

    const textShadow = (n) => /glitch|hard|neon/.test(n);
    const shadows = frame('shadow', 'Тени и свечения',
      h('div', { class: 'fx-shadows' }, ds.shadow.map((s) => {
        const tile = h('div', { class: 'fx-shadow' }, textShadow(s.name) ? h('b', { class: 'fx-shadow-text', text: 'I/TD' }) : h('i'), h('span', { class: 'fx-name', text: s.name }));
        const paint = () => { const v = resolve(s.value); if (textShadow(s.name)) tile.firstChild.style.textShadow = v; else tile.firstChild.style.boxShadow = v; };
        tile.dataset.paint = '1'; tile._paint = paint;
        return pick(tile, { kind: 'shadow', kindLabel: textShadow(s.name) ? 'Тень текста' : 'Тень', name: s.name, get props() { return { 'Значение': resolve(s.value) }; }, usage: s.usage });
      })));

    const comps = frame('components', 'Компоненты',
      h('div', { class: 'fx-comp' },
        h('p', { class: 'fx-k', text: 'Button' }),
        h('div', { class: 'fx-line' }, h('span', { class: 'ds-btn ds-btn-primary' }, 'Start a project →'), h('span', { class: 'ds-btn ds-btn-ghost' }, 'All work →')),
        h('p', { class: 'fx-k', text: 'Chip' }),
        h('div', { class: 'fx-line' }, ['Booking December', 'Astro', 'Identity'].map((t) => h('span', { class: 'ds-chip', text: t }))),
        h('p', { class: 'fx-k', text: 'SectionHead' }),
        h('div', { class: 'ds-sh' }, h('p', { class: 'ds-sh-k' }, h('i'), '02 · Selected work'), h('p', { class: 'ds-sh-t', text: 'Live builds, not mockups.' })),
        h('p', { class: 'fx-k', text: 'Card + Field' }),
        h('div', { class: 'fx-line fx-line-top' },
          h('div', { class: 'ds-card' }, h('p', { class: 'ds-chip-k', text: 'Notify me' }), h('p', { class: 'ds-card-t', text: 'One message, at launch.' }), h('span', { class: 'ds-field', text: 'Email or Telegram' })),
          h('div', { class: 'ds-accents' }, ds.themes.map((t) => h('i', { style: 'background:' + byName.get('color-signal').value[t.id] })))),
        h('p', { class: 'fx-note', text: 'Всего в системе ' + ds.components.length + ': ' + ds.components.join(', ') + '.' })));

    const frames = [overview, colors, type, space, shadows, comps];
    const canvas = h('main', { class: 'fx-canvas', onclick: () => { selected = null; root.querySelectorAll('.fx-sel').forEach((n) => n.classList.remove('fx-sel')); insp.replaceChildren(h('p', { class: 'fx-cap', text: 'Инспектор' }), h('p', { class: 'fx-usage', text: 'Выберите цвет, стиль текста, отступ или тень на холсте.' })); } }, frames);
    const pages = h('nav', { class: 'fx-pages' }, frames.map((f) => h('button', { type: 'button', class: 'fx-page', text: f.querySelector('.fx-frame-name').textContent, onclick: () => f.scrollIntoView({ block: 'start', behavior: 'smooth' }) })));
    root.append(
      h('div', { class: 'fx-top' },
        h('span', { class: 'fx-logo', 'aria-hidden': 'true' }, '◆'),
        h('span', { class: 'fx-file' }, h('span', { class: 'fx-dim', text: 'Дизайн-системы / ' }), ds.name),
        h('span', { class: 'fx-spacer' }),
        h('span', { class: 'fx-dim', text: 'Тема акцента' }),
        h('span', { class: 'fx-themes', role: 'radiogroup', 'aria-label': 'Тема акцента' }, ds.themes.map((t) => h('button', { type: 'button', role: 'radio', 'data-theme-pick': t.id, title: t.name, onclick: () => { theme = t.id; applyTheme(); repaintShadows(); } }, h('i', { style: 'background:' + byName.get('color-signal').value[t.id] }), t.name.replace(/ \(.*\)/, '')))),
        h('span', { class: 'fx-zoom', text: '100%' })),
      h('div', { class: 'fx-body' },
        h('aside', { class: 'fx-left' }, h('p', { class: 'fx-cap', text: 'Страницы' }), pages, h('p', { class: 'fx-cap', text: 'Слои' }), h('ul', { class: 'fx-layers' }, frames.map((f) => h('li', null, '▢ ' + f.querySelector('.fx-frame-name').textContent)))),
        canvas, insp));
    const repaintShadows = () => root.querySelectorAll('[data-paint]').forEach((n) => n._paint());
    canvas.click();
    applyTheme();
    repaintShadows();
    return root;
  }

  /* ================================================================ Explorer */
  const FILES = {
    'Рабочий стол': [['I-TD Shell.lnk', 'Ярлык', '1,6 КБ'], ['readme.txt', 'Текст', '412 Б']],
    'Загрузки': [['ITD-Shell-1.1.0-win-x64.zip', 'Архив ZIP', '98,4 МБ'], ['wallpaper-grid.svg', 'Изображение SVG', '2,2 КБ']],
    'Документы': [['что нового в 1.1.md', 'Markdown', '1,1 КБ'], ['заметки.md', 'Markdown', '640 Б'], ['смета.xlsx', 'Лист Excel', '37 КБ'], ['бриф.pdf', 'PDF', '403 КБ']],
    'Изображения': [['Screenshots', 'Папка', ''], ['neon-spiral.svg', 'Изображение SVG', '4 КБ'], ['grid.svg', 'Изображение SVG', '2,2 КБ']],
    'Projects': [['itd-shell', 'Папка', ''], ['imtrtdweb', 'Папка', ''], ['cuebox', 'Папка', ''], ['itd-neon-spiral', 'Папка', '']]
  };
  function explorer(ctx) {
    let at = 'Projects';
    const list = h('div', { class: 'ex-list', role: 'list' });
    const path = h('span', { class: 'ex-path' });
    const side = h('nav', { class: 'ex-side' }, h('p', { class: 'ex-cap', text: 'Быстрый доступ' }), Object.keys(FILES).map((k) => h('button', { type: 'button', 'data-dir': k, onclick: () => go(k), text: k })));
    function go(k) {
      at = k;
      path.textContent = 'Этот компьютер › C: › Пользователи › guest › ' + k;
      side.querySelectorAll('button').forEach((b) => b.setAttribute('aria-current', String(b.dataset.dir === k)));
      list.replaceChildren(h('div', { class: 'ex-row ex-head' }, h('span', { text: 'Имя' }), h('span', { text: 'Тип' }), h('span', { text: 'Размер' })),
        ...FILES[k].map(([n, t, s]) => h('button', { type: 'button', class: 'ex-row', role: 'listitem', ondblclick: () => ctx.toast('Открыть: ' + n, 'В превью файлы не открываются.') },
          h('span', null, h('i', { class: t === 'Папка' ? 'ex-ic ex-dir' : 'ex-ic' }), n), h('span', { text: t }), h('span', { text: s }))));
    }
    const root = h('div', { class: 'ex' }, h('div', { class: 'ex-bar' }, h('button', { type: 'button', class: 'ex-nav', 'aria-label': 'Назад', text: '←' }), h('button', { type: 'button', class: 'ex-nav', 'aria-label': 'Вверх', text: '↑' }), path, h('span', { class: 'ex-search', text: 'Поиск' })), h('div', { class: 'ex-body' }, side, list), h('div', { class: 'ex-status', text: 'Имитация Проводника · двойной клик по файлу' }));
    go(at);
    return root;
  }

  /* ================================================================ Messenger */
  function messenger(ctx) {
    const chats = [
      { id: 'saved', name: 'Избранное', last: 'ссылка на превью оболочки', msgs: [['me', 'Превью оболочки: /sites/itd-shell'], ['me', 'Проверить трей и экран блокировки на телефоне']] },
      { id: 'notes', name: 'Заметки по 1.1', last: 'свои цвета акцента — готово', msgs: [['me', 'Свои цвета акцента — готово'], ['me', 'Логотип из design system — готово'], ['me', 'Автовход без PIN — позже']] },
      { id: 'bot', name: 'I/TD бот', last: 'Сборка 1.1.0 готова', msgs: [['them', 'Сборка 1.1.0 готова. 129 проверок прошло.'], ['them', 'Превью обновлено.']] }
    ];
    let cur = chats[0];
    const feed = h('div', { class: 'tg-feed' });
    const title = h('p', { class: 'tg-title' });
    const input = h('input', { class: 'tg-input', placeholder: 'Сообщение (остаётся только в этом окне)', 'aria-label': 'Сообщение' });
    const listEl = h('nav', { class: 'tg-list' });
    function paint() {
      title.textContent = cur.name;
      listEl.replaceChildren(...chats.map((c) => h('button', { type: 'button', class: 'tg-chat', 'aria-current': String(c === cur), onclick: () => { cur = c; paint(); } },
        h('i', { class: 'tg-av', text: c.name.slice(0, 1) }), h('span', null, h('b', { text: c.name }), h('small', { text: c.last })))));
      feed.replaceChildren(...cur.msgs.map(([who, t]) => h('p', { class: 'tg-msg tg-' + who, text: t })));
      feed.scrollTop = feed.scrollHeight;
    }
    const send = () => { const v = input.value.trim(); if (!v) return; cur.msgs.push(['me', v]); cur.last = v; input.value = ''; paint(); };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
    paint();
    return h('div', { class: 'tg' }, listEl, h('div', { class: 'tg-main' }, h('div', { class: 'tg-head' }, title, h('small', { text: 'имитация мессенджера' })), feed, h('div', { class: 'tg-compose' }, input, h('button', { type: 'button', class: 'tg-send', onclick: send, 'aria-label': 'Отправить', text: '→' }))));
  }

  /* ================================================================ any other program */
  function generic(ctx, name, tip) {
    return h('div', { class: 'gen' },
      h('i', { class: 'gen-mono', text: name.slice(0, 2).toUpperCase() }),
      h('h2', { text: name }),
      h('p', { text: tip && tip.includes(' — ') ? 'Состояние: ' + tip.split(' — ')[1] : 'Программа запущена.' }),
      h('div', { class: 'gen-rows' }, ['Главная', 'Настройки', 'О программе'].map((t) => h('button', { type: 'button', text: t, onclick: () => ctx.toast(name + ': ' + t, 'Минимальное окно в превью.') }))),
      h('p', { class: 'gen-note', text: 'Окно-заглушка: в превью настоящая программа не запускается.' }));
  }

  window.ITD_APPS = {
    size(name) { return name === 'Figma' ? [1180, 720] : name === 'Проводник' ? [880, 540] : name === 'Telegram' ? [820, 560] : [520, 400]; },
    make(name, ctx, tip) { return name === 'Figma' ? figma(ctx) : name === 'Проводник' ? explorer(ctx) : name === 'Telegram' ? messenger(ctx) : generic(ctx, name, tip); }
  };
})();
