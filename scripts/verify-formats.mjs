// Side-by-side QA page: Plush runtime vs lottie-web (official player) vs exported animated SVG, same frames.
import { readFileSync, writeFileSync } from 'node:fs';
import { animations } from '../src/library/index.js';
import { toLottie } from '../src/exporters/lottie.js';
import { toSvg } from '../src/exporters/svg.js';

const [out, only, framesArg = '0.35,0.7'] = process.argv.slice(2);
const runtime = readFileSync(new URL('../src/runtime/plush-player.js', import.meta.url), 'utf8').replace(/^export \{[^}]*\};?\s*$/m, '');
const list = animations.filter((a) => !only || only.split(',').includes(a.id));
const fractions = framesArg.split(',').map(Number);
const items = list.map((a) => ({ a, lottie: toLottie(a), svg: toSvg(a) }));
const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;font:11px system-ui;background:#fff}
.row{display:flex;gap:6px;padding:4px;align-items:center}.cell{width:150px;height:150px;position:relative;background:#f4f4f6}
.cell>*{width:100%!important;height:100%!important;display:block}.cell span{position:absolute;left:3px;top:2px;width:auto!important;height:auto!important;z-index:2}
b{width:110px}</style><body>
<script src="https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js"></script>
<script>window.onerror=(m,s,l,c,e)=>{document.body.insertAdjacentHTML("afterbegin","<pre id=err>"+(e&&e.stack||m)+"</pre>")};
${runtime}
const ITEMS=${JSON.stringify(items)};const FR=${JSON.stringify(fractions)};
for(const {a,lottie:ld,svg} of ITEMS){for(const fr of FR){const f=Math.round(a.frames*fr);
 const row=document.createElement('div');row.className='row';row.innerHTML='<b>'+a.id+' @'+f+'</b>';document.body.append(row);
 const c1=document.createElement('div');c1.className='cell';const cv=document.createElement('canvas');cv.width=300;cv.height=300;c1.append(cv);c1.insertAdjacentHTML('beforeend','<span>plush</span>');row.append(c1);
 renderFrame(cv.getContext('2d'),a,f,300,300);
 const c2=document.createElement('div');c2.className='cell';row.append(c2);c2.insertAdjacentHTML('beforeend','<span>lottie-web</span>');
 const host=document.createElement('div');c2.prepend(host);
 const anim=lottie.loadAnimation({container:host,renderer:'svg',loop:false,autoplay:false,animationData:JSON.parse(JSON.stringify(ld))});
 anim.goToAndStop(f,true);
 const c3=document.createElement('div');c3.className='cell';c3.innerHTML=svg;c3.insertAdjacentHTML('beforeend','<span>svg</span>');row.append(c3);
 const el=c3.querySelector('svg');el.pauseAnimations();el.setCurrentTime(f/a.fps);
}}
</script>`;
writeFileSync(out, html);
