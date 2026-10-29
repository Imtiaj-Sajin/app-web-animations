/*
 * The catalogue. Packs group related animations; singles are standalone pieces.
 * Animations that share a `family` are colourways of one character and show up as one card with swatches.
 */
import { bloo, peach, sunny, minty, lulu, buddiesTrio } from './animations/buddies.js';
import { heartLike, successCheck, blobLoader, bellRing, squishToggle } from './animations/micro.js';
import { aceVariants, scoutVariants, scoutHeroVariants, boltVariants, tellyVariants, retroClub } from './animations/retro.js';

export const animations = [
  retroClub, ...scoutHeroVariants, ...scoutVariants, ...aceVariants, ...boltVariants, ...tellyVariants,
  buddiesTrio, bloo, peach, sunny, minty, lulu,
  heartLike, successCheck, bellRing, squishToggle, blobLoader,
].map((a) => ({ family: a.id, ...a }));

const ids = (list) => list.map((a) => a.id);

export const packs = [
  {
    id: 'retro-club',
    name: 'Retro Club',
    tagline: 'Atomic-age mascots with 1950s swagger.',
    description: 'Scout in his sunburst badge, Ace the varsity mascot, Bolt the tin robot and Telly the TV — four colourways each, every one with a stack of tap reactions.',
    color: '#E2483D',
    items: ids([...scoutHeroVariants, ...scoutVariants, ...aceVariants, ...boltVariants, ...tellyVariants]),
  },
  {
    id: 'blob-buddies',
    name: 'Blob Buddies',
    tagline: 'Five squishy mascots with real personalities.',
    description: 'Cursor-following eyes, breathing idles, and a signature reaction plus love, grumpy and party moods. Perfect for empty states and onboarding.',
    color: '#2F6BFF',
    items: ['bloo', 'peach', 'sunny', 'minty', 'lulu'],
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

export const singles = ['retro-club', 'buddies-trio'];
