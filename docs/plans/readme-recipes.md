# README Recipes Plan

**Status:** approved 2026-10-12 — implementing.
**Goal:** make the calipers README (GitHub + npm, same file) sell the library: practical
use-case examples with copy-paste code snippets for every exported method, 5+ per method.

## Decisions (approved)

- Everything lives in `README.md` itself — npm and GitHub render the same file, so no
  sync problem and long READMEs render fine on both.
- Each method gets a collapsible `<details>` block with an anchor-linked table of
  contents at the top of the section — scannable on first view, full depth one click away.
- Snippets are plain JS (copy-paste friendly), no TS annotations, real DOM.
- Where the box/space choice matters, snippets name it explicitly (the library's "one rule").
- Includes the pure geometry core as its own section (works in Node, no DOM — a selling point).

## Proposed README structure

1. **Hero + install + modules table** — unchanged, except a one-line "Recipes" pointer
   after the hero snippet.
2. **"Which verb when" chooser** (new, ~10 lines) — a table mapping *I want to…* → verb →
   one-liner. E.g. "know how far apart two things are" → `measure`; "put this next to
   that" → `place`; "line these up like Figma" → `align`. Plus one row on CSS Anchor
   Positioning vs Calipers ("CSS owns declarative tethering; Calipers owns the
   programmatic answers").
3. **Recipes** — one `<details>` per method, 5+ use-case examples each. Every recipe =
   headline naming the practical problem + copy-paste JS snippet (5–15 lines) + one-line
   payoff.
4. **Anchors, The one rule, Docs** — unchanged.

## Example sets (8 sections)

### `rectOf` (6)

1. Viewport rect in document space for scroll-aware math: `rectOf('viewport', { space: 'document' })`.
2. Content box for text layout: `rectOf(el, { box: 'content' })`.
3. Margin box for collision spacing: `rectOf(el, { box: 'margin' })`.
4. SVG `bbox` in local (untransformed) user units for drawing math.
5. `visual` box — on-screen footprint of a transformed/animated element.
6. "Resolve anything": selector list → first match, point → zero-size rect, cached rect passthrough.

### `measure` (6)

1. Card gap audit — `measure(a, b, { fields: ['gapX', 'gapY'] })`, responsive spacing check.
2. Tooltip flip decision — distance + `overlaps` to choose above/below.
3. SVG connector line between two nodes — `distance` + `angleDeg`.
4. Lazy-render visibility check — `visible`, `overlapArea`.
5. Drop-zone containment — `contains` for "fully inside?".
6. Signed `dx`/`dy` for snap-back / parallax math.

### `calipers` (5)

1. Nearest-to-cursor from `querySelectorAll('.node')` — N targets vs one source.
2. Multi-card spacing-token audit — find which cards violate the 16px token.
3. Radial-menu layout — distance + angle of each item from center.
4. Closest-first sort of results.
5. List-wide viewport visibility audit.

### `place` (7)

1. Tooltip below button — `anchor: 'tc', at: { anchor: 'bc', of: btn }, gap: 8`.
2. Popover at mouse — `place(menu, { at: { x: e.clientX, y: e.clientY } })`.
3. Centered dialog — default `at` (viewport center).
4. Corner toast — `at: { anchor: 'br', of: 'viewport' }, offset: { x: -16, y: -16 }`.
5. Fixed badge via `using: 'position'` (transform off-limits layouts).
6. Negative gap for intentional overlap effects.
7. The classic: flip/clamp near viewport edges using `place` + `measure`.

### `align` (6)

1. Left-align a selection — no `to`, Figma-style extreme behavior.
2. Center children on X — mean behavior.
3. Right-align form labels.
4. Align to a key object — `to: '.artboard'`.
5. Top-align cards to the hero.
6. Margin-box optical alignment.

### `distribute` (5)

1. Even nav spacing across a header (span mode).
2. Fixed 12px chip row — `gap: 12`.
3. Vertical timeline ticks, evenly spaced.
4. Toolbar icon row with fixed gap.
5. Margin-box distribution.

### `stack` (6)

1. Dropdown items stacked downward from trigger — `stack(items, { to: trigger, direction: 'b', gap: 4 })`.
2. Toast stack growing upward, center-aligned.
3. Staggered cascade via `gap: { x: 12, y: 24 }`.
4. Horizontal breadcrumbs from a source.
5. Accordion panels.
6. Tag list.

### Pure geometry core (6)

1. `anchorPoint(rect, 'br')` in unit tests — no browser needed.
2. `gapBetween` in a canvas game loop (collision detection).
3. `overlapArea` for drag-and-drop hit weighting.
4. `containsRect` for marquee selection.
5. `distanceBetween` / `angleBetween` for SVG connectors.
6. Frame as "works in Node, no DOM" — SSR and test friendly.

## Quality and verification

- **Snippet bar:** every example must actually run.
- `scripts/check-recipes.mjs` — extracts ` ```js ` fences from `README.md` and
  syntax-validates them with `node --check` (parse-only, no DOM execution). Wired into
  CI so examples can't rot as the API evolves.
- Docs changes don't touch the bundle — size budgets unaffected.

## Workflow

- GitHub issue(s) → branch → code → PR to `develop`, user merges.
- Split: (1) chooser + recipes content; (2) `check-recipes.mjs` + CI wiring.
