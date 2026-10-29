/*
 * Bolt — an original atomic-age tin robot. 400×460 design space, treads resting on y=440.
 */
import { T, ease, hex, shade, ellipse, rect, poly, smoothOpen, arc, burst, g, shape, choreograph } from '../../core/dsl.js';

const INK = hex('#1B1B22');

export const BOLT_STYLES = {
  chrome: { name: 'Chrome', metal: '#C7D0DC', eye: '#5CE1FF', accent: '#FF4D4D', bg: '#E8EEF6' },
  teal: { name: 'Teal', metal: '#3BB6B0', eye: '#E9FF7A', accent: '#FF6B4A', bg: '#DCF4F1' },
  orange: { name: 'Tangerine', metal: '#F07B3A', eye: '#7CF3FF', accent: '#2F6BFF', bg: '#FFE8DA' },
  black: { name: 'Matte Black', metal: '#3A3B46', eye: '#FF9A3D', accent: '#FF3B5C', bg: '#E6E5EE' },
};

const ARM_R = [288, 262];

const SEGMENTS = {
  idle(tr, { from, to }) {
    tr.bodyP.oscillate([200, 434], 80, to);
    tr.antR.oscillate(6, 120, to);
    tr.haloO.oscillate(0.6, 60, to);
    tr.needleR.oscillate(30, 80, to);
    for (let c = from; c + 60 <= to; c += 60) {
      tr.lights.forEach((l, k) => l.hold(c + k * 20).by(4, 1, ease.out).wait(8).by(8, 0.35, ease.in));
    }
    for (const b of [100, 210]) if (from + b + 11 <= to) tr.eyesS.hold(from + b).by(4, [1, 0.1], ease.in).by(7, [1, 1], ease.out);
  },

  wave(tr, { from: t }) {
    tr.armR.to(t + 18, -158, ease.out).to(t + 24, -150, ease.inOut).oscillate(-124, 16, t + 88).to(t + 108, 6, ease.inOut).to(t + 116, 0, ease.out);
    tr.bodyP.to(t + 10, [200, 426], ease.out).spring([200, 440], { stiffness: 240, damping: 12 });
    swapEyes(tr, tr.happyO, t + 8, t + 100);
    tr.mouthS.hold(t + 20).oscillate([1, 2.2], 8, t + 60);
    tr.ballS.to(t + 6, [1.35, 1.35], ease.out).spring([1, 1], { stiffness: 300, damping: 10 });
    tr.haloO.to(t + 6, 1, ease.out).hold(t + 60).to(t + 80, 0.25, ease.inOut);
    tr.headR.hold(t + 10).to(t + 22, 6, ease.out).hold(t + 88).to(t + 104, 0, ease.inOut);
  },

  compute(tr, { from: t }) {
    swapEyes(tr, tr.squintO, t + 4, t + 70);
    tr.needleR.to(t + 68, 720, ease.inOut).set(t + 69, 0);
    for (let f = t + 2; f < t + 68; f += 4) {
      tr.lights.forEach((l, k) => l.set(f, ((f / 4 + k) % 3 === 0) ? 1 : 0.2));
    }
    tr.lights.forEach((l) => l.set(t + 70, 1).hold(t + 100).to(t + 112, 0.35, ease.inOut));
    tr.headR.hold(t + 4).oscillate(4, 20, t + 64);
    tr.antR.hold(t + 10).oscillate(10, 6, t + 64);
    tr.haloO.hold(t + 64).to(t + 72, 1, ease.out).hold(t + 100).to(t + 116, 0.25, ease.inOut);
    tr.ballS.hold(t + 70).to(t + 71, [0.6, 0.6], null).spring([1, 1], { stiffness: 340, damping: 10 });
    tr.eyesS.hold(t + 70).to(t + 71, [0.5, 0.5], null).spring([1, 1], { stiffness: 380, damping: 15 });
    swapEyes(tr, tr.happyO, t + 86, t + 122);
    tr.mouthS.hold(t + 72).to(t + 78, [1, 2.4], ease.out).hold(t + 110).to(t + 120, [1, 1], ease.inOut);
    tr.bodyP.hold(t + 70).to(t + 80, [200, 424], ease.out).to(t + 92, [200, 440], ease.in);
  },
};

