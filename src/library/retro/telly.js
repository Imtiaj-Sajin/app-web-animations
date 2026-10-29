/*
 * Telly — an original mid-century CRT television with legs; its face lives on the screen.
 * 400×400 design space, feet resting on y=372.
 */
import { T, ease, hex, shade, ellipse, rect, poly, smoothOpen, arc, heart, sparkle, g, shape, choreograph } from '../../core/dsl.js';

const INK = hex('#1B1B22');

export const TELLY_STYLES = {
  cream: { name: 'Cream', cabinet: '#F1E3C8', screen: '#9DFFB0', glass: '#0F241B', bg: '#F1ECE1' },
  mint: { name: 'Mint', cabinet: '#8ED8BF', screen: '#FFE58A', glass: '#2A2410', bg: '#DEF5EC' },
  cherry: { name: 'Cherry', cabinet: '#E2483D', screen: '#8FE6FF', glass: '#0D2230', bg: '#FFE5DE' },
  walnut: { name: 'Walnut', cabinet: '#8A5634', screen: '#FFB76B', glass: '#2A170A', bg: '#F3E7DB' },
};

const SCREEN = { x: 110, y: 140, w: 150, h: 150 };
const C = [185, 215];

const SEGMENTS = {
  idle(tr, { from, to }) {
    tr.bodyS.oscillate([1.012, 0.99], 120, to);
    tr.antR.oscillate(4, 120, to);
    for (let c = from; c + 120 <= to; c += 120) tr.band.set(c, [0, 0]).to(c + 110, [0, 112], ease.linear).set(c + 119, [0, 0]);
    for (const b of [80, 200]) if (from + b + 11 <= to) tr.eyesS.hold(from + b).by(4, [1, 0.1], ease.in).by(7, [1, 1], ease.out);
  },

  wink(tr, { from: t }) {
    tr.eyeRO.hold(t + 8).to(t + 10, 0, null).hold(t + 70).to(t + 72, 1, null);
    tr.winkO.hold(t + 8).to(t + 10, 1, null).hold(t + 70).to(t + 72, 0, null);
    tr.mouthS.to(t + 12, [1.3, 1.3], ease.out).hold(t + 70).to(t + 80, [1, 1], ease.inOut);
    tr.bodyR.to(t + 12, -6, ease.out).hold(t + 66).to(t + 82, 0, ease.inOut);
    tr.spark.hold(t + 12).to(t + 13, [0.2, 0.2], null).to(t + 20, [1.2, 1.2], ease.out).to(t + 26, [1, 1], ease.inOut).hold(t + 50).to(t + 60, [0, 0], ease.in);
    tr.knobR.to(t + 10, 90, ease.out);
    tr.knobR.set(t + 90, 0);
  },

  love(tr, { from: t }) {
    face(tr, tr.heartsO, t + 6, t + 108);
    tr.heartsS.hold(t + 6).to(t + 7, [0.3, 0.3], null).to(t + 16, [1.25, 1.25], ease.out).to(t + 22, [1, 1], ease.inOut)
      .oscillate([1.22, 1.22], 16, t + 102);
    tr.bodyS.to(t + 8, [1.08, 0.92], ease.out).to(t + 18, [0.95, 1.06], ease.out).spring([1, 1], { stiffness: 260, damping: 12 });
    tr.bodyP.hold(t + 8).to(t + 20, [200, 352], ease.out).to(t + 32, [200, 372], ease.in);
    tr.floaters.forEach((f, k) => {
      const s = t + 10 + k * 14;
      f.o.hold(s).to(s + 6, 1, ease.out).hold(s + 40).to(s + 56, 0, ease.in);
      f.p.hold(s).to(s + 56, [f.x + (k % 2 ? 18 : -18), 34], ease.out);
      f.s.hold(s).to(s + 12, [1, 1], ease.out);
    });
    tr.knobR.to(t + 10, 90, ease.out).set(t + 120, 0);
  },

  glitch(tr, { from: t }) {
    tr.glitchO.hold(t + 4).to(t + 5, 1, null).hold(t + 58).to(t + 59, 0, null);
    let seed = 7;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let f = t + 5; f < t + 58; f += 3) {
      tr.bars.forEach((b) => b.set(f, [SCREEN.x + 6 + rnd() * 70, SCREEN.y + 10 + rnd() * 120]));
      tr.bodyP.set(f, [200 + (rnd() - 0.5) * 10, 372]);
      tr.faceP.set(f, [C[0] + (rnd() - 0.5) * 14, C[1]]);
    }
    tr.bodyP.set(t + 60, [200, 372]);
    tr.faceP.set(t + 60, C);
    tr.antR.hold(t + 4).oscillate(14, 6, t + 58);
    tr.eyesS.hold(t + 66).by(4, [1, 0.1], ease.in).by(7, [1, 1], ease.out);
    tr.knobR.to(t + 8, -120, ease.out).hold(t + 60).to(t + 70, 0, ease.inOut);
  },

  loading(tr, { from: t }) {
    face(tr, null, t + 4, t + 118);
    tr.dotsO.hold(t + 4).to(t + 6, 1, null).hold(t + 72).to(t + 74, 0, null);
    tr.dots.forEach((d, k) => {
      for (let c = t + 6 + k * 6; c + 22 <= t + 72; c += 32) d.hold(c).to(c + 10, [C[0] - 20 + k * 20, C[1] - 16], ease.out).to(c + 20, [C[0] - 20 + k * 20, C[1]], ease.in);
    });
    tr.checkE.hold(t + 74).to(t + 90, 1, ease.out).hold(t + 112).set(t + 118, 0);
    tr.checkO.hold(t + 74).to(t + 75, 1, null).hold(t + 112).to(t + 118, 0, ease.in);
    tr.bodyS.hold(t + 88).to(t + 92, [1.06, 0.94], ease.out).spring([1, 1], { stiffness: 300, damping: 14 });
  },
};

