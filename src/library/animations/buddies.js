import { defineAnimation } from '../../core/dsl.js';
import { buddy, PALETTE, BODIES } from '../buddy.js';

/**
 * A buddy with its signature reaction plus three moods. Each tap plays the next one.
 * main: { kind: 'hop' | 'jelly' | 'wake', state, len }
 */
function moodyBuddy({ id, name, description, tags, sleepy, blushRest, idle, main }) {
  const P = PALETTE[id];
  const idleState = sleepy ? 'sleep' : 'idle';
  const segs = [{ kind: 'idle', state: idleState, len: idle.len, ...idle }, { ...main }, { kind: 'love', state: 'love', len: 120 }, { kind: 'grumpy', state: 'grumpy', len: 110 }, { kind: 'party', state: 'party', len: 130 }];
  let f = 0;
  const timeline = segs.map(({ len, state, ...ev }) => {
    const seg = { ...ev, state, from: f, to: f + len };
    f += len;
    return seg;
  });
  const end = f;
  const b = buddy({ id, name, ...P, body: BODIES[id], end, sleepy, blushRest, timeline });
  const states = Object.fromEntries(timeline.map((seg) => [seg.state,
    seg.kind === 'idle' ? { from: seg.from, to: seg.to, loop: true } : { from: seg.from, to: seg.to, next: idleState }]));
  return defineAnimation({
    id, name, family: id, category: 'Characters', bg: P.bg, description, tags,
    w: 400, h: 400, states, initial: idleState,
    interact: { tap: timeline.slice(1).map((seg) => seg.state), look: b.look },
    layers: [b.node],
  });
}

export const bloo = moodyBuddy({
  id: 'bloo', name: 'Bloo', blushRest: 0,
  description: 'An upbeat blue blob that follows your cursor. Tap for a happy hop, heart eyes, a grumpy huff, then a party.',
  tags: ['mascot', 'character', 'blob', 'happy', 'moods'],
  idle: { len: 180, blinks: [48, 132, 146], breath: 90 },
  main: { kind: 'hop', state: 'hop', len: 110 },
});

export const peach = moodyBuddy({
  id: 'peach', name: 'Peach', blushRest: 0.55,
  description: 'A shy, jelly-soft square blob. Poke it to wobble and giggle, fall in love, sulk, or party.',
  tags: ['mascot', 'character', 'blob', 'cute', 'moods'],
  idle: { len: 180, blinks: [70, 158], breath: 60, amp: 0.018 },
  main: { kind: 'jelly', state: 'wiggle', len: 130 },
});

export const sunny = moodyBuddy({
  id: 'sunny', name: 'Sunny', sleepy: true, blushRest: 0.45,
  description: 'A sleepy yellow blob dreaming in z’s. Tap to startle it awake, swoon it, annoy it, or throw it a party.',
  tags: ['mascot', 'character', 'blob', 'sleepy', 'empty-state', 'moods'],
  idle: { len: 240, breath: 120, amp: 0.03 },
  main: { kind: 'wake', state: 'wake', len: 120 },
});

export const minty = moodyBuddy({
  id: 'minty', name: 'Minty', blushRest: 0.4,
  description: 'A tall, bean-shaped green buddy full of bounce — hops, swoons, huffs and parties on tap.',
  tags: ['mascot', 'character', 'blob', 'fresh', 'moods'],
  idle: { len: 180, blinks: [36, 120], breath: 90, amp: 0.026 },
  main: { kind: 'hop', state: 'hop', len: 110 },
});

export const lulu = moodyBuddy({
  id: 'lulu', name: 'Lulu', blushRest: 0.5,
  description: 'A cloud-soft lilac buddy with a scalloped silhouette. Jiggles, swoons, sulks and parties on tap.',
  tags: ['mascot', 'character', 'blob', 'dreamy', 'moods'],
  idle: { len: 180, blinks: [90, 168], breath: 60, amp: 0.02 },
  main: { kind: 'jelly', state: 'wiggle', len: 130 },
});

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
    id: 'buddies-trio', name: 'Buddies Trio', family: 'buddies-trio', category: 'Scenes', bg: '#F1ECFF',
    description: 'All three buddies together — a ready-made hero illustration that watches your visitors and celebrates on tap.',
    tags: ['hero', 'scene', 'mascot', 'landing-page'],
    w: 800, h: 460,
    states: { idle: { from: 0, to: 240, loop: true }, cheer: { from: 240, to: end, next: 'idle' } },
    initial: 'idle',
    interact: { tap: 'cheer', look: [...peachB.look, ...sunnyB.look, ...blooB.look] },
    layers: [peachB.node, sunnyB.node, blooB.node],
  });
})();
