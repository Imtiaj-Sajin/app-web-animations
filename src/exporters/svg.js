/*
 * Plush data → self-contained animated SVG (SMIL). No scripts or CSS, so it animates even
 * inside <img src="…svg">, Markdown, Notion, etc. Plays the full timeline on a loop.
 */
import { valueAt } from '../runtime/plush-player.js';

const isAnim = (p) => p !== null && typeof p === 'object' && !Array.isArray(p) && Array.isArray(p.k);
const r2 = (n) => Math.round(n * 100) / 100;
const r4 = (n) => Math.round(n * 10000) / 10000;

function pathString(d) {
  const { v, i, o } = d;
  const n = v.length;
  if (!n) return '';
  let s = `M${r2(v[0][0])} ${r2(v[0][1])}`;
  const segs = d.c ? n : n - 1;
  for (let j = 0; j < segs; j++) {
    const a = v[j], b = v[(j + 1) % n];
    s += `C${r2(a[0] + o[j][0])} ${r2(a[1] + o[j][1])} ${r2(b[0] + i[(j + 1) % n][0])} ${r2(b[1] + i[(j + 1) % n][1])} ${r2(b[0])} ${r2(b[1])}`;
  }
  return d.c ? s + 'Z' : s;
}

const rgb = (c) => `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})`;

/** Expand keys into SMIL-ready (time, value, spline) lists covering 0..1. */
function smilKeys(p, frames, fmt) {
  const k = p.k.slice();
  const out = [];
  const push = (f, v, e) => out.push({ t: Math.min(1, Math.max(0, f / frames)), v: fmt(v), e });
  if (k[0][0] > 0) push(0, k[0][1], null);
  k.forEach(([f, v, e], idx) => {
    const next = k[idx + 1];
    // keySplines must stay within 0..1, so overshooting curves are sampled per frame instead.
    if (Array.isArray(e) && next && e.some((x) => x < 0 || x > 1)) {
      push(f, v, null);
      for (let s = Math.floor(f) + 1; s < next[0]; s++) push(s, valueAt(p, s), null);
      return;
    }
    push(f, v, e === 'h' ? null : e);
    // A hold becomes a flat segment followed by an instant jump.
    if (e === 'h' && next) push(next[0], v, null);
  });
  const lastF = k[k.length - 1][0];
  if (lastF < frames) push(frames, k[k.length - 1][1], null);
  // keyTimes must end exactly at 1
  out[out.length - 1].t = 1;
  out[0].t = 0;
  return out;
}

function animate(attr, p, frames, dur, fmt, tag = 'animate', extra = '') {
  const keys = smilKeys(p, frames, fmt);
  const splines = keys.slice(0, -1).map((k) => (k.e ? k.e.map(r4).join(' ') : '0 0 1 1')).join(';');
  return `<${tag} attributeName="${attr}"${extra} dur="${dur}s" repeatCount="indefinite" calcMode="spline" keyTimes="${keys.map((k) => r4(k.t)).join(';')}" keySplines="${splines}" values="${keys.map((k) => k.v).join(';')}"/>`;
}

/** Sample a prop densely (used for derived values such as trim → dash pattern). */
function sampled(frames, fn) {
  const k = [];
  for (let f = 0; f <= frames; f++) k.push([f, fn(f)]);
  return { k };
}

function transformWrap(tr, inner, frames, dur, opacityAttr = true) {
  if (!tr) return inner;
  const a = tr.a ?? [0, 0], p = tr.p ?? [0, 0], s = tr.s ?? [1, 1], r = tr.r ?? 0, o = tr.o ?? 1;
  const at = (type, prop, fmt, isIdentity) => {
    if (isAnim(prop)) return { anim: animate('transform', prop, frames, dur, fmt, 'animateTransform', ` type="${type}"`) };
    return isIdentity(prop) ? null : { static: `${type}(${fmt(prop)})` };
  };
  const vec = (v) => `${r2(v[0])} ${r2(v[1])}`;
  const neg = (v) => `${r2(-v[0])} ${r2(-v[1])}`;
  const parts = [
    at('translate', p, vec, (v) => !v[0] && !v[1]),
    at('rotate', r, (v) => r2(v), (v) => !v),
    at('scale', s, (v) => `${r4(v[0])} ${r4(v[1])}`, (v) => v[0] === 1 && v[1] === 1),
    at('translate', a, neg, (v) => !v[0] && !v[1]),
  ].filter(Boolean);

  let out = inner;
  // Build from the inside out; consecutive static parts collapse into one transform attribute.
  let pendingStatic = [];
  const flush = () => {
    if (pendingStatic.length) {
      out = `<g transform="${pendingStatic.join(' ')}">${out}</g>`;
      pendingStatic = [];
    }
  };
  for (let n = parts.length - 1; n >= 0; n--) {
    const part = parts[n];
    if (part.static) pendingStatic.unshift(part.static);
    else {
      flush();
      out = `<g>${part.anim}${out}</g>`;
    }
  }
  flush();
  if (opacityAttr && (isAnim(o) || o !== 1)) {
    out = isAnim(o)
      ? `<g>${animate('opacity', o, frames, dur, (v) => r4(v))}${out}</g>`
      : `<g opacity="${r4(o)}">${out}</g>`;
  }
  return out;
}

