import type { Anchor, AnchorCode, Point, Rect } from '../types.js';

/**
 * Pure DOM-free geometry core. No DOM globals, no layout reads —
 * unit-testable without a browser. The verbs (`measure`, `place`, `align`)
 * compose these with the DOM adapters in `rect`.
 */

const ANCHOR_FRACTIONS: Record<AnchorCode, [number, number]> = {
	tl: [0, 0],
	tc: [0.5, 0],
	tr: [1, 0],
	cl: [0, 0.5],
	cc: [0.5, 0.5],
	cr: [1, 0.5],
	bl: [0, 1],
	bc: [0.5, 1],
	br: [1, 1],
	t: [0.5, 0],
	b: [0.5, 1],
	l: [0, 0.5],
	r: [1, 0.5],
};

/** Resolve an anchor to a single point of a rect. Function anchors receive the rect and return an absolute point. */
export function anchorPoint(rect: Rect, anchor: Anchor = 'cc'): Point {
	if (typeof anchor === 'function') return anchor(rect);
	const [fx, fy] =
		typeof anchor === 'string'
			? ANCHOR_FRACTIONS[anchor]
			: 'x' in anchor
				? [anchor.x, anchor.y]
				: anchor;
	return { x: rect.x + fx * rect.width, y: rect.y + fy * rect.height };
}

/** Euclidean distance between two points. */
export function distanceBetween(a: Point, b: Point): number {
	return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Direction from `from` to `to`, in radians.
 * 0 = east, positive clockwise (screen coordinates, y down), range (−π, π].
 */
export function angleBetween(from: Point, to: Point): number {
	return Math.atan2(to.y - from.y, to.x - from.x);
}

/** Edge-to-edge separation per axis; 0 on an axis when the projections overlap. */
export function gapBetween(a: Rect, b: Rect): { x: number; y: number } {
	return {
		x: Math.max(0, Math.max(b.x - (a.x + a.width), a.x - (b.x + b.width))),
		y: Math.max(0, Math.max(b.y - (a.y + a.height), a.y - (b.y + b.height))),
	};
}

/** Intersection area of two rects in px²; 0 when disjoint. */
export function overlapArea(a: Rect, b: Rect): number {
	const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
	const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
	return Math.max(0, w) * Math.max(0, h);
}

/** Whether two rects intersect with non-zero area. */
export function overlaps(a: Rect, b: Rect): boolean {
	return overlapArea(a, b) > 0;
}

/** Whether `outer` fully encloses `inner`. */
export function containsRect(outer: Rect, inner: Rect): boolean {
	return (
		outer.x <= inner.x &&
		outer.y <= inner.y &&
		outer.x + outer.width >= inner.x + inner.width &&
		outer.y + outer.height >= inner.y + inner.height
	);
}
