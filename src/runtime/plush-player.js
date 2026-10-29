/*
 * Plush runtime — plays Plush animation data on a <canvas>.
 * Zero dependencies, ~10 KB. Safe to import during SSR (touches no globals at load).
 *
 * Data format (all coordinates in the animation's own w×h space):
 *   prop      = value | { k: [[frame, value, easing?], ...] }   easing: [x1,y1,x2,y2] | 'h' (hold) | absent (linear)
 *   path      = { c: closed, v: [[x,y]], i: [[dx,dy]], o: [[dx,dy]] }   (Lottie-style tangents)
 *   group     = { t:'g', id?, tr?, c: [nodes] }                         (children in paint order)
 *   shape     = { t:'p', id?, tr?, d: prop<path>, fill?: prop<rgba>, stroke?: {c,w,cap,join}, trim?: {s,e} }
 *   tr        = { a: anchor, p: position, s: [sx,sy], r: degrees, o: 0..1 }
 */

const easeCache = new Map();

function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t) => ((ax * t + bx) * t + cx) * t;
  const sy = (t) => ((ay * t + by) * t + cy) * t;
  const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let n = 0; n < 8; n++) {
      const err = sx(t) - x;
      if (Math.abs(err) < 1e-6) return sy(t);
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    let lo = 0, hi = 1;
    t = x;
    for (let n = 0; n < 30; n++) {
      const v = sx(t);
      if (Math.abs(v - x) < 1e-6) break;
      if (v < x) lo = t; else hi = t;
      t = (lo + hi) / 2;
    }
    return sy(t);
  };
}

function easing(e) {
  const key = e.join(',');
  let fn = easeCache.get(key);
  if (!fn) easeCache.set(key, (fn = cubicBezier(e[0], e[1], e[2], e[3])));
  return fn;
}

function mix(a, b, t) {
  if (typeof a === 'number') return a + (b - a) * t;
  if (Array.isArray(a)) {
    const out = new Array(a.length);
    for (let n = 0; n < a.length; n++) out[n] = mix(a[n], b[n], t);
    return out;
  }
  return { c: a.c, v: mix(a.v, b.v, t), i: mix(a.i, b.i, t), o: mix(a.o, b.o, t) };
}

function isAnimated(p) {
  return p !== null && typeof p === 'object' && !Array.isArray(p) && Array.isArray(p.k);
}

function valueAt(p, f) {
  if (!isAnimated(p)) return p;
  const k = p.k;
  if (f <= k[0][0]) return k[0][1];
  const last = k[k.length - 1];
  if (f >= last[0]) return last[1];
  let lo = 0, hi = k.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (k[m][0] <= f) lo = m; else hi = m;
  }
  const a = k[lo], b = k[hi], e = a[2];
  if (e === 'h') return a[1];
  let t = (f - a[0]) / (b[0] - a[0]);
  if (e) t = easing(e)(t);
  return mix(a[1], b[1], t);
}

const ZERO = [0, 0], ONE = [1, 1];

function evalNode(n, f) {
  const tr = n.tr || {};
  const out = {
    id: n.id,
    a: tr.a ? valueAt(tr.a, f) : ZERO,
    p: tr.p ? valueAt(tr.p, f) : ZERO,
    s: tr.s ? valueAt(tr.s, f) : ONE,
    r: tr.r ? valueAt(tr.r, f) : 0,
    o: tr.o !== undefined ? valueAt(tr.o, f) : 1,
  };
  if (n.t === 'g') {
    out.c = n.c.map((c) => evalNode(c, f));
  } else {
    out.d = valueAt(n.d, f);
    if (n.fill) out.fill = valueAt(n.fill, f);
    if (n.stroke) {
      out.stroke = {
        c: valueAt(n.stroke.c, f),
        w: valueAt(n.stroke.w, f),
        cap: n.stroke.cap || 'round',
        join: n.stroke.join || 'round',
      };
    }
    if (n.trim) out.trim = [valueAt(n.trim.s ?? 0, f), valueAt(n.trim.e ?? 1, f)];
  }
  return out;
}

