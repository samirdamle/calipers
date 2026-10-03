import { anchorPoint } from '../geom/index.js';
import { px, shiftTranslate } from '../internal/dom.js';
import { normalizeGap } from '../internal/gap.js';
import { rendered } from '../internal/rendered.js';
import { rectOf } from '../rect/index.js';
import type { Anchor, Gap, Measurable, Point, Rect } from '../types.js';

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
	 * Gap in px between the placed box and the target. Unlike `offset`
	 * (a raw signed shift), the gap pushes the box *away* from the target
	 * along the ray from the anchor through the box center — e.g.
	 * `place(tip, { anchor: 'tc', at: { anchor: 'bc', of: btn }, gap: 8 })`
	 * puts the tooltip 8px below the button. A center anchor has no
	 * direction, so the gap is a no-op there (use `offset` instead).
	 */
	gap?: Gap;
	/**
	 * `transform` (default): sets the CSS `translate` property — compositor-friendly,
	 * composes with `transform`, accumulates across calls.
	 * `position`: sets `left`/`top` (upgrades `static` to `absolute`);
	 * exact for absolute/fixed positioning.
	 */
	using?: 'transform' | 'position';
}

/**
 * Position `el` so its anchor lands on the target point, plus `offset` and `gap`.
 * Reads layout once per call. Repeating the same call is a no-op.
 */
export function place(el: HTMLElement, options: PlaceOptions = {}): void {
	const { anchor = 'tl', offset = {}, using = 'transform' } = options;
	const ox = offset.x ?? 0;
	const oy = offset.y ?? 0;
	const gap = normalizeGap(options.gap);
	if (using === 'transform') {
		// Translate is relative: deltas in screen px need no frame conversion.
		const target = targetPoint(options.at, 'viewport');
		const { rect, translate } = rendered(el, 'visual');
		const cur = anchorPoint(rect, anchor);
		const dir = gapDirection(rect, anchor);
		shiftTranslate(
			el,
			translate,
			target.x + ox + gap.x * dir.x - cur.x,
			target.y + oy + gap.y * dir.y - cur.y,
		);
	} else {
		placeByPosition(
			el,
			anchor,
			targetPoint(options.at, 'document'),
			ox,
			oy,
			gap,
		);
	}
}

/**
 * Per-axis push direction for `gap`: the sign of (box center − anchor point).
 * A center anchor yields (0, 0) — there is no direction to push.
 */
function gapDirection(rect: Rect, anchor: Anchor): Point {
	const c = anchorPoint(rect, 'cc');
	const p = anchorPoint(rect, anchor);
	return { x: Math.sign(c.x - p.x), y: Math.sign(c.y - p.y) };
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
	gap: Point,
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
	const dir = gapDirection(border, anchor);
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
	el.style.left = `${fx + ox + gap.x * dir.x - a.x - ml}px`;
	el.style.top = `${fy + oy + gap.y * dir.y - a.y - mt}px`;
}
