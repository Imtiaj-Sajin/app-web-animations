import { defineAnimation, T, ease, hex, ellipse, heart, poly, arc, rect, g, shape } from '../../core/dsl.js';

const INK = hex('#1B1B22');
const BURST = ['#FF3B5C', '#FFB020', '#2F6BFF', '#22C38E'];

/** Radial burst of dots — returns nodes animated between frames t and t+dur. */
function burst(cx, cy, { t, dur = 30, count = 8, r0 = 36, r1 = 92, size = 6, rot = 22.5, colors = BURST }) {
  return Array.from({ length: count }, (_, k) => {
    const a = ((k * 360) / count + rot) * (Math.PI / 180);
    const far = k % 2 ? r1 * 0.82 : r1;
    const p = T([cx + Math.cos(a) * r0, cy + Math.sin(a) * r0]).hold(t)
      .to(t + dur, [cx + Math.cos(a) * far, cy + Math.sin(a) * far], ease.out);
    const s = T([0, 0]).hold(t).to(t + 1, [1, 1], null).hold(t + dur * 0.35).to(t + dur, [0, 0], ease.in);
    return g({ p, a: [0, 0], s }, [shape(ellipse(0, 0, k % 2 ? size * 0.75 : size), { fill: hex(colors[k % colors.length]) })]);
  });
}

export const heartLike = (() => {
  const C = [120, 124];
  // idle 0–40 · like 40–110 · liked 110–150 · unlike 150–205
  const pop = T([1, 1]).hold(40).to(48, [0.78, 0.78], ease.out).to(52, [1.18, 1.18], ease.out)
    .spring([1, 1], { stiffness: 260, damping: 11 }).hold(150).to(156, [0.86, 0.86], ease.out)
    .spring([1, 1], { stiffness: 300, damping: 16 });
  const fillS = T([0, 0]).hold(48).to(49, [0.3, 0.3], null).spring([1, 1], { stiffness: 300, damping: 12 })
    .hold(150).to(160, [0, 0], ease.in);
  const outlineO = T(1).hold(49).to(52, 0, null).hold(156).to(160, 1, null);
  const ringS = T([0.3, 0.3]).hold(48).to(72, [1.6, 1.6], ease.out);
  const ringW = T(16).hold(48).to(72, 0, ease.out);
  const ringO = T(0).hold(48).to(49, 1, null).hold(64).to(72, 0, ease.in);
  return defineAnimation({
    id: 'heart-like', name: 'Heart Like', category: 'Micro-interactions', bg: '#FFE5EA',
    description: 'The like button, perfected: squish, pop, confetti. Tap again to unlike.',
    tags: ['button', 'like', 'favorite', 'toggle', 'social'],
    w: 240, h: 240,
    states: {
      idle: { from: 0, to: 40, loop: true },
      like: { from: 40, to: 110, next: 'liked' },
      liked: { from: 110, to: 150, loop: true },
      unlike: { from: 150, to: 205, next: 'idle' },
    },
    initial: 'idle',
    interact: { tap: { idle: 'like', like: 'unlike', liked: 'unlike', unlike: 'like' } },
    layers: [
      g({ p: C, a: [0, 0], s: ringS, o: ringO }, [
        shape(ellipse(0, 0, 46), { stroke: { c: hex('#FF8FA3'), w: ringW } }),
      ]),
      ...burst(C[0], C[1], { t: 50, dur: 32, r0: 44, r1: 100 }),
      g({ p: C, a: C, s: pop }, [
        g({ o: outlineO }, [shape(heart(C[0], C[1], 92), { stroke: { c: hex('#9AA1B2'), w: 7 } })]),
        g({ p: C, a: C, s: fillS }, [
          shape(heart(C[0], C[1], 92), { fill: hex('#FF3B5C') }),
          shape(ellipse(C[0] - 22, C[1] - 22, 9, 6), { fill: hex('#FFFFFF', 0.45), a: [C[0] - 22, C[1] - 22], p: [C[0] - 22, C[1] - 22], r: -35 }),
        ]),
      ]),
    ],
  });
})();

