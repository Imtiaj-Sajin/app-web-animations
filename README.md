# Plush Motion

Free, premium-feeling animations for websites and apps. Each animation is written once, then compiled to every format people need:

| Format | Output | Verified |
| --- | --- | --- |
| Web Component | `bloo.wc.js` → `<plush-bloo>` | ✅ in Chrome (tap, events, states) |
| React | `Bloo.jsx` | ✅ compiles (esbuild) |
| Vanilla JS | `bloo.js` → `mount(el)` | ✅ in Chrome |
| Lottie | `bloo.json` (state = marker) | ✅ renders identically in lottie-web |
| dotLottie | `bloo.lottie` | ✅ loads in `@lottiefiles/dotlottie-web` |
| Animated SVG | `bloo.svg` (SMIL, works in `<img>`) | ✅ in Chrome |
| MP4 / WebM / GIF | rendered in the browser on the site | ✅ encoded and decoded in Chrome |
| SwiftUI | `BlooView.swift` + `PlushRuntime.swift` | ⚠️ not compiled yet (needs Xcode) |
| Jetpack Compose | `Bloo.kt` + `PlushRuntime.kt` | ⚠️ not compiled yet (needs Android Studio) |
| Rive | — | Must be built by hand in the Rive editor |

## Run it

```sh
npm install
npm run dev      # builds dist/ and serves it at http://localhost:5173
npm test         # validates every animation and runs every exporter
```

## How it works

```
src/core/dsl.js            authoring helpers: shapes, keyframe tracks, spring physics
src/library/               the animations themselves (+ packs in index.js)
src/runtime/               players: plush-player.js (web), PlushRuntime.swift, PlushRuntime.kt
src/exporters/             data → Lottie, dotLottie, SVG, web files, Swift, Kotlin
scripts/build.mjs          writes the site + every download into dist/
site/                      the website (static, no framework)
```

Every animation compiles to one small data format: groups, Bézier paths and keyframed properties. Each exporter turns that data into its target format. Springs are baked into keyframes, so Lottie, SVG and video play the same motion. On the web, the runtime also adds live behaviour on top: eyes follow the cursor, and switching states blends smoothly.

### Rules for new animations

- Every state starts and ends at the same resting pose. That way the whole timeline loops seamlessly in the linear formats (Lottie, SVG, video).
- If two keyframed paths morph into each other, they need the same number of vertices. `npm test` checks this.
- Keep the art original. The `.riv` files in the repo root are third-party marketplace downloads kept for study only. Don't ship them.

### Adding an animation

1. Create it in `src/library/animations/` with `defineAnimation({ id, name, w, h, states, initial, interact, layers })`.
2. Add it to `animations`, and optionally to a pack, in `src/library/index.js`.
3. Run `npm run dev`. It appears on the site with every download.
