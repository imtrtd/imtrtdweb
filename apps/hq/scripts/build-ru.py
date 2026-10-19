#!/usr/bin/env python3
"""Generate the Russian version of the HQ site (imtrtd.space/ru/) from the English
pages in apps/hq/public and the approved translations in apps/hq/i18n/ru.json.

  python3 apps/hq/scripts/build-ru.py          # writes public/ru/**, assets/i18n-ru.js,
                                               # patches EN pages (switcher + hreflang), sitemap
  python3 apps/hq/scripts/build-ru.py --check  # same, but also exits 1 on untranslated strings

Idempotent: re-run after editing an EN page or ru.json, then commit the output.
Requires Python 3.9+ and beautifulsoup4 (pip install beautifulsoup4). No build step at deploy time.
"""
import json, os, posixpath, re, sys
from bs4 import BeautifulSoup, NavigableString, Comment, Doctype, Declaration, ProcessingInstruction

HERE = os.path.dirname(os.path.abspath(__file__))
HQ = os.path.dirname(HERE)
PUB = os.path.join(HQ, 'public')
SRC = os.path.join(HQ, 'i18n', 'ru.json')
ORIGIN = 'https://imtrtd.space'
VER = '20261019ru'
NB = '\u00a0'

# EN page file -> (json section, EN url path)
PAGES = {
    'index.html': ('index', '/'),
    'selected.html': ('selected', '/selected'),
    'archive.html': ('archive', '/archive'),
    'practice.html': ('practice', '/practice'),
    'contact.html': ('contact', '/contact'),
}
for slug in ('namenlos', 'pulse-box', 'natvik', 'cuebox', 'lab'):
    PAGES['work/%s.html' % slug] = ('work', '/work/' + slug)

def ru_path(p):
    return '/ru/' if p == '/' else '/ru' + p

def norm(s):
    return ' '.join(s.replace(NB, ' ').split())

# ---------------------------------------------------------------- dictionary
data = json.load(open(SRC, encoding='utf-8'))
NOTE = re.compile(r'\s+\(([^()]*)\)$')

class Row:
    def __init__(self, page, i, en, ru):
        self.page, self.i, self.raw_en, self.raw_ru = page, i, en, ru
        self.used = False
        self.status = None  # None | 'kept' (no translation needed) | 'skip'
        self.note = ''
        e = en
        m = NOTE.search(e)
        if m and not e.startswith('0/6'):
            self.note, e = m.group(1), e[:m.start()]
        self.en, self.ru = e, ru
    def __repr__(self):
        return '%s[%d] %r' % (self.page, self.i, self.raw_en)

rows = [Row(p, i, r['en'], r['ru']) for p, rs in data.items() for i, r in enumerate(rs)]

def row(page, en_prefix):
    for r in rows:
        if r.page == page and r.raw_en.startswith(en_prefix):
            return r
    raise KeyError((page, en_prefix))

# translator notes inside RU strings (copywriter req. 4): strip them and follow them
r = row('index', 'DIGITAL'); r.en = 'DIGITAL / EXPERIENCES / WITH A PULSE.'; r.ru = re.sub(r'\s*\([^)]*\)', '', r.ru); r.note = 'glitch word, also data-text'
r = row('shared', 'Brief · {label}'); r.ru = re.sub(r'\s*\([^)]*\)$', '', r.ru)
r = row('archive', 'Atelier / Route'); r.ru = r.en; r.status = 'kept'          # "оставить латиницей"
r = row('practice', 'React, TypeScript'); r.ru = r.en; r.status = 'kept'       # "без перевода"
r = row('contact', '(status block'); r.status = 'skip'                          # pointer to "shared"
r = row('practice', '0/6'); r.status = 'kept'                                   # digits only
r = row('archive', '- {Module}'); r.status = 'kept'                             # structure only
for r in rows:
    if r.status is None and r.en == r.ru and not re.search('[A-Za-z]', r.en):
        r.status = 'kept'  # dates
for r in rows:
    assert '(оставить' not in r.ru and 'без перевода' not in r.ru, r

