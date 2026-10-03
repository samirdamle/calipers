import type { RectOptions } from '../rect/index.js';
import { rectOf } from '../rect/index.js';
import type { Anchor, AnchorCode, Measurable, Point, Rect } from '../types.js';

/* ------------------------------------------------------------------ */
/* Pure geometry core — DOM-free, unit-testable without a browser.      */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* Verbs — compose rectOf with the pure core.                          */
/* ------------------------------------------------------------------ */

export type Field =
	| 'dx'
	| 'dy'
	| 'distance'
	| 'gapX'
	| 'gapY'
	| 'angleDeg'
	| 'angleRad'
	| 'width'
	| 'height'
	| 'overlaps'
	| 'overlapArea'
	| 'contains'
	| 'visible';

const ALL_FIELDS: Field[] = [
	'dx',
	'dy',
	'distance',
	'gapX',
	'gapY',
	'angleDeg',
	'angleRad',
	'width',
	'height',
	'overlaps',
	'overlapArea',
	'contains',
	'visible',
];

export interface MeasureOptions extends RectOptions {
	/** Anchor of the target. @default 'cc' */
	anchor?: Anchor;
	/** Anchor of the source. @default 'cc' */
	ofAnchor?: Anchor;
	/** Fields to compute. @default all */
	fields?: readonly Field[];
}

export interface MeasureResult {
	target: Measurable;
	source: Measurable;
	/** Resolved target anchor — always present. */
	pointA: Point;
	/** Resolved source anchor — always present. */
	pointB: Point;
	/** Signed deltas, target − source. */
	dx?: number;
	dy?: number;
	/** Euclidean distance between the anchor points. */
	distance?: number;
	/** Edge-to-edge separation per axis. */
	gapX?: number;
	gapY?: number;
	/** Direction from source point to target point. */
	angleDeg?: number;
	angleRad?: number;
	/** Target box size. */
	width?: number;
	height?: number;
	overlaps?: boolean;
	overlapArea?: number;
	/** Whether the target box fully encloses the source box. */
	contains?: boolean;
	/** Whether any part of the target box intersects the viewport. */
	visible?: boolean;
}

/** Measure one target against one source. */
export function measure(
	a: Measurable,
	b: Measurable,
	options: MeasureOptions = {},
): MeasureResult {
	const {
		anchor = 'cc',
		ofAnchor = 'cc',
		fields = ALL_FIELDS,
		box,
		space,
	} = options;
	const rectOptions = { box, space };
	const ra = rectOf(a, rectOptions);
	const rb = rectOf(b, rectOptions);
	const pointA = anchorPoint(ra, anchor);
	const pointB = anchorPoint(rb, ofAnchor);

	const result: MeasureResult = { target: a, source: b, pointA, pointB };
	const want = new Set(fields);

	if (
		want.has('dx') ||
		want.has('dy') ||
		want.has('distance') ||
		want.has('angleDeg') ||
		want.has('angleRad')
	) {
		const dx = pointA.x - pointB.x;
		const dy = pointA.y - pointB.y;
		if (want.has('dx')) result.dx = dx;
		if (want.has('dy')) result.dy = dy;
		if (want.has('distance')) result.distance = Math.hypot(dx, dy);
		if (want.has('angleDeg') || want.has('angleRad')) {
			const rad = Math.atan2(dy, dx);
			if (want.has('angleRad')) result.angleRad = rad;
			if (want.has('angleDeg')) result.angleDeg = (rad * 180) / Math.PI;
		}
	}
	if (want.has('gapX') || want.has('gapY')) {
		const gap = gapBetween(ra, rb);
		if (want.has('gapX')) result.gapX = gap.x;
		if (want.has('gapY')) result.gapY = gap.y;
	}
	if (want.has('width')) result.width = ra.width;
	if (want.has('height')) result.height = ra.height;
	if (want.has('overlaps') || want.has('overlapArea')) {
		const area = overlapArea(ra, rb);
		if (want.has('overlapArea')) result.overlapArea = area;
		if (want.has('overlaps')) result.overlaps = area > 0;
	}
	if (want.has('contains')) result.contains = containsRect(ra, rb);
	if (want.has('visible'))
		result.visible = overlapArea(ra, viewportRect(space ?? 'viewport')) > 0;
	return result;
}

/**
 * Measure many targets against one source.
 * A selector string expands to *all* matches; array-likes expand per entry.
 */
export function calipers(
	targets: Measurable,
	source: Measurable,
	options: MeasureOptions = {},
): MeasureResult[] {
	return expandTargets(targets).map((t) => measure(t, source, options));
}

function expandTargets(targets: Measurable): Measurable[] {
	if (typeof targets === 'string')
		return Array.from(document.querySelectorAll(targets));
	if (targets === window || targets === 'viewport') return [targets];
	if (isList(targets)) {
		const out: Measurable[] = [];
		for (const e of Array.from(targets as ArrayLike<Element | string | Rect>)) {
			if (typeof e === 'string')
				out.push(...Array.from(document.querySelectorAll(e)));
			else out.push(e);
		}
		return out;
	}
	return [targets];
}

function isList(v: unknown): boolean {
	return (
		typeof v === 'object' &&
		v !== null &&
		typeof (v as { length?: unknown }).length === 'number' &&
		!(v instanceof Element)
	);
}

function viewportRect(space: 'viewport' | 'document'): Rect {
	const { innerWidth: width, innerHeight: height } = window;
	return space === 'document'
		? { x: window.scrollX, y: window.scrollY, width, height }
		: { x: 0, y: 0, width, height };
}
