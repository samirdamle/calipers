# Calipers API reference

> Conventions: every function takes `(input, options)`. Every measurement names its
> **box** and **space**. Angles are 0° = east, clockwise-positive (screen coordinates),
> range (−180°, 180°].

## `rectOf` — `@samirdamle/calipers/rect`

Resolve any measurable into a normalized `{ x, y, width, height }`. Reads layout once per call.

```ts
rectOf(target: Measurable, options?: RectOptions): Rect
```

```ts
type Measurable =
  | string                          // selector → first match (throws on no match)
  | Element                         // incl. SVGElement
  | ArrayLike<Element | string | Rect>
  | Window | 'viewport'             // the viewport rect
  | Rect;                           // { x, y, width, height } passthrough (copy)

interface RectOptions {
  box?: 'content' | 'border' | 'margin' | 'visual' | 'bbox'; // default 'border'
  space?: 'viewport' | 'document';                          // default 'viewport'
}
```

### Boxes

| box | meaning |
|---|---|
| `border` | layout border box via the offset chain. Integer px, no transforms. |
| `content` | border box inset by computed border + padding. |
| `margin` | border box outset by computed margins. |
| `visual` | `getBoundingClientRect()` — what the user sees, transforms included. |
| `bbox` | SVG only: `getBBox()` in local user units, untransformed. Falls back to `border` on HTML. |

Caveats: layout boxes don't account for transformed ancestors — use `visual` when transforms are in play. `display: none` / zero-size elements resolve to empty rects.

### Spaces

`viewport` rects come from `getBoundingClientRect()` and shift on scroll; `document` adds the scroll offsets. `bbox` results are always in local SVG units, independent of space.

## `measure` / `calipers` — `@samirdamle/calipers/measure`

```ts
measure(a: Measurable, b: Measurable, options?: MeasureOptions): MeasureResult
calipers(targets: Measurable, source: Measurable, options?: MeasureOptions): MeasureResult[]
```

`calipers` measures N targets against one source — a selector string expands to **all** matches.

```ts
interface MeasureOptions extends RectOptions {
  anchor?: Anchor;            // anchor of a (target). default 'cc'
  ofAnchor?: Anchor;          // anchor of b (source). default 'cc'
  fields?: readonly Field[];  // default: all
}
```

### Result

```ts
interface MeasureResult {
  target: Measurable;
  source: Measurable;
  pointA: Point;  // resolved target anchor — always present
  pointB: Point;  // resolved source anchor — always present
  dx?: number; dy?: number;             // signed, target − source
  distance?: number;                    // Euclidean between anchor points
  gapX?: number; gapY?: number;         // edge-to-edge separation; 0 when overlapping
  angleDeg?: number; angleRad?: number; // direction from source point to target point
  width?: number; height?: number;      // target box size
  overlaps?: boolean;                   // non-zero intersection area
  overlapArea?: number;                 // intersection area in px²
  contains?: boolean;                   // target box fully encloses source box
  visible?: boolean;                    // any part of target intersects the viewport
}
```

Only requested fields are computed (plus `pointA`/`pointB`, always). Omit `fields` to get everything.

## Pure geometry core — `@samirdamle/calipers/measure`

DOM-free functions on rects and points — unit-testable without a browser:

```ts
anchorPoint(rect: Rect, anchor?: Anchor): Point
distanceBetween(a: Point, b: Point): number
angleBetween(from: Point, to: Point): number        // radians
gapBetween(a: Rect, b: Rect): { x: number; y: number }
overlapArea(a: Rect, b: Rect): number
overlaps(a: Rect, b: Rect): boolean
containsRect(outer: Rect, inner: Rect): boolean
```

## Anchors

```ts
type AnchorCode =
  | 'tl' | 'tc' | 'tr'
  | 'cl' | 'cc' | 'cr'
  | 'bl' | 'bc' | 'br'
  | 't'  | 'b'  | 'l'  | 'r';

type Anchor =
  | AnchorCode
  | { x: number; y: number }   // fractions (0–1) of the rect
  | [number, number]           // fractions (0–1) of the rect
  | ((rect: Rect) => Point);   // absolute point
```