# HTML dictionaries (per page) and JS dictionary
HTML_ONLY_NOTES = ('toolkit group', 'field', 'group')   # context-specific variants of short words
JS_ONLY_NOTES = ('step tab',)

class Dict:
    def __init__(self):
        self.d = {}
    def add(self, en, ru, r, prio):
        k = norm(en)
        if not k:
            return
        cur = self.d.get(k)
        if cur is not None and cur[0] == ru:
            cur[1].append(r)  # same string in several sections: one translation, all rows count as used
            if prio > cur[2]:
                self.d[k] = (ru, cur[1], prio)
        elif cur is None or prio >= cur[2]:
            self.d[k] = (ru, [r], prio)
    def peek(self, en):
        v = self.d.get(norm(en))
        return (v[0], list(v[1])) if v else (None, [])
    def get(self, en):
        v, rs = self.peek(en)
        for r in rs:
            r.used = True
        return v

SPLIT_SLASH = ('One person.', 'Got a project?', 'From / Open', 'Plate / 01', 'Palette: /', 'Tattoo studio / Music', 'Opening')
SPLIT_DOT = ('Tattoo studio · ', 'Music app · ', 'Travel · ', 'Product · ', 'Tool · ')

def pieces(r):
    """Derived (en, ru) parts for rows whose text is split across several elements / text nodes."""
    if r.en.endswith(' ↗') and r.ru.endswith(' ↗'):  # "Write <span>↗</span>"
        return [(r.en[:-2], r.ru[:-2])]
    if r.raw_en.startswith(SPLIT_SLASH):
        sep = ' / '
    elif r.raw_en.startswith(SPLIT_DOT):
        sep = ' · '
    else:
        return []
    e, u = r.en.split(sep), r.ru.replace(NB + '/ ', ' / ').split(sep)
    assert len(e) == len(u), r
    out = list(zip(e, u))
    if r.raw_en.startswith('Opening'):
        out.append(('Opening', u[0].rstrip('…').strip()))
    return out

def build_dict(page_key, js=False):
    """page_key: JSON section of the page (None = every section, used for JS and /work/*).
    Priority: page's own rows > shared rows > rows of other pages (context-specific variants excluded)."""
    D = Dict()
    for r in rows:
        if r.status == 'skip':
            continue
        html_only = any(n in r.note for n in HTML_ONLY_NOTES)
        js_only = any(n in r.note for n in JS_ONLY_NOTES)
        if js:
            if html_only:
                continue
            prio = 3 if js_only else 1
        else:
            if js_only:
                continue
            if r.page == page_key:
                prio = 2
            elif r.page == 'shared':
                prio = 1
            elif html_only:
                continue
            else:
                prio = 0
        D.add(r.en, r.ru, r, prio)
        for e, u in pieces(r):
            D.add(e, u, r, prio - 0.5)
    return D

# rows that are only used in JS templates: register derived keys for the JS dictionary
def js_extras(D):
    def add(en, ru, r):
        D.add(en, ru, r, 5)
    r = row('practice', 'STEP 0'); add('STEP', r.ru.split(' ')[0], r)
    r = row('shared', 'Opening'); add('Opening {project}', r.ru.split(' / ')[1], r)
    r = row('practice', 'Hi,')
    e = r.en.split('\\n'); u = r.ru.split('\\n')
    for a, b in zip(e, u):
        if a.strip() and a.strip() != '- …':
            add(a.strip(), b.strip(), r)
    r = row('index', '5 live builds')
    many = re.split(r'[ \u00a0]', r.ru, maxsplit=1)[1]  # "проектов онлайн" (row: "5\u00a0проектов онлайн")
    # Russian plural forms (Intl.PluralRules('ru')): one / few / many / other
    add('live builds#one', 'проект онлайн', r)
    add('live builds#few', 'проекта онлайн', r)
    add('live builds#many', many, r)
    add('live builds#other', 'проекта онлайн', r)
    r = row('archive', 'Work  Book'); add('Work&nbsp; Book', r.ru.replace('  ', '&nbsp; '), r)
    r = row('archive', 'EN  UA'); add('EN&nbsp; UA', r.ru.replace('  ', '&nbsp; '), r)
    r = row('shared', '{HH:MM} Kyiv'); r.used = True  # contact.js uses T('Kyiv')
    return D

