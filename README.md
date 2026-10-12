# calipers

A tiny, dependency-free JavaScript geometry toolkit for the web — measure, align, place, and design with HTML and SVG elements.

```js
import { measure, place } from '@samirdamle/calipers';

// How far is the card from the hero?
measure('.card', '.hero', { anchor: 'tl', ofAnchor: 'bl', fields: ['dy', 'gapY'] });
// → { pointA: {…}, pointB: {…}, dy: -24, gapY: 24 }

// Park the tooltip's top-center 8px below the button's bottom-center.
place('.tooltip', {
  anchor: 'tc',
  at: { anchor: 'bc', of: '.button' },
  offset: { y: 8 },
});
```

New here? [Which verb when](#which-verb-when) picks the right one in ten seconds —
[Recipes](#recipes) has 40+ copy-paste examples.

## Install

```sh
npm i @samirdamle/calipers
# pnpm add @samirdamle/calipers
```

Import only what you use — every module is a separate, tree-shakeable entry point:

```js
import { rectOf } from '@samirdamle/calipers/rect';
import { measure, calipers, anchorPoint } from '@samirdamle/calipers/measure';
import { place } from '@samirdamle/calipers/place';
```

## Which verb when

| I want to… | Reach for | One-liner |
|---|---|---|
| turn anything into a rect | `rectOf` | selector, element, point, or cached rect → `{ x, y, width, height }`, with an explicit box and coordinate space |
| know how far apart two things are | `measure` | pairwise distance, gaps, angles, overlap, containment |
| measure one thing against many | `calipers` | N targets vs one source — nearest-to-cursor, audits, rankings |
| put this element next to that one | `place` | anchor-to-anchor positioning with direction-aware gap |
| line things up like a design tool | `align` | edges/centers snap to the selection's extreme, mean, or a key object |
| space things evenly | `distribute` | even spacing across a span, or fixed gaps, along one axis |
| pile things in a row from a source | `stack` | directional sequences with gap and lateral alignment |
| do geometry with no DOM (tests, SSR, canvas) | pure core | `anchorPoint`, `gapBetween`, `overlapArea`, `overlaps`, `containsRect`, `distanceBetween`, `angleBetween` |
| declarative tethering that follows on scroll/resize | CSS Anchor Positioning | the browser owns it — Calipers answers the programmatic questions CSS can't |

## Modules

| Import | Does | Size (min+br) |
|---|---|---|
| `@samirdamle/calipers/rect` | `rectOf` — resolve anything measurable into a rect, with an explicit box model and coordinate space | 863 B |
| `@samirdamle/calipers/measure` | `measure` / `calipers` — pairwise geometry, plus a DOM-free pure core | 1723 B |
| `@samirdamle/calipers/place` | `place` — position an element relative to a point or another element | 1444 B |
| `@samirdamle/calipers/align` | `align` / `distribute` / `stack` — design-tool alignment, even spacing, and stacking | 1890 B |

Sizes are measured from the actual build (see `size-budgets.json`); a stale figure is a bug.

`fit` and the dev-only `debug` overlay are on the roadmap (plan §9–§10).

## Anchors

Every anchor resolves to exactly one point. The 13 codes are sugar over fractional points — `{ x: 0.25, y: 0 }` and `(rect) => point` work too.

```
tl ─── tc ─── tr
│             │
cl ─── cc ─── cr
│             │
bl ─── bc ─── br
```

`t`/`b`/`l`/`r` are the edge midpoints (`tc`/`bc`/`cl`/`cr`).

## Recipes

Jump to: [`rectOf`](#recipes-rectof) · [`measure`](#recipes-measure) · [`calipers`](#recipes-calipers) · [`place`](#recipes-place) · [`align`](#recipes-align) · [`distribute`](#recipes-distribute) · [`stack`](#recipes-stack) · [pure core](#recipes-core)

<a id="recipes-rectof"></a>
<details>
<summary><strong><code>rectOf</code></strong> — turn anything into a rect</summary>

**Scroll-aware math.** The viewport rect in *document* coordinates — stable across scroll, no manual `scrollX`/`scrollY` bookkeeping.
```js
import { rectOf } from '@samirdamle/calipers/rect';

const view = rectOf('viewport', { space: 'document' });
```

**Text layout.** Measure the content box, not the border box, when text has to fit.
```js
const textBox = rectOf('.prose', { box: 'content' });
```

**Collision spacing.** Footprints that include margins, so "8px apart" means visually 8px apart.
```js
const footprint = rectOf('.card', { box: 'margin' });
```

**SVG drawing math.** Measure in local user units, ignoring transforms — what your path code actually works in.
```js
const shape = rectOf('#node', { box: 'bbox' });
```

**Transformed elements.** After CSS transforms or animations, get what the user actually sees on screen.
```js
const onScreen = rectOf('.animated', { box: 'visual' });
```

**Resolve anything.** Selector lists take the first match, a point becomes a zero-size rect, and a cached rect passes through as a safe-to-mutate copy.
```js
rectOf(['.card', fallbackEl]); // first match wins
rectOf({ x: 120, y: 80 });     // a point is a zero-size rect
rectOf(cachedRect);            // passthrough copy
```
</details>

<a id="recipes-measure"></a>
<details>
<summary><strong><code>measure</code></strong> — pairwise geometry: distances, gaps, angles, overlap</summary>

**Design-token audit.** Are these two cards honoring the 16px spacing token? `gapX`/`gapY` are edge-to-edge — 0 when overlapping.
```js
import { measure } from '@samirdamle/calipers/measure';

const { gapX, gapY } = measure('.card-a', '.card-b', { fields: ['gapX', 'gapY'] });
const ok = gapX >= 16 && gapY >= 16;
```

**Tooltip flip.** Enough room below the button? If the tooltip would overlap it, flip above instead.
```js
const { dy, overlaps } = measure('.tooltip', '.button', {
  anchor: 'tc', ofAnchor: 'bc', fields: ['dy', 'overlaps'],
});
const flip = overlaps || dy < 8;
```

**Flowchart connectors.** Length and direction for an SVG line between two nodes (`angleDeg`: 0° = east, clockwise).
```js
const { distance, pointA, pointB } = measure('#node-a', '#node-b', {
  fields: ['distance'],
});
line.setAttribute('x1', pointA.x);
line.setAttribute('y1', pointA.y);
line.setAttribute('x2', pointB.x);
line.setAttribute('y2', pointB.y);
line.style.strokeDasharray = `${distance}`; // one dash = the full length
```

**Lazy rendering.** Only mount the heavy chart when its card scrolls into view.
```js
const { visible } = measure('.card', 'viewport', { fields: ['visible'] });
if (visible) mountChart();
```

**Drop-zone arming.** Is the dragged chip *fully* inside the drop zone? Measure in `visual` space so the in-flight transform counts.
```js
const { contains } = measure('.chip', '.dropzone', {
  box: 'visual', fields: ['contains'],
});
dropzone.classList.toggle('armed', contains);
```

**Snap-back animation.** Spring the dragged card home: `dx`/`dy` are signed, target − source.
```js
const { dx, dy } = measure('.card', '.slot', { fields: ['dx', 'dy'] });
animateBack(-dx, -dy);
```
</details>

<a id="recipes-calipers"></a>
<details>
<summary><strong><code>calipers</code></strong> — one source measured against many targets</summary>

**Nearest-to-cursor.** A selector expands to *all* matches — pick the closest node to the pointer.
```js
import { calipers } from '@samirdamle/calipers/measure';

const hits = calipers('.node', { x: e.clientX, y: e.clientY }, { fields: ['distance'] });
const nearest = hits.sort((a, b) => a.distance - b.distance)[0];
```

**Spacing-token sweep.** Find every card violating the 8px minimum gap to the hero.
```js
const violators = calipers('.card', '.hero', { fields: ['gapY'] })
  .filter(r => r.gapY < 8)
  .map(r => r.target);
```

**Radial menu.** Angle + distance of each item from the trigger, for fanning items around it.
```js
const items = calipers('.menu-item', '.trigger', { fields: ['angleDeg', 'distance'] });
// angleDeg: 0° = east, clockwise — place each item on the arc
```

**Sticky-header collisions.** Which cards is the sticky header covering right now?
```js
const covered = calipers('.card', '.sticky-header', { fields: ['overlaps'] })
  .filter(r => r.overlaps)
  .map(r => r.target);
```

**Viewport audit.** Which feed cards are on screen? Drive virtualization or impression tracking.
```js
const onScreen = calipers('.feed-card', 'viewport', { fields: ['visible'] })
  .filter(r => r.visible)
  .map(r => r.target);
```
</details>

<a id="recipes-place"></a>
<details>
<summary><strong><code>place</code></strong> — position an element relative to a point or another element</summary>

**Tooltip below a button.** The classic: tooltip's top-center, 8px below the button's bottom-center. The `gap` pushes away from the target along the anchor→center ray — direction-aware, unlike a raw offset.
```js
import { place } from '@samirdamle/calipers/place';

place(document.querySelector('.tooltip'), {
  anchor: 'tc',
  at: { anchor: 'bc', of: '.button' },
  gap: 8,
});
```

**Context menu at the cursor.** A raw `{ x, y }` point is read in viewport coordinates — `clientX`/`clientY` drop straight in.
```js
place(menuEl, { at: { x: e.clientX, y: e.clientY } });
```

**Centered dialog.** The default `at` is the viewport center — centering is a one-liner.
```js
place(dialogEl, { anchor: 'cc' });
```

**Corner toast.** Pin 16px inside the viewport's bottom-right with a signed offset.
```js
place(toastEl, {
  anchor: 'br',
  at: { anchor: 'br', of: 'viewport' },
  offset: { x: -16, y: -16 },
});
```

**Transform off-limits.** When a parent reads `offsetTop` or transitions fight the compositor, position with `left`/`top` instead of `translate`.
```js
place(badgeEl, {
  anchor: 'tr',
  at: { anchor: 'tr', of: '.avatar' },
  using: 'position',
});
```

**Avatar stack overlap.** Negative gap pulls the box *toward* the target — each avatar overlaps the previous by 12px.
```js
place(avatar2, {
  anchor: 'cl',
  at: { anchor: 'cr', of: '.avatar-1' },
  gap: -12,
});
```

**Viewport-aware flip.** Measure the room below the button, then flip the tooltip above it when space runs out — no more clipped tooltips.
```js
import { measure } from '@samirdamle/calipers/measure';

const room = measure('.button', 'viewport', { ofAnchor: 'b', fields: ['gapY'] }).gapY;
const below = room > 160;
place(tooltipEl, {
  anchor: below ? 'tc' : 'bc',
  at: { anchor: below ? 'bc' : 'tc', of: '.button' },
  gap: 8,
});
```
</details>

<a id="recipes-align"></a>
<details>
<summary><strong><code>align</code></strong> — design-tool alignment for the DOM</summary>

**Left-align a selection.** No `to` — edges snap to the selection's extreme, like Figma.
```js
import { align } from '@samirdamle/calipers/align';

align(document.querySelectorAll('.card.selected'), 'left');
```

**Center a toolbar.** Centers align to the selection's *mean*, not an extreme.
```js
align(document.querySelectorAll('.toolbar > button'), 'center-x');
```

**Right-align form labels.** One call lines up every label's right edge.
```js
align(document.querySelectorAll('.field label'), 'right');
```

**Align to a key object.** Ignore the selection's own geometry — align everything to the artboard.
```js
align(document.querySelectorAll('.shape'), 'top', { to: '.artboard' });
```

**Vertical rhythm.** Snap every card's top edge to the hero's.
```js
align(document.querySelectorAll('.card'), 'top', { to: '.hero' });
```

**Optical alignment.** Include margins so *text* lines up, not just boxes.
```js
align(document.querySelectorAll('.row'), 'left', { box: 'margin' });
```
</details>

<a id="recipes-distribute"></a>
<details>
<summary><strong><code>distribute</code></strong> — even spacing along one axis</summary>

**Even nav.** Spread links across the header's full span. Elements are processed in positional order.
```js
import { distribute } from '@samirdamle/calipers/align';

distribute(document.querySelectorAll('.nav a'), 'x');
```

**Fixed chip gaps.** 12px between filter chips, regardless of the row's width.
```js
distribute(document.querySelectorAll('.chip'), 'x', { gap: 12 });
```

**Timeline ticks.** Even vertical rhythm for a timeline rail.
```js
distribute(document.querySelectorAll('.tick'), 'y');
```

**Toolbar icons.** Fixed 8px rhythm down an icon strip.
```js
distribute(document.querySelectorAll('.toolbar-icon'), 'x', { gap: 8 });
```

**Margin-aware spacing.** Gaps measured edge-to-edge *including* margins.
```js
distribute(document.querySelectorAll('.badge'), 'x', { gap: 4, box: 'margin' });
```
</details>

<a id="recipes-stack"></a>
<details>
<summary><strong><code>stack</code></strong> — directional sequences piled from a source</summary>

**Dropdown menu.** Items pile downward from the trigger, 4px apart. The trigger never moves; items order nearest-first.
```js
import { stack } from '@samirdamle/calipers/align';

stack(document.querySelectorAll('.menu-item'), {
  to: '.menu-trigger', direction: 'b', gap: 4,
});
```

**Toast stack.** Notifications grow upward from the tray, center-aligned.
```js
stack(document.querySelectorAll('.toast'), {
  to: '.tray', direction: 't', gap: 8, align: 'c',
});
```

**Org-chart cascade.** A two-dimensional gap indents each level 12px while dropping 24px.
```js
stack(document.querySelectorAll('.level'), {
  direction: 'b', gap: { x: 12, y: 24 }, align: 'l',
});
```

**Breadcrumbs.** A horizontal trail growing right from the home crumb.
```js
stack(document.querySelectorAll('.crumb'), {
  to: '.home-crumb', direction: 'r', gap: 6, align: 'c',
});
```

**Accordion panels.** Zero-config vertical pile — defaults are `direction: 'b'`, `gap: 0`, `align: 'c'`.
```js
stack(document.querySelectorAll('.panel'), { direction: 'b', gap: 2 });
```

**Tag list.** Anchor to a source element and let the tags fall in line beneath it.
```js
stack(document.querySelectorAll('.tag'), { to: '.tag-anchor', direction: 'b' });
```
</details>

<a id="recipes-core"></a>
<details>
<summary><strong>Pure geometry core</strong> — DOM-free functions for tests, SSR, and canvas</summary>

These live in `@samirdamle/calipers/measure` but take plain rects and points — no browser, no DOM. Import them in Node, in unit tests, or in a `<canvas>` game loop.

**Unit-test anchor math.** Verify geometry without spinning up a browser.
```js
import { anchorPoint } from '@samirdamle/calipers/measure';

anchorPoint({ x: 10, y: 20, width: 100, height: 50 }, 'br');
// → { x: 110, y: 70 }
```

**Game-loop collision.** Edge-to-edge separation at 60fps, zero DOM reads. `0` on an axis means touching or overlapping there.
```js
import { gapBetween } from '@samirdamle/calipers/measure';

const { x, y } = gapBetween(player, wall);
if (x === 0 && y === 0) onCollide();
```

**Drop-target weighting.** Rank candidates by how much of the dragged rect they cover.
```js
import { overlapArea } from '@samirdamle/calipers/measure';

const best = targets
  .map(t => [t, overlapArea(dragRect, t)])
  .sort((a, b) => b[1] - a[1])[0][0];
```

**Marquee selection.** Which shapes sit fully inside the drag rectangle?
```js
import { containsRect } from '@samirdamle/calipers/measure';

const picked = shapes.filter(s => containsRect(marquee, s));
```

**Server-rendered connectors.** Length and direction for an SVG line, computed in Node.
```js
import { distanceBetween, angleBetween } from '@samirdamle/calipers/measure';

const len = distanceBetween(p1, p2);
const rad = angleBetween(p1, p2); // radians, 0 = east, clockwise
```

**Broad-phase collision.** Cheap boolean before the expensive narrow phase.
```js
import { overlaps } from '@samirdamle/calipers/measure';

if (overlaps(a, b)) narrowPhase(a, b);
```
</details>

## The one rule

Every number names its **box** (`content` | `border` | `margin` | `visual` | `bbox`) and its **coordinate space** (`viewport` | `document`). No silent defaults that change meaning on scroll or under transforms.

## Docs

- [API reference](docs/API.md) — every function, field, and option
- [Playground demo](https://samirdamle.github.io/calipers/demo/) — drag boxes, watch measurements update (or `pnpm demo` locally)
- [Library plan](docs/plans/calipers-plan.md) and [goal](docs/meta/goal.md)

## License

MIT
