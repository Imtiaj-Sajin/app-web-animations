// PlushRuntime.kt — Plush Motion runtime for Jetpack Compose (free, MIT licence)
// Add this file to your project once; every Plush animation composable uses it.
// Requires Compose UI 1.2+. Rename the package to match your app if you like.
package plush.motion

import android.provider.Settings
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathMeasure
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.abs
import kotlin.math.min

// ---------------------------------------------------------------- values

class PlushEase(val hold: Boolean, val bezier: FloatArray?) {
    fun apply(x: Float): Float {
        val b = bezier ?: return x
        val cx = 3f * b[0]; val bx = 3f * (b[2] - b[0]) - cx; val ax = 1f - cx - bx
        val cy = 3f * b[1]; val by = 3f * (b[3] - b[1]) - cy; val ay = 1f - cy - by
        var t = x
        for (n in 0 until 8) {
            val err = ((ax * t + bx) * t + cx) * t - x
            if (abs(err) < 1e-6f) break
            val d = (3f * ax * t + 2f * bx) * t + cx
            if (abs(d) < 1e-6f) break
            t -= err / d
        }
        t = t.coerceIn(0f, 1f)
        return ((ay * t + by) * t + cy) * t
    }

    companion object {
        val LINEAR = PlushEase(false, null)
        val HOLD = PlushEase(true, null)
    }
}

sealed class PlushValue {
    class Num(val n: Float) : PlushValue()
    class Vec(val xs: FloatArray) : PlushValue()
    /** Points flattened as x0,y0,x1,y1… ; i/o are tangents relative to their vertex. */
    class Shape(val closed: Boolean, val v: FloatArray, val i: FloatArray, val o: FloatArray) : PlushValue()

    val number: Float
        get() = when (val s = this) {
            is Num -> s.n
            is Vec -> if (s.xs.isNotEmpty()) s.xs[0] else 0f
            is Shape -> 0f
        }

    val vector: FloatArray
        get() = when (val s = this) {
            is Vec -> s.xs
            is Num -> floatArrayOf(s.n, s.n)
            is Shape -> FloatArray(0)
        }

    fun mix(b: PlushValue, t: Float): PlushValue {
        val a = this
        return when {
            a is Num && b is Num -> Num(a.n + (b.n - a.n) * t)
            a is Vec && b is Vec -> Vec(lerp(a.xs, b.xs, t))
            a is Shape && b is Shape -> Shape(a.closed, lerp(a.v, b.v, t), lerp(a.i, b.i, t), lerp(a.o, b.o, t))
            else -> if (t < 1f) a else b
        }
    }

    private fun lerp(x: FloatArray, y: FloatArray, t: Float) =
        FloatArray(min(x.size, y.size)) { x[it] + (y[it] - x[it]) * t }
}

class PlushKey(val t: Float, val v: PlushValue, val e: PlushEase)

class PlushProp(private val fixed: PlushValue?, private val keys: Array<PlushKey>?) {
    fun at(f: Float): PlushValue {
        if (fixed != null) return fixed
        val k = keys!!
        if (f <= k[0].t) return k[0].v
        if (f >= k[k.size - 1].t) return k[k.size - 1].v
        var lo = 0
        var hi = k.size - 1
        while (hi - lo > 1) {
            val m = (lo + hi) / 2
            if (k[m].t <= f) lo = m else hi = m
        }
        val a = k[lo]
        val b = k[hi]
        if (a.e.hold) return a.v
        return a.v.mix(b.v, a.e.apply((f - a.t) / (b.t - a.t)))
    }
}

// ---------------------------------------------------------------- parsing

private object PlushJson {
    fun value(x: Any?): PlushValue = when (x) {
        is Number -> PlushValue.Num(x.toFloat())
        is JSONArray -> PlushValue.Vec(FloatArray(x.length()) { x.getDouble(it).toFloat() })
        is JSONObject -> PlushValue.Shape(x.optBoolean("c"), points(x.optJSONArray("v")), points(x.optJSONArray("i")), points(x.optJSONArray("o")))
        else -> PlushValue.Num(0f)
    }

    private fun points(a: JSONArray?): FloatArray {
        if (a == null) return FloatArray(0)
        val out = FloatArray(a.length() * 2)
        for (k in 0 until a.length()) {
            val p = a.getJSONArray(k)
            out[2 * k] = p.getDouble(0).toFloat()
            out[2 * k + 1] = p.getDouble(1).toFloat()
        }
        return out
    }

    fun prop(x: Any?): PlushProp? {
        if (x == null || x == JSONObject.NULL) return null
        if (x is JSONObject && x.has("k")) {
            val arr = x.getJSONArray("k")
            val keys = Array(arr.length()) { idx ->
                val key = arr.getJSONArray(idx)
                val ease = when (val e = key.opt(2)) {
                    "h" -> PlushEase.HOLD
                    is JSONArray -> PlushEase(false, FloatArray(4) { e.getDouble(it).toFloat() })
                    else -> PlushEase.LINEAR
                }
                PlushKey(key.getDouble(0).toFloat(), value(key.get(1)), ease)
            }
            return PlushProp(null, keys)
        }
        return PlushProp(value(x), null)
    }
}

