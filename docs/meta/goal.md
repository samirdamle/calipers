# Calipers — Goal

**Calipers is a tiny, dependency-free JavaScript library that lets anyone
measure, align, place, and design with elements on a web page — HTML and SVG
alike.**

## The problem

Every tooltip, popover, drag preview, annotation layer, onboarding tour,
data-visualization overlay, and design-tool canvas re-implements the same
primitives: *how big is this element, where is it, how far is it from that
one, and put this thing exactly there.* Each re-implementation is a little
wrong — it forgets scroll offsets, or CSS transforms, or SVG user units, or
the `offsetParent` frame — and each one costs bytes everyone downloads.

## Who it's for

Anyone building for the web who needs geometry answers: app developers
placing floating UI, data-viz authors annotating SVG charts, design-tool
builders aligning and distributing elements, and tinkerers laying out pages
by hand. If you've ever written `getBoundingClientRect()` math by hand,
Calipers is for you. No framework required; no framework excluded.

## What it does

- **Measure** — sizes, distances, gaps, angles, overlaps, and containment
  between elements, between elements and the window, in an explicitly named
  coordinate space.
- **Place** — position any element relative to any point or any other
  element's anchor, with offsets, in the correct containing frame.
- **Align & distribute** — design-tool verbs (`align`, `distribute`) over
  sets of elements.
- **Fit** — keep floating elements inside a container or the viewport
  (`shift` / `flip`).
- **SVG as a first citizen** — bounding boxes, transforms, and
  screen↔user-unit conversion, so HTML and SVG compose.

## What it is not

- Not a rendering or drawing engine — it returns geometry; you draw.
- Not a UI component library, drag-and-drop kit, or animation library.
- Not a framework plugin — it stays framework-agnostic by design.
- Not a replacement for declarative CSS (e.g. CSS Anchor Positioning
  where it applies) — it is the *programmatic complement* for the geometry
  questions CSS cannot answer.

## Principles

1. **Lightweight is the feature.** Independently importable modules, zero
   dependencies, per-module size budgets enforced in CI. Versatility must
   never cost bytes the caller didn't ask for.
2. **Composable, not monolithic.** A pure geometry core, thin DOM adapters,
   and small verbs that compose — so `align` is `measure` + `place`, not a
   second geometry engine.
3. **Honest measurements.** Every number names its box model and its
   coordinate space. No silent defaults that change meaning on scroll or
   under transforms.
4. **Typed, tested, demoed.** TypeScript with shipped types, a DOM-free
   unit-tested core, and a live playground — the library is not done until
   all three exist.

## Success looks like

A developer installs one tiny package, imports only `measure` (or only
`place`), and deletes a hand-rolled rect-math utility that was subtly wrong —
then keeps Calipers because the next geometry problem is already solved too.