/** Resolve every property of the animation at a (fractional) frame. */
function evaluate(data, f) {
  return data.layers.map((n) => evalNode(n, f));
}

/** Interpolate between two evaluated scenes — used to soften state changes. */
function blendScenes(a, b, t) {
  return b.map((n, idx) => blendNode(a[idx], n, t));
}

function blendNode(a, b, t) {
  const o = { ...b, a: mix(a.a, b.a, t), p: mix(a.p, b.p, t), s: mix(a.s, b.s, t), r: mix(a.r, b.r, t), o: mix(a.o, b.o, t) };
  if (b.c) {
    o.c = b.c.map((c, idx) => blendNode(a.c[idx], c, t));
  } else {
    o.d = mix(a.d, b.d, t);
    if (b.fill) o.fill = mix(a.fill, b.fill, t);
    if (b.stroke) o.stroke = { ...b.stroke, c: mix(a.stroke.c, b.stroke.c, t), w: mix(a.stroke.w, b.stroke.w, t) };
    if (b.trim) o.trim = mix(a.trim, b.trim, t);
  }
  return o;
}

function tracePath(ctx, d) {
  const { v, i, o } = d;
  const n = v.length;
  if (!n) return;
  ctx.moveTo(v[0][0], v[0][1]);
  const segs = d.c ? n : n - 1;
  for (let j = 0; j < segs; j++) {
    const a = v[j], b = v[(j + 1) % n], oa = o[j], ib = i[(j + 1) % n];
    ctx.bezierCurveTo(a[0] + oa[0], a[1] + oa[1], b[0] + ib[0], b[1] + ib[1], b[0], b[1]);
  }
  if (d.c) ctx.closePath();
}