PLURAL_JS = {'one': 'проект онлайн', 'few': 'проекта онлайн'}

# ---------------------------------------------------------------- HTML transform
KEEP = ['IMTRTD', 'ImTryingToDesign', 'I/TD', 'imtrtd.space', 'imtrtd@pm.me', '@imtrtd', '@imtryingtodesign',
        'Instagram', 'Threads', 'Telegram', 'NAMENLOS', 'PULSEBOX', 'Natvik Tours', 'CUEBOX', 'Tattoo Lab',
        'Atelier', 'Route', 'Instrument', 'Ledger', 'Night', 'Q4 2026', 'UTC+3', 'EN', 'RU', 'UA', 'NES', 'PDF', 'HTML/CSS',
        'React', 'TypeScript', 'Tailwind CSS', 'Vite', 'App router', 'GitHub Actions', 'Cloudflare Workers',
        'Drizzle', 'Web Audio', 'Canvas', 'CSS', 'edge', 'Q4']
KEEP.sort(key=len, reverse=True)

def leftover(s):
    t = s
    for k in KEEP:
        t = t.replace(k, ' ')
    return re.search(r'[A-Za-z]{2,}', t) is not None

SEPS = ['. ', ' — ', ' · ', ': ']

def _compose(D, k, depth):
    v, rs = D.peek(k)
    if v is not None:
        return v, rs
    if depth and not leftover(k):  # names inside a composite ("NAMENLOS — Tattoo studio — IMTRTD")
        return k, []
    if depth > 3:
        return None, []
    for sep in SEPS:
        start = 0
        while True:
            j = k.find(sep, start)
            if j < 0:
                break
            b = k[j + len(sep):]
            ta = None
            for a in ([k[:j + 1], k[:j]] if sep == '. ' else [k[:j]]):
                ta, ra = _compose(D, a, depth + 1)
                if ta is not None:
                    break
            if ta is not None:
                tb, rb = _compose(D, b, depth + 1)
                if tb is not None:
                    if sep == '. ':
                        if not ta.endswith(('.', '!', '?', '…')):
                            ta += '.'
                        return ta + ' ' + tb, ra + rb
                    return ta + sep + tb, ra + rb
            start = j + 1
    return None, []

def translate(D, text):
    """Exact match first, then a composition of approved fragments split at '. ', ' — ', ' · ', ': '."""
    v, rs = _compose(D, norm(text), 0)
    for r in rs:
        r.used = True
    return v

TRANSLATE_META = {'description', 'og:title', 'og:description', 'twitter:title', 'twitter:description', 'og:image:alt'}
ATTRS = ['aria-label', 'title', 'alt', 'placeholder', 'data-q', 'value']

def lang_switch(cur, en_url, ru_url):
    def a(code, href):
        cur_attr = ' aria-current="true"' if code == cur else ''
        return '<a class="label" data-lang="%s" href="%s" hreflang="%s" lang="%s"%s>%s</a>' % (code, href, code, code, cur_attr, code.upper())
    label = 'Язык' if cur == 'ru' else 'Language'
    return '<!--lang--><nav aria-label="%s" class="lang-switch">%s%s</nav><!--/lang-->' % (label, a('en', en_url), a('ru', ru_url))