function nodeSvg(n, frames, dur) {
  if (n.t === 'g') {
    return transformWrap(n.tr, n.c.map((c) => nodeSvg(c, frames, dur)).join(''), frames, dur);
  }
  const attrs = [];
  const kids = [];
  if (isAnim(n.d)) {
    attrs.push(`d="${pathString(n.d.k[0][1])}"`);
    kids.push(animate('d', n.d, frames, dur, pathString));
  } else attrs.push(`d="${pathString(n.d)}"`);

  if (n.fill) {
    if (isAnim(n.fill)) {
      attrs.push(`fill="${rgb(n.fill.k[0][1])}"`);
      kids.push(animate('fill', n.fill, frames, dur, rgb));
      kids.push(animate('fill-opacity', n.fill, frames, dur, (c) => r4(c[3])));
    } else {
      attrs.push(`fill="${rgb(n.fill)}"`);
      if (n.fill[3] !== 1) attrs.push(`fill-opacity="${r4(n.fill[3])}"`);
    }
  } else attrs.push('fill="none"');

  if (n.stroke) {
    const st = n.stroke;
    attrs.push(`stroke-linecap="${st.cap}" stroke-linejoin="${st.join}"`);
    if (isAnim(st.c)) {
      attrs.push(`stroke="${rgb(st.c.k[0][1])}"`);
      kids.push(animate('stroke', st.c, frames, dur, rgb));
    } else attrs.push(`stroke="${rgb(st.c)}"`);
    if (isAnim(st.w)) {
      attrs.push(`stroke-width="${r2(st.w.k[0][1])}"`);
      kids.push(animate('stroke-width', st.w, frames, dur, r2));
    } else attrs.push(`stroke-width="${r2(st.w)}"`);

    const alphaOf = (f) => (isAnim(st.c) ? valueAt(st.c, f)[3] : st.c[3]);
    if (n.trim) {
      // pathLength=1 lets the dash pattern be expressed in 0..1 trim units.
      const s = n.trim.s, e = n.trim.e;
      attrs.push('pathLength="1"');
      const len = (f) => Math.max(0, valueAt(e, f) - valueAt(s, f));
      if (isAnim(s) || isAnim(e)) {
        attrs.push(`stroke-dasharray="${r4(len(0))} 2" stroke-dashoffset="${r4(-valueAt(s, 0))}"`);
        kids.push(animate('stroke-dasharray', sampled(frames, len), frames, dur, (v) => `${r4(v)} 2`));
        kids.push(animate('stroke-dashoffset', sampled(frames, (f) => -valueAt(s, f)), frames, dur, r4));
        // Round caps would leave a dot at zero length, so hide the stroke until it has length.
        kids.push(animate('stroke-opacity', sampled(frames, (f) => (len(f) > 0.002 ? alphaOf(f) : 0)), frames, dur, r4));
      } else {
        attrs.push(`stroke-dasharray="${r4(len(0))} 2" stroke-dashoffset="${r4(-s)}"`);
      }
    } else if (isAnim(st.c)) {
      kids.push(animate('stroke-opacity', st.c, frames, dur, (c) => r4(c[3])));
    } else if (st.c[3] !== 1) attrs.push(`stroke-opacity="${r4(st.c[3])}"`);
  }

  const el = kids.length ? `<path ${attrs.join(' ')}>${kids.join('')}</path>` : `<path ${attrs.join(' ')}/>`;
  return transformWrap(n.tr, el, frames, dur);
}

export function toSvg(a) {
  const dur = r4(a.frames / a.fps);
  const body = a.layers.map((n) => nodeSvg(n, a.frames, dur)).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${a.w} ${a.h}" width="${a.w}" height="${a.h}" role="img" aria-label="${a.name}"><title>${a.name} — Plush Motion</title>${body}</svg>\n`;
}
