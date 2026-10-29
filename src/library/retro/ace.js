/*
 * Ace — an original 1950s varsity mascot (pompadour, freckles, bowtie, cardigan).
 * Drawn as a bust in a 400×460 space; the bust's bottom edge sits on y=460.
 */
import {
  T, ease, hex, shade, ellipse, rect, poly, smoothOpen, smoothClosed, arc, sparkle, burst, g, shape, choreograph,
} from '../../core/dsl.js';

const INK = hex('#1B1B22');
const SKIN = '#F6CBA5';
const CREAM = '#FFF8EC';

export const ACE_STYLES = {
  cherry: { name: 'Cherry', primary: '#E2483D', stripe: '#FFE6BF', bow: '#2A3B8F', hair: '#2B1B17', bg: '#FFE7DC' },
  mint: { name: 'Mint', primary: '#36B48C', stripe: '#FFF2D2', bow: '#E2483D', hair: '#3B2416', bg: '#DDF5EB' },
  mustard: { name: 'Mustard', primary: '#E8A62A', stripe: '#2B2B33', bow: '#2F6BFF', hair: '#1E1E24', bg: '#FFF1D2' },
  noir: { name: 'Noir', primary: '#2A2A33', stripe: '#F3EDE2', bow: '#E2483D', hair: '#111116', bg: '#E8E6F0' },
};

const SMIRK = smoothOpen([[174, 228], [196, 238], [222, 233], [236, 222]]);
const SMIRK_WIDE = smoothOpen([[166, 226], [194, 245], [226, 239], [243, 219]]);
const SMILE = smoothOpen([[170, 226], [186, 238], [214, 238], [230, 226]]);
const SMILE_WIDE = smoothOpen([[162, 223], [184, 246], [216, 246], [238, 223]]);
const ARM_R = { pivot: [105, 400], rest: [105, 600] };

/** Visual kits: the same rig dressed as different characters. */
export const KITS = {
  ace: { hair: 'quiff', glasses: false, nose: 'hook', freckles: true, neck: 'bowtie', frame: false, mouth: [SMIRK, SMIRK_WIDE] },
  scout: { hair: 'cap', glasses: true, nose: 'button', freckles: false, neck: 'scarf', frame: true, mouth: [SMILE, SMILE_WIDE] },
};

export const SCOUT_STYLES = {
  ranger: { name: 'Ranger', primary: '#3E7D4F', stripe: '#FFF1D6', bow: '#E2483D', hair: '#B5532A', cap: '#E2483D', badge: '#FFF1D6', rays: '#F6C453', bg: '#E8F1E2' },
  cola: { name: 'Cola', primary: '#D63A2F', stripe: '#FFF1D6', bow: '#23315C', hair: '#4A2A1A', cap: '#23315C', badge: '#FFE9C9', rays: '#F2B35B', bg: '#FFE8DD' },
  seafoam: { name: 'Seafoam', primary: '#2A9D9A', stripe: '#FFF4DA', bow: '#F07B3A', hair: '#B5532A', cap: '#F07B3A', badge: '#FFF4DA', rays: '#9EDDD2', bg: '#E0F4F2' },
  atomic: { name: 'Atomic', primary: '#6C4BD8', stripe: '#FFE9A8', bow: '#FFB020', hair: '#2B1B17', cap: '#FFB020', badge: '#FFF0D0', rays: '#C9B8FF', bg: '#EEE8FF' },
};

/** The sunburst badge keeps turning through every state: exactly one ray-period (30°) per segment, so cuts are seamless. */
function frameMotion(tr, seg) {
  tr.raysR.to(seg.to, tr.raysR.value + 30, null);
  if (seg.kind === 'idle') {
    tr.stars.forEach((st, k) => {
      for (let c = seg.from + k * 30; c + 40 <= seg.to; c += 120) st.hold(c).to(c + 12, [1.25, 1.25], ease.out).to(c + 40, [0.55, 0.55], ease.inOut);
    });
  }
  if (seg.kind === 'thumbs' || seg.kind === 'cheer') {
    tr.ringS.hold(seg.from + 18).to(seg.from + 24, [1.05, 1.05], ease.out).spring([1, 1], { stiffness: 260, damping: 12 });
  }
}
const ARM_L = { pivot: [295, 400], rest: [295, 600] };