function swapEyes(tr, target, on, off) {
  tr.openO.hold(on).to(on + 2, 0, null).hold(off).to(off + 2, 1, null);
  target.hold(on).to(on + 2, 1, null).hold(off).to(off + 2, 0, null);
}

export function bolt(o) {
  const S = BOLT_STYLES[o.style];
  const X = (s) => `${o.id}-${s}`;
  const tr = choreograph(o.id, {
    bodyP: T([200, 440]), headR: T(0), antR: T(0), ballS: T([1, 1]), haloO: T(0.25),
    needleR: T(0), lights: [T(0.35), T(0.35), T(0.35)],
    eyesS: T([1, 1]), openO: T(1), happyO: T(0), squintO: T(0), mouthS: T([1, 1]),
    armR: T(0),
  }, o.segments.map((seg) => ({ ...seg, run: SEGMENTS[seg.kind] })), o.end);

  const ink = (w) => ({ c: INK, w });
  const metal = hex(S.metal);
  const dark = hex(shade(S.metal, 0.35));
  const darker = hex(shade(S.metal, 0.55));
  const eye = hex(S.eye);
  const visor = hex(S.metal === BOLT_STYLES.black.metal ? '#0E0F14' : '#19202C');
  const shine = hex('#FFFFFF', 0.3);
  const claw = (cx) => shape(arc(cx, 358, 14, 150, 390, 4), { stroke: { c: darker, w: 9 } });
  const arm = (x, pivot, r) => g({ a: pivot, p: pivot, r }, [
    shape(rect(x, 254, 34, 92, 17), { fill: metal, stroke: ink(4) }),
    claw(x + 17),
  ]);

  const node = g({ name: S.name, a: [200, 440], p: [o.x ?? 200, o.y ?? 440], s: [o.scale ?? 1, o.scale ?? 1] }, [
    g({ a: [200, 448], p: [200, 448], s: T([1, 1]) }, [shape(ellipse(200, 448, 104, 10), { fill: hex('#0B0B1A', 0.12) })]),
    g({ id: X('body'), a: [200, 440], p: tr.bodyP }, [
      // treads
      shape(rect(124, 392, 152, 46, 23), { fill: darker, stroke: ink(5) }),
      ...[162, 200, 238].map((x) => shape(ellipse(x, 415, 12), { fill: dark, stroke: ink(4) })),
      // arms behind torso edge
      arm(78, [112, 262], 0),
      arm(288, ARM_R, tr.armR),
      // torso
      shape(rect(110, 232, 180, 168, 44), { fill: metal, stroke: ink(5) }),
      shape(rect(124, 248, 14, 118, 7), { fill: shine }),
      shape(rect(146, 262, 108, 98, 24), { fill: dark, stroke: ink(4) }),
      shape(ellipse(200, 300, 28), { fill: hex('#FFF6E4'), stroke: ink(4) }),
      ...[-60, -30, 0, 30, 60].map((deg) => {
        const a = ((deg - 90) * Math.PI) / 180;
        return shape(poly([[200 + Math.cos(a) * 20, 300 + Math.sin(a) * 20], [200 + Math.cos(a) * 25, 300 + Math.sin(a) * 25]]), { stroke: { c: INK, w: 2.5 } });
      }),
      g({ a: [200, 300], p: [200, 300], r: tr.needleR }, [
        shape(poly([[200, 304], [200, 280]]), { stroke: { c: hex(S.accent), w: 5 } }),
      ]),
      shape(ellipse(200, 300, 5), { fill: INK }),
      ...tr.lights.map((l, k) => g({ o: l }, [shape(ellipse(176 + k * 24, 340, 7), { fill: hex([S.accent, S.eye, '#FFD23F'][k]), stroke: ink(3) })])),
      shape(ellipse(112, 262, 12), { fill: darker, stroke: ink(4) }),
      shape(ellipse(288, 262, 12), { fill: darker, stroke: ink(4) }),
      shape(rect(182, 212, 36, 24, 6), { fill: darker, stroke: ink(4) }),
      // head
      g({ id: X('head'), a: [200, 224], p: [200, 224], r: tr.headR }, [
        g({ a: [200, 96], p: [200, 96], r: tr.antR }, [
          shape(poly([[200, 96], [200, 58]]), { stroke: ink(6) }),
          g({ o: tr.haloO }, [shape(ellipse(200, 48, 24), { fill: hex(S.accent, 0.35) })]),
          g({ a: [200, 48], p: [200, 48], s: tr.ballS }, [
            shape(ellipse(200, 48, 13), { fill: hex(S.accent), stroke: ink(4) }),
            shape(ellipse(196, 44, 4, 3), { fill: hex('#FFFFFF', 0.6) }),
          ]),
          ...(o.sparks ?? []).flatMap((t) => burst(200, 48, { t, dur: 26, count: 8, r0: 16, r1: 60, size: 5, colors: [S.accent, '#FFD23F', S.eye] })),
        ]),
        shape(rect(100, 128, 22, 52, 10), { fill: dark, stroke: ink(4) }),
        shape(rect(278, 128, 22, 52, 10), { fill: dark, stroke: ink(4) }),
        shape(rect(114, 92, 172, 128, 38), { fill: metal, stroke: ink(5) }),
        shape(rect(130, 100, 62, 8, 4), { fill: shine }),
        shape(rect(136, 114, 128, 86, 28), { fill: visor, stroke: ink(4) }),
        g({ id: X('face'), a: [200, 157], p: [200, 157] }, [
          g({ o: tr.haloO }, [
            shape(ellipse(174, 150, 25), { fill: hex(S.eye, 0.22) }),
            shape(ellipse(226, 150, 25), { fill: hex(S.eye, 0.22) }),
          ]),
          g({ a: [200, 150], p: [200, 150], s: tr.eyesS }, [
            g({ o: tr.openO }, [
              shape(ellipse(174, 150, 14), { fill: eye }),
              shape(ellipse(226, 150, 14), { fill: eye }),
              shape(ellipse(169, 145, 4.5, 3.5), { fill: hex('#FFFFFF', 0.8) }),
              shape(ellipse(221, 145, 4.5, 3.5), { fill: hex('#FFFFFF', 0.8) }),
            ]),
          ]),
          g({ o: tr.happyO }, [
            shape(smoothOpen([[160, 156], [174, 142], [188, 156]]), { stroke: { c: eye, w: 7 } }),
            shape(smoothOpen([[212, 156], [226, 142], [240, 156]]), { stroke: { c: eye, w: 7 } }),
          ]),
          g({ o: tr.squintO }, [
            shape(poly([[160, 150], [188, 150]]), { stroke: { c: eye, w: 7 } }),
            shape(poly([[212, 150], [240, 150]]), { stroke: { c: eye, w: 7 } }),
          ]),
          g({ a: [200, 181], p: [200, 181], s: tr.mouthS }, [shape(rect(182, 177, 36, 8, 4), { fill: eye })]),
        ]),
      ]),
    ]),
  ]);

  return { node, look: [{ node: X('face'), x: 9, y: 5 }, { node: X('head'), x: 0, y: 0, r: 4 }] };
}

export const BOLT_TIMELINE = {
  segments: [
    { kind: 'idle', from: 0, to: 240 },
    { kind: 'wave', from: 240, to: 380 },
    { kind: 'compute', from: 380, to: 530 },
  ],
  states: {
    idle: { from: 0, to: 240, loop: true },
    wave: { from: 240, to: 380, next: 'idle' },
    compute: { from: 380, to: 530, next: 'idle' },
  },
  sparks: [450],
  end: 530,
};
