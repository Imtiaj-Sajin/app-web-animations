import { createPlayer } from './runtime/plush-player.js';

const $ = (sel, root = document) => root.querySelector(sel);
const h = (tag, props = {}, ...children) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.entries(v).forEach(([p, val]) => el.style.setProperty(p, val));
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  el.append(...children.flat().filter((c) => c != null && c !== false));
  return el;
};
const kb = (bytes) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

const catalog = await fetch('data/catalog.json').then((r) => r.json());
const byId = Object.fromEntries(catalog.animations.map((a) => [a.id, a]));
const packOf = (id) => catalog.packs.find((p) => p.items.includes(id));

// ---------------------------------------------------------------- nav + hero

const nav = $('.nav');
const onScroll = () => nav.toggleAttribute('data-scrolled', scrollY > 8);
addEventListener('scroll', onScroll, { passive: true });
onScroll();

document.querySelectorAll('[data-everything-size]').forEach((el) => (el.textContent = `· ${kb(catalog.everythingSize)}`));
$('[data-stat="animations"]').textContent = catalog.animations.length;

createPlayer($('#hero-canvas'), byId['buddies-trio']);

// ---------------------------------------------------------------- formats row

const FORMAT_CHIPS = [
  ['React', '#61DAFB'], ['Web Component', '#2F6BFF'], ['Vanilla JS', '#F6B92B'], ['Lottie', '#00C1A2'],
  ['dotLottie', '#00A389'], ['Animated SVG', '#FF9A3C'], ['MP4', '#FF3B5C'], ['WebM', '#8B5CF6'],
  ['GIF', '#F0663A'], ['SwiftUI', '#F05138'], ['Jetpack Compose', '#3DDC84'],
];
$('[data-formats]').append(
  ...FORMAT_CHIPS.map(([name, c]) => h('li', { style: { '--c': c } }, h('i'), name)),
  h('li', { class: 'soon', style: { '--c': '#888' } }, h('i'), 'Rive ', h('small', {}, 'soon')),
);

// ---------------------------------------------------------------- packs

$('[data-packs]').append(...catalog.packs.map((pack) => {
  const stage = h('div', { class: 'pack-stage', style: { '--n': pack.items.length, '--accent': pack.color } });
  const pk = h('article', { class: 'pack' },
    stage,
    h('div', { class: 'pack-body' },
      h('p', { class: 'count' }, `${pack.items.length} animations · every format`),
      h('h3', {}, pack.name),
      h('p', {}, pack.description),
      h('div', { class: 'pack-actions' },
        h('a', { class: 'btn btn-ink btn-sm', href: `downloads/packs/${pack.id}.zip`, download: true }, `Download · ${kb(pack.zipSize)}`),
        h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => { setFilter(`pack:${pack.id}`); $('#library').scrollIntoView(); } }, 'Browse pack'),
      ),
    ),
  );
  for (const id of pack.items) {
    const a = byId[id];
    const c = h('canvas');
    stage.append(h('div', { class: 'mini', style: { '--tint': a.bg } }, c));
    createPlayer(c, a, { interactive: false });
  }
  return pk;
}));

// ---------------------------------------------------------------- library

const grid = $('[data-grid]');
const cards = catalog.animations.map((a) => {
  const canvas = h('canvas');
  const card = h('article', { class: `card${a.w / a.h > 1.5 && a.w > 500 ? ' wide' : ''}`, 'data-id': a.id, 'data-cat': a.category },
    h('div', { class: 'card-stage', style: { '--tint': a.bg } },
      canvas,
      a.interact?.tap ? h('span', { class: 'card-badge' }, a.interact.look ? 'Tap · follows cursor' : 'Tap me') : null,
    ),
    h('div', { class: 'card-meta' },
      h('div', {}, h('h3', {}, a.name), h('p', {}, `${a.category} · ${Object.keys(a.states).length} ${Object.keys(a.states).length === 1 ? 'state' : 'states'}`)),
      h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => openDetail(a.id), 'aria-label': `Get ${a.name}` }, 'Get'),
    ),
  );
  canvas.setAttribute('aria-label', `${a.name} — ${a.description}`);
  createPlayer(canvas, a);
  return card;
});
grid.append(...cards);

