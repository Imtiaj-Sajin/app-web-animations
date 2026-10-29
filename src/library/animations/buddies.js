import { defineAnimation } from '../../core/dsl.js';
import { buddy, PALETTE, BODIES } from '../buddy.js';

export const bloo = (() => {
  const end = 290;
  const b = buddy({
    id: 'bloo', name: 'Bloo', ...PALETTE.bloo, body: BODIES.bloo, end,
    timeline: [
      { kind: 'idle', from: 0, to: 180, blinks: [48, 132, 146], breath: 90 },
      { kind: 'hop', from: 180, to: end },
    ],
  });
  return defineAnimation({
    id: 'bloo', name: 'Bloo', category: 'Characters', bg: PALETTE.bloo.bg,
    description: 'An upbeat blue blob that follows your cursor and hops with joy when tapped.',
    tags: ['mascot', 'character', 'blob', 'happy'],
    w: 400, h: 400,
    states: { idle: { from: 0, to: 180, loop: true }, hop: { from: 180, to: end, next: 'idle' } },
    initial: 'idle',
    interact: { tap: 'hop', look: b.look },
    layers: [b.node],
  });
})();

export const peach = (() => {
  const end = 310;
  const b = buddy({
    id: 'peach', name: 'Peach', ...PALETTE.peach, body: BODIES.peach, end, blushRest: 0.55,
    timeline: [
      { kind: 'idle', from: 0, to: 180, blinks: [70, 158], breath: 60, amp: 0.018 },
      { kind: 'jelly', from: 180, to: end },
    ],
  });
  return defineAnimation({
    id: 'peach', name: 'Peach', category: 'Characters', bg: PALETTE.peach.bg,
    description: 'A shy, jelly-soft square blob. Poke it and it wobbles, gasps, then giggles.',
    tags: ['mascot', 'character', 'blob', 'cute'],
    w: 400, h: 400,
    states: { idle: { from: 0, to: 180, loop: true }, wiggle: { from: 180, to: end, next: 'idle' } },
    initial: 'idle',
    interact: { tap: 'wiggle', look: b.look },
    layers: [b.node],
  });
})();

export const sunny = (() => {
  const end = 360;
  const b = buddy({
    id: 'sunny', name: 'Sunny', ...PALETTE.sunny, body: BODIES.sunny, end, sleepy: true, blushRest: 0.45,
    timeline: [
      { kind: 'idle', from: 0, to: 240, breath: 120, amp: 0.03 },
      { kind: 'wake', from: 240, to: end },
    ],
  });
  return defineAnimation({
    id: 'sunny', name: 'Sunny', category: 'Characters', bg: PALETTE.sunny.bg,
    description: 'A sleepy yellow blob dreaming in z’s. Tap to startle it awake — it dozes right back off.',
    tags: ['mascot', 'character', 'blob', 'sleepy', 'empty-state'],
    w: 400, h: 400,
    states: { sleep: { from: 0, to: 240, loop: true }, wake: { from: 240, to: end, next: 'sleep' } },
    initial: 'sleep',
    interact: { tap: 'wake', look: b.look },
    layers: [b.node],
  });
})();

export const buddiesTrio = (() => {
  const end = 370;
  const peachB = buddy({
    id: 'trio-peach', ...PALETTE.peach, body: BODIES.peach, end, blushRest: 0.55, x: 190, y: 428, scale: 0.86,
    timeline: [
      { kind: 'idle', from: 0, to: 240, blinks: [40, 170], breath: 80, amp: 0.018 },
      { kind: 'jelly', from: 240, to: end },
    ],
  });
  const sunnyB = buddy({
    id: 'trio-sunny', ...PALETTE.sunny, body: BODIES.sunny, end, sleepy: true, blushRest: 0.45, x: 610, y: 428, scale: 0.86,
    timeline: [
      { kind: 'idle', from: 0, to: 240, breath: 120, amp: 0.03 },
      { kind: 'wake', from: 240, to: end },
    ],
  });
  const blooB = buddy({
    id: 'trio-bloo', ...PALETTE.bloo, body: BODIES.bloo, end, x: 400, y: 444, scale: 1,
    timeline: [
      { kind: 'idle', from: 0, to: 240, blinks: [96, 196, 210], breath: 120 },
      { kind: 'hop', from: 250, to: end },
    ],
  });
  return defineAnimation({
    id: 'buddies-trio', name: 'Buddies Trio', category: 'Scenes', bg: '#F1ECFF',
    description: 'All three buddies together — a ready-made hero illustration that watches your visitors and celebrates on tap.',
    tags: ['hero', 'scene', 'mascot', 'landing-page'],
    w: 800, h: 460,
    states: { idle: { from: 0, to: 240, loop: true }, cheer: { from: 240, to: end, next: 'idle' } },
    initial: 'idle',
    interact: { tap: 'cheer', look: [...peachB.look, ...sunnyB.look, ...blooB.look] },
    layers: [peachB.node, sunnyB.node, blooB.node],
  });
})();