/** Swap the normal face for `target` (or hide it if target is null) between on and off. */
function face(tr, target, on, off) {
  tr.faceO.hold(on).to(on + 2, 0, null).hold(off).to(off + 2, 1, null);
  if (target) target.hold(on).to(on + 2, 1, null).hold(off).to(off + 2, 0, null);
}

export function telly(o) {
  const S = TELLY_STYLES[o.style];
  const X = (s) => `${o.id}-${s}`;
  const P = hex(S.screen);
  const tr = choreograph(o.id, {
    bodyS: T([1, 1]), bodyP: T([200, 372]), bodyR: T(0), antR: T(0), knobR: T(0),
    band: T([0, 0]), faceP: T(C), faceO: T(1), eyesS: T([1, 1]), eyeRO: T(1), winkO: T(0), mouthS: T([1, 1]),
    heartsO: T(0), heartsS: T([1, 1]), spark: T([0, 0]),
    floaters: [150, 200, 250].map((x) => ({ x, p: T([x, 92]), o: T(0), s: T([0.4, 0.4]) })),
    glitchO: T(0), bars: [0, 1, 2, 3].map(() => T([SCREEN.x + 20, SCREEN.y + 40])),
    dotsO: T(0), dots: [0, 1, 2].map((k) => T([C[0] - 20 + k * 20, C[1]])), checkE: T(0), checkO: T(0),
  }, o.segments.map((seg) => ({ ...seg, run: SEGMENTS[seg.kind] })), o.end);

  const ink = (w) => ({ c: INK, w });
  const cab = hex(S.cabinet);
  const cabDark = hex(shade(S.cabinet, 0.3));
  const glass = hex(S.glass);
  const faceParts = (color, dx = 0) => [
    shape(ellipse(C[0] - 21 + dx, C[1] - 9, 8, 11), { fill: color }),
    shape(ellipse(C[0] + 21 + dx, C[1] - 9, 8, 11), { fill: color }),
    shape(arc(C[0] + dx, C[1] + 8, 13, 25, 155, 2), { stroke: { c: color, w: 5 } }),
  ];

  const node = g({ name: S.name, a: [200, 372], p: [o.x ?? 200, o.y ?? 372], s: [o.scale ?? 1, o.scale ?? 1] }, [
    shape(ellipse(200, 374, 110, 9), { fill: hex('#0B0B1A', 0.12) }),
    g({ id: X('body'), a: [200, 372], p: tr.bodyP, s: tr.bodyS, r: tr.bodyR }, [
      // legs
      shape(poly([[134, 300], [118, 366]]), { stroke: ink(9) }),
      shape(poly([[266, 300], [282, 366]]), { stroke: ink(9) }),
      shape(ellipse(116, 368, 11, 5), { fill: INK }),
      shape(ellipse(284, 368, 11, 5), { fill: INK }),
      // antenna
      g({ a: [200, 120], p: [200, 120], r: tr.antR }, [
        shape(poly([[192, 120], [146, 44]]), { stroke: ink(5) }),
        shape(poly([[208, 120], [258, 38]]), { stroke: ink(5) }),
        shape(ellipse(146, 44, 8), { fill: INK }),
        shape(ellipse(258, 38, 8), { fill: INK }),
      ]),
      // cabinet
      shape(rect(88, 118, 224, 196, 44), { fill: cab, stroke: ink(5) }),
      shape(rect(100, 128, 92, 8, 4), { fill: hex('#FFFFFF', 0.3) }),
      shape(ellipse(200, 120, 22, 11), { fill: cabDark, stroke: ink(4) }),
      shape(rect(SCREEN.x - 6, SCREEN.y - 6, SCREEN.w + 12, SCREEN.h + 12, 40), { fill: cabDark, stroke: ink(4) }),
      shape(rect(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h, 34), { fill: glass, stroke: ink(4) }),
      // side panel
      ...[172, 214].map((y) => g({ a: [286, y], p: [286, y], r: tr.knobR }, [
        shape(ellipse(286, y, 13), { fill: cabDark, stroke: ink(4) }),
        shape(poly([[286, y], [286, y - 9]]), { stroke: ink(3.5) }),
      ])),
      ...[248, 260, 272].map((y) => shape(poly([[274, y], [298, y]]), { stroke: { c: cabDark, w: 4 } })),
      // screen content
      ...[0, 1, 2, 3, 4, 5].map((k) => shape(rect(SCREEN.x + 14, SCREEN.y + 18 + k * 22, SCREEN.w - 28, 2), { fill: hex(S.screen, 0.08) })),
      g({ p: tr.band, a: [0, 0] }, [shape(rect(SCREEN.x + 12, SCREEN.y + 10, SCREEN.w - 24, 16, 8), { fill: hex(S.screen, 0.1) })]),
      g({ id: X('face'), a: C, p: tr.faceP }, [
        g({ o: tr.faceO }, [
          g({ a: [C[0], C[1] - 9], p: [C[0], C[1] - 9], s: tr.eyesS }, [
            shape(ellipse(C[0] - 21, C[1] - 9, 8, 11), { fill: P }),
            g({ o: tr.eyeRO }, [shape(ellipse(C[0] + 21, C[1] - 9, 8, 11), { fill: P })]),
          ]),
          g({ o: tr.winkO }, [shape(smoothOpen([[C[0] + 12, C[1] - 6], [C[0] + 21, C[1] - 15], [C[0] + 30, C[1] - 6]]), { stroke: { c: P, w: 5 } })]),
          g({ a: [C[0], C[1] + 14], p: [C[0], C[1] + 14], s: tr.mouthS }, [shape(arc(C[0], C[1] + 8, 13, 25, 155, 2), { stroke: { c: P, w: 5 } })]),
        ]),
        g({ o: tr.heartsO }, [
          ...[-21, 21].map((dx) => g({ a: [C[0] + dx, C[1] - 9], p: [C[0] + dx, C[1] - 9], s: tr.heartsS }, [
            shape(heart(C[0] + dx, C[1] - 9, 30), { fill: hex('#FF5C8A') }),
          ])),
          shape(arc(C[0], C[1] + 10, 13, 25, 155, 2), { stroke: { c: P, w: 5 } }),
        ]),
      ]),
      // glitch: chromatic split + noise bars
      g({ o: tr.glitchO }, [
        ...faceParts(hex('#FF3B6B', 0.8), -5),
        ...faceParts(hex('#3BE0FF', 0.8), 5),
        ...tr.bars.map((b, k) => g({ p: b, a: [0, 0] }, [shape(rect(0, 0, [60, 40, 52, 30][k], [6, 3, 4, 8][k]), { fill: k % 2 ? hex('#FFFFFF', 0.7) : P })])),
      ]),
      // loading dots + check
      g({ o: tr.dotsO }, tr.dots.map((d) => g({ p: d, a: [0, 0] }, [shape(ellipse(0, 0, 7), { fill: P })]))),
      shape(poly([[C[0] - 24, C[1]], [C[0] - 7, C[1] + 17], [C[0] + 26, C[1] - 18]]), { stroke: { c: P, w: 9 }, trim: { s: 0, e: tr.checkE }, o: tr.checkO }),
      shape(ellipse(SCREEN.x + 40, SCREEN.y + 34, 26, 12), { fill: hex('#FFFFFF', 0.1), a: [SCREEN.x + 40, SCREEN.y + 34], p: [SCREEN.x + 40, SCREEN.y + 34], r: -32 }),
    ]),
    ...tr.floaters.map((f) => g({ p: f.p, a: [0, 0], s: f.s, o: f.o }, [shape(heart(0, 0, 26), { fill: hex('#FF5C8A'), stroke: ink(3) })])),
    g({ p: [282, 112], a: [0, 0], s: tr.spark }, [shape(sparkle(0, 0, 20), { fill: hex('#FFD23F'), stroke: ink(3) })]),
  ]);

  return { node, look: [{ node: X('face'), x: 7, y: 5 }, { node: X('body'), x: 0, y: 0, r: 3 }] };
}

export const TELLY_TIMELINE = {
  segments: [
    { kind: 'idle', from: 0, to: 240 },
    { kind: 'wink', from: 240, to: 340 },
    { kind: 'love', from: 340, to: 470 },
    { kind: 'glitch', from: 470, to: 560 },
    { kind: 'loading', from: 560, to: 700 },
  ],
  states: {
    idle: { from: 0, to: 240, loop: true },
    wink: { from: 240, to: 340, next: 'idle' },
    love: { from: 340, to: 470, next: 'idle' },
    glitch: { from: 470, to: 560, next: 'idle' },
    loading: { from: 560, to: 700, next: 'idle' },
  },
  end: 700,
};
