import { defineAnimation } from '../../core/dsl.js';
import { ace, ACE_STYLES, ACE_TIMELINE, SCOUT_STYLES } from '../retro/ace.js';
import { bolt, BOLT_STYLES, BOLT_TIMELINE } from '../retro/bolt.js';
import { scoutPose, SCOUT_POSE_TIMELINE } from '../retro/scout-pose.js';
import { telly, TELLY_STYLES, TELLY_TIMELINE } from '../retro/telly.js';
export const aceVariants = Object.entries(ACE_STYLES).map(([style, S]) => {
  const id = `ace-${style}`;
  const c = ace({ id, style, ...ACE_TIMELINE });
  return defineAnimation({
    id, name: `Ace · ${S.name}`, family: 'ace', familyName: 'Ace', variant: S.name, swatch: S.primary,
    category: 'Characters', bg: S.bg,
    description: 'A 1950s varsity mascot with a pompadour and a bowtie. Tap for a thumbs-up and a wink, a cheer, then a cool nod.',
    tags: ['mascot', 'retro', '1950s', 'character', 'thumbs-up'],
    w: 400, h: 460,
    states: ACE_TIMELINE.states,
    initial: 'idle',
    interact: { tap: ['thumbs', 'cheer', 'nod'], look: c.look },
    layers: [c.node],
  });
});


export const boltVariants = Object.entries(BOLT_STYLES).map(([style, S]) => {
  const id = `bolt-${style}`;
  const c = bolt({ id, style, ...BOLT_TIMELINE });
  return defineAnimation({
    id, name: `Bolt · ${S.name}`, family: 'bolt', familyName: 'Bolt', variant: S.name, swatch: S.metal,
    category: 'Characters', bg: S.bg,
    description: 'An atomic-age tin robot with a glowing antenna. Tap to make it wave, then watch it crunch numbers until something clicks.',
    tags: ['robot', 'retro', 'mascot', 'ai', 'assistant'],
    w: 400, h: 460,
    states: BOLT_TIMELINE.states,
    initial: 'idle',
    interact: { tap: ['wave', 'compute'], look: c.look },
    layers: [c.node],
  });
});

export const tellyVariants = Object.entries(TELLY_STYLES).map(([style, S]) => {
  const id = `telly-${style}`;
  const c = telly({ id, style, ...TELLY_TIMELINE });
  return defineAnimation({
    id, name: `Telly · ${S.name}`, family: 'telly', familyName: 'Telly', variant: S.name, swatch: S.cabinet,
    category: 'Characters', bg: S.bg,
    description: 'A mid-century TV with a face on its screen. Every tap tunes a new channel: wink, heart eyes, a glitch, then loading.',
    tags: ['tv', 'retro', 'mascot', 'glitch', 'loading'],
    w: 400, h: 400,
    states: TELLY_TIMELINE.states,
    initial: 'idle',
    interact: { tap: ['wink', 'love', 'glitch', 'loading'], look: c.look },
    layers: [c.node],
  });
});

export const retroClub = (() => {
  const end = 400;
  const b = bolt({
    id: 'club-bolt', style: 'chrome', x: 190, y: 498, scale: 0.94, end, sparks: [],
    segments: [{ kind: 'idle', from: 0, to: 240 }, { kind: 'wave', from: 252, to: end }],
  });
  const t = telly({
    id: 'club-telly', style: 'cream', x: 812, y: 500, scale: 1.04, end,
    segments: [{ kind: 'idle', from: 0, to: 240 }, { kind: 'love', from: 246, to: end }],
  });
  const a = ace({
    id: 'club-ace', style: 'cherry', x: 500, y: 520, scale: 1, end, confetti: [262],
    segments: [{ kind: 'idle', from: 0, to: 240 }, { kind: 'cheer', from: 240, to: end }],
  });
  return defineAnimation({
    id: 'retro-club', name: 'Retro Club', family: 'retro-club', category: 'Scenes', bg: '#FFF1E2',
    description: 'Ace, Bolt and Telly together — a 1950s hero illustration that watches your visitors and throws a party on tap.',
    tags: ['hero', 'scene', 'retro', '1950s', 'landing-page'],
    w: 1000, h: 520,
    states: { idle: { from: 0, to: 240, loop: true }, party: { from: 240, to: end, next: 'idle' } },
    initial: 'idle',
    interact: { tap: 'party', look: [...b.look, ...t.look, ...a.look] },
    layers: [b.node, t.node, a.node],
  });
})();

export const scoutVariants = Object.entries(SCOUT_STYLES).map(([style, S]) => {
  const id = `scout-${style}`;
  const c = ace({ id, kit: 'scout', style, ...ACE_TIMELINE });
  return defineAnimation({
    id, name: `Scout · ${S.name}`, family: 'scout', familyName: 'Scout', variant: S.name, swatch: S.primary,
    category: 'Characters', bg: S.bg,
    description: 'An atomic-age scout in a spinning sunburst badge — cap, round specs and the classic thumbs-up with a wink. Tap again to cheer, then nod.',
    tags: ['mascot', 'retro', '1950s', 'badge', 'thumbs-up'],
    w: 400, h: 460,
    states: ACE_TIMELINE.states,
    initial: 'idle',
    interact: { tap: ['thumbs', 'cheer', 'nod'], look: c.look },
    layers: [c.node],
  });
});

export const scoutHeroVariants = Object.entries(SCOUT_STYLES).map(([style, S]) => {
  const id = `scout-hero-${style}`;
  const c = scoutPose({ id, style, ...SCOUT_POSE_TIMELINE });
  return defineAnimation({
    id, name: `Scout Hero · ${S.name}`, family: 'scout-hero', familyName: 'Scout · Hero Pose', variant: S.name, swatch: S.primary,
    category: 'Characters', bg: S.bg,
    description: 'Scout striking the classic poster pose — three-quarter view, hands on hips. Tap and he swings into a thumbs-up with a wink; tap again and he cracks up laughing.',
    tags: ['mascot', 'retro', '1950s', 'thumbs-up', 'hero-pose'],
    w: 400, h: 460,
    states: SCOUT_POSE_TIMELINE.states,
    initial: 'idle',
    interact: { tap: ['thumbs', 'laugh'], look: c.look },
    layers: [c.node],
  });
});
