/*
 * Scout · Hero Pose — three-quarter view, hands on hips; a press swings one arm out into a
 * thumbs-up with a head tilt and a wink. 400×460 design space, bust cut at y=460.
 *
 * Arms are two-bone rigs (shoulder → elbow → wrist). The hands carry a derived rotation that
 * cancels the arm's, so a fist stays upright through every swing.
 */
import { T, ease, hex, shade, ellipse, rect, poly, smoothOpen, smoothClosed, arc, sparkle, g, shape, choreograph } from '../../core/dsl.js';
import { valueAt } from '../../runtime/plush-player.js';
import { SCOUT_STYLES } from './ace.js';

const INK = hex('#1B1B22');
const SKIN = '#F6CBA5';

const SHOULDER_R = [126, 268];
const SHOULDER_L = [300, 262];
const UPPER = 80;
const FORE = 70;
const REST = { upR: 45, foR: -84, upL: -45, foL: 83 };
const THUMB = { upR: 121, foR: 54 };

const SMILE = smoothOpen([[156, 192], [174, 204], [198, 203], [214, 192]]);
const SMILE_WIDE = smoothOpen([[150, 189], [172, 211], [202, 210], [222, 187]]);

const SEGMENTS = {
  idle(tr, { from, to }) {
    tr.bodyS.oscillate([1, 1.012], 120, to);
    tr.headP.oscillate([210, 227], 120, to);
    tr.upR.oscillate(REST.upR + 1.5, 120, to);
    tr.upL.oscillate(REST.upL - 1.5, 120, to);
    for (const b of [64, 180, 192]) if (from + b + 11 <= to) tr.eyesS.hold(from + b).by(4, [1, 0.1], ease.in).by(7, [1, 1], ease.out);
    tr.stars.forEach((st, k) => {
      for (let c = from + k * 30; c + 40 <= to; c += 120) st.hold(c).to(c + 12, [1.25, 1.25], ease.out).to(c + 40, [0.55, 0.55], ease.inOut);
    });
  },

  thumbs(tr, { from: t }) {
    tr.upR.to(t + 14, THUMB.upR + 8, ease.out).spring(THUMB.upR, { stiffness: 260, damping: 13 }).hold(t + 96).to(t + 120, REST.upR, ease.inOut);
    tr.foR.to(t + 12, THUMB.foR + 12, ease.out).spring(THUMB.foR, { stiffness: 280, damping: 12 }).hold(t + 98).to(t + 120, REST.foR, ease.inOut);
    tr.thumbO.hold(t + 6).to(t + 8, 1, null).hold(t + 110).to(t + 112, 0, null);
    tr.handS.hold(t + 22).to(t + 26, [1.14, 1.14], ease.out).spring([1, 1], { stiffness: 320, damping: 14 });
    tr.bodyR.to(t + 14, -2, ease.out).hold(t + 96).to(t + 118, 0, ease.inOut);
    tr.headR.to(t + 16, -9, ease.out).hold(t + 92).to(t + 112, 0, ease.inOut);
    tr.eyeRO.hold(t + 12).to(t + 14, 0, null).hold(t + 84).to(t + 86, 1, null);
    tr.winkO.hold(t + 12).to(t + 14, 1, null).hold(t + 84).to(t + 86, 0, null);
    tr.smile.to(t + 16, SMILE_WIDE, ease.out).hold(t + 86).to(t + 98, SMILE, ease.inOut);
    tr.blushO.to(t + 20, 0.75, ease.out).hold(t + 86).to(t + 102, 0.35, ease.inOut);
    tr.spark.hold(t + 20).to(t + 21, [0.2, 0.2], null).to(t + 28, [1.2, 1.2], ease.out).to(t + 35, [1, 1], ease.inOut).hold(t + 52).to(t + 62, [0, 0], ease.in);
    tr.sparkR.hold(t + 20).to(t + 62, 90, ease.out);
    tr.ringS.hold(t + 18).to(t + 24, [1.05, 1.05], ease.out).spring([1, 1], { stiffness: 260, damping: 12 });
    tr.scarfR.hold(t + 14).oscillate(-8, 12, t + 50);
  },

  laugh(tr, { from: t }) {
    tr.headR.to(t + 10, 7, ease.out).hold(t + 80).to(t + 96, 0, ease.inOut);
    tr.headP.hold(t + 12).oscillate([210, 219], 8, t + 76);
    tr.bodyS.hold(t + 12).oscillate([1, 1.022], 8, t + 76);
    for (const k of ['eyeLO', 'eyeRO']) tr[k].hold(t + 6).to(t + 8, 0, null).hold(t + 88).to(t + 90, 1, null);
    tr.happyO.hold(t + 6).to(t + 8, 1, null).hold(t + 88).to(t + 90, 0, null);
    tr.smileO.hold(t + 6).to(t + 8, 0, null).hold(t + 88).to(t + 90, 1, null);
    tr.grinO.hold(t + 6).to(t + 8, 1, null).hold(t + 88).to(t + 90, 0, null);
    tr.grinS.hold(t + 6).to(t + 7, [0.4, 0.4], null).spring([1, 1], { stiffness: 320, damping: 13 });
    tr.blushO.to(t + 16, 0.85, ease.out).hold(t + 88).to(t + 104, 0.35, ease.inOut);
    tr.upR.hold(t + 12).oscillate(REST.upR + 4, 8, t + 76);
    tr.upL.hold(t + 12).oscillate(REST.upL - 4, 8, t + 76);
  },
};