def head_block(cur, en_url, ru_url, ru_page_depth=None):
    other = ru_url if cur == 'en' else en_url
    s = '<!--i18n-->'
    s += '<link href="%s%s" hreflang="en" rel="alternate"/>' % (ORIGIN, en_url)
    s += '<link href="%s%s" hreflang="ru" rel="alternate"/>' % (ORIGIN, ru_url)
    s += '<link href="%s%s" hreflang="x-default" rel="alternate"/>' % (ORIGIN, en_url)
    # Remembered language: switch once per session, only when arriving from another site,
    # and only if the visitor chose the other language on the switcher before. No loops.
    s += ('<script>(function(){var L="%s",A="%s",K="imtrtd-lang";try{var p=localStorage.getItem(K),r=document.referrer,s=!1;'
          'try{s=!!r&&new URL(r).host===location.host}catch(e){}'
          'if(p&&p!==L&&!s&&!sessionStorage.getItem(K+"-hop")){sessionStorage.setItem(K+"-hop","1");location.replace(A+location.search+location.hash)}}catch(e){}'
          'document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest("a[data-lang]");if(!a)return;'
          'try{localStorage.setItem(K,a.getAttribute("data-lang"))}catch(x){}'
          'if(location.hash&&a.getAttribute("href").indexOf("#")<0)a.setAttribute("href",a.getAttribute("href")+location.hash)})})();</script>') % (cur, other)
    if cur == 'ru':
        s += '<script src="%sassets/i18n-ru.js?v=%s"></script>' % ('../' * ru_page_depth, VER)
    s += '<!--/i18n-->'
    return s

MARK_HEAD = re.compile(r'<!--i18n-->.*?<!--/i18n-->', re.S)
MARK_LANG = re.compile(r'<!--lang-->.*?<!--/lang-->', re.S)
RADIO_END = re.compile(r'(<div aria-label="Site colour" class="flex items-center" role="radiogroup">.*?</button></div>)', re.S)
VER_RE = re.compile(r'(assets/(?:studio|site-api|contact|practice|samples)\.js|assets/merge-palette\.css)(?:\?v=[^"]*)?"')

def patch_en(html, en_url, ru_url):
    html = MARK_HEAD.sub('', html)
    html = MARK_LANG.sub('', html)
    html = html.replace('</head>', head_block('en', en_url, ru_url) + '</head>', 1)
    html, n = RADIO_END.subn(lambda m: m.group(1) + lang_switch('en', en_url, ru_url), html, count=1)
    assert n == 1, 'header colour switch not found'
    html = VER_RE.sub(lambda m: '%s?v=%s"' % (m.group(1), VER), html)
    return html

report = {'untranslated': {}, 'composed': {}}