const SEGMENTS = {
  idle(tr, { from, to }) {
    tr.bodyS.oscillate([1, 1.012], 120, to);
    tr.headP.oscillate([200, 289], 120, to);
    tr.hairS.oscillate([1, 1.018], 120, to);
    for (const b of [70, 190, 202]) {
      if (from + b + 11 <= to) tr.eyesS.hold(from + b).by(4, [1, 0.1], ease.in).by(7, [1, 1], ease.out);
    }
    tr.browsP.hold(from + 130).by(6, [0, -6], ease.out).wait(22).by(8, [0, 0], ease.inOut);
  },

  thumbs(tr, { from: t, mouth: M }) {
    const a = tr.armR;
    a.o.to(t + 1, 1, null);
    a.p.to(t + 16, [ARM_R.pivot[0], ARM_R.pivot[1] - 10], ease.out).spring(ARM_R.pivot, { stiffness: 260, damping: 13 });
    a.r.to(t + 12, -12, ease.out).spring(0, { stiffness: 300, damping: 13 });
    a.s.hold(t + 22).to(t + 26, [1.07, 1.07], ease.out).spring([1, 1], { stiffness: 320, damping: 14 });
    tr.spark.s.hold(t + 20).to(t + 21, [0.2, 0.2], null).to(t + 28, [1.2, 1.2], ease.out).to(t + 35, [1, 1], ease.inOut).hold(t + 46).to(t + 56, [0, 0], ease.in);
    tr.spark.r.hold(t + 20).to(t + 56, 90, ease.out);
    tr.headR.to(t + 14, -5, ease.out).hold(t + 84).to(t + 98, 0, ease.inOut);
    wink(tr, t + 12, t + 80);
    tr.browLP.to(t + 14, [0, -8], ease.out).hold(t + 78).to(t + 88, [0, 0], ease.inOut);
    tr.smirk.to(t + 16, M[1], ease.out).hold(t + 80).to(t + 92, M[0], ease.inOut);
    tr.blushO.to(t + 20, 0.7, ease.out).hold(t + 80).to(t + 96, 0.35, ease.inOut);
    armDown(a, ARM_R, t + 88);
  },

  cheer(tr, { from: t }) {
    tr.bodyS.to(t + 8, [1.06, 0.92], ease.out).to(t + 18, [0.96, 1.05], ease.out).to(t + 26, [1, 1], ease.inOut)
      .hold(t + 36).to(t + 40, [1.05, 0.95], ease.out).spring([1, 1], { stiffness: 280, damping: 14 });
    tr.bodyP.hold(t + 8).to(t + 24, [200, 434], ease.out).to(t + 38, [200, 460], ease.in);
    tr.hairS.to(t + 26, [1, 1.07], ease.out).spring([1, 1], { stiffness: 220, damping: 10 });
    for (const [arm, A, dir] of [[tr.armR, ARM_R, -1], [tr.armL, ARM_L, 1]]) {
      arm.o.hold(t + 4).to(t + 5, 1, null);
      arm.p.hold(t + 4).to(t + 20, [A.pivot[0], A.pivot[1] - 6], ease.out).to(t + 30, A.pivot, ease.inOut);
      arm.r.hold(t + 4).to(t + 20, 18 * dir, ease.out).oscillate(28 * dir, 12, t + 92);
      armDown(arm, A, t + 94);
    }
    eyesTo(tr, 'happy', t + 6, t + 94);
    tr.smirkO.hold(t + 6).to(t + 8, 0, null).hold(t + 94).to(t + 97, 1, null);
    tr.grinO.hold(t + 6).to(t + 8, 1, null).hold(t + 94).to(t + 97, 0, null);
    tr.grinS.hold(t + 6).to(t + 7, [0.4, 0.4], null).spring([1, 1], { stiffness: 320, damping: 13 });
    tr.bowR.hold(t + 20).oscillate(14, 10, t + 80);
    tr.blushO.to(t + 16, 0.8, ease.out).hold(t + 92).to(t + 106, 0.35, ease.inOut);
  },

  nod(tr, { from: t, mouth: M }) {
    tr.headP.to(t + 8, [200, 295], ease.out).to(t + 17, [200, 285], ease.inOut).to(t + 25, [200, 294], ease.inOut).to(t + 36, [200, 287], ease.out);
    tr.faceP.to(t + 8, [200, 186], ease.out).to(t + 17, [200, 178], ease.inOut).to(t + 25, [200, 185], ease.inOut).to(t + 36, [200, 180], ease.out);
    tr.smirk.hold(t + 30).to(t + 40, M[1], ease.out).hold(t + 88).to(t + 98, M[0], ease.inOut);
    tr.browsP.hold(t + 40).oscillate([0, -7], 10, t + 70);
    wink(tr, t + 66, t + 88);
    tr.headR.hold(t + 60).to(t + 70, 4, ease.out).hold(t + 86).to(t + 98, 0, ease.inOut);
  },
};