class PlushNode(j: JSONObject) {
    val id: String? = if (j.has("id")) j.getString("id") else null
    private val tr: JSONObject = j.optJSONObject("tr") ?: JSONObject()
    val a = PlushJson.prop(tr.opt("a"))
    val p = PlushJson.prop(tr.opt("p"))
    val s = PlushJson.prop(tr.opt("s"))
    val r = PlushJson.prop(tr.opt("r"))
    val o = PlushJson.prop(tr.opt("o"))
    val children: List<PlushNode>? =
        if (j.optString("t") == "g") j.optJSONArray("c")?.let { c -> List(c.length()) { PlushNode(c.getJSONObject(it)) } } ?: emptyList()
        else null
    val d = PlushJson.prop(j.opt("d"))
    val fill = PlushJson.prop(j.opt("fill"))
    private val stroke: JSONObject? = j.optJSONObject("stroke")
    val strokeColor = PlushJson.prop(stroke?.opt("c"))
    val strokeWidth = PlushJson.prop(stroke?.opt("w"))
    val cap = when (stroke?.optString("cap")) { "butt" -> StrokeCap.Butt; "square" -> StrokeCap.Square; else -> StrokeCap.Round }
    val join = when (stroke?.optString("join")) { "miter" -> StrokeJoin.Miter; "bevel" -> StrokeJoin.Bevel; else -> StrokeJoin.Round }
    private val trim: JSONObject? = j.optJSONObject("trim")
    val trimStart = PlushJson.prop(trim?.opt("s"))
    val trimEnd = PlushJson.prop(trim?.opt("e"))
}

class PlushState(val from: Float, val to: Float, val loop: Boolean, val next: String?)

class PlushAnimation(json: String) {
    private val root = JSONObject(json)
    val name: String = root.optString("name", "Animation")
    val width: Float = root.optDouble("w", 1.0).toFloat()
    val height: Float = root.optDouble("h", 1.0).toFloat()
    val fps: Float = root.optDouble("fps", 60.0).toFloat()
    val initial: String = root.optString("initial")
    val poster: Float? = if (root.has("poster")) root.getDouble("poster").toFloat() else null
    val states: Map<String, PlushState> = root.optJSONObject("states")?.let { st ->
        st.keys().asSequence().associateWith { key ->
            val v = st.getJSONObject(key)
            PlushState(v.getDouble("from").toFloat(), v.getDouble("to").toFloat(), v.optBoolean("loop"), if (v.has("next")) v.getString("next") else null)
        }
    } ?: emptyMap()
    val tap: Map<String, String> = root.optJSONObject("interact")?.let { interact ->
        when (val t = interact.opt("tap")) {
            is String -> mapOf("*" to t)
            is JSONObject -> t.keys().asSequence().associateWith { t.getString(it) }
            else -> emptyMap()
        }
    } ?: emptyMap()
    val tapCycle: List<String> = root.optJSONObject("interact")?.optJSONArray("tap")?.let { a ->
        List(a.length()) { a.getString(it) }
    } ?: emptyList()
    val layers: List<PlushNode> = root.optJSONArray("layers")?.let { l -> List(l.length()) { PlushNode(l.getJSONObject(it)) } } ?: emptyList()
}

// ---------------------------------------------------------------- player

class PlushPlayer(val animation: PlushAnimation, initialState: String? = null) {
    var state: String = if (initialState != null && animation.states.containsKey(initialState)) initialState else animation.initial
        private set
    private var frame: Float = animation.states[state]?.from ?: 0f
    var speed = 1f
    var paused = false
    var onStateChange: ((String) -> Unit)? = null

    fun play(name: String) {
        val s = animation.states[name] ?: return
        state = name
        frame = s.from
        paused = false
        onStateChange?.invoke(name)
    }

    /** Plays whatever the animation defines as its tap reaction for the current state. */
    private var tapCount = 0

    fun tap() {
        val cycle = animation.tapCycle
        if (cycle.isNotEmpty()) {
            play(cycle[tapCount % cycle.size])
            tapCount++
        } else {
            (animation.tap[state] ?: animation.tap["*"])?.let { play(it) }
        }
    }

    fun advance(dt: Float, reduceMotion: Boolean) {
        val s = animation.states[state] ?: return
        if (reduceMotion && s.loop) {
            val p = animation.poster
            frame = if (p != null && p >= s.from && p < s.to) p else s.from
            return
        }
        if (paused) return
        frame += min(0.05f, dt) * animation.fps * speed
        if (frame >= s.to) {
            if (s.loop) {
                val length = s.to - s.from
                frame = if (length > 0f) s.from + (frame - s.from) % length else s.from
            } else {
                play(s.next ?: animation.initial)
            }
        }
    }