def to_ru(html, fname, page_key, en_url, ru_url):
    D = build_dict(None if page_key == 'work' else page_key, js=page_key == 'work')
    depth = fname.count('/') + 1  # ru/ + work/
    soup = BeautifulSoup(html, 'html.parser')
    miss = report['untranslated'].setdefault('ru/' + fname, [])
    comp = report['composed'].setdefault('ru/' + fname, [])

    def tr(s, where):
        if not re.search('[A-Za-z]', s):
            return None
        v = D.get(s)
        if v is None:
            v = translate(D, s)
            if v is not None:
                comp.append(norm(s))
        if v is None and leftover(s):
            miss.append('%s: %r' % (where, norm(s)))
        return v

    soup.html['lang'] = 'ru'
    # hero: САЙТЫ / С ЖИВЫМ / ПУЛЬСОМ. with the glitch on ЖИВЫМ (data-text must match)
    h1 = soup.select_one('h1.hero-title')
    if h1:
        hr = row('index', 'DIGITAL'); hr.used = True
        l1, l2, l3 = hr.ru.split(' / ')
        pre, word = l2.rsplit(NB, 1) if NB in l2 else l2.rsplit(' ', 1)
        g = h1.select_one('.hero-glitch')
        cls = ' '.join(g.get('class', []))
        h1.clear()
        h1.append(BeautifulSoup('%s<br/>%s%s<span class="%s" data-text="%s">%s</span><br/>%s' % (l1, pre, NB, cls, word, word, l3), 'html.parser'))
    # "5 live builds" -> plural
    cnt = soup.select_one('#work p.text-mute')
    if cnt and 'live builds' in cnt.get_text():
        n = int(re.search(r'\d+', cnt.get_text()).group())
        cr = row('index', '5 live builds'); cr.used = True
        form = 'one' if n % 10 == 1 and n % 100 != 11 else 'few' if 2 <= n % 10 <= 4 and not 12 <= n % 100 <= 14 else 'many'
        cnt.string = '%d%s%s' % (n, NB, PLURAL_JS.get(form, re.split(r'[ \u00a0]', cr.ru, maxsplit=1)[1]))
    # section divider labels are drawn from data-div by CSS (::after). data-div stays EN because CSS/JS select on it;
    # the visible RU label goes into data-div-label (merge-palette.css prefers it).
    for el in soup.find_all(attrs={'data-div': True}):
        num, _, name = el['data-div'].partition(' · ')
        v = D.get(name) if name else None
        if v is None:
            miss.append('data-div label (CSS ::after): %r' % el['data-div'])
        else:
            el['data-div-label'] = '%s · %s' % (num, v)
    # <option> keeps its EN value for the lead API; only the label is translated
    for o in soup.find_all('option'):
        if not o.has_attr('value'):
            o['value'] = o.get_text()
    # text nodes
    for t in list(soup.find_all(string=True)):
        if isinstance(t, (Comment, Doctype, Declaration, ProcessingInstruction)) or t.parent.name in ('script', 'style'):
            continue
        if t.find_parent(class_='lang-switch'):
            continue
        s = str(t)
        if not s.strip():
            continue
        v = tr(s, '<%s>' % t.parent.name)
        if v is not None:
            if NB + ' ' in s and '  ' in v:
                v = v.replace('  ', NB + ' ')
            lead = s[:len(s) - len(s.lstrip())]
            trail = s[len(s.rstrip()):]
            t.replace_with(lead + v + trail)
    # attributes
    for el in soup.find_all(True):
        if el.find_parent(class_='lang-switch') or 'lang-switch' in el.get('class', []):
            continue
        for a in ATTRS:
            if el.has_attr(a) and not (el.name == 'option' and a == 'value'):
                v = tr(el[a], '@%s' % a)
                if v is not None:
                    el[a] = v
        if el.name == 'meta' and el.has_attr('content'):
            k = el.get('name') or el.get('property') or ''
            if k in TRANSLATE_META:
                v = tr(el['content'], 'meta %s' % k)
                if v is None and page_key == 'practice' and k.endswith('description'):
                    # live meta description is longer than the approved row: use the approved RU (row says it is for meta)
                    pr = row('practice', 'It starts from'); pr.used = True; v = pr.ru
                    miss.pop()
                    comp.append('meta %s: EN is longer than JSON row; used approved RU lede' % k)
                if v is not None:
                    el['content'] = v
            elif k == 'og:locale':
                el['content'] = 'ru_RU'
                el.insert_after(soup.new_tag('meta', attrs={'content': 'en', 'property': 'og:locale:alternate'}))
            elif k == 'og:url':
                el['content'] = ORIGIN + ru_url
    can = soup.find('link', rel='canonical')
    if can:
        can['href'] = ORIGIN + ru_url
    for js in soup.find_all('script', type='application/ld+json'):
        try:
            obj = json.loads(js.string)
        except Exception:
            continue
        def walk(o):
            if isinstance(o, dict):
                for k2, v2 in o.items():
                    if k2 == 'description' and isinstance(v2, str):
                        v3 = tr(v2, 'ld+json description')
                        if v3:
                            o[k2] = v3
                    else:
                        walk(v2)
                if o.get('@type') == 'WebSite':
                    o['inLanguage'] = ['en', 'ru']
            elif isinstance(o, list):
                for x in o:
                    walk(x)
        walk(obj)
        js.string = json.dumps(obj, ensure_ascii=False, separators=(',', ':'))
    # relative URLs: pages with a RU counterpart stay relative (same tree); everything else goes up one level
    en_dir = posixpath.dirname(fname)
    for el in soup.find_all(True):
        for a in ('href', 'src'):
            if not el.has_attr(a):
                continue
            u = el[a]
            if re.match(r'^([a-z][a-z0-9+.-]*:|//|/|#)', u, re.I) or u == '':
                continue
            if el.find_parent(class_='lang-switch'):
                continue
            target = posixpath.normpath(posixpath.join(en_dir, re.split(r'[#?]', u)[0])) if re.split(r'[#?]', u)[0] else fname
            if target in PAGES:
                continue
            el[a] = '../' + u
    out = str(soup)
    out = MARK_HEAD.sub('', out)
    out = MARK_LANG.sub(lang_switch('ru', en_url, ru_url), out)
    out = out.replace('</head>', head_block('ru', en_url, ru_url, depth) + '</head>', 1)
    return out