| code | fraction | code | fraction |
|---|---|---|---|
| `tl` | (0, 0) | `tr` | (1, 0) |
| `tc` | (0.5, 0) | `cl` | (0, 0.5) |
| `cc` | (0.5, 0.5) | `cr` | (1, 0.5) |
| `bl` | (0, 1) | `br` | (1, 1) |
| `bc` | (0.5, 1) | `t` | (0.5, 0) |
| `b` | (0.5, 1) | `l` | (0, 0.5) |
| `r` | (1, 0.5) | | |

## `place` — `@samirdamle/calipers/place`

Position `el` so its anchor lands on the target point, plus `offset`.

```ts
place(el: HTMLElement, options?: PlaceOptions): void

interface PlaceOptions {
  anchor?: Anchor;                 // which point of el to position. default 'tl'
  at?: PlaceAt | Point | Rect;     // default: viewport center
  offset?: { x?: number; y?: number };
  using?: 'transform' | 'position'; // default 'transform'
}

interface PlaceAt {
  anchor?: Anchor;                 // default 'cc'
  of?: Measurable | Point | Rect;  // default 'viewport'
}
```

- `at` as a raw `{ x, y }` point is interpreted in **viewport** coordinates (e.g. mouse `clientX/Y`).
- `using: 'transform'` sets the CSS `translate` property — compositor-friendly, composes with `transform`, accumulates across calls.
- `using: 'position'` sets `left`/`top` in the `offsetParent` frame (viewport frame for `fixed`); upgrades `static` → `absolute`; accounts for the offsetParent padding-box origin and margins. Exact for absolute/fixed positioning. Note: positions the border box — an existing `translate` still applies on top.

## `align` / `distribute` / `stack` — `@samirdamle/calipers/align`

Design-tool verbs, built on `rectOf` plus the CSS `translate` property — compositor-friendly, accumulates across calls, moves a single axis only (`stack` moves both, one axis at a time).

```ts
align(els: ArrayLike<Element>, edge: AlignEdge, options?: AlignOptions): void
distribute(els: ArrayLike<Element>, axis: 'x' | 'y', options?: DistributeOptions): void
stack(els: ArrayLike<Element>, options?: StackOptions): void

type AlignEdge = 'left' | 'right' | 'top' | 'bottom' | 'center-x' | 'center-y';

interface AlignOptions {
  to?: Measurable;  // reference to align to; omit → selection's extreme (edges) or mean (centers)
  box?: Box;        // default 'border'
}

interface DistributeOptions {
  gap?: number;     // fixed gap in px; omit → even spacing across the selection span
  box?: Box;        // default 'border'
}

type StackDirection = 't' | 'b' | 'l' | 'r';
type StackAlign = 't' | 'b' | 'l' | 'r' | 'c';

interface StackOptions {
  to?: Measurable;      // reference to stack from; omit → the selection's trailing extreme in the stacking direction
  direction?: StackDirection; // which way the stack grows; default 'b'
  gap?: number;         // px between consecutive boxes; default 0
  align?: StackAlign;    // lateral alignment vs the anchor box; default 'c' (only the perpendicular axis applies)
  box?: Box;            // default 'border'
}
```

- Without `to`, `align` matches design tools: edges snap to the selection's extreme, centers to its mean.
- `distribute` processes elements in positional order and is a no-op for fewer than two elements.
- `stack` piles elements one after another from the anchor's leading edge: `stack(targets, { to: source, direction: 't', gap: 10, align: 'c' })` stacks them upward from the source, 10px apart, center-aligned. Targets are ordered nearest-the-anchor first; the anchor itself never moves. Repeating the same call is a no-op.
- Elements that don't need to move are left untouched.

## Shared types

```ts
interface Point { x: number; y: number }
interface Rect { x: number; y: number; width: number; height: number }
type Box = 'content' | 'border' | 'margin' | 'visual' | 'bbox';
type Space = 'viewport' | 'document';
```

## Size budgets

Per-module budgets (min+br), enforced in CI by `scripts/check-size.mjs`:

| entry | budget |
|---|---|
| `rect.js` | 1024 B |
| `measure.js` | 2048 B |
| `place.js` | 1792 B |
| `align.js` | 2048 B |
| `index.js` (barrel) | 3584 B |

Current measured sizes: rect 863 B, measure 1723 B, place 1444 B, align 1890 B, index 3123 B.
