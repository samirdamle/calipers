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

## Modules

| Import | Does | Size (min+br) |
|---|---|---|
| `@samirdamle/calipers/rect` | `rectOf` — resolve anything measurable into a rect, with an explicit box model and coordinate space | 863 B |
| `@samirdamle/calipers/measure` | `measure` / `calipers` — pairwise geometry, plus a DOM-free pure core | 1723 B |
| `@samirdamle/calipers/place` | `place` — position an element relative to a point or another element | 1444 B |
| `@samirdamle/calipers/align` | `align` / `distribute` — design-tool alignment and even spacing | 1434 B |

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

## The one rule

Every number names its **box** (`content` | `border` | `margin` | `visual` | `bbox`) and its **coordinate space** (`viewport` | `document`). No silent defaults that change meaning on scroll or under transforms.

## Docs

- [API reference](docs/API.md) — every function, field, and option
- [Playground demo](https://samirdamle.github.io/calipers/demo/) — drag boxes, watch measurements update (or `pnpm demo` locally)
- [Library plan](docs/plans/calipers-plan.md) and [goal](docs/meta/goal.md)

## License

MIT
