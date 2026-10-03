import { isElement, shiftTranslate } from '../internal/dom.js';
import { normalizeGap } from '../internal/gap.js';
import { rendered } from '../internal/rendered.js';
import { rectOf } from '../rect/index.js';
import type { Box, Gap, Measurable, Rect } from '../types.js';

export type AlignEdge =
	| 'left'
	| 'right'
	| 'top'
	| 'bottom'
	| 'center-x'
	| 'center-y';

export interface AlignOptions {
	/**
	 * Reference to align to. Omit to align to the selection's extreme
	 * (edges) or mean (centers), design-tool style.
	 */
	to?: Measurable;
	/** Box model for measurement. @default 'border' */
	box?: Box;
}

export type DistributeAxis = 'x' | 'y';

export interface DistributeOptions {
	/** Fixed gap in px. Omit for even spacing across the selection span. */
	gap?: number;
	/** Box model for measurement. @default 'border' */
	box?: Box;
}

/* ------------------------------------------------------------------ */
/* Axis parameterization — every geometric concept implemented once.    */
/* ------------------------------------------------------------------ */

type Axis = 'x' | 'y';

const pos = (r: Rect, ax: Axis): number => (ax === 'x' ? r.x : r.y);
const size = (r: Rect, ax: Axis): number => (ax === 'x' ? r.width : r.height);
const other = (ax: Axis): Axis => (ax === 'x' ? 'y' : 'x');

/** Resolve `to` to a rect in viewport space. */
function toRect(to: Measurable, box: Box): Rect {
	return isElement(to)
		? rendered(to, box).rect
		: rectOf(to, { box, space: 'viewport' });
}

