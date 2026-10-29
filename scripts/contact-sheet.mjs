// Renders a contact sheet (N frames per animation) to an HTML file for visual QA in headless Chrome.
import { readFileSync, writeFileSync } from 'node:fs';
import { animations } from '../src/library/index.js';

const [out, only, cols = '8'] = process.argv.slice(2);
const runtime = readFileSync(new URL('../src/runtime/plush-player.js', import.meta.url), 'utf8').replace(/^export \{[^}]*\};?\s*$/m, '');
const list = animations.filter((a) => !only || only.split(',').includes(a.id));
const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#fff;font:12px system-ui}
.row{display:flex;gap:4px;padding:4px;align-items:center}.row b{width:90px}canvas{border:1px solid #eee}</style>
<body><script>${runtime}
const LIST=${JSON.stringify(list)};const N=${Number(cols)};
for(const a of LIST){const row=document.createElement('div');row.className='row';row.innerHTML='<b>'+a.id+'</b>';document.body.append(row);
 for(let k=0;k<N;k++){const f=Math.round(k*a.frames/N);const c=document.createElement('canvas');const H=150;c.height=H;c.width=Math.round(H*a.w/a.h);
  row.append(c);renderFrame(c.getContext('2d'),a,f,c.width,c.height,{background:a.bg});const ctx=c.getContext('2d');ctx.fillStyle='#000';ctx.fillText(f,4,12);}}
</script>`;
writeFileSync(out, html);