function pathLength(d) {
  const { v, i, o } = d;
  const n = v.length;
  const segs = d.c ? n : n - 1;
  let len = 0;
  for (let j = 0; j < segs; j++) {
    const a = v[j], b = v[(j + 1) % n];
    const p1 = [a[0] + o[j][0], a[1] + o[j][1]];
    const p2 = [b[0] + i[(j + 1) % n][0], b[1] + i[(j + 1) % n][1]];
    let px = a[0], py = a[1];
    for (let s = 1; s <= 16; s++) {
      const t = s / 16, u = 1 - t;
      const x = u * u * u * a[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * b[0];
      const y = u * u * u * a[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * b[1];
      len += Math.hypot(x - px, y - py);
      px = x; py = y;
    }
  }
  return len;
}

function css(c) {
  return `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})`;
}

function drawNode(ctx, n, alpha, extra) {
  const op = alpha * n.o;
  if (op <= 0.002) return;
  let px = n.p[0], py = n.p[1], r = n.r;
  const x = extra && n.id ? extra[n.id] : null;
  if (x) { px += x.x || 0; py += x.y || 0; r += x.r || 0; }
  ctx.save();
  ctx.translate(px, py);
  if (r) ctx.rotate((r * Math.PI) / 180);
  if (n.s[0] !== 1 || n.s[1] !== 1) ctx.scale(n.s[0] || 1e-6, n.s[1] || 1e-6);
  if (n.a[0] || n.a[1]) ctx.translate(-n.a[0], -n.a[1]);
  if (n.c) {
    for (const c of n.c) drawNode(ctx, c, op, extra);
  } else {
    ctx.beginPath();
    tracePath(ctx, n.d);
    if (n.fill && n.fill[3] > 0) {
      ctx.globalAlpha = op * n.fill[3];
      ctx.fillStyle = css(n.fill);
      ctx.fill();
    }
    const st = n.stroke;
    if (st && st.w > 0 && st.c[3] > 0) {
      let draw = true;
      if (n.trim) {
        const [s, e] = n.trim;
        const len = pathLength(n.d);
        const seg = Math.max(0, e - s) * len;
        if (seg < 0.01) draw = false;
        else if (seg < len - 0.01) {
          ctx.setLineDash([seg, len * 2]);
          ctx.lineDashOffset = -s * len;
        }
      }
      if (draw) {
        ctx.globalAlpha = op * st.c[3];
        ctx.strokeStyle = css(st.c);
        ctx.lineWidth = st.w;
        ctx.lineCap = st.cap;
        ctx.lineJoin = st.join;
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

/** Draw an evaluated scene into ctx (ctx already transformed to animation space). */
function drawScene(ctx, scene, extra) {
  for (const n of scene) drawNode(ctx, n, 1, extra);
}

/**
 * Render one frame into a context of size width×height (device pixels), fit "contain".
 * Used by exporters (video, GIF, PNG) and by the player.
 */
function renderFrame(ctx, data, frame, width, height, opts = {}) {
  const scene = opts.scene || evaluate(data, frame);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  if (opts.background) {
    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, width, height);
  }
  const k = Math.min(width / data.w, height / data.h);
  ctx.setTransform(k, 0, 0, k, (width - data.w * k) / 2, (height - data.h * k) / 2);
  drawScene(ctx, scene, opts.extra);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/** tap: 'state' | ['a', 'b', …] (cycles on each tap) | { currentState: nextState, '*': fallback } */
function nextStateFor(data, current, count) {
  const tap = data.interact && data.interact.tap;
  if (!tap) return null;
  if (typeof tap === 'string') return tap;
  if (Array.isArray(tap)) return tap[count % tap.length];
  return tap[current] || tap['*'] || null;
}

/**
 * Create an interactive player on a canvas.
 * options: state, autoplay (true), interactive (true), speed (1), background,
 *          motion: 'auto' | 'full' | 'reduced'  ('auto' follows prefers-reduced-motion),
 *          onStateChange(name)
 */
function createPlayer(canvas, data, options = {}) {
  const opts = { autoplay: true, interactive: true, speed: 1, motion: 'auto', ...options };
  const ctx = canvas.getContext('2d');
  const interact = data.interact || {};
  const looks = interact.look ? [].concat(interact.look) : [];
  const listeners = [];
  const on = (target, type, fn, o) => { target.addEventListener(type, fn, o); listeners.push(() => target.removeEventListener(type, fn, o)); };

  let stateName = data.states[opts.state] ? opts.state : data.initial;
  let frame = data.states[stateName].from;
  let playing = opts.autoplay;
  let visible = true;
  let raf = 0, last = 0;
  let blendFrom = null, blendT = 1;
  const blendDur = 0.16;
  const lookCur = looks.map(() => ({ x: 0, y: 0, vx: 0, vy: 0 }));
  let lookTarget = { x: 0, y: 0 };
  let width = 0, height = 0;

  const reduceQuery = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  const reduced = () => opts.motion === 'reduced' || (opts.motion === 'auto' && !!reduceQuery && reduceQuery.matches);

  function seg() { return data.states[stateName]; }

  function resize() {
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 3);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (w !== width || h !== height) {
      width = canvas.width = w;
      height = canvas.height = h;
      draw();
    }
  }

  function extras() {
    if (!looks.length) return null;
    const out = {};
    looks.forEach((l, idx) => {
      out[l.node] = { x: lookCur[idx].x * (l.x ?? 8), y: lookCur[idx].y * (l.y ?? 5), r: lookCur[idx].x * (l.r ?? 0) };
    });
    return out;
  }

  function draw() {
    if (!width) return;
    let scene = evaluate(data, frame);
    if (blendFrom && blendT < 1) {
      const t = 1 - Math.pow(1 - blendT, 3);
      scene = blendScenes(blendFrom, scene, t);
    }
    renderFrame(ctx, data, frame, width, height, { scene, background: opts.background, extra: extras() });
  }

  function setState(name, blend) {
    if (!data.states[name]) return;
    if (blend) { blendFrom = evaluate(data, frame); blendT = 0; }
    stateName = name;
    frame = data.states[name].from;
    if (opts.onStateChange) opts.onStateChange(name);
  }

  function advance(dt) {
    const s = seg();
    const holdStill = reduced() && s.loop;
    if (!holdStill) frame += dt * data.fps * opts.speed;
    if (frame >= s.to) {
      if (s.loop) {
        const len = s.to - s.from;
        frame = len > 0 ? s.from + ((frame - s.from) % len) : s.from;
      } else {
        setState(s.next || data.initial, false);
      }
    }
    if (blendT < 1) blendT = Math.min(1, blendT + dt / blendDur);
    // Critically-damped spring toward the pointer for each look target.
    const k = 140, c = 2 * Math.sqrt(k);
    lookCur.forEach((l) => {
      l.vx += (k * (lookTarget.x - l.x) - c * l.vx) * dt;
      l.vy += (k * (lookTarget.y - l.y) - c * l.vy) * dt;
      l.x += l.vx * dt;
      l.y += l.vy * dt;
    });
  }

  function tick(now) {
    raf = 0;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    advance(dt);
    draw();
    schedule();
  }

  function schedule() {
    if (raf || !playing || !visible) return;
    const s = seg();
    const settled = reduced() && s.loop && blendT >= 1 && looks.every((_, idx) => Math.abs(lookCur[idx].x - lookTarget.x) + Math.abs(lookCur[idx].y - lookTarget.y) < 0.001);
    if (settled) { last = 0; return; }
    raf = requestAnimationFrame(tick);
  }

  function play(name) {
    if (name && data.states[name]) setState(name, true);
    playing = true;
    schedule();
  }

  let tapCount = 0;
  function tap() {
    const next = nextStateFor(data, stateName, tapCount++);
    if (next) play(next);
  }

  // ---- wiring ----
  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    listeners.push(() => ro.disconnect());
  }
  if (typeof IntersectionObserver === 'function') {
    const io = new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      if (visible) { last = 0; schedule(); }
    });
    io.observe(canvas);
    listeners.push(() => io.disconnect());
  }
  if (!canvas.hasAttribute('aria-label')) canvas.setAttribute('aria-label', data.name);
  if (!canvas.hasAttribute('role')) canvas.setAttribute('role', 'img');

  if (opts.interactive) {
    if (interact.tap) {
      canvas.style.cursor = 'pointer';
      on(canvas, 'click', tap);
      if (!canvas.hasAttribute('tabindex')) canvas.tabIndex = 0;
      canvas.setAttribute('role', 'button');
      on(canvas, 'keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(); }
      });
    }
    if (interact.hover) on(canvas, 'pointerenter', () => play(interact.hover));
    if (looks.length && typeof window !== 'undefined') {
      on(window, 'pointermove', (e) => {
        const r = canvas.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const span = Math.max(r.width, r.height) * 1.5;
        lookTarget = {
          x: Math.max(-1, Math.min(1, (e.clientX - cx) / span)),
          y: Math.max(-1, Math.min(1, (e.clientY - cy) / span)),
        };
        schedule();
      }, { passive: true });
      on(document.documentElement, 'pointerleave', () => { lookTarget = { x: 0, y: 0 }; schedule(); });
    }
  }
  if (reduceQuery) on(reduceQuery, 'change', () => { last = 0; draw(); schedule(); });

  resize();
  draw();
  schedule();

  return {
    get state() { return stateName; },
    get frame() { return frame; },
    get playing() { return playing; },
    play,
    tap,
    pause() { playing = false; if (raf) cancelAnimationFrame(raf); raf = 0; last = 0; },
    resume() { playing = true; schedule(); },
    seek(f) { frame = f; draw(); },
    setLook(x, y) { lookTarget = { x, y }; schedule(); },
    resize,
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      playing = false;
      listeners.forEach((off) => off());
    },
  };
}

export { createPlayer, evaluate, renderFrame, drawScene, valueAt, blendScenes };
