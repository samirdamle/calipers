# Calipers — Library Plan (v2)

> **Status:** This v2 plan supersedes the v1 plan (a single
> `calipers(targetSelector, targetAnchor, sourceSelector, sourceAnchor, returnValues)`
> positional-argument function with concatenated letter codes). The v1 API is
> dropped outright — the repo is greenfield, so no back-compat is owed.
>
> The library goal lives at [`docs/meta/goal.md`](../meta/goal.md).

## 1. What this library is

A tiny, dependency-free, tree-shakeable JavaScript geometry toolkit for the
web. It answers — and acts on — questions like:

- How big is this element, and where is it?
- How far is A from B — edge to edge, center to center, at an angle?
- Put this element's top-center 8px below that element's bottom-center.
- Line up these elements' left edges; spread these evenly.
- Keep this floating panel inside the viewport.

It works on HTML **and** SVG, in any framework or none. It measures; it
places; it never renders (one quarantined debug exception, §10).

## 2. Design principles

1. **Lightweight is the feature.** Tiny core, independently importable
   modules, zero dependencies, per-module size budgets enforced in CI and
   published in the docs. Stale size figures are a bug.
2. **Options objects, never positional args.** Every public function takes
   `(input, options)`.
3. **Layered architecture.**
   - *Pure geometry core* — DOM-free functions on rects and points
     (`distanceBetween`, `gapBetween`, `anchorPoint`, …). Fully unit-testable
     without a browser; this is where correctness lives.
   - *DOM adapters* — `rectOf` resolves elements/selectors/rects into
     normalized rects. This is the only layer that touches layout.
   - *Verbs* — `measure`, `place`, `align`, `distribute`, `fit` compose the
     two layers below. They contain no geometry math of their own.
4. **Framework-agnostic.** Accept element references, not just selectors.
   No framework bindings in core (community territory).
5. **Explicit measurement model.** Every number the library returns names
   its box (§6) and its coordinate space (§6). No silent defaults that shift
   meaning on scroll or under transforms.
6. **Opt-in output.** Results carry the resolved anchor points always
   (debuggability), plus exactly the fields the caller asked for — nothing
   more.
7. **Measure, don't render.** The library returns geometry; drawing is the
   caller's job.

## 3. Module map

Each module is independently importable so callers pay only for what they
use. Size budgets are per-module (targets to be measured once implemented;
core measure target ≈ 1–2 kB min+br).

| Module   | Entry points | Job |
|----------|--------------|-----|
| `rect`   | `rectOf(target, opts)` | Resolve any measurable into a normalized rect in a named space |
| `measure`| `measure(a, b, opts)`, `calipers(targets, opts)` | Pairwise geometry between measurables |
| `place`  | `place(el, opts)` | Position an element relative to a point or another measurable |
| `align`  | `align(els, edge)`, `distribute(els, axis, opts)` | Design-tool verbs over sets of elements |
| `fit`    | `fit(el, opts)` | Keep a floating element inside a container/viewport |
| `debug`  | `showGuides(...)` | Dev-only overlay drawing rulers and anchor points (never in prod bundles) |

`align`, `distribute`, and `fit` are thin compositions of `rect` + `measure`
+ `place` — they must not duplicate geometry logic.

## 4. Input normalization

```ts
type Measurable =
  | string            // CSS selector → all matches (targets) / first match (sources)
  | Element           // incl. SVGElement
  | ArrayLike<Element | string>
  | Window | 'viewport'
  | RectLike;         // { x, y, width, height } — passthrough, enables cross-iframe math
```

- Sources are **not** restricted to a single element. Pairs are the unit of
  measurement; N targets × M sources is the natural shape.
- A `RectLike` passthrough means callers can measure across iframe
  boundaries by handing in a rect computed in the other frame.

## 5. Anchors

```ts
type Anchor = AnchorCode | { x: number; y: number } | [number, number] | ((rect: Rect) => Point);
```

- Every anchor resolves to exactly **one point** `{ x, y }` in the active
  coordinate space.
- The 13 classic codes are sugar over fractional points relative to the
  resolved rect:

  | code | point | code | point |
  |------|-------|------|-------|
  | `tl` | (0, 0) | `tr` | (1, 0) |
  | `tc` | (0.5, 0) | `cl` | (0, 0.5) |
  | `cc` | (0.5, 0.5) | `cr` | (1, 0.5) |
  | `bl` | (0, 1) | `br` | (1, 1) |
  | `bc` | (0.5, 1) | `t` | (0.5, 0) |
  | `b` | (0.5, 1) | `l` | (0, 0.5) |
  | `r` | (1, 0.5) | | |

- Fractional points give arbitrary anchors for free (e.g. `{ x: 0.25, y: 0 }`
  = quarter-point of the top edge). Function anchors cover anything exotic.

## 6. Measurement model

### 6.1 Box — *what* is measured

`box: 'content' | 'border' | 'margin' | 'visual'` (default `'border'`).

- `visual` = `getBoundingClientRect()` **including** CSS transforms — the box
  the user actually sees.
- The layout boxes exclude transforms (`offsetWidth/Height`-family math).
- For SVG elements, `box: 'bbox'` uses `getBBox()` (untransformed local
  user units); screen mapping goes through `getScreenCTM()` (§8).

### 6.2 Space — *where* the numbers live

`space: 'viewport' | 'document'` (default `'viewport'`).