const filterBar = $('[data-filters]');
const categories = [...new Set(catalog.animations.map((a) => a.category))];
const filters = [['all', 'All', catalog.animations.length], ...categories.map((c) => [c, c, catalog.animations.filter((a) => a.category === c).length])];
let currentFilter = 'all';
filterBar.append(...filters.map(([key, label, n]) =>
  h('button', { class: 'chip', type: 'button', 'data-filter': key, 'aria-pressed': String(key === 'all'), onclick: () => setFilter(key) }, label, h('span', { class: 'n' }, n)),
));
function setFilter(key) {
  currentFilter = key;
  const pack = key.startsWith('pack:') ? catalog.packs.find((p) => `pack:${p.id}` === key) : null;
  for (const card of cards) {
    const id = card.dataset.id;
    card.hidden = !(key === 'all' || card.dataset.cat === key || (pack && pack.items.includes(id)));
  }
  filterBar.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === key)));
}

// ---------------------------------------------------------------- detail dialog

const dialog = $('#detail');
const stage = $('[data-stage]', dialog);
let detailPlayer = null;
let current = null;

const BACKGROUNDS = [
  ['tint', 'Tinted', null],
  ['white', 'White', '#ffffff'],
  ['dark', 'Dark', '#121218'],
  ['clear', 'Transparent', null],
];

function usage(a) {
  const other = Object.keys(a.states).find((s) => s !== a.initial) ?? a.initial;
  return {
    'Web Component': `<script type="module" src="/${a.id}.wc.js"></script>\n\n<${a.tag}></${a.tag}>\n<${a.tag} state="${other}" style="width: 200px"></${a.tag}>`,
    React: `import ${a.pascal} from './${a.pascal}';\n\nexport default function Hero() {\n  return <${a.pascal} style={{ width: 240 }} />;\n}`,
    'Vanilla JS': `import { mount } from './${a.id}.js';\n\nconst player = mount(document.querySelector('#spot'));\nplayer.play('${other}');`,
    Lottie: `import lottie from 'lottie-web';\n\nconst anim = lottie.loadAnimation({\n  container: document.querySelector('#spot'),\n  path: '/${a.id}.json',\n  loop: true,\n  autoplay: true,\n});\n// States are Lottie markers:\nanim.goToAndPlay('${other}', true);`,
    SVG: `<img src="/${a.id}.svg" alt="${a.name}" width="240">`,
    SwiftUI: `// Add PlushRuntime.swift + ${a.pascal}View.swift\n${a.pascal}View()\n    .frame(width: 200)\n\n${a.pascal}View(state: "${other}")`,
    Compose: `// Add PlushRuntime.kt + ${a.pascal}.kt\n${a.pascal}(Modifier.size(200.dp))\n\n${a.pascal}(state = "${other}")`,
  };
}

function formatGroups(a) {
  const f = a.files;
  const dl = (file) => `downloads/${a.id}/${file}`;
  return [
    {
      title: 'Web',
      rows: [
        { name: 'Web Component', note: 'Any site or framework — one script tag', file: `${a.id}.wc.js` },
        { name: 'React', note: 'Component with props & ref — works in Next.js', file: `${a.pascal}.jsx` },
        { name: 'Vanilla JS', note: 'ES module with a tiny player API', file: `${a.id}.js` },
      ],
    },
    {
      title: 'Lottie & SVG',
      rows: [
        { name: 'Lottie JSON', note: 'lottie-web, iOS, Android, Flutter, Webflow, Framer', file: `${a.id}.json` },
        { name: 'dotLottie', note: 'Compressed Lottie for LottieFiles players', file: `${a.id}.lottie` },
        { name: 'Animated SVG', note: 'Plays inside a plain <img> — no JS', file: `${a.id}.svg` },
      ],
    },
    {
      title: 'Native apps',
      rows: [
        { name: 'SwiftUI', note: 'iOS 15+ · view + shared runtime', href: dl(`${a.id}-swiftui.zip`), size: a.zips?.swiftui },
        { name: 'Jetpack Compose', note: 'Android · composable + shared runtime', href: dl(`${a.id}-compose.zip`), size: a.zips?.compose },
      ],
    },
  ].map((g) => ({ ...g, rows: g.rows.map((r) => ({ ...r, href: r.href ?? dl(r.file), size: r.size ?? f[r.file] })) }));
}

