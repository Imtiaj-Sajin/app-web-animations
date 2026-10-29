/*
 * Plush data → Lottie JSON (Bodymovin 5.x schema). One shape layer holding the whole node tree,
 * with a marker per state so players can jump between segments (e.g. lottie-web goToAndPlay('hop', true)).
 */

const isAnim = (p) => p !== null && typeof p === 'object' && !Array.isArray(p) && Array.isArray(p.k);

/** Convert a Plush prop into a Lottie animatable property. map: value → Lottie value array; dims: tangent arity (0 = shape). */
function prop(p, map, dims) {
  if (!isAnim(p)) return { a: 0, k: map(p) };
  const k = p.k.map(([t, v, e], idx) => {
    const key = { t, s: dims === 0 ? [map(v)] : map(v) };
    if (idx === p.k.length - 1) return key;
    if (e === 'h') {
      key.h = 1;
      return key;
    }
    const [x1, y1, x2, y2] = e || [0, 0, 1, 1];
    const arr = (v) => (dims === 0 ? v : Array(dims).fill(v));
    key.o = { x: arr(x1), y: arr(y1) };
    key.i = { x: arr(x2), y: arr(y2) };
    return key;
  });
  return { a: 1, k };
}

const num = (v) => [v];
const vec = (v) => [v[0], v[1]];
const scale = (v) => [v[0] * 100, v[1] * 100];
const pct = (v) => [v * 100];
const rgb = (c) => [c[0], c[1], c[2], 1];
const alpha = (c) => [c[3] * 100];
const path = (d) => ({ c: d.c, v: d.v, i: d.i, o: d.o });

function colorProps(c) {
  // Lottie keeps colour and opacity separate.
  if (!isAnim(c)) return { c: { a: 0, k: rgb(c) }, o: { a: 0, k: c[3] * 100 } };
  return { c: prop(c, rgb, 4), o: isAnim(c) ? prop(c, alpha, 1) : { a: 0, k: 100 } };
}

function transform(tr = {}) {
  return {
    ty: 'tr',
    p: tr.p !== undefined ? prop(tr.p, vec, 2) : { a: 0, k: [0, 0] },
    a: tr.a !== undefined ? prop(tr.a, vec, 2) : { a: 0, k: [0, 0] },
    s: tr.s !== undefined ? prop(tr.s, scale, 2) : { a: 0, k: [100, 100] },
    r: tr.r !== undefined ? prop(tr.r, num, 1) : { a: 0, k: 0 },
    o: tr.o !== undefined ? prop(tr.o, pct, 1) : { a: 0, k: 100 },
    sk: { a: 0, k: 0 },
    sa: { a: 0, k: 0 },
    nm: 'Transform',
  };
}

const CAP = { butt: 1, round: 2, square: 3 };
const JOIN = { miter: 1, round: 2, bevel: 3 };

function shapeItems(n, idx) {
  if (n.t === 'g') {
    // Lottie draws earlier items on top, so children go in reverse paint order.
    const it = n.c.map(shapeItems).reverse();
    it.push(transform(n.tr));
    return { ty: 'gr', nm: n.nm || n.id || `Group ${idx + 1}`, it, np: it.length - 1 };
  }
  const it = [{ ty: 'sh', nm: 'Path', ks: prop(n.d, path, 0) }];
  if (n.trim) {
    const s = prop(n.trim.s ?? 0, pct, 1);
    const e = prop(n.trim.e ?? 1, pct, 1);
    it.push({ ty: 'tm', nm: 'Trim', s, e, o: { a: 0, k: 0 }, m: 1 });
  }
  if (n.stroke) {
    const { c, o } = colorProps(n.stroke.c);
    it.push({
      ty: 'st', nm: 'Stroke', c, o,
      w: prop(n.stroke.w, num, 1),
      lc: CAP[n.stroke.cap] ?? 2,
      lj: JOIN[n.stroke.join] ?? 2,
      ml: 4,
    });
  }
  if (n.fill) {
    const { c, o } = colorProps(n.fill);
    it.push({ ty: 'fl', nm: 'Fill', c, o, r: 1 });
  }
  it.push(transform(n.tr));
  return { ty: 'gr', nm: n.nm || n.id || `Shape ${idx + 1}`, it, np: 1 };
}

export function toLottie(a) {
  const shapes = a.layers.map(shapeItems).reverse();
  return {
    v: '5.12.1',
    fr: a.fps,
    ip: 0,
    op: a.frames,
    w: a.w,
    h: a.h,
    nm: a.name,
    ddd: 0,
    assets: [],
    meta: { g: 'Plush Motion', a: 'Plush Motion', d: a.description, k: (a.tags || []).join(', ') },
    layers: [
      {
        ddd: 0,
        ind: 1,
        ty: 4,
        nm: a.name,
        sr: 1,
        ks: {
          o: { a: 0, k: 100 },
          r: { a: 0, k: 0 },
          p: { a: 0, k: [0, 0, 0] },
          a: { a: 0, k: [0, 0, 0] },
          s: { a: 0, k: [100, 100, 100] },
        },
        ao: 0,
        shapes,
        ip: 0,
        op: a.frames,
        st: 0,
        bm: 0,
      },
    ],
    markers: Object.entries(a.states).map(([name, s]) => ({ tm: s.from, cm: name, dr: s.to - s.from })),
  };
}
