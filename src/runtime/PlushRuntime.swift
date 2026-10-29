//  PlushRuntime.swift — Plush Motion runtime for SwiftUI (free, MIT licence)
//  Add this file to your project once; every Plush animation view uses it.
//  Requires iOS 15+, macOS 12+, tvOS 15+ or watchOS 8+.

import SwiftUI

// MARK: - Values

enum PlushEase {
    case linear, hold
    case bezier(Double, Double, Double, Double)

    func apply(_ x: Double) -> Double {
        switch self {
        case .linear: return x
        case .hold: return 0
        case let .bezier(x1, y1, x2, y2):
            let cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx
            let cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
            var t = x
            for _ in 0..<8 {
                let err = ((ax * t + bx) * t + cx) * t - x
                if abs(err) < 1e-6 { break }
                let d = (3 * ax * t + 2 * bx) * t + cx
                if abs(d) < 1e-6 { break }
                t -= err / d
            }
            t = min(1, max(0, t))
            return ((ay * t + by) * t + cy) * t
        }
    }
}

struct PlushPath {
    var closed: Bool
    var v: [CGPoint]
    var i: [CGPoint]
    var o: [CGPoint]

    func mix(_ b: PlushPath, _ t: Double) -> PlushPath {
        func m(_ x: [CGPoint], _ y: [CGPoint]) -> [CGPoint] {
            zip(x, y).map { CGPoint(x: $0.x + ($1.x - $0.x) * t, y: $0.y + ($1.y - $0.y) * t) }
        }
        return PlushPath(closed: closed, v: m(v, b.v), i: m(i, b.i), o: m(o, b.o))
    }

    var path: Path {
        var p = Path()
        guard let first = v.first else { return p }
        p.move(to: first)
        let n = v.count
        let segments = closed ? n : n - 1
        for j in 0..<max(segments, 0) {
            let a = v[j], b = v[(j + 1) % n]
            p.addCurve(
                to: b,
                control1: CGPoint(x: a.x + o[j].x, y: a.y + o[j].y),
                control2: CGPoint(x: b.x + i[(j + 1) % n].x, y: b.y + i[(j + 1) % n].y)
            )
        }
        if closed { p.closeSubpath() }
        return p
    }
}

enum PlushValue {
    case num(Double)
    case vec([Double])
    case shape(PlushPath)

    var number: Double {
        switch self {
        case let .num(n): return n
        case let .vec(v): return v.first ?? 0
        case .shape: return 0
        }
    }

    var vector: [Double] {
        switch self {
        case let .vec(v): return v
        case let .num(n): return [n, n]
        case .shape: return []
        }
    }

    func mix(_ b: PlushValue, _ t: Double) -> PlushValue {
        switch (self, b) {
        case let (.num(x), .num(y)): return .num(x + (y - x) * t)
        case let (.vec(x), .vec(y)): return .vec(zip(x, y).map { $0 + ($1 - $0) * t })
        case let (.shape(x), .shape(y)): return .shape(x.mix(y, t))
        default: return t < 1 ? self : b
        }
    }
}

struct PlushKey {
    let t: Double
    let v: PlushValue
    let e: PlushEase
}

enum PlushProp {
    case fixed(PlushValue)
    case keys([PlushKey])

    func at(_ f: Double) -> PlushValue {
        switch self {
        case let .fixed(v):
            return v
        case let .keys(k):
            if f <= k[0].t { return k[0].v }
            if f >= k[k.count - 1].t { return k[k.count - 1].v }
            var lo = 0, hi = k.count - 1
            while hi - lo > 1 {
                let m = (lo + hi) / 2
                if k[m].t <= f { lo = m } else { hi = m }
            }
            let a = k[lo], b = k[hi]
            if case .hold = a.e { return a.v }
            return a.v.mix(b.v, a.e.apply((f - a.t) / (b.t - a.t)))
        }
    }
}

// MARK: - Parsing

enum PlushJSON {
    static func num(_ x: Any?) -> Double { (x as? NSNumber)?.doubleValue ?? 0 }

    static func point(_ x: Any) -> CGPoint {
        let a = x as? [Any] ?? []
        return CGPoint(x: a.count > 0 ? num(a[0]) : 0, y: a.count > 1 ? num(a[1]) : 0)
    }

    static func value(_ x: Any) -> PlushValue {
        if let n = x as? NSNumber { return .num(n.doubleValue) }
        if let a = x as? [Any] { return .vec(a.map { PlushJSON.num($0) }) }
        if let d = x as? [String: Any] {
            let pts: (String) -> [CGPoint] = { key in (d[key] as? [Any] ?? []).map { PlushJSON.point($0) } }
            return .shape(PlushPath(closed: d["c"] as? Bool ?? false, v: pts("v"), i: pts("i"), o: pts("o")))
        }
        return .num(0)
    }

