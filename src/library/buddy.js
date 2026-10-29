/*
 * Blob buddy factory — squishy mascot characters drawn in a 400×400 design space
 * (body centred near 200,210, ground line at y=330), then placed/scaled into any scene.
 *
 * timeline: ordered list of segments, each { kind: 'idle'|'hop'|'jelly'|'wake', from, to, ... }
 */
import { T, ease, hex, blob, ellipse, arc, rect, g, shape } from '../core/dsl.js';

export const INK = hex('#1B1B22');

const GROUND = 322;
const FACE = [200, 212];

function bodyPath(o, variant = 0) {
  const shift = [0, 16, 0, -16][variant % 4];
  return blob({
    cx: 200, cy: 212,
    rx: o.body.rx, ry: o.body.ry, sq: o.body.sq, n: 16,
    bumps: o.body.bumps.map(([f, a, ph], idx) => [f, a, ph + shift * (idx % 2 ? -1 : 1)]),
  });
}

const EVENTS = {
  idle(tr, ev, o) {
    const { from, to } = ev;
    const breath = ev.breath ?? 90;
    const amp = ev.amp ?? 0.022;
    tr.breathe.oscillate([1 + amp, 1 - amp], breath, to);
    if (!o.sleepy) {
      for (const b of ev.blinks ?? []) {
        tr.eyesS.hold(from + b).by(4, [1, 0.08], ease.in).by(7, [1, 1], ease.out);
      }
    }
    // Slow organic wobble of the outline: cycle through four variants and return home.
    const quarter = (to - from) / 4;
    for (let q = 1; q <= 4; q++) tr.body.to(from + quarter * q, bodyPath(o, q), ease.sine);
    if (o.sleepy) {
      tr.z.forEach((z, idx) => {
        const start = from + 8 + idx * Math.round((to - from) / 2.2);
        const end = Math.min(start + 96, to - 2);
        if (end - start < 40) return;
        z.p.set(start, [262 + idx * 4, 150]).to(end, [300 + idx * 10, 70], ease.sine);
        z.o.hold(start).to(start + 16, 1, ease.out).hold(end - 24).to(end, 0, ease.in);
        z.s.set(start, [0.6, 0.6]).to(end, [1.05, 1.05], ease.out);
        z.r.set(start, -8).to(end, 10, ease.sine);
      });
    }
  },

  hop(tr, ev) {
    const t = ev.from;
    const h = ev.height ?? 110;
    // anticipation → launch → apex → fall → land → settle
    tr.jumpS.to(t + 10, [1.14, 0.84], ease.out).to(t + 22, [0.88, 1.14], ease.out).to(t + 30, [1, 1], ease.inOut)
      .to(t + 42, [0.94, 1.07], ease.in).to(t + 47, [1.2, 0.8], ease.out)
      .spring([1, 1], { stiffness: 260, damping: 14 });
    tr.jumpP.hold(t + 10).to(t + 30, [200, GROUND - h], ease.out).to(t + 44, [200, GROUND], ease.in);
    tr.jumpR.hold(t + 10).to(t + 24, -6, ease.out).to(t + 40, 4, ease.inOut).to(t + 47, 0, ease.out);
    tr.faceP.to(t + 10, [FACE[0], FACE[1] + 7], ease.out).to(t + 22, [FACE[0], FACE[1] - 7], ease.out)
      .to(t + 32, FACE, ease.inOut).hold(t + 44).to(t + 48, [FACE[0], FACE[1] + 10], ease.out)
      .spring(FACE, { stiffness: 200, damping: 13 });
    tr.shadowS.hold(t + 10).to(t + 30, [0.55, 0.55], ease.out).to(t + 44, [1, 1], ease.in)
      .to(t + 48, [1.16, 1], ease.out).spring([1, 1], { stiffness: 220, damping: 14 });
    tr.shadowO.hold(t + 10).to(t + 30, 0.45, ease.out).to(t + 44, 1, ease.in);
    swapEyes(tr, 'happy', t + 9, t + 72);
    openMouth(tr, t + 10, t + 72, [1, 1]);
    tr.blushO.hold(t + 12).to(t + 22, 1, ease.out).hold(t + 72).to(t + 86, ev.blushRest ?? 0, ease.inOut);
  },

  jelly(tr, ev) {
    const t = ev.from;
    tr.jumpS.to(t + 8, [1.12, 0.88], ease.out).spring([1, 1], { stiffness: 320, damping: 6, velocity: -4 });
    tr.jumpR.to(t + 8, 9, ease.out).spring(0, { stiffness: 300, damping: 7 });
    tr.eyesS.to(t + 6, [1.3, 1.3], ease.out).hold(t + 34).to(t + 42, [1, 1], ease.inOut);
    openMouth(tr, t + 4, t + 36, [0.55, 0.85]);
    swapEyes(tr, 'happy', t + 40, t + 90);
    tr.giggle.hold(t + 42).oscillate([200, GROUND - 6], 10, t + 82).hold(t + 82);
    tr.blushO.hold(t + 40).to(t + 50, 1, ease.out).hold(t + 86).to(t + 98, ev.blushRest ?? 0, ease.inOut);
  },

  wake(tr, ev) {
    const t = ev.from;
    // eyes snap open with a springy pop, "!" appears, then eyelids drift shut again.
    tr.sleepyO.hold(t + 5).to(t + 7, 0, null);
    tr.openO.hold(t + 5).to(t + 7, 1, null);
    tr.eyesS.hold(t + 5).to(t + 6, [0.5, 0.5], null).spring([1.25, 1.25], { stiffness: 380, damping: 16 })
      .hold(t + 60).to(t + 70, [1, 1], ease.inOut).hold(t + 82).to(t + 100, [1, 0.12], ease.inOut);
    tr.openO.hold(t + 100).to(t + 102, 0, null);
    tr.sleepyO.hold(t + 100).to(t + 102, 1, null);
    tr.eyesS.hold(t + 102).to(t + 103, [1, 1], null);
    tr.jumpS.to(t + 5, [1.1, 0.9], ease.out).to(t + 12, [0.94, 1.08], ease.out).spring([1, 1], { stiffness: 240, damping: 10 });
    tr.jumpP.hold(t + 5).to(t + 14, [200, GROUND - 34], ease.out).to(t + 24, [200, GROUND], ease.in);
    tr.shadowS.hold(t + 5).to(t + 14, [0.8, 0.8], ease.out).to(t + 24, [1, 1], ease.in);
    openMouth(tr, t + 6, t + 64, [0.5, 0.75]);
    tr.bang.o.hold(t + 6).to(t + 8, 1, null).hold(t + 52).to(t + 62, 0, ease.in);
    tr.bang.s.hold(t + 6).to(t + 7, [0.2, 0.2], null).spring([1, 1], { stiffness: 420, damping: 13 });
    tr.bang.r.hold(t + 6).to(t + 7, -20, null).spring(10, { stiffness: 300, damping: 9 });
  },
};

