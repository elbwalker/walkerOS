/* walkerOS product visualisations — ported from the relaunch design
   (Hero Tagging Viz, Article Teaser Tracking Animated, Destination Mapping Viz).
   Visualisations stay dark in both themes: they paint with viz-* and event-* tokens,
   plus a few fixed literals the design uses for alpha tints. */
const React = window.React;
const h = React.createElement;
const { useState, useEffect, useRef } = React;

// CSS text → React style object, so the design's inline styles carry over verbatim.
const cache = new Map();
function st(css) {
  let o = cache.get(css);
  if (o) return o;
  o = {};
  for (const decl of css.split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const k = decl.slice(0, i).trim();
    if (!k) continue;
    const key = k.startsWith('--') ? k : k.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    o[key] = decl.slice(i + 1).trim();
  }
  if (cache.size < 2000) cache.set(css, o);
  return o;
}

const V = {
  bg: 'var(--viz-bg)', code: 'var(--viz-code-bg)', border: 'var(--viz-border)', fg: 'var(--viz-fg)', fg2: 'var(--viz-fg-2)',
  comment: 'var(--viz-comment)', ln: 'var(--viz-line-number)', surface: 'var(--viz-surface)', primary: 'var(--primary)',
  entity: 'var(--event-entity)', action: 'var(--event-action)', prop: 'var(--event-property)', ctx: 'var(--event-context)', glob: 'var(--event-globals)',
  tag: 'var(--viz-tag)', str: 'var(--viz-string)', num: 'var(--viz-number)', punct: 'var(--viz-punct)',
};
const SANS = "font-family:var(--font-viz)";
const MONO = "font-family:var(--font-viz-mono)";
const Toks = ({ list }) => list.map((tk, i) => h('span', { key: i, style: st(`color:${tk.c}; background:${tk.bg || 'transparent'}; border-radius:3px`) }, tk.t));