/** World-upright hand: sample the arm's two rotations each frame and cancel them. */
function uprightHand(up, fo, end) {
  const k = (tr) => ({ k: tr.k });
  const track = T(-(valueAt(k(up), 0) + valueAt(k(fo), 0)));
  for (let f = 1; f <= end; f++) track.to(f, -(valueAt(k(up), f) + valueAt(k(fo), f)), null);
  return track;
}

export function scoutPose(o) {
  const S = SCOUT_STYLES[o.style];
  const X = (s) => `${o.id}-${s}`;
  const tr = choreograph(o.id, {
    bodyS: T([1, 1]), bodyR: T(0), headR: T(0), headP: T([210, 225]),
    eyesS: T([1, 1]), eyeLO: T(1), eyeRO: T(1), winkO: T(0), happyO: T(0),
    smile: T(SMILE), smileO: T(1), grinO: T(0), grinS: T([0.4, 0.4]), blushO: T(0.35),
    upR: T(REST.upR), foR: T(REST.foR), upL: T(REST.upL), foL: T(REST.foL),
    thumbO: T(0), handS: T([1, 1]), spark: T([0, 0]), sparkR: T(0), scarfR: T(0),
    raysR: T(0), ringS: T([1, 1]), stars: [0, 1, 2, 3].map(() => T([0.55, 0.55])),
  }, o.segments.map((seg) => ({
    ...seg,
    run: (t, sg) => { SEGMENTS[sg.kind](t, sg); t.raysR.to(sg.to, t.raysR.value + 30, null); },
  })), o.end);
  const handR = uprightHand(tr.upR, tr.foR, o.end);
  const handL = uprightHand(tr.upL, tr.foL, o.end);

  const ink = (w) => ({ c: INK, w });
  const skin = hex(SKIN);
  const primary = hex(S.primary);
  const sleeve = { fill: primary, stroke: ink(5) };
  const crease = { stroke: { c: hex(shade(SKIN, 0.35)), w: 4 } };

  const arm = (S0, up, fo, hand, withThumb) => {
    const [x, y] = S0;
    const E = [x, y + UPPER];
    const W = [x, y + UPPER + FORE];
    return g({ a: S0, p: S0, r: up }, [
      shape(rect(x - 21, y - 12, 42, UPPER + 24, 21), sleeve),
      g({ a: E, p: E, r: fo }, [
        shape(rect(x - 19, E[1] - 10, 38, FORE + 14, 19), sleeve),
        shape(rect(x - 17.5, W[1] - 22, 35, 8), { fill: hex(S.stripe) }),
        g({ a: W, p: W, r: hand, s: withThumb ? tr.handS : undefined }, [
          withThumb ? g({ o: tr.thumbO }, [shape(rect(W[0] - 23, W[1] - 62, 24, 48, 12), { fill: skin, stroke: ink(5) })]) : null,
          shape(rect(W[0] - 27, W[1] - 22, 54, 48, 18), { fill: skin, stroke: ink(5) }),
          ...[W[1] - 7, W[1] + 6].map((yy) => shape(smoothOpen([[W[0] + 2, yy], [W[0] + 21, yy + 1]]), crease)),
        ]),
      ]),
    ]);
  };

  // sunburst badge
  const CX = 205, CY = 236, R = 178;
  const rays = Array.from({ length: 12 }, (_, k) => {
    const a = (k * 30 * Math.PI) / 180, w = (7.5 * Math.PI) / 180;
    return poly([[CX, CY], [CX + Math.cos(a - w) * R, CY + Math.sin(a - w) * R], [CX + Math.cos(a + w) * R, CY + Math.sin(a + w) * R]], true);
  });

  const cap = hex(S.cap);
  const capDark = hex(shade(S.cap, 0.25));
  const seam = { stroke: { c: hex(shade(S.cap, 0.3)), w: 3 } };

  const node = g({ name: S.name, a: [200, 460], p: [o.x ?? 200, o.y ?? 460], s: [o.scale ?? 1, o.scale ?? 1] }, [
    g({ a: [CX, CY], p: [CX, CY], s: tr.ringS }, [
      shape(ellipse(CX, CY, R), { fill: hex(S.badge) }),
      g({ a: [CX, CY], p: [CX, CY], r: tr.raysR }, rays.map((d) => shape(d, { fill: hex(S.rays, 0.55) }))),
      shape(ellipse(CX, CY, R - 14), { stroke: { c: hex(S.rays), w: 3 } }),
      shape(ellipse(CX, CY, R), { stroke: ink(5) }),
    ]),
    ...[[40, 74], [364, 92], [30, 330], [372, 318]].map(([x, y], k) =>
      g({ p: [x, y], a: [0, 0], s: tr.stars[k] }, [shape(sparkle(0, 0, 16), { fill: hex(S.rays), stroke: ink(3) })])),

    g({ id: X('body'), a: [205, 460], p: [205, 460], s: tr.bodyS, r: tr.bodyR }, [
      // torso: shade body, then the lit side, then one outline over both
      shape(rect(108, 248, 206, 240, [72, 60, 0, 0]), { fill: hex(shade(S.primary, 0.22)) }),
      shape(rect(108, 248, 172, 240, [72, 40, 0, 0]), { fill: primary }),
      shape(rect(108, 248, 206, 240, [72, 60, 0, 0]), { stroke: ink(5) }),
      shape(smoothOpen([[208, 292], [203, 370], [206, 488]]), { stroke: { c: hex(shade(S.primary, 0.35)), w: 4 } }),
      shape(ellipse(258, 330, 18), { fill: hex(S.badge), stroke: ink(4) }),
      shape(sparkle(258, 330, 12, 0.3), { fill: hex(S.bow) }),
      shape(rect(186, 200, 46, 60, 14), { fill: skin, stroke: ink(5) }),
      shape(poly([[168, 246], [204, 262], [186, 280]], true), { fill: hex('#FFFFFF'), stroke: ink(4) }),
      shape(poly([[246, 244], [214, 262], [234, 278]], true), { fill: hex('#FFFFFF'), stroke: ink(4) }),
      g({ a: [206, 252], p: [206, 252], r: tr.scarfR }, [
        shape(poly([[176, 246], [236, 246], [208, 298]], true), { fill: hex(S.bow), stroke: ink(4) }),
        shape(ellipse(206, 252, 12, 9), { fill: hex(shade(S.bow, 0.25)), stroke: ink(4) }),
      ]),

      // head (three-quarter, turned toward the viewer's left)
      g({ id: X('head'), a: [210, 225], p: tr.headP, r: tr.headR }, [
        shape(ellipse(212, 214, 30, 8), { fill: hex(shade(SKIN, 0.18)) }),
        shape(ellipse(294, 152, 15, 22), { fill: skin, stroke: ink(5) }),
        shape(arc(291, 152, 7, -70, 70, 2), { stroke: { c: hex(shade(SKIN, 0.3)), w: 4 } }),
        shape(smoothClosed([[268, 104], [302, 112], [306, 146], [286, 132]]), { fill: hex(S.hair), stroke: ink(4) }),
        shape(ellipse(212, 140, 84, 92), { fill: skin, stroke: ink(5) }),
        shape(smoothClosed([[276, 112], [298, 118], [296, 148], [282, 136]]), { fill: hex(S.hair) }),
        g({ id: X('face'), a: [200, 150], p: [200, 150] }, [
          g({ o: tr.blushO }, [
            shape(ellipse(150, 182, 11, 7), { fill: hex('#FF7F7F', 0.55) }),
            shape(ellipse(248, 184, 16, 8.5), { fill: hex('#FF7F7F', 0.55) }),
          ]),
          g({ a: [202, 142], p: [202, 142], s: tr.eyesS }, [
            g({ o: tr.eyeLO }, [shape(ellipse(174, 142, 7, 10.5), { fill: INK }), shape(ellipse(176, 137, 2.4, 3.2), { fill: hex('#FFFFFF') })]),
            g({ o: tr.eyeRO }, [shape(ellipse(229, 142, 8, 11.5), { fill: INK }), shape(ellipse(232, 137, 2.6, 3.4), { fill: hex('#FFFFFF') })]),
          ]),
          g({ o: tr.winkO }, [shape(smoothOpen([[218, 146], [229, 136], [240, 146]]), { stroke: ink(5.5) })]),
          g({ o: tr.happyO }, [
            shape(smoothOpen([[164, 146], [174, 137], [184, 146]]), { stroke: ink(5.5) }),
            shape(smoothOpen([[218, 146], [229, 136], [240, 146]]), { stroke: ink(5.5) }),
          ]),
          shape(ellipse(174, 142, 19, 19), { fill: hex('#FFFFFF', 0.22), stroke: ink(4.5) }),
          shape(ellipse(229, 142, 22, 20), { fill: hex('#FFFFFF', 0.22), stroke: ink(4.5) }),
          shape(smoothOpen([[193, 140], [199, 135], [207, 140]]), { stroke: ink(4) }),
          shape(poly([[251, 140], [290, 147]]), { stroke: ink(4) }),
          shape(smoothOpen([[164, 131], [171, 127]]), { stroke: { c: hex('#FFFFFF', 0.8), w: 3 } }),
          shape(smoothOpen([[218, 131], [226, 127]]), { stroke: { c: hex('#FFFFFF', 0.8), w: 3 } }),
          shape(ellipse(160, 168, 10, 8), { fill: hex(shade(SKIN, 0.16)), stroke: ink(3.5) }),
          shape(ellipse(157, 165, 3, 2), { fill: hex('#FFFFFF', 0.6) }),
          g({ o: tr.smileO }, [shape(tr.smile, { stroke: ink(5.5) })]),
          g({ a: [186, 194], p: [186, 194], s: tr.grinS, o: tr.grinO }, [
            shape({ ...arc(186, 192, 30, 0, 180, 3), c: true }, { fill: hex('#4A1717'), stroke: ink(5) }),
            shape(rect(166, 192, 40, 8, [0, 0, 4, 4]), { fill: hex('#FFFFFF') }),
            shape(ellipse(186, 213, 12, 5), { fill: hex('#FF7A86') }),
          ]),
        ]),
        // cap, brim pointing where he looks
        shape(smoothClosed([[124, 104], [134, 70], [170, 46], [214, 40], [256, 50], [290, 80], [300, 116], [262, 106], [214, 100], [166, 104]]), { fill: cap, stroke: ink(5) }),
        shape(smoothOpen([[214, 42], [208, 100]]), seam),
        shape(smoothOpen([[258, 54], [262, 104]]), seam),
        shape(ellipse(214, 41, 7), { fill: capDark, stroke: ink(3) }),
        shape(ellipse(196, 72, 15), { fill: hex(S.badge), stroke: ink(3.5) }),
        shape(sparkle(196, 72, 10, 0.3), { fill: cap }),
        shape(smoothOpen([[150, 70], [172, 54], [200, 48]]), { stroke: { c: hex('#FFFFFF', 0.3), w: 5 } }),
        shape(smoothClosed([[94, 114], [130, 98], [188, 92], [236, 98], [228, 114], [176, 120], [124, 124]]), { fill: capDark, stroke: ink(5) }),
      ]),

      arm(SHOULDER_L, tr.upL, tr.foL, handL, false),
      arm(SHOULDER_R, tr.upR, tr.foR, handR, true),
    ]),
    g({ p: [38, 82], a: [0, 0], s: tr.spark, r: tr.sparkR }, [shape(sparkle(0, 0, 22), { fill: hex('#FFD23F'), stroke: ink(3) })]),
  ]);

  return { node, look: [{ node: X('face'), x: 7, y: 4 }, { node: X('head'), x: 0, y: 0, r: 3 }] };
}

export const SCOUT_POSE_TIMELINE = {
  segments: [
    { kind: 'idle', from: 0, to: 240 },
    { kind: 'thumbs', from: 240, to: 370 },
    { kind: 'laugh', from: 370, to: 480 },
  ],
  states: {
    idle: { from: 0, to: 240, loop: true },
    thumbs: { from: 240, to: 370, next: 'idle' },
    laugh: { from: 370, to: 480, next: 'idle' },
  },
  end: 480,
};
