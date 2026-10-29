/* Plush data → SwiftUI and Jetpack Compose source files (each needs the shared PlushRuntime file). */
import { readFileSync } from 'node:fs';
import { pascal } from './web.js';

export const SWIFT_RUNTIME = readFileSync(new URL('../runtime/PlushRuntime.swift', import.meta.url), 'utf8');
export const KOTLIN_RUNTIME = readFileSync(new URL('../runtime/PlushRuntime.kt', import.meta.url), 'utf8');

const camel = (id) => {
  const p = pascal(id);
  return p[0].toLowerCase() + p.slice(1);
};

function statesLine(a) {
  return `States: ${Object.keys(a.states).join(', ')}${a.interact?.tap ? ' · tap reacts' : ''}`;
}

export function toSwift(a) {
  const name = pascal(a.id);
  const json = JSON.stringify(a);
  if (json.includes('"""#') || json.includes('\\#')) throw new Error(`${a.id}: JSON cannot be embedded in a Swift raw string`);
  const other = Object.keys(a.states).find((s) => s !== a.initial) ?? a.initial;
  return `//  ${name}View.swift — Plush Motion · ${a.name} (free, MIT licence)
//  ${a.description}
//  ${statesLine(a)}
//
//  Requires PlushRuntime.swift (add it once per project).
//  Usage:
//      ${name}View()
//          .frame(width: 200)
//      ${name}View(state: "${other}")          // drive the state from your own @State
//      PlushView(.${camel(a.id)}, interactive: false)

import SwiftUI

public extension PlushAnimation {
    static let ${camel(a.id)} = PlushAnimation(json: plush${name}JSON)
}

public struct ${name}View: View {
    private let state: String?
    private let interactive: Bool

    public init(state: String? = nil, interactive: Bool = true) {
        self.state = state
        self.interactive = interactive
    }

    public var body: some View {
        PlushView(.${camel(a.id)}, state: state, interactive: interactive)
    }
}

private let plush${name}JSON = #"""
${json}
"""#
`;
}

export function toKotlin(a) {
  const name = pascal(a.id);
  const json = JSON.stringify(a);
  if (json.includes('$') || json.includes('"""')) throw new Error(`${a.id}: JSON cannot be embedded in a Kotlin raw string`);
  // JVM string constants are limited to 64 KB, so long data is split into chunks.
  const chunks = json.match(/[\s\S]{1,30000}/g);
  const other = Object.keys(a.states).find((s) => s !== a.initial) ?? a.initial;
  return `// ${name}.kt — Plush Motion · ${a.name} (free, MIT licence)
// ${a.description}
// ${statesLine(a)}
//
// Requires PlushRuntime.kt in the same package (add it once per project).
// Usage:
//     ${name}(Modifier.size(200.dp))
//     ${name}(state = "${other}", onStateChange = { println(it) })
package plush.motion

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

@Composable
fun ${name}(
    modifier: Modifier = Modifier,
    state: String? = null,
    interactive: Boolean = true,
    onStateChange: ((String) -> Unit)? = null,
) = PlushAnimationView(${name}Animation, modifier, state, interactive, onStateChange)

val ${name}Animation: PlushAnimation by lazy { PlushAnimation(${name.toUpperCase()}_JSON) }

private val ${name.toUpperCase()}_JSON: String = listOf(
${chunks.map((c) => `    """${c}""",`).join('\n')}
).joinToString("")
`;
}