export const successCheck = (() => {
  const C = [120, 120];
  const ringE = T(0).hold(4).to(32, 1, ease.inOut).hold(124).set(140, 0);
  const ringO = T(1).hold(30).to(40, 0, ease.out).hold(140).set(141, 1);
  const discS = T([0, 0]).hold(26).to(27, [0.4, 0.4], null).spring([1, 1], { stiffness: 280, damping: 13 });
  const checkE = T(0).hold(34).to(52, 1, ease.out);
  const popS = T([1, 1]).hold(52).to(58, [1.1, 1.1], ease.out).spring([1, 1], { stiffness: 260, damping: 12 })
    .hold(120).to(136, [0.86, 0.86], ease.in).set(140, [1, 1]);
  const allO = T(1).hold(120).to(136, 0, ease.in).hold(140).set(141, 1);
  discS.hold(140).set(141, [0, 0]);
  checkE.hold(140).set(141, 0);
  return defineAnimation({
    id: 'success-check', name: 'Success Check', category: 'Micro-interactions', bg: '#DDF7EC',
    description: 'A ring draws itself, the badge pops, the check lands. Perfect after a payment or a saved form.',
    tags: ['success', 'done', 'checkmark', 'confirmation', 'form'],
    w: 240, h: 240, poster: 90,
    states: { success: { from: 0, to: 150, loop: true } },
    initial: 'success',
    interact: { tap: 'success' },
    layers: [
      g({ p: C, a: C, s: popS, o: allO }, [
        shape(arc(C[0], C[1], 74, -90, 270, 4), { stroke: { c: hex('#22C38E'), w: 6 }, trim: { s: 0, e: ringE }, o: ringO }),
        g({ p: C, a: C, s: discS }, [shape(ellipse(C[0], C[1], 64), { fill: hex('#22C38E') })]),
        shape(poly([[90, 122], [111, 143], [151, 99]]), { stroke: { c: hex('#FFFFFF'), w: 13 }, trim: { s: 0, e: checkE } }),
        ...burst(C[0], C[1], { t: 54, dur: 28, r0: 70, r1: 104, size: 5, colors: ['#22C38E', '#FFB020', '#2F6BFF'] }),
      ]),
    ],
  });
})();

export const blobLoader = (() => {
  const colors = ['#2F6BFF', '#F0663A', '#F6B92B'];
  const BASE = 86, R = 15;
  const dots = colors.map((c, k) => {
    const x = 78 + k * 42;
    const t = k * 9;
    const p = T([x, BASE]).hold(t + 4).to(t + 17, [x, BASE - 34], ease.out).to(t + 30, [x, BASE], ease.in);
    const s = T([1, 1]).hold(t).to(t + 4, [1.28, 0.74], ease.out).to(t + 10, [0.86, 1.16], ease.out)
      .to(t + 17, [1, 1], ease.inOut).to(t + 30, [0.9, 1.1], ease.in).to(t + 33, [1.22, 0.8], ease.out).to(t + 42, [1, 1], ease.out);
    const sh = T([1, 1]).hold(t + 4).to(t + 17, [0.55, 0.55], ease.out).to(t + 30, [1, 1], ease.in);
    return [
      g({ p: [x, BASE + 4], a: [x, BASE + 4], s: sh }, [shape(ellipse(x, BASE + 4, 13, 3.5), { fill: hex('#0B0B1A', 0.12) })]),
      g({ p, a: [x, BASE], s }, [
        shape(ellipse(x, BASE - R, R), { fill: hex(c) }),
        shape(ellipse(x - 5, BASE - R - 6, 4.5, 3), { fill: hex('#FFFFFF', 0.35) }),
      ]),
    ];
  }).flat();
  return defineAnimation({
    id: 'blob-loader', name: 'Blob Loader', category: 'Loaders', bg: '#EEF0F6',
    description: 'Three squishy dots that bounce with real squash & stretch. A loader people actually enjoy watching.',
    tags: ['loader', 'loading', 'spinner', 'progress', 'wait'],
    w: 240, h: 120,
    states: { loading: { from: 0, to: 60, loop: true } },
    initial: 'loading',
    layers: dots,
  });
})();