# ---------------------------------------------------------------- run
def main():
    check = '--check' in sys.argv
    for fname, (page_key, en_url) in PAGES.items():
        p = os.path.join(PUB, fname)
        html = open(p, encoding='utf-8').read()
        ru_url = ru_path(en_url)
        en = patch_en(html, en_url, ru_url)
        if en != html:
            open(p, 'w', encoding='utf-8').write(en)
        ru = to_ru(en, fname, page_key, en_url, ru_url)
        op = os.path.join(PUB, 'ru', fname)
        os.makedirs(os.path.dirname(op), exist_ok=True)
        open(op, 'w', encoding='utf-8').write(ru)

    # JS dictionary
    D = js_extras(build_dict(None, js=True))
    used_keys = set()
    for f in ('studio.js', 'site-api.js', 'contact.js', 'practice.js', 'samples.js'):
        src = open(os.path.join(PUB, 'assets', f), encoding='utf-8').read()
        for m in re.finditer(r"\b(?:T|TT)\('((?:[^'\\]|\\.)*)'", src):
            used_keys.add(m.group(1).replace("\\'", "'"))
    js_dict = {}
    missing_js = []
    for k in sorted(used_keys):
        v = D.get(k)
        if v is None:
            missing_js.append(k)
        else:
            js_dict[k] = v
    # also ship everything else (CMS strings are mapped through it on RU pages)
    for k, (v, _r, _p) in D.d.items():
        js_dict.setdefault(k, v)
    with open(os.path.join(PUB, 'assets', 'i18n-ru.js'), 'w', encoding='utf-8') as f:
        f.write('/* Generated by apps/hq/scripts/build-ru.py from apps/hq/i18n/ru.json. Do not edit. */\n')
        f.write('window.IMTRTD_I18N={lang:"ru",t:%s};\n' % json.dumps(js_dict, ensure_ascii=False, sort_keys=True, indent=0))

    # sitemap with hreflang alternates
    order = ['/', '/selected', '/archive', '/practice', '/contact'] + ['/work/' + s for s in ('namenlos', 'pulse-box', 'natvik', 'cuebox', 'lab')]
    prio = {'/': '1.0', '/selected': '0.8', '/archive': '0.6', '/practice': '0.6', '/contact': '0.7'}
    xs = ['<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">']
    for u in order:
        alt = '<xhtml:link rel="alternate" hreflang="en" href="%s%s"/><xhtml:link rel="alternate" hreflang="ru" href="%s%s"/><xhtml:link rel="alternate" hreflang="x-default" href="%s%s"/>' % (ORIGIN, u, ORIGIN, ru_path(u), ORIGIN, u)
        for loc in (u, ru_path(u)):
            xs.append('<url><loc>%s%s</loc><priority>%s</priority>%s</url>' % (ORIGIN, loc, prio.get(u, '0.5'), alt))
    xs.append('</urlset>\n')
    open(os.path.join(PUB, 'sitemap.xml'), 'w', encoding='utf-8').write(''.join(xs))

    # report
    print('== JSON rows not matched in HTML/JS:')
    unmatched = [r for r in rows if not r.used and r.status is None]
    for r in unmatched:
        print('  ', r)
    print('== rows kept as-is / skipped by note:', [repr(r) for r in rows if r.status])
    print('== T() keys missing from dictionary:', missing_js)
    bad = 0
    for f, items in report['untranslated'].items():
        if items:
            print('== untranslated on', f)
            for x in sorted(set(items)):
                print('   ', x); bad += 1
    print('== composed from approved fragments:')
    for f, items in report['composed'].items():
        for x in sorted(set(items)):
            print('   ', f, x)
    if check and (bad or missing_js):
        sys.exit(1)

if __name__ == '__main__':
    main()