/* ───────────── DestinationMappingViz ───────────── */
const MCOL = { str: V.entity, key: V.glob, num: V.num, fn: V.action, p: V.punct, x: V.fg };
const MHL = 'rgba(197,228,120,0.16)';
function mtokens(line, hl) {
  const out = [];
  const re = /"[^"]*"|'[^']*'|\d+(?:\.\d+)?|[A-Za-z_]\w*|\s+|./g;
  let m;
  while ((m = re.exec(line))) {
    const t = m[0], rest = line.slice(re.lastIndex);
    const isKey = /^\s*:/.test(rest);
    let c = MCOL.p, bg = 'transparent';
    if (/^["']/.test(t)) { c = isKey ? MCOL.key : MCOL.str; if (hl && t.slice(1, -1) === hl) bg = MHL; }
    else if (/^\d/.test(t) || t === 'true' || t === 'false') c = MCOL.num;
    else if (/^(gtag|fbq|elb|ttq|track|amplitude|revenue)$/.test(t)) c = MCOL.fn;
    else if (/^[A-Za-z_]/.test(t)) c = isKey ? MCOL.key : MCOL.x;
    else if (/^\s+$/.test(t)) c = MCOL.x;
    out.push({ t, c, bg });
  }
  return out;
}
const MD = { ga4: { name: 'GA4' }, meta: { name: 'Meta Pixel' }, amp: { name: 'Amplitude' }, tt: { name: 'TikTok Pixel' } };
const MEVENTS = [
  { entity: 'product', action: 'view',
    dests: [
      { ...MD.ga4, mapped: 'view_item', out: [`gtag('event', 'view_item', {`, `  currency: 'EUR', value: 420,`, `  items: [{ item_id: 'ers' }]`, `})`] },
      { ...MD.meta, mapped: 'ViewContent', out: [`fbq('track', 'ViewContent', {`, `  value: 420, currency: 'EUR',`, `  contents: [{ id: 'ers', quantity: 1 }],`, `  content_type: 'product'`, `})`] },
      { ...MD.tt, mapped: 'ViewContent', out: [`ttq.track('ViewContent', {`, `  content_id: 'ers', content_type: 'product',`, `  value: 420, currency: 'EUR'`, `})`] },
      { ...MD.amp, mapped: 'Product Viewed', out: [`amplitude.track('Product Viewed', {`, `  product_id: 'ers', price: 420, currency: 'EUR'`, `})`] },
    ] },
  { entity: 'lead', action: 'submit',
    dests: [
      { ...MD.ga4, mapped: 'generate_lead', out: [`gtag('event', 'generate_lead', {`, `  value: 2500, currency: 'EUR'`, `})`] },
      { ...MD.meta, mapped: 'Lead', out: [`fbq('track', 'Lead', {`, `  value: 2500, currency: 'EUR'`, `})`] },
      { ...MD.tt, mapped: 'Contact', out: [`ttq.track('Contact', {`, `  value: 2500, currency: 'EUR'`, `})`] },
      { ...MD.amp, mapped: 'Lead Submitted', out: [`amplitude.track('Lead Submitted', {`, `  lead_type: 'demo', value: 2500, currency: 'EUR'`, `})`] },
    ] },
  { entity: 'order', action: 'complete',
    dests: [
      { ...MD.ga4, mapped: 'purchase', out: [`gtag('event', 'purchase', {`, `  transaction_id: '0rd3r1d', value: 462,`, `  currency: 'EUR', items: […]`, `})`] },
      { ...MD.meta, mapped: 'Purchase', out: [`fbq('track', 'Purchase', {`, `  value: 462, currency: 'EUR',`, `  contents: […], content_type: 'product'`, `})`] },
      { ...MD.tt, mapped: 'CompletePayment', out: [`ttq.track('CompletePayment', {`, `  order_id: '0rd3r1d', value: 462, currency: 'EUR',`, `  contents: […], content_type: 'product'`, `})`] },
      { ...MD.amp, mapped: 'purchase', ruleText: '"order": { "complete": { "settings": { "revenue": {…} } } }', out: [`amplitude.revenue({`, `  productId: 'ers', price: 420, quantity: 1,`, `  revenueType: 'purchase', currency: 'EUR'`, `});`, `amplitude.track('order complete', { … })`] },
    ] },
];
const MSHORT = {
  product: "elb('product view', { id: 'ers', price: 420, currency: 'EUR' })",
  lead: "elb('lead submit', { type: 'demo', value: 2500, currency: 'EUR' })",
  order: "elb('order complete', { id: '0rd3r1d', value: 462, currency: 'EUR' })",
};

function DestinationMappingViz(props) {
  const [ev, setEv] = useState(props.initialEvent || 0);
  const E = MEVENTS[ev];
  const entityName = E.entity + ' ' + E.action;
  const caption = props.caption ?? '40+ destination adapters ship with the project. Removing GA4 or adding a new pixel is a block in this file, not a re-instrumentation project across every page.';
  return h('div', { className: 'wos-viz', style: st(`${SANS}; color:${V.fg}; width:100%; background:#1c2638; border:1px solid #38455e; border-radius:14px; overflow:hidden`) },
    h('div', { style: st('padding:18px 20px 0; display:flex; flex-direction:column; gap:10px') },
      h('div', { style: st(`${MONO}; font-size:11px; letter-spacing:0.06em; text-transform:uppercase; color:${V.fg2}`) }, 'Pick an event'),
      h('div', { style: st('display:flex; flex-wrap:wrap; gap:8px') },
        MEVENTS.map((e, i) => {
          const a = i === ev;
          return h('button', { key: i, type: 'button', className: 'wos-viz-chip', onClick: () => setEv(i), 'aria-pressed': a,
            style: st(`position:relative; display:flex; overflow:hidden; padding:0; border-radius:7px; border:1px solid ${a ? V.primary : '#38455e'}; background:${a ? 'rgba(1,181,226,0.08)' : 'transparent'}; ${MONO}; font-size:13px; cursor:pointer; transition:border-color .25s, background .25s`) },
            h('span', { style: st(`padding:7px 10px; color:${V.fg}; background:rgba(255,255,255,0.04)`) }, e.entity),
            h('span', { style: st(`padding:7px 10px; color:${V.primary}`) }, e.action));
        }))),
    h('div', { style: st(`margin:16px 20px 0; padding:10px 14px; background:${V.code}; border:1px solid #2f3a4d; border-radius:8px; overflow-x:auto; ${MONO}; font-size:12.5px; line-height:1.6; white-space:pre`) },
      h(Toks, { list: mtokens(MSHORT[E.entity], entityName) })),
    h('div', { style: st('padding:18px 20px 20px; display:flex; flex-direction:column; gap:10px') },
      h('div', { style: st(`${MONO}; font-size:12.5px; font-style:italic; color:${V.comment}`) }, '// same event, four destinations, zero app code touched'),
      h('div', { style: st('display:grid; grid-template-columns:repeat(auto-fit, minmax(min(100%, 440px), 1fr)); gap:10px') },
        E.dests.map((d, i) => {
          const rule = d.ruleText ? d.ruleText : `"${E.entity}": { "${E.action}": { "name": "${d.mapped}" } }`;
          return h('div', { key: d.name, style: st(`min-width:0; background:${V.code}; border:1px solid #2f3a4d; border-radius:10px; padding:12px 14px; display:flex; flex-direction:column; gap:8px`) },
            h('span', { style: st('font-size:14px; font-weight:600') }, d.name),
            h('div', { style: st(`display:flex; gap:10px; align-items:baseline; overflow-x:auto; ${MONO}; font-size:12px; line-height:1.7`) },
              h('span', { style: st(`flex:none; width:58px; font-size:10.5px; color:${V.comment}`) }, 'mapping'),
              h('span', { style: st('white-space:pre') }, h(Toks, { list: mtokens(rule, d.mapped) }))),
            h('div', { style: st(`display:flex; gap:10px; align-items:flex-start; overflow-x:auto; ${MONO}; font-size:12px; line-height:1.7`) },
              h('span', { style: st(`flex:none; width:58px; font-size:10.5px; color:${V.comment}`) }, 'sends'),
              h('div', { style: st('min-width:0') }, d.out.map((l, j) => h('div', { key: j, style: st('white-space:pre') }, h(Toks, { list: mtokens(l, d.mapped) }))))));
        }))),
    caption ? h('div', { style: st(`border-top:1px solid #38455e; padding:18px 20px 20px; font-size:15px; line-height:1.6; color:${V.punct}; text-wrap:pretty`) }, caption) : null);
}

/* ───────────── HeroTaggingViz ───────────── */
const ARTICLES = [
  { kicker: 'Tech', cat: 'tech', img: 'bug', title: 'Return of the Bug' },
  { kicker: 'Tech', cat: 'tech', title: 'The quiet return of RSS' },
  { kicker: 'Food', cat: 'food', title: 'Why sourdough came back' },
];
const HL_ = 11500;
const P = { siS: 0, siE: 500, aS: 900, aE: 1500, dS: 1800, dE: 2600, eS: 2900, eE: 3600, bS: 3900, bE: 4700, cS: 5000, cE: 5800, imp: 6200, mS: 6900, mE: 7700, click: 7850, row: 8000, fo: 10600, soS: 10800, soE: 11400 };
const HC = { tag: V.tag, attr: V.glob, p: V.punct, str: V.str, txt: V.fg };
const MAX_ROWS = 24;
const tk = (t, c) => ({ t, c, txt: true, caret: false });
const len = a => a.reduce((s, x) => s + x.t.length, 0);
const trunc = (a, n) => { const o = []; let l = n; for (const x of a) { if (l <= 0) break; const s = x.t.slice(0, l); o.push({ ...x, t: s }); l -= s.length; } return o; };
const clamp = x => Math.max(0, Math.min(1, x));
const ease = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

function Thumb({ art }) {
  const abs = { viewBox: '0 0 112 86', preserveAspectRatio: 'xMidYMid slice', style: st('position:absolute; inset:0; width:100%; height:100%'), 'aria-hidden': true };
  if (art.img === 'bug') return h('svg', abs,
    h('rect', { width: 112, height: 86, fill: '#dfe8cf' }), h('ellipse', { cx: 56, cy: 66, rx: 30, ry: 6, fill: '#bccaa6' }),
    h('g', { stroke: '#3b3232', strokeWidth: 2.4, strokeLinecap: 'round', fill: 'none' },
      ['M36 46 L28 42', 'M35 54 L27 56', 'M38 61 L31 66', 'M76 46 L84 42', 'M77 54 L85 56', 'M74 61 L81 66', 'M51 25 Q47 17 42 16', 'M61 25 Q65 17 70 16'].map((d, i) => h('path', { key: i, d }))),
    h('circle', { cx: 42, cy: 16, r: 2, fill: '#3b3232' }), h('circle', { cx: 70, cy: 16, r: 2, fill: '#3b3232' }),
    h('ellipse', { cx: 56, cy: 30, rx: 10, ry: 7.5, fill: '#3b3232' }), h('circle', { cx: 52, cy: 29, r: 1.6, fill: '#ffffff' }), h('circle', { cx: 60, cy: 29, r: 1.6, fill: '#ffffff' }),
    h('ellipse', { cx: 56, cy: 50, rx: 21, ry: 18, fill: '#d9534a' }), h('path', { d: 'M56 33 L56 68', stroke: '#3b3232', strokeWidth: 2 }),
    h('circle', { cx: 47, cy: 44, r: 3.4, fill: '#3b3232' }), h('circle', { cx: 65, cy: 44, r: 3.4, fill: '#3b3232' }),
    h('circle', { cx: 45, cy: 56, r: 2.8, fill: '#3b3232' }), h('circle', { cx: 67, cy: 56, r: 2.8, fill: '#3b3232' }),
    h('path', { d: 'M44 38 Q48 35 52 36', stroke: '#ef8a7f', strokeWidth: 2, fill: 'none', strokeLinecap: 'round' }));
  if (art.cat === 'tech') return h('svg', abs,
    h('rect', { width: 112, height: 86, fill: '#334058' }), h('rect', { x: 38, y: 25, width: 36, height: 36, rx: 8, fill: '#f08a24' }),
    h('circle', { cx: 47, cy: 52, r: 3.2, fill: '#ffffff' }),
    h('path', { d: 'M45 42 A10 10 0 0 1 57 54', stroke: '#ffffff', strokeWidth: 3.5, fill: 'none', strokeLinecap: 'round' }),
    h('path', { d: 'M45 34.5 A17.5 17.5 0 0 1 64.5 54', stroke: '#ffffff', strokeWidth: 3.5, fill: 'none', strokeLinecap: 'round' }));
  return h('svg', abs,
    h('rect', { width: 112, height: 86, fill: '#eadcc6' }), h('ellipse', { cx: 56, cy: 62, rx: 44, ry: 10, fill: '#b07d4f' }),
    h('ellipse', { cx: 56, cy: 50, rx: 31, ry: 19, fill: '#c3834a' }), h('ellipse', { cx: 56, cy: 45, rx: 25, ry: 13, fill: '#d99d5e' }),
    h('path', { d: 'M40 44 Q56 35 72 44', stroke: '#f3dfb8', strokeWidth: 2.2, fill: 'none', strokeLinecap: 'round' }),
    h('path', { d: 'M44 51 Q56 45 68 51', stroke: '#f3dfb8', strokeWidth: 2.2, fill: 'none', strokeLinecap: 'round' }));
}

const Pill = ({ bg, children }) => h('span', { style: st(`padding:1px 7px; border-radius:4px; background:${bg}; color:#1a2232; ${MONO}; font-size:10.5px; font-weight:500; line-height:17px`) }, children);

function HeroTaggingViz(props) {
  const playing = props.playing ?? true, speed = props.speed ?? 1;
  const [t, setT] = useState(props.startAt || 0);
  const el = useRef(props.startAt || 0), wall0 = useRef(Date.now()), cfg = useRef({ playing, speed });
  cfg.current = { playing, speed };
  useEffect(() => {
    let last = performance.now(), raf;
    const loop = now => {
      const dt = Math.min(64, now - last); last = now;
      if (cfg.current.playing) el.current += dt * cfg.current.speed;
      setT(el.current);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const k = Math.floor(t / HL_), ph = t - k * HL_, art = ARTICLES[k % 3];
  const A = [tk('data-elb', HC.attr), tk('=', HC.p), tk('"article"', HC.str)];
  const B = [tk(' ', HC.p), tk('data-elb-article', HC.attr), tk('=', HC.p), tk('"title:#innerText"', HC.str)];
  const E = [tk(' ', HC.p), tk('data-elb-article', HC.attr), tk('=', HC.p), tk('"category:#innerText"', HC.str)];
  const Cc = [tk(' ', HC.p), tk('data-elbaction', HC.attr), tk('=', HC.p), tk('"click:open"', HC.str)];
  const D = [tk('data-elbaction', HC.attr), tk('=', HC.p), tk('"impression"', HC.str)];
  const typed = (a, s, e) => Math.round(clamp((ph - s) / (e - s)) * len(a));
  const na = typed(A, P.aS, P.aE), nb = typed(B, P.bS, P.bE), nc = typed(Cc, P.cS, P.cE), nd = typed(D, P.dS, P.dE), ne = typed(E, P.eS, P.eE);
  let caret = null;
  if (ph >= P.aS - 400 && ph < P.dS - 300) caret = 'a';
  else if (ph >= P.dS - 300 && ph < P.eS - 100) caret = 'd';
  else if (ph >= P.eS - 100 && ph < P.bS - 100) caret = 'e';
  else if (ph >= P.bS - 100 && ph < P.cS - 100) caret = 'b';
  else if (ph >= P.cS - 100 && ph < P.mS) caret = 'c';
  const typing = (ph >= P.aS && ph <= P.aE) || (ph >= P.bS && ph <= P.bE) || (ph >= P.cS && ph <= P.cE) || (ph >= P.dS && ph <= P.dE) || (ph >= P.eS && ph <= P.eE);
  const car = { caret: true, txt: false, o: typing || ph % 900 < 500 ? 1 : 0 };
  const wc = (a, on) => on ? [...a, car] : a;
  const raw = [
    { toks: [tk('<article', HC.tag), tk(' ', HC.p), tk('class', HC.attr), tk('=', HC.p), tk('"teaser"', HC.str)] },
    ph >= P.aS - 400 && { toks: [tk('  ', HC.p), ...wc(trunc(A, na), caret === 'a')], on: true },
    ph >= P.dS - 300 && { toks: [tk('  ', HC.p), ...wc(trunc(D, nd), caret === 'd')], on: true },
    { toks: [tk('>', HC.tag)] },
    { toks: [tk('  ', HC.p), tk('<img', HC.tag), tk(' ', HC.p), tk('src', HC.attr), tk('=', HC.p), tk(`"/img/${art.cat}.jpg"`, HC.str), tk(' ', HC.p), tk('alt', HC.attr), tk('=', HC.p), tk('""', HC.str), tk(' />', HC.tag)] },
    { toks: [tk('  ', HC.p), tk('<span', HC.tag), tk(' ', HC.p), tk('class', HC.attr), tk('=', HC.p), tk('"kicker"', HC.str), ...wc(trunc(E, ne), caret === 'e'), tk('>', HC.tag), tk(art.kicker, HC.txt), tk('</span>', HC.tag)], on: ph >= P.eS - 100 },
    { toks: [tk('  ', HC.p), tk('<h3', HC.tag), ...wc(trunc(B, nb), caret === 'b'), tk('>', HC.tag), tk(art.title, HC.txt), tk('</h3>', HC.tag)], on: ph >= P.bS - 100 },
    { toks: [tk('  ', HC.p), tk('<a', HC.tag), ...wc(trunc(Cc, nc), caret === 'c'), tk('>', HC.tag), tk('Open →', HC.txt), tk('</a>', HC.tag)], on: ph >= P.cS - 100 },
    { toks: [tk('</article>', HC.tag)] },
  ];
  const lines = raw.filter(Boolean).map((l, i) => ({ ...l, n: i + 1 }));
  const fade = ph < 250 ? ph / 250 : ph > P.fo ? 1 - clamp((ph - P.fo) / (HL_ - P.fo - 150)) : 1;
  const so = ease(clamp((ph - P.soS) / (P.soE - P.soS))), si = ease(clamp((ph - P.siS) / (P.siE - P.siS)));
  const cardOff = ph >= P.soS ? -so * 190 : (1 - si) * 190;
  const impOn = ph >= P.dE, entityOn = ph >= P.aE, propsOn = ph >= P.bE, catOn = ph >= P.eE, actionOn = ph >= P.cE;
  const m = ease(clamp((ph - P.mS) / (P.mE - P.mS)));
  const press = ph >= P.click && ph < P.click + 180;
  const rp = clamp((ph - P.click) / 550);
  const curOp = ph >= P.mS - 200 && ph < P.fo + 200 ? clamp((ph - (P.mS - 200)) / 200) * (ph > P.fo ? 1 - clamp((ph - P.fo) / 200) : 1) : 0;
  const propGlow = '0 0 10px 1px rgba(240,113,127,0.55)';

  const rows = [], evs = [];
  for (let j = k; j >= 0 && evs.length < MAX_ROWS; j--) {
    if (j < k || ph >= P.row) evs.push({ j, at: P.row, action: 'open' });
    if (j < k || ph >= P.imp) evs.push({ j, at: P.imp, action: 'impression' });
  }
  for (const e of evs.slice(0, MAX_ROWS)) {
    const a = ARTICLES[e.j % 3], age = e.j === k ? ph - e.at : 1e4;
    rows.push({ key: e.j + e.action, n: rows.length + 1, name: 'article ' + e.action, title: a.title, cat: a.kicker.toUpperCase(),
      bg: `rgba(197,228,120,${(0.14 * (1 - clamp(age / 1600))).toFixed(3)})`, op: clamp(age / 300), ty: `translateX(${((1 - ease(clamp(age / 500))) * -80).toFixed(1)}px)` });
  }
  const widths = ['72%', '58%', '80%', '50%', '66%', '62%'];
  const skeletons = widths.slice(0, Math.max(0, 6 - rows.length)).map((w, i) => ({ w, n: rows.length + i + 1 }));
  const grid = 'display:grid; grid-template-columns:38px 166px minmax(250px,1fr)';
  const cellR = 'border-right:1px solid ' + V.surface;

  return h('div', { className: 'wos-viz', style: st(`${SANS}; color:${V.fg}; width:100%; background:${V.bg}; border:1px solid #2f3a4d; border-radius:16px; padding:16px; display:flex; flex-wrap:wrap; gap:16px; align-items:stretch`) },
    // code + rendered teaser
    h('div', { style: st(`flex:1.2 1 520px; min-width:0; background:${V.code}; border:1px solid ${V.surface}; border-radius:12px; overflow:hidden; display:flex; flex-direction:column`) },
      h('div', { style: st('display:flex; align-items:center; gap:14px; padding:12px 16px; border-bottom:1px solid #243044') },
        h('div', { style: st('display:flex; gap:7px') }, [0, 1, 2].map(i => h('span', { key: i, style: st(`width:10px; height:10px; border-radius:50%; background:${V.border}`) }))),
        h('span', { style: st(`${MONO}; font-size:12px; color:${V.primary}`) }, 'ArticleTeaser.html')),
      h('div', { style: st(`padding:12px 0 14px; ${MONO}; font-size:13px; line-height:1.95; min-height:268px; opacity:${fade}`) },
        lines.map(ln => h('div', { key: ln.n, style: st(`display:flex; background:${ln.on ? 'rgba(197,228,120,0.07)' : 'transparent'}`) },
          h('span', { style: st(`width:3px; flex:none; background:${ln.on ? V.entity : 'transparent'}`) }),
          h('span', { style: st(`width:30px; flex:none; text-align:right; padding-right:14px; color:${V.ln}`) }, ln.n),
          h('span', { style: st('min-width:0; white-space:pre-wrap; word-break:break-all; padding-right:16px') },
            ln.toks.map((x, i) => x.caret
              ? h('span', { key: i, style: st(`display:inline-block; width:2px; height:1.15em; margin-left:1px; vertical-align:-0.2em; background:${V.primary}; opacity:${x.o}`) })
              : h('span', { key: i, style: st(`color:${x.c}`) }, x.t)))))),
      h('div', { style: st('flex:1; position:relative; overflow:hidden; border-top:1px solid #243044; background:repeating-linear-gradient(45deg, #172030 0 8px, #1c2535 8px 16px); padding:34px 24px 28px; display:flex; justify-content:center; align-items:center') },
        h('div', { style: st(`position:relative; width:100%; max-width:430px; display:flex; gap:14px; background:${V.surface}; border:1.5px solid ${entityOn ? V.entity : '#38455e'}; border-radius:10px; padding:12px; opacity:${clamp(ph / 250) * (1 - so)}; transform:translateY(${cardOff.toFixed(1)}px)`) },
          h('div', { style: st('position:absolute; top:-10px; left:12px; display:flex; gap:6px') },
            entityOn ? h(Pill, { bg: V.entity }, 'article') : null,
            impOn ? h(Pill, { bg: V.action }, 'impression') : null),
          h('div', { style: st('flex:none; width:112px; min-height:86px; border-radius:6px; overflow:hidden; position:relative; background:#2e3a50') }, h(Thumb, { art })),
          h('div', { style: st('flex:1; min-width:0; display:flex; flex-direction:column; gap:4px') },
            h('span', { style: st(`align-self:flex-start; ${MONO}; font-size:10.5px; letter-spacing:0.04em; text-transform:uppercase; color:${V.fg2}; border-radius:3px; padding:0 3px; margin-left:-3px; outline:1.5px solid ${catOn ? V.prop : 'transparent'}; box-shadow:${catOn ? propGlow : 'none'}`) }, art.kicker),
            h('span', { style: st('font-size:15px; font-weight:600; line-height:1.3; text-wrap:pretty') },
              h('span', { style: st(`border-radius:3px; outline:1.5px solid ${propsOn ? V.prop : 'transparent'}; outline-offset:1px; box-shadow:${propsOn ? propGlow : 'none'}`) }, art.title)),
            h('div', { style: st('margin-top:auto; padding-top:6px; display:flex; align-items:center; gap:8px') },
              h('span', { style: st(`position:relative; font-size:13px; font-weight:500; color:${V.primary}; padding:1px 5px; margin-left:-5px; border-radius:5px; outline:1.5px solid ${actionOn ? V.action : 'transparent'}`) }, 'Open →',
                h('span', { style: st(`position:absolute; left:${(22 + (1 - m) * 190).toFixed(1)}px; top:${(11 - (1 - m) * 80).toFixed(1)}px; width:22px; height:22px; margin:-11px 0 0 -11px; pointer-events:none; opacity:${curOp}`) },
                  h('span', { style: st(`position:absolute; inset:0; border-radius:50%; border:2px solid ${V.entity}; opacity:${ph >= P.click ? ((1 - rp) * 0.9).toFixed(3) : 0}; transform:scale(${(1 + rp * 1.8).toFixed(3)})`) }),
                  h('span', { style: st(`position:absolute; inset:0; border-radius:50%; background:rgba(255,255,255,0.22); border:2px solid rgba(255,255,255,0.9); box-shadow:0 4px 14px rgba(0,0,0,0.4); transform:scale(${press ? 0.8 : 1})`) })))))))),
    // live events table
    h('div', { style: st(`flex:1 1 400px; min-width:0; background:#1e2839; border:1px solid ${V.surface}; border-radius:12px; overflow:hidden; display:flex; flex-direction:column`) },
      h('div', { style: st(`display:flex; justify-content:space-between; align-items:center; gap:12px; padding:12px 16px; border-bottom:1px solid ${V.surface}; ${MONO}; font-size:12px`) },
        h('span', { style: st(`color:${V.fg2}`) }, h('span', { style: st(`color:${V.action}`) }, 'SELECT'), ' * ', h('span', { style: st(`color:${V.action}`) }, 'FROM'), ' ', h('span', { style: st(`color:${V.fg}`) }, 'walkerOS.events')),
        h('span', { style: st(`display:flex; align-items:center; gap:7px; color:${V.entity}`) }, h('span', { style: st(`width:7px; height:7px; border-radius:50%; background:${V.entity}`) }), 'live')),
      h('div', { style: st('flex:1; position:relative; min-height:300px') },
        h('div', { style: st(`position:absolute; inset:0; overflow-x:auto; overflow-y:hidden; ${MONO}; font-size:12px`) },
          h('div', { style: st('min-width:454px') },
            h('div', { style: st(`${grid}; background:#243044; border-bottom:1px solid ${V.border}`) },
              h('span', { style: st(`padding:8px 10px; ${cellR}; color:${V.comment}; font-size:11px; text-align:right`) }, 'Row'),
              h('span', { style: st(`padding:8px 10px; ${cellR}; display:flex; flex-direction:column; gap:1px`) }, h('span', { style: st(`color:${V.fg}`) }, 'name'), h('span', { style: st(`color:${V.comment}; font-size:10px`) }, 'STRING')),
              h('span', { style: st('padding:8px 10px; display:flex; flex-direction:column; gap:1px') }, h('span', { style: st(`color:${V.fg}`) }, 'data'), h('span', { style: st(`color:${V.comment}; font-size:10px`) }, 'JSON'))),
            rows.map(r => h('div', { key: r.key, style: st(`${grid}; border-bottom:1px solid ${V.surface}; background:${r.bg}; opacity:${r.op}; transform:${r.ty}; line-height:1.4`) },
              h('span', { style: st(`padding:10px; ${cellR}; color:${V.comment}; text-align:right`) }, r.n),
              h('span', { style: st(`padding:10px; ${cellR}; color:${V.fg}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis`) }, r.name),
              h('span', { style: st(`padding:10px; color:${V.punct}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis`) },
                '{"', h('span', { style: st(`color:${V.glob}`) }, 'title'), '":"', h('span', { style: st(`color:${V.str}`) }, r.title), '","',
                h('span', { style: st(`color:${V.glob}`) }, 'category'), '":"', h('span', { style: st(`color:${V.str}`) }, r.cat), '"}'))),
            skeletons.map(s => h('div', { key: 's' + s.n, style: st(`${grid}; border-bottom:1px solid ${V.surface}; line-height:1.4`) },
              h('span', { style: st(`padding:10px; ${cellR}; color:${V.ln}; text-align:right`) }, s.n),
              h('span', { style: st(`padding:10px; ${cellR}; display:flex; align-items:center`) }, h('span', { style: st(`height:8px; width:75%; border-radius:4px; background:${V.surface}`) })),
              h('span', { style: st('padding:10px; display:flex; align-items:center') }, h('span', { style: st(`height:8px; width:${s.w}; border-radius:4px; background:#253145`) })))))))));
}

/* ───────────── ArticleTeaserTracking ───────────── */
const AC = { kw: V.action, tag: V.tag, at: V.glob, p: V.punct, s: V.str, x: V.fg };
const TY = { entity: [V.entity, 'rgba(197,228,120,'], action: [V.action, 'rgba(199,146,234,'], prop: [V.prop, 'rgba(240,113,127,'], ctx: [V.ctx, 'rgba(242,166,90,'], glob: [V.glob, 'rgba(127,196,234,'] };
const at = (t, c, hl) => ({ t, c, h: !!hl });
const F = (step, name, kind) => ({ step, file: true, name, kind });
const L = (step, toks, fx, type) => ({ step, toks, fx, type });
function buildItems() {
  const it = [
    F(1, 'Link.tsx', 'atom'),
    L(1, [at('export const', AC.kw), at(' Link ', AC.x), at('= ({ href, children }) => (', AC.p)]),
    L(1, [at('  '), at('<a', AC.tag), at(' '), at('href', AC.at), at('={href} ', AC.p), at('data-elbaction', AC.at, 1), at('=', AC.p), at('"click:open"', AC.s, 1), at('>', AC.tag)], 'action', 'action'),
    L(1, [at('    '), at('{children}', AC.p)]),
    L(1, [at('  '), at('</a>', AC.tag)]),
    L(1, [at(');', AC.p)]),
    F(2, 'ArticleTeaser.tsx', 'molecule'),
    L(2, [at('export const', AC.kw), at(' ArticleTeaser ', AC.x), at('= ({', AC.p)]),
    L(2, [at('  title, category, image, url, position,', AC.p)]),
    L(2, [at('}) => (', AC.p)]),
    L(2, [at('  '), at('<article', AC.tag), at(' '), at('data-elb', AC.at, 1), at('=', AC.p), at('"article"', AC.s, 1)], 'entity', 'entity'),
    L(2, [at('    '), at('data-elb-article', AC.at, 1), at('={`', AC.p), at('position:${position}', AC.s, 1), at('`}', AC.p), at('>', AC.tag)], 'pos', 'prop'),
    L(2, [at('    '), at('<img', AC.tag), at(' '), at('src', AC.at), at('={image} ', AC.p), at('/>', AC.tag)], 'img'),
    L(2, [at('    '), at('<span', AC.tag), at(' '), at('data-elb-article', AC.at, 1), at('=', AC.p), at('"category:#innerText"', AC.s, 1), at('>', AC.tag), at('{category}', AC.p), at('</span>', AC.tag)], 'cat', 'prop'),
    L(2, [at('    '), at('<h3', AC.tag), at(' '), at('data-elb-article', AC.at, 1), at('=', AC.p), at('"title:#innerText"', AC.s, 1), at('>', AC.tag), at('{title}', AC.p), at('</h3>', AC.tag)], 'title', 'prop'),
    L(2, [at('    '), at('<Link', AC.tag), at(' '), at('href', AC.at), at('={url}', AC.p), at('>', AC.tag), at('Open →', AC.x), at('</Link>', AC.tag)]),
    L(2, [at('  '), at('</article>', AC.tag)]),
    L(2, [at(');', AC.p)]),
  ];
  [[3, 'HomeFeed.tsx', 'homefeed', 'stories', 'home'], [4, 'RelatedStories.tsx', 'related', 'related', 'related']].forEach(([s, f, ctx, arr, fx]) => it.push(
    F(s, f, 'organism'),
    L(s, [at('<section', AC.tag), at(' '), at('data-elbcontext', AC.at, 1), at('=', AC.p), at('"list:' + ctx + '"', AC.s, 1), at('>', AC.tag)], fx, 'ctx'),
    L(s, [at('  {' + arr + '.map((s, i) => ', AC.p), at('<ArticleTeaser', AC.tag), at(' {...s} ', AC.p), at('position', AC.at), at('={i + 1} ', AC.p), at('/>', AC.tag), at(')}', AC.p)]),
    L(s, [at('</section>', AC.tag)]),
  ));
  [['HomePage.tsx', 'homepage', 'HomeFeed', 'gHome'], ['ArticlePage.tsx', 'article', 'RelatedStories', 'gArt']].forEach(([file, pt, org, fx]) => it.push(
    F(5, file, 'template'),
    L(5, [at('<main', AC.tag), at(' '), at('data-elbglobals', AC.at, 1), at('=', AC.p), at('"pagetype:' + pt + '"', AC.s, 1), at('>', AC.tag)], fx, 'glob'),
    L(5, [at('  '), at('<' + org + ' />', AC.tag)]),
    L(5, [at('</main>', AC.tag)]),
  ));
  return it;
}
const ITEMS = buildItems();
const HOME = [{ kicker: 'Tech', title: 'Return of the Bug' }, { kicker: 'Tech', title: 'The quiet return of RSS' }, { kicker: 'Food', title: 'Why sourdough came back' }];
const RELATED = [{ kicker: 'Tech', title: 'The quiet return of RSS' }, { kicker: 'Science', title: 'A year on the ice shelf' }, { kicker: 'Culture', title: 'Small venues, big nights' }];
const STEPS = [[1, 'Atom'], [2, 'Molecule'], [3, 'HomeFeed'], [4, 'RelatedStories'], [5, 'Pages']];
const CAPTIONS = {
  1: 'Atom. Link carries the click:open action wherever it is rendered.',
  2: 'Molecule. ArticleTeaser makes each card an article entity and reads category and title from its elements.',
  3: 'Organism. HomeFeed wraps three teasers and adds list:homefeed context to their events.',
  4: 'Organism. RelatedStories reuses the same ArticleTeaser and adds list:related context.',
  5: 'Pages. Each page template sets pagetype as a global, which is added to every event on that page.',
};
const aglow = rgba => '0 0 10px 1px ' + rgba + '0.5)';

class ArticleTeaserTracking extends React.Component {
  constructor(p) {
    super(p);
    this.state = { n: p.initialStep ? this.stepEnd(p.initialStep) : 0 };
    this.codeRef = React.createRef();
  }
  get auto() { return this.props.autoplay ?? true; }
  get speed() { return this.props.speed ?? 1; }
  stepEnd(k) { let last = ITEMS.findIndex(x => x.step === k); while (ITEMS[last + 1] && ITEMS[last + 1].step === k) last++; return last + 1; }
  componentDidMount() {
    const go = () => this.schedule(800);
    const el = this.codeRef.current;
    if (!el || !window.IntersectionObserver) return go();
    this.io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { this.io.disconnect(); go(); } }, { threshold: 0.35 });
    this.io.observe(el);
  }
  componentWillUnmount() { clearTimeout(this.tm); clearTimeout(this.st); this.io && this.io.disconnect(); }
  componentDidUpdate(pp) { if (pp.autoplay !== this.props.autoplay && this.auto) this.schedule(500); }
  scrollToCurrent(n) {
    clearTimeout(this.st);
    this.st = setTimeout(() => {
      const el = this.codeRef.current; if (!el) return;
      const tgt = el.querySelector('[data-ln="' + (n - 1) + '"]');
      if (!tgt) { el.scrollTo({ top: 0, behavior: 'smooth' }); return; }
      const y = tgt.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop;
      el.scrollTo({ top: Math.max(0, y - el.clientHeight / 2), behavior: 'smooth' });
    }, 400);
  }
  setN(n) { this.setState({ n }); this.scrollToCurrent(n); }
  schedule(ms) { clearTimeout(this.tm); this.tm = setTimeout(() => this.advance(), ms / this.speed); }
  advance() {
    if (!this.auto) return;
    const n = this.state.n;
    if (n >= ITEMS.length) return;
    const s = ITEMS[n].step;
    if (ITEMS[n].file && (n === 0 || ITEMS[n - 1].step !== s)) { this.setN(n + 1); this.schedule(1300); return; }
    let j = n;
    while (j < ITEMS.length && ITEMS[j].step === s && !ITEMS[j].fx) j++;
    if (j < ITEMS.length && ITEMS[j].step === s) j++;
    this.setN(j);
    const nx = ITEMS[j];
    if (!nx) return;
    this.schedule(1700 + (nx.step !== s ? 1600 : 0));
  }
  jump(k) {
    const first = ITEMS.findIndex(x => x.step === k);
    if (this.auto) { this.setN(first); this.schedule(250); } else this.setN(this.stepEnd(k));
  }
  render() {
    const n = Math.min(this.state.n, ITEMS.length);
    const visStep = n ? ITEMS[n - 1].step : 0;
    const cur = Math.max(1, visStep);
    const seen = new Set(ITEMS.slice(0, n).map(x => x.fx).filter(Boolean));
    const f = {}; ['action', 'entity', 'pos', 'img', 'cat', 'title', 'home', 'related', 'gHome', 'gArt'].forEach(x => f[x] = seen.has(x));
    let num = 0, firstFile = true;
    const lines = ITEMS.map((it, i) => {
      const vis = it.step <= visStep, on = i < n, isCur = i === n - 1 && !!it.fx, dim = vis && it.step < cur;
      const wrap = st(`overflow:hidden; max-height:${vis ? (it.file ? '44px' : '24px') : '0px'}; opacity:${vis ? (dim ? 0.45 : 1) : 0}; transition:max-height .35s ease, opacity .35s ease`);
      if (it.file) {
        num = 0;
        const sep = firstFile ? 'transparent' : V.surface; firstFile = false;
        return h('div', { key: i, 'data-ln': i, style: wrap },
          h('div', { style: st(`padding:14px 16px 4px 19px; display:flex; justify-content:space-between; gap:10px; border-top:1px solid ${sep}`) },
            h('span', { style: st(`color:${V.primary}`) }, it.name), h('span', { style: st(`color:${V.comment}`) }, it.kind)));
      }
      num++;
      const ty = it.type && TY[it.type];
      return h('div', { key: i, 'data-ln': i, style: wrap },
        h('div', { style: st(`display:flex; align-items:stretch; background:${isCur ? (ty ? ty[1] + '0.10)' : 'rgba(255,255,255,0.04)') : 'transparent'}; transition:background .35s`) },
          h('span', { style: st(`width:3px; flex:none; background:${ty && on ? ty[0] : 'transparent'}; transition:background .35s`) }),
          h('span', { style: st(`width:26px; flex:none; text-align:right; padding-right:12px; color:${V.ln}; line-height:1.8`) }, num),
          h('span', { style: st('white-space:pre; line-height:1.8; padding-right:16px') },
            it.toks.map((k, j) => h('span', { key: j, style: st(`color:${k.c || AC.p}; background:${k.h && ty && on ? ty[1] + '0.16)' : 'transparent'}; border-radius:3px; transition:background .35s`) }, k.t)))));
    });
    const card = (c, i) => h('div', { key: i, style: st(`position:relative; min-height:224px; border-radius:10px; padding:10px; display:flex; flex-direction:column; gap:8px; border:1.5px ${f.entity ? 'solid' : 'dashed'} ${f.entity ? V.entity : '#2b374c'}; background:${f.entity ? V.surface : 'transparent'}; transition:all .45s ease`) },
      h('span', { style: st('position:absolute; top:-10px; left:10px; display:flex; gap:4px') },
        h('span', { style: st(`padding:1px 7px; border-radius:4px; background:${V.entity}; color:#1a2232; ${MONO}; font-size:10.5px; font-weight:500; line-height:17px; opacity:${f.entity ? 1 : 0}; transition:opacity .4s`) }, 'article'),
        h('span', { style: st(`padding:0 6px; border-radius:4px; border:1.5px solid ${V.prop}; background:#1a2232; color:${V.prop}; ${MONO}; font-size:10.5px; line-height:16px; opacity:${f.pos ? 1 : 0}; transition:opacity .4s`) }, i + 1)),
      h('div', { style: st(`height:86px; flex:none; border-radius:6px; overflow:hidden; position:relative; background:repeating-linear-gradient(45deg, #2e3a50 0 6px, #323f56 6px 12px); display:flex; align-items:center; justify-content:center; ${MONO}; font-size:10.5px; color:${V.comment}; opacity:${f.img ? 1 : 0}; transition:opacity .45s`) }, 'photo'),
      h('span', { style: st(`align-self:flex-start; padding:1px 6px; border-radius:4px; background:#334058; color:#c3c9d9; ${MONO}; font-size:10.5px; letter-spacing:0.04em; text-transform:uppercase; opacity:${f.cat ? 1 : 0}; outline:1.5px solid ${f.cat ? V.prop : 'transparent'}; box-shadow:${f.cat ? aglow(TY.prop[1]) : 'none'}; transition:all .45s`) }, c.kicker),
      h('span', { style: st(`align-self:flex-start; font-size:14px; font-weight:600; line-height:1.3; text-wrap:pretty; border-radius:3px; outline:1.5px solid ${f.title ? V.prop : 'transparent'}; outline-offset:2px; box-shadow:${f.title ? aglow(TY.prop[1]) : 'none'}; opacity:${f.title ? 1 : 0}; transition:all .45s`) }, c.title),
      h('span', { style: st(`margin-top:auto; align-self:flex-start; padding:2px 6px; margin-left:-6px; border-radius:4px; font-size:13px; font-weight:500; color:${V.primary}; outline:1.5px solid ${f.action ? V.action : 'transparent'}; box-shadow:${f.action ? aglow(TY.action[1]) : 'none'}; opacity:${f.action ? 1 : 0}; transition:all .45s`) }, 'Open →'));
    const pill = (bg, txt, op) => h('span', { style: st(`padding:1px 7px; border-radius:4px; background:${bg}; color:#1a2232; ${MONO}; font-size:10.5px; font-weight:500; line-height:17px; opacity:${op}; transition:opacity .5s`) }, txt);
    const group = (on, label, listOn, header, ctx, cards) =>
      h('div', { style: st(`position:relative; border-radius:16px; padding:12px; border:1.5px dashed ${on ? V.glob : 'transparent'}; background:${on ? 'rgba(127,196,234,0.04)' : 'transparent'}; transition:all .5s`) },
        h('span', { style: st('position:absolute; top:-10px; left:14px') }, pill(V.glob, label, on ? 1 : 0)),
        h('div', { style: st(`border-radius:12px; padding:14px; display:flex; flex-direction:column; gap:16px; border:1.5px solid ${listOn ? V.ctx : '#243044'}; background:${listOn ? 'rgba(242,166,90,0.05)' : 'transparent'}; transition:all .5s`) },
          h('div', { style: st(`display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; min-height:19px; opacity:${listOn ? 1 : 0}; transition:opacity .5s`) }, header, pill(V.ctx, ctx, 1)),
          h('div', { style: st('display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:12px') }, cards.map(card))));
    const legend = [['entity', V.entity], ['action', V.action], ['property', V.prop], ['context', V.ctx], ['globals', V.glob]];

    return h('div', { className: 'wos-viz', style: st(`${SANS}; color:${V.fg}; width:100%; background:${V.bg}; border-radius:16px; padding:24px; display:flex; flex-direction:column; gap:18px`) },
      h('div', { style: st('display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px 20px') },
        h('div', { style: st('display:flex; flex-wrap:wrap; gap:8px') }, STEPS.map(([k, label]) => {
          const a = k === cur, done = k < cur;
          return h('button', { key: k, type: 'button', onClick: () => this.jump(k), 'aria-pressed': a,
            style: st(`display:flex; align-items:center; gap:8px; padding:6px 12px 6px 6px; border-radius:999px; border:1px solid ${a ? V.entity : V.border}; background:${a ? 'rgba(197,228,120,0.10)' : 'transparent'}; color:${a ? V.fg : V.fg2}; ${SANS}; font-size:13px; font-weight:500; cursor:pointer; transition:all .3s`) },
            h('span', { style: st(`width:20px; height:20px; border-radius:50%; background:${a ? V.entity : done ? V.comment : V.border}; color:#1a2232; font-weight:600; font-size:11px; line-height:20px; text-align:center; transition:all .3s`) }, k),
            h('span', null, label));
        })),
        h('div', { style: st(`display:flex; flex-wrap:wrap; gap:14px; ${MONO}; font-size:11px; color:${V.fg2}`) },
          legend.map(([n, c]) => h('span', { key: n, style: st('display:flex; align-items:center; gap:6px') }, h('span', { style: st(`width:9px; height:9px; border-radius:2px; background:${c}`) }), n)))),
      h('div', { style: st('font-size:15px; line-height:1.5; color:#c3c9d9; min-height:23px; text-wrap:pretty') }, CAPTIONS[cur]),
      h('div', { style: st('display:flex; flex-wrap:wrap; gap:16px; align-items:stretch') },
        h('div', { style: st(`flex:1 1 380px; min-width:0; align-self:flex-start; position:sticky; top:16px; background:${V.code}; border:1px solid ${V.border}; border-radius:12px; overflow:hidden; padding:4px 0 10px`) },
          h('div', { ref: this.codeRef, style: st(`position:relative; overflow:auto; max-height:min(640px, calc(100vh - 48px)); ${MONO}; font-size:12px`) }, lines)),
        h('div', { style: st('flex:1.1 1 420px; min-width:0; display:flex; flex-direction:column; gap:24px; padding-top:10px; align-self:flex-start') },
          group(f.gHome, 'pagetype:homepage', f.home,
            h('span', { style: st(`${MONO}; font-size:12px; color:${V.fg2}`) }, '<HomeFeed /> · homepage'), 'list:homefeed', HOME),
          group(f.gArt, 'pagetype:article', f.related,
            h('span', { style: st('display:flex; align-items:center; gap:10px') }, h('span', { style: st(`${MONO}; font-size:12px; color:${V.fg2}`) }, '<RelatedStories /> · article page'), h('span', { style: st('font-size:14px; font-weight:600') }, 'Related stories')),
            'list:related', RELATED))));
  }
}

Object.assign(window.WalkerOS = window.WalkerOS || {}, { HeroTaggingViz, ArticleTeaserTracking, DestinationMappingViz });
