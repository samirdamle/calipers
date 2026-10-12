/**
 * Shared core types for calipers.
 * See docs/plans/calipers-plan.md §4–§6.
 */

/**
 * A 2D point. In `Anchor` position the coordinates are fractions (0–1) of the
 * rect; everywhere else they are absolute coordinates in the active space.
 */
export interface Point {
	x: number;
	y: number;
}

/** A normalized rectangle in a named coordinate space. */
export interface Rect {
	x: number;
	y: number;
	width: number;
	height: number;
}

/**
 * Which box of an element is measured.
 * - `visual` includes CSS transforms (what the user actually sees).
 * - `bbox` is for SVG elements: `getBBox()` in local user units, untransformed.
 */
export type Box = 'content' | 'border' | 'margin' | 'visual' | 'bbox';

/** The coordinate space the numbers live in. */
export type Space = 'viewport' | 'document';

/**
 * A computed displacement in px: how far something would move along each axis.
 * Signed, in the screen's coordinate orientation — `{ dx: 10, dy: -5 }` means
 * 10px right and 5px up. The `dryRun` mode of the manipulation verbs returns these.
 */
export interface Displacement {
	dx: number;
	dy: number;
}

/**
 * A displacement tied to the element it was computed for — the per-element
 * result shape returned by the manipulation verbs in `dryRun` mode.
 */
export interface ElementDisplacement extends Displacement {
	el: Element;
}

/**
 * A per-axis gap in px. A single number applies to both axes;
 * `[x, y]` / `{ x, y }` set each axis separately. Negative values overlap.
 */
export type Gap = number | readonly [number, number] | { x: number; y: number };

/** Anything the library can measure or place relative to. A `Point` resolves to a zero-size rect at that point. */
export type Measurable =
	| string
	| Element
	| ArrayLike<Element | string | Rect>
	| Window
	| 'viewport'
	| Point
	| Rect;

/**
 * The 13 classic anchor codes — sugar over fractional points
 * (e.g. `tl` ≡ `{ x: 0, y: 0 }`, `cc` ≡ `{ x: 0.5, y: 0.5 }`).
 */
export type AnchorCode =
	| 'tl'
	| 'tc'
	| 'tr'
	| 'cl'
	| 'cc'
	| 'cr'
	| 'bl'
	| 'bc'
	| 'br'
	| 't'
	| 'b'
	| 'l'
	| 'r';

/**
 * An anchor resolves to exactly one point of a rect.
 * `{ x, y }` / `[x, y]` are fractions (0–1) of the rect's width/height.
 */
export type Anchor =
	| AnchorCode
	| { x: number; y: number }
	| [number, number]
	| ((rect: Rect) => Point);