function wink(tr, on, off) {
  tr.eyeRO.hold(on).to(on + 2, 0, null).hold(off).to(off + 2, 1, null);
  tr.winkRO.hold(on).to(on + 2, 1, null).hold(off).to(off + 2, 0, null);
}

function eyesTo(tr, kind, on, off) {
  for (const k of ['eyeLO', 'eyeRO']) tr[k].hold(on).to(on + 2, 0, null).hold(off).to(off + 2, 1, null);
  tr.happyO.hold(on).to(on + 2, 1, null).hold(off).to(off + 2, 0, null);
}

function armDown(arm, A, t) {
  arm.p.hold(t).to(t + 16, A.rest, ease.in);
  arm.r.hold(t).to(t + 16, A === ARM_R ? 25 : -25, ease.in);
  arm.o.hold(t + 15).to(t + 16, 0, null);
}

/**
 * o: { id, style, x, y, scale, segments: [{ kind, from, to }], end }
 * Returns { node, look }.
 */
export function ace(o) {
  const kit = KITS[o.kit ?? 'ace'];
  const S = (o.kit === 'scout' ? SCOUT_STYLES : ACE_STYLES)[o.style];
  const X = (s) => `${o.id}-${s}`;
  const tr = choreograph(o.id, {
    bodyS: T([1, 1]), bodyP: T([200, 460]),
    headR: T(0), headP: T([200, 287]), hairS: T([1, 1]), faceP: T([200, 180]),
    browsP: T([0, 0]), browLP: T([0, 0]),
    eyesS: T([1, 1]), eyeLO: T(1), eyeRO: T(1), winkRO: T(0), happyO: T(0),
    smirk: T(kit.mouth[0]), smirkO: T(1), grinO: T(0), grinS: T([0.4, 0.4]),
    blushO: T(0.35), bowR: T(0),
    armR: { p: T(ARM_R.rest), r: T(25), o: T(0), s: T([1, 1]) },
    armL: { p: T(ARM_L.rest), r: T(-25), o: T(0), s: T([1, 1]) },
    spark: { s: T([0, 0]), r: T(0) },
    raysR: T(0), ringS: T([1, 1]), stars: [0, 1, 2, 3].map(() => T([0.55, 0.55])),
  }, o.segments.map((seg) => ({
    ...seg,
    mouth: kit.mouth,
    run: (tr, sg) => { SEGMENTS[sg.kind](tr, sg); if (kit.frame) frameMotion(tr, sg); },
  })), o.end);

  const ink = (w) => ({ c: INK, w });
  const skin = hex(SKIN);
  const primary = hex(S.primary);
  const hair = hex(S.hair);

  const hairPieces = [
    smoothClosed([[108, 186], [104, 140], [116, 104], [142, 76], [180, 58], [222, 56], [262, 70], [288, 100], [298, 142], [292, 186],
      [278, 150], [258, 126], [228, 116], [196, 122], [168, 118], [140, 132], [122, 158]]),
    // the quiff: a thick wave sweeping up from the left temple and curling forward on the right
    smoothClosed([[118, 120], [124, 78], [158, 46], [208, 32], [258, 40], [292, 66], [290, 92], [268, 84], [238, 76], [206, 82], [176, 98], [150, 124]]),
  ];
  const hairRot = [0, 0];
  const capCrown = smoothClosed([[104, 140], [106, 104], [132, 72], [168, 56], [200, 52], [232, 56], [268, 72], [294, 104], [296, 140], [252, 126], [200, 122], [148, 126]]);
  const capBrim = smoothClosed([[118, 134], [158, 121], [200, 119], [242, 121], [282, 134], [262, 150], [200, 157], [138, 150]]);
  const tufts = [
    smoothClosed([[104, 134], [124, 138], [120, 176], [106, 168]]),
    smoothClosed([[296, 134], [276, 138], [280, 176], [294, 168]]),
  ];
  const hairGroup = kit.hair === 'cap'
    ? g({ a: [200, 130], p: [200, 130], s: tr.hairS }, [
      ...tufts.map((d) => shape(d, { fill: hair, stroke: ink(4) })),
      shape(capCrown, { fill: hex(S.cap), stroke: ink(5) }),
      shape(smoothOpen([[200, 54], [200, 122]]), { stroke: { c: hex(shade(S.cap, 0.3)), w: 3 } }),
      shape(smoothOpen([[150, 64], [164, 126]]), { stroke: { c: hex(shade(S.cap, 0.3)), w: 3 } }),
      shape(smoothOpen([[250, 64], [236, 126]]), { stroke: { c: hex(shade(S.cap, 0.3)), w: 3 } }),
      shape(ellipse(200, 54, 8), { fill: hex(shade(S.cap, 0.3)), stroke: ink(3) }),
      shape(ellipse(200, 92, 17), { fill: hex(S.badge), stroke: ink(3.5) }),
      shape(sparkle(200, 92, 11, 0.3), { fill: hex(S.cap) }),
      shape(smoothOpen([[128, 92], [150, 72], [178, 62]]), { stroke: { c: hex('#FFFFFF', 0.3), w: 5 } }),
      shape(capBrim, { fill: hex(shade(S.cap, 0.22)), stroke: ink(5) }),
    ])
    : null;
  const hairNode = (d, idx, style) => shape(d, { ...style, r: hairRot[idx] || undefined });

  const arm = (A, a, thumb) => {
    const x0 = A.pivot[0] - 27;
    return g({ a: A.pivot, p: a.p, r: a.r, o: a.o, s: a.s }, [
      shape(rect(x0, 255, 54, 170, 27), { fill: primary, stroke: ink(5) }),
      shape(rect(x0 + 2.5, 296, 49, 9), { fill: hex(S.stripe) }),
      shape(rect(x0 + 2.5, 311, 49, 5), { fill: hex(S.stripe) }),
      thumb ? shape(rect(x0 + 2, 154, 27, 58, 13.5), { fill: skin, stroke: ink(5) }) : null,
      shape(rect(x0 - 9, 200, 72, 64, 24), { fill: skin, stroke: ink(5) }),
      ...(thumb
        ? [218, 234, 249].map((y) => shape(smoothOpen([[x0 + 30, y], [x0 + 52, y + 1]]), { stroke: { c: hex(shade(SKIN, 0.35)), w: 4 } }))
        : [x0 + 6, x0 + 25, x0 + 44].map((x) => shape(smoothOpen([[x + 6, 206], [x + 6, 222]]), { stroke: { c: hex(shade(SKIN, 0.35)), w: 4 } }))),
    ]);
  };

  const CX = 200, CY = 214, R = 176;
  const rays = Array.from({ length: 12 }, (_, k) => {
    const a = (k * 30 * Math.PI) / 180, w = (7.5 * Math.PI) / 180;
    return [[CX, CY], [CX + Math.cos(a - w) * R, CY + Math.sin(a - w) * R], [CX + Math.cos(a + w) * R, CY + Math.sin(a + w) * R]];
  });
  const frame = kit.frame ? [
    g({ a: [CX, CY], p: [CX, CY], s: tr.ringS }, [
      shape(ellipse(CX, CY, R), { fill: hex(S.badge) }),
      g({ a: [CX, CY], p: [CX, CY], r: tr.raysR }, rays.map((pts) => shape(poly(pts, true), { fill: hex(S.rays, 0.55) }))),
      shape(ellipse(CX, CY, R - 14), { stroke: { c: hex(S.rays), w: 3 } }),
      shape(ellipse(CX, CY, R), { stroke: ink(5) }),
    ]),
    ...[[44, 70], [356, 84], [34, 322], [366, 300]].map(([x, y], k) =>
      g({ p: [x, y], a: [0, 0], s: tr.stars[k] }, [shape(sparkle(0, 0, 16), { fill: hex(S.rays), stroke: ink(3) })])),
  ] : [];

  const node = g({ name: S.name, a: [200, 460], p: [o.x ?? 200, o.y ?? 460], s: [o.scale ?? 1, o.scale ?? 1] }, [
    ...frame,
    g({ id: X('body'), a: [200, 460], p: tr.bodyP, s: tr.bodyS }, [
      // torso + cardigan
      shape(rect(84, 330, 232, 130, [74, 74, 0, 0]), { fill: primary, stroke: ink(5) }),
      shape(rect(172, 266, 56, 76, 16), { fill: skin, stroke: ink(5) }),
      shape(poly([[163, 330], [200, 402], [237, 330]]), { stroke: { c: hex(S.stripe), w: 14, cap: 'butt', join: 'miter' } }),
      shape(poly([[166, 331], [234, 331], [200, 398]], true), { fill: hex(CREAM), stroke: ink(4) }),
      shape(poly([[166, 329], [198, 342], [180, 364]], true), { fill: hex('#FFFFFF'), stroke: ink(4) }),
      shape(poly([[234, 329], [202, 342], [220, 364]], true), { fill: hex('#FFFFFF'), stroke: ink(4) }),
      kit.neck === 'scarf'
        ? g({ a: [200, 342], p: [200, 342], r: tr.bowR }, [
          shape(poly([[168, 336], [232, 336], [200, 386]], true), { fill: hex(S.bow), stroke: ink(4) }),
          shape(ellipse(200, 342, 12, 9), { fill: hex(shade(S.bow, 0.25)), stroke: ink(4) }),
        ])
        : g({ a: [200, 350], p: [200, 350], r: tr.bowR }, [
          shape(poly([[200, 350], [170, 334], [170, 366]], true), { fill: hex(S.bow), stroke: ink(4) }),
          shape(poly([[200, 350], [230, 334], [230, 366]], true), { fill: hex(S.bow), stroke: ink(4) }),
          shape(rect(191, 341, 18, 18, 6), { fill: hex(shade(S.bow, 0.25)), stroke: ink(4) }),
        ]),
      ...(kit.neck === 'scarf'
        ? [shape(ellipse(258, 414, 18), { fill: hex(S.badge), stroke: ink(4) }), shape(sparkle(258, 414, 12, 0.3), { fill: hex(S.bow) })]
        : [shape(ellipse(200, 420, 5.5), { fill: hex(S.stripe), stroke: ink(3) }), shape(ellipse(200, 444, 5.5), { fill: hex(S.stripe), stroke: ink(3) })]),
      // head
      g({ id: X('head'), a: [200, 275], p: tr.headP, r: tr.headR }, [
        shape(ellipse(200, 282, 30, 9), { fill: hex(shade(SKIN, 0.18)) }),
        shape(ellipse(108, 190, 17, 25), { fill: skin, stroke: ink(5) }),
        shape(arc(111, 190, 8, 110, 250, 2), { stroke: { c: hex(shade(SKIN, 0.3)), w: 4 } }),
        shape(ellipse(292, 190, 17, 25), { fill: skin, stroke: ink(5) }),
        shape(arc(289, 190, 8, -70, 70, 2), { stroke: { c: hex(shade(SKIN, 0.3)), w: 4 } }),
        shape(ellipse(200, 180, 92, 100), { fill: skin, stroke: ink(5) }),
        g({ id: X('face'), a: [200, 180], p: tr.faceP }, [
          g({ o: tr.blushO }, [
            shape(ellipse(144, 216, 16, 8.5), { fill: hex('#FF7F7F', 0.55) }),
            shape(ellipse(256, 216, 16, 8.5), { fill: hex('#FF7F7F', 0.55) }),
          ]),
          ...(kit.freckles ? [[146, 199], [154, 206], [140, 207], [254, 199], [246, 206], [260, 207]] : []).map(([x, y]) =>
            shape(ellipse(x, y, 2.6), { fill: hex('#D98A5F') })),
          g({ p: tr.browsP, a: [0, 0] }, [
            g({ p: tr.browLP, a: [0, 0] }, [shape(smoothOpen([[146, 146], [164, 135], [186, 140]]), { stroke: ink(7) })]),
            shape(smoothOpen([[214, 140], [236, 135], [254, 146]]), { stroke: ink(7) }),
          ]),
          g({ a: [200, 172], p: [200, 172], s: tr.eyesS }, [
            g({ o: tr.eyeLO }, [shape(ellipse(170, 172, 9.5, 13.5), { fill: INK }), shape(ellipse(173, 166, 3, 4), { fill: hex('#FFFFFF') })]),
            g({ o: tr.eyeRO }, [shape(ellipse(230, 172, 9.5, 13.5), { fill: INK }), shape(ellipse(233, 166, 3, 4), { fill: hex('#FFFFFF') })]),
          ]),
          g({ o: tr.winkRO }, [shape(smoothOpen([[217, 176], [230, 166], [243, 176]]), { stroke: ink(6) })]),
          g({ o: tr.happyO }, [
            shape(smoothOpen([[157, 176], [170, 166], [183, 176]]), { stroke: ink(6) }),
            shape(smoothOpen([[217, 176], [230, 166], [243, 176]]), { stroke: ink(6) }),
          ]),
          kit.nose === 'button'
            ? g({}, [shape(ellipse(200, 199, 9, 7), { fill: hex(shade(SKIN, 0.16)), stroke: ink(3.5) }), shape(ellipse(197, 196, 3, 2), { fill: hex('#FFFFFF', 0.6) })])
            : shape(smoothOpen([[198, 186], [207, 196], [197, 203]]), { stroke: ink(4.5) }),
          kit.glasses ? g({}, [
            shape(ellipse(170, 172, 23, 21), { fill: hex('#FFFFFF', 0.22), stroke: ink(5) }),
            shape(ellipse(230, 172, 23, 21), { fill: hex('#FFFFFF', 0.22), stroke: ink(5) }),
            shape(smoothOpen([[193, 170], [200, 165], [207, 170]]), { stroke: ink(4.5) }),
            shape(poly([[147, 168], [112, 176]]), { stroke: ink(4.5) }),
            shape(poly([[253, 168], [288, 176]]), { stroke: ink(4.5) }),
            shape(smoothOpen([[158, 160], [166, 156]]), { stroke: { c: hex('#FFFFFF', 0.8), w: 3 } }),
            shape(smoothOpen([[218, 160], [226, 156]]), { stroke: { c: hex('#FFFFFF', 0.8), w: 3 } }),
          ]) : null,
          g({ o: tr.smirkO }, [shape(tr.smirk, { stroke: ink(6) })]),
          g({ a: [200, 226], p: [200, 226], s: tr.grinS, o: tr.grinO }, [
            shape({ ...arc(200, 224, 34, 0, 180, 3), c: true }, { fill: hex('#4A1717'), stroke: ink(5) }),
            shape(rect(177, 224, 46, 9, [0, 0, 4, 4]), { fill: hex('#FFFFFF') }),
            shape(ellipse(200, 248, 14, 6), { fill: hex('#FF7A86') }),
          ]),
        ]),
        // hair: outlines first, fills on top, so overlapping pieces read as one silhouette
        hairGroup ?? g({ a: [200, 130], p: [200, 130], s: tr.hairS }, [
          ...hairPieces.map((d, idx) => hairNode(d, idx, { stroke: ink(10) })),
          ...hairPieces.map((d, idx) => hairNode(d, idx, { fill: hair })),
          shape(smoothOpen([[150, 70], [182, 50], [226, 44]]), { stroke: { c: hex('#FFFFFF', 0.35), w: 6 } }),
          shape(smoothOpen([[236, 60], [262, 60], [280, 72]]), { stroke: { c: hex('#FFFFFF', 0.22), w: 4 } }),
        ]),
      ]),
    ]),
    ...(o.confetti ?? []).flatMap((t) => burst(200, 170, { t, dur: 34, count: 10, r0: 110, r1: 196, size: 7, colors: [S.primary, '#FFD23F', S.bow, '#2F6BFF', '#FF5FA2'] })),
    arm(ARM_R, tr.armR, true),
    arm(ARM_L, tr.armL, false),
    g({ p: [ARM_R.pivot[0] - 12, 150], a: [0, 0], s: tr.spark.s, r: tr.spark.r }, [
      shape(sparkle(0, 0, 22), { fill: hex('#FFD23F'), stroke: ink(3) }),
    ]),
  ]);

  return { node, look: [{ node: X('face'), x: 9, y: 5 }, { node: X('head'), x: 0, y: 0, r: 3 }] };
}

/** Standard single-character timeline used by the library versions. */
export const ACE_TIMELINE = {
  segments: [
    { kind: 'idle', from: 0, to: 240 },
    { kind: 'thumbs', from: 240, to: 360 },
    { kind: 'cheer', from: 360, to: 490 },
    { kind: 'nod', from: 490, to: 600 },
  ],
  states: {
    idle: { from: 0, to: 240, loop: true },
    thumbs: { from: 240, to: 360, next: 'idle' },
    cheer: { from: 360, to: 490, next: 'idle' },
    nod: { from: 490, to: 600, next: 'idle' },
  },
  confetti: [380],
  end: 600,
};