function renderFormats(a) {
  const wrap = $('[data-d-formats]', dialog);
  wrap.replaceChildren(
    ...formatGroups(a).map((g) => h('section', { class: 'fgroup' },
      h('h3', {}, g.title),
      h('div', { class: 'frows' }, ...g.rows.map((r) => h('div', { class: 'frow' },
        h('strong', {}, r.name),
        h('span', { class: 'fnote' }, r.note),
        h('span', { class: 'fside' },
          r.size ? h('span', { class: 'fsize' }, kb(r.size)) : null,
          h('a', { class: 'btn btn-ghost btn-sm', href: r.href, download: true, 'aria-label': `Download ${a.name} as ${r.name}` }, 'Download'),
        ),
      ))),
    )),
    renderVideoGroup(a),
    h('section', { class: 'fgroup' },
      h('h3', {}, 'Rive'),
      h('div', { class: 'frows' }, h('div', { class: 'frow soon' },
        h('strong', {}, 'Rive (.riv)'),
        h('span', { class: 'fnote' }, 'Being rebuilt by hand in the Rive editor'),
        h('span', { class: 'fside' }, h('span', { class: 'fsize' }, 'Coming soon')),
      )),
    ),
  );
}

function renderVideoGroup(a) {
  const size = h('select', { 'aria-label': 'Size' }, ...[480, 720, 1080].map((s) => h('option', { value: s, selected: s === 720 }, `${s}px`)));
  const bg = h('select', { 'aria-label': 'Background' },
    h('option', { value: 'tint' }, 'Tinted'),
    h('option', { value: 'white' }, 'White'),
    h('option', { value: 'clear' }, 'Transparent*'),
  );
  const loops = h('select', { 'aria-label': 'Loops' }, ...[1, 2, 3].map((n) => h('option', { value: n }, `${n}× loop`)));
  const status = h('span', { class: 'fnote' }, 'Rendered in your browser at 60 fps. *WebM & GIF only.');
  const button = (fmt) => h('button', {
    class: 'btn btn-ghost btn-sm progress', type: 'button',
    onclick: async (e) => {
      const btn = e.currentTarget;
      const all = btn.parentElement.querySelectorAll('button');
      all.forEach((b) => (b.disabled = true));
      const background = bg.value === 'tint' ? a.bg : bg.value === 'white' ? '#ffffff' : null;
      try {
        const { exportMedia, saveBlob } = await import('./export.js');
        status.textContent = `Rendering ${fmt.toUpperCase()}…`;
        const blob = await exportMedia(a, fmt, {
          size: Number(size.value), loops: Number(loops.value), background,
          onProgress: (p) => btn.style.setProperty('--p', p),
        });
        saveBlob(blob, `${a.id}-${size.value}.${fmt}`);
        status.textContent = `${fmt.toUpperCase()} ready · ${kb(blob.size)}`;
      } catch (err) {
        console.error(err);
        status.textContent = err.message || 'Rendering failed in this browser.';
      } finally {
        all.forEach((b) => (b.disabled = false));
        btn.style.removeProperty('--p');
      }
    },
  }, fmt.toUpperCase());
  return h('section', { class: 'fgroup' },
    h('h3', {}, 'Video & GIF'),
    h('div', { class: 'frows' },
      h('div', { class: 'frow' },
        h('strong', {}, 'MP4 · WebM · GIF'),
        status,
        h('span', { class: 'fside render-btns' }, button('mp4'), button('webm'), button('gif')),
      ),
      h('div', { class: 'render-opts' }, h('label', {}, 'Size', size), h('label', {}, 'Background', bg), h('label', {}, 'Length', loops)),
    ),
  );
}

