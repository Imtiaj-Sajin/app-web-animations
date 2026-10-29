/*
 * The catalogue. Packs group related animations; singles are standalone pieces.
 * Every animation is also listed individually so it can be downloaded on its own.
 */
import { bloo, peach, sunny, buddiesTrio } from './animations/buddies.js';
import { heartLike, successCheck, blobLoader, bellRing, squishToggle } from './animations/micro.js';

export const animations = [buddiesTrio, bloo, peach, sunny, heartLike, successCheck, bellRing, squishToggle, blobLoader];

export const packs = [
  {
    id: 'blob-buddies',
    name: 'Blob Buddies',
    tagline: 'Three squishy mascots with real personalities.',
    description: 'Cursor-following eyes, breathing idles, and a signature reaction each. Drop one into an empty state, onboarding screen or 404 page.',
    color: '#2F6BFF',
    items: ['bloo', 'peach', 'sunny'],
  },
  {
    id: 'micro-moments',
    name: 'Micro Moments',
    tagline: 'Tiny interactions that make an app feel expensive.',
    description: 'A like button, a success check, a notification bell, a toggle and a loader — every one tuned with spring physics.',
    color: '#FF3B5C',
    items: ['heart-like', 'success-check', 'bell-ring', 'squish-toggle', 'blob-loader'],
  },
];

export const singles = ['buddies-trio'];
