import {
	anchorPoint,
	angleBetween,
	containsRect,
	distanceBetween,
	gapBetween,
	overlapArea,
	overlaps,
} from '../geom/index.js';
import type { RectOptions } from '../rect/index.js';
import { rectOf } from '../rect/index.js';
import type { Anchor, Measurable, Point, Rect } from '../types.js';

/* Pure geometry core lives in `../geom/index.js` (DOM-free). Re-exported here
 * so the public import surface of this entry is unchanged. */
export {
	anchorPoint,
	angleBetween,
	containsRect,
	distanceBetween,
	gapBetween,
	overlapArea,
	overlaps,
};

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
		result.visible =
			overlapArea(ra, rectOf('viewport', { space: space ?? 'viewport' })) > 0;
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