let usageTab = 'Web Component';
function renderUsage(a) {
  const snippets = usage(a);
  if (!snippets[usageTab]) usageTab = 'Web Component';
  const tabs = $('[data-d-tabs]', dialog);
  const code = $('[data-d-code]', dialog);
  const show = (name) => {
    usageTab = name;
    code.textContent = snippets[name];
    tabs.querySelectorAll('.tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === name)));
  };
  tabs.replaceChildren(...Object.keys(snippets).map((name) =>
    h('button', { class: 'tab', role: 'tab', type: 'button', 'data-tab': name, onclick: () => show(name) }, name)));
  show(usageTab);
}

$('[data-copy]', dialog).addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  try {
    await navigator.clipboard.writeText($('[data-d-code]', dialog).textContent);
    btn.textContent = 'Copied';
  } catch {
    btn.textContent = 'Press ⌘/Ctrl+C';
  }
  setTimeout(() => (btn.textContent = 'Copy'), 1600);
});

function renderStates(a) {
  const wrap = $('[data-states]', dialog);
  wrap.replaceChildren(...Object.keys(a.states).map((s) =>
    h('button', { class: 'chip', type: 'button', 'data-state': s, 'aria-pressed': String(s === a.initial), onclick: () => detailPlayer?.play(s) }, s)));
}

function markState(name) {
  $('[data-states]', dialog).querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.state === name)));
}

function renderSwatches(a) {
  const wrap = $('[data-swatches]', dialog);
  const set = (key) => {
    stage.dataset.bg = key;
    wrap.querySelectorAll('.swatch').forEach((s) => s.setAttribute('aria-checked', String(s.dataset.bg === key)));
  };
  wrap.replaceChildren(...BACKGROUNDS.map(([key, label]) =>
    h('button', {
      class: `swatch${key === 'clear' ? ' clear' : ''}`, type: 'button', role: 'radio', 'aria-label': `${label} background`, 'data-bg': key,
      style: { background: key === 'tint' ? a.bg : key === 'white' ? '#fff' : key === 'dark' ? '#121218' : undefined },
      onclick: () => set(key),
    })));
  set('tint');
}

function openDetail(id, { push = true } = {}) {
  const a = byId[id];
  if (!a) return;
  current = a;
  const pack = packOf(id);
  stage.style.setProperty('--tint', a.bg);
  $('[data-d-eyebrow]', dialog).textContent = pack ? `${a.category} · ${pack.name} pack` : a.category;
  $('[data-d-title]', dialog).textContent = a.name;
  $('[data-d-desc]', dialog).textContent = a.description;
  $('[data-d-tags]', dialog).replaceChildren(...(a.tags || []).map((t) => h('li', {}, `#${t}`)));
  const all = $('[data-d-all]', dialog);
  all.href = `downloads/${a.id}/${a.id}-all-formats.zip`;
  all.textContent = `Download all formats${a.zips?.all ? ` · ${kb(a.zips.all)}` : ''}`;
  renderStates(a);
  renderSwatches(a);
  renderFormats(a);
  renderUsage(a);
  if (!dialog.open) dialog.showModal();
  detailPlayer?.destroy();
  detailPlayer = createPlayer($('#detail-canvas'), a, { onStateChange: markState });
  if (push) history.pushState({ id }, '', `#/a/${id}`);
}

dialog.addEventListener('close', () => {
  detailPlayer?.destroy();
  detailPlayer = null;
  current = null;
  if (location.hash.startsWith('#/a/')) history.pushState({}, '', location.pathname + location.search);
});
dialog.addEventListener('click', (e) => {
  if (e.target === dialog) dialog.close();
});

function syncFromHash() {
  const m = location.hash.match(/^#\/a\/([\w-]+)/);
  if (m && byId[m[1]]) openDetail(m[1], { push: false });
  else if (dialog.open) dialog.close();
}
addEventListener('popstate', syncFromHash);
syncFromHash();
