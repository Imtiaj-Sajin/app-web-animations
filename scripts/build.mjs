// Builds the website and every downloadable file into dist/.
import { cpSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { animations, packs, singles } from '../src/library/index.js';
import { toLottie } from '../src/exporters/lottie.js';
import { toDotLottie } from '../src/exporters/dotlottie.js';
import { toSvg } from '../src/exporters/svg.js';
import { toVanilla, toWebComponent, toReact, pascal, tagName } from '../src/exporters/web.js';
import { toSwift, toKotlin, SWIFT_RUNTIME, KOTLIN_RUNTIME } from '../src/exporters/native.js';
import { zip } from '../src/exporters/zip.js';
import { validate } from './validate.mjs';

const root = new URL('../', import.meta.url);
const dist = new URL('dist/', root);
const at = (p) => new URL(p, dist);

const problems = animations.flatMap(validate);
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}

rmSync(dist, { recursive: true, force: true });
mkdirSync(at('downloads/packs/'), { recursive: true });
cpSync(new URL('site/', root), dist, { recursive: true });
mkdirSync(at('runtime/'), { recursive: true });
mkdirSync(at('vendor/'), { recursive: true });
cpSync(new URL('src/runtime/plush-player.js', root), at('runtime/plush-player.js'));
cpSync(new URL('src/runtime/PlushRuntime.swift', root), at('runtime/PlushRuntime.swift'));
cpSync(new URL('src/runtime/PlushRuntime.kt', root), at('runtime/PlushRuntime.kt'));
cpSync(new URL('node_modules/mediabunny/dist/bundles/mediabunny.min.mjs', root), at('vendor/mediabunny.min.mjs'));
cpSync(new URL('node_modules/gifenc/dist/gifenc.esm.js', root), at('vendor/gifenc.esm.js'));

const LICENSE = `Plush Motion — free animation library
Copyright (c) 2026 Plush Motion contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
associated files, to deal in them without restriction, including commercial use, modification,
distribution and sublicensing, provided this notice is included in copies of the source files.
Attribution in your product is appreciated but not required.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
`;

function readme(a) {
  const P = pascal(a.id);
  const other = Object.keys(a.states).find((s) => s !== a.initial) ?? a.initial;
  return `# ${a.name} — Plush Motion

${a.description}

States: ${Object.entries(a.states).map(([k, s]) => `\`${k}\`${s.loop ? ' (loop)' : ''}`).join(', ')}

| File | Use it for |
| --- | --- |
| \`${a.id}.wc.js\` | Any website: \`<script type="module" src="${a.id}.wc.js"></script>\` then \`<${tagName(a.id)}></${tagName(a.id)}>\` |
| \`${P}.jsx\` | React / Next.js: \`import ${P} from './${P}'\` → \`<${P} />\` |
| \`${a.id}.js\` | Plain JS: \`mount(element)\` returns a player (\`play('${other}')\`, \`pause()\`…) |
| \`${a.id}.json\` | Lottie — lottie-web, lottie-ios, lottie-android, React Native, Flutter, Webflow, Framer |
| \`${a.id}.lottie\` | dotLottie — same as above, zipped and smaller |
| \`${a.id}.svg\` | Animated SVG — works in \`<img>\`, email-safe-ish, Notion, GitHub READMEs |
| \`${P}View.swift\` + \`PlushRuntime.swift\` | SwiftUI (iOS 15+) |
| \`${P}.kt\` + \`PlushRuntime.kt\` | Jetpack Compose |
| \`${a.id}.plush.json\` | Raw Plush data for the JS runtime |

Lottie markers are named after the states, e.g. \`anim.goToAndPlay('${other}', true)\`.
MP4, WebM and GIF versions can be rendered at any size on the website.
`;
}

const catalog = { generated: new Date().toISOString().slice(0, 10), packs, singles, animations: [] };
const allEntries = [];

for (const a of animations) {
  const dir = `downloads/${a.id}/`;
  mkdirSync(at(dir), { recursive: true });
  const P = pascal(a.id);
  const lottie = toLottie(a);
  const files = {
    [`${a.id}.json`]: JSON.stringify(lottie),
    [`${a.id}.lottie`]: toDotLottie(a, lottie),
    [`${a.id}.svg`]: toSvg(a),
    [`${a.id}.js`]: toVanilla(a),
    [`${a.id}.wc.js`]: toWebComponent(a),
    [`${P}.jsx`]: toReact(a),
    [`${P}View.swift`]: toSwift(a),
    [`${P}.kt`]: toKotlin(a),
    [`${a.id}.plush.json`]: JSON.stringify(a),
  };
  const sizes = {};
  for (const [name, data] of Object.entries(files)) {
    writeFileSync(at(dir + name), data);
    sizes[name] = Buffer.byteLength(data);
  }
  const bundle = [
    ...Object.entries(files).map(([name, data]) => ({ name: `${a.id}/${name}`, data })),
    { name: `${a.id}/PlushRuntime.swift`, data: SWIFT_RUNTIME },
    { name: `${a.id}/PlushRuntime.kt`, data: KOTLIN_RUNTIME },
    { name: `${a.id}/README.md`, data: readme(a) },
  ];
  const zips = {
    all: zip([...bundle, { name: `${a.id}/LICENSE.txt`, data: LICENSE }]),
    swiftui: zip([{ name: `${P}View.swift`, data: files[`${P}View.swift`] }, { name: 'PlushRuntime.swift', data: SWIFT_RUNTIME }]),
    compose: zip([{ name: `${P}.kt`, data: files[`${P}.kt`] }, { name: 'PlushRuntime.kt', data: KOTLIN_RUNTIME }]),
  };
  writeFileSync(at(`${dir}${a.id}-all-formats.zip`), zips.all);
  writeFileSync(at(`${dir}${a.id}-swiftui.zip`), zips.swiftui);
  writeFileSync(at(`${dir}${a.id}-compose.zip`), zips.compose);
  allEntries.push(...bundle.filter((e) => !/PlushRuntime/.test(e.name)));
  catalog.animations.push({
    ...a, files: sizes, pascal: P, tag: tagName(a.id),
    zips: Object.fromEntries(Object.entries(zips).map(([k, b]) => [k, b.length])),
  });
}

const shared = [
  { name: 'runtime/PlushRuntime.swift', data: SWIFT_RUNTIME },
  { name: 'runtime/PlushRuntime.kt', data: KOTLIN_RUNTIME },
  { name: 'LICENSE.txt', data: LICENSE },
];
for (const pack of packs) {
  const entries = allEntries.filter((e) => pack.items.includes(e.name.split('/')[0]));
  const buf = zip([...entries, ...shared]);
  writeFileSync(at(`downloads/packs/${pack.id}.zip`), buf);
  pack.zipSize = buf.length;
}
const everything = zip([...allEntries, ...shared]);
writeFileSync(at('downloads/plush-everything.zip'), everything);
catalog.everythingSize = everything.length;

mkdirSync(at('data/'), { recursive: true });
writeFileSync(at('data/catalog.json'), JSON.stringify(catalog));

const total = animations.length;
console.log(`Built ${total} animations × 9 formats, ${packs.length} packs → dist/ (everything.zip ${(everything.length / 1024).toFixed(0)} KB)`);