    fun draw(scope: DrawScope) {
        val a = animation
        val k = min(scope.size.width / a.width, scope.size.height / a.height)
        scope.withTransform({
            translate((scope.size.width - a.width * k) / 2f, (scope.size.height - a.height * k) / 2f)
            scale(k, k, pivot = Offset.Zero)
        }) {
            for (n in a.layers) drawNode(this, n, 1f)
        }
    }

    private fun drawNode(scope: DrawScope, n: PlushNode, alpha: Float) {
        val f = frame
        val op = alpha * (n.o?.at(f)?.number ?: 1f)
        if (op <= 0.002f) return
        val p = n.p?.at(f)?.vector ?: floatArrayOf(0f, 0f)
        val an = n.a?.at(f)?.vector ?: floatArrayOf(0f, 0f)
        val s = n.s?.at(f)?.vector ?: floatArrayOf(1f, 1f)
        val r = n.r?.at(f)?.number ?: 0f
        if (abs(s[0]) < 1e-5f || abs(s[1]) < 1e-5f) return
        scope.withTransform({
            translate(p[0], p[1])
            if (r != 0f) rotate(r, pivot = Offset.Zero)
            scale(s[0], s[1], pivot = Offset.Zero)
            translate(-an[0], -an[1])
        }) {
            val kids = n.children
            if (kids != null) {
                for (c in kids) drawNode(this, c, op)
            } else {
                drawShape(this, n, f, op)
            }
        }
    }

    private fun toPath(d: PlushValue.Shape): Path {
        val path = Path()
        val n = d.v.size / 2
        if (n == 0) return path
        path.moveTo(d.v[0], d.v[1])
        val segments = if (d.closed) n else n - 1
        for (j in 0 until segments) {
            val b = (j + 1) % n
            path.cubicTo(
                d.v[2 * j] + d.o[2 * j], d.v[2 * j + 1] + d.o[2 * j + 1],
                d.v[2 * b] + d.i[2 * b], d.v[2 * b + 1] + d.i[2 * b + 1],
                d.v[2 * b], d.v[2 * b + 1],
            )
        }
        if (d.closed) path.close()
        return path
    }

    private fun drawShape(scope: DrawScope, n: PlushNode, f: Float, op: Float) {
        val d = n.d?.at(f) as? PlushValue.Shape ?: return
        val path = toPath(d)
        val fc = n.fill?.at(f)?.vector
        if (fc != null && fc.size >= 4 && fc[3] > 0f) {
            scope.drawPath(path, Color(fc[0], fc[1], fc[2]), alpha = (op * fc[3]).coerceIn(0f, 1f))
        }
        val sc = n.strokeColor?.at(f)?.vector
        val w = n.strokeWidth?.at(f)?.number ?: 0f
        if (sc != null && sc.size >= 4 && sc[3] > 0f && w > 0f) {
            var stroked = path
            if (n.trimStart != null || n.trimEnd != null) {
                val ts = n.trimStart?.at(f)?.number ?: 0f
                val te = n.trimEnd?.at(f)?.number ?: 1f
                if (te - ts < 0.002f) return
                val measure = PathMeasure()
                measure.setPath(path, false)
                val len = measure.length
                stroked = Path()
                measure.getSegment(ts * len, te * len, stroked, true)
            }
            scope.drawPath(
                stroked,
                Color(sc[0], sc[1], sc[2]),
                alpha = (op * sc[3]).coerceIn(0f, 1f),
                style = Stroke(width = w, cap = n.cap, join = n.join),
            )
        }
    }
}

// ---------------------------------------------------------------- composable

/** Renders any Plush animation. Tap to trigger its reaction; respects "Remove animations". */
@Composable
fun PlushAnimationView(
    animation: PlushAnimation,
    modifier: Modifier = Modifier,
    state: String? = null,
    interactive: Boolean = true,
    onStateChange: ((String) -> Unit)? = null,
) {
    val player = remember(animation) { PlushPlayer(animation, state) }
    player.onStateChange = onStateChange
    val context = LocalContext.current
    val reduceMotion = remember {
        Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f
    }
    var tick by remember { mutableStateOf(0L) }

    LaunchedEffect(player) {
        var last = 0L
        while (true) {
            withFrameNanos { now ->
                if (last != 0L) player.advance((now - last) / 1_000_000_000f, reduceMotion)
                last = now
                tick = now
            }
        }
    }
    LaunchedEffect(state) {
        if (state != null && state != player.state) player.play(state)
    }

    val tapModifier = if (interactive) Modifier.pointerInput(player) { detectTapGestures { player.tap() } } else Modifier
    Canvas(
        modifier
            .aspectRatio(animation.width / animation.height)
            .semantics {
                contentDescription = animation.name
                if (interactive) role = Role.Button
            }
            .then(tapModifier),
    ) {
        if (tick >= 0L) player.draw(this)
    }
}
