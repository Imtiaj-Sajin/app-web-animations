/* Lottie JSON → .lottie (dotLottie v1 container: a zip with manifest.json + animations/<id>.json). */
import { zip } from './zip.js';

export function toDotLottie(a, lottie) {
  const manifest = {
    version: '1',
    generator: 'Plush Motion',
    author: 'Plush Motion',
    activeAnimationId: a.id,
    animations: [{ id: a.id, speed: 1, loop: true, autoplay: true }],
  };
  return zip([
    { name: 'manifest.json', data: JSON.stringify(manifest) },
    { name: `animations/${a.id}.json`, data: JSON.stringify(lottie) },
  ]);
}
