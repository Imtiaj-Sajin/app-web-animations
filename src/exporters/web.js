/*
 * Plush data → drop-in web files. Each output is one self-contained file: the animation data
 * plus the ~10 KB Plush runtime, so there is nothing else to install.
 */
import { readFileSync } from 'node:fs';

const RUNTIME = readFileSync(new URL('../runtime/plush-player.js', import.meta.url), 'utf8')
  .replace(/^\/\*[\s\S]*?\*\/\s*/, '')
  .replace(/^export \{[^}]*\};?\s*$/m, '')
  .trim();

export const pascal = (id) => id.replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase());
export const tagName = (id) => `plush-${id}`;

function header(a, usage) {
  return `/*!
 * ${a.name} — Plush Motion (free, MIT licence)
 * ${a.description}
 * States: ${Object.keys(a.states).join(', ')}
 *
${usage.split('\n').map((l) => ` * ${l}`.trimEnd()).join('\n')}
 */
`;
}

export function toVanilla(a) {
  const usage = `Usage:
  import { mount } from './${a.id}.js';
  const player = mount(document.querySelector('#hero'));   // fills the element
  player.play('${Object.keys(a.states).find((s) => s !== a.initial) ?? a.initial}');   // jump to a state
  player.pause(); player.resume(); player.destroy();`;
  return `${header(a, usage)}
const DATA = ${JSON.stringify(a)};

${RUNTIME}

/** Mount the animation into \`target\` (it fills the element; give it a size). Returns the player API. */
export function mount(target, options = {}) {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'display:block;width:100%;height:100%;outline-offset:4px';
  target.appendChild(canvas);
  const player = createPlayer(canvas, DATA, options);
  const destroy = player.destroy;
  player.destroy = () => { destroy(); canvas.remove(); };
  return player;
}

export { DATA as data, createPlayer, renderFrame };
`;
}

export function toWebComponent(a) {
  const tag = tagName(a.id);
  const cls = `Plush${pascal(a.id)}Element`;
  const usage = `Usage:
  <script type="module" src="./${a.id}.wc.js"></script>
  <${tag}></${tag}>
  <${tag} state="${Object.keys(a.states).find((s) => s !== a.initial) ?? a.initial}" static style="width:200px"></${tag}>

Attributes: state="…" (play a state), static (no pointer/tap interaction), paused, motion="full|reduced|auto".
Events: "statechange" → event.detail.state`;
  return `${header(a, usage)}
const DATA = ${JSON.stringify(a)};

${RUNTIME}

class ${cls} extends HTMLElement {
  static observedAttributes = ['state', 'paused'];
  #player = null;
  #canvas;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = '<style>:host{display:inline-block;width:${Math.min(a.w, 320)}px;aspect-ratio:${a.w}/${a.h};contain:content}' +
      ':host([hidden]){display:none}canvas{display:block;width:100%;height:100%;border-radius:inherit;outline-offset:4px}</style>';
    this.#canvas = document.createElement('canvas');
    root.append(this.#canvas);
  }

  connectedCallback() {
    if (this.#player) return;
    this.#player = createPlayer(this.#canvas, DATA, {
      state: this.getAttribute('state') || undefined,
      interactive: !this.hasAttribute('static'),
      autoplay: !this.hasAttribute('paused'),
      motion: this.getAttribute('motion') || 'auto',
      onStateChange: (state) => this.dispatchEvent(new CustomEvent('statechange', { detail: { state } })),
    });
  }

  disconnectedCallback() {
    this.#player?.destroy();
    this.#player = null;
  }

  attributeChangedCallback(name, oldValue, value) {
    if (oldValue === value || !this.#player) return;
    if (name === 'state' && value) this.#player.play(value);
    if (name === 'paused') value === null ? this.#player.resume() : this.#player.pause();
  }

  get state() { return this.#player?.state ?? null; }
  play(state) { this.#player?.play(state); }
  pause() { this.#player?.pause(); }
  resume() { this.#player?.resume(); }
}

if (!customElements.get('${tag}')) customElements.define('${tag}', ${cls});
export { ${cls} };
`;
}

export function toReact(a) {
  const name = pascal(a.id);
  const other = Object.keys(a.states).find((s) => s !== a.initial) ?? a.initial;
  const usage = `Usage (React 17+, works with Next.js — renders on the client only):
  import ${name} from './${name}';
  <${name} style={{ width: 240 }} />
  <${name} state="${other}" onStateChange={(s) => console.log(s)} />

Props: state, interactive (true), autoplay (true), motion ('auto'|'full'|'reduced'), onStateChange, className, style.
Pass a ref to get the player API: ref.current.play('${other}').`;
  return `'use client';
${header(a, usage)}
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

const DATA = ${JSON.stringify(a)};

${RUNTIME}

const ${name} = forwardRef(function ${name}(
  { state, interactive = true, autoplay = true, motion = 'auto', onStateChange, style, ...rest },
  ref,
) {
  const canvasRef = useRef(null);
  const playerRef = useRef(null);
  const onChange = useRef(onStateChange);
  onChange.current = onStateChange;

  useEffect(() => {
    const player = createPlayer(canvasRef.current, DATA, {
      state, interactive, autoplay, motion,
      onStateChange: (s) => onChange.current?.(s),
    });
    playerRef.current = player;
    return () => player.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive, autoplay, motion]);

  useEffect(() => {
    if (state && playerRef.current && playerRef.current.state !== state) playerRef.current.play(state);
  }, [state]);

  useImperativeHandle(ref, () => ({
    play: (s) => playerRef.current?.play(s),
    pause: () => playerRef.current?.pause(),
    resume: () => playerRef.current?.resume(),
    get state() { return playerRef.current?.state; },
  }), []);

  return (
    <canvas
      ref={canvasRef}
      aria-label={DATA.name}
      style={{ display: 'block', width: '100%', aspectRatio: '${a.w} / ${a.h}', ...style }}
      {...rest}
    />
  );
});

export default ${name};
export { DATA as ${name[0].toLowerCase() + name.slice(1)}Data };
`;
}
