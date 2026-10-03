import { rectOf } from '../rect/index.js';
import type { Box, Measurable, Rect } from '../types.js';

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
	const rects = list.map((el) => renderedRect(el, box));
	const ref =
		options.to === undefined
			? null
			: options.to instanceof Element
				? renderedRect(options.to, box)
				: rectOf(options.to, { box, space: 'viewport' });

	const horizontal = edge === 'left' || edge === 'right' || edge === 'center-x';
	const line = horizontal ? xLine(edge, rects, ref) : yLine(edge, rects, ref);

	list.forEach((el, i) => {
		const r = rects[i];
		const current = horizontal
			? edgePos(edge, r, true)
			: edgePos(edge, r, false);
		const delta = line - current;
		if (delta === 0) return;
		const prev = parseTranslate(getComputedStyle(el).translate);
		const x = horizontal ? prev.x + delta : prev.x;
		const y = horizontal ? prev.y : prev.y + delta;
		el.style.setProperty('translate', `${x}px ${y}px`);
	});
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
	const horizontal = axis === 'x';

	const items = list
		.map((el) => ({ el, rect: renderedRect(el, box) }))
		.sort((a, b) => (horizontal ? a.rect.x - b.rect.x : a.rect.y - b.rect.y));

	const start = (r: Rect) => (horizontal ? r.x : r.y);
	const size = (r: Rect) => (horizontal ? r.width : r.height);
	const span =
		start(items[items.length - 1].rect) +
		size(items[items.length - 1].rect) -
		start(items[0].rect);
	const sizes = items.reduce((sum, it) => sum + size(it.rect), 0);
	const gap = options.gap ?? (span - sizes) / (items.length - 1);

	let cursor = start(items[0].rect);
	for (const { el, rect } of items) {
		const delta = cursor - start(rect);
		if (delta !== 0) {
			const prev = parseTranslate(getComputedStyle(el).translate);
			const x = horizontal ? prev.x + delta : prev.x;
			const y = horizontal ? prev.y : prev.y + delta;
			el.style.setProperty('translate', `${x}px ${y}px`);
		}
		cursor += size(rect) + gap;
	}
}

function edgePos(edge: AlignEdge, r: Rect, horizontal: boolean): number {
	if (horizontal) {
		return edge === 'left'
			? r.x
			: edge === 'right'
				? r.x + r.width
				: r.x + r.width / 2;
	}
	return edge === 'top'
		? r.y
		: edge === 'bottom'
			? r.y + r.height
			: r.y + r.height / 2;
}

function xLine(edge: AlignEdge, rects: Rect[], ref: Rect | null): number {
	if (ref) return edgePos(edge, ref, true);
	const vals = rects.map((r) => edgePos(edge, r, true));
	return edge === 'center-x'
		? mean(vals)
		: edge === 'left'
			? Math.min(...vals)
			: Math.max(...vals);
}

function yLine(edge: AlignEdge, rects: Rect[], ref: Rect | null): number {
	if (ref) return edgePos(edge, ref, false);
	const vals = rects.map((r) => edgePos(edge, r, false));
	return edge === 'center-y'
		? mean(vals)
		: edge === 'top'
			? Math.min(...vals)
			: Math.max(...vals);
}

function mean(vals: number[]): number {
	return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/**
 * The rect as currently rendered: the chosen box plus the element's own CSS
 * `translate` (set by place/align/distribute in transform mode). The offset
 * chain behind `rectOf` doesn't include `translate`, so measuring without it
 * would compute the delta from the stale layout position and re-apply it on
 * every call. `visual` already includes it — never double-count.
 */
function renderedRect(el: Element, box: Box): Rect {
	const r = rectOf(el, { box, space: 'viewport' });
	if (box === 'visual') return r;
	const t = parseTranslate(getComputedStyle(el).translate);
	return t.x === 0 && t.y === 0 ? r : { ...r, x: r.x + t.x, y: r.y + t.y };
}

/** Parse a CSS length; non-numeric values count as 0. */
function px(value: string): number {
	const n = parseFloat(value);
	return Number.isFinite(n) ? n : 0;
}

/** Parse computed `translate`: `none` | `<x>` | `<x> <y>` | `<x> <y> <z>`. */
function parseTranslate(value: string | undefined): { x: number; y: number } {
	if (!value || value === 'none') return { x: 0, y: 0 };
	const [x = '0', y = '0'] = value.trim().split(/\s+/);
	return { x: px(x), y: px(y) };
}
