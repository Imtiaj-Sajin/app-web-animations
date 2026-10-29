/*
 * Authoring toolkit. Animations are written with these helpers and compiled to plain
 * Plush data (see src/runtime/plush-player.js for the format), which every exporter consumes.
 */

export const ease = {
  linear: null,
  in: [0.55, 0, 1, 0.45],
  out: [0.22, 1, 0.36, 1],
  inOut: [0.65, 0, 0.35, 1],
  sine: [0.37, 0, 0.63, 1],
  back: [0.34, 1.56, 0.64, 1],
  snap: [0.5, 0, 0.1, 1],
  hold: 'h',
};

export function hex(h, a = 1) {
  const s = h.replace('#', '');
  const n = parseInt(s.length === 3 ? s.replace(/./g, '$&$&') : s, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, a];
}

function mix(a, b, t) {
  if (typeof a === 'number') return a + (b - a) * t;
  if (Array.isArray(a)) return a.map((v, n) => mix(v, b[n], t));
  return { c: a.c, v: mix(a.v, b.v, t), i: mix(a.i, b.i, t), o: mix(a.o, b.o, t) };
}

// ---------------------------------------------------------------- tracks

export class Track {
  constructor(value, frame = 0) {
    this.k = [[frame, value]];
  }
  get end() { return this.k[this.k.length - 1][0]; }
  get value() { return this.k[this.k.length - 1][1]; }

  /** Animate to `value` at absolute `frame` using `e` easing for the segment. */
  to(frame, value, e = ease.inOut) {
    const prev = this.k[this.k.length - 1];
    if (frame < prev[0]) throw new Error(`Track keys must increase (${frame} < ${prev[0]})`);
    if (frame === prev[0]) { prev[1] = value; return this; }
    if (e) prev[2] = e; else prev.length = 2;
    this.k.push([frame, value]);
    return this;
  }
  /** Relative version of to(). */
  by(frames, value, e = ease.inOut) { return this.to(this.end + frames, value, e); }
  /** Hold the current value until absolute frame. */
  hold(frame) { return frame > this.end ? this.to(frame, this.value, null) : this; }
  wait(frames) { return this.hold(this.end + frames); }
  /** Jump instantly to value at frame. */
  set(frame, value) {
    this.hold(frame);
    const prev = this.k[this.k.length - 1];
    prev[2] = 'h';
    this.k.push([frame + 0.001, value]);
    return this;
  }

  /**
   * Physically based spring from the current value to `value`, starting now.
   * velocity is in "progress per second" (0..1 range), so 0 = start at rest.
   */
  spring(value, { stiffness = 220, damping = 14, mass = 1, velocity = 0, fps = 60, step = 1, maxFrames = 120 } = {}) {
    const from = this.value;
    const start = this.end;
    let x = 0, v = velocity;
    const sub = 8, dt = 1 / (fps * sub);
    let f = 0;
    while (f < maxFrames) {
      for (let s = 0; s < sub * step; s++) {
        const a = (-stiffness * (x - 1) - damping * v) / mass;
        v += a * dt;
        x += v * dt;
      }
      f += step;
      const settled = Math.abs(x - 1) < 0.004 && Math.abs(v) < 0.04;
      if (settled) break;
      this.k.push([start + f, mix(from, value, x)]);
    }
    this.k.push([start + f + step, value]);
    return this;
  }

  /** Repeat a smooth back-and-forth between current value and `value` until `until`. */
  oscillate(value, period, until, e = ease.sine) {
    const base = this.value;
    let target = value;
    while (this.end + period / 2 <= until + 1e-6) {
      this.by(period / 2, target, e);
      target = target === value ? base : value;
    }
    return this;
  }
}

export const T = (value, frame = 0) => new Track(value, frame);

// ---------------------------------------------------------------- geometry

const KAPPA = 0.5522847498;

export function ellipse(cx, cy, rx, ry = rx) {
  const kx = rx * KAPPA, ky = ry * KAPPA;
  return {
    c: true,
    v: [[cx, cy - ry], [cx + rx, cy], [cx, cy + ry], [cx - rx, cy]],
    i: [[-kx, 0], [0, -ky], [kx, 0], [0, ky]],
    o: [[kx, 0], [0, ky], [-kx, 0], [0, -ky]],
  };
}

