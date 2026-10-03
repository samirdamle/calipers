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

/** Anything the library can measure or place relative to. */
export type Measurable =
	| string
	| Element
	| ArrayLike<Element | string>
	| Window
	| 'viewport'
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