function mean(vals: number[]): number {
	return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/* ------------------------------------------------------------------ */
/* Verbs                                                               */
/* ------------------------------------------------------------------ */

/**
 * Align elements along one edge or centerline, moving each via the CSS
 * `translate` property (accumulates across calls, composes with `transform`).
 * Measurement includes each element's existing translate, so repeating the
 * same call is a no-op instead of re-applying the delta.
 */
export function align(
	els: ArrayLike<Element>,
	edge: AlignEdge,
	options: AlignOptions = {},
): void {
	const list = Array.from(els) as HTMLElement[];
	if (list.length === 0) return;
	const box = options.box ?? 'border';
	const ax: Axis =
		edge === 'left' || edge === 'right' || edge === 'center-x' ? 'x' : 'y';

	const items = list.map((el) => ({ el, ...rendered(el, box) }));
	const ref = options.to === undefined ? null : toRect(options.to, box);
	const line =
		ref !== null
			? edgePos(edge, ref)
			: aggregate(
					edge,
					items.map((it) => edgePos(edge, it.rect)),
				);

	for (const { el, rect, translate } of items) {
		const delta = line - edgePos(edge, rect);
		shiftTranslate(
			el,
			translate,
			ax === 'x' ? delta : 0,
			ax === 'y' ? delta : 0,
		);
	}
}

function edgePos(edge: AlignEdge, r: Rect): number {
	switch (edge) {
		case 'left':
			return r.x;
		case 'right':
			return r.x + r.width;
		case 'center-x':
			return r.x + r.width / 2;
		case 'top':
			return r.y;
		case 'bottom':
			return r.y + r.height;
		case 'center-y':
			return r.y + r.height / 2;
	}
}

/** Selection line without a reference: extreme for edges, mean for centers. */
function aggregate(edge: AlignEdge, vals: number[]): number {
	if (edge === 'center-x' || edge === 'center-y') return mean(vals);
	return edge === 'left' || edge === 'top'
		? Math.min(...vals)
		: Math.max(...vals);
}

/**
 * Spread elements evenly along an axis, in positional order, moving each via
 * the CSS `translate` property. No-op for fewer than two elements.
 * Measurement includes each element's existing translate, so repeating the
 * same call is a no-op instead of re-applying the deltas.
 */
export function distribute(
	els: ArrayLike<Element>,
	axis: DistributeAxis,
	options: DistributeOptions = {},
): void {
	const list = Array.from(els) as HTMLElement[];
	if (list.length < 2) return;
	const box = options.box ?? 'border';
	const ax: Axis = axis;

	const items = list
		.map((el) => ({ el, ...rendered(el, box) }))
		.sort((a, b) => pos(a.rect, ax) - pos(b.rect, ax));

	const first = items[0].rect;
	const last = items[items.length - 1].rect;
	const span = pos(last, ax) + size(last, ax) - pos(first, ax);
	const sizes = items.reduce((sum, it) => sum + size(it.rect, ax), 0);
	const gap = options.gap ?? (span - sizes) / (items.length - 1);

	let cursor = pos(first, ax);
	for (const { el, rect, translate } of items) {
		const delta = cursor - pos(rect, ax);
		shiftTranslate(
			el,
			translate,
			ax === 'x' ? delta : 0,
			ax === 'y' ? delta : 0,
		);
		cursor += size(rect, ax) + gap;
	}
}

/** Which way a stack grows. */
export type StackDirection = 't' | 'b' | 'l' | 'r';

/**
 * Lateral alignment of stacked boxes, relative to the anchor box. Only the
 * axis perpendicular to `direction` applies; anything else centers.
 */
export type StackAlign = 't' | 'b' | 'l' | 'r' | 'c';

export interface StackOptions {
	/**
	 * Reference to stack from (the source). Omit to stack from the selection's
	 * trailing extreme in the stacking direction — that element stays put and
	 * the rest pile after it.
	 */
	to?: Measurable;
	/** Which way the stack grows. @default 'b' */
	direction?: StackDirection;
	/**
	 * Gap between consecutive boxes. A single number is the axial separation
	 * (as before); `[x, y]` / `{ x, y }` keeps the axial meaning on the
	 * stacking axis and adds a per-step lateral cascade on the other —
	 * e.g. `gap: { x: 12, y: 10 }` with `direction: 'b'` stacks boxes 10px
	 * apart, each 12px further right: a staircase. @default 0
	 */
	gap?: Gap;
	/**
	 * Lateral alignment relative to the anchor box. @default 'c'
	 */
	align?: StackAlign;
	/** Box model for measurement. @default 'border' */
	box?: Box;
}

/**
 * Stack elements one after another from a reference, moving each via the CSS
 * `translate` property (accumulates across calls, composes with `transform`).
 * Targets are ordered nearest-the-anchor first along the stacking axis, so
 * e.g. `stack(targets, { to: source, direction: 't', gap: 10, align: 'c' })`
 * piles them upward from the source with 10px between consecutive boxes,
 * center-aligned. Measurement includes each element's existing translate, so
 * repeating the same call is a no-op.
 */
export function stack(
	els: ArrayLike<Element>,
	options: StackOptions = {},
): void {
	const list = Array.from(els) as HTMLElement[];
	if (list.length === 0) return;
	const box = options.box ?? 'border';
	const direction = options.direction ?? 'b';
	const lateral = options.align ?? 'c';
	const ax: Axis = direction === 't' || direction === 'b' ? 'y' : 'x';
	const forward = direction === 'b' || direction === 'r';
	const gap = normalizeGap(options.gap);
	const gapAx = ax === 'x' ? gap.x : gap.y;
	// A scalar gap is purely axial (backward compatible); only an explicit
	// per-axis gap adds a lateral cascade.
	const gapLat =
		typeof options.gap === 'number' || options.gap === undefined
			? 0
			: ax === 'x'
				? gap.y
				: gap.x;

	const items = list.map((el) => ({ el, ...rendered(el, box) }));

	// The anchor stays put: an explicit `to`, else the trailing extreme —
	// the element closest to where the stack starts.
	let anchorEl: HTMLElement | null;
	let anchorRect: Rect;
	if (options.to !== undefined) {
		const to = options.to;
		anchorEl = isElement(to) ? (to as HTMLElement) : null;
		anchorRect = toRect(to, box);
	} else {
		anchorEl = items[0].el;
		anchorRect = items[0].rect;
		for (const it of items) {
			if (moreTrailing(it.rect, anchorRect, ax, forward)) {
				anchorEl = it.el;
				anchorRect = it.rect;
			}
		}
	}

	const targets = items
		.filter((it) => it.el !== anchorEl)
		.sort((a, b) =>
			forward
				? pos(a.rect, ax) - pos(b.rect, ax)
				: pos(b.rect, ax) +
					size(b.rect, ax) -
					(pos(a.rect, ax) + size(a.rect, ax)),
		);
	if (targets.length === 0) return;

	// The anchor's leading edge, where the first slot starts.
	let cursor = forward
		? pos(anchorRect, ax) + size(anchorRect, ax) + gapAx
		: pos(anchorRect, ax) - gapAx;
	let step = 0;
	for (const { el, rect, translate } of targets) {
		step += 1;
		const s = size(rect, ax);
		const slot = forward ? cursor : cursor - s;
		const delta = slot - pos(rect, ax);
		const lat = lateralOffset(lateral, anchorRect, rect, ax) + step * gapLat;
		shiftTranslate(
			el,
			translate,
			ax === 'x' ? delta : lat,
			ax === 'y' ? delta : lat,
		);
		cursor = forward ? slot + s + gapAx : slot - gapAx;
	}
}

/** Is `r` further toward the trailing end of the stack than `best`? */
function moreTrailing(
	r: Rect,
	best: Rect,
	ax: Axis,
	forward: boolean,
): boolean {
	const e = forward ? pos(r, ax) : pos(r, ax) + size(r, ax);
	const b = forward ? pos(best, ax) : pos(best, ax) + size(best, ax);
	return forward ? e < b : e > b;
}

/**
 * Lateral offset of `r` relative to the anchor box, along the axis
 * perpendicular to the stacking direction. Only the perpendicular axis
 * applies — anything else centers.
 */
function lateralOffset(
	lateral: StackAlign,
	anchor: Rect,
	r: Rect,
	ax: Axis,
): number {
	const p = other(ax);
	const leading: StackAlign = p === 'x' ? 'l' : 't';
	const trailing: StackAlign = p === 'x' ? 'r' : 'b';
	const a0 = pos(anchor, p);
	const a1 = a0 + size(anchor, p);
	const r0 = pos(r, p);
	const r1 = r0 + size(r, p);
	if (lateral === leading) return a0 - r0;
	if (lateral === trailing) return a1 - r1;
	return (a0 + a1) / 2 - (r0 + r1) / 2;
}