/** Rounded rectangle, always 8 vertices so it can morph to/from any other rect. */
export function rect(x, y, w, h, r = 0) {
  r = Math.min(r, w / 2, h / 2);
  const k = r * KAPPA;
  return {
    c: true,
    v: [[x + r, y], [x + w - r, y], [x + w, y + r], [x + w, y + h - r], [x + w - r, y + h], [x + r, y + h], [x, y + h - r], [x, y + r]],
    i: [[-k, 0], [0, 0], [0, -k], [0, 0], [k, 0], [0, 0], [0, k], [0, 0]],
    o: [[0, 0], [k, 0], [0, 0], [0, k], [0, 0], [-k, 0], [0, 0], [0, -k]],
  };
}

/** Smooth closed curve through points (Catmull-Rom → cubic Bézier). */
export function smoothClosed(pts, tension = 1) {
  const n = pts.length;
  const v = [], i = [], o = [];
  for (let j = 0; j < n; j++) {
    const p0 = pts[(j - 1 + n) % n], p2 = pts[(j + 1) % n];
    const tx = ((p2[0] - p0[0]) / 6) * tension, ty = ((p2[1] - p0[1]) / 6) * tension;
    v.push([pts[j][0], pts[j][1]]);
    i.push([-tx, -ty]);
    o.push([tx, ty]);
  }
  return { c: true, v, i, o };
}

/** Smooth open curve through points. */
export function smoothOpen(pts, tension = 1) {
  const n = pts.length;
  const v = [], i = [], o = [];
  for (let j = 0; j < n; j++) {
    const p0 = pts[Math.max(0, j - 1)], p2 = pts[Math.min(n - 1, j + 1)];
    const tx = ((p2[0] - p0[0]) / 6) * tension, ty = ((p2[1] - p0[1]) / 6) * tension;
    v.push([pts[j][0], pts[j][1]]);
    i.push(j === 0 ? [0, 0] : [-tx, -ty]);
    o.push(j === n - 1 ? [0, 0] : [tx, ty]);
  }
  return { c: false, v, i, o };
}

/** Straight-segment polyline / polygon. */
export function poly(pts, closed = false) {
  return { c: closed, v: pts.map((p) => [p[0], p[1]]), i: pts.map(() => [0, 0]), o: pts.map(() => [0, 0]) };
}

/** Circular arc as cubic segments (angles in degrees, 0 = +x, clockwise on screen). */
export function arc(cx, cy, r, a0, a1, segments = 2) {
  const v = [], i = [], o = [];
  const step = (a1 - a0) / segments;
  const h = (4 / 3) * Math.tan((step * Math.PI) / 180 / 4) * r;
  for (let s = 0; s <= segments; s++) {
    const a = ((a0 + step * s) * Math.PI) / 180;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    const tx = -Math.sin(a) * h, ty = Math.cos(a) * h;
    v.push([x, y]);
    i.push(s === 0 ? [0, 0] : [-tx, -ty]);
    o.push(s === segments ? [0, 0] : [tx, ty]);
  }
  return { c: false, v, i, o };
}

/**
 * Organic squircle blob: a superellipse modulated by low-frequency "bumps".
 * bumps: [[frequency, amplitude, phaseDegrees], ...]
 */
export function blob({ cx, cy, rx, ry = rx, n = 16, sq = 3, bumps = [], rot = 0, tension = 1 }) {
  const pts = [];
  for (let k = 0; k < n; k++) {
    const th = (k / n) * Math.PI * 2 + (rot * Math.PI) / 180;
    const c = Math.cos(th), s = Math.sin(th);
    const r0 = Math.pow(Math.pow(Math.abs(c), sq) + Math.pow(Math.abs(s), sq), -1 / sq);
    let m = 1;
    for (const [f, amp, ph] of bumps) m += amp * Math.cos(f * th + (ph * Math.PI) / 180);
    pts.push([cx + c * r0 * rx * m, cy + s * r0 * ry * m]);
  }
  return smoothClosed(pts, tension);
}

