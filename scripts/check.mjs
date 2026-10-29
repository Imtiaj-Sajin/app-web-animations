// Fast smoke test: validate every animation and run every exporter (no browser needed).
import { animations } from '../src/library/index.js';
import { validate } from './validate.mjs';
import { toLottie } from '../src/exporters/lottie.js';
import { toDotLottie } from '../src/exporters/dotlottie.js';
import { toSvg } from '../src/exporters/svg.js';
import { toVanilla, toWebComponent, toReact } from '../src/exporters/web.js';
import { toSwift, toKotlin } from '../src/exporters/native.js';

let failed = 0;
for (const a of animations) {
  const problems = validate(a);
  try {
    const lottie = toLottie(a);
    [toDotLottie(a, lottie), toSvg(a), toVanilla(a), toWebComponent(a), toReact(a), toSwift(a), toKotlin(a)];
  } catch (err) {
    problems.push(`${a.id}: exporter failed — ${err.message}`);
  }
  if (problems.length) {
    failed++;
    console.error(problems.join('\n'));
  } else console.log(`ok  ${a.id}`);
}
if (failed) process.exit(1);