    static func prop(_ x: Any?) -> PlushProp? {
        guard let x = x else { return nil }
        if let d = x as? [String: Any], let keys = d["k"] as? [Any] {
            let parsed: [PlushKey] = keys.compactMap { item in
                guard let arr = item as? [Any], arr.count >= 2 else { return nil }
                var e = PlushEase.linear
                if arr.count > 2 {
                    if let s = arr[2] as? String, s == "h" {
                        e = .hold
                    } else if let b = arr[2] as? [Any], b.count == 4 {
                        e = .bezier(num(b[0]), num(b[1]), num(b[2]), num(b[3]))
                    }
                }
                return PlushKey(t: num(arr[0]), v: value(arr[1]), e: e)
            }
            return parsed.isEmpty ? nil : .keys(parsed)
        }
        return .fixed(value(x))
    }
}

final class PlushNode {
    let id: String?
    let a: PlushProp?, p: PlushProp?, s: PlushProp?, r: PlushProp?, o: PlushProp?
    let children: [PlushNode]?
    let d: PlushProp?, fill: PlushProp?
    let strokeColor: PlushProp?, strokeWidth: PlushProp?
    let trimStart: PlushProp?, trimEnd: PlushProp?
    let cap: CGLineCap
    let join: CGLineJoin

    init(_ j: [String: Any]) {
        id = j["id"] as? String
        let tr = j["tr"] as? [String: Any] ?? [:]
        a = PlushJSON.prop(tr["a"])
        p = PlushJSON.prop(tr["p"])
        s = PlushJSON.prop(tr["s"])
        r = PlushJSON.prop(tr["r"])
        o = PlushJSON.prop(tr["o"])
        if (j["t"] as? String) == "g" {
            children = (j["c"] as? [[String: Any]] ?? []).map { PlushNode($0) }
        } else {
            children = nil
        }
        d = PlushJSON.prop(j["d"])
        fill = PlushJSON.prop(j["fill"])
        let st = j["stroke"] as? [String: Any]
        strokeColor = PlushJSON.prop(st?["c"])
        strokeWidth = PlushJSON.prop(st?["w"])
        switch st?["cap"] as? String {
        case "butt": cap = .butt
        case "square": cap = .square
        default: cap = .round
        }
        switch st?["join"] as? String {
        case "miter": join = .miter
        case "bevel": join = .bevel
        default: join = .round
        }
        let tm = j["trim"] as? [String: Any]
        trimStart = PlushJSON.prop(tm?["s"])
        trimEnd = PlushJSON.prop(tm?["e"])
    }
}

struct PlushState {
    let from: Double
    let to: Double
    let loop: Bool
    let next: String?
}

// MARK: - Animation & player

public final class PlushAnimation {
    public let name: String
    public let width: Double
    public let height: Double
    public let fps: Double
    public let initial: String
    public let stateNames: [String]
    let poster: Double?
    let states: [String: PlushState]
    let tap: [String: String]
    let layers: [PlushNode]

    public init(json: String) {
        let root = (try? JSONSerialization.jsonObject(with: Data(json.utf8))) as? [String: Any] ?? [:]
        name = root["name"] as? String ?? "Animation"
        width = max(PlushJSON.num(root["w"]), 1)
        height = max(PlushJSON.num(root["h"]), 1)
        let rate = PlushJSON.num(root["fps"])
        fps = rate > 0 ? rate : 60
        initial = root["initial"] as? String ?? ""
        poster = (root["poster"] as? NSNumber)?.doubleValue
        var parsed: [String: PlushState] = [:]
        for (key, value) in root["states"] as? [String: [String: Any]] ?? [:] {
            parsed[key] = PlushState(
                from: PlushJSON.num(value["from"]),
                to: PlushJSON.num(value["to"]),
                loop: value["loop"] as? Bool ?? false,
                next: value["next"] as? String
            )
        }
        states = parsed
        stateNames = Array(parsed.keys)
        let interact = root["interact"] as? [String: Any] ?? [:]
        if let single = interact["tap"] as? String {
            tap = ["*": single]
        } else {
            tap = interact["tap"] as? [String: String] ?? [:]
        }
        layers = (root["layers"] as? [[String: Any]] ?? []).map { PlushNode($0) }
    }
}

public final class PlushPlayer {
    public let animation: PlushAnimation
    public private(set) var state: String
    public var speed = 1.0
    public var isPaused = false
    public var onStateChange: ((String) -> Void)?
    private var frame: Double
    private var last: Date?

    public init(_ animation: PlushAnimation, state: String? = nil) {
        self.animation = animation
        let start = state.flatMap { animation.states[$0] != nil ? $0 : nil } ?? animation.initial
        self.state = start
        self.frame = animation.states[start]?.from ?? 0
    }

