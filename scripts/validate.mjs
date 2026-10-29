// Structural checks that every exporter relies on. Returns a list of human-readable problems.
const isAnim = (p) => p !== null && typeof p === 'object' && !Array.isArray(p) && Array.isArray(p.k);

export function validate(a) {
  const out = [];
  const where = (path) => `${a.id}: ${path}`;

  for (const [name, s] of Object.entries(a.states)) {
    if (!(s.to > s.from)) out.push(where(`state "${name}" has an empty range`));
    if (s.next && !a.states[s.next]) out.push(where(`state "${name}" → unknown next "${s.next}"`));
  }
  if (!a.states[a.initial]) out.push(where(`initial state "${a.initial}" does not exist`));
  const tap = a.interact?.tap;
  for (const target of typeof tap === 'string' ? [tap] : Object.values(tap ?? {})) {
    if (!a.states[target]) out.push(where(`tap → unknown state "${target}"`));
  }

  const checkProp = (p, path, isPath) => {
    if (!isAnim(p)) return;
    let prev = -Infinity;
    p.k.forEach(([f], idx) => {
      if (!(f > prev)) out.push(where(`${path} key ${idx} at frame ${f} is not after ${prev}`));
      prev = f;
    });
    if (prev > a.frames + 1e-6) out.push(where(`${path} has keys past the timeline end (${prev} > ${a.frames})`));
    if (isPath) {
      const n = p.k[0][1].v.length;
      if (p.k.some(([, v]) => v.v.length !== n || v.i.length !== n || v.o.length !== n)) {
        out.push(where(`${path} morphs between paths with different vertex counts`));
      }
    }
  };

  const walk = (n, path) => {
    for (const key of ['a', 'p', 's', 'r', 'o']) if (n.tr?.[key] !== undefined) checkProp(n.tr[key], `${path}.tr.${key}`);
    if (n.t === 'g') n.c.forEach((c, idx) => walk(c, `${path}/${c.id || c.nm || idx}`));
    else {
      checkProp(n.d, `${path}.d`, true);
      if (n.fill) checkProp(n.fill, `${path}.fill`);
      if (n.stroke) { checkProp(n.stroke.c, `${path}.stroke.c`); checkProp(n.stroke.w, `${path}.stroke.w`); }
      if (n.trim) { checkProp(n.trim.s, `${path}.trim.s`); checkProp(n.trim.e, `${path}.trim.e`); }
    }
  };
  a.layers.forEach((n, idx) => walk(n, `layer${idx}`));
  return out;
}