export const bellRing = (() => {
  const P = [120, 52];
  // idle 0–60 · ring 60–170
  const swing = T(0).hold(60).to(66, 20, ease.out).spring(0, { stiffness: 210, damping: 8, velocity: 0 });
  const clap = T(0).hold(62).to(70, -26, ease.out).spring(0, { stiffness: 190, damping: 8 });
  const badgeS = T([0, 0]).hold(72).to(73, [0.3, 0.3], null).spring([1, 1], { stiffness: 360, damping: 12 })
    .hold(154).to(166, [0, 0], ease.in);
  const wave = (side, delay) => {
    const o = T(0).hold(64 + delay).to(68 + delay, 1, ease.out).to(90 + delay, 0, ease.in);
    const p = T([120 + side * 62, 110]).hold(64 + delay).to(90 + delay, [120 + side * 84, 110], ease.out);
    return g({ p, a: [120, 110], o }, [
      shape(arc(120, 110, 26, side > 0 ? -38 : 142, side > 0 ? 38 : 218, 2), { stroke: { c: hex('#F2A20C'), w: 6 } }),
    ]);
  };
  return defineAnimation({
    id: 'bell-ring', name: 'Bell Ring', category: 'Micro-interactions', bg: '#FFF4D6',
    description: 'A notification bell that swings on a real pendulum, clapper lagging behind, badge popping in.',
    tags: ['notification', 'bell', 'alert', 'badge', 'inbox'],
    w: 240, h: 240,
    states: { idle: { from: 0, to: 60, loop: true }, ring: { from: 60, to: 170, next: 'idle' } },
    initial: 'idle',
    interact: { tap: 'ring', hover: 'ring' },
    layers: [
      wave(-1, 0), wave(1, 0), wave(-1, 12), wave(1, 12),
      shape(ellipse(120, 196, 44, 7), { fill: hex('#0B0B1A', 0.1) }),
      g({ p: P, a: P, r: swing }, [
        g({ p: [120, 100], a: [120, 100], r: clap }, [shape(ellipse(120, 166, 13), { fill: hex('#C77B00') })]),
        shape(ellipse(120, 50, 9), { fill: hex('#F2A20C') }),
        shape(ellipse(120, 96, 40, 40), { fill: hex('#FFB82E') }),
        shape(poly([[80, 96], [160, 96], [170, 148], [70, 148]], true), { fill: hex('#FFB82E') }),
        shape(rect(60, 140, 120, 18, 9), { fill: hex('#F2A20C') }),
        shape(ellipse(100, 84, 8, 16), { fill: hex('#FFFFFF', 0.4), a: [100, 84], p: [100, 84], r: 20 }),
      ]),
      g({ p: [166, 62], a: [0, 0], s: badgeS }, [
        shape(ellipse(0, 0, 19), { fill: hex('#FF3B5C') }),
        shape(rect(-3.5, -10, 7, 20, 3.5), { fill: hex('#FFFFFF') }),
      ]),
    ],
  });
})();

export const squishToggle = (() => {
  // off 0–20 · turnOn 20–76 · on 76–96 · turnOff 96–152
  const L = 92, Rt = 148, Y = 120;
  const settle = { stiffness: 320, damping: 20 };
  const knobP = T([L, Y]).hold(20).to(40, [Rt, Y], ease.snap).hold(96).to(116, [L, Y], ease.snap);
  const knobS = T([1, 1]).hold(20).to(28, [1.32, 0.84], ease.out).to(40, [0.92, 1.06], ease.out).spring([1, 1], settle)
    .hold(96).to(104, [1.32, 0.84], ease.out).to(116, [0.92, 1.06], ease.out).spring([1, 1], settle);
  const trackOn = T(0).hold(22).to(40, 1, ease.inOut).hold(98).to(116, 0, ease.inOut);
  const faceO = T(0).hold(36).to(42, 1, ease.out).hold(96).to(100, 0, ease.in);
  return defineAnimation({
    id: 'squish-toggle', name: 'Squish Toggle', category: 'Micro-interactions', bg: '#E4F6EE',
    description: 'A switch with a jelly knob that stretches as it slides and smiles when it’s on.',
    tags: ['toggle', 'switch', 'settings', 'form', 'button'],
    w: 240, h: 240,
    states: {
      off: { from: 0, to: 20, loop: true },
      turnOn: { from: 20, to: 76, next: 'on' },
      on: { from: 76, to: 96, loop: true },
      turnOff: { from: 96, to: 152, next: 'off' },
    },
    initial: 'off',
    interact: { tap: { off: 'turnOn', turnOn: 'turnOff', on: 'turnOff', turnOff: 'turnOn' } },
    layers: [
      shape(rect(56, 84, 128, 72, 36), { fill: hex('#D9DCE5') }),
      g({ o: trackOn }, [shape(rect(56, 84, 128, 72, 36), { fill: hex('#22C38E') })]),
      g({ p: knobP, a: [0, 0], s: knobS }, [
        shape(ellipse(0, 3, 28), { fill: hex('#0B3B2A', 0.16) }),
        shape(ellipse(0, 0, 28), { fill: hex('#FFFFFF') }),
        g({ o: faceO }, [
          shape(ellipse(-8, -3, 3, 4.2), { fill: INK }),
          shape(ellipse(8, -3, 3, 4.2), { fill: INK }),
          shape(arc(0, 3, 6, 25, 155, 2), { stroke: { c: INK, w: 2.6 } }),
        ]),
      ]),
    ],
  });
})();
