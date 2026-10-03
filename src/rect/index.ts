import type { Box, Measurable, Rect, Space } from '../types.js';

export interface RectOptions {
	/**
	 * Which box to measure.
	 * - `border` (default): layout border box, no transforms.
	 * - `content` / `margin`: derived from the border box via computed style.
	 * - `visual`: `getBoundingClientRect()`, including CSS transforms.
	 * - `bbox`: SVG only — `getBBox()` in local user units, untransformed.
	 *   For HTML elements it falls back to `border`.
	 */
	box?: Box;
	/**
	 * Coordinate space of the result. `viewport` rects shift on scroll;
	 * `document` rects don't. `bbox` results are always in local SVG units.
	 * @default 'viewport'
	 */
	space?: Space;
}

type Target =
	| { kind: 'rect'; rect: Rect }
	| { kind: 'viewport' }
	| { kind: 'element'; el: Element };

/**
 * Resolve any measurable into a normalized `{ x, y, width, height }` rect.
 * Reads layout exactly once per call.
 */
export function rectOf(target: Measurable, options: RectOptions = {}): Rect {
	const { box = 'border', space = 'viewport' } = options;
	const t = classify(target);
	switch (t.kind) {
		case 'rect':
			return { ...t.rect };
		case 'viewport':
			return {
				x: 0,
				y: 0,
				width: window.innerWidth,
				height: window.innerHeight,
			};
		case 'element':
			return elementRect(t.el, box, space);
	}
}

function classify(target: Measurable): Target {
	if (target === 'viewport' || target === window) return { kind: 'viewport' };
	if (typeof target === 'string') {
		const el = document.querySelector(target);
		if (!el)
			throw new Error(`calipers: no element matches selector "${target}"`);
		return { kind: 'element', el };
	}
	if (isElement(target)) return { kind: 'element', el: target };
	if (isRectLike(target)) return { kind: 'rect', rect: target };
	const first = (target as ArrayLike<Element | string>)[0];
	if (first == null)
		throw new Error('calipers: empty list has no measurable to resolve');
	return classify(first);
}

function isElement(v: unknown): v is Element {
	return typeof Element !== 'undefined' && v instanceof Element;
}

function isRectLike(v: unknown): v is Rect {
	return (
		typeof v === 'object' &&
		v !== null &&
		typeof (v as Rect).x === 'number' &&
		typeof (v as Rect).y === 'number' &&
		typeof (v as Rect).width === 'number' &&
		typeof (v as Rect).height === 'number'
	);
}

function isSVGGraphics(el: Element): el is SVGGraphicsElement {
	return (
		typeof SVGGraphicsElement !== 'undefined' &&
		el instanceof SVGGraphicsElement
	);
}

function elementRect(el: Element, box: Box, space: Space): Rect {
	return isSVGGraphics(el)
		? svgRect(el, box, space)
		: htmlRect(el as HTMLElement, box, space);
}

function htmlRect(el: HTMLElement, box: Box, space: Space): Rect {
	if (box === 'visual') {
		const r = el.getBoundingClientRect();
		return moveSpace(
			{ x: r.x, y: r.y, width: r.width, height: r.height },
			'viewport',
			space,
		);
	}
	// Layout boxes are computed in document space, then converted.
	const border = layoutBorderBox(el);
	const cs = getComputedStyle(el);
	let rect: Rect;
	if (box === 'content') {
		const bl = px(cs.borderLeftWidth);
		const br = px(cs.borderRightWidth);
		const bt = px(cs.borderTopWidth);
		const bb = px(cs.borderBottomWidth);
		const pl = px(cs.paddingLeft);
		const pr = px(cs.paddingRight);
		const pt = px(cs.paddingTop);
		const pb = px(cs.paddingBottom);
		rect = {
			x: border.x + bl + pl,
			y: border.y + bt + pt,
			width: Math.max(0, border.width - bl - br - pl - pr),
			height: Math.max(0, border.height - bt - bb - pt - pb),
		};
	} else if (box === 'margin') {
		const ml = px(cs.marginLeft);
		const mr = px(cs.marginRight);
		const mt = px(cs.marginTop);
		const mb = px(cs.marginBottom);
		rect = {
			x: border.x - ml,
			y: border.y - mt,
			width: border.width + ml + mr,
			height: border.height + mt + mb,
		};
	} else {
		// 'border', or 'bbox' on HTML which has no meaning — fall back to border.
		rect = border;
	}
	return moveSpace(rect, 'document', space);
}

function svgRect(el: SVGGraphicsElement, box: Box, space: Space): Rect {
	if (box === 'bbox') {
		// Local SVG user units, untransformed — independent of space by definition.
		const b = el.getBBox();
		return { x: b.x, y: b.y, width: b.width, height: b.height };
	}
	// SVG elements have no HTML box model; every other box is the screen rect.
	const r = el.getBoundingClientRect();
	return moveSpace(
		{ x: r.x, y: r.y, width: r.width, height: r.height },
		'viewport',
		space,
	);
}

/**
 * Layout border box in document space, via the offset chain.
 * Integer px, no transforms. Transformed ancestors are not accounted for —
 * use `box: 'visual'` when transforms are in play.
 */
function layoutBorderBox(el: HTMLElement): Rect {
	let x = 0;
	let y = 0;
	let node: HTMLElement | null = el;
	const fixed = getComputedStyle(el).position === 'fixed';
	while (node) {
		x += node.offsetLeft;
		y += node.offsetTop;
		node = node.offsetParent as HTMLElement | null;
	}
	if (fixed) {
		// A fixed element's offsets are viewport-relative; convert to document space.
		x += window.scrollX;
		y += window.scrollY;
	}
	return { x, y, width: el.offsetWidth, height: el.offsetHeight };
}

/** Move a rect between viewport and document space. */
function moveSpace(rect: Rect, from: Space, to: Space): Rect {
	if (from === to) return rect;
	const dx = from === 'viewport' ? window.scrollX : -window.scrollX;
	const dy = from === 'viewport' ? window.scrollY : -window.scrollY;
	return {
		x: rect.x + dx,
		y: rect.y + dy,
		width: rect.width,
		height: rect.height,
	};
}

/** Parse a CSS length; non-numeric values (e.g. `auto`) count as 0. */
function px(value: string): number {
	const n = parseFloat(value);
	return Number.isFinite(n) ? n : 0;
}