/** Heart outline with 6 vertices, centred on (cx, cy). */
export function heart(cx, cy, size) {
  const s = size / 100;
  const P = (x, y) => [cx + x * s, cy + y * s];
  const D = (x, y) => [x * s, y * s];
  return {
    c: true,
    v: [P(0, -24), P(28, -44), P(50, -14), P(0, 44), P(-50, -14), P(-28, -44)],
    i: [D(-6, -12), D(-14, 0), D(0, -18), D(14, -14), D(0, 18), D(-16, 0)],
    o: [D(6, -12), D(16, 0), D(0, 18), D(-14, -14), D(0, -18), D(14, 0)],
  };
}

export function translatePath(d, dx, dy) {
  return { ...d, v: d.v.map(([x, y]) => [x + dx, y + dy]) };
}

// ---------------------------------------------------------------- nodes

export function g(props, children) {
  const { id, a, p, s, r, o, name } = props || {};
  const tr = {};
  if (a !== undefined) tr.a = a;
  if (p !== undefined) tr.p = p;
  if (s !== undefined) tr.s = s;
  if (r !== undefined) tr.r = r;
  if (o !== undefined) tr.o = o;
  return { t: 'g', id, name, tr, c: children.filter(Boolean) };
}

/** Group whose anchor and position are the same point (pivot without moving). */
export function pivot(x, y, props, children) {
  const p = props.p;
  return g({ ...props, a: [x, y], p: p ?? [x, y] }, children);
}

export function shape(d, { fill, stroke, trim, id, name, o, p, s, r, a } = {}) {
  const n = { t: 'p', id, name, d };
  if (fill) n.fill = fill;
  if (stroke) n.stroke = { cap: 'round', join: 'round', ...stroke };
  if (trim) n.trim = trim;
  const tr = {};
  if (a !== undefined) tr.a = a;
  if (p !== undefined) tr.p = p;
  if (s !== undefined) tr.s = s;
  if (r !== undefined) tr.r = r;
  if (o !== undefined) tr.o = o;
  if (Object.keys(tr).length) n.tr = tr;
  return n;
}

// ---------------------------------------------------------------- compile

function round(v) {
  if (typeof v === 'number') return Math.round(v * 1000) / 1000;
  if (Array.isArray(v)) return v.map(round);
  if (v && typeof v === 'object') {
    const o = {};
    for (const [k, x] of Object.entries(v)) o[k] = round(x);
    return o;
  }
  return v;
}

function compileProp(p) {
  if (p instanceof Track) {
    const k = p.k.map(([f, v, e]) => (e ? [round(f), round(v), e === 'h' ? 'h' : e] : [round(f), round(v)]));
    // A track whose keys are all identical is static.
    const first = JSON.stringify(k[0][1]);
    if (k.every((x) => JSON.stringify(x[1]) === first)) return k[0][1];
    return { k };
  }
  return round(p);
}

function compileNode(n) {
  const out = { t: n.t };
  if (n.id) out.id = n.id;
  if (n.name) out.nm = n.name;
  const tr = n.tr || {};
  const ctr = {};
  for (const key of ['a', 'p', 's', 'r', 'o']) if (tr[key] !== undefined) ctr[key] = compileProp(tr[key]);
  if (Object.keys(ctr).length) out.tr = ctr;
  if (n.t === 'g') {
    out.c = n.c.map(compileNode);
  } else {
    out.d = compileProp(n.d);
    if (n.fill) out.fill = compileProp(n.fill);
    if (n.stroke) out.stroke = { c: compileProp(n.stroke.c), w: compileProp(n.stroke.w), cap: n.stroke.cap, join: n.stroke.join };
    if (n.trim) out.trim = { s: compileProp(n.trim.s ?? 0), e: compileProp(n.trim.e ?? 1) };
  }
  return out;
}

/**
 * Define an animation.
 * states: { name: { from, to, loop?, next? } } — every state should start and end at a rest pose,
 * so the whole timeline (used by linear formats: Lottie, SVG, video, GIF) loops seamlessly.
 */
export function defineAnimation(def) {
  const { layers, ...meta } = def;
  const frames = def.frames ?? Math.max(...Object.values(def.states).map((s) => s.to));
  return {
    v: 1,
    fps: 60,
    ...meta,
    frames,
    layers: layers.filter(Boolean).map(compileNode),
  };
}