    public func play(_ name: String) {
        guard let s = animation.states[name] else { return }
        state = name
        frame = s.from
        isPaused = false
        onStateChange?(name)
    }

    /// Plays whatever the animation defines as its tap reaction for the current state.
    public func tap() {
        if let next = animation.tap[state] ?? animation.tap["*"] { play(next) }
    }

    func advance(to date: Date, reduceMotion: Bool) {
        defer { last = date }
        guard let s = animation.states[state] else { return }
        if reduceMotion && s.loop {
            if let p = animation.poster, p >= s.from, p < s.to { frame = p } else { frame = s.from }
            return
        }
        guard !isPaused, let previous = last else { return }
        frame += min(0.05, date.timeIntervalSince(previous)) * animation.fps * speed
        if frame >= s.to {
            if s.loop {
                let length = s.to - s.from
                frame = length > 0 ? s.from + (frame - s.from).truncatingRemainder(dividingBy: length) : s.from
            } else {
                play(s.next ?? animation.initial)
            }
        }
    }

    public func render(_ context: GraphicsContext, size: CGSize, at date: Date, reduceMotion: Bool = false) {
        advance(to: date, reduceMotion: reduceMotion)
        let a = animation
        let k = min(Double(size.width) / a.width, Double(size.height) / a.height)
        var ctx = context
        ctx.translateBy(x: (Double(size.width) - a.width * k) / 2, y: (Double(size.height) - a.height * k) / 2)
        ctx.scaleBy(x: k, y: k)
        for node in a.layers { draw(node, ctx, alpha: 1) }
    }

    private func draw(_ n: PlushNode, _ context: GraphicsContext, alpha: Double) {
        let f = frame
        let op = alpha * (n.o?.at(f).number ?? 1)
        if op <= 0.002 { return }
        let p = n.p?.at(f).vector ?? [0, 0]
        let an = n.a?.at(f).vector ?? [0, 0]
        let s = n.s?.at(f).vector ?? [1, 1]
        let r = n.r?.at(f).number ?? 0
        if abs(s[0]) < 1e-5 || abs(s[1]) < 1e-5 { return }
        var c = context
        c.translateBy(x: p[0], y: p[1])
        if r != 0 { c.rotate(by: .degrees(r)) }
        c.scaleBy(x: s[0], y: s[1])
        c.translateBy(x: -an[0], y: -an[1])

        if let kids = n.children {
            for child in kids { draw(child, c, alpha: op) }
            return
        }
        guard case let .shape(shape)? = n.d?.at(f) else { return }
        let path = shape.path
        if let fc = n.fill?.at(f).vector, fc.count >= 4, fc[3] > 0 {
            c.opacity = op * fc[3]
            c.fill(path, with: .color(Color(.sRGB, red: fc[0], green: fc[1], blue: fc[2], opacity: 1)))
        }
        if let sc = n.strokeColor?.at(f).vector, sc.count >= 4, sc[3] > 0,
           let w = n.strokeWidth?.at(f).number, w > 0 {
            var stroked = path
            if n.trimStart != nil || n.trimEnd != nil {
                let ts = n.trimStart?.at(f).number ?? 0
                let te = n.trimEnd?.at(f).number ?? 1
                if te - ts < 0.002 { return }
                stroked = path.trimmedPath(from: ts, to: te)
            }
            c.opacity = op * sc[3]
            c.stroke(
                stroked,
                with: .color(Color(.sRGB, red: sc[0], green: sc[1], blue: sc[2], opacity: 1)),
                style: StrokeStyle(lineWidth: w, lineCap: n.cap, lineJoin: n.join)
            )
        }
    }
}

// MARK: - View

/// Renders any Plush animation. Tap to trigger its reaction; respects Reduce Motion.
public struct PlushView: View {
    private let animation: PlushAnimation
    private let requestedState: String?
    private let interactive: Bool
    @State private var player: PlushPlayer
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public init(_ animation: PlushAnimation, state: String? = nil, interactive: Bool = true) {
        self.animation = animation
        self.requestedState = state
        self.interactive = interactive
        _player = State(initialValue: PlushPlayer(animation, state: state))
    }

    public var body: some View {
        TimelineView(.animation) { timeline in
            Canvas { context, size in
                player.render(context, size: size, at: timeline.date, reduceMotion: reduceMotion)
            }
        }
        .aspectRatio(CGSize(width: animation.width, height: animation.height), contentMode: .fit)
        .contentShape(Rectangle())
        .onTapGesture { if interactive { player.tap() } }
        .task(id: requestedState) {
            if let s = requestedState, s != player.state { player.play(s) }
        }
        .accessibilityElement()
        .accessibilityLabel(Text(animation.name))
        .accessibilityAddTraits(interactive ? .isButton : .isImage)
    }
}