function swapEyes(tr, kind, on, off) {
  const target = kind === 'happy' ? tr.happyO : tr.sleepyO;
  tr.openO.hold(on).to(on + 3, 0, null).hold(off).to(off + 3, 1, null);
  target.hold(on).to(on + 3, 1, null).hold(off).to(off + 3, 0, null);
}

function openMouth(tr, on, off, size) {
  tr.smileO.hold(on).to(on + 2, 0, null).hold(off).to(off + 3, 1, null);
  tr.mouthO.hold(on).to(on + 2, 1, null).hold(off).to(off + 3, 0, null);
  tr.mouthS.hold(on).to(on + 1, [size[0] * 0.3, size[1] * 0.3], null)
    .spring(size, { stiffness: 340, damping: 14 });
}

/**
 * Build one buddy.
 * o: { id, color, shade, blush, body: {rx, ry, sq, bumps}, sleepy?, x, y, scale, timeline, end }
 * Returns { node, look } — `look` is the runtime pointer-follow config for this buddy.
 */
export function buddy(o) {
  const X = (s) => `${o.id}-${s}`;
  const sleepy = !!o.sleepy;
  const tr = {
    breathe: T([1, 1]),
    jumpP: T([200, GROUND]),
    jumpS: T([1, 1]),
    jumpR: T(0),
    giggle: T([200, GROUND]),
    body: T(bodyPath(o, 0)),
    faceP: T(FACE),
    eyesS: T([1, 1]),
    openO: T(sleepy ? 0 : 1),
    happyO: T(0),
    sleepyO: T(sleepy ? 1 : 0),
    smileO: T(1),
    mouthO: T(0),
    mouthS: T([0.4, 0.4]),
    blushO: T(o.blushRest ?? 0),
    shadowS: T([1, 1]),
    shadowO: T(1),
    z: sleepy ? [0, 1].map(() => ({ p: T([262, 150]), o: T(0), s: T([0.6, 0.6]), r: T(-8) })) : [],
    bang: { o: T(0), s: T([1, 1]), r: T(10) },
  };
  const all = [];
  const collect = (v) => {
    if (v && v.k) all.push(v);
    else if (Array.isArray(v)) v.forEach(collect);
    else if (v && typeof v === 'object') Object.values(v).forEach(collect);
  };
  collect(tr);
  for (const ev of o.timeline) {
    all.forEach((t) => t.hold(ev.from));
    EVENTS[ev.kind](tr, { blushRest: o.blushRest, ...ev }, o);
    const late = Math.max(...all.map((t) => t.end));
    if (late > ev.to) throw new Error(`${o.id}: '${ev.kind}' runs to frame ${late}, past its segment end ${ev.to}`);
  }
  all.forEach((t) => t.hold(o.end));

  const color = hex(o.color);
  const eye = (cx) => shape(ellipse(cx, 204, 7.5, 10.5), { fill: INK });
  const lid = (cx, a0, a1) => shape(arc(cx, 206, 9, a0, a1, 2), { stroke: { c: INK, w: 4.6 } });
  const z = (zt, idx) => g({ p: zt.p, a: [0, 0], s: zt.s, r: zt.r, o: zt.o }, [
    shape(
      { c: false, v: [[-9, -9], [9, -9], [-9, 9], [9, 9]], i: [[0, 0], [0, 0], [0, 0], [0, 0]], o: [[0, 0], [0, 0], [0, 0], [0, 0]] },
      { stroke: { c: INK, w: 4 - idx * 0.6 } },
    ),
  ]);

  const node = g({ name: o.name, a: [200, 330], p: [o.x ?? 200, o.y ?? 330], s: [o.scale ?? 1, o.scale ?? 1] }, [
    // soft contact shadow
    g({ a: [200, 330], p: [200, 330], s: tr.shadowS, o: tr.shadowO }, [
      shape(ellipse(200, 330, 96, 13), { fill: hex('#0B0B1A', 0.1) }),
    ]),
    g({ id: X('lean'), a: [200, GROUND], p: tr.jumpP, s: tr.jumpS, r: tr.jumpR }, [
      g({ a: [200, GROUND], p: tr.giggle, s: tr.breathe }, [
        // Body drawn in the shade colour, then again slightly smaller and offset up-left:
        // the leftover crescent reads as soft form shadow that follows every wobble.
        shape(tr.body, { fill: hex(o.shade) }),
        g({ a: [200, 212], p: [195, 205], s: [0.955, 0.95] }, [shape(tr.body, { fill: color })]),
        shape(ellipse(150, 146, 26, 13), { fill: hex('#FFFFFF', 0.28), a: [150, 146], p: [150, 146], r: -32 }),
        g({ id: X('face'), a: FACE, p: tr.faceP }, [
          g({ o: tr.blushO }, [
            shape(ellipse(150, 230, 13, 7.5), { fill: hex(o.blush, 0.6) }),
            shape(ellipse(250, 230, 13, 7.5), { fill: hex(o.blush, 0.6) }),
          ]),
          g({ a: [200, 204], p: [200, 204], s: tr.eyesS }, [
            g({ o: tr.openO }, [eye(173), eye(227)]),
          ]),
          g({ o: tr.happyO }, [lid(173, 205, 335), lid(227, 205, 335)]),
          g({ o: tr.sleepyO }, [lid(173, 25, 155), lid(227, 25, 155)]),
          g({ o: tr.smileO }, [shape(arc(200, 222, 11, 25, 155, 2), { stroke: { c: INK, w: 4.4 } })]),
          g({ a: [200, 228], p: [200, 228], s: tr.mouthS, o: tr.mouthO }, [
            shape({ ...arc(200, 226, 14, 0, 180, 2), c: true }, { fill: hex('#2A1214') }),
            shape(ellipse(200, 235, 7, 3.6), { fill: hex('#FF7A86') }),
          ]),
        ]),
      ]),
    ]),
    ...(sleepy ? tr.z.map(z) : []),
    g({ p: [300, 96], a: [0, 0], s: tr.bang.s, r: tr.bang.r, o: tr.bang.o }, [
      shape(rect(-6, -34, 12, 38, 6), { fill: INK }),
      shape(ellipse(0, 18, 6.5), { fill: INK }),
    ]),
  ]);

  const look = [
    { node: X('face'), x: 16, y: 9 },
    { node: X('lean'), x: 0, y: 0, r: 5 },
  ];
  return { node, look };
}

export const PALETTE = {
  bloo: { color: '#2F6BFF', shade: '#2458E0', blush: '#FF8FB1', bg: '#E7EDFF' },
  peach: { color: '#F0663A', shade: '#D84E24', blush: '#FFC0A8', bg: '#FFE8DF' },
  sunny: { color: '#F6B92B', shade: '#E5A010', blush: '#FF9C6B', bg: '#FFF2D3' },
};

export const BODIES = {
  bloo: { rx: 112, ry: 112, sq: 2.7, bumps: [[3, 0.035, 70], [2, 0.03, 10], [5, 0.012, 0]] },
  peach: { rx: 124, ry: 100, sq: 4.2, bumps: [[4, 0.03, 40], [6, 0.02, 200], [3, 0.025, 120]] },
  sunny: { rx: 130, ry: 96, sq: 3.4, bumps: [[2, 0.035, 200], [3, 0.03, 30], [5, 0.014, 90]] },
};
