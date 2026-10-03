import { anchorPoint } from '../geom/index.js';
import { px, shiftTranslate } from '../internal/dom.js';
import { rendered } from '../internal/rendered.js';
import { rectOf } from '../rect/index.js';
import type { Anchor, Measurable, Point, Rect } from '../types.js';

export interface PlaceAt {
	/** Anchor of the `of` target. @default 'cc' */
	anchor?: Anchor;
	/** What to place against. @default 'viewport' */
	of?: Measurable | Point | Rect;
}

export interface PlaceOptions {
	/** Which point of `el` to position. @default 'tl' */
	anchor?: Anchor;
	/**
	 * Target: `{ anchor, of }`, a raw viewport point, or a rect.
	 * @default viewport center
	 */
	at?: PlaceAt | Point | Rect;
	/** Extra shift in px. */
	offset?: { x?: number; y?: number };
	/**
	 * `transform` (default): sets the CSS `translate` property — compositor-friendly,
	 * composes with `transform`, accumulates across calls.
	 * `position`: sets `left`/`top` (upgrades `static` to `absolute`);
	 * exact for absolute/fixed positioning.
	 */
	using?: 'transform' | 'position';
}

/**
 * Position `el` so its anchor lands on the target point, plus `offset`.
 * Reads layout once per call.
 */
export function place(el: HTMLElement, options: PlaceOptions = {}): void {
	const { anchor = 'tl', offset = {}, using = 'transform' } = options;
	const ox = offset.x ?? 0;
	const oy = offset.y ?? 0;
	if (using === 'transform') {
		// Translate is relative: deltas in screen px need no frame conversion.
		const target = targetPoint(options.at, 'viewport');
		const { rect, translate } = rendered(el, 'visual');
		const cur = anchorPoint(rect, anchor);
		shiftTranslate(el, translate, target.x + ox - cur.x, target.y + oy - cur.y);
	} else {
		placeByPosition(el, anchor, targetPoint(options.at, 'document'), ox, oy);
	}
}

/** Resolve the target to a point in the requested space. Raw points are viewport coords. */
function targetPoint(
	at: PlaceAt | Point | Rect | undefined,
	space: 'viewport' | 'document',
): Point {
	if (!at) return anchorPoint(rectOf('viewport', { space }), 'cc');
	if (isRawPoint(at)) {
		return space === 'document'
			? { x: at.x + window.scrollX, y: at.y + window.scrollY }
			: { ...at };
	}
	const placeAt = at as PlaceAt;
	const of: Measurable | Point | Rect =
		typeof (at as Rect).width === 'number'
			? (at as Rect)
			: (placeAt.of ?? 'viewport');
	if (isRawPoint(of)) {
		return space === 'document'
			? { x: of.x + window.scrollX, y: of.y + window.scrollY }
			: { ...of };
	}
	return anchorPoint(
		rectOf(of, { box: 'border', space }),
		placeAt.anchor ?? 'cc',
	);
}

function isRawPoint(v: unknown): v is Point {
	return (
		typeof v === 'object' &&
		v !== null &&
		typeof (v as Point).x === 'number' &&
		typeof (v as Point).y === 'number' &&
		typeof (v as { width?: unknown }).width !== 'number'
	);
}

/**
 * Absolute left/top in the offsetParent frame (viewport frame for fixed).
 * Positions the border box; any existing `translate` still applies on top.
 */
function placeByPosition(
	el: HTMLElement,
	anchor: Anchor,
	target: Point,
	ox: number,
	oy: number,
): void {
	const cs = getComputedStyle(el);
	const positioned = cs.position === 'static' ? 'absolute' : cs.position;
	if (cs.position === 'static') el.style.position = 'absolute';
	const op = el.offsetParent as HTMLElement | null;

	const border = rectOf(el, { box: 'border', space: 'document' });
	const a = anchorPoint(
		{ x: 0, y: 0, width: border.width, height: border.height },
		anchor,
	);
	const ml = px(cs.marginLeft);
	const mt = px(cs.marginTop);

	let fx = target.x;
	let fy = target.y;
	if (op) {
		// left/top are relative to the offsetParent's padding box.
		const ob = rectOf(op, { box: 'border', space: 'document' });
		const ocs = getComputedStyle(op);
		fx -= ob.x + px(ocs.borderLeftWidth);
		fy -= ob.y + px(ocs.borderTopWidth);
	} else if (positioned === 'fixed') {
		fx -= window.scrollX;
		fy -= window.scrollY;
	}
	el.style.left = `${fx + ox - a.x - ml}px`;
	el.style.top = `${fy + oy - a.y - mt}px`;
}