- `viewport` rects come straight from `getBoundingClientRect()` and shift on
  scroll. `document` adds the scroll offsets. The choice is explicit and
  documented on every result — never ambient.

### 6.3 Fields — *what* is returned

Requested via `fields: [...]` (array, not letter soup). Signed deltas are
defined as **target − source**; angles use **0° = east, clockwise-positive**
(screen coordinates, y-down), range (−180°, 180°].

| field | meaning |
|-------|---------|
| `dx`, `dy` | signed point-to-point deltas along each axis |
| `distance` | Euclidean distance between the two anchor points |
| `gapX`, `gapY` | edge-to-edge box separation per axis; **0 when the projections overlap** — the "how far apart are they" most callers actually want |
| `angleDeg`, `angleRad` | direction from source point to target point |
| `width`, `height` | target box size |
| `overlaps` | boxes intersect at all |
| `overlapArea` | intersection area in px² (0 when disjoint) |
| `contains` | target box fully encloses the source box |
| `visible` | any part of the target box intersects the viewport |

Result shape — `measure()` returns one object, `calipers()` returns an
array:

```ts
{
  target: Element | RectLike,   // what was measured
  source: Element | RectLike,   // what it was measured against
  pointA: Point,                // resolved target anchor — ALWAYS present
  pointB: Point,                // resolved source anchor — ALWAYS present
  ...requestedFields
}
```

`pointA`/`pointB` are non-optional: debugging a measurement without knowing
which points were used is miserable, and two points are cheap.

### 6.4 Deliberately excluded from measurement

- **z-index.** A style query, not geometry — and `auto` plus stacking
  contexts make it unreliable. Out of scope.

## 7. Placement

```ts
place(el, {
  anchor: 'tc',                       // which point of `el` to position
  at: { anchor: 'bc', of: trigger },  // …onto which point of what (default: viewport point)
  offset: { x: 0, y: 8 },
  using: 'transform',                 // 'transform' (default, compositor-friendly) | 'position'
});
```

- The hard part is honored: placement math runs in **`el`'s `offsetParent`
  frame**, converting from the measurement space via `rectOf` — never naive
  viewport arithmetic.
- `at.of` accepts anything `Measurable`, or a raw `{ x, y }` point.

## 8. SVG support

SVG is a first-class citizen, not a tolerance:

- `SVGGraphicsElement` resolves via `getBBox()` for `box: 'bbox'`
  (untransformed local units) and via `getBoundingClientRect()` otherwise.
- Screen↔SVG-user-unit conversion through `getScreenCTM()` / its inverse,
  so callers can take a measured screen point and drop an SVG annotation on
  it — or position an HTML tooltip over an SVG chart (the nano-charts
  companion use case).
- Zero-size / `display: none` elements resolve to empty rects; this is
  documented, not papered over.

## 9. Align, distribute, fit

- `align(els, 'left' | 'right' | 'top' | 'bottom' | 'center-x' | 'center-y')` —
  moves each element so the named edge/center meets the set's extreme (edges)
  or mean (centers), design-tool style. Implemented as `measure` + `place`.
- `distribute(els, 'x' | 'y', { gap })` — even spacing between boxes along an
  axis; `gap` fixed or auto-computed.
- `fit(el, { within = 'viewport', strategy = 'shift' | 'flip' })` — the
  tooltip/popover problem: nudge (`shift`) or mirror (`flip`) the element so
  it stays inside `within`.

## 10. Non-goals

- Rendering or drawing primitives (the one exception: a dev-only `debug`
  overlay that draws rulers/anchor points on screen — clearly quarantined,
  never shipped in prod bundles).
- Drag-and-drop, animation, or UI components.
- Framework-specific bindings.
- Reactive/observed measurement in v1 (an `observe()` mode is a v2
  candidate, built on `ResizeObserver` — not a polling loop).

## 11. Relationship to CSS Anchor Positioning

CSS Anchor Positioning now covers *declarative* tethering in supporting
browsers. Calipers is its programmatic complement: imperative measurement,
arbitrary anchor math, gap/overlap/angle queries, SVG user-unit conversion,
and environments where anchor positioning is unavailable or insufficient.
The library must not re-implement what CSS already does declaratively — it
owns the *geometry answers* CSS cannot give.

## 12. Engineering

- **TypeScript-first**, ships `.d.ts`. Strict mode.
- **ESM-first** (CJS only if it costs nothing). Zero dependencies.
- **Tests:** vitest. The pure geometry core is tested DOM-free; DOM adapters
  get a minimal happy-dom/jsdom layer. Property-style tests for anchor math
  (every code ≡ its fractional point) are cheap and high-value.
- **Size budgets** per module, enforced in CI, published in README +
  docs/API.md. Treat a stale figure as a bug.
- **Docs:** README (with an anchor diagram), docs/API.md, and a live demo
  playground page (move elements, watch measurements update) — all three
  kept in sync: same module order, same field tables, cross-linked.
- **Performance:** read each element's rect **once** per call, compute after.
  No interleaved read/write, so batch calls don't thrash layout. Document
  that all calls are synchronous layout reads.
- **Repo hygiene:** PRs against `develop` for review; nothing merges
  unreviewed.

## 13. Roadmap

- **v1:** `rect` + `measure`/`calipers` + `place`. The smallest shippable
  thing that measures and positions.
- **v1.1:** `align` / `distribute` / `fit`.
- **v2 candidates:** `debug` overlay, `observe()` reactive mode.
